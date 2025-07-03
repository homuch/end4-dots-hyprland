// Placeholder for Bluetooth Service
import { createState } from 'ags';

const [_enabled, _setEnabled] = createState(true);
const [_connectedDevices, _setConnectedDevices] = createState([
    // Example device:
    // {
    //     name: 'My Fake BT Headset',
    //     iconName: 'audio-headphones', // Gtk icon name
    //     batteryPercentage: 70,
    //     _battery_accessor: createState(70) // If its battery is also reactive
    // }
]);

const FakeBluetoothService = {
    get enabled_accessor() { return _enabled; },
    get enabled() { return _enabled.value; },
    set enabled(val) { _setEnabled(!!val); },

    get connected_devices_accessor() { return _connectedDevices; },
    get connected_devices() { return _connectedDevices.value; },

    // Methods to simulate changes for testing
    _addDevice: (device) => {
        _setConnectedDevices(current => {
            const exists = current.find(d => d.name === device.name);
            if (!exists) return [...current, device];
            return current;
        });
    },
    _removeDevice: (deviceName) => {
        _setConnectedDevices(current => current.filter(d => d.name !== deviceName));
    },
    _updateDeviceBattery: (deviceName, percentage) => {
        _setConnectedDevices(current => current.map(d => {
            if (d.name === deviceName) {
                if (d._battery_accessor) d._battery_accessor[1](percentage);
                return { ...d, batteryPercentage: percentage };
            }
            return d;
        }));
    },

    connect: (signal, callback) => { /* console.log(`FakeBluetooth: connect to ${signal}`); */ },
};

// Example: Add a fake device for UI testing
FakeBluetoothService._addDevice({
    name: 'Wireless Mouse',
    iconName: 'input-mouse', // Example icon
    batteryPercentage: null, // No battery info for this one
});


export default FakeBluetoothService;
