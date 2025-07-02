import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import App from 'ags/app';
import { box, label, button, overlay, revealer, stack, eventbox } from 'ags/widgets';
import { execAsync, readFileAsync, writeFileAsync } from 'ags/process'; // Assuming these are the correct v2 utils
// Or: import { readFileAsync , writeFileAsync } from 'ags/file';
import { createPoll, createBinding, createEffect, createState } from 'ags';
import { options as userOptions } from '../../options.js';
import { setupCursorHover } from '../../utils/cursorHover.js';
import { WWO_CODE, WEATHER_SYMBOL, NIGHT_WEATHER_SYMBOL } from '../../utils/weatherData.js'; // Migrated data

// TODO: Import actual Battery service. Using a fake one for now.
// import Battery from 'gi://AstalBattery';
// const battery = Battery.get_default();
// Using the same FakeBatteryService as in Bar.js for now
const FakeBatteryService = {
    available: true, // Set to false to test desktop mode
    percent: 75,
    charging: false,
    charged: false, // Assuming 'charged' means 100% and not charging or fully charged state
    connect: (signal, callback) => { /* console.log(`FakeBatteryService: connect to ${signal}`); */ },
    low: userOptions.battery?.low || 20,
    // Make properties reactive for createBinding/createEffect
    _percent: createState(75),
    get percent_accessor() { return this._percent[0]; },
    get percent() { return this._percent[0].value; },
    set percent(val) { this._percent[1](val); },

    _charging: createState(false),
    get charging_accessor() { return this._charging[0]; },
    get charging() { return this._charging[0].value; },
    set charging(val) { this._charging[1](val); },

    _available: createState(true),
    get available_accessor() { return this._available[0]; },
    get available() { return this._available[0].value; },
    set available(val) { this._available[1](val); },

    _charged: createState(false), // Add charged state
    get charged_accessor() { return this._charged[0]; },
    get charged() { return this._charged[0].value; },
    set charged(val) { this._charged[1](val); },
};
const battery = FakeBatteryService;
// globalThis.fb = battery; // For easy console testing: fb.percent = 10;


// Placeholders for common widgets
const PlaceholderWidget = (name, props = {}) => box({ ...props, children: [Gtk.Label.new(`PH: ${name}`)] }); // Direct Gtk.Label
import AnimatedCircProg from '../../common/AnimatedCircularProgress.js'; // Import actual component
import MaterialIcon from '../../common/MaterialIcon.js'; // Import actual component

const WEATHER_CACHE_FOLDER = `${GLib.get_user_cache_dir()}/ags/weather`;
execAsync(`mkdir -p ${WEATHER_CACHE_FOLDER}`).catch(print);


const BarBatteryProgress = () => {
    const circProg = AnimatedCircProg({
        className: `bar-batt-circprog ${userOptions.appearance?.borderless ? 'bar-batt-circprog-borderless' : ''}`,
        vpack: 'center', hpack: 'center',
        value: battery.percent_accessor, // Bind directly to reactive percent
    });

    // For class toggling based on battery state
    createEffect(() => {
        if (!circProg || !circProg.widget) return; // circProg itself is the widget from Placeholder for now
        circProg.toggleClassName('bar-batt-circprog-low', battery.percent <= battery.low);
        circProg.toggleClassName('bar-batt-circprog-full', battery.charged);
    }, [battery.percent_accessor, battery.charged_accessor, battery.low]); // Dependencies

    return circProg;
};

const time = createPoll(
    userOptions.time?.interval || 5000,
    () => GLib.DateTime.new_now_local().format(userOptions.time?.format || '%H:%M') || "00:00",
    "00:00"
);

const date = createPoll(
    userOptions.time?.dateInterval || 30000,
    () => GLib.DateTime.new_now_local().format(userOptions.time?.dateFormatLong || '%A, %d/%m') || "No Date",
    "No Date"
);

