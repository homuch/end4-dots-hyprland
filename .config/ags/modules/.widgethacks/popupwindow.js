// import App from 'resource:///com/github/Aylur/ags/app.js'; // v1
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // v1
// const { Box, Window } = Widget; //v1
import Astal from 'gi://Astal';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk'; // For key constants like Gdk.KEY_Escape

// closeEverything is a global function defined in variables.js, assumed to be available.
// globalThis.closeEverything()

export default ({
    name,
    child, // This will be a Gtk.Widget
    showClassName = "",
    hideClassName = "",
    ...props // These are props for the Window
}) => {
    // Create the main window. This needs to be a layer shell window.
    // The specifics of Astal.Window vs Gtk.Window + Astal.LayerShell are crucial.
    // Assuming an Astal.Window or similar that handles layer shell integration.
    const window = new Gtk.Window({ // Placeholder: This should be an Astal LayerShell window
        name: name,
        visible: false,
        // layer: 'top', // This needs to be set via Astal's LayerShell API
        ...props, // Pass through other props like anchor, exclusivity, monitor, keymode
    });

    // TODO: Apply gtk-layer-shell properties using Astal's API
    // Example (highly speculative based on common patterns):
    // if (Astal.LayerShell) {
    //     Astal.LayerShell.init_for_window(window);
    //     Astal.LayerShell.set_layer(window, Astal.LayerShell.Layer.TOP);
    //     if (props.anchor) { /* Apply anchors */ }
    //     if (props.exclusivity) { /* Apply exclusivity */ }
    //     if (props.monitor) { /* Apply monitor */ }
    //     // Astal.LayerShell.set_keyboard_interactivity(window, props.keymode === 'on-demand'); // for keymode
    // }


    const box = new Gtk.Box({});
    box.add(child); // Add the passed child widget to the box

    // Setup logic, equivalent to v1's setup block
    window.connect('realize', () => { // Use 'realize' for setup that needs the widget to be ready
        // Keybinding for Escape
        // Gtk key handling is more involved than ags v1's keybind helper.
        // Usually, connect to 'key-press-event'.
        window.connect('key-press-event', (widget, event) => {
            if (event.get_keyval()[1] === Gdk.KEY_Escape) {
                if (globalThis.closeEverything) {
                    globalThis.closeEverything();
                } else {
                    // Fallback if closeEverything is not on globalThis for some reason
                    Astal.App.closeWindow(name); // Close itself at least
                }
                return true; // Event handled
            }
            return false; // Event not handled
        });

        if (showClassName !== "" && hideClassName !== "") {
            // Initial class state
            box.get_style_context().add_class(showClassName);
            box.get_style_context().add_class(hideClassName);

            // Hook to App visibility changes
            // TODO: Confirm Astal.App signal name and arguments for window visibility
            Astal.App.connect('window-toggled', (app, windowName, visible) => {
                if (windowName === name) {
                    if (visible) {
                        box.get_style_context().remove_class(hideClassName);
                        box.get_style_context().add_class(showClassName); // Ensure show is there
                    } else {
                        box.get_style_context().remove_class(showClassName);
                        box.get_style_context().add_class(hideClassName);
                    }
                }
            });
            // Set initial state based on current visibility (if already known)
            // This might be tricky as the window is initially not visible.
            // The App.connect above should handle the first toggle.
            // If the window is made visible by default later, this class might need adjustment.
             if (!window.get_visible()) { // If starts hidden
                box.get_style_context().remove_class(showClassName);
                box.get_style_context().add_class(hideClassName);
            } else {
                box.get_style_context().remove_class(hideClassName);
                box.get_style_context().add_class(showClassName);
            }
        }
    });

    window.add(box);
    // Do not call window.show_all() here, visibility is controlled by App.toggleWindow(name)
    return window;
};