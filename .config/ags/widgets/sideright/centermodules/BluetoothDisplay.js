import { box, label } from 'ags/widgets';

export default function BluetoothDisplay() {
    return (
        <box vertical={true} vexpand={true} hexpand={true} class="padding-10">
            <label label="Bluetooth Devices Placeholder" class="txt-large" />
            {/* TODO: List available/connected Bluetooth devices, connect/disconnect options */}
        </box>
    );
}
