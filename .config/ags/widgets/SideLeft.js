import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import App from 'ags/app';
import { box, button, label, entry as AgsEntry, eventbox, revealer, stack } from 'ags/widgets';
import { createState, createEffect, createBinding, Utils } from 'ags';
import { execAsync } from 'ags/process';

import { PopupWindow } from './PopupWindow.js';
import ClickCloseRegion from '../common/ClickCloseRegion.js';
import MaterialIcon from '../common/MaterialIcon.js';
import { TabContainer } from '../common/TabContainer.js'; // Base TabContainer
import { setupCursorHover } from '../../utils/cursorHover.js';
import { checkKeybind } from '../../utils/keybindUtils.js';
import { updateNestedProperty } from '../../utils/objectUtils.js';
import { options as userOptions } from '../../options.js';

// Placeholders for content components
const PlaceholderContentWidget = (name) => () => box({ child: label({ label: `Content for ${name}` }), vexpand: true, hexpand: true });
const ApiWidgetsDisplay = PlaceholderContentWidget("APIs"); // Placeholder for modules/sideleft/apiwidgets.js
const ToolBoxDisplay = PlaceholderContentWidget("Tools");    // Placeholder for modules/sideleft/toolbox.js
// Placeholder for chatEntry that should be exported by ApiWidgets.js
// This ref will be populated by ApiWidgetsDisplay if it exposes it.
const chatEntryRef = { widget: null, grab_focus: () => chatEntryRef.widget?.grab_focus() };

const getString = (str) => str; // i18n placeholder
const AGS_CONFIG_FILE = `${App.configDir}/user_options.jsonc`;


const SIDEBARTABS_CONFIG = [ // Based on userOptions.sidebar.pages.order
    // Dynamically generate this based on userOptions or have fixed known tabs
    // For now, hardcoding based on typical structure
    { name: 'apis', contentComponent: ApiWidgetsDisplay, materialIcon: 'api', friendlyName: 'APIs' },
    { name: 'tools', contentComponent: ToolBoxDisplay, materialIcon: 'home_repair_service', friendlyName: 'Tools' },
];
// Filter and order based on userOptions
const orderedTabs = userOptions.sidebar?.pages?.order
    ?.map(tabName => SIDEBARTABS_CONFIG.find(t => t.name === tabName))
    .filter(Boolean) || SIDEBARTABS_CONFIG; // Fallback to default order if not configured


