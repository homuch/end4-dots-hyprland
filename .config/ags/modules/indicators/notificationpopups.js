// This file is for popup notifications
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import Notifications from 'ags/service/notifications'; // Corrected import
// const { Box } = Widget; // To be removed
import Notification from '../.commonwidgets/notification.js';

export default () => box({ // Changed to lowercase
    vertical: true,
    hpack: 'center',
    className: 'osd-notifs spacing-v-5-revealer',
    attribute: {
        'map': new Map(),
        'dismiss': (box, id, force = false) => {
            if (!id || !box.attribute.map.has(id))
                return;
            const notifWidget = box.attribute.map.get(id);
            if (notifWidget == null || notifWidget.attribute.hovered && !force)
                return; // cuz already destroyed

            notifWidget.revealChild = false;
            notifWidget.attribute.destroyWithAnims();
            box.attribute.map.delete(id);
        },
        'notify': (box, id) => {
            if (!id || Notifications.dnd) return;
            if (!Notifications.getNotification(id)) return;

            box.attribute.map.delete(id);

            const notif = Notifications.getNotification(id);
            const newNotif = Notification({
                notifObject: notif,
                isPopup: true,
            });
            box.attribute.map.set(id, newNotif);
            box.pack_end(box.attribute.map.get(id), false, false, 0);
            box.show_all();
        },
    },
    setup: (self) => self
        .hook(Notifications, (box, id) => box.attribute.notify(box, id), 'notified')
        .hook(Notifications, (box, id) => box.attribute.dismiss(box, id), 'dismissed')
        .hook(Notifications, (box, id) => box.attribute.dismiss(box, id, true), 'closed')
    ,
});
