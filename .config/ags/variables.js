import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import Astal from 'gi://Astal'; // Main Astal import

// import App from 'resource:///com/github/Aylur/ags/app.js' // v1
// import Hyprland from 'resource:///com/github/Aylur/ags/service/hyprland.js'; // v1
// import Mpris from 'resource:///com/github/Aylur/ags/service/mpris.js'; // v1
// import Variable from 'resource:///com/github/Aylur/ags/variable.js'; // v1
// import * as Utils from 'resource:///com/github/Aylur/ags/utils.js'; // v1
// const { exec, execAsync } = Utils; // v1

// TODO: Confirm service names and Variable API from Astal documentation
const Hyprland = Astal.HyprlandService; // Speculative: e.g., Astal.Services.Hyprland
const Mpris = Astal.MprisService;       // Speculative: e.g., Astal.Services.Mpris

import { init as i18n_init, getString } from './i18n/i18n.js'
import userOptions from './modules/.configuration/user_options.js'; // Import userOptions

//init i18n, Load language file
i18n_init()
Gtk.IconTheme.get_default().append_search_path(`${Astal.App.configDir}/assets/icons`);

// Global vars for external control (through keybinds)
// Assuming Astal.Variable is the new way, or similar reactive primitive
export const showMusicControls = new Astal.Variable(false);
export const showColorScheme = new Astal.Variable(false);

globalThis['openMusicControls'] = showMusicControls;
globalThis['openColorScheme'] = showColorScheme;
globalThis['mpris'] = Mpris; // This now exports the Astal Mpris service
globalThis['getString'] = getString;

// load monitor shell modes from userOptions
const initialMonitorShellModes = () => {
    const display = Gdk.Display.get_default();
    const numberOfMonitors = display ? display.get_n_monitors() : 1;
    const monitorBarConfigs = [];
    for (let i = 0; i < numberOfMonitors; i++) {
        if (userOptions.bar.modes && userOptions.bar.modes[i]) { // Check userOptions.bar.modes exists
            monitorBarConfigs.push(userOptions.bar.modes[i]);
        } else {
            monitorBarConfigs.push('normal');
        }
    }
    return monitorBarConfigs;
};
export const currentShellMode = new Astal.Variable(initialMonitorShellModes()); // normal, focus

// Mode switching
const updateMonitorShellMode = (monitorShellModesVar, monitorId, mode) => {
    // Assuming Astal.Variable has a .value property similar to AGS v1 Variable
    const oldValue = monitorShellModesVar.value;
    const newValue = [...oldValue];
    newValue[monitorId] = mode;
    monitorShellModesVar.value = newValue;
};

globalThis['currentMode'] = currentShellMode;
globalThis['cycleMode'] = () => {
    // TODO: Ensure Hyprland service and property access is correct for Astal
    const activeMonitor = Hyprland.active.monitor; // This might change in Astal
    const monitorId = activeMonitor ? activeMonitor.id : 0;

    const currentModeForMonitor = currentShellMode.value[monitorId];

    if (currentModeForMonitor === 'normal') {
        updateMonitorShellMode(currentShellMode, monitorId, 'focus');
    } else if (currentModeForMonitor === 'focus') {
        updateMonitorShellMode(currentShellMode, monitorId, 'nothing');
    } else {
        updateMonitorShellMode(currentShellMode, monitorId, 'normal');
    }
};

// Window controls
const range = (length, start = 1) => Array.from({ length }, (_, i) => i + start);
globalThis['toggleWindowOnAllMonitors'] = (name) => {
    const display = Gdk.Display.get_default();
    range(display ? display.get_n_monitors() : 1, 0).forEach(id => {
        Astal.App.toggleWindow(`${name}${id}`);
    });
};
globalThis['closeWindowOnAllMonitors'] = (name) => {
    const display = Gdk.Display.get_default();
    range(display ? display.get_n_monitors() : 1, 0).forEach(id => {
        Astal.App.closeWindow(`${name}${id}`);
    });
};
globalThis['openWindowOnAllMonitors'] = (name) => {
    const display = Gdk.Display.get_default();
    range(display ? display.get_n_monitors() : 1, 0).forEach(id => {
        Astal.App.openWindow(`${name}${id}`);
    });
};

globalThis['closeEverything'] = () => {
    const display = Gdk.Display.get_default();
    const numMonitors = display ? display.get_n_monitors() : 1;
    for (let i = 0; i < numMonitors; i++) {
        Astal.App.closeWindow(`cheatsheet${i}`);
        Astal.App.closeWindow(`session${i}`);
    }
    Astal.App.closeWindow('sideleft');
    Astal.App.closeWindow('sideright');
    Astal.App.closeWindow('overview');
};
    const newValue = [...monitorShellModes.value];
    newValue[monitor] = mode;
    monitorShellModes.value = newValue;
}
globalThis['currentMode'] = currentShellMode;
globalThis['cycleMode'] = () => {
    const monitor = Hyprland.active.monitor.id || 0;

    if (currentShellMode.value[monitor] === 'normal') {
        updateMonitorShellMode(currentShellMode, monitor, 'focus')
    }
    else if (currentShellMode.value[monitor] === 'focus') {
        updateMonitorShellMode(currentShellMode, monitor, 'nothing')
    }
    else {
        updateMonitorShellMode(currentShellMode, monitor, 'normal')
    }
}

// Window controls
const range = (length, start = 1) => Array.from({ length }, (_, i) => i + start);
globalThis['toggleWindowOnAllMonitors'] = (name) => {
    range(Gdk.Display.get_default()?.get_n_monitors() || 1, 0).forEach(id => {
        App.toggleWindow(`${name}${id}`);
    });
}
globalThis['closeWindowOnAllMonitors'] = (name) => {
    range(Gdk.Display.get_default()?.get_n_monitors() || 1, 0).forEach(id => {
        App.closeWindow(`${name}${id}`);
    });
}
globalThis['openWindowOnAllMonitors'] = (name) => {
    range(Gdk.Display.get_default()?.get_n_monitors() || 1, 0).forEach(id => {
        App.openWindow(`${name}${id}`);
    });
}

globalThis['closeEverything'] = () => {
    const numMonitors = Gdk.Display.get_default()?.get_n_monitors() || 1;
    for (let i = 0; i < numMonitors; i++) {
        App.closeWindow(`cheatsheet${i}`);
        App.closeWindow(`session${i}`);
    }
    App.closeWindow('sideleft');
    App.closeWindow('sideright');
    App.closeWindow('overview');
};
