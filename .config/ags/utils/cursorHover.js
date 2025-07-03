// Cursor names reference: https://docs.gtk.org/gdk4/ctor.Cursor.new_from_name.html
import Gdk from 'gi://Gdk';

/**
 * Changes the mouse cursor on hover for a GTK widget.
 * @param {Gtk.Widget} widget The widget to apply cursor hover effect.
 * @param {string} cursorName The name of the GDK cursor to use on hover (e.g., 'pointer', 'crosshair').
 */
export function setupCursorHover(widget, cursorName = 'pointer') {
    if (!widget || typeof widget.connect !== 'function') {
        console.warn("Invalid widget passed to setupCursorHover:", widget);
        return;
    }

    const display = Gdk.Display.get_default(); // Still needed for Gdk.Cursor.new_from_name in some contexts

    widget.connect('enter-notify-event', () => {
        const surface = widget.get_surface();
        if (surface) {
            const cursor = Gdk.Cursor.new_from_name(cursorName, null); // display is often optional or taken from widget
            if (cursor) {
                surface.set_cursor(cursor);
            } else {
                // console.warn(`Cursor with name '${cursorName}' not found.`);
            }
        }
    });

    widget.connect('leave-notify-event', () => {
        const surface = widget.get_surface();
        if (surface) {
            // Reset to default cursor. Gdk.Cursor.new_from_name('default', null) should work.
            const defaultCursor = Gdk.Cursor.new_from_name('default', null);
            if (defaultCursor) {
                surface.set_cursor(defaultCursor);
            } else {
                 // Fallback if 'default' cursor name isn't found, though it should be.
                surface.set_cursor(null); // Setting null might also reset to default
            }
        }
    });
}

export function setupCursorHoverPointer(widget) {
    setupCursorHover(widget, 'pointer');
}

export function setupCursorHoverAim(widget) {
    setupCursorHover(widget, 'crosshair');
}

export function setupCursorHoverGrab(widget) {
    setupCursorHover(widget, 'grab');
}

export function setupCursorHoverInfo(widget) {
    setupCursorHover(widget, 'help');
}

export function setupCursorHoverHResize(widget) {
    setupCursorHover(widget, 'ew-resize');
}

export function setupCursorHoverVResize(widget) {
    setupCursorHover(widget, 'ns-resize');
}
