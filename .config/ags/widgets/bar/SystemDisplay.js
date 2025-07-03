import GLib from 'gi://GLib';
import { Gtk, Gdk, Pango } from 'ags/gtk4'; // Added Pango, Gdk
import { app } from 'ags/gtk4/app'; // Corrected app import
// Intrinsics used: <box>, <label>, <button>, <overlay>, <revealer>, <stack>, <eventbox> (eventbox to be replaced)
import { execAsync, readFileAsync, writeFileAsync } from 'ags/process';
import { createPoll, createBinding, createEffect, createState } from 'ags';
import { options as userOptions } from '../../options.js';
import { setupCursorHover } from '../../utils/cursorHover.js';
import { WWO_CODE, WEATHER_SYMBOL, NIGHT_WEATHER_SYMBOL } from '../../utils/weatherData.js';
import Battery from 'ags/service/battery'; // Corrected import
import Indicator from '../../services/indicatorService.js';
import Audio from 'ags/service/audio';

import AnimatedCircProg from '../../common/AnimatedCircularProgress.js';
import MaterialIcon from '../../common/MaterialIcon.js';
import { BarGroup, BarResource } from './commonBarItems.js'; // Import common BarGroup and BarResource

// getString placeholder
const getString = (str) => str; // TODO: i18n

const WEATHER_CACHE_FOLDER = `${GLib.get_user_cache_dir()}/ags/weather`;
execAsync(['mkdir', '-p', WEATHER_CACHE_FOLDER]).catch(print); // Use array for execAsync

const BarBatteryProgress = () => {
    // AnimatedCircProg expects value_accessor (0-100)
    // Battery.percent (if it's an accessor directly) or Battery.percent_accessor
    return (
        <AnimatedCircProg
            class={`bar-batt-circprog ${userOptions.appearance?.borderless ? 'bar-batt-circprog-borderless' : ''}`}
            vpack={Gtk.Align.CENTER} hpack={Gtk.Align.CENTER}
            value_accessor={Battery.percent_accessor} // Use imported Battery
            $={self => createEffect(() => {
                self.toggleClassName('bar-batt-circprog-low', Battery.percent_accessor.value <= (Battery.low_accessor?.value || Battery.low || userOptions.battery?.low || 20));
                self.toggleClassName('bar-batt-circprog-full', Battery.charged_accessor.value);
            }, [Battery.percent_accessor, Battery.charged_accessor, Battery.low_accessor])}
        />
    );
};

const time = createPoll(
    userOptions.time?.interval || 5000,
    () => GLib.DateTime.new_now_local().format(userOptions.time?.format || '%H:%M') || "00:00",
);

const date = createPoll(
    userOptions.time?.dateInterval || 30000,
    () => GLib.DateTime.new_now_local().format(userOptions.time?.dateFormatLong || '%A, %d/%m') || "No Date",
);

const BarClock = () => (
    <box vpack={Gtk.Align.CENTER} class='spacing-h-4 bar-clock-box'>
        <label class='bar-time' label={time} />
        <label class='txt-norm txt-onLayer1' label='•' />
        <label class='txt-smallie bar-date' label={date} />
    </box>
);

const UtilButton = ({ name, icon, onClicked }) => (
    <button
        vpack={Gtk.Align.CENTER}
        tooltipText={name}
        onClicked={onClicked}
        class={`bar-util-btn ${userOptions.appearance?.borderless ? 'bar-util-btn-borderless' : ''}`}
        $={setupCursorHover}
    >
        <MaterialIcon icon={icon} size='norm'/>
    </button>
);

const Utilities = ({monitorId}) => ( // Added monitorId for OSK toggle
    <box hpack={Gtk.Align.CENTER} class='spacing-h-4'>
        <UtilButton name={getString('Screen snip')} icon='screenshot_region'
            onClicked={() => execAsync(`${app.configDir}/scripts/grimblast.sh copy area`).catch(print)} />
        <UtilButton name={getString('Color picker')} icon='colorize'
            onClicked={() => execAsync(['hyprpicker', '-a']).catch(print)} />
        <UtilButton name={getString('Toggle on-screen keyboard')} icon='keyboard'
            onClicked={() => app.toggleWindow(`osk${monitorId}`)} />
    </box>
);

