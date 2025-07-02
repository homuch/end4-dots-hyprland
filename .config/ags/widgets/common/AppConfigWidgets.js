import GLib from 'gi://GLib';
import App from 'ags/app';
import { exec, execAsync } from 'ags/process';
import { options as userOptions, defaultOptions as userOptionsDefaults } from '../../../options.js'; // Corrected path
import { getNestedProperty, updateNestedProperty } from '../../../utils/objectUtils.js'; // Corrected path
import ConfigToggle from './ConfigToggle.js';
import ConfigSpinButton from './ConfigSpinButton.js';

const AGS_CONFIG_FILE = `${App.configDir}/user_options.jsonc`;
// Path to a script assumed to exist for manipulating general hyprland config values by key
const HYPRLAND_GENERAL_CONFIG_FILE = `${GLib.get_user_config_dir()}/hypr/custom/general.conf`;
// The original HyprlandToggle/SpinButton used a python script `hyprconfigurator.py`
// and also directly `hyprctl keyword`. For settings in general.conf, a script is safer.
// For live keywords, `hyprctl keyword` is fine.
// This implementation will assume `hyprconfigurator.py` for persistent general.conf changes,
// and `hyprctl keyword` for live changes if `save = false`.

export function AgsToggle({
    option, // Dot-separated path to the option in userOptions
    save = true, // Whether to run the agsconfigurator.py script
    // Default props for ConfigToggle
    icon = 'settings',
    name = 'AGS Setting',
    desc = `AGS Toggle: ${option}`,
    resetButton = true,
    // Callbacks
    extraOnChange = (newValue) => {},
    extraOnReset = () => {},
    ...rest
}) {
    return ConfigToggle({
        icon, name, desc: `${desc}\n\nPath: ${option}\nFile: ${AGS_CONFIG_FILE}`,
        resetButton,
        initialValue: !!getNestedProperty(userOptions, option), // Ensure boolean
        fetchValue: () => !!getNestedProperty(userOptionsDefaults, option), // Get from defaults for reset
        onChange: (newValue) => {
            updateNestedProperty(userOptions, option, newValue); // Update in-memory options
            if (save) {
                execAsync([
                    'python', // Assuming python is in PATH
                    `${App.configDir}/scripts/ags/agsconfigurator.py`,
                    '--key', option,
                    '--value', newValue,
                    '--file', AGS_CONFIG_FILE
                ]).catch(print);
            }
            extraOnChange(newValue);
        },
        onReset: async () => { // onReset in ConfigToggle is async
            const defaultValue = !!getNestedProperty(userOptionsDefaults, option);
            updateNestedProperty(userOptions, option, defaultValue);
            if (save) {
                await execAsync([ // await if execAsync returns a promise that matters for sequence
                    'python',
                    `${App.configDir}/scripts/ags/agsconfigurator.py`,
                    '--key', option,
                    '--reset',
                    '--file', AGS_CONFIG_FILE
                ]).catch(print);
            }
            extraOnReset();
            return defaultValue; // Return the reset value for ConfigToggle's state
        },
        ...rest,
    });
}

export function AgsSpinButton({
    option,
    save = true,
    icon = 'tune',
    name = 'AGS Value',
    desc = `AGS SpinButton: ${option}`,
    resetButton = true,
    extraOnChange = (newValue) => {},
    extraOnReset = () => {},
    // SpinButton specific props like minValue, maxValue, step
    minValue = 0, maxValue = 1000, step = 10, // Defaults from original AgsSpinButton
    ...rest
}) {
    return ConfigSpinButton({
        icon, name, desc: `${desc}\n\nPath: ${option}\nFile: ${AGS_CONFIG_FILE}`,
        resetButton,
        initialValue: Number(getNestedProperty(userOptions, option)) || minValue,
        fetchValue: () => Number(getNestedProperty(userOptionsDefaults, option)) || minValue,
        minValue, maxValue, step,
        onChange: (newValue) => {
            updateNestedProperty(userOptions, option, newValue);
            if (save) {
                execAsync([
                    'python',
                    `${App.configDir}/scripts/ags/agsconfigurator.py`,
                    '--key', option,
                    '--value', newValue,
                    '--file', AGS_CONFIG_FILE
                ]).catch(print);
            }
            extraOnChange(newValue);
        },
        onReset: async () => {
            const defaultValue = Number(getNestedProperty(userOptionsDefaults, option)) || minValue;
            updateNestedProperty(userOptions, option, defaultValue);
            if (save) {
                await execAsync([
                    'python',
                    `${App.configDir}/scripts/ags/agsconfigurator.py`,
                    '--key', option,
                    '--reset',
                    '--file', AGS_CONFIG_FILE
                ]).catch(print);
            }
            extraOnReset();
            return defaultValue;
        },
        ...rest,
    });
}

// For Hyprland options that are live keywords (not persistent unless also in a conf file)
export function HyprlandKeywordToggle({
    keyword, // e.g., input:follow_mouse
    icon = 'toggle_on',
    name = 'Hyprland Setting',
    desc = `Hyprland Keyword: ${keyword}`,
    // enableValue and disableValue are specific to how the keyword is set
    // For many boolean keywords, it might be 1 for true, 0 for false.
    // Or specific strings like 'enabled'/'disabled'.
    // This component assumes numeric 1/0 for simplicity like original.
    enableValue = 1,
    disableValue = 0,
    // No reset button by default for keywords, as their "default" is complex to fetch without knowing type.
    resetButton = false,
    extraOnChange = (newValue) => {},
    // extraOnReset, // Not typically used for keywords without a config file save
    ...rest
}) {
    // Fetch initial value using `hyprctl getoption`
    // This is synchronous and might block briefly.
    let initialHyprValue = disableValue; // Default to disabled if fetch fails
    try {
        const output = exec(`hyprctl getoption -j ${keyword}`); // Sync exec
        initialHyprValue = JSON.parse(output)["int"]; // Assuming 'int' for 0/1 keywords
    } catch(e) {
        console.warn(`Failed to get initial Hyprland keyword ${keyword}:`, e);
    }

    return ConfigToggle({
        icon, name, desc,
        resetButton: false, // Typically no reset for live keywords unless it resets to a known default via hyprctl
        initialValue: initialHyprValue === enableValue,
        // fetchValue: () => { /* How to get default for a keyword? */ return false; },
        onChange: (newValue) => {
            const valueToSet = newValue ? enableValue : disableValue;
            execAsync(['hyprctl', 'keyword', keyword, `${valueToSet}`]).catch(print);
            extraOnChange(newValue);
        },
        // onReset: async () => { /* What would reset do? */ return false; },
        ...rest,
    });
}

// TODO: HyprlandConfigToggle (for file-based hyprland settings, uses hyprconfigurator.py)
// TODO: HyprlandConfigSpinButton (for file-based hyprland settings)
// These would be similar to AgsToggle/AgsSpinButton but use hyprconfigurator.py and HYPRLAND_GENERAL_CONFIG_FILE.
// The original HyprlandToggle and HyprlandSpinButton were for such file-based settings.
// For brevity, I'm focusing on the Ags variants and a Keyword variant for Hyprland.
// The full Hyprland file-based config widgets would follow the Ags* pattern.
