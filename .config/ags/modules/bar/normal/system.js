// This is for the right pills of the bar.
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // No longer needed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
// const { Box, Label, Button, Overlay, Revealer, Scrollable, Stack, EventBox } = Widget; // No longer needed
const { exec, execAsync } = Utils;
const { GLib } = imports.gi;
import Battery from 'gi://AstalBattery';
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
import { WWO_CODE, WEATHER_SYMBOL, NIGHT_WEATHER_SYMBOL } from '../../.commondata/weather.js';
import { setupCursorHover } from '../../.widgetutils/cursorhover.js';

const WEATHER_CACHE_FOLDER = `${GLib.get_user_cache_dir()}/ags/weather`;
Utils.exec(`mkdir -p ${WEATHER_CACHE_FOLDER}`);

const BarBatteryProgress = () => {
    const _updateProgress = (circprog) => { // Set circular progress value
        circprog.css = `font-size: ${Math.abs(Battery.percent)}px;`

        circprog.toggleClassName('bar-batt-circprog-low', Battery.percent <= userOptions.battery.low);
        circprog.toggleClassName('bar-batt-circprog-full', Battery.charged);
    }
    return AnimatedCircProg({
        className: `bar-batt-circprog ${userOptions.appearance.borderless ? 'bar-batt-circprog-borderless' : ''}`,
        vpack: 'center', hpack: 'center',
        extraSetup: (self) => self
            .hook(Battery, _updateProgress)
        ,
    })
}

const time = Variable('', {
    poll: [
        userOptions.time.interval,
        () => GLib.DateTime.new_now_local().format(userOptions.time.format),
    ],
})

const date = Variable('', {
    poll: [
        userOptions.time.dateInterval,
        () => GLib.DateTime.new_now_local().format(userOptions.time.dateFormatLong),
    ],
})

const BarClock = () => box({
    vpack: 'center',
    className: 'spacing-h-4 bar-clock-box',
    children: [
        label({
            className: 'bar-time',
            label: time.bind(),
        }),
        label({
            className: 'txt-norm txt-onLayer1',
            label: '•',
        }),
        label({
            className: 'txt-smallie bar-date',
            label: date.bind(),
        }),
    ],
});

const UtilButton = ({ name, icon, onClicked }) => button({
    vpack: 'center',
    tooltipText: name,
    onClicked: onClicked,
    className: `bar-util-btn ${userOptions.appearance.borderless ? 'bar-util-btn-borderless' : ''} icon-material txt-norm`,
    label: `${icon}`,
    setup: setupCursorHover
})

const Utilities = () => box({
    hpack: 'center',
    className: 'spacing-h-4',
    children: [
        UtilButton({
            name: getString('Screen snip'), icon: 'screenshot_region', onClicked: () => {
                Utils.execAsync(`${App.configDir}/scripts/grimblast.sh copy area`)
                    .catch(print)
            }
        }),
        UtilButton({
            name: getString('Color picker'), icon: 'colorize', onClicked: () => {
                Utils.execAsync(['hyprpicker', '-a']).catch(print)
            }
        }),
        UtilButton({
            name: getString('Toggle on-screen keyboard'), icon: 'keyboard', onClicked: () => {
                toggleWindowOnAllMonitors('osk');
            }
        }),
    ]
})

const BarBattery = () => box({
    className: 'spacing-h-4 bar-batt-txt',
    children: [
        revealer({
            transitionDuration: userOptions.animations.durationSmall,
            revealChild: false,
            transition: 'slide_right',
            child: MaterialIcon('bolt', 'norm', { tooltipText: "Charging" }),
            setup: (self) => self.hook(Battery, revealer => {
                self.revealChild = Battery.charging;
            }),
        }),
        label({
            className: 'txt-smallie',
            setup: (self) => self.hook(Battery, label => {
                label.label = `${Number.parseFloat(Battery.percent.toFixed(1))}%`;
            }),
        }),
        overlay({
            child: box({
                vpack: 'center',
                className: 'bar-batt',
                homogeneous: true,
                children: [
                    MaterialIcon('battery_full', 'small'),
                ],
                setup: (self) => self.hook(Battery, box => {
                    box.toggleClassName('bar-batt-low', Battery.percent <= userOptions.battery.low);
                    box.toggleClassName('bar-batt-full', Battery.charged);
                }),
            }),
            overlays: [
                BarBatteryProgress(),
            ]
        }),
    ]
});

