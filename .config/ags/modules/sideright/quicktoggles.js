const { GLib } = imports.gi;
import app from 'ags/gtk4/app'; // Corrected App import
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

import Bluetooth from '../../../services/bluetoothService.js'; // Use re-exported AstalBluetooth
import Network from '../../../services/networkService.js'; // Use re-exported AstalNetwork
const { execAsync, exec } = Utils;
import { BluetoothIndicator, NetworkIndicator } from '../.commonwidgets/statusicons.js';
import { setupCursorHover } from '../.widgetutils/cursorhover.js';
import { MaterialIcon } from '../.commonwidgets/materialicon.js';
import { sidebarOptionsStack } from './sideright.js';

export const ToggleIconWifi = (props = {}) => button({ // Corrected
    className: 'txt-small sidebar-iconbutton',
    tooltipText: getString('Wifi | Right-click to configure'),
    onClicked: () => Network.toggleWifi(),
    onSecondaryClickRelease: () => {
        execAsync(['bash', '-c', `${userOptions.apps.network}`]).catch(print);
        closeEverything(); // This global function uses app
    },
    child: NetworkIndicator(),
    setup: (self) => {
        setupCursorHover(self);
        self.hook(Network, button => {
            button.toggleClassName('sidebar-button-active', [Network.wifi?.internet, Network.wired?.internet].includes('connected'))
            button.tooltipText = (`${Network.wifi?.ssid} | ${getString("Right-click to configure")}` || getString('Unknown'));
        });
    },
    ...props,
});

export const ToggleIconBluetooth = (props = {}) => button({ // Corrected
    className: 'txt-small sidebar-iconbutton',
    tooltipText: getString('Bluetooth | Right-click to configure'),
    onClicked: () => {
        const status = Bluetooth?.enabled;
        if (status)
            exec('rfkill block bluetooth');
        else
            exec('rfkill unblock bluetooth');
    },
    onSecondaryClickRelease: () => {
        execAsync(['bash', '-c', `${userOptions.apps.bluetooth}`]).catch(print);
        closeEverything(); // This global function uses app
    },
    child: BluetoothIndicator(),
    setup: (self) => {
        setupCursorHover(self);
        self.hook(Bluetooth, button => {
            button.toggleClassName('sidebar-button-active', Bluetooth?.enabled)
        });
    },
    ...props,
});

export const HyprToggleIcon = async (iconName, name, hyprlandConfigValue, props = {}) => { // icon renamed to iconName
    try {
        return button({ // Corrected
            className: 'txt-small sidebar-iconbutton',
            tooltipText: `${name}`,
            onClicked: (button) => {
                // Set the value to 1 - value
                Utils.execAsync(`hyprctl -j getoption ${hyprlandConfigValue}`).then((result) => {
                    const currentOption = JSON.parse(result).int;
                    execAsync(['bash', '-c', `hyprctl keyword ${hyprlandConfigValue} ${1 - currentOption} &`]).catch(print);
                    button.toggleClassName('sidebar-button-active', currentOption == 0);
                }).catch(print);
            },
            child: MaterialIcon(iconName, 'norm', { hpack: 'center' }),
            setup: button => {
                button.toggleClassName('sidebar-button-active', JSON.parse(Utils.exec(`hyprctl -j getoption ${hyprlandConfigValue}`)).int == 1);
                setupCursorHover(button);
            },
            ...props,
        })
    } catch {
        return null;
    }
}

export const ModuleNightLight = async (props = {}) => {
    if (!exec(`bash -c 'command -v gammastep'`)) return null;
    return button({ // Corrected
        attribute: {
            enabled: false,
        },
        className: 'txt-small sidebar-iconbutton',
        tooltipText: getString('Night Light'),
        onClicked: (self) => {
            self.attribute.enabled = !self.attribute.enabled;
            self.toggleClassName('sidebar-button-active', self.attribute.enabled);
            if (self.attribute.enabled) Utils.execAsync('gammastep').catch(print)
            else Utils.execAsync('pkill gammastep')
                .then(() => {
                    // disable the button until fully terminated to avoid race
                    self.sensitive = false;
                    const source = setInterval(() => {
                        Utils.execAsync('pkill -0 gammastep')
                            .catch(() => {
                                self.sensitive = true;
                                source.destroy();
                            });
                    }, 500);
                })
                .catch(print);
        },
        child: MaterialIcon('nightlight', 'norm'),
        setup: (self) => {
            setupCursorHover(self);
            self.attribute.enabled = !!exec('pidof gammastep');
            self.toggleClassName('sidebar-button-active', self.attribute.enabled);
        },
        ...props,
    });
}

export const ModuleCloudflareWarp = async (props = {}) => {
    if (!exec(`bash -c 'command -v warp-cli'`)) return null;
    return button({ // Corrected
        attribute: {
            enabled: false,
        },
        className: 'txt-small sidebar-iconbutton',
        tooltipText: getString('Cloudflare WARP'),
        onClicked: (self) => {
            self.attribute.enabled = !self.attribute.enabled;
            self.toggleClassName('sidebar-button-active', self.attribute.enabled);
            if (self.attribute.enabled) Utils.execAsync('warp-cli connect').catch(print)
            else Utils.execAsync('warp-cli disconnect').catch(print);
        },
        child: icon({ // Corrected
            icon: 'cloudflare-dns-symbolic',
            className: 'txt-norm',
        }),
        setup: (self) => {
            setupCursorHover(self);
            self.attribute.enabled = !exec(`bash -c 'warp-cli status | grep Disconnected'`);
            self.toggleClassName('sidebar-button-active', self.attribute.enabled);
        },
        ...props,
    });
}

export const ModuleInvertColors = async (props = {}) => {
    try {
        const Hyprland = (await import('gi://AstalHyprland')); // Corrected import
        return button({ // Corrected
            className: 'txt-small sidebar-iconbutton',
            tooltipText: getString('Color inversion'),
            onClicked: (button) => {
                // const shaderPath = JSON.parse(exec('hyprctl -j getoption decoration:screen_shader')).str;
                Hyprland.messageAsync('j/getoption decoration:screen_shader')
                    .then((output) => {
                        const shaderPath = JSON.parse(output)["str"].trim();
                        if (shaderPath != "[[EMPTY]]" && shaderPath != "") {
                            execAsync(['bash', '-c', `hyprctl keyword decoration:screen_shader '[[EMPTY]]'`]).catch(print);
                            button.toggleClassName('sidebar-button-active', false);
                        }
                        else {
                            Hyprland.messageAsync(`j/keyword decoration:screen_shader ${GLib.get_user_config_dir()}/hypr/shaders/invert.frag`)
                                .catch(print);
                            button.toggleClassName('sidebar-button-active', true);
                        }
                    })
            },
            child: MaterialIcon('invert_colors', 'norm'),
            setup: setupCursorHover,
            ...props,
        })
    } catch {
        return null;
    };
}

export const ModuleRawInput = async (props = {}) => {
    try {
        const Hyprland = (await import('gi://AstalHyprland')); // Corrected import
        return button({ // Corrected
            className: 'txt-small sidebar-iconbutton',
            tooltipText: 'Raw input',
            onClicked: (button) => {
                Hyprland.messageAsync('j/getoption input:accel_profile')
                    .then((output) => {
                        const value = JSON.parse(output)["str"].trim();
                        if (value != "[[EMPTY]]" && value != "") {
                            execAsync(['bash', '-c', `hyprctl keyword input:accel_profile '[[EMPTY]]'`]).catch(print);
                            button.toggleClassName('sidebar-button-active', false);
                        }
                        else {
                            Hyprland.messageAsync(`j/keyword input:accel_profile flat`)
                                .catch(print);
                            button.toggleClassName('sidebar-button-active', true);
                        }
                    })
            },
            child: MaterialIcon('mouse', 'norm'),
            setup: setupCursorHover,
            ...props,
        })
    } catch {
        return null;
    };
}

