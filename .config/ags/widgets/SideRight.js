import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import App from 'ags/app';
import { box, button, label, icon as AgsIcon, eventbox, revealer, stack } from 'ags/widgets';
import { createState, createEffect, createBinding, Utils, createPoll } from 'ags';
import { execAsync } from 'ags/process';

import { PopupWindow } from './PopupWindow.js';
import ClickCloseRegion from '../common/ClickCloseRegion.js';
import MaterialIcon from '../common/MaterialIcon.js';
import { ExpandingIconTabContainer } from '../common/TabContainer.js'; // Sketched
import { setupCursorHover } from '../../utils/cursorHover.js';
import { checkKeybind } from '../../utils/keybindUtils.js';
import { options as userOptions } from '../../options.js';
import { getDistroIcon } from '../../utils/system.js'; // Migrated

// Placeholders for i18n and services/modules
const getString = (str) => str;

// --- Placeholders for Sub-Modules ---
const PlaceholderModule = (name) => () => box({vexpand:true, hexpand:true, child: label({label: `${name} Placeholder`})});
// Quick Toggles (individual toggles would be components)
const QuickTogglesBox = () => box({ className: 'sidebar-togglesbox spacing-h-5', hpack: 'center', child: label({label: "Quick Toggles Placeholder"})});
// Center Modules
const ModuleNotificationList = PlaceholderModule("Notifications List");
const ModuleAudioControls = PlaceholderModule("Audio Controls");
const ModuleBluetooth = PlaceholderModule("Bluetooth Devices");
const ModuleWifiNetworks = PlaceholderModule("WiFi Networks");
const ModuleConfigure = PlaceholderModule("Quick Config");
// Calendar
const ModuleCalendar = PlaceholderModule("Calendar");
// Specific toggle actions (from quicktoggles.js)
const ModuleReloadIcon = ({hpack}) => button({hpack, child: MaterialIcon({icon:'refresh', size:'norm'}), onClicked: () => App.resetCss() & App.applyCss(`${App.configDir}/style.css`)}); // Simplified reload
const ModulePowerIcon = ({hpack}) => button({hpack, child: MaterialIcon({icon:'power_settings_new', size:'norm'}), onClicked: () => App.toggleWindow('session0')}); // Assuming session0 for monitor 0


const centerWidgetsData = [
    { name: getString('Notifications'), materialIcon: 'notifications', contentComponent: ModuleNotificationList },
    { name: getString('Audio controls'), materialIcon: 'volume_up', contentComponent: ModuleAudioControls },
    { name: getString('Bluetooth'), materialIcon: 'bluetooth', contentComponent: ModuleBluetooth },
    { name: getString('Wifi networks'), materialIcon: 'wifi', contentComponent: ModuleWifiNetworks, onFocus: () => execAsync('nmcli dev wifi list').catch(print) },
    { name: getString('Quick config'), materialIcon: 'tune', contentComponent: ModuleConfigure },
];


const TimeRow = () => {
    const uptimeLabel = label({
        hpack: 'center',
        className: 'txt-small txt', // Ensure SCSS
    });

    // Poll for uptime
    // Original had complex fallback logic for uptime command. Simplified here.
    const uptimePoll = createPoll(5000, async () => {
        try {
            return await execAsync(['bash', '-c', `uptime -p | sed -e 's/up //;s/ day\\(s\\)\\?,/d,/;s/ hour\\(s\\)\\?,/h,/;s/ minute\\(s\\)?/m/;s/\\,\\s\\S*//2'`]).catch(() => "N/A");
        } catch { return "N/A"; }
    }, "Loading...");
    createEffect(()=> { uptimeLabel.label = `${getString("Uptime:")} ${uptimePoll.value}`; }, [uptimePoll]);


    return box({
        className: 'spacing-h-10 sidebar-group-invisible-morehorizpad', // Ensure SCSS
        children: [
            AgsIcon({ icon: getDistroIcon(), className: 'txt txt-larger' }), // Ensure SCSS
            uptimeLabel,
            box({ hexpand: true }), // Spacer
            ModuleReloadIcon({ hpack: 'end' }),
            ModulePowerIcon({ hpack: 'end' }),
        ]
    });
};


const SideRightContent = () => {
    const initialPageIndex = 0; // Default to first tab
    const [currentTabIndex, setCurrentTabIndex] = createState(initialPageIndex);
    const numTabs = centerWidgetsData.length;

    const tabControls = {
        nextTab: () => setCurrentTabIndex(idx => Math.min(idx + 1, numTabs - 1)),
        prevTab: () => setCurrentTabIndex(idx => Math.max(idx - 1, 0)),
    };

    const sidebarStack = ExpandingIconTabContainer({
        tabsHpack: 'center',
        tabSwitcherClassName: 'sidebar-icontabswitcher', // Ensure SCSS
        icons: centerWidgetsData.map(item => item.materialIcon),
        names: centerWidgetsData.map(item => item.name),
        children: centerWidgetsData.map(item => item.contentComponent()),
        shownIndex_accessor: currentTabIndex,
        onTabChange_handler: (newIndex) => {
            setCurrentTabIndex(newIndex);
            const item = centerWidgetsData[newIndex];
            if (item && typeof item.onFocus === 'function') {
                item.onFocus();
            }
        },
    });

    const handleKeyPress = (widget, event) => {
        const keybinds = userOptions.keybinds?.sidebar?.options; // Path to sideright tab keybinds
        if (!keybinds) return Gdk.EVENT_PROPAGATE;

        let handled = false;
        if (checkKeybind(event, keybinds.nextTab)) { tabControls.nextTab(); handled = true; }
        else if (checkKeybind(event, keybinds.prevTab)) { tabControls.prevTab(); handled = true; }

        return handled ? Gdk.EVENT_STOP : Gdk.EVENT_PROPAGATE;
    };

    return box({
        vertical: true,
        vexpand: true,
        className: 'sidebar-right spacing-v-15', // Ensure SCSS
        css: 'min-width: 2px;', // Original style
        children: [
            box({ // Top section: Time row and Quick Toggles
                vertical: true,
                className: 'spacing-v-5',
                children: [
                    TimeRow(),
                    QuickTogglesBox(), // Placeholder
                ]
            }),
            box({ // Middle section: Tabbed content (Notifications, Audio, etc.)
                className: 'sidebar-group', // Ensure SCSS for potential card-like appearance
                child: sidebarStack,
            }),
            ModuleCalendar(), // Bottom section: Calendar Placeholder
        ],
        setup: (self) => {
            const controller = Gtk.EventControllerKey.new();
            controller.connect('key-pressed', (c, keyval, keycode, modifier) => {
                const mockEvent = { get_keyval: () => keyval, get_state: () => modifier };
                return handleKeyPress(self, mockEvent);
            });
            self.add_controller(controller);
            // self.can_focus = true; // If the box itself needs to be focusable for keys
        }
    });
};


// Main SideRight Window Component
export default function SideRightWindow({ monitor = null } = {}) {
    // SideRight is typically global, so monitor prop might not be used for naming.
    return PopupWindow({
        keymode: 'on-demand',
        anchor: ['right', 'top', 'bottom'],
        name: 'sideright', // Fixed name for toggling
        layer: Gtk.LayerShellLayer.TOP,
        child: box({
            className: 'sideright-window-outer-box', // For styling/margin if needed
            children: [
                // ClickCloseRegion on the left to close sidebar when clicking outside
                ClickCloseRegion({ name: 'sideright', multimonitor: false, hexpand: true }),
                SideRightContent(),
            ]
        }),
    });
}
