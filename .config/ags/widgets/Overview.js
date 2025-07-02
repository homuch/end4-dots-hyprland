import Gtk from 'gi://Gtk?version=4.0';
import App from 'ags/app'; // For App.closeWindow if needed by ClickCloseRegion directly
import { box } from 'ags/widgets';
import { PopupWindow } from './PopupWindow.js'; // Migrated
import ClickCloseRegion from './common/ClickCloseRegion.js'; // Migrated
import SearchAndWindowsDisplay from './overview/SearchAndWindowsDisplay.js'; // Migrated

// The default export from original modules/overview/main.js was a function
// that returned a PopupWindow instance.
// We'll follow that pattern, creating an OverviewWindow component.

export default function OverviewWindow({ monitor = null } = {}) { // monitor can be null for a global overview
    const overviewName = monitor === null ? 'overview' : `overview${monitor}`;

    return PopupWindow({
        name: overviewName,
        keymode: 'on-demand', // From original
        visible: false,       // Popups start hidden
        anchor: ['top', 'bottom', 'left', 'right'], // Fill screen
        layer: Gtk.LayerShellLayer.TOP, // Original was 'top'
        child: box({ // Main content box for PopupWindow
            // This box is the direct child of PopupWindow's internal structure.
            // It will contain the click-close regions and the actual content.
            // No specific class needed here unless for targeted styling.
            vertical: true, // ClickCloseRegions are stacked vertically around content row
            children: [
                ClickCloseRegion({
                    name: overviewName, // Name of the window to close
                    multimonitor: false, // This overview instance is specific
                    monitorId: monitor,
                    vexpand: true,
                    fillMonitor: 'h', // Horizontal fill for top/bottom regions
                }),
                box({ // Middle row containing content and side close regions
                    children: [
                        ClickCloseRegion({
                            name: overviewName,
                            multimonitor: false,
                            monitorId: monitor,
                            hexpand: true,
                            fillMonitor: 'v', // Vertical fill for side regions
                        }),
                        SearchAndWindowsDisplay(), // The main content
                        ClickCloseRegion({
                            name: overviewName,
                            multimonitor: false,
                            monitorId: monitor,
                            hexpand: true,
                            fillMonitor: 'v',
                        }),
                    ]
                }),
                ClickCloseRegion({
                    name: overviewName,
                    multimonitor: false,
                    monitorId: monitor,
                    vexpand: true,
                    fillMonitor: 'h',
                }),
            ]
        }),
        // Key handling for overview (e.g., Esc to close) is handled by PopupWindow itself.
        // Specific key events for search input navigation are handled within SearchAndWindowsDisplay.
    });
}