export const ModuleGameMode = async (props = {}) => {
    try {
        const Hyprland = (await import('gi://AstalHyprland')); // Corrected import
        return button({ // Corrected
            className: 'txt-small sidebar-iconbutton',
            tooltipText: getString('Hyprland Game Mode'),
            onClicked: (button) => {
                Utils.execAsync(`hyprctl -j getoption animations:enabled`)
                    .then((output) => {
                        const enabled = JSON.parse(output)["int"] === 1;
                        if (enabled) {
                            execAsync(['bash', '-c', `hyprctl --batch "keyword animations:enabled 0; keyword decoration:shadow:enabled 0; keyword decoration:blur:enabled 0; keyword general:gaps_in 0; keyword general:gaps_out 0; keyword general:border_size 1; keyword decoration:rounding 0; keyword general:allow_tearing 1"`]).catch(print);
                            execAsync(['gsettings', 'set', 'org.gnome.desktop.interface', 'enable-animations', 'false'])
                        } else {
                            execAsync(['bash', '-c', `hyprctl reload`]).catch(print);
                            execAsync(['gsettings', 'set', 'org.gnome.desktop.interface', 'enable-animations', 'true'])
                        }
                        button.toggleClassName('sidebar-button-active', enabled);
                    })
            },
            child: MaterialIcon('gamepad', 'norm'),
            setup: setupCursorHover,
            ...props,
        })
    } catch {
        return null;
    };
}

export const ModuleIdleInhibitor = (props = {}) => button({ // Corrected // TODO: Make this work
    attribute: {
        enabled: false,
    },
    className: 'txt-small sidebar-iconbutton',
    tooltipText: getString('Keep system awake'),
    onClicked: (self) => {
        self.attribute.enabled = !self.attribute.enabled;
        self.toggleClassName('sidebar-button-active', self.attribute.enabled);
        if (self.attribute.enabled) Utils.execAsync(['bash', '-c', `pidof wayland-idle-inhibitor.py || ${app.configDir}/scripts/wayland-idle-inhibitor.py`]).catch(print) // Corrected to app
        else Utils.execAsync('pkill -f wayland-idle-inhibitor.py').catch(print);
    },
    child: MaterialIcon('coffee', 'norm'),
    setup: (self) => {
        setupCursorHover(self);
        self.attribute.enabled = !!exec('pidof wayland-idle-inhibitor.py');
        self.toggleClassName('sidebar-button-active', self.attribute.enabled);
    },
    ...props,
});

export const ModuleReloadIcon = (props = {}) => button({ // Corrected
    ...props,
    className: 'txt-small sidebar-iconbutton',
    tooltipText: getString('Reload Environment config'),
    onClicked: () => {
        execAsync(['bash', '-c', 'hyprctl reload || swaymsg reload &']);
        app.closeWindow('sideright'); // Corrected to app
    },
    child: MaterialIcon('refresh', 'norm'),
    setup: button => {
        setupCursorHover(button);
    }
})

export const ModuleSettingsIcon = (props = {}) => button({ // Corrected
    ...props,
    className: 'txt-small sidebar-iconbutton',
    tooltipText: getString('Open Settings'),
    onClicked: () => {
        execAsync(['bash', '-c', `${userOptions.apps.settings}`, '&']);
        app.closeWindow('sideright'); // Corrected to app
    },
    child: MaterialIcon('settings', 'norm'),
    setup: button => {
        setupCursorHover(button);
    }
})

export const ModulePowerIcon = (props = {}) => button({ // Corrected
    ...props,
    className: 'txt-small sidebar-iconbutton',
    tooltipText: getString('Session'),
    onClicked: () => {
        closeEverything(); // This global function uses app
        Utils.timeout(1, () => openWindowOnAllMonitors('session')); // This global function uses app
    },
    child: MaterialIcon('power_settings_new', 'norm'),
    setup: button => {
        setupCursorHover(button);
    }
})
