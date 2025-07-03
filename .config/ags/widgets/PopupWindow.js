import app from 'ags/gtk4/app';
import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';

// Placeholder for closeEverything. For now, assumes closing the current window.
// This might need to be a more sophisticated App-level function if it closes more than just this window.
function closeThisWindow(windowName) {
    app.closeWindow(windowName);
}

export function PopupWindow({
    name,
    children, // Replaces 'child' prop from v1
    showClassName = "", // For animation/styling when shown
    hideClassName = "", // For animation/styling when hidden (or base style)
    anchor = ['top', 'left'], // Default anchor
    layer = 'top',
    exclusivity = 'normal', // Gtk.WindowExclusivity
    keymode = 'on-demand', // AGS specific for key capture? Or Gtk.Window 'modal'?
                           // The v1 PopupWindow didn't explicitly set keymode in its definition,
                           // but it was often passed in the example usage (e.g. Cheatsheet).
                           // If 'keymode' is an AGS Window prop, it can be passed in ...props.
                           // For GTK's modal behavior, it's `modal: true`.
    ...props // Other Gtk.Window or window properties
}) {
    // The main child Box that will handle classes and keybinds
    const contentBox = box({
        // Set initial classes if provided. The hideClassName might be the default state.
        className: `${hideClassName || ''} ${showClassName || ''}`, // Start with both, hide will likely make it invisible
        children: children,
        // It's better to attach event controllers to the window itself if it needs to grab all key events.
        // However, if only the box content needs to react, this is fine.
        // For an "Escape" key to close the window, it's common to put it on the window.
    });

    const win = window({
        name,
        visible: false, // Popups start hidden
        layer,
        anchor: anchor, // Ensure anchor is an array e.g. ['top', 'left']
        exclusivity,
        ...props, // Spread other Gtk.Window props
        child: contentBox,
        setup: (self) => { // self is the window instance
            // Handle Escape key to close the window
            // Option 1: EventControllerKey (more GTK4 idiomatic)
            const controller = Gtk.EventControllerKey.new();
            controller.connect('key-pressed', (eventController, keyval, keycode, modifier) => {
                if (keyval === Gdk.KEY_Escape) {
                    closeThisWindow(name);
                    return Gdk.EVENT_STOP; // Stop further processing if handled
                }
                return Gdk.EVENT_PROPAGATE;
            });
            self.add_controller(controller);

            // Option 2: Connect to 'key-press-event' signal (simpler for basic cases)
            // self.connect('key-press-event', (widget, event) => {
            //     if (event.get_keyval()[1] === Gdk.KEY_Escape) { // GDK3 way
            //     if (event.get_keyval() === Gdk.KEY_Escape) { // GDK4 way
            //         closeThisWindow(name);
            //         return true; // Stop propagation
            //     }
            //     return false;
            // });

            // Handle class toggling for show/hide animations via App signal
            if (showClassName && hideClassName) {
                // Initialize with hideClassName effectively active if animations depend on it
                contentBox.remove_css_class(showClassName); // Ensure show is not active
                contentBox.add_css_class(hideClassName);   // Ensure hide is active

                app.connect('window-toggled', (_app, windowName, visible) => { // _app because app is already in scope
                    if (windowName === name) {
                        if (visible) {
                            contentBox.remove_css_class(hideClassName);
                            contentBox.add_css_class(showClassName);
                        } else {
                            // Important: If hideClassName is for a "hiding" animation,
                            // it should be added. If it's the base state that showClassName
                            // overrides, then removing showClassName might be enough.
                            // Original logic: self.toggleClassName(hideClassName, !visible);
                            // This means when NOT visible (visible=false), hideClassName is ADDED.
                            // When IS visible (visible=true), hideClassName is REMOVED.
                            contentBox.remove_css_class(showClassName);
                            contentBox.add_css_class(hideClassName);
                        }
                    }
                });
            }
        }
    });

    return win;
}
