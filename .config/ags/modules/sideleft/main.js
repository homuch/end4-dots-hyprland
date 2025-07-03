import PopupWindow from '../.widgethacks/popupwindow.js';
import SidebarLeft from "./sideleft.js";
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
// const { Box } = Widget; // To be removed
import clickCloseRegion from '../.commonwidgets/clickcloseregion.js';

export default () => PopupWindow({
    keymode: 'on-demand',
    anchor: ['left', 'top', 'bottom'],
    name: 'sideleft',
    layer: 'top',
    child: box({ // Changed to lowercase
        children: [
            SidebarLeft(),
            clickCloseRegion({ name: 'sideleft', multimonitor: false, fillMonitor: 'horizontal' }),
        ]
    })
});
