import Gtk from 'gi://Gtk?version=4.0'; // Not strictly needed here but good practice for widget files
import app from 'ags/gtk4/app'; // For App.toggleWindow etc. if needed inside, though usually controlled externally
import { options as userOptions } from '../../options.js'; // For default visibility or other options
import { enableClickthrough } from '../../utils/clickthrough.js';
import RoundedCorner from '../common/RoundedCorner.js'; // Migrated

// The default export will be a function to create a single corner window.
// The logic to show/hide based on fullscreen events will be managed globally (e.g., in app.js)
// if userOptions.appearance.fakeScreenRounding === 2.

export default function ScreenCornerWindow({
    monitor = 0,
    where = 'bottom left', // e.g., "top left", "bottom right"
    useOverlayLayer = true, // original default
    className = 'corner-black', // Default class for RoundedCorner, can be overridden
    visible = true, // Initial visibility, can be controlled by App.openWindow/closeWindow
} = {}) {
    const positionString = where.replace(/\s+/g, ""); // "topleft", "bottomright"
    const anchorParts = where.split(' '); // ["top", "left"]

    if (anchorParts.length !== 2) {
        console.warn(`ScreenCorner: Invalid 'where' prop: "${where}". Using default 'bottom left'.`);
        anchorParts.splice(0, anchorParts.length, 'bottom', 'left');
    }

    // Determine visibility based on fakeScreenRounding option initially.
    // If fakeScreenRounding is 2, it starts visible and is hidden by fullscreen events.
    // If 0, it should not be visible/created. If 1, always visible.
    // This initial visibility can also be handled when creating instances in app.js.
    let initialVisibility = visible;
    if (userOptions.appearance?.fakeScreenRounding === 0) {
        initialVisibility = false;
    } else if (userOptions.appearance?.fakeScreenRounding === 1) {
        initialVisibility = true;
    }
    // If fakeScreenRounding is 2, initialVisibility remains as passed (default true),
    // and external logic will manage it based on fullscreen events.


    return window({
        monitor,
        name: `corner${positionString}${monitor}`,
        layer: useOverlayLayer ? Gtk.LayerShellLayer.OVERLAY : Gtk.LayerShellLayer.TOP,
        anchor: anchorParts, // Expects array like ['top', 'left']
        exclusivity: 'ignore', // Gtk.LayerShellLayerExclusivity
        visible: initialVisibility,
        child: RoundedCorner({ place: positionString, className: className }),
        $: (self) => enableClickthrough(self), // Apply clickthrough
    });
}

// Global logic for handling fakeScreenRounding option 2 (fullscreen behavior)
// This should be initialized once in app.js or a dedicated service.
import Hyprland from 'gi://AstalHyprland';
import { Gdk } from 'ags/gtk4'; // Corrected Gdk import for Display

export function manageFullscreenCorners() {
    if (userOptions.appearance?.fakeScreenRounding === 2) {
        try {
            if (!Hyprland || typeof Hyprland.connect !== 'function') {
                console.warn("manageFullscreenCorners: Hyprland service not available or connect method missing.");
                return;
            }

            Hyprland.connect('event', (serviceInstance, eventName, eventData) => {
                // In Ags v2, serviceInstance is often the service itself, not needed here.
                // eventName and eventData are the important parts.
                if (eventName === 'fullscreen') {
                    // Determine active monitor ID from the Hyprland service's reactive state
                    const activeMonitor = Hyprland.active.monitor.value;
                    if (!activeMonitor || typeof activeMonitor.id === 'undefined') {
                        console.warn("manageFullscreenCorners: Could not determine active monitor ID from Hyprland service.");
                        // As a fallback, one might try to parse eventData if it contains monitor info,
                        // but relying on the service's active monitor state is cleaner if available.
                        // For this example, we'll return if active monitor is not clearly identified.
                        return;
                    }
                    const monitorId = activeMonitor.id;

                    const display = Gdk.Display.get_default();
                    if (!display) return;
                    const numMonitors = display.get_n_monitors();

                    ['topleft', 'topright', 'bottomleft', 'bottomright'].forEach(pos => {
                        const windowName = `corner${pos}${monitorId}`;
                        // Convert eventData to boolean-like check
                        const isFullscreen = (eventData === '1' || eventData === 1 || String(eventData).toLowerCase() === "true");
                        if (isFullscreen) {
                        app.closeWindow(windowName);
                        } else {
                        if(monitorId < numMonitors) app.openWindow(windowName);
                        }
                    });
                }
            });
        } catch (e) {
            console.error("Error setting up fullscreen corner management:", e);
        }
    }
}
// Gdk needed for manageFullscreenCorners // Already imported above
