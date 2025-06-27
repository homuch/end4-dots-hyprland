// const { Gtk } = imports.gi; // Gtk will be imported directly
import Gtk from 'gi://Gtk';
import Astal from 'gi://Astal'; // Main Astal import

// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // Old v1
// import Battery from 'resource:///com/github/Aylur/ags/service/battery.js'; // Old v1
// TODO: Replace with Astal.Battery service, assuming it's Astal.Services.Battery or similar
// For now, we'll assume Battery service is available globally or passed differently.

import WindowTitle from "./normal/spaceleft.js"; // Needs migration
import Indicators from "./normal/spaceright.js";
import Music from "./normal/music.js";
import System from "./normal/system.js";
import { enableClickthrough } from "../.widgetutils/clickthrough.js";
import { RoundedCorner } from "../.commonwidgets/cairo_roundedcorner.js";
import { currentShellMode } from '../../variables.js';

const NormalOptionalWorkspaces = async () => {
    try {
        return (await import('./normal/workspaces_hyprland.js')).default();
    } catch {
        try {
            return (await import('./normal/workspaces_sway.js')).default();
        } catch {
            return null;
        }
    }
};

const FocusOptionalWorkspaces = async () => {
    try {
        return (await import('./focus/workspaces_hyprland.js')).default();
    } catch {
        try {
            return (await import('./focus/workspaces_sway.js')).default();
        } catch {
            return null;
        }
    }
};

