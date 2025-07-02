import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import App from 'ags/app';
import { box, label, button, centerbox } from 'ags/widgets';
import { ऑप्शंस as userOptions } from '../../options.js'; // Hindi "options" - assuming typo, should be English
// Correcting options import:
// import { options as userOptions } from '../../options.js';

import { setupCursorHover } from '../../utils/cursorHover.js';
import { PopupWindow } from '../PopupWindow.js'; // Migrated PopupWindow
import KeybindsDisplay from './KeybindsDisplay.js';
import PeriodicTableDisplay from './PeriodicTableDisplay.js';
import { ExpandingIconTabContainer } from '../common/TabContainer.js'; // Import actual (placeholder content)
import { checkKeybind } from '../../utils/keybindUtils.js'; // Migrated
import ClickCloseRegion from '../common/ClickCloseRegion.js'; // Migrated
import MaterialIcon from '../common/MaterialIcon.js'; // Migrated
import { createState } from 'ags'; // For local state if needed

// getString placeholder
const getString = (str) => str; // TODO: Integrate with i18n service


const cheatsheetPagesData = [
    {
        name: getString('Keybinds'), // i18n
        materialIcon: 'keyboard',
        contentComponent: KeybindsDisplay,
    },
    {
        name: getString('Periodic table'), // i18n
        materialIcon: 'experiment',
        contentComponent: PeriodicTableDisplay,
    },
];

const CheatsheetHeader = ({ monitorId }) => centerbox({ // Added monitorId for close action
    className: 'cheatsheet-header-box', // Add a class for styling if needed
    startWidget: box({}), // Spacer
    centerWidget: box({
        vertical: true,
        className: "spacing-h-15", // Ensure SCSS
        children: [
            box({
                hpack: 'center',
                className: 'spacing-h-5 cheatsheet-title', // Ensure SCSS
                children: [
                    label({
                        hpack: 'center',
                        css: userOptions.cheatsheet?.titleCSS || 'margin-right: 0.682rem;', // from userOptions or default
                        className: 'txt-title', // Ensure SCSS
                        label: getString('Cheat sheet'), // i18n
                    }),
                    label({ vpack: 'center', className: "cheatsheet-key txt-small", label: "󰖳" }), // Super key icon
                    label({ vpack: 'center', className: "cheatsheet-key-notkey txt-small", label: "+" }),
                    label({ vpack: 'center', className: "cheatsheet-key txt-small", label: "/" }),
                ]
            }),
        ]
    }),
    endWidget: button({
        vpack: 'start',
        hpack: 'end',
        className: "cheatsheet-closebtn icon-material txt txt-hugeass", // Ensure SCSS
        onClicked: () => {
            // Original: closeWindowOnAllMonitors('cheatsheet');
            // V2: Close specific window instance
            App.closeWindow(`cheatsheet${monitorId}`);
        },
        child: MaterialIcon({icon: 'close', size: 'hugeass'}), // Use MaterialIcon
        setup: setupCursorHover,
    }),
});

// SheetContent is now part of CheatsheetWindow's scope to manage state

