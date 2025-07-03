import { box, label } from 'ags/widgets';

export default function NotificationListDisplay() {
    return (
        <box vertical={true} vexpand={true} hexpand={true} class="padding-10">
            <label label="Notifications List Placeholder" class="txt-large" />
            {/* TODO: List actual notifications from Notifications service */}
        </box>
    );
}