const BarBatteryDisplay = () => (
    <box class='spacing-h-4 bar-batt-txt'>
        <revealer
            transitionDuration={userOptions.animations?.durationSmall || 150}
            revealChild={Battery.charging_accessor} // Use imported Battery
            transition={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        >
            <MaterialIcon icon='bolt' size='norm' tooltipText={getString("Charging")} />
        </revealer>
        <label class='txt-smallie' label={Battery.percent_accessor.transform(p => `${Number(p).toFixed(0)}%`)} />
        <overlay>
            <box $type="child"
                vpack={Gtk.Align.CENTER}
                class='bar-batt'
                homogeneous={true}
                $={self => createEffect(() => {
                    self.toggleClassName('bar-batt-low', Battery.percent_accessor.value <= (Battery.low_accessor?.value || Battery.low || userOptions.battery?.low || 20));
                    self.toggleClassName('bar-batt-full', Battery.charged_accessor.value);
                }, [Battery.percent_accessor, Battery.charged_accessor, Battery.low_accessor])}
            >
                <MaterialIcon icon='battery_full' size='small'/>
            </box>
            <BarBatteryProgress $type="overlay"/>
        </overlay>
    </box>
);

const WeatherDisplay = () => {
    const weatherData = createPoll(900000, async () => {
        const WEATHER_CACHE_PATH = WEATHER_CACHE_FOLDER + '/wttr.in.txt';
        const city = userOptions.weather?.city;
        let weatherJson = null;
        try {
            let targetCity = city;
            if (!targetCity) {
                const ipinfo = await execAsync('curl ipinfo.io'); // Add error handling
                targetCity = JSON.parse(ipinfo)['city']?.toLowerCase();
            }
            if (targetCity) {
                const weatherOutput = await execAsync(`curl https://wttr.in/${targetCity.replace(/ /g, '%20')}?format=j1`);
                weatherJson = JSON.parse(weatherOutput);
                await writeFileAsync(JSON.stringify(weatherJson), WEATHER_CACHE_PATH).catch(print); // Use ags/file if available
            }
        } catch (error) {
            try {
                const cachedWeather = await readFileAsync(WEATHER_CACHE_PATH); // Use ags/file
                weatherJson = JSON.parse(cachedWeather);
            } catch (cacheError) {
                return { symbol: WEATHER_SYMBOL["Unknown"], temp: "N/A", tooltip: getString("Weather unavailable") };
            }
        }
        if (!weatherJson || !weatherJson.current_condition?.[0]) {
            return { symbol: WEATHER_SYMBOL["Unknown"], temp: "N/A", tooltip: getString("Weather data incomplete") };
        }
        const condition = weatherJson.current_condition[0];
        const weatherCode = condition.weatherCode;
        const weatherDesc = condition.weatherDesc[0]?.value || "N/A";
        const tempUnit = userOptions.weather?.preferredUnit || 'C';
        const temperature = condition[`temp_${tempUnit}`];
        const feelsLike = condition[`FeelsLike${tempUnit}`];
        const weatherSymbol = WEATHER_SYMBOL[WWO_CODE[weatherCode]] || WEATHER_SYMBOL["Unknown"];
        return {
            symbol: weatherSymbol, temp: `${temperature}°${tempUnit}`,
            tooltip: `${weatherDesc}, ${getString('Feels like')} ${feelsLike}°${tempUnit}`,
        };
    }, { symbol: WEATHER_SYMBOL["Unknown"], temp: "N/A", tooltip: getString("Loading weather...") });

    return (
        <BarGroup>
            <box
                hexpand={true} hpack={Gtk.Align.CENTER}
                class='spacing-h-4 txt-onSurfaceVariant' // Ensure SCSS
                tooltipText={weatherData.transform(w => w.tooltip)}
            >
                <MaterialIcon icon={weatherData.transform(w => w.symbol)} size='small' />
                <label label={weatherData.transform(w => w.temp)} />
            </box>
        </BarGroup>
    );
};

const BatteryModuleStack = ({monitorId}) => ( // Pass monitorId for Utilities
    <stack
        transition={Gtk.StackTransitionType.SLIDE_UP_DOWN}
        transitionDuration={userOptions.animations?.durationLarge || 150}
        shown={Battery.available_accessor.transform(avail => avail ? 'laptop' : 'desktop')} // Use imported Battery
    >
        {{ // Stack children as an object
            'laptop': (
                <box class='spacing-h-4'>
                    <BarGroup><Utilities monitorId={monitorId}/></BarGroup>
                    <BarGroup><BarBatteryDisplay /></BarGroup>
                </box>
            ),
            'desktop': <WeatherDisplay />,
        }}
    </stack>
);

// SystemDisplay expects gdkmonitor or monitorId from Bar.js
export default function SystemDisplay({ gdkmonitor }) {
    const monitorId = gdkmonitor.get_monitor_number();
    // Original had scroll for workspace switch and click for sideright on root EventBox
    // This should be handled by Gtk.GestureClick and Gtk.EventControllerScroll on a <box>
    return (
        // Replace eventbox with box and gestures if eventbox is not an intrinsic
        <box
            class='system-display-eventbox' // Add class for potential styling
            $={self => {
                // Scroll for workspace (complex, placeholder for now, needs Hyprland/Sway service)
                // const scrollController = Gtk.EventControllerScroll.new(Gtk.EventControllerScrollFlags.VERTICAL);
                // scrollController.connect('scroll', (controller, dx, dy) => {
                //     if (dy > 0) Hyprland.messageAsync(`dispatch workspace r+1`);
                //     else Hyprland.messageAsync(`dispatch workspace r-1`);
                //     return true;
                // });
                // self.add_controller(scrollController);

                // Click for sideright
                const clickController = Gtk.GestureClick.new();
                clickController.connect('released', () => app.toggleWindow('sideright'));
                self.add_controller(clickController);

                // OSD dismiss on motion (problematic, best handled by OSD itself with timeout)
                // Indicator.popup(-1);
            }}
        >
            <box class='spacing-h-4'>
                <BarGroup><BarClock /></BarGroup>
                <BatteryModuleStack monitorId={monitorId}/>
            </box>
        </box>
    );
}