export const Bar = async (monitor = 0) => {
    const SideModule = (childrenWidgets) => {
        const box = new Gtk.Box({ className: 'bar-sidemodule' });
        // Assuming childrenWidgets is an array of already created Gtk.Widget instances
        childrenWidgets.forEach(child => box.add(child));
        return box;
    };

    // Normal Bar Content
    const normalBarContent = new Gtk.CenterBox({ className: 'bar-bg' });
    // TODO: Refactor setup for normalBarContent
    // setup: (self) => {
    //     const styleContext = self.get_style_context();
    //     const minHeight = styleContext.get_property('min-height', Gtk.StateFlags.NORMAL);
    //     // execAsync -> Astal.Utils.execAsync
    // },
    normalBarContent.set_start_widget(await WindowTitle(monitor)); // WindowTitle will need to return a Gtk.Widget

    const normalCenterBox = new Gtk.Box({ className: 'spacing-h-4' });
    const musicWidget = Music(); // Assuming Music() returns a Gtk.Widget
    const normalWorkspacesWidget = await NormalOptionalWorkspaces(); // Returns Gtk.Widget or null
    const systemWidget = System(); // Assuming System() returns a Gtk.Widget

    normalCenterBox.add(SideModule([musicWidget]));
    const workspaceContainer = new Gtk.Box({ homogeneous: true });
    if (normalWorkspacesWidget) workspaceContainer.add(normalWorkspacesWidget);
    normalCenterBox.add(workspaceContainer);
    normalCenterBox.add(SideModule([systemWidget]));
    normalBarContent.set_center_widget(normalCenterBox);

    normalBarContent.set_end_widget(Indicators(monitor)); // Indicators will need to return a Gtk.Widget

    // Focused Bar Content
    const focusedBarContent = new Gtk.CenterBox({ className: 'bar-bg-focus' });
    focusedBarContent.set_start_widget(new Gtk.Box({})); // Empty box

    const focusedCenterBox = new Gtk.Box({ className: 'spacing-h-4' });
    const focusWorkspacesWidget = await FocusOptionalWorkspaces(); // Returns Gtk.Widget or null
    focusedCenterBox.add(SideModule([])); // Empty SideModule
    const focusWorkspaceContainer = new Gtk.Box({ homogeneous: true });
    if (focusWorkspacesWidget) focusWorkspaceContainer.add(focusWorkspacesWidget);
    focusedCenterBox.add(focusWorkspaceContainer);
    focusedCenterBox.add(SideModule([])); // Empty SideModule
    focusedBarContent.set_center_widget(focusedCenterBox);

    focusedBarContent.set_end_widget(new Gtk.Box({})); // Empty box

    // TODO: Refactor setup for focusedBarContent (Battery hook)
    // setup: (self) => {
    //     self.hook(Battery, (self) => { // This needs Astal's service connection
    //         if (!Battery.available) return;
    //         self.toggleClassName('bar-bg-focus-batterylow', Battery.percent <= userOptions.battery.low);
    //     })
    // }
    focusedBarContent.connect('realize', () => { // Example: use 'realize' for setup
        // TODO: Hook to Astal.Battery service here
        // const battery = Astal.Services.Battery; // Hypothetical
        // battery.connect('changed', () => {
        //    if (!battery.available) return;
        //    focusedBarContent.toggleClassName('bar-bg-focus-batterylow', battery.percent <= userOptions.battery.low);
        // });
    });


    const nothingContent = new Gtk.Box({ className: 'bar-bg-nothing' });

    // Main Window
    // TODO: Replace with Astal.Window or properly configured Gtk.Window for layer shell
    const barWindow = new Gtk.Window({ // This is a plain Gtk.Window, layer shell props missing!
        name: `bar${monitor}`,
        // monitor: monitor, // Gtk.Window doesn't have 'monitor' like this. Need layer shell.
        // anchor: ['top', 'left', 'right'], // Layer shell property
        // exclusivity: 'exclusive', // Layer shell property
        visible: true,
    });
    // Astal.App.addWindow(barWindow); // Or however Astal registers windows if not via config
    // TODO: Set up gtk-layer-shell properties for barWindow using Astal's API
    // Astal.LayerShell.init_for_window(barWindow);
    // Astal.LayerShell.set_monitor(barWindow, Gdk.Display.get_default().get_monitor(monitor));
    // Astal.LayerShell.set_layer(barWindow, Astal.LayerShell.Layer.TOP);
    // Astal.LayerShell.set_anchor(barWindow, Astal.LayerShell.Edge.TOP, true);
    // Astal.LayerShell.set_anchor(barWindow, Astal.LayerShell.Edge.LEFT, true);
    // Astal.LayerShell.set_anchor(barWindow, Astal.LayerShell.Edge.RIGHT, true);
    // Astal.LayerShell.set_exclusivity_zone(barWindow, -1); // for "exclusive"

    const stack = new Gtk.Stack({
        homogeneous: false,
        transition_type: Gtk.StackTransitionType.SLIDE_UP_DOWN,
        transition_duration: userOptions.animations.durationLarge, // Assuming userOptions is migrated
    });

    stack.add_named(normalBarContent, 'normal');
    stack.add_named(focusedBarContent, 'focus');
    stack.add_named(nothingContent, 'nothing');

    // TODO: Refactor setup for stack (currentShellMode hook)
    // setup: (self) => self.hook(currentShellMode, (self) => {
    //     self.shown = currentShellMode.value[monitor]; // self.shown becomes stack.visible_child_name
    // })
    // currentShellMode (from variables.js) needs to be an Astal observable or similar
    // currentShellMode.connect('changed', () => { // Assuming currentShellMode is an Astal Variable
    //    stack.visible_child_name = currentShellMode.value[monitor];
    // });
    // Initial state:
    // stack.visible_child_name = currentShellMode.value[monitor];


    barWindow.add(stack);
    barWindow.show_all(); // Important for Gtk windows created programmatically

    return barWindow; // This function now returns a Gtk.Window instance
}

// TODO: Refactor BarCorner* functions similarly using Astal.Window/Gtk.Window + LayerShell
export const BarCornerTopleft = (monitor = 0) => {
    // Placeholder:
    const win = new Gtk.Window({ name: `barcornertl${monitor}`, visible: true });
    // Astal.LayerShell.init_for_window(win);
    // ... set layer, anchor, monitor ...
    // win.add(RoundedCorner('topleft', { className: 'corner', })); // RoundedCorner needs migration
    // setup enableClickthrough
    return win;
};
export const BarCornerTopright = (monitor = 0) => {
    // Placeholder:
    const win = new Gtk.Window({ name: `barcornertr${monitor}`, visible: true });
    // Astal.LayerShell.init_for_window(win);
    // ... set layer, anchor, monitor ...
    // win.add(RoundedCorner('topright', { className: 'corner', })); // RoundedCorner needs migration
    // setup enableClickthrough
    return win;
};
