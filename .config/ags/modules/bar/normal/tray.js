// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // No longer needed
import SystemTray from 'ags/service/systemtray'; // Standard v2/v3 path
// const { Box, Icon, Button, Revealer } = Widget; // No longer needed
const { Gravity } = imports.gi.Gdk;

const SysTrayItem = (item) => item.id !== null ? button({
    className: 'bar-systray-item',
    child: icon({ hpack: 'center' }).bind('icon', item, 'icon'),
    setup: (self) => self
        .hook(item, (self) => self.tooltipMarkup = item['tooltip-markup'])
    ,
    onPrimaryClick: (_, event) => item.activate(event),
    onSecondaryClick: (btn, event) => item.menu.popup_at_widget(btn, Gravity.SOUTH, Gravity.NORTH, null),
}) : null;

export const Tray = (props = {}) => {
    const trayContent = box({
        className: 'margin-right-5 spacing-h-15',
        setup: (self) => self
            .hook(SystemTray, (self) => {
                self.children = SystemTray.items.map(SysTrayItem);
                self.show_all();
            })
        ,
    });
    const trayRevealer = revealer({
        revealChild: true,
        transition: 'slide_left',
        transitionDuration: userOptions.animations.durationLarge,
        child: trayContent,
    });
    return box({
        ...props,
        children: [trayRevealer],
    });
}
