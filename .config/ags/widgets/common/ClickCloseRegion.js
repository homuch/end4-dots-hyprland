import app from 'ags/gtk4/app'; // Corrected import
import { Gtk, Gdk } from 'ags/gtk4'; // Import Gtk for GestureClick
import { box } from 'ags/widgets'; // Assuming box is an intrinsic

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

    // Use a Box and add a Gtk.GestureClick to it.
    return (
        <box
            {...props}
            class={`click-close-region ${className}`}
            hexpand={expand}
            vexpand={expand}
            css={`
                ${minWidth > 0 ? `min-width: ${minWidth}px;` : ''}
                ${minHeight > 0 ? `min-height: ${minHeight}px;` : ''}
            `}
            $={self => { // Setup
                const gesture = Gtk.GestureClick.new();
                gesture.connect('released', (gesture, n_press, x, y) => {
                    // gesture.set_state(Gtk.EventSequenceState.CLAIMED); // Claim event
                    if (multimonitor) {
                        closeWindowOnAllMonitorsV2(name);
                    } else {
                        app.closeWindow(name);
                    }
                    // No need to return Gdk.EVENT_STOP from gesture signal handlers explicitly unless needed to block other controllers.
                });
                self.add_controller(gesture);
            }}
        />
    );
}
