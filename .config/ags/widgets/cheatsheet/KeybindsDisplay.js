import GLib from 'gi://GLib';
import { Gtk } from 'ags/gtk4'; // Corrected Gtk import
import { app } from 'ags/gtk4/app'; // Corrected app import
// Intrinsics <box>, <label>, <scrollable> are used
import { exec, execAsync } from 'ags/process';
import { createState } from 'ags'; // For currentKeybindPage state
import { options as userOptions } from '../../options.js';
import { keybindList as fallbackKeybindList } from '../../utils/keybindData.js';
import { IconTabContainer } from '../../common/TabContainer.js';

const getString = (str) => str; // TODO: i18n placeholder

const HYPRLAND_KEYBIND_CONFIG_FILE = userOptions.cheatsheet?.keybinds?.configPath ||
                                   `${GLib.get_user_config_dir()}/hypr/hyprland/keybinds.conf`;
const KEYBIND_SECTIONS_PER_PAGE = 3;

function getKeybindData() {
    try {
        const scriptPath = `${app.configDir}/scripts/hyprland/get_keybinds.py`;
        if (!GLib.file_test(scriptPath, GLib.FileTest.IS_EXECUTABLE)) {
            console.warn(`Keybind script not found or not executable: ${scriptPath}`);
            throw new Error("Script not found/executable");
        }
        const data = exec(`python ${scriptPath} --path "${HYPRLAND_KEYBIND_CONFIG_FILE}"`);
        if (data.trim() === "\"error\"" || data.trim() === "error") {
            throw new Error("Script returned error");
        }
        return JSON.parse(data);
    } catch (e) {
        console.error(`Failed to get keybinds from script: ${e}. Using fallback data.`);
        execAsync(['notify-send',
            'Cheatsheet: Error loading keybinds',
            `Couldn't load from ${HYPRLAND_KEYBIND_CONFIG_FILE}. Check path or script. Using fallback.`,
            '-a', 'ags', '-u', 'critical'
        ]).catch(print);
        // Flatten fallbackKeybindList if it's an array of arrays
        const flatFallback = Array.isArray(fallbackKeybindList[0]) ? fallbackKeybindList.flat() : fallbackKeybindList;
        return { children: flatFallback };
    }
}

const keybindDataRoot = getKeybindData();

const keySubstitutions = {
    "Super": "󰖳", "mouse_up": "Scroll ↓", "mouse_down": "Scroll ↑", "mouse:272": "LMB",
    "mouse:273": "RMB", "mouse:275": "MouseBack", "Slash": "/", "Hash": "#",
    "Left": "←", "Right": "→", "Up": "↑", "Down": "↓", "Page_Up": "PgUp", "Page_Down": "PgDn",
};

const substituteKey = (key) => keySubstitutions[key] || key;

const KeybindEntry = ({ keybindData, type }) => {
    const Key = (keyText) => (
        <label
            vpack={Gtk.Align.CENTER}
            class={`${['OR', '+'].includes(keyText) ? 'cheatsheet-key-notkey' : 'cheatsheet-key'} txt-small`}
            label={substituteKey(keyText)}
        />
    );
    const Action = (text) => (
        <label
            xalign={0}
            label={getString(text)}
            class="txt txt-small cheatsheet-action"
        />
    );

    if (type === "keys") {
        return (
            <box class="spacing-h-5">
                {keybindData.mods?.length > 0 &&
                    keybindData.mods.map(mod => Key(mod)).concat(Key("+"))}
                {Key(keybindData.key)}
            </box>
        );
    } else {
        return Action(keybindData.comment);
    }
};

const KeybindSection = ({ sectionData }) => (
    <box vertical={true} class='spacing-v-10'>
        {sectionData.name && sectionData.name.length > 0 && (
            <label
                xalign={0}
                class="cheatsheet-category-title txt margin-bottom-10"
                label={getString(sectionData.name)}
            />
        )}
        {sectionData.keybinds?.map(bind => (
            <box class='spacing-h-10 cheatsheet-bind-lineheight'>
                <KeybindEntry keybindData={bind} type="keys" />
                <KeybindEntry keybindData={bind} type="actions" />
            </box>
        ))}
        {sectionData.children?.map(childSection => <KeybindSection sectionData={childSection} />)}
    </box>
);

export default function KeybindsDisplay() {
    if (!keybindDataRoot || !keybindDataRoot.children || keybindDataRoot.children.length === 0) {
        return <label label="No keybinds data loaded or available." />;
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
            iconWidget: <label class="txt txt-small" label={`${i + 1}`} />,
            name: `${i + 1}`,
            contentWidget: (
                <scrollable
                    vexpand={true}
                    hscrollbarPolicy={Gtk.ScrollablePolicy.NEVER}
                    vscrollbarPolicy={Gtk.ScrollablePolicy.AUTOMATIC}
                >
                    <box class='spacing-h-30 cheatsheet-page-padding'>
                        {pageSections.map(section => <KeybindSection sectionData={section} />)}
                    </box>
                </scrollable>
            ),
        };
    });

    return (
        <IconTabContainer
            iconWidgets={keybindPages.map(page => page.iconWidget)}
            names={keybindPages.map(page => page.name)}
            children={keybindPages.map(page => page.contentWidget)}
            shownIndex_accessor={currentKeybindPage}
            onTabChange_handler={setCurrentKeybindPage}
        />
    );
}