const BarClock = () => box({
    vpack: 'center',
    className: 'spacing-h-4 bar-clock-box',
    children: [
        label({
            className: 'bar-time',
            label: time, // Bind to accessor
        }),
        label({
            className: 'txt-norm txt-onLayer1', // Assuming these classes exist in SCSS
            label: '•',
        }),
        label({
            className: 'txt-smallie bar-date',
            label: date, // Bind to accessor
        }),
    ],
});

const UtilButton = ({ name, icon, onClicked }) => button({
    vpack: 'center',
    tooltipText: name,
    onClicked: onClicked,
    className: `bar-util-btn ${userOptions.appearance?.borderless ? 'bar-util-btn-borderless' : ''}`,
    child: MaterialIcon(icon, 'norm'), // MaterialIcon needs to render an icon string or widget
    $: (self) => setupCursorHover(self),
});

const Utilities = () => box({
    hpack: 'center',
    className: 'spacing-h-4',
    children: [
        UtilButton({
            name: userOptions.language?.screensnip || 'Screen snip', icon: 'screenshot_region', onClicked: () => {
                execAsync(`${App.configDir}/scripts/grimblast.sh copy area`).catch(print);
            }
        }),
        UtilButton({
            name: userOptions.language?.colorpicker || 'Color picker', icon: 'colorize', onClicked: () => {
                execAsync(['hyprpicker', '-a']).catch(print);
            }
        }),
        UtilButton({
            name: userOptions.language?.osk || 'Toggle on-screen keyboard', icon: 'keyboard', onClicked: () => {
                // This needs a robust way to toggle OSK for all monitors if that's the intent.
                // For now, toggling a named window 'osk0' or just 'osk'.
                // If OSK windows are named osk0, osk1, etc.
                // Gdk.Display.get_default().get_n_monitors() can get count.
                // App.toggleWindow('osk'); // If there's a single global OSK window
                App.toggleWindow('osk0'); // Placeholder for the first monitor's OSK
            }
        }),
    ]
});

const BarBatteryDisplay = () => box({ // Renamed from BarBattery to avoid conflict
    className: 'spacing-h-4 bar-batt-txt',
    children: [
        revealer({
            transitionDuration: userOptions.animations?.durationSmall || 150,
            revealChild: battery.charging_accessor, // Bind to reactive property
            transition: Gtk.RevealerTransitionType.SLIDE_RIGHT,
            child: MaterialIcon('bolt', 'norm', { tooltipText: userOptions.language?.charging || "Charging" }),
        }),
        label({
            className: 'txt-smallie',
            label: battery.percent_accessor.transform(p => `${Number.parseFloat(p.toFixed(1))}%`),
        }),
        overlay({
            child: box({
                vpack: 'center',
                className: 'bar-batt', // Base class
                // Class toggling via createEffect for more complex logic or if direct binding is tricky
                $: (self) => createEffect(() => {
                    self.toggleClassName('bar-batt-low', battery.percent <= battery.low);
                    self.toggleClassName('bar-batt-full', battery.charged);
                }, [battery.percent_accessor, battery.charged_accessor, battery.low]),
                homogeneous: true, // Keep if it means something for MaterialIcon sizing
                children: [
                    MaterialIcon('battery_full', 'small'), // Base icon
                ],
            }),
            overlays: [ BarBatteryProgress() ]
        }),
    ]
});

const BarGroup = ({ children }) => box({
    className: 'bar-group-margin bar-sides',
    children: [
        box({
            className: `bar-group ${userOptions.appearance?.borderless ? '-borderless' : ''} bar-group-standalone bar-group-pad-system`,
            children: children,
        }),
    ]
});

