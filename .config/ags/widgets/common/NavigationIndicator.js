import Gtk from 'gi://Gtk?version=4.0';
import Cairo from 'gi://cairo';
import { drawingarea } from 'ags/widgets';
import { createEffect } from 'ags'; // To redraw when selectedIndex_accessor changes

// Default styling parameters (can be overridden by CSS for the drawingarea)
const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 10; // Or height per item if vertical
const DEFAULT_PADDING = 2;

export default function NavigationIndicator({
    count = 1, // Total number of items/tabs
    vertical = false,
    selectedIndex_accessor, // AGS Accessor for the current selected index (0-based)
    className = '',
    ...props
}) {
    const drawFn = (widget, cr, width, height) => {
        const styleContext = widget.get_style_context();

        // Get style properties (these should be defined in CSS for the widget)
        const padding = styleContext.get_padding(Gtk.StateFlags.NORMAL);
        const paddingLeft = padding.left || DEFAULT_PADDING;
        const paddingRight = padding.right || DEFAULT_PADDING;
        const paddingTop = padding.top || DEFAULT_PADDING;
        const paddingBottom = padding.bottom || DEFAULT_PADDING;

        const selectedCell = selectedIndex_accessor?.value || 0; // Get value from accessor, default to 0

        // Colors from style context
        // Fallback colors if not defined in CSS for this widget
        const GdkRGBA = imports.gi.Gdk.RGBA;
        const trackColor = styleContext.get_property('background-color', Gtk.StateFlags.NORMAL) || new GdkRGBA({ red: 0.2, green: 0.2, blue: 0.2, alpha: 0.5 });
        const indicatorColor = styleContext.get_property('color', Gtk.StateFlags.NORMAL) || new GdkRGBA({ red: 0.8, green: 0.8, blue: 0.8, alpha: 1 });

        cr.set_line_width(0); // Typically for fill, stroke width set later if stroking lines

        // Draw background track (optional, could be transparent to show parent bg)
        cr.set_source_rgba(trackColor.red, trackColor.green, trackColor.blue, trackColor.alpha);
        cr.rectangle(0, 0, width, height);
        cr.fill();

        if (count <= 0) return; // No indicator to draw if no items

        let cellWidth = width;
        let cellHeight = height;
        if (vertical) {
            cellHeight = count > 0 ? height / count : height;
        } else {
            cellWidth = count > 0 ? width / count : width;
        }

        // Indicator dimensions (pill shape)
        const indicatorActualWidth = cellWidth - paddingLeft - paddingRight;
        const indicatorActualHeight = cellHeight - paddingTop - paddingBottom;

        // Ensure non-negative dimensions
        if (indicatorActualWidth <= 0 || indicatorActualHeight <= 0) return;

        cr.set_source_rgba(indicatorColor.red, indicatorColor.green, indicatorColor.blue, indicatorColor.alpha);

        if (vertical) {
            const indicatorX = paddingLeft;
            const indicatorY = paddingTop + cellHeight * selectedCell;
            const pillRadius = Math.min(indicatorActualWidth, indicatorActualHeight) / 2; // Radius for rounded ends

            // Draw pill: rectangle with two half-circles
            cr.arc(indicatorX + pillRadius, indicatorY + pillRadius, pillRadius, Math.PI / 2, 3 * Math.PI / 2); // Left semi-circle
            cr.arc(indicatorX + indicatorActualWidth - pillRadius, indicatorY + pillRadius, pillRadius, -Math.PI / 2, Math.PI / 2); // Right semi-circle
            // This is for horizontal. For vertical:
            // cr.arc(indicatorX + pillRadius, indicatorY + pillRadius, pillRadius, Math.PI, 0); // Top semi-circle
            // cr.arc(indicatorX + pillRadius, indicatorY + indicatorActualHeight - pillRadius, pillRadius, 0, Math.PI); // Bottom semi-circle
            // cr.rectangle(indicatorX, indicatorY + pillRadius, indicatorActualWidth, indicatorActualHeight - 2 * pillRadius);

            // Corrected vertical pill:
            cr.arc(indicatorX + indicatorActualWidth / 2, indicatorY + pillRadius, pillRadius, Math.PI, 2 * Math.PI); // Top cap
            cr.arc(indicatorX + indicatorActualWidth / 2, indicatorY + indicatorActualHeight - pillRadius, pillRadius, 0, Math.PI); // Bottom cap
            cr.rectangle(indicatorX, indicatorY + pillRadius, indicatorActualWidth, indicatorActualHeight - 2 * pillRadius);
            cr.fill();

        } else { // Horizontal
            const indicatorX = paddingLeft + cellWidth * selectedCell;
            const indicatorY = paddingTop;
            const pillRadius = Math.min(indicatorActualWidth, indicatorActualHeight) / 2;

            cr.arc(indicatorX + pillRadius, indicatorY + pillRadius, pillRadius, Math.PI/2, 3*Math.PI/2); // Left cap
            cr.arc(indicatorX + indicatorActualWidth - pillRadius, indicatorY + pillRadius, pillRadius, -Math.PI/2, Math.PI/2); // Right cap
            cr.rectangle(indicatorX + pillRadius, indicatorY, indicatorActualWidth - 2 * pillRadius, indicatorActualHeight);
            cr.fill();
        }
    };

    return drawingarea({
        ...props,
        className: `navigation-indicator ${className}`,
        drawFn: drawFn,
        setup: (self) => {
            // Request redraw when selectedIndex_accessor changes
            if (selectedIndex_accessor) {
                createEffect(() => {
                    self.queue_draw();
                }, [selectedIndex_accessor]);
            }
            // Initial size request (can also be done via CSS min-width/min-height on the class)
            // self.set_size_request(DEFAULT_WIDTH, vertical ? DEFAULT_HEIGHT * count : DEFAULT_HEIGHT);
        }
    });
}

// Gdk needed for RGBA if not available globally from Gtk
import Gdk from 'gi://Gdk';
