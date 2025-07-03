import { box, label } from 'ags/widgets';

export default function WifiNetworksDisplay() {
    return (
        <box vertical={true} vexpand={true} hexpand={true} class="padding-10">
            <label label="WiFi Networks List Placeholder" class="txt-large" />
            {/* TODO: List available WiFi networks, connect options, current status */}
        </box>
    );
}
