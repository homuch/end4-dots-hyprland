import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
// import { createBinding, createEffect } from 'ags'; // Not strictly needed if using .transform and direct binding
import SystemTray from 'ags/service/systemtray'; // Import real service
import { options as userOptions } from '../../options.js';

const SysTrayItem = ({ item }) => { // item is a SystemTray.Item GObject
    if (!item) return null;

    // SystemTray.Item properties are typically reactive GObject properties.
    // We can bind to them directly or use them in transforms if they are accessors.
    // AGS services often make GObject properties available as accessors.
    // Assuming item.icon, item.tooltip_markup are such accessors or directly bindable.

    return button({
        className: 'bar-systray-item', // Ensure SCSS
        child: icon({
            icon: item.bind('icon'), // Bind to the 'icon' property of the item
        }),
        tooltipMarkup: item.bind('tooltip_markup'), // Bind to 'tooltip_markup'
        onPrimaryClick: (_, event) => {
            item.activate(event); // Gdk.Event might be Gdk.Event or null
        },
        onSecondaryClick: (btnWidget, event) => {
            // Ensure item.menu is a Gtk.Menu and popup_at_widget is available
            if (item.menu && typeof item.menu.popup_at_widget === 'function') {
                item.menu.popup_at_widget(btnWidget, Gdk.Gravity.SOUTH, Gdk.Gravity.NORTH, null);
            } else if (item.menu && typeof item.menu.popup === 'function') { // Gtk.Menu.popup as fallback
                item.menu.popup();
            }
        },
    });
};

export default function Tray(props = {}) {
    // SystemTray.items is an accessor to an array of SystemTray.Item objects
    const trayContent = box({
        className: 'margin-right-5 spacing-h-15',
        children: SystemTray.items.transform(items =>
            items.map(item => SysTrayItem({ item }))
        ),
    });

    // The revealer was always true in original, might be for consistent animation or future use.
    // If not needed, can be removed and trayContent returned directly.
    const trayRevealer = revealer({
        revealChild: true,
        transition: Gtk.RevealerTransitionType.SLIDE_LEFT,
        transitionDuration: userOptions.animations?.durationLarge || 150,
        child: trayContent,
    });

    return box({
        ...props,
        children: [trayRevealer], // Or just [trayContent] if revealer is not desired
    });
}
