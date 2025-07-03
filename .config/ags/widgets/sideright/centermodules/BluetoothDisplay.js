import { Gtk } from 'ags/gtk4'; // For Gtk.Align if needed
import { box, label, button, icon as AgsIcon, scrollable, switchwidget as AgsSwitch } from 'ags/widgets'; // Using AgsSwitch for Gtk.Switch
import { createBinding } from 'ags';

import Bluetooth from 'ags/service/bluetooth';
import MaterialIcon from '../../common/MaterialIcon.js'; // For icons
import { setupCursorHover } from '../../../utils/cursorHover.js';
import { options as userOptions } from '../../../options.js'; // For animation durations etc.
import ConfigToggle from '../../common/ConfigToggle.js'; // For a more styled toggle

// getString placeholder
const getString = (str) => str; // TODO: i18n

const BluetoothDeviceItem = (device) => { // device is a Bluetooth.Device GObject
    const deviceIcon = AgsIcon({
        icon: device.bind('icon_name').transform(icon => `${icon}-symbolic`), // Ensure symbolic for consistency
        className: 'bluetooth-device-icon', // Ensure SCSS
    });

    const deviceName = label({
        xalign: 0,
        hexpand: true,
        label: device.bind('name'),
        className: 'bluetooth-device-name', // Ensure SCSS
        truncate: 'end',
    });

    const deviceStatus = label({
        xalign: 0,
        label: device.bind('connected').transform(c => c ? getString('Connected') : (device.paired ? getString('Paired') : getString('Disconnected'))),
        className: 'bluetooth-device-status txt-smallie', // Ensure SCSS
    });

    const connectButton = ConfigToggle({ // Using ConfigToggle for a nicer button-like toggle
        icon: device.bind('connected').transform(c => c ? 'bluetooth_disabled' : 'bluetooth_connected'),
        name: device.bind('connected').transform(c => c ? getString('Disconnect') : getString('Connect')),
        desc: `Connect/Disconnect ${device.name}`,
        active_accessor: device.bind('connected'),
        onToggle_handler: (newValue) => {
            device.set_connection(newValue).catch(err => {
                console.error(`Failed to ${newValue ? 'connect' : 'disconnect'} ${device.name}:`, err);
                // Optionally revert toggle state if action fails, though AGS binding might handle this.
            });
        },
        expandWidget: false, // Don't let the text part expand
        resetButton: false, // No reset for this toggle
    });

    // Battery display (optional)
    const batteryDisplay = box({
        visible: device.bind('battery_percentage').transform(p => p > 0),
        children: [
            MaterialIcon({ icon: device.bind('battery_percentage').transform(p => {
                if (p > 80) return 'battery_full';
                if (p > 40) return 'battery_horiz_075'; // Example, find suitable icons
                if (p > 15) return 'battery_horiz_050';
                return 'battery_alert';
            })}),
            label({ label: device.bind('battery_percentage').transform(p => `${p}%`) })
        ]
    });

    return box({
        className: 'bluetooth-device-item spacing-h-10 padding-5 card', // Ensure SCSS
        children: [
            deviceIcon,
            box({
                vertical: true,
                hexpand: true,
                children: [deviceName, deviceStatus]
            }),
            batteryDisplay,
            connectButton,
            // TODO: Add button to remove/forget device (device.address needed for bluetoothctl remove)
        ]
    });
};

const DeviceList = () => scrollable({
    vexpand: true,
    hscrollbarPolicy: Gtk.ScrollPolicyType.NEVER,
    vscrollbarPolicy: Gtk.ScrollPolicyType.AUTOMATIC,
    child: box({
        vertical: true,
        className: 'bluetooth-device-list spacing-v-5', // Ensure SCSS
        children: Bluetooth.bind('devices').transform(devices =>
            devices.map(dev => BluetoothDeviceItem(dev))
        )
    })
});

const EmptyContent = () => box({
    homogeneous: true,
    vexpand: true,
    child: box({
        vertical: true,
        vpack: 'center',
        hpack: 'center',
        className: 'txt spacing-v-10',
        children: [
            MaterialIcon('bluetooth_disabled', 'gigantic'), // Ensure SCSS
            label({ label: getString('No Bluetooth devices found or Bluetooth is off.'), className: 'txt-small' }),
        ]
    })
});

const Header = () => box({
    className: 'bluetooth-header spacing-h-10 margin-bottom-5',
    children: [
        label({
            hexpand: true,
            xalign: 0,
            className: 'txt-small titlefont', // Ensure SCSS
            label: Bluetooth.bind('enabled').transform(e => e ? getString("Bluetooth On") : getString("Bluetooth Off"))
        }),
        AgsSwitch({ // Standard Gtk.Switch via AGS
            active: Bluetooth.bind('enabled'),
            onActivate: ({active}) => {
                Bluetooth.enabled = active;
            },
            setup: setupCursorHover,
        }),
        // TODO: Button to open system Bluetooth settings
        // button({
        //     child: MaterialIcon('settings'),
        //     onClicked: () => Utils.execAsync('gnome-control-center bluetooth').catch(print),
        // })
    ]
});

export default function BluetoothDisplay() {
    return (
        <box vertical={true} vexpand={true} hexpand={true} class="bluetooth-display padding-10 spacing-v-5">
            <label label={getString("Bluetooth")} class="txt-large category-title" hpack={Gtk.Align.START} />
            <Header />
            {Bluetooth.bind('devices').transform(devices => devices.length > 0 ? DeviceList() : EmptyContent())}
        </box>
    );
}
