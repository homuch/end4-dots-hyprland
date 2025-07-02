import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import App from 'ags/app';
import { execAsync, exec } from 'ags/process';
import { options as userOptions } from '../options.js'; // For terminal app path
import TodoService from '../services/todoService.js'; // Placeholder Todo service
import { setDarkMode } from './system.js'; // For light/dark mode actions
import { expandTilde as commonExpandTilde } from './fileUtils.js'; // Use the one from fileUtils

export function hasUnterminatedBackslash(inputString) {
    if (typeof inputString !== 'string') return false;
    const match = inputString.match(/\\+$/);
    return match ? match[0].length % 2 !== 0 : false;
}

export function launchCustomCommand(command) { // From miscfunctions.js
    const args = command.toLowerCase().split(' ');
    const action = args[0];
    const param = args.slice(1).join(' ');

    // Note: darkMode.setValue directly is from v1 Variable.
    // In v2, we import and call setDarkMode from utils/system.js
    // The execAsync calls for scripts need to ensure App.configDir is correct.

    switch (action) {
        case '>raw':
            execAsync('hyprctl -j getoption input:accel_profile')
                .then(output => {
                    const value = JSON.parse(output)["str"].trim();
                    const newProfile = (value !== "[[EMPTY]]" && value !== "") ? '[[EMPTY]]' : 'flat';
                    execAsync(['hyprctl', 'keyword', `input:accel_profile ${newProfile}`]).catch(print);
                }).catch(print);
            break;
        case '>img':
            execAsync([`${App.configDir}/scripts/color_generation/switchwall.sh`]).catch(print);
            break;
        case '>color':
            const colorArg = args[1]; // param would be args.slice(1).join(' ')
            if (!colorArg) {
                execAsync([`${App.configDir}/scripts/color_generation/switchcolor.sh`, '--pick']).catch(print);
            } else if (colorArg.startsWith('#')) {
                execAsync([`${App.configDir}/scripts/color_generation/switchcolor.sh`, `"${colorArg}"`]).catch(print);
            }
            break;
        case '>light':
            setDarkMode(false); // Call imported function
            break;
        case '>dark':
            setDarkMode(true); // Call imported function
            break;
        case '>badapple':
            execAsync([`bash`, `-c`, `mkdir -p ${GLib.get_user_state_dir()}/ags/user && sed -i "3s/.*/monochrome/" ${GLib.get_user_state_dir()}/ags/user/colormode.txt`])
                .then(() => execAsync([`${App.configDir}/scripts/color_generation/switchcolor.sh`]))
                .catch(print);
            break;
        case '>material': // This seems to set a backend then regenerate colors
            execAsync([`bash`, `-c`, `mkdir -p ${GLib.get_user_state_dir()}/ags/user && echo "material" > ${GLib.get_user_state_dir()}/ags/user/colorbackend.txt`])
                .then(() => execAsync([`${App.configDir}/scripts/color_generation/switchwall.sh`, '--noswitch']))
                .catch(print);
            break;
        case '>todo':
            TodoService.add(param);
            break;
        case '>shutdown':
            execAsync(`systemctl poweroff || loginctl poweroff`).catch(print);
            break;
        case '>reboot':
            execAsync(`systemctl reboot || loginctl reboot`).catch(print);
            break;
        case '>sleep':
            execAsync(`systemctl suspend || loginctl suspend`).catch(print);
            break;
        case '>logout':
            execAsync(`pkill Hyprland || pkill sway`).catch(print); // This is aggressive
            break;
        default:
            console.warn(`Unknown custom command: ${command}`);
    }
}

export function execAndClose(command, terminal = false) {
    App.closeWindow('overview'); // Assuming 'overview' is the name of the overview window
    const terminalApp = userOptions.apps?.terminal || 'foot'; // Default terminal
    if (terminal) {
        execAsync([terminalApp, '-e', 'fish', '-C', command]).catch(print); // Original used fish -C
    } else {
        execAsync(['bash', '-c', command]).catch(print); // Wrap in bash -c for robustness
    }
}

export function couldBeMath(str) {
    if (typeof str !== 'string') return false;
    // Allow starting with negative numbers, parens, or numbers
    const regex = /^[0-9.+\-*/%()^sqrtabsincostanlglogPIE\s-]+/i;
    // More restrictive: only allow if it starts with a digit or common math starters
    const stricterRegex = /^(?:[0-9.(]|sqrt\(|abs\(|sin\(|cos\(|tan\(|log\()/i;
    if (!stricterRegex.test(str)) return false;

    // Avoid strings that are just numbers or common commands
    if (/^\d+$/.test(str) || /^\d*\.\d+$/.test(str)) return false; // Pure numbers
    if (str.startsWith('>') || str.startsWith('/') || str.startsWith('~')) return false; // Commands/paths

    // Check for balanced parentheses (simple check)
    if ((str.match(/\(/g)?.length || 0) !== (str.match(/\)/g)?.length || 0)) return false;

    // Try to detect if it's not just a command with numbers e.g. "kill 9"
    // This is tricky. The original regex /^[0-9.+*/-]/ was too broad.
    // A common indicator of math is presence of operators not at the start.
    return /[+\-*/%^()]{1}/.test(str.substring(1));
}


// `expandTilde` is already in `fileUtils.js`, so not redefining here.
// Using commonExpandTilde if needed by ls.

function getFileIconName(fileInfo) { // Renamed from getFileIcon to be more specific
    const icon = fileInfo.get_icon(); // Gio.Icon
    if (icon) {
        // Gio.Icon.to_string() gives a usable name for Gtk.Image or AgsIcon
        const iconString = icon.to_string();
        if (iconString) return iconString;
    }
    // Fallback based on type
    const type = fileInfo.get_file_type();
    if (type === Gio.FileType.DIRECTORY) return 'folder-symbolic';
    if (type === Gio.FileType.SPECIAL) return 'special-file-symbolic'; // Or more specific if possible
    // Add more specific fallbacks based on content_type if needed
    // const contentType = fileInfo.get_content_type();
    return 'text-x-generic-symbolic'; // Default file icon
}

export function ls({ path = '~', silent = false } = {}) {
    let contents = [];
    try {
        let expandedPath = commonExpandTilde(path); // Use the one from fileUtils
        if (expandedPath.endsWith('/') && expandedPath.length > 1) { // Avoid making root "/" empty
            expandedPath = expandedPath.slice(0, -1);
        }

        const folder = Gio.File.new_for_path(expandedPath);
        const enumerator = folder.enumerate_children(
            'standard::name,standard::display-name,standard::type,standard::icon,standard::content-type', // Get more info
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        let fileInfo;
        while ((fileInfo = enumerator.next_file(null)) !== null) {
            const fileName = fileInfo.get_display_name(); // Use display name for user-friendly names
            const fileType = fileInfo.get_file_type();

            contents.push({
                parentPath: expandedPath,
                name: fileName,
                type: fileType === Gio.FileType.DIRECTORY ? 'folder' : (fileInfo.get_content_type() || 'file'),
                icon: getFileIconName(fileInfo), // Get themed icon name
            });
        }
        if (enumerator) enumerator.close(null);

        contents.sort((a, b) => {
            const aIsFolder = a.type === 'folder' || a.type === 'inode/directory'; // Check standard content type too
            const bIsFolder = b.type === 'folder' || b.type === 'inode/directory';
            if (aIsFolder && !bIsFolder) return -1;
            if (!aIsFolder && bIsFolder) return 1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });

    } catch (e) {
        if (!silent) console.error(`Error listing directory "${path}":`, e);
    }
    return contents;
}
