import App from 'ags/app';
import Gdk from 'gi://Gdk';
import { eventbox, box } from 'ags/widgets';

// Helper function to close windows across monitors
// Assumes window names are like "basenameM" e.g., "cheatsheet0", "cheatsheet1"
function closeWindowOnAllMonitorsV2(baseName) {
    const display = Gdk.Display.get_default();
    if (!display) return;
    const numMonitors = display.get_n_monitors(); // Gdk.Display.get_n_monitors() in GJS
    for (let i = 0; i < numMonitors; i++) {
        App.closeWindow(`${baseName}${i}`);
    }
    // Also try closing the base name itself if it's a global window not tied to a monitor ID
    App.closeWindow(baseName);
}


export default function ClickCloseRegion({
    name, // Base name of the window to close
    multimonitor = true, // If true, tries to close <name>0, <name>1, etc.
    monitorId = 0, // Specific monitor, used if multimonitor is false and name needs monitorId
    expand = true, // If the inner box should expand
    fillMonitor = '', // 'h', 'v', or 'hv' to fill monitor dimensions
    className = '',
    ...props
}) {
    let minWidth = 0;
    let minHeight = 0;

    if (fillMonitor) {
        const display = Gdk.Display.get_default();
        if (display) {
            const monitor = display.get_monitor(monitorId); // Gdk.Display.get_monitor()
            if (monitor) {
                const geometry = monitor.get_geometry(); // Gdk.Rectangle
                if (fillMonitor.includes('h')) {
                    minWidth = geometry.width;
                }
                if (fillMonitor.includes('v')) {
                    minHeight = geometry.height;
                }
            }
        }
    }

    return eventbox({
        ...props,
        className: `click-close-region ${className}`,
        onButtonPressEvent: (widget, event) => { // Use the more specific signal if available
            if (multimonitor) {
                closeWindowOnAllMonitorsV2(name);
            } else {
                // If the window name is per-monitor, construct it
                // Otherwise, just use 'name'. This depends on naming convention.
                // For now, assume 'name' is complete if not multimonitor.
                // Or, if name is like "cheatsheet" and it's for a specific monitorId:
                // App.closeWindow(`${name}${monitorId}`);
                App.closeWindow(name); // Assuming name is already specific or global
            }
            return Gdk.EVENT_STOP; // Stop event propagation
        },
        child: box({
            // If expand is true, it will try to fill its parent.
            // If fillMonitor is used, minWidth/Height give it a large size.
            hexpand: expand,
            vexpand: expand,
            css: `
                ${minWidth > 0 ? `min-width: ${minWidth}px;` : ''}
                ${minHeight > 0 ? `min-height: ${minHeight}px;` : ''}
            `,
        }),
    });
}
