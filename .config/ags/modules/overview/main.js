// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // Old v1 import
import Astal from 'gi://Astal'; // Assuming Astal provides Window or similar for layer shell
import Gtk from 'gi://Gtk';
import { SearchAndWindows } from "./windowcontent.js"; // This will need migration too
import PopupWindow from '../.widgethacks/popupwindow.js'; // This custom widget will need migration
import { clickCloseRegion } from '../.commonwidgets/clickcloseregion.js'; // This custom widget will need migration

// TODO: This entire module needs a rewrite based on how Astal handles Gtk.Window, gtk-layer-shell,
// and how custom components like PopupWindow are migrated.
// The following is a very speculative sketch.

// Assuming PopupWindow is refactored to be an Astal-compatible class/function
// that returns an Astal.Window or Gtk.Window configured with layer-shell properties.
export default (id = '') => PopupWindow({ // Or new PopupWindow if it becomes a class
    name: `overview${id}`,
    keymode: 'on-demand', // TODO: Verify how Astal handles keymode/focus for windows
    visible: false,
    anchor: ['top', 'bottom', 'left', 'right'], // TODO: Verify gtk-layer-shell anchorages
    layer: 'top', // TODO: Verify gtk-layer-shell layer
    // child: new Gtk.Box({ // Original direct child
    //     orientation: Gtk.Orientation.VERTICAL,
    //     // children: [...] // Gtk.Box children are added via methods like .add() or .pack_start()
    //     // We'll handle children below
    // }),
    // The actual structure might involve creating the Gtk.Box first, then adding children,
    // then passing it to the PopupWindow.
    // For now, let's assume PopupWindow's refactored version still takes a 'child' property.
    child: (() => {
        const mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            // TODO: Add CSS class if needed: mainBox.get_style_context().add_class('class-name');
        });

        // Children need to be Astal-compatible widgets
        const topRegion = clickCloseRegion({ name: 'overview', multimonitor: false, expand: false });
        const middleBox = new Gtk.Box({
            // No 'vertical' means horizontal by default
            // TODO: Add CSS class if needed
        });
        const middleLeftRegion = clickCloseRegion({ name: 'overview', multimonitor: false });
        const searchAndWindows = SearchAndWindows(); // This returns a widget
        const middleRightRegion = clickCloseRegion({ name: 'overview', multimonitor: false });

        middleBox.pack_start(middleLeftRegion, true, true, 0); // expand, fill, padding
        middleBox.pack_start(searchAndWindows, true, true, 0);
        middleBox.pack_start(middleRightRegion, true, true, 0);

        const bottomRegion = clickCloseRegion({ name: 'overview', multimonitor: false });

        mainBox.pack_start(topRegion, false, false, 0); // expand, fill, padding for outer regions
        mainBox.pack_start(middleBox, true, true, 0);   // middle box expands and fills
        mainBox.pack_start(bottomRegion, false, false, 0);

        return mainBox;
    })(),
})

