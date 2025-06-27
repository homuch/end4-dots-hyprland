// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // v1
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib'; // For GLib.idle_add or GLib.timeout_add
// import Astal from 'gi://Astal'; // If Astal.Utils.timeout is needed

// Note: Lang is usually available globally in GJS environments once GObject is imported.
// If not, it might be: const Lang = imports.lang;
const Lang = imports.lang;


// TODO: Verify if Astal.Utils.timeout is available or use GLib.idle_add / GLib.timeout_add.
// For now, using GLib.idle_add for setup logic that should run once the widget is almost ready.

export const RoundedCorner = (place, props) => {
    const drawingArea = new Gtk.DrawingArea({
        ...props, // Spread existing props like className
        halign: place.includes('left') ? Gtk.Align.START : Gtk.Align.END, // Gtk.Widget.hpack is deprecated
        valign: place.includes('top') ? Gtk.Align.START : Gtk.Align.END,   // Gtk.Widget.vpack is deprecated
    });

    drawingArea.connect('realize', (widget) => {
        // Initial setup of size based on style properties often happens on 'realize'
        const styleContext = widget.get_style_context();
        const r = styleContext.get_property('border-radius', Gtk.StateFlags.NORMAL);
        widget.set_size_request(r, r);

        widget.connect('draw', Lang.bind(widget, (self, cr) => {
            const currentStyleContext = self.get_style_context(); // Re-fetch in case of theme changes
            const c = currentStyleContext.get_property('background-color', Gtk.StateFlags.NORMAL);
            const borderRadius = currentStyleContext.get_property('border-radius', Gtk.StateFlags.NORMAL);

            // Ensure size request is up-to-date if radius could change
            self.set_size_request(borderRadius, borderRadius);

            const width = self.get_allocated_width();
            const height = self.get_allocated_height();

            // Adjust drawing logic to use width/height for arc placement if r is just radius
            // Or assume r from border-radius is the size of the drawing area.
            // The original code implies r (border-radius) dictates the size of the DrawingArea.

            switch (place) {
                case 'topleft':
                case 'topleft': // Assuming borderRadius is the radius and also width/height of the corner
                    cr.arc(borderRadius, borderRadius, borderRadius, Math.PI, 3 * Math.PI / 2);
                    cr.lineTo(0, 0);
                    break;

                case 'topright':
                    cr.arc(0, borderRadius, borderRadius, 3 * Math.PI / 2, 2 * Math.PI);
                    cr.lineTo(borderRadius, 0);
                    break;

                case 'bottomleft':
                    cr.arc(borderRadius, 0, borderRadius, Math.PI / 2, Math.PI);
                    cr.lineTo(0, borderRadius);
                    break;

                case 'bottomright':
                    cr.arc(0, 0, borderRadius, 0, Math.PI / 2);
                    cr.lineTo(borderRadius, borderRadius);
                    break;
            }

            cr.closePath();
            cr.setSourceRGBA(c.red, c.green, c.blue, c.alpha);
            cr.fill();
            // cr.setLineWidth(borderWidth); // Border drawing commented out in original
            // cr.setSourceRGBA(borderColor.red, borderColor.green, borderColor.blue, borderColor.alpha);
            // cr.stroke();
        }));
    });
    return drawingArea;
};