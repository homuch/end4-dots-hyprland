import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import App from 'ags/app';
import { box, label, scrollable } from 'ags/widgets'; // Assuming scrollable is needed for paged content
import { exec, execAsync } from 'ags/process';
import { options as userOptions } from '../../options.js';
import { keybindList as fallbackKeybindList } from '../../utils/keybindData.js'; // Fallback data

import { IconTabContainer } from '../../common/TabContainer.js'; // Import actual (but possibly placeholder content)

// getString placeholder - for i18n, replace with actual implementation if available
const getString = (str) => str; // TODO: Integrate with i18n service


const HYPRLAND_KEYBIND_CONFIG_FILE = userOptions.cheatsheet?.keybinds?.configPath ||
                                   `${GLib.get_user_config_dir()}/hypr/hyprland/keybinds.conf`;
const KEYBIND_SECTIONS_PER_PAGE = 3;

// Function to fetch and parse keybinds
function getKeybindData() {
    try {
        // Ensure the script path is correct and executable
        const scriptPath = `${App.configDir}/scripts/hyprland/get_keybinds.py`;
        if (!GLib.file_test(scriptPath, GLib.FileTest.IS_EXECUTABLE)) {
            console.warn(`Keybind script not found or not executable: ${scriptPath}`);
            throw new Error("Script not found/executable");
        }
        const data = exec(`python ${scriptPath} --path "${HYPRLAND_KEYBIND_CONFIG_FILE}"`);
        if (data.trim() === "\"error\"" || data.trim() === "error") { // Check for error string from script
            throw new Error("Script returned error");
        }
        return JSON.parse(data);
    } catch (e) {
        console.error(`Failed to get keybinds from script: ${e}. Using fallback data.`);
        // Use fallback data if script fails
        execAsync(['notify-send',
            'Cheatsheet: Error loading keybinds',
            `Couldn't load from ${HYPRLAND_KEYBIND_CONFIG_FILE}. Check path or script. Using fallback.`,
            '-a', 'ags', '-u', 'critical'
        ]).catch(print);
        return { children: fallbackKeybindList.flat() }; // Assuming fallbackKeybindList structure matches script output
    }
}

const keybindDataRoot = getKeybindData(); // Fetch data once

const keySubstitutions = {
    "Super": "󰖳", // Super/Win key icon
    "mouse_up": "Scroll ↓",
    "mouse_down": "Scroll ↑",
    "mouse:272": "LMB",
    "mouse:273": "RMB",
    "mouse:275": "MouseBack",
    "Slash": "/",
    "Hash": "#",
    // Add more common names if needed, e.g. "Left", "Right" -> "←", "→"
    "Left": "←", "Right": "→", "Up": "↑", "Down": "↓",
    "Page_Up": "PgUp", "Page_Down": "PgDn",
};

const substituteKey = (key) => keySubstitutions[key] || key;

const KeybindEntry = ({ keybindData, type }) => { // type: "keys" or "actions"
    const Key = (keyText) => label({
        vpack: 'center',
        className: `${['OR', '+'].includes(keyText) ? 'cheatsheet-key-notkey' : 'cheatsheet-key'} txt-small`,
        label: substituteKey(keyText),
    });
    const Action = (text) => label({
        xalign: 0,
        label: getString(text), // For i18n
        className: "txt txt-small cheatsheet-action",
    });

    if (type === "keys") {
        return box({
            className: "spacing-h-5", // Reduced spacing for keys
            children: [
                ...(keybindData.mods?.length > 0 ?
                    keybindData.mods.map(mod => Key(mod)).concat(Key("+")) : []),
                Key(keybindData.key),
            ]
        });
    } else { // actions
        return Action(keybindData.comment);
    }
};

const KeybindSection = ({ sectionData }) => {
    return box({
        vertical: true,
        className: 'spacing-v-10', // Spacing between sections/sub-sections
        children: [
            // Section Name (if exists)
            ...(sectionData.name && sectionData.name.length > 0 ? [
                label({
                    xalign: 0,
                    className: "cheatsheet-category-title txt margin-bottom-10", // Ensure SCSS
                    label: getString(sectionData.name), // For i18n
                })
            ] : []),

            // Binds (keys and actions side-by-side)
            ...(sectionData.keybinds?.map(bind => box({
                className: 'spacing-h-10 cheatsheet-bind-lineheight', // Ensure SCSS
                children: [
                    KeybindEntry({ keybindData: bind, type: "keys" }),
                    KeybindEntry({ keybindData: bind, type: "actions" }),
                ]
            })) || []),

            // Children Sections (recursive)
            ...(sectionData.children?.map(childSection => KeybindSection({ sectionData: childSection })) || [])
        ]
    });
};

export default function KeybindsDisplay() {
    if (!keybindDataRoot || !keybindDataRoot.children || keybindDataRoot.children.length === 0) {
        return label({ label: "No keybinds data loaded or available." });
    }

    const mainSections = keybindDataRoot.children;
    const numOfTabs = Math.ceil(mainSections.length / KEYBIND_SECTIONS_PER_PAGE);
    const [currentKeybindPage, setCurrentKeybindPage] = createState(0);

    const keybindPages = Array.from({ length: numOfTabs }, (_, i) => {
        const pageSections = mainSections.slice(
            KEYBIND_SECTIONS_PER_PAGE * i,
            KEYBIND_SECTIONS_PER_PAGE * (i + 1)
        );
        return {
            iconWidget: label({
                className: "txt txt-small",
                label: `${i + 1}`,
            }),
            name: `${i + 1}`,
            contentWidget: scrollable({
                vexpand: true,
                hscrollbarPolicy: Gtk.ScrollablePolicy.NEVER,
                vscrollbarPolicy: Gtk.ScrollablePolicy.AUTOMATIC,
                child: box({
                    className: 'spacing-h-30 cheatsheet-page-padding',
                    children: pageSections.map(section => KeybindSection({ sectionData: section })),
                }),
            }),
        };
    });

    // Expose tab control methods for parent (CheatsheetWindow) if needed for its keybinds
    // This component itself doesn't have keybinds to control its own tabs in this version.
    // If it did, it would use setCurrentKeybindPage.

    return IconTabContainer({
        iconWidgets: keybindPages.map(page => page.iconWidget),
        names: keybindPages.map(page => page.name),
        children: keybindPages.map(page => page.contentWidget),
        shownIndex_accessor: currentKeybindPage,
        onTabChange_handler: setCurrentKeybindPage,
    });
}
