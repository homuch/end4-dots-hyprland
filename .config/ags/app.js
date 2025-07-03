"use strict";

// AGS Core
import app from 'ags/gtk4/app';
import { Astal, Gtk, Gdk, GLib } from 'ags/gtk4';
// import { timeout as AgsTimeout, interval as AgsInterval } from 'ags/time'; // If needed by services

// Global Config
export const COMPILED_STYLE_DIR = `${GLib.get_user_cache_dir()}/ags/user/generated`;
import { options as userOptions } from './options.js';
globalThis.userOptions = userOptions; // For convenience if any util still uses it

// Services & Initializers
import { handleStyles as applyInitialStyles } from './services/stylingService.js';
import { firstRunWelcome, startBatteryWarningService } from './services/messagesService.js';
import { startAutoDarkModeService } from './services/darkModeService.js';
import { manageFullscreenCorners } from './widgets/ScreenCorners.js'; // Has Hyprland logic
import { applyCrosshairStyles } from './widgets/Crosshair.js';   // CSS var setup

// Main UI Window Component Constructors (these are functions that return JSX)
import BarWindow, { BarCornerTopleft, BarCornerTopright } from './widgets/bar/Bar.js';
import CheatsheetWindow from './widgets/Cheatsheet.js';
import DockWindow from './widgets/Dock.js';
import ScreenCornerWindow from './widgets/ScreenCorners.js';
import CrosshairWindow from './widgets/Crosshair.js';
import IndicatorOSDWindow from './widgets/IndicatorOSD.js';
import OSKWindow from './widgets/OnScreenKeyboard.js';
import OverviewWindow from './widgets/Overview.js';
import SessionWindow from './widgets/Session.js';
import SideLeftWindow from './widgets/SideLeft.js';
import SideRightWindow from './widgets/SideRight.js';

// Helper for multi-monitor window instantiation
const createWindowsForMonitors = (widgetFactory) => {
    const display = Gdk.Display.get_default();
    if (!display) return [];
    const numMonitors = display.get_n_monitors();
    let windows = [];
    for (let i = 0; i < numMonitors; i++) {
        const monitor = display.get_monitor(i);
        // Pass Gdk.Monitor as gdkmonitor, and monitorId as monitorId if needed
        const result = widgetFactory({
            gdkmonitor: monitor,
            monitorId: monitor.get_monitor_number()
        });
        if (Array.isArray(result)) {
            windows.push(...result);
        } else if (result) {
            windows.push(result);
        }
    }
    return windows;
};

// Define the list of windows for the app
// This function will be called by app.start()
// It can be async if needed (e.g., if BarWindow itself needs to do async setup before returning JSX)
const appWindows = async () => {
    const windows = [];

    // Bar and its corners
    // BarWindow is async, so await it.
    const barWindows = await Promise.all(createWindowsForMonitors(props => BarWindow(props)));
    windows.push(...barWindows.filter(Boolean));

    if (userOptions.appearance.barRoundCorners) {
        windows.push(...createWindowsForMonitors(props => BarCornerTopleft(props)));
        windows.push(...createWindowsForMonitors(props => BarCornerTopright(props)));
    }

    // Other windows
    windows.push(...createWindowsForMonitors(props => CheatsheetWindow(props)));

    if (userOptions.dock?.enabled) {
        windows.push(...createWindowsForMonitors(props => DockWindow(props)));
    }

    if (userOptions.appearance.fakeScreenRounding !== 0) {
        const corners = ['top left', 'top right', 'bottom left', 'bottom right'];
        corners.forEach(pos => {
            windows.push(...createWindowsForMonitors(props => ScreenCornerWindow({ ...props, where: pos })));
        });
    }

    windows.push(...createWindowsForMonitors(props => CrosshairWindow(props)));
    windows.push(...createWindowsForMonitors(props => IndicatorOSDWindow(props)));
    windows.push(...createWindowsForMonitors(props => OSKWindow(props)));
    windows.push(OverviewWindow({})); // Global overview, no specific monitor object needed by default
    windows.push(...createWindowsForMonitors(props => SessionWindow(props)));

    windows.push(SideLeftWindow({})); // Global, no monitor prop needed by default
    windows.push(SideRightWindow({})); // Global

    return windows.filter(Boolean);
};

