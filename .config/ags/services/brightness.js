// import Hyprland from 'resource:///com/github/Aylur/ags/service/hyprland.js'; // v1
// import Service from 'resource:///com/github/Aylur/ags/service.js'; // v1
// import * as Utils from 'resource:///com/github/Aylur/ags/utils.js'; // v1
// const { exec, execAsync } = Utils; // v1
import Astal from 'gi://Astal';

// TODO: Confirm actual service and utility paths from Astal
const Hyprland = Astal.HyprlandService; // Speculative
const AstalService = Astal.Service;     // Speculative base class
const AstalUtils = Astal.Utils;         // Speculative utils module
const AstalVariable = Astal.Variable;   // Speculative variable class

import { clamp } from '../modules/.miscutils/mathfuncs.js'; // This is a local utility

// Base class for brightness services
class BrightnessServiceBase extends AstalService {
    // Astal services might use a constructor or static properties to define signals/props.
    // Or, properties are Astal.Variables and signals are explicit.
    // For now, let's assume screen_value is an Astal.Variable.
    // Signals like 'screen-changed' might be emitted explicitly if needed beyond property changes.

    // Let's define _screenValue as an Astal.Variable if properties are managed this way.
    // Or, if Astal.Service has its own property system, we'd use that.
    // Assuming a simple Astal.Variable for the property for now.
    _screenValueVar; // This will be an instance of Astal.Variable

    constructor() {
        super(); // Call parent constructor
        // Initialize _screenValueVar as an Astal.Variable.
        // The initial value will be set by subclasses.
        this._screenValueVar = new AstalVariable(0);

        // Define a custom signal if needed (ags v1 had 'screen-changed')
        // This depends on Astal's API for custom signals on a service.
        // Example: this.defineSignal('screen-changed', GLib.TYPE_FLOAT);
    }

    get screen_value() {
        return this._screenValueVar.value;
    }

    set screen_value(percent) {
        const clampedPercent = clamp(percent, 0, 1);

        // Optimistically update the variable. If execAsync fails, we might need to revert
        // or handle the state more carefully.
        // this._screenValueVar.value = clampedPercent; // Update before exec or after success?

        AstalUtils.execAsync(this.setBrightnessCmd(clampedPercent))
            .then(() => {
                this._screenValueVar.value = clampedPercent; // Update on success
                // this.emit('screen-changed', clampedPercent); // Emit custom signal if defined
                // Astal.Variable changes should automatically notify listeners.
            })
            .catch(err => {
                print(`Failed to set brightness: ${err}`);
                // Optionally revert if optimistic update was done:
                // this._screenValueVar.value = old_value_if_cached;
            });
    }

    // This method might not be needed if Astal's default connection mechanism is sufficient.
    // connectWidget(widget, callback, event = 'notify::screen-value') { // Default to property notification
    //    super.connectWidget(widget, callback, event); // Or Astal's equivalent
    // }

    // Abstract method to be implemented by subclasses
    setBrightnessCmd(percent) {
        throw new Error("setBrightnessCmd must be implemented by subclasses");
    }

    // Method to initialize screen value, called by subclasses
    _initializeScreenValue(value) {
        this._screenValueVar.value = clamp(value, 0, 1);
    }
}

class BrightnessCtlService extends BrightnessServiceBase {
    constructor() {
        super();
        try {
            const current = Number(AstalUtils.exec('brightnessctl g'));
            const max = Number(AstalUtils.exec('brightnessctl m'));
            this._initializeScreenValue(current / max);
        } catch (err) {
            print(`Failed to initialize BrightnessCtlService: ${err}`);
            this._initializeScreenValue(0); // Default to 0 on error
        }
    }

    setBrightnessCmd(percent) {
        return `brightnessctl s ${Math.round(percent * 100)}% -q`;
    }
}

class BrightnessDdcService extends BrightnessServiceBase {
    _busNum;

    constructor(busNum) {
        super();
        this._busNum = busNum;
        AstalUtils.execAsync(`ddcutil -b ${this._busNum} getvcp 10 --brief`)
            .then((out) => {
                const lines = out.split('\n');
                const lastLine = lines[lines.length - 1];
                const parts = lastLine.split(' ');
                if (parts.length >= 4 && parts[0] === 'VCP') { // Basic validation
                    const current = Number(parts[3]);
                    const max = Number(parts[4]);
                    this._initializeScreenValue(current / max);
                } else {
                    throw new Error(`Unexpected output from ddcutil: ${lastLine}`);
                }
            })
            .catch(err => {
                print(`Failed to initialize BrightnessDdcService for bus ${this._busNum}: ${err}`);
                this._initializeScreenValue(0); // Default to 0 on error
            });
    }