const BarGroup = ({ child }) => box({
    className: 'bar-group-margin bar-sides',
    children: [
        box({
            className: `bar-group${userOptions.appearance.borderless ? '-borderless' : ''} bar-group-standalone bar-group-pad-system`,
            children: [child],
        }),
    ]
});
const BatteryModule = () => stack({
    transition: 'slide_up_down',
    transitionDuration: userOptions.animations.durationLarge,
    children: {
        'laptop': box({
            className: 'spacing-h-4', children: [
                BarGroup({ child: Utilities() }),
                BarGroup({ child: BarBattery() }),
            ]
        }),
        'desktop': BarGroup({
            child: box({
                hexpand: true,
                hpack: 'center',
                className: 'spacing-h-4 txt-onSurfaceVariant',
                children: [
                    MaterialIcon('device_thermostat', 'small'),
                    label({
                        label: 'Weather',
                    })
                ],
                setup: (self) => self.poll(900000, async (self) => {
                    const WEATHER_CACHE_PATH = WEATHER_CACHE_FOLDER + '/wttr.in.txt';
                    const updateWeatherForCity = (city) => execAsync(`curl https://wttr.in/${city.replace(/ /g, '%20')}?format=j1`)
                        .then(output => {
                            const weather = JSON.parse(output);
                            Utils.writeFile(JSON.stringify(weather), WEATHER_CACHE_PATH)
                                .catch(print);
                            const weatherCode = weather.current_condition[0].weatherCode;
                            const weatherDesc = weather.current_condition[0].weatherDesc[0].value;
                            const temperature = weather.current_condition[0][`temp_${userOptions.weather.preferredUnit}`];
                            const feelsLike = weather.current_condition[0][`FeelsLike${userOptions.weather.preferredUnit}`];
                            const weatherSymbol = WEATHER_SYMBOL[WWO_CODE[weatherCode]];
                            self.children[0].label = weatherSymbol;
                            self.children[1].label = `${temperature}°${userOptions.weather.preferredUnit} • ${getString('Feels like')} ${feelsLike}°${userOptions.weather.preferredUnit}`;
                            self.tooltipText = weatherDesc;
                        }).catch((err) => {
                            try { // Read from cache
                                const weather = JSON.parse(
                                    Utils.readFile(WEATHER_CACHE_PATH)
                                );
                                const weatherCode = weather.current_condition[0].weatherCode;
                                const weatherDesc = weather.current_condition[0].weatherDesc[0].value;
                                const temperature = weather.current_condition[0][`temp_${userOptions.weather.preferredUnit}`];
                                const feelsLike = weather.current_condition[0][`FeelsLike${userOptions.weather.preferredUnit}`];
                                const weatherSymbol = WEATHER_SYMBOL[WWO_CODE[weatherCode]];
                                self.children[0].label = weatherSymbol;
                                self.children[1].label = `${temperature}°${userOptions.weather.preferredUnit} • ${getString('Feels like')} ${feelsLike}°${userOptions.weather.preferredUnit}`;
                                self.tooltipText = weatherDesc;
                            } catch (err) {
                                print(err);
                            }
                        });
                    if (userOptions.weather.city != '' && userOptions.weather.city != null) {
                        updateWeatherForCity(userOptions.weather.city.replace(/ /g, '%20'));
                    }
                    else {
                        Utils.execAsync('curl ipinfo.io')
                            .then(output => {
                                return JSON.parse(output)['city'].toLowerCase();
                            })
                            .then(updateWeatherForCity)
                            .catch(print)
                    }
                }),
            })
        }),
    },
    setup: (stack) => Utils.timeout(10, () => {
        if (!Battery.available) stack.shown = 'desktop';
        else stack.shown = 'laptop';
    })
})

const switchToRelativeWorkspace = async (self, num) => {
    try {
        const Hyprland = await import('gi://AstalHyprland'); // Corrected dynamic import
        Hyprland.messageAsync(`dispatch workspace r${num > 0 ? '+' : ''}${num}`).catch(print);
    } catch {
        // Assuming 'app' is available globally or imported if this file becomes a module
        execAsync([`${app.configDir}/scripts/sway/swayToRelativeWs.sh`, `${num}`]).catch(print);
    }
}

export default () => eventBox({
    onScrollUp: (self) => switchToRelativeWorkspace(self, -1),
    onScrollDown: (self) => switchToRelativeWorkspace(self, +1),
    onPrimaryClick: () => App.toggleWindow('sideright'),
    child: box({
        className: 'spacing-h-4',
        children: [
            BarGroup({ child: BarClock() }),
            BatteryModule(),
        ]
    })
});
