import { createState } from 'ags';
import { readFile, readFileAsync } from 'ags/file'; // Using readFile for initial, consider readFileAsync if it causes startup lag
import { exec, execAsync } from 'ags/process';
import GLib from 'gi://GLib';
import App from 'ags/app';

export const distroID = exec(`bash -c 'cat /etc/os-release | grep "^ID=" | cut -d "=" -f 2 | sed "s/\\"//g"'`).trim();
export const isDebianDistro = (distroID === 'linuxmint' || distroID === 'ubuntu' || distroID === 'debian' || distroID === 'zorin' || distroID === 'popos' || distroID === 'raspbian' || distroID === 'kali');
export const isArchDistro = (distroID === 'arch' || distroID === 'endeavouros' || distroID === 'cachyos');
export const hasFlatpak = !!exec(`bash -c 'command -v flatpak'`);

const LIGHTDARK_FILE_LOCATION = `${GLib.get_user_state_dir()}/ags/user/colormode.txt`;
let initialDarkModeValue = false; // Default to false (light mode)
try {
    // Ensure directory exists before reading
    exec(`mkdir -p ${GLib.get_user_state_dir()}/ags/user`);
    const fileContent = readFile(LIGHTDARK_FILE_LOCATION);
    if (fileContent) {
        initialDarkModeValue = !(fileContent.split('\n')[0].trim() === 'light');
    } else {
        // File might not exist on first run, create it with default (light)
        execAsync(['bash', '-c', `echo 'light' > ${LIGHTDARK_FILE_LOCATION}`]).catch(print);
    }
} catch (error) {
    console.warn(`Failed to read initial dark mode state from ${LIGHTDARK_FILE_LOCATION}, defaulting to light. Error: ${error}`);
    // Attempt to create the file if it doesn't exist or reading failed
    execAsync(['bash', '-c', `echo 'light' > ${LIGHTDARK_FILE_LOCATION}`]).catch(print);
}

const [currentDarkMode, _setDarkModeInternal] = createState(initialDarkModeValue);
export const darkMode = currentDarkMode; // Export the readable accessor

export function setDarkMode(newIsDark) {
    _setDarkModeInternal(newIsDark); // Update the internal state
    const lightdark = newIsDark ? "dark" : "light";
    // Ensure directory exists
    execAsync(['bash', '-c', `mkdir -p ${GLib.get_user_state_dir()}/ags/user && echo '${lightdark}' > ${LIGHTDARK_FILE_LOCATION}`])
        .then(() => {
            // Check if script exists before trying to execute
            const scriptPath = `${App.configDir}/scripts/color_generation/switchcolor.sh`;
            return execAsync(['bash', '-c', `test -f ${scriptPath} && ${scriptPath}`]);
        })
        .then(() => execAsync(['bash', '-c', `command -v darkman && darkman set ${lightdark}`]))
        .catch(error => print(`Error updating dark mode: ${error}`));
}

// Initialize dark mode state on load based on file (if it changed externally)
// This is already handled by reading the file for initialDarkModeValue.
// If the file can be changed by other means while ags is running,
// a file monitor (Gio.FileMonitor) could be used here to call setDarkMode.
// For now, we assume ags is the primary controller of this file once running.


export const hasPlasmaIntegration = !!exec('bash -c "command -v plasma-browser-integration-host"');

export const getDistroIcon = () => {
    // Arches
    if (distroID === 'arch') return 'arch-symbolic';
    if (distroID === 'endeavouros') return 'endeavouros-symbolic';
    if (distroID === 'cachyos') return 'cachyos-symbolic';
    // Funny flake
    if (distroID === 'nixos') return 'nixos-symbolic';
    // Cool thing
    if (distroID === 'fedora') return 'fedora-symbolic';
    // Debians
    if (distroID === 'linuxmint') return 'ubuntu-symbolic';
    if (distroID === 'ubuntu') return 'ubuntu-symbolic';
    if (distroID === 'debian') return 'debian-symbolic';
    if (distroID === 'zorin') return 'ubuntu-symbolic';
    if (distroID === 'popos') return 'ubuntu-symbolic';
    if (distroID === 'raspbian') return 'debian-symbolic';
    if (distroID === 'kali') return 'debian-symbolic';
    return 'linux-symbolic';
};

export const getDistroName = () => {
    // Arches
    if (distroID === 'arch') return 'Arch Linux';
    if (distroID === 'endeavouros') return 'EndeavourOS';
    if (distroID === 'cachyos') return 'CachyOS';
    // Funny flake
    if (distroID === 'nixos') return 'NixOS';
    // Cool thing
    if (distroID === 'fedora') return 'Fedora';
    // Debians
    if (distroID === 'linuxmint') return 'Linux Mint';
    if (distroID === 'ubuntu') return 'Ubuntu';
    if (distroID === 'debian') return 'Debian';
    if (distroID === 'zorin') return 'Zorin';
    if (distroID === 'popos') return 'Pop!_OS';
    if (distroID === 'raspbian') return 'Raspbian';
    if (distroID === 'kali') return 'Kali Linux';
    return 'Linux';
};

// Set initial dark mode by calling setDarkMode if the value from file is different
// from the default createState value (if createState had a static default)
// or simply ensure the side-effects are run for the initial state.
// This ensures consistency if the script/darkman wasn't run last time.
setDarkMode(initialDarkModeValue);
