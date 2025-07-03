// Fake Battery Service for development and testing
import { createState, createBinding } from 'ags';
import { options as userOptions } from '../../options.js'; // Corrected path

// Simulating reactive properties of a battery
const [_percent, _setPercent] = createState(75);
const [_charging, _setCharging] = createState(false);
const [_available, _setAvailable] = createState(true); // Assume battery is present
const [_charged, _setCharged] = createState(false); // Fully charged state

const FakeBatteryService = {
    // Reactive accessors for direct use in bindings/effects
    get percent_accessor() { return _percent; },
    get charging_accessor() { return _charging; },
    get available_accessor() { return _available; },
    get charged_accessor() { return _charged; },

    // Traditional getter/setter for property-like access if needed by old logic patterns
    // or for imperative updates (e.g., from a test console)
    get percent() { return _percent.value; },
    set percent(val) { _setPercent(Math.max(0, Math.min(100, Number(val)))); },

    get charging() { return _charging.value; },
    set charging(val) { _setCharging(!!val); },

    get available() { return _available.value; },
    set available(val) { _setAvailable(!!val); },

    get charged() { return _charged.value; },
    set charged(val) { _setCharged(!!val); },

    // Configuration like 'low' threshold, could be part of the service or read from userOptions directly by components
    get low() { return userOptions.battery?.low || 20; },

    // Mimic GObject connect/disconnect for signals if some code relies on it.
    // For a true GObject service, these would be actual signal connections.
    // For this fake service, they are mostly no-ops but can log.
    _listeners: new Map(),
    _signalId: 0,

    connect: (signal, callback) => {
        const id = ++FakeBatteryService._signalId;
        // Signal can be 'notify::property-name' or just a custom name.
        // For simplicity, let's assume generic 'changed' or specific property changes.
        // console.log(`FakeBatteryService: connect to signal '${signal}' with id ${id}`);
        if (!FakeBatteryService._listeners.has(signal)) {
            FakeBatteryService._listeners.set(signal, new Map());
        }
        FakeBatteryService._listeners.get(signal).set(id, callback);
        return id;
    },

    disconnect: (id) => {
        for (const signal of FakeBatteryService._listeners.keys()) {
            if (FakeBatteryService._listeners.get(signal).has(id)) {
                FakeBatteryService._listeners.get(signal).delete(id);
                // console.log(`FakeBatteryService: disconnect from signal id ${id}`);
                return;
            }
        }
    },

    // Helper to manually emit a property change for testing connected handlers
    _emitChanged: (propertyName) => {
        const signalName = `notify::${propertyName}`;
        if (FakeBatteryService._listeners.has(signalName)) {
            for (const callback of FakeBatteryService._listeners.get(signalName).values()) {
                callback(FakeBatteryService); // Pass service instance
            }
        }
        if (FakeBatteryService._listeners.has('changed')) { // Generic changed signal
             for (const callback of FakeBatteryService._listeners.get('changed').values()) {
                callback(FakeBatteryService);
            }
        }
    },
};

// Update 'charged' state based on percent and charging status
createEffect(() => {
    const isCharged = (FakeBatteryService.percent >= 100 && FakeBatteryService.charging) || (FakeBatteryService.percent >= 99 && !FakeBatteryService.charging); // Example logic
    _setCharged(isCharged);
}, [_percent, _charging]);


// For easy console testing: globalThis.battery = FakeBatteryService;
// e.g., battery.percent = 10; battery.charging = true;
export default FakeBatteryService;
