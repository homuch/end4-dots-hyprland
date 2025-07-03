// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed

import WallpaperImage from './wallpaper.js';
import TimeAndLaunchesWidget from './timeandlaunches.js'
import SystemWidget from './system.js'

export default (monitor) => window({
    name: `desktopbackground${monitor}`,
    // anchor: ['top', 'bottom', 'left', 'right'],
    layer: 'background',
    exclusivity: 'ignore',
    visible: true,
    child: overlay({
        child: WallpaperImage(monitor),
        // child: box({}),
        overlays: [
            TimeAndLaunchesWidget(),
            SystemWidget(),
        ],
        setup: (self) => {
            self.set_overlay_pass_through(self.get_children()[1], true);
        },
    }),
});