const SideLeftContent = () => {
    const initialPageIndex = Math.max(0, orderedTabs.findIndex(tab => tab.name === userOptions.sidebar?.pages?.defaultPage));
    const [currentTabIndex, setCurrentTabIndex] = createState(initialPageIndex);
    const [isExpanded, setIsExpanded] = createState(false); // For the expand button

    const expandButtonWidget = button({
        vpack: 'start',
        className: createBinding([isExpanded], exp => `sidebar-controlbtn ${exp ? 'sidebar-expandbtn-enabled sidebar-controlbtn-enabled' : ''}`),
        child: MaterialIcon({ icon: 'expand_content', size: 'larger' }), // Ensure SCSS size
        tooltipText: `Expand sidebar (${userOptions.keybinds?.sidebar?.expand || 'Ctrl+E'})`,
        onClicked: () => setIsExpanded(e => !e),
        setup: setupCursorHover,
    });

    // This is a bit of a hack. The TabContainer itself doesn't have these methods directly exposed in v2.
    // The parent (this component) now controls the state.
    // For keybinds, we'll call setCurrentTabIndex directly.
    const tabContainerControls = {
        cycleTab: () => setCurrentTabIndex(idx => (idx + 1) % orderedTabs.length),
        nextTab: () => setCurrentTabIndex(idx => Math.min(idx + 1, orderedTabs.length - 1)),
        prevTab: () => setCurrentTabIndex(idx => Math.max(idx - 1, 0)),
    };

    const mainTabContainer = TabContainer({
        icons: orderedTabs.map(item => item.materialIcon),
        names: orderedTabs.map(item => item.friendlyName),
        children: orderedTabs.map(item => item.contentComponent({ chatEntryRef: item.name === 'apis' ? chatEntryRef : null })), // Pass ref to ApiWidgets
        tabStripClassName: 'sidebar-left-tabstrip', // Custom class for styling
        shownIndex_accessor: currentTabIndex,
        onTabChange_handler: (newIndex) => {
            setCurrentTabIndex(newIndex);
            const pageName = orderedTabs[newIndex]?.name;
            if (pageName) {
                const option = 'sidebar.pages.defaultPage';
                updateNestedProperty(userOptions, option, pageName); // Update in-memory options
                execAsync([
                    'python', `${App.configDir}/scripts/ags/agsconfigurator.py`,
                    '--key', option, '--value', pageName, '--file', AGS_CONFIG_FILE
                ]).catch(print);
            }
        },
        extraTabStripWidgets: [ expandButtonWidget ],
    });

    // Key event handling
    const handleKeyPress = (widget, event) => {
        const keybinds = userOptions.keybinds?.sidebar;
        if (!keybinds) return Gdk.EVENT_PROPAGATE;

        let handled = false;
        if (checkKeybind(event, keybinds.cycleTab)) { tabContainerControls.cycleTab(); handled = true; }
        else if (checkKeybind(event, keybinds.nextTab)) { tabContainerControls.nextTab(); handled = true; }
        else if (checkKeybind(event, keybinds.prevTab)) { tabContainerControls.prevTab(); handled = true; }
        else if (checkKeybind(event, keybinds.expand)) { setIsExpanded(e => !e); handled = true; }

        if (handled) return Gdk.EVENT_STOP;

        // API tab specific key handling (focus chat entry)
        const currentTabInfo = orderedTabs[currentTabIndex.value];
        if (currentTabInfo?.name === 'apis') {
            const keyval = event.get_keyval();
            const modstate = event.get_state();
            const isCtrlV = (modstate & Gdk.ModifierType.CONTROL_MASK) && keyval === Gdk.KEY_v;
            const isPrintableChar = !(modstate & Gdk.ModifierType.CONTROL_MASK) && !(modstate & Gdk.ModifierType.ALT_MASK) &&
                                  keyval >= Gdk.KEY_space && keyval <= Gdk.KEY_asciitilde && keyval !== Gdk.KEY_space;
                                  // Original excluded space unless Ctrl was also held. This is simplified.

            if (chatEntryRef.widget && (isPrintableChar || isCtrlV)) {
                if(!chatEntryRef.widget.has_focus) chatEntryRef.widget.grab_focus();
                // Forwarding key event to entry is complex.
                // Simpler: if it was printable, append to entry.
                // For Ctrl+V, it's harder to simulate paste here. Usually GTK handles it if focused.
                // The original code directly manipulated the entry's buffer.
                // This is not straightforward with a separate chatEntry component without direct buffer access.
                // For now, just focus. Pasting/typing should work once focused.
                // If chatEntryRef.widget.text += String.fromCharCode(keyval) was desired for typing:
                // if(isPrintableChar) chatEntryRef.widget.text += String.fromCharCode(keyval);
                return Gdk.EVENT_STOP; // Stop event if we focused the entry
            }
            // TODO: API sub-tab navigation (nextTab/prevTab for API types)
            // This would require ApiWidgetsDisplay to expose methods or be a controlled component.
        }
        return Gdk.EVENT_PROPAGATE;
    };

    return box({
        className: isExpanded.transform(e => `sidebar-left-content ${e ? 'sidebar-expanded' : ''}`), // For expand CSS
        vexpand: true,
        css: 'min-width: 2px;', // Original style
        children: [ mainTabContainer ],
        setup: (self) => { // Add key controller to the root content box
            const controller = Gtk.EventControllerKey.new();
            controller.connect('key-pressed', (c, keyval, keycode, modifier) => {
                // Create a mock event object for checkKeybind
                const mockEvent = { get_keyval: () => keyval, get_state: () => modifier };
                return handleKeyPress(self, mockEvent);
            });
            self.add_controller(controller);
            // Focus itself to receive key events, or ensure a child that can take focus gets it.
            // self.can_focus = true; // Gtk.Widget can_focus
            // self.grab_focus(); // Might be too aggressive, usually on window show
        }
    });
};


// Main SideLeft Window Component (replaces default export of main.js)
export default function SideLeftWindow({ monitor = null } = {}) { // Can be global or per-monitor
    const windowName = monitor === null ? 'sideleft' : `sideleft${monitor}`;
    // SideLeft is usually global, so monitor might not be relevant for its name.
    // Original called it 'sideleft' without monitor ID.

    return PopupWindow({
        keymode: 'on-demand',
        anchor: ['left', 'top', 'bottom'],
        name: 'sideleft', // Use fixed name for toggling
        layer: Gtk.LayerShellLayer.TOP,
        child: box({
            // No specific class for the immediate child of PopupWindow needed unless for margin/padding
            children: [
                SideLeftContent(),
                ClickCloseRegion({ name: 'sideleft', multimonitor: false, hexpand: true }), // Fill remaining horizontal space
            ]
        }),
        // PopupWindow handles Escape key. Other keys handled by SideLeftContent.
    });
}
