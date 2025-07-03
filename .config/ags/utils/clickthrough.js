import Cairo from 'gi://cairo?version=1.0';

// A shared, empty Cairo region.
// It's generally safe to share an empty region for this purpose.
const dummyRegion = new Cairo.Region();

/**
 * Makes a GTK widget click-through by setting its input shape to an empty region.
 * This means the widget will not receive any input events (e.g., clicks, mouse movements),
 * and events will pass through to widgets below it.
 *
 * @param {Gtk.Widget} widget The widget to make click-through.
 */
export function enableClickthrough(widget) {
    if (widget && typeof widget.input_shape_combine_region === 'function') {
        widget.input_shape_combine_region(dummyRegion);
    } else {
        console.warn("Attempted to enable clickthrough on an invalid widget:", widget);
    }
}
