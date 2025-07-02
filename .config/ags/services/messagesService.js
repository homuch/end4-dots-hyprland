import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import App from 'ags/app';
import { execAsync } from 'ags/process';
import { writeFileAsync } from 'ags/file'; // Or 'writeFile' if sync is fine and preferred
import { timeout } from 'ags/time';
import { options as userOptions } from '../options.js'; // Assuming userOptions is an object

// Battery service - V2 style
// TODO: Verify the actual GObject Introspection name and properties for the v2 Battery service.
// Assuming 'gi://AstalBattery' and properties like 'percent', 'charging', 'available'.
let Battery;
let battery;
try {
    Battery = (await import('gi://AstalBattery')).default;
    battery = Battery.get_default();
} catch (e) {
    console.warn("AstalBattery service not available. Battery warnings will be disabled.", e);
    Battery = null; // Ensure Battery is null if import fails
    battery = null;
}


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
    if (!battery || !battery.available) { // Check if battery service is available and battery exists
        return;
    }

    const perc = battery.percent;
    const charging = battery.charging;

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
    if (!Battery || !battery) { // Do not start if service not available
        console.log("Battery service not available, cannot start battery warnings.");
        return;
    }
    // Initial check
    await batteryMessage().catch(print);

    // Connect to battery property changes
    // TODO: Verify exact signals. Common ones are 'notify::percent', 'notify::charging'
    // For simplicity, if a general 'changed' or similar signal exists, it's easier.
    // Otherwise, connect to specific properties.
    // Using a generic 'changed' if available, or 'notify::percent' as a common specific one.
    // The Astal services might emit a more generic signal or one per property.
    // Let's assume 'notify::percent' and 'notify::charging' for now.
    battery.connect('notify::percent', () => batteryMessage().catch(print));
    battery.connect('notify::charging', () => batteryMessage().catch(print));
    // Some services might also have an explicit 'available' property if the battery can be removed
    if (Object.getOwnPropertyDescriptor(battery, 'available')) {
     battery.connect('notify::available', () => batteryMessage().catch(print));
    }
}

export async function firstRunWelcome() {
    try {
        GLib.mkdir_with_parents(`${GLib.get_user_state_dir()}/ags/user`, 0o755);
        if (!fileExists(FIRST_RUN_PATH)) {
            const defaultWallpaper = userOptions.appearance?.defaultWallpaper || `${App.configDir}/assets/images/default_wallpaper.png`;
            if (fileExists(defaultWallpaper)) {
                 execAsync([`${App.configDir}/scripts/color_generation/switchwall.sh`, defaultWallpaper]).catch(print);
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
