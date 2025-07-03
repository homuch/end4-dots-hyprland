import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk'; // Added Gdk import
import app from 'ags/gtk4/app';
import { options as userOptions } from '../../options.js';
import { enableClickthrough } from '../../utils/clickthrough.js';

// The styling for crosshair (size and color) will be handled by CSS variables
// set globally, e.g., in stylingService.js or app.js after options are loaded.
// Assumed CSS:
// .crosshair-icon-widget {
//   font-size: var(--crosshair-size, 20px);
//   color: var(--crosshair-color, white);
//   /* Ensure it's centered if the window is full-screen overlay */
//   margin: auto; /* If its parent is a box/grid that allows auto margins */
// }

export default function CrosshairWindow({ monitor = 0 } = {}) {
    return AgsWindow({
        monitor,
        name: `crosshair${monitor}`,
        layer: Gtk.LayerShellLayer.OVERLAY, // Use Gtk enum for layer
        anchor: ['top', 'left', 'right', 'bottom'], // To make it a fullscreen overlay
        exclusivity: 'ignore', // Gtk.LayerShellLayerExclusivity
        visible: false, // Initially hidden, toggled by other logic
        child: AgsIcon({
            // className is applied to the Gtk widget itself.
            // If AgsIcon is a simple GtkImage or GtkIcon, this works.
            // If it's a box around an icon, the class might need to be on the inner icon.
            // Assuming AgsIcon itself can take className for styling the icon.
            className: 'crosshair-icon-widget',
            icon: 'crosshair-symbolic', // Ensure this icon exists in the theme
            hpack: 'center', // Center the icon if the window is effectively a fullscreen box
            vpack: 'center',
        }),
        $: (self) => enableClickthrough(self), // Apply clickthrough
    });
}

// Function to set CSS variables for crosshair, call from app.js or stylingService.js
export function applyCrosshairStyles() {
    const Gdk = imports.gi.Gdk;
    const display = Gdk.Display.get_default();
    if (!display) return;

    const cssProvider = Gtk.CssProvider.new();
    const size = userOptions.gaming?.crosshair?.size || 20;
    const color = userOptions.gaming?.crosshair?.color || 'white';

    cssProvider.load_from_data(`
        :root {
            --crosshair-size: ${size}px;
            --crosshair-color: ${color};
        }
    `);
    Gtk.StyleContext.add_provider_for_display(display, cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_USER);
}
// Gdk needed for applyCrosshairStyles
// import Gdk from 'gi://Gdk'; // Already at top level of this snippet for Gtk.LayerShellLayer
// No, Gdk is not imported yet.
// It should be imported at the top of the file.
// Let's ensure all imports are at the top.
// The Gtk import is fine. Will add Gdk for applyCrosshairStyles.
