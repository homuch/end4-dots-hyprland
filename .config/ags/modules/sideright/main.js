import PopupWindow from '../.widgethacks/popupwindow.js';
import SidebarRight from "./sideright.js";
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
// const { Box } = Widget; // To be removed
import clickCloseRegion from '../.commonwidgets/clickcloseregion.js';

export default () => PopupWindow({
    keymode: 'on-demand',
    anchor: ['right', 'top', 'bottom'],
    name: 'sideright',
    layer: 'top',
    child: box({ // Changed to lowercase
        children: [
            clickCloseRegion({ name: 'sideright', multimonitor: false, fillMonitor: 'horizontal' }),
            SidebarRight(),
        ]
    })
});
