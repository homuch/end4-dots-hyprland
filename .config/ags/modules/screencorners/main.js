// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import Hyprland from 'gi://AstalHyprland'; // Corrected Hyprland import
import app from 'ags/gtk4/app'; // Added app import
import { enableClickthrough } from "../.widgetutils/clickthrough.js";
import { RoundedCorner } from "../.commonwidgets/cairo_roundedcorner.js";

if(userOptions.appearance.fakeScreenRounding === 2) Hyprland.connect('event', (service, name, data) => {
    if (name == 'fullscreen') {
        const monitor = Hyprland.active.monitor.id;
        if (data == '1') {
            for (const currentWindow of app.windows) { // Changed App to app, window to currentWindow
                if (currentWindow.name.startsWith("corner") && currentWindow.name.endsWith(monitor)) {
                    app.closeWindow(currentWindow.name); // Changed App to app
                }
            }
        } else {
            for (const currentWindow of app.windows) { // Changed App to app, window to currentWindow
                if (currentWindow.name.startsWith("corner") && currentWindow.name.endsWith(monitor)) {
                    app.openWindow(currentWindow.name); // Changed App to app
                }
            }
        }
    }
})

export default (monitor = 0, where = 'bottom left', useOverlayLayer = true) => {
    const positionString = where.replace(/\s/, ""); // remove space
    return window({ // Changed Widget.Window to window
        monitor,
        name: `corner${positionString}${monitor}`,
        layer: useOverlayLayer ? 'overlay' : 'top',
        anchor: where.split(' '),
        exclusivity: 'ignore',
        visible: true,
        child: RoundedCorner(positionString, { className: 'corner-black', }),
        setup: enableClickthrough,
    });
}

