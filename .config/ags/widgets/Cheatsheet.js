import { Gtk, Gdk, Pango } from 'ags/gtk4'; // Corrected imports
import { app } from 'ags/gtk4/app';
// Intrinsics <box>, <label>, <button>, <centerbox> are used
import { options as userOptions } from '../../options.js'; // Corrected, was using Hindi "ऑप्शंस"

import { setupCursorHover } from '../../utils/cursorHover.js';
import { PopupWindow } from './PopupWindow.js';
import KeybindsDisplay from './cheatsheet/KeybindsDisplay.js'; // Corrected path
import PeriodicTableDisplay from './cheatsheet/PeriodicTableDisplay.js'; // Corrected path
import { ExpandingIconTabContainer } from '../common/TabContainer.js';
import { checkKeybind } from '../../utils/keybindUtils.js';
import ClickCloseRegion from '../common/ClickCloseRegion.js';
import MaterialIcon from '../common/MaterialIcon.js';
import { createState } from 'ags';

const getString = (str) => str; // TODO: i18n placeholder

const cheatsheetPagesData = [
    { name: getString('Keybinds'), materialIcon: 'keyboard', contentComponent: KeybindsDisplay },
    { name: getString('Periodic table'), materialIcon: 'experiment', contentComponent: PeriodicTableDisplay },
];

const CheatsheetHeader = ({ monitorId }) => (
    <centerbox class='cheatsheet-header-box'>
        <box $type="start" />
        <box $type="center" vertical={true} class="spacing-h-15">
            <box hpack={Gtk.Align.CENTER} class='spacing-h-5 cheatsheet-title'>
                <label
                    hpack={Gtk.Align.CENTER}
                    css={userOptions.cheatsheet?.titleCSS || 'margin-right: 0.682rem;'}
                    class='txt-title' label={getString('Cheat sheet')}
                />
                <label vpack={Gtk.Align.CENTER} class="cheatsheet-key txt-small" label="󰖳" />
                <label vpack={Gtk.Align.CENTER} class="cheatsheet-key-notkey txt-small" label="+" />
                <label vpack={Gtk.Align.CENTER} class="cheatsheet-key txt-small" label="/" />
            </box>
        </box>
        <button $type="end"
            vpack={Gtk.Align.START} hpack={Gtk.Align.END}
            class="cheatsheet-closebtn icon-material txt txt-hugeass"
            onClicked={() => app.closeWindow(`cheatsheet${monitorId}`)}
            $={setupCursorHover}
        >
            <MaterialIcon icon='close' size='hugeass' />
        </button>
    </centerbox>
);

export default function CheatsheetWindow({ monitor: monitorId = 0 } = {}) {
    const [currentTabIndex, setCurrentTabIndex] = createState(0);
    const numTabs = cheatsheetPagesData.length;

    const nextTab = () => setCurrentTabIndex(idx => Math.min(idx + 1, numTabs - 1));
    const prevTab = () => setCurrentTabIndex(idx => Math.max(idx - 1, 0));
    const cycleTab = () => setCurrentTabIndex(idx => (idx + 1) % numTabs);

    const pages = cheatsheetPagesData.map(pageData => ({
        name: pageData.name,
        icon: pageData.materialIcon,
        contentWidget: pageData.contentComponent(),
    }));

    const sheetContentWidget = (
        <ExpandingIconTabContainer
            tabsHpack='center' // This should be a Gtk.Align enum or string AGS parses
            tabSwitcherClassName='sidebar-icontabswitcher'
            transitionDuration={Math.floor((userOptions.animations?.durationLarge || 180) * 1.4)}
            icons={pages.map(p => p.icon)}
            names={pages.map(p => p.name)}
            children={pages.map(p => p.contentWidget)}
            shownIndex_accessor={currentTabIndex}
            onTabChange_handler={setCurrentTabIndex}
        />
    );

    const mainContentBox = (
        <box vertical={true} class="cheatsheet-bg spacing-v-5" canFocus={true} $={self => {
            // Add key controller to this box if it's meant to handle navigation
            const controller = Gtk.EventControllerKey.new();
            controller.connect('key-pressed', (c, keyval, keycode, modifier) => {
                const event = { get_keyval: () => keyval, get_state: () => modifier }; // Mock event for checkKeybind
                return handleKeyPress(event); // Pass the mock event
            });
            self.add_controller(controller);
            // Request focus when window is shown so keybinds work immediately
            // This might need to be done on the PopupWindow's child or the window itself.
            // self.grab_focus(); // Call when mapped/visible
        }}>
            <CheatsheetHeader monitorId={monitorId} />
            {sheetContentWidget}
        </box>
    );

    const handleKeyPress = (event) => { // Removed widget param as it's not used from controller
        const keybindsOptions = userOptions.keybinds?.cheatsheet;
        if (!keybindsOptions) return Gdk.EVENT_PROPAGATE;

        let handled = false;
        if (checkKeybind(event, keybindsOptions.nextTab)) { nextTab(); handled = true; }
        else if (checkKeybind(event, keybindsOptions.prevTab)) { prevTab(); handled = true; }
        else if (checkKeybind(event, keybindsOptions.cycleTab)) { cycleTab(); handled = true; }

        // TODO: Keybinds for specific tabs (e.g., KeybindsDisplay's internal paging)
        // This would require the specific contentWidget (e.g. KeybindsDisplay instance)
        // to expose methods to control its internal state, and CheatsheetWindow
        // would need a way to get a ref to that specific child instance from the stack.
        // This is advanced and depends on how KeybindsDisplay is structured.

        return handled ? Gdk.EVENT_STOP : Gdk.EVENT_PROPAGATE;
    };

    return (
        <PopupWindow
            monitor={monitorId} // Pass monitorId, PopupWindow expects number
            name={`cheatsheet${monitorId}`}
            anchor={['top', 'bottom', 'left', 'right']}
            keymode='on-demand' // Prop from original
            // PopupWindow already handles Escape key
            // For other keybinds like tab navigation, they should be on the content.
            // The child of PopupWindow needs to be focusable.
        >
            <box vertical={true} class="cheatsheet-popup-child">
                <ClickCloseRegion name={`cheatsheet${monitorId}`} vexpand={true} fillMonitor='h' />
                <box>
                    <ClickCloseRegion name={`cheatsheet${monitorId}`} hexpand={true} fillMonitor='v' />
                    {mainContentBox}
                    <ClickCloseRegion name={`cheatsheet${monitorId}`} hexpand={true} fillMonitor='v' />
                </box>
                <ClickCloseRegion name={`cheatsheet${monitorId}`} vexpand={true} fillMonitor='h' />
            </box>
        </PopupWindow>
    );
}
