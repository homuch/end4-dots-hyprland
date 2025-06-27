import GLib from 'gi://GLib';
import Astal from 'gi://Astal'; // For Astal.Variable, Astal.Utils, Astal.App

// TODO: Confirm actual names for Astal.Variable, Astal.Utils, Astal.App
const AstalVariable = Astal.Variable;
const AstalUtils = Astal.Utils;
const App = Astal.App; // Assuming Astal.App provides configDir

let distroID = "";
try {
    distroID = AstalUtils.exec(`bash -c 'cat /etc/os-release | grep "^ID=" | cut -d "=" -f 2 | sed "s/\\"//g"'`).trim();
} catch (e) {
    print(`Error getting distroID: ${e}`);
    // distroID remains ""
}
export { distroID };

export const isDebianDistro = (distroID === 'linuxmint' || distroID === 'ubuntu' || distroID === 'debian' || distroID === 'zorin' || distroID === 'popos' || distroID === 'raspbian' || distroID === 'kali');
export const isArchDistro = (distroID === 'arch' || distroID === 'endeavouros' || distroID === 'cachyos');

let hasFlatpakCmd = false;
try {
    if (AstalUtils.exec(`bash -c 'command -v flatpak'`)) hasFlatpakCmd = true;
} catch (e) { /* command not found */ }
export const hasFlatpak = hasFlatpakCmd;


const LIGHTDARK_FILE_LOCATION = `${GLib.get_user_state_dir()}/ags/user/colormode.txt`;
let initialDarkMode = true; // Default to dark mode if file reading fails
try {
    const fileContent = AstalUtils.readFile(LIGHTDARK_FILE_LOCATION);
    if (fileContent) {
        initialDarkMode = !(fileContent.split('\n')[0].trim() === 'light');
    } else { // File might not exist or be empty, create it with default dark
        AstalUtils.execAsync(['bash', '-c', `mkdir -p ${GLib.get_user_state_dir()}/ags/user && echo "dark" > ${LIGHTDARK_FILE_LOCATION}`]).catch(print);
    }
} catch (e) {
    print(`Error reading darkMode file, defaulting to dark: ${e}`);
    // Attempt to create the file if reading failed due to non-existence
    AstalUtils.execAsync(['bash', '-c', `mkdir -p ${GLib.get_user_state_dir()}/ags/user && echo "dark" > ${LIGHTDARK_FILE_LOCATION}`]).catch(print);
}

export const darkMode = new AstalVariable(initialDarkMode);

// TODO: Confirm how Astal.Variable signals work. Assuming a 'changed' signal or similar.
// If it's a GObject property, it might be 'notify::value'.
darkMode.connect('changed', ({ value }) => { // Assuming 'changed' signal provides new value directly
    let lightdark = value ? "dark" : "light";
    AstalUtils.execAsync([`bash`, `-c`, `mkdir -p ${GLib.get_user_state_dir()}/ags/user && sed -i "1s/.*/${lightdark}/"  ${GLib.get_user_state_dir()}/ags/user/colormode.txt`])
        .then(() => {
            if (App && App.configDir) { // Ensure App and configDir are available
                return AstalUtils.execAsync(['bash', '-c', `${App.configDir}/scripts/color_generation/switchcolor.sh`]);
            }
            return Promise.resolve(); // Skip if App.configDir is not available
        })
        .then(() => AstalUtils.execAsync(['bash', '-c', `command -v darkman && darkman set ${lightdark}`])) // Optional darkman integration
        .catch(print);
});
globalThis['darkMode'] = darkMode;

let plasmaIntegrationExists = false;
try {
    if (AstalUtils.exec('bash -c "command -v plasma-browser-integration-host"')) plasmaIntegrationExists = true;
} catch (e) { /* command not found */ }
export const hasPlasmaIntegration = plasmaIntegrationExists;


export const getDistroIcon = () => {
    // Arches
    if(distroID == 'arch') return 'arch-symbolic';
    if(distroID == 'endeavouros') return 'endeavouros-symbolic';
    if(distroID == 'cachyos') return 'cachyos-symbolic';
    // Funny flake
    if(distroID == 'nixos') return 'nixos-symbolic';
    // Cool thing
    if(distroID == 'fedora') return 'fedora-symbolic';
    // Debians
    if(distroID == 'linuxmint') return 'ubuntu-symbolic';
    if(distroID == 'ubuntu') return 'ubuntu-symbolic';
    if(distroID == 'debian') return 'debian-symbolic';
    if(distroID == 'zorin') return 'ubuntu-symbolic';
    if(distroID == 'popos') return 'ubuntu-symbolic';
    if(distroID == 'raspbian') return 'debian-symbolic';
    if(distroID == 'kali') return 'debian-symbolic';
    return 'linux-symbolic';
}

export const getDistroName = () => {
    // Arches
    if(distroID == 'arch') return 'Arch Linux';
    if(distroID == 'endeavouros') return 'EndeavourOS';
    if(distroID == 'cachyos') return 'CachyOS';
    // Funny flake
    if(distroID == 'nixos') return 'NixOS';
    // Cool thing
    if(distroID == 'fedora') return 'Fedora';
    // Debians
    if(distroID == 'linuxmint') return 'Linux Mint';
    if(distroID == 'ubuntu') return 'Ubuntu';
    if(distroID == 'debian') return 'Debian';
    if(distroID == 'zorin') return 'Zorin';
    if(distroID == 'popos') return 'Pop!_OS';
    if(distroID == 'raspbian') return 'Raspbian';
    if(distroID == 'kali') return 'Kali Linux';
    return 'Linux';
}
