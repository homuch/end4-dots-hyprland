import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk'; // For Gdk.RGBA
import Cairo from 'gi://cairo';
import { drawingarea } from 'ags/widgets';
import { createEffect, createState } from 'ags'; // For internal animation or reacting to value_accessor

// Default styling parameters (can be overridden by CSS for the drawingarea)
const DEFAULT_SLIDER_HEIGHT = 10; // If horizontal
const DEFAULT_SLIDER_WIDTH = 10;  // If vertical
const DEFAULT_RADIUS = 5;

export default function CairoSlider({
    value_accessor, // AGS Accessor for progress value (0-1)
    vertical = false,
    className = '',
    // For interactivity (not implemented in this display-only version yet):
    // onChange, // (newValue: number) => void
    ...props
}) {
    const drawFn = (widget, cr, width, height) => {
        const styleContext = widget.get_style_context();

        const borderRadius = styleContext.get_property('border-radius', Gtk.StateFlags.NORMAL) || DEFAULT_RADIUS;
        const trackColor = styleContext.get_property('background-color', Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 0.2, green: 0.2, blue: 0.2, alpha: 1 });
        const progressColor = styleContext.get_property('color', Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 0.5, green: 0.5, blue: 0.8, alpha: 1 });

        const value = Math.max(0, Math.min(1, value_accessor?.value || 0)); // Clamp value between 0 and 1

        // Clear background (important for rounded corners to not draw over parent)
        cr.set_operator(Cairo.Operator.CLEAR);
        cr.paint();
        cr.set_operator(Cairo.Operator.OVER);

        // Draw track (background)
        cr.set_source_rgba(trackColor.red, trackColor.green, trackColor.blue, trackColor.alpha);
        // Path for a rounded rectangle
        if (vertical) {
            cr.new_path();
            cr.arc(width / 2, borderRadius, borderRadius, Math.PI, 2 * Math.PI); // Top cap
            cr.arc(width / 2, height - borderRadius, borderRadius, 0, Math.PI);    // Bottom cap
            cr.close_path();
        } else { // Horizontal
            cr.new_path();
            cr.arc(borderRadius, height / 2, borderRadius, Math.PI / 2, 3 * Math.PI / 2); // Left cap
            cr.arc(width - borderRadius, height / 2, borderRadius, -Math.PI / 2, Math.PI / 2); // Right cap
            cr.close_path();
        }
        cr.fill();

        // Draw progress fill
        if (value > 0) {
            cr.set_source_rgba(progressColor.red, progressColor.green, progressColor.blue, progressColor.alpha);
            if (vertical) {
                const filledHeight = height * value;
                // To draw partial rounded rect for progress:
                // Draw a full small rect and clip, or complex path.
                // Simplified: draw a rect and then cap it if it's not full.
                const progY = height * (1 - value); // Fill from bottom up
                const progHeight = height * value;

                cr.new_path();
                if (progHeight < borderRadius * 2) { // If too small to have two full caps
                    // Draw a small pill shape centered as much as possible
                    cr.arc(width / 2, progY + progHeight - borderRadius, borderRadius, 0, Math.PI); // Bottom cap of progress
                    cr.arc(width / 2, progY + borderRadius, borderRadius, Math.PI, 2*Math.PI); // Top cap of progress part
                } else {
                    cr.arc(width / 2, progY + borderRadius, borderRadius, Math.PI, 2 * Math.PI); // Top cap of progress part
                    cr.arc(width / 2, height - borderRadius, borderRadius, 0, Math.PI);    // Bottom cap (same as track)
                    cr.rectangle(0, progY + borderRadius, width, height - borderRadius - (progY + borderRadius) );
                }
                cr.close_path();
                cr.fill();

            } else { // Horizontal
                const filledWidth = width * value;
                cr.new_path();
                if (filledWidth < borderRadius * 2) { // Small pill
                     cr.arc(borderRadius, height / 2, borderRadius, Math.PI / 2, 3 * Math.PI / 2); // Left cap
                     if(filledWidth > borderRadius) // only draw right cap if wide enough
                        cr.arc(filledWidth - borderRadius, height / 2, borderRadius, -Math.PI / 2, Math.PI / 2);
                     else // else complete the left cap to a circle
                        cr.arc(borderRadius, height / 2, borderRadius, -Math.PI / 2, Math.PI / 2);
                } else {
                    cr.arc(borderRadius, height / 2, borderRadius, Math.PI / 2, 3 * Math.PI / 2); // Left cap
                    cr.arc(filledWidth - borderRadius, height / 2, borderRadius, -Math.PI / 2, Math.PI / 2); // Right cap of progress part
                    cr.rectangle(borderRadius, 0, filledWidth - 2 * borderRadius, height);
                }
                cr.close_path();
                cr.fill();
            }
        }
    };

    return drawingarea({
        ...props,
        className: `cairo-slider ${className} ${vertical ? 'vertical' : 'horizontal'}`,
        drawFn: drawFn,
        setup: (self) => {
            // Ensure CSS provides min-width/min-height for the drawing area
            // Or set a default size_request here if CSS doesn't handle it.
            // self.set_size_request(vertical ? DEFAULT_SLIDER_WIDTH : 100, vertical ? 100 : DEFAULT_SLIDER_HEIGHT);

            if (value_accessor) {
                createEffect(() => {
                    self.queue_draw();
                }, [value_accessor]);
            }
        }
    });
}
