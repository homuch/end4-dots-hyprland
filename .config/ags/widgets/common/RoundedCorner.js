import Gtk from 'gi://Gtk?version=4.0';
import Cairo from 'gi://cairo'; // Not explicitly imported in v1 but used by DrawingArea's cr
import { drawingarea } from 'ags/widgets';
// Utils.timeout isn't directly available. Setup ($) should be sufficient.

export default function RoundedCorner({ place, ...props }) {
    const getHPack = () => place.includes('left') ? 'start' : 'end';
    const getVPack = () => place.includes('top') ? 'start' : 'end';

    // Initial radius, will be updated in setup once styles are available
    let radius = 0;

    const drawFn = (widget, cr, width, height) => {
        const styleContext = widget.get_style_context();
        constbgColor = styleContext.get_property('background-color', Gtk.StateFlags.NORMAL);
        // const fgColor = styleContext.get_property('color', Gtk.StateFlags.NORMAL); // For border if needed
        // const borderWidth = styleContext.get_border(Gtk.StateFlags.NORMAL).left;
        const r = styleContext.get_property('border-radius', Gtk.StateFlags.NORMAL);

        // Update radius if it changed, and resize. This might be better in a separate effect.
        // For now, keeping it simple: assuming radius from style is somewhat static for the drawing.
        // If r is different from widget's requested size, it might need queue_resize.
        // widget.set_size_request(r, r); // Best to do this in setup or when 'r' changes.

        cr.set_operator(Cairo.Operator.CLEAR); // Clear the area if transparent corners are desired over existing bg
        cr.paint();
        cr.set_operator(Cairo.Operator.OVER);


        switch (place) {
            case 'topleft':
                cr.arc(r, r, r, Math.PI, 3 * Math.PI / 2);
                cr.lineTo(0, 0); // Close the path to form a triangle-like shape for the corner area
                break;
            case 'topright':
                // context.arc(x, y, radius, startAngle, endAngle)
                cr.arc(0, r, r, 3 * Math.PI / 2, 2 * Math.PI); // Arc center is at (0,r) for top-right
                cr.lineTo(r, 0);
                break;
            case 'bottomleft':
                cr.arc(r, 0, r, Math.PI / 2, Math.PI); // Arc center is at (r,0) for bottom-left
                cr.lineTo(0, r);
                break;
            case 'bottomright':
                cr.arc(0, 0, r, 0, Math.PI / 2); // Arc center is at (0,0) for bottom-right
                cr.lineTo(r, r);
                break;
        }
        cr.closePath();

        if (bgColor) {
            Gtk.render_background(styleContext, cr, 0, 0, r, r); // Use GTK rendering for background potentially
                                                                  // Or set source manually:
            cr.set_source_rgba(bgColor.red, bgColor.green, bgColor.blue, bgColor.alpha);
            cr.fill();
        }

        // Example for border (original was commented out)
        // if (fgColor && borderWidth > 0) {
        //     cr.set_line_width(borderWidth);
        //     cr.set_source_rgba(fgColor.red, fgColor.green, fgColor.blue, fgColor.alpha);
        //     // Re-trace the path for stroke if needed, or adjust fill path for border space
        //     // This requires more complex pathing to not overdraw fill
        //     cr.stroke();
        // }
    };

    return drawingarea({
        ...props,
        hpack: getHPack(),
        vpack: getVPack(),
        drawFn: drawFn,
        setup: (self) => {
            // Ensure styles are loaded and radius can be read.
            // This might need a brief delay or run on 'realize' if style context isn't ready.
            // Or, rely on CSS to give the drawingarea a size if radius isn't fixed.
            // For now, assuming setup is late enough.
            const styleContext = self.get_style_context();
            try {
                radius = styleContext.get_property('border-radius', Gtk.StateFlags.NORMAL);
                 // Attempt to apply GTK theme rendering for the corner shape
                // This is more of an advanced GTK feature.
                // Gtk.render_frame(styleContext, cr, 0,0, radius, radius); // Example
            } catch (e) {
                console.warn("Could not get border-radius for RoundedCorner, defaulting to 0 or CSS defined size.", e);
                radius = props.css?.match(/min-width:\s*(\d+)px/)?.[1] || 12; // Fallback from CSS or default
            }
            self.set_size_request(radius, radius);

            // If the component relies on CSS for 'border-radius' and 'background-color',
            // ensure the CSS is applied to this widget. E.g. by adding a class name.
            if(!props.className) {
                self.add_css_class('rounded-corner-widget'); // Add a default class if none provided
            }
        }
    });
}