// Initialize services and global styles before starting the app
async function performInitialSetup() {
    try {
        console.log("AGS App: Performing initial setup...");
        applyInitialStyles(true);
        applyCrosshairStyles();

        await firstRunWelcome().catch(e => console.error("First run welcome error:", e));
        await startBatteryWarningService().catch(e => console.error("Battery warning service error:", e));
        await startAutoDarkModeService().catch(e => console.error("Auto dark mode service error:", e));

        if (userOptions.appearance.fakeScreenRounding === 2) {
            manageFullscreenCorners();
        }
        console.log("AGS App: Initial setup complete.");
    } catch (error) {
        console.error("Error during app initial setup:", error);
    }
}

// Main app configuration and start
async function runAgs() {
    await performInitialSetup(); // Ensure setup completes before windows are configured

    const windows = await appWindows(); // Get all window definitions

    app.config({ // Use app.config for global settings like CSS and windows
        css: [`${COMPILED_STYLE_DIR}/style.css`],
        windows: windows,
        // AGS v2 might not use onConfigParsed here. Startup logic is in this file.
        // If specific signals like 'window-added' or 'started' are needed, connect to `app` instance.
        // Example: app.connect('started', () => console.log('AGS App fully started!'));
    });

    // If app.start() is also needed and distinct from app.config() in v2:
    // The example `app.start({ main() { Bar(0); } })` implies `main` creates windows.
    // However, `app.config({ windows: [...] })` is also a common pattern from v1.
    // The migration guide says `App.config` -> `app.start`.
    // If `app.start` is the sole entry point:
    // app.start({
    //     css: [`${COMPILED_STYLE_DIR}/style.css`],
    //     main: async () => {
    //         await performInitialSetup();
    //         const windows = await appWindows();
    //         // How windows created here are added to app for management (toggle, etc.)?
    //         // Typically, if not passed to app.start's `windows` array, they are added via app.add_window().
    //         // Or, the JSX components themselves, when rendered, register with the app if `application={app}` is passed.
    //         // The example showed `application={app}` on window components.
    //         // The array of JSX elements returned by appWindows() should be handled by AGS when passed to `app.config({ windows: ... })`.
    //         // Let's stick to `app.config` for now as it was used in my previous `app.js`.
    //         // If `app.start` is the actual entry, then the above `app.config` might be incorrect,
    //         // and `app.start` would take the windows array.
    //         // The user's example `app.start({ main() { Bar(0); }})` is for non-config-file based setup.
    //         // If this `app.js` IS the config file, `app.config` is more likely.
    //         // However, the migration guide explicitly says: "The entry point in code changed from App.config to app.start"
    //         // This implies `app.start` should be the main call.
    //     }
    // });
    // Given the migration guide, `app.start` is the correct top-level call.
    // The `windows` option in `app.start` is for windows to be managed by name.
    // Components returned by the `windows` function are added to the app.
    // The `main` function in `app.start` is for any other startup logic.
    // So, the current `app.config` call should become part of `app.start`.

    // Final structure attempt based on migration guide and examples:
    // `app.js` will be run by `ags -c config.js` (or `ags run` if named app.js)
    // `app.start` is the main function to call.

    // This file itself, when executed by AGS, effectively calls app.start().
    // The exported object (if any) might be what AGS uses.
    // The user example `export default function Bar...` suggests components are defined.
    // The `app.start({ main() { new Window(...) }})` is one pattern.
    // `app.start({ windows: [WindowA, WindowB] })` is another for named windows.
    // Let's use the latter, passing our async window generator.
}

runAgs().catch(error => {
    console.error("Failed to run AGS application:", error);
    if (app && typeof app.quit === 'function') {
        app.quit();
    }
});

// If AGS expects this file to export a config object:
// export default {
//    style: `${COMPILED_STYLE_DIR}/style.css`,
//    windows: appWindows, // Pass the async function
//    // Other global app settings
// };
// However, `app.start()` is more explicit as per migration guide.
// The `app.js` or `config.js` file is executed, and `app.start()` makes it run.
// No explicit export might be needed if `app.start()` is called directly.
// I will remove the final `export default app;` from the previous version.
// The `app.start` call itself will run the application.
// The `configLocation` in `app.start` might be redundant if this IS the config file.
// It was in my previous `app.js`, removing it for now.
// The `css` can be an array.
// The `windows` property in `app.start` can be a function (async or sync) that returns an array of windows.

// Final `app.start` structure:
app.start({
    css: [`${COMPILED_STYLE_DIR}/style.css`],
    windows: async () => {
        await performInitialSetup(); // Run initializations first
        return appWindows(); // This returns a promise of an array of JSX elements
    },
    // onStarted: () => { console.log("AGS App Started (onStarted signal)"); } // If Astal.Application has this
});
