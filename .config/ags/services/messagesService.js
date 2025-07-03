import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import app from 'ags/gtk4/app'; // Corrected
import { execAsync } from 'ags/process';
import { writeFileAsync } from 'ags/file';
import { timeout } from 'ags/time'; // Assuming ags/time is correct
import { options as userOptions } from '../../options.js'; // Corrected path

import Battery from 'ags/service/battery'; // Use actual service path
// No more try-catch for dynamic import of Battery here.
// If 'ags/service/battery' fails, the app won't load this module correctly, which is fine.

// let battery = Battery; // If Battery itself is the service instance.
// Or if it's a class: const battery = new Battery() or Battery.get_default().
// Assuming 'ags/service/battery' exports the service instance directly, like other ags services.
// So, direct use of `Battery.percent`, `Battery.charging` etc. is expected.


function fileExists(filePath) {
    const file = Gio.File.new_for_path(filePath);
    return file.query_exists(null);
}

const FIRST_RUN_FILE = "firstrun.txt";
const FIRST_RUN_PATH = `${GLib.get_user_state_dir()}/ags/user/${FIRST_RUN_FILE}`;
const FIRST_RUN_FILE_CONTENT = "Just a file to confirm that you have been greeted ;)";
const APP_NAME = userOptions.appearance?.appName || "ags"; // Get app name from options or default
const FIRST_RUN_NOTIF_TITLE = "Welcome!";
const FIRST_RUN_NOTIF_BODY = `First run? For a list of keybinds, hit <span foreground="#c06af1" font_weight="bold">Super + /</span>.`;

var batteryWarnedStates = {}; // Store warned state for each level

async function batteryMessage() {
    // Use the imported Battery service directly.
    // Assumes properties like .available, .percent, .charging are reactive (accessors or GObject props)
    if (!Battery || !Battery.available) {
        return;
    }

    const perc = Battery.percent;
    const charging = Battery.charging;

    if (charging) {
        Object.keys(userOptions.battery.warnLevels).forEach(level => batteryWarnedStates[level] = false);
        return;
    }

    // Iterate from most critical to least critical warning
    const sortedWarnLevels = userOptions.battery.warnLevels
        .map((level, index) => ({ level, index }))
        .sort((a, b) => a.level - b.level); // Sort by percentage, lowest first

    let alreadyWarnedThisCycle = false;
    for (const { level, index } of sortedWarnLevels) {
        if (perc <= level && !charging && !batteryWarnedStates[level] && !alreadyWarnedThisCycle) {
            batteryWarnedStates[level] = true;
            alreadyWarnedThisCycle = true; // Prevent multiple notifications in one check cycle
            const title = userOptions.battery.warnTitles[index] || "Battery Low";
            const message = userOptions.battery.warnMessages[index] || `Battery is at ${perc}%.`;
            execAsync(['notify-send', title, message, '-u', 'critical', '-a', APP_NAME, '-t', '69420'])
                .catch(print);
            // Only show one warning per check, the most critical one not yet shown
            break;
        }
    }

    // Reset warnings for levels above current percentage
    for (const { level } of sortedWarnLevels) {
        if (perc > level) {
            batteryWarnedStates[level] = false;
        }
    }

    if (userOptions.battery.suspendThreshold && perc <= userOptions.battery.suspendThreshold && !charging) {
        execAsync(['notify-send', "Suspending system", `Critical battery level (${perc}% remaining)`, '-u', 'critical', '-a', APP_NAME, '-t', '69420'])
            .catch(print);
        execAsync('systemctl suspend').catch(print);
    }
}

export async function startBatteryWarningService() {
    if (!Battery) { // Check the imported service module/object itself
        console.log("Battery service module not available, cannot start battery warnings.");
        return;
    }
    // Initial check - batteryMessage already checks Battery.available
    await batteryMessage().catch(print);

    // Connect to battery property changes.
    // AGS services typically make their properties reactive.
    // If direct GObject, use 'notify::property-name'.
    // If an AGS JS service, it might have its own signals or rely on accessor reactivity.
    // Assuming 'notify::percent' and 'notify::charging' are standard GObject signals if Battery is a GObject.
    // If Battery is an AGS JS service, it might re-emit 'changed' or specific signals.
    // For now, let's assume the service object itself can be connected to for general changes,
    // or specific properties are GObject-like.
    // The `ags/service/battery` likely provides reactive properties directly.
    // Connecting to specific properties is safer.
    Battery.connect('notify::percent', () => batteryMessage().catch(print));
    Battery.connect('notify::charging', () => batteryMessage().catch(print));
    if (Battery.hasOwnProperty('available')) { // Check if 'available' property exists
        Battery.connect('notify::available', () => batteryMessage().catch(print));
    }
    // If Battery is an AGS service that emits a general 'changed' signal:
    // Battery.connect('changed', () => batteryMessage().catch(print));
}

export async function firstRunWelcome() {
    try {
        GLib.mkdir_with_parents(`${GLib.get_user_state_dir()}/ags/user`, 0o755);
        if (!fileExists(FIRST_RUN_PATH)) {
            const defaultWallpaper = userOptions.appearance?.defaultWallpaper || `${app.configDir}/assets/images/default_wallpaper.png`; // Corrected
            if (fileExists(defaultWallpaper)) {
                 execAsync([`${app.configDir}/scripts/color_generation/switchwall.sh`, defaultWallpaper]).catch(print); // Corrected
            } else {
                print(`Default wallpaper not found at ${defaultWallpaper}`);
            }

            await writeFileAsync(FIRST_RUN_FILE_CONTENT, FIRST_RUN_PATH);
            // The hyprctl keybind might be better managed by the Hyprland config itself or a dedicated Hyprland service script
            // execAsync(['hyprctl', 'keyword', 'bind', 'Super,Slash,exec,for ((i=0; i<$(hyprctl monitors -j | jq length); i++)); do ags -t "cheatsheet""$i"; done']).catch(print);

            // Delay for notifications
            timeout(500, () => {
                 execAsync(['notify-send', FIRST_RUN_NOTIF_TITLE, FIRST_RUN_NOTIF_BODY, '-a', APP_NAME]).catch(print);
            });
        }
    } catch (error) {
        console.error("Error during first run welcome:", error);
    }
}

// Example of how to call them in app.js:
// import { startAutoDarkModeService } from './services/darkModeService.js';
// import { firstRunWelcome, startBatteryWarningService } from './services/messagesService.js';
//
// App.init = function() {
//     // Other init stuff
//     startAutoDarkModeService();
//     firstRunWelcome();
//     startBatteryWarningService();
// }
//
// Or call them in App.main, but ensure they don't block if async and called without await.
// app.start({
//    main() {
//        startAutoDarkModeService();
//        firstRunWelcome(); // This is async
//        startBatteryWarningService(); // This is also async due to battery import
//    }
//    ...
// })
// It's often better to await these if they do critical setup, or let them run independently if not.