    setBrightnessCmd(percent) {
        return `ddcutil -b ${this._busNum} setvcp 10 ${Math.round(percent * 100)}`;
    }
}

async function listDdcMonitorsSnBus() {
    let ddcSnBus = {};
    try {
        const out = await AstalUtils.execAsync('ddcutil detect');
        const displays = out.split('\n\n');
        displays.forEach(display => {
            const reg = /[Dd]isplay/; // Keep this regex as is
            if (!reg.test(display)) {
                return;
            }
            const lines = display.split('\n');
            let sn, busNum;
            let unresponsive = false;
            for (let line of lines) {
                line = line.trim()

                // Sometimes ddcutils will report a DP monitor twice, one of the
                // two copies of the monitor will "not support DDC/CI". Just ignore it
                // See https://www.ddcutil.com/faq/#duplicate_displayport
                if (line.includes('unresponsive')) {
                    unresponsive = true;
                }
                if (line.startsWith('Serial')) {
                    sn = line.split(':')[1].trim();
                    // Sometimes sn can be empty. In this cases let's relay on binary sn
                } else if (line.startsWith('Binary') && !sn) {
                    // Make the serial number upper case except for the leading '0x' since Hyprland
                    // seems to use upper case for the rest of the string and ddcutil uses
                    // lower case for all the binary sn
                    sn = '0x'+line.split('(')[1].slice(2,-1).toUpperCase();
                } else if (line.startsWith('I2C bus:')) {
                    busNum = line.split('/dev/i2c-')[1];
                }
            }
            if (sn && busNum && !unresponsive){
                ddcSnBus[sn] = busNum;
            }
        });
    } catch (err) {
    }
    return ddcSnBus;
}

// TODO: This top-level await for listDdcMonitorsSnBus might need to be handled differently
// if Astal services are expected to be constructed synchronously or have an async init method.
// For now, assuming this script is imported and this await completes before services are used.
const ddcSnBus = await listDdcMonitorsSnBus();

// Create service instances based on Hyprland monitors
// This assumes Hyprland service is ready and provides monitor info.
// It might be better to create these services more dynamically if monitors can change,
// or if Astal has a pattern for services that depend on other async services.

let service = []; // Initialize as an empty array

// Check if Hyprland service is available and has monitors
if (Hyprland && Hyprland.monitors) {
    const numMonitors = Hyprland.monitors.length;
    service = Array(numMonitors);

    for (let i = 0; i < numMonitors; i++) {
        const monitor = Hyprland.monitors[i]; // Access monitor object
        const monitorName = monitor.name;
        const monitorSn = monitor.serial;

        // Ensure userOptions and brightness settings are available
        const brightnessControllers = userOptions.brightness?.controllers || {};
        const preferredController = brightnessControllers[monitorName]
            || brightnessControllers.default || "auto";

        if (preferredController) {
            switch (preferredController) {
                case "brightnessctl":
                    service[i] = new BrightnessCtlService();
                    break;
                case "ddcutil":
                    if (ddcSnBus && monitorSn in ddcSnBus) {
                        service[i] = new BrightnessDdcService(ddcSnBus[monitorSn]);
                    } else {
                        print(`DDC bus not found for monitor SN: ${monitorSn}. Falling back for ${monitorName}.`);
                        // Fallback if ddcutil is preferred but bus is not found
                        service[i] = new BrightnessCtlService();
                    }
                    break;
                case "auto":
                    let ddcutilExists = false;
                    try {
                        if (AstalUtils.exec(`bash -c 'command -v ddcutil'`)) ddcutilExists = true;
                    } catch (e) { /* command not found likely */ }

                    if (ddcSnBus && monitorSn in ddcSnBus && ddcutilExists) {
                        service[i] = new BrightnessDdcService(ddcSnBus[monitorSn]);
                    } else {
                        service[i] = new BrightnessCtlService();
                    }
                    break;
                default:
                    print(`Unknown brightness controller ${preferredController}. Using fallback for ${monitorName}.`);
                    service[i] = new BrightnessCtlService(); // Fallback for unknown controller
            }
        } else {
            print(`No preferred controller found for ${monitorName}. Using fallback.`);
            service[i] = new BrightnessCtlService(); // Fallback if no controller specified
        }
    }
} else {
    print("Hyprland service not available or no monitors found. Initializing a single BrightnessCtlService as fallback.");
    service.push(new BrightnessCtlService()); // Fallback to a single brightnessctl service
}


// make it global for easy use with cli, ensure service array is not empty
if (service.length > 0) {
    globalThis.brightness = service[0];
} else {
    // Handle the case where service array might be empty (e.g. if Hyprland fails and fallback also fails)
    print("Brightness service initialization failed to create any instances.");
    globalThis.brightness = null; // Or a dummy service
}

// export to use in other modules
export default service; // Exports an array of service instances (or a single fallback)
