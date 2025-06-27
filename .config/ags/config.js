"use strict";
// Import
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
// import App from 'resource:///com/github/Aylur/ags/app.js' // Old v1 import
// import * as Utils from 'resource:///com/github/Aylur/ags/utils.js' // Old v1 import
import Astal from 'gi://Astal'; // Main Astal import
// Gtk will likely be needed directly for widget creation
import Gtk from 'gi://Gtk';

// TODO: Check if Astal.Utils exists or if specific utilities need to be imported differently.
// For now, direct calls to Utils.subprocess, Utils.execAsync etc. might fail
// and will need to be replaced with Astal.Utils.subprocess or similar.

// Stuff
import userOptions from './modules/.configuration/user_options.js';
import { firstRunWelcome, startBatteryWarningService } from './services/messages.js';
import { startAutoDarkModeService } from './services/darkmode.js';
// Widgets
import { Bar, BarCornerTopleft, BarCornerTopright } from './modules/bar/main.js';
import Cheatsheet from './modules/cheatsheet/main.js';
// import DesktopBackground from './modules/desktopbackground/main.js';
import Dock from './modules/dock/main.js';
import Corner from './modules/screencorners/main.js';
import Crosshair from './modules/crosshair/main.js';
import Indicator from './modules/indicators/main.js';
import Osk from './modules/onscreenkeyboard/main.js';
import Overview from './modules/overview/main.js';
import Session from './modules/session/main.js';
import SideLeft from './modules/sideleft/main.js';
import SideRight from './modules/sideright/main.js';
import { COMPILED_STYLE_DIR } from './init.js';

const range = (length, start = 1) => Array.from({ length }, (_, i) => i + start);
function forMonitors(widget) {
    const n = Gdk.Display.get_default()?.get_n_monitors() || 1;
    return range(n, 0).map(widget).flat(1);
}
function forMonitorsAsync(widget) {
    const n = Gdk.Display.get_default()?.get_n_monitors() || 1;
    return range(n, 0).forEach((n) => widget(n).catch(print))
}

// Start stuff
// TODO: Find definition of handleStyles or replace with Astal equivalent for styling.
// handleStyles(true);
startAutoDarkModeService().catch(print);
firstRunWelcome().catch(print);
startBatteryWarningService().catch(print)

// TODO: Window definitions below will need complete rewrite for Astal.
// This is just a placeholder to keep the structure.
const Windows = () => [
    // forMonitors(DesktopBackground),
    forMonitors(Crosshair),
    Overview(),
    forMonitors(Indicator),
    forMonitors(Cheatsheet),
    SideLeft(),
    SideRight(),
    forMonitors(Osk),
    forMonitors(Session),
    ...(userOptions.dock.enabled ? [forMonitors(Dock)] : []),
    ...(userOptions.appearance.fakeScreenRounding !== 0 ? [
        forMonitors((id) => Corner(id, 'top left', true)),
        forMonitors((id) => Corner(id, 'top right', true)),
        forMonitors((id) => Corner(id, 'bottom left', true)),
        forMonitors((id) => Corner(id, 'bottom right', true)),
    ] : []),
    ...(userOptions.appearance.barRoundCorners ? [
        forMonitors(BarCornerTopleft),
        forMonitors(BarCornerTopright),
    ] : []),
];

const CLOSE_ANIM_TIME = 210; // Longer than actual anim time to make sure widgets animate fully
const closeWindowDelays = {}; // For animations
for (let i = 0; i < (Gdk.Display.get_default()?.get_n_monitors() || 1); i++) {
    closeWindowDelays[`osk${i}`] = CLOSE_ANIM_TIME;
}

// App.config({ // Old v1 config
//     css: `${COMPILED_STYLE_DIR}/style.css`,
//     stackTraceOnError: true,
//     closeWindowDelay: closeWindowDelays,
//     windows: Windows().flat(1),
// });

Astal.App.config({
    // TODO: Verify how styles are passed in Astal. This assumes it's similar.
    style: `${COMPILED_STYLE_DIR}/style.css`, // Property name might be 'style' or 'stylesheet'
    stackTraceOnError: true, // Assuming this option remains
    // TODO: Investigate Astal's equivalent for closeWindowDelay if needed.
    // closeWindowDelay: closeWindowDelays,

    // TODO: The Windows() function needs to be refactored to return Astal windows.
    // This will likely cause errors until modules are migrated.
    windows: Windows().flat(1),
});

// TODO: Ensure Astal.App automatically handles async setup of windows like Bar,
// or if a different approach is needed.
// The Bar module and its creation will need a full rewrite.
// forMonitorsAsync(Bar);
// Bar().catch(print); // Use this to debug the bar. Single monitor only.

