import Gtk from 'gi://Gtk'; // For Gtk.Align if needed
import app from 'ags/gtk4/app'; // For app.toggleWindow if linking to settings
import { box, label, button, scrollable, revealer } from 'ags/widgets';
import { createEffect, createBinding, createState } from 'ags';

import Notifications from 'ags/service/notifications';
import NotificationWidget from '../../common/NotificationWidget.js'; // Path relative to this file
import MaterialIcon from '../../common/MaterialIcon.js';
import { setupCursorHover } from '../../../utils/cursorHover.js';
import { options as userOptions } from '../../../options.js';

const getString = (str) => str; // TODO: i18n

const NotificationList = () => {
    const notifWidgets = Notifications.notifications.transform(notifs =>
        notifs.map(n => NotificationWidget({
            notifObject: n,
            isPopup: false, // These are not popups
            onDismiss: (id) => Notifications.dismiss(id), // Or getNotification(id).close()
            onAction: (id, actionId) => Notifications.invoke(id, actionId),
        }))
    );

    return box({
        vertical: true,
        vexpand: true,
        className: 'notification-list spacing-v-5', // Ensure SCSS for item spacing
        children: notifWidgets,
    });
};

const EmptyContent = () => box({
    homogeneous: true,
    vexpand: true,
    child: box({
        vertical: true,
        vpack: 'center',
        hpack: 'center',
        className: 'txt spacing-v-10',
        children: [
            box({
                vertical: true,
                className: 'spacing-v-5 txt-subtext',
                children: [
                    MaterialIcon('notifications_active', 'gigantic'), // Ensure SCSS for size
                    label({ label: getString('No notifications'), className: 'txt-small' }),
                ]
            }),
        ]
    })
});

const Header = () => box({
    className: 'notification-list-header spacing-h-5 margin-bottom-5',
    children: [
        label({
            hexpand: true,
            xalign: 0,
            className: 'txt-small titlefont', // Ensure SCSS
            label: Notifications.notifications.transform(n => `${n.length} ${getString('Notifications')}`)
        }),
        button({
            className: 'notification-action-button', // Ensure SCSS
            tooltipText: getString('Toggle Do Not Disturb'),
            onClicked: () => Notifications.dnd = !Notifications.dnd,
            child: MaterialIcon({ icon: Notifications.bind('dnd').transform(dnd => dnd ? 'notifications_off' : 'notifications') }),
            setup: setupCursorHover,
        }),
        button({
            className: 'notification-action-button', // Ensure SCSS
            tooltipText: getString('Clear All'),
            onClicked: () => Notifications.clear(), // Clears all notifications
            child: MaterialIcon('clear_all'),
            setup: setupCursorHover,
            visible: Notifications.notifications.transform(n => n.length > 0),
        }),
        button({
            className: 'notification-action-button', // Ensure SCSS
            tooltipText: getString('Notification Settings'),
            onClicked: () => {
                // TODO: Open actual notification settings, maybe part of general settings panel
                // app.toggleWindow('settings'); // If there's a settings window
                console.log("Notification settings button clicked - implement action.");
            },
            child: MaterialIcon('settings'),
            setup: setupCursorHover,
        }),
    ],
});

export default function NotificationListDisplay() {
    const mainContent = box({
        vertical: true,
        vexpand: true,
        hexpand: true,
        className: "padding-10 spacing-v-5", // Ensure SCSS
        children: [
            Header(),
            scrollable({
                vexpand: true,
                hscrollbarPolicy: Gtk.ScrollPolicyType.NEVER, // Use Gtk enum
                vscrollbarPolicy: Gtk.ScrollPolicyType.AUTOMATIC,
                child: Notifications.bind('notifications').transform(notifs =>
                    notifs.length > 0 ? NotificationList() : EmptyContent()
                ),
            }),
        ]
    });

    return mainContent;
}