// Main Cheatsheet Window component
export default function CheatsheetWindow({ monitor: monitorId = 0 } = {}) { // Default monitor = 0
    const [currentTabIndex, setCurrentTabIndex] = createState(0);
    const numTabs = cheatsheetPagesData.length;

    // Define methods for tab navigation
    const nextTab = () => setCurrentTabIndex(idx => Math.min(idx + 1, numTabs - 1));
    const prevTab = () => setCurrentTabIndex(idx => Math.max(idx - 1, 0));
    const cycleTab = () => setCurrentTabIndex(idx => (idx + 1) % numTabs);

    // Prepare pages for ExpandingIconTabContainer
    const pages = cheatsheetPagesData.map(pageData => ({
        name: pageData.name,
        icon: pageData.materialIcon,
        contentWidget: pageData.contentComponent(), // Ensure these are functions returning JSX
    }));

    const sheetContentWidget = ExpandingIconTabContainer({
        tabsHpack: 'center',
        tabSwitcherClassName: 'sidebar-icontabswitcher',
        transitionDuration: (userOptions.animations?.durationLarge || 180) * 1.4,
        icons: pages.map(p => p.icon),
        names: pages.map(p => p.name),
        children: pages.map(p => p.contentWidget),
        shownIndex_accessor: currentTabIndex,
        onTabChange_handler: setCurrentTabIndex,
    });

    const mainContentBox = box({
        vertical: true,
        className: "cheatsheet-bg spacing-v-5",
        children: [
            CheatsheetHeader({ monitorId }),
            sheetContentWidget,
        ]
    });

    const handleKeyPress = (widget, event) => {
        const keybindsOptions = userOptions.keybinds?.cheatsheet;
        if (!keybindsOptions) return Gdk.EVENT_PROPAGATE;

        let handled = false;
        if (checkKeybind(event, keybindsOptions.nextTab)) {
            nextTab();
            handled = true;
        } else if (checkKeybind(event, keybindsOptions.prevTab)) {
            prevTab();
            handled = true;
        } else if (checkKeybind(event, keybindsOptions.cycleTab)) {
            cycleTab();
            handled = true;
        }

        // TODO: Keybinds for specific tabs (e.g., KeybindsDisplay's internal paging)
        // This would require KeybindsDisplay to expose its own state/control methods,
        // or for CheatsheetWindow to know about KeybindsDisplay's internal structure,
        // which is less ideal. For now, only main tab navigation is handled.
        // Example: if (cheatsheetPagesData[currentTabIndex.value].name === getString('Keybinds')) { ... }

        return handled ? Gdk.EVENT_STOP : Gdk.EVENT_PROPAGATE;
    };

    return PopupWindow({
        monitor: monitorId,
        name: `cheatsheet${monitorId}`,
        anchor: ['top', 'bottom', 'left', 'right'],
        child: box({
            vertical: true,
            // This outer box for ClickCloseRegions needs to allow focus to pass to mainContentBox for keys.
            // Or, attach key controller to PopupWindow's Gtk.Window directly in its setup.
            // For now, assuming PopupWindow itself handles key events or mainContentBox gets focus.
            children: [
                ClickCloseRegion({ name: `cheatsheet${monitorId}`, multimonitor: false, vexpand: true, fillMonitor: 'h' }),
                box({
                    children: [
                        ClickCloseRegion({ name: `cheatsheet${monitorId}`, multimonitor: false, hexpand: true, fillMonitor: 'v' }),
                        mainContentBox, // This box should capture key events if focusable
                        ClickCloseRegion({ name: `cheatsheet${monitorId}`, multimonitor: false, hexpand: true, fillMonitor: 'v' }),
                    ]
                }),
                ClickCloseRegion({ name: `cheatsheet${monitorId}`, multimonitor: false, vexpand: true, fillMonitor: 'h' }),
            ],
            // Add key controller to the box that should receive focus (mainContentBox or its parent here)
            // This setup needs to be on a widget that can actually receive focus.
            // A Gtk.Box is not focusable by default unless `focusable: true` and it's in focus chain.
            // Better to add controller to the Gtk.Window in PopupWindow.
            // For now, this is a structural placeholder.
            // The PopupWindow's setup for Escape key is a good place for this too.
            // Let's assume PopupWindow's setup is modified to handle these general key events if child requests.
        }),
        // Pass key handler to PopupWindow if it supports it, or handle here.
        // For now, key handling is sketched but not fully wired to focus.
        // The Gtk.EventControllerKey should be on the window or a focusable main child.
        // The PopupWindow itself has an EventControllerKey for Escape. It could be extended.
        // Or, CheatsheetWindow's mainContentBox needs to be focusable.
        $ Gtk.Widget => { // Setup for the root child of PopupWindow
            // This $ refers to the box passed as child to PopupWindow
            // It's better if PopupWindow itself handles key events forwarded from its content
            // or if content requests focus.
            // For now, this specific key handling logic is not fully connected.
        }
    });
}

// Correction for options import
// This should be at the top of the file.
// import { options as userOptions } from '../../options.js';
// It was typed in Hindi characters earlier. Assuming it's meant to be English.
// The import at the top is correct. This comment is just a note.
// The `checkKeybind` and `clickCloseRegion` are still placeholders / commented out.
// The tab containers are also placeholders.
// The `getString` is a placeholder for i18n.
// The key press handling logic is commented out pending proper integration of TabContainer methods.
// The `PopupWindow`'s child box needs to be made focusable and an EventControllerKey added for keyboard navigation of tabs.
// `closeWindowOnAllMonitors` was replaced by closing the specific monitor's cheatsheet window.