const WeatherDisplay = () => {
    const weatherData = createPoll(900000, async () => {
        const WEATHER_CACHE_PATH = WEATHER_CACHE_FOLDER + '/wttr.in.txt';
        const city = userOptions.weather?.city;
        let weatherJson = null;
        try {
            let targetCity = city;
            if (!targetCity) {
                const ipinfo = await execAsync('curl ipinfo.io');
                targetCity = JSON.parse(ipinfo)['city']?.toLowerCase();
            }
            if (targetCity) {
                const weatherOutput = await execAsync(`curl https://wttr.in/${targetCity.replace(/ /g, '%20')}?format=j1`);
                weatherJson = JSON.parse(weatherOutput);
                await writeFileAsync(JSON.stringify(weatherJson), WEATHER_CACHE_PATH).catch(print);
            }
        } catch (error) {
            // console.warn("Failed to fetch new weather, trying cache:", error);
            try {
                const cachedWeather = await readFileAsync(WEATHER_CACHE_PATH);
                weatherJson = JSON.parse(cachedWeather);
            } catch (cacheError) {
                // console.warn("Failed to read weather from cache:", cacheError);
                return { symbol: WEATHER_SYMBOL["Unknown"], temp: "N/A", tooltip: "Weather unavailable" };
            }
        }

        if (!weatherJson || !weatherJson.current_condition?.[0]) {
            return { symbol: WEATHER_SYMBOL["Unknown"], temp: "N/A", tooltip: "Weather data incomplete" };
        }
        const condition = weatherJson.current_condition[0];
        const weatherCode = condition.weatherCode;
        const weatherDesc = condition.weatherDesc[0]?.value || "N/A";
        const tempUnit = userOptions.weather?.preferredUnit || 'C';
        const temperature = condition[`temp_${tempUnit}`];
        const feelsLike = condition[`FeelsLike${tempUnit}`];
        // TODO: Implement night weather symbol selection
        const weatherSymbol = WEATHER_SYMBOL[WWO_CODE[weatherCode]] || WEATHER_SYMBOL["Unknown"];

        return {
            symbol: weatherSymbol,
            temp: `${temperature}°${tempUnit}`,
            tooltip: `${weatherDesc}, ${userOptions.language?.feelsLike || 'Feels like'} ${feelsLike}°${tempUnit}`,
        };

    }, { symbol: WEATHER_SYMBOL["Unknown"], temp: "N/A", tooltip: "Loading weather..." });

    return BarGroup({
        child: box({
            hexpand: true,
            hpack: 'center',
            className: 'spacing-h-4 txt-onSurfaceVariant', // Assuming this class implies text color
            children: [
                MaterialIcon(weatherData.transform(w => w.symbol), 'small'), // Icon name from data
                label({ label: weatherData.transform(w => w.temp) }),
            ],
            tooltipText: weatherData.transform(w => w.tooltip),
        })
    });
};


const BatteryModuleStack = () => stack({ // Renamed from BatteryModule
    transition: Gtk.StackTransitionType.SLIDE_UP_DOWN,
    transitionDuration: userOptions.animations?.durationLarge || 150,
    shown: battery.available_accessor.transform(avail => avail ? 'laptop' : 'desktop'),
    children: {
        'laptop': box({
            className: 'spacing-h-4', children: [
                BarGroup({ children: [Utilities()] }),
                BarGroup({ children: [BarBatteryDisplay()] }),
            ]
        }),
        'desktop': WeatherDisplay(),
    },
});

// V1 had switchToRelativeWorkspace here, not directly used by the exported default.
// If needed elsewhere, it should be a separate utility.

export default function SystemDisplay() {
    return eventbox({
        onScrollUp: (self) => { /* TODO: Implement workspace switch or remove */ },
        onScrollDown: (self) => { /* TODO: Implement workspace switch or remove */ },
        onPrimaryClick: () => App.toggleWindow('sideright'), // Assuming 'sideright' is a registered window name
        child: box({
            className: 'spacing-h-4',
            children: [
                BarGroup({ children: [BarClock()] }),
                BatteryModuleStack(),
            ]
        })
    });
}
