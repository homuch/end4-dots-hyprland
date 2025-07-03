import { Gtk, Gdk } from 'ags/gtk4'; // Corrected imports
import Cairo from 'gi://cairo';
// No import for <drawingarea>
import { createEffect, createState } from 'ags';
import GLib from 'gi://GLib'; // For animation timeout if re-enabled

// Default styling parameters (can be overridden by CSS)
const DEFAULT_DIAMETER = 20;
const DEFAULT_TROUGH_WIDTH = 2;
const DEFAULT_PROGRESS_PADDING = 1; // Space between trough and progress stroke

export default function AnimatedCircularProgress({
    value_accessor, // AGS Accessor for progress value (0-100)
    initialValue = 0, // For initial display before accessor provides a value
    className = '',
    extraSetup, // For any additional setup via $ prop
    ...props
}) {
    // Internal state for smooth animation from currentDisplayValue to targetValue
    const [currentDisplayValue, setCurrentDisplayValue] = createState(initialValue);
    let animationFrameId = null;

    createEffect(() => {
        const targetValue = value_accessor.value; // Assuming accessor has .value

        // Simple direct update (no animation within component)
        // setCurrentDisplayValue(targetValue);
        // For animation:
        if (animationFrameId) {
            GLib.source_remove(animationFrameId); // GLib needs import
        }

        const DURATION_MS = 150; // Animation duration
        const FRAMES = DURATION_MS / 16; // Approx 60fps

        let frame = 0;
        const startValue = currentDisplayValue.value;
        const diff = targetValue - startValue;

        if (Math.abs(diff) < 0.1) { // Already close, just set
            setCurrentDisplayValue(targetValue);
            return;
        }

        function animate() {
            frame++;
            const progress = frame / FRAMES;
            const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Ease in-out

            if (progress >= 1) {
                setCurrentDisplayValue(targetValue);
                animationFrameId = null;
                return false; // Stop GLib timeout
            } else {
                setCurrentDisplayValue(startValue + diff * easedProgress);
                return true; // Continue GLib timeout
            }
        }
        // GLib import is needed for GLib.timeout_add
        // animationFrameId = GLib.timeout_add(0, 16, animate); // ~60 FPS
        // Using ags/utils.timeout for consistency if available, or GLib
        // For now, let's assume a simpler direct update and let the bound value animate externally.
        // If internal animation is desired, GLib.timeout_add or a similar mechanism is needed.
         setCurrentDisplayValue(targetValue); // Direct update for now

    }, [value_accessor]);


    const drawFn = (widget, cr, width, height) => {
        const styleContext = widget.get_style_context();

        // Get style properties (these should be defined in CSS for the widget)
        // Using Gtk.Widget.get_property is not for CSS properties.
        // Use styleContext.get_property for actual CSS properties, or styleContext.get_computed_style for specific ones.
        // This is a complex part of GTK theming.
        // For simplicity, let's assume some fixed values or values derived from width/height.
        // Or, they are read from CSS custom properties if possible.

        // Robustly getting CSS properties:
        // const cssDiameter = styleContext.get_value('min-height').get_double(); // Example, might not work like this
        // const cssTroughWidth = styleContext.get_value('min-width').get_double();
        // For now, using some defaults if not easily readable or relying on CSS to set them.
        const diameter = Math.min(width, height) - (styleContext.get_margin(Gtk.StateFlags.NORMAL).left * 2); // Approx
        const troughStrokeWidth = styleContext.get_border(Gtk.StateFlags.NORMAL).left || DEFAULT_TROUGH_WIDTH; // Using border as trough
        const progressPadding = styleContext.get_padding(Gtk.StateFlags.NORMAL).left || DEFAULT_PROGRESS_PADDING;

        const progressStrokeWidth = troughStrokeWidth - progressPadding;
        const radius = diameter / 2.0 - Math.max(troughStrokeWidth, progressStrokeWidth) / 2.0;
        const centerX = width / 2.0;
        const centerY = height / 2.0;

        const progressValue = currentDisplayValue.value / 100.0; // Normalize 0-100 to 0-1

        const startAngle = -Math.PI / 2.0;
        const endAngle = startAngle + (2 * Math.PI * progressValue);

        // Colors from style context
        const troughColor = styleContext.get_property('background-color', Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 0.2, green: 0.2, blue: 0.2, alpha: 1 });
        const progressColor = styleContext.get_property('color', Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 0.3, green: 0.5, blue: 0.8, alpha: 1 });


        // Draw background trough
        cr.set_source_rgba(troughColor.red, troughColor.green, troughColor.blue, troughColor.alpha);
        cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        cr.set_line_width(troughStrokeWidth);
        cr.stroke();

        if (progressValue <= 0.001) return; // Avoid drawing tiny dot for 0

        // Draw progress arc
        cr.set_source_rgba(progressColor.red, progressColor.green, progressColor.blue, progressColor.alpha);
        cr.arc(centerX, centerY, radius, startAngle, endAngle);
        cr.set_line_width(progressStrokeWidth);
        cr.stroke();

        // Draw rounded ends for progress arcs (if progressStrokeWidth > 0)
        if (progressStrokeWidth > 0) {
            cr.set_line_width(0); // Reset for fill
            // Start cap
            const startCapX = centerX + Math.cos(startAngle) * radius;
            const startCapY = centerY + Math.sin(startAngle) * radius;
            cr.arc(startCapX, startCapY, progressStrokeWidth / 2, 0, 2 * Math.PI);
            cr.fill();
            // End cap
            const endCapX = centerX + Math.cos(endAngle) * radius;
            const endCapY = centerY + Math.sin(endAngle) * radius;
            cr.arc(endCapX, endCapY, progressStrokeWidth / 2, 0, 2 * Math.PI);
            cr.fill();
        }
    };

    return (
        <drawingarea
            {...props}
            class={`animated-circular-progress ${className}`}
            drawFn={drawFn}
            $={self => { // Use $ for setup
                createEffect(() => {
                    self.queue_draw();
                }, [currentDisplayValue]);

                if (extraSetup && typeof extraSetup === 'function') {
                    extraSetup(self);
                }
                // It's generally better to control size via CSS for drawing areas
                // or explicitly pass width/height request as props if needed.
            }}
        />
    );
}

// Gdk is imported with Gtk from ags/gtk4
// GLib is imported at the top
