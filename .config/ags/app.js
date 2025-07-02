"use strict";

// AGS Core
import App from 'ags/app';
import * as Utils from 'ags/utils'; // For Utils.timeout if still needed by any service directly
import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';

// Global Config
export const COMPILED_STYLE_DIR = `${GLib.get_user_cache_dir()}/ags/user/generated`;
import { options as userOptions } from './options.js'; // Real options loader
globalThis.userOptions = userOptions; // Make it global for convenience if some old utils still expect it.

// Services
import { handleStyles as applyInitialStyles } from './services/stylingService.js';
import { firstRunWelcome, startBatteryWarningService } from './services/messagesService.js';
import { startAutoDarkModeService } from './services/darkModeService.js'; // This service itself uses an interval
// Hyprland service is imported by components that need it.
// Other services (Audio, Mpris, Notifications, SystemTray, Bluetooth, etc.) are imported by components directly.

// Main UI Components (Window Exports)
import { BarWindow, BarCornerTopleft, BarCornerTopright } from './widgets/bar/Bar.js';
import CheatsheetWindow from './widgets/Cheatsheet.js';
import DockWindow from './widgets/Dock.js';
import ScreenCornerWindow, { manageFullscreenCorners } from './widgets/ScreenCorners.js';
import CrosshairWindow, { applyCrosshairStyles } from './widgets/Crosshair.js';
import IndicatorOSDWindow from './widgets/IndicatorOSD.js';
import OSKWindow from './widgets/OnScreenKeyboard.js';
import OverviewWindow from './widgets/Overview.js';
import SessionWindow from './widgets/Session.js';
import SideLeftWindow from './widgets/SideLeft.js';
import SideRightWindow from './widgets/SideRight.js';

// Helper for multi-monitor window instantiation
const range = (length, start = 0) => Array.from({ length }, (_, i) => i + start);
function forMonitors(widgetFactory) {
    const n = Gdk.Display.get_default()?.get_n_monitors() || 1;
    return range(n).map(monitorId => widgetFactory(monitorId)).flat(1);
}
// Simpler version if widgetFactory already returns an array or handles monitor prop itself
function forEachMonitor(widgetFactory) {
    const n = Gdk.Display.get_default()?.get_n_monitors() || 1;
    let windows = [];
    for (let i = 0; i < n; i++) {
        const result = widgetFactory(i); // Pass monitor ID
        if (Array.isArray(result)) {
            windows.push(...result);
        } else if (result) {
            windows.push(result);
        }
    }
    return windows;
}


// Define Windows
// Note: AGS v2 expects App.windows to be an array of Gtk.Window instances or functions that return them.
// Async components (like BarWindow) need to be handled.
// We can wrap async components in a simple sync Box that then loads them.
// Or, if App.windows can take promises, that's simpler.
// For now, assuming App.windows can handle functions that might return promises which resolve to windows,
// or that the async components are structured to return a placeholder and load content.
// The `BarWindow` and its sub-components are async due to workspace loading.
// A common pattern is to have App.windows be an array of functions, and AGS calls these.
// If a function is async, AGS might await it or handle the promise.
// Let's make `Windows` an async function.

const Windows = async () => {
    const windows = [];

    // Bar and its corners (BarWindow is async)
    const barWindows = await Promise.all(forEachMonitor(monitor => BarWindow({ monitor })));
    windows.push(...barWindows.filter(Boolean));

    if (userOptions.appearance.barRoundCorners) {
        const topLeftCorners = forEachMonitor(monitor => BarCornerTopleft({ monitor }));
        const topRightCorners = forEachMonitor(monitor => BarCornerTopright({ monitor }));
        windows.push(...topLeftCorners.filter(Boolean), ...topRightCorners.filter(Boolean));
    }

    // Other windows (assuming their main exported components are now functions taking {monitor} or just global)
    windows.push(...forEachMonitor(monitor => CheatsheetWindow({ monitor })));

    if (userOptions.dock?.enabled) {
        windows.push(...forEachMonitor(monitor => DockWindow({ monitor })));
    }

    if (userOptions.appearance.fakeScreenRounding !== 0) {
        windows.push(...forEachMonitor(monitor => ScreenCornerWindow({ monitor, where: 'top left' })));
        windows.push(...forEachMonitor(monitor => ScreenCornerWindow({ monitor, where: 'top right' })));
        windows.push(...forEachMonitor(monitor => ScreenCornerWindow({ monitor, where: 'bottom left' })));
        windows.push(...forEachMonitor(monitor => ScreenCornerWindow({ monitor, where: 'bottom right' })));
    }

    windows.push(...forEachMonitor(monitor => CrosshairWindow({ monitor })));
    windows.push(...forEachMonitor(monitor => IndicatorOSDWindow({ monitor })));
    windows.push(...forEachMonitor(monitor => OSKWindow({ monitor }))); // OSK is per monitor
    windows.push(OverviewWindow()); // Overview is typically global
    windows.push(...forEachMonitor(monitor => SessionWindow({ monitor }))); // Session screen per monitor

    // SideLeft and SideRight are usually global singletons
    windows.push(SideLeftWindow());
    windows.push(SideRightWindow());

    return windows.filter(Boolean); // Filter out any nulls if components conditionally return null
};


// App Initialization
async function main() {
    // Initialize services and styles first
    try {
        applyInitialStyles(true); // true to reset music styles etc.
        applyCrosshairStyles(); // Apply crosshair CSS variables

        // These service starters might need to be async or called after App.start if they use App.notify
        // For now, assuming they are fine here.
        await firstRunWelcome().catch(print); // From messagesService
        await startBatteryWarningService().catch(print); // From messagesService
        await startAutoDarkModeService().catch(print); // From darkModeService

        if (userOptions.appearance.fakeScreenRounding === 2) {
            manageFullscreenCorners(); // From ScreenCorners.js, sets up Hyprland event listener
        }

    } catch (error) {
        console.error("Error during pre-start initializations:", error);
    }

    const allWindows = await Windows();

    App.config({
        style: `${COMPILED_STYLE_DIR}/style.css`,
        windows: allWindows,
        // TODO: Check AGS v2 equivalents for these if needed:
        // stackTraceOnError: true,
        // closeWindowDelay: closeWindowDelays, // This was per-window name
        onConfigParsed: () => {
            console.log("AGS v2 Config Parsed and App Running");
            // Any post-startup logic
        }
    });
}

// Run main
main().catch(error => {
    console.error("Failed to start AGS application:", error);
    App.quit();
});
