import App from 'ags/app';
import { readFile } from 'ags/file';
import { parseJSONC } from './utils/jsonc.js'; // Adjusted path

function overrideConfigRecursive(userOverrides, configOptions = {}) {
    for (const [key, value] of Object.entries(userOverrides)) {
        if (typeof value === 'object' &&
            value !== null && // Ensure value is not null
            !Array.isArray(value) && // Ensure value is not an array
            configOptions[key] !== undefined && // Ensure key exists in configOptions
            typeof configOptions[key] === 'object' && // Ensure configOptions[key] is an object
            configOptions[key] !== null &&
            !Array.isArray(configOptions[key])) {
            overrideConfigRecursive(value, configOptions[key]);
        } else {
            configOptions[key] = value;
        }
    }
}

let configOptions;
let defaultConfigOptions;

try {
    // Load default options from .config/ags/default_options.jsonc (new location)
    const defaultConfigFile = `${App.configDir}/default_options.jsonc`;
    const defaultConfigFileContents = readFile(defaultConfigFile);
    defaultConfigOptions = parseJSONC(defaultConfigFileContents);

    // Clone the default config to avoid modifying the original
    configOptions = JSON.parse(JSON.stringify(defaultConfigOptions));

    // Load user overrides from .config/ags/user_options.jsonc (standard location)
    const userOverrideFile = `${App.configDir}/user_options.jsonc`;

    // Check if user override file exists
    const userOverrideContents = readFile(userOverrideFile); // This will error if file doesn't exist

    if (userOverrideContents) {
        const userOverrides = parseJSONC(userOverrideContents);
        // Override defaults with user's options
        overrideConfigRecursive(userOverrides, configOptions);
    }

} catch (error) {
    console.warn("Error loading user options:", error);
    // Fallback to default config if user options are missing or erroneous
    if (!configOptions && defaultConfigOptions) {
        configOptions = JSON.parse(JSON.stringify(defaultConfigOptions));
    } else if (!configOptions && !defaultConfigOptions) {
        // Critical error: no defaults and no user options
        console.error("FATAL: Could not load default or user options. Using empty config.");
        configOptions = {};
        defaultConfigOptions = {};
    }
}

export const options = configOptions;
export const defaultOptions = defaultConfigOptions;

// For app.js to use, similar to the v1 userOptions.
// Consider if this is the best way or if app.js should import `options` directly.
globalThis.userOptions = configOptions; // Kept for now for compatibility with app.js structure
globalThis.userOptionsDefaults = defaultConfigOptions; // Kept for now
