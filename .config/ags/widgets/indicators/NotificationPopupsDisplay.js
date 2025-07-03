import Gtk from 'gi://Gtk?version=4.0';
import { box } from 'ags/widgets';
// import { createEffect, createState } from 'ags'; // Not needed if directly using service signals/accessors
import Notifications from 'ags/service/notifications'; // Import real service
import NotificationWidget from '../common/NotificationWidget.js';

export default function NotificationPopupsDisplay() {
    const onDismiss = (id) => {
        const notif = Notifications.getNotification(id);
        notif?.close(); // Standard GNotification method to close/dismiss
    };

    const onAction = (id, actionId) => {
        const notif = Notifications.getNotification(id);
        if (notif) {
            notif.invoke_action(actionId); // Standard GNotification method
            // invoke_action might not automatically dismiss, though often it implies interaction is done.
            // Depending on desired UX, might still call notif.close() or rely on app to close.
            // For popups, usually dismiss after action.
            // Notifications.dismiss(id); // Or if service has specific dismiss for popups
        }
    };

    // Notifications.popups is an accessor to an array of GNotification objects
    return box({
        vertical: true,
        hpack: 'center',
        className: 'osd-notifs spacing-v-5-revealer',
        children: Notifications.popups.transform(popups => {
            return popups.map(notifObject => {
                if (!notifObject) return null;
                return NotificationWidget({
                    key: notifObject.id,
                    notifObject: notifObject,
                    isPopup: true,
                    onDismiss: () => onDismiss(notifObject.id), // Pass ID to handler
                    onAction: (actionId) => onAction(notifObject.id, actionId), // Pass ID to handler
                });
            }).filter(Boolean);
        }),
    });
}
