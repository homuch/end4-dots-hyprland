import App from 'ags/app';
import Gtk from 'gi://Gtk?version=4.0';
import { box, label, revealer, stack, icon as AgsIcon } from 'ags/widgets'; // Assuming 'icon' for Gtk.Icon
import { createEffect, createBinding, createState, Utils } from 'ags'; // Utils for execAsync if needed
import { exec, execAsync } from 'ags/process';


import MaterialIcon from './MaterialIcon.js';
import { languages } from '../../utils/languageData.js'; // Migrated language data
import { options as userOptions } from '../../options.js';

// Import placeholder services
import Audio from '../../services/audioService.js';
import Bluetooth from '../../services/bluetoothService.js';
import Network from '../../services/networkService.js';
import Notifications from '../../services/notificationsService.js';
// TODO: Import actual Hyprland service
const FakeHyprland = {
    connect: (signal, callback) => {},
    _devices: { keyboards: [{ layout: 'us' }] }, // Simplified for layout
    get devices_accessor() { return createState(this._devices)[0]; }, // Fake accessor
    get active_accessor() { // Fake accessor for active window/workspace if needed by keyboard layout logic
        return {
            keyboard: createState({ layoutName: "English (US)", kbName: "fakekb" })[0]
        };
    },
    // hyprctl -j devices -> parse for keyboards
    getHyprctlDevices: async () => JSON.stringify({ keyboards: [{name: "fakekb", layout: "us"}] }),
};
const Hyprland = FakeHyprland;


// Helper from original
function isLanguageMatch(abbreviation, word) {
    if (!abbreviation || !word) return false;
    const lowerAbbreviation = abbreviation.toLowerCase();
    const lowerWord = word.toLowerCase();
    let j = 0;
    for (let i = 0; i < lowerWord.length; i++) {
        if (lowerWord[i] === lowerAbbreviation[j]) {
            j++;
        }
        if (j === lowerAbbreviation.length) {
            return true;
        }
    }
    return false;
}

export const MicMuteIndicator = () => revealer({
    transition: Gtk.RevealerTransitionType.SLIDE_LEFT,
    transitionDuration: userOptions.animations?.durationSmall || 150,
    // Assuming Audio.microphone.stream.isMuted becomes Audio.microphone.muted_accessor
    revealChild: Audio.microphone?.muted_accessor || createState(false)[0], // Fallback to non-muted
    child: MaterialIcon({ icon: 'mic_off', size: 'norm' }),
});

export const NotificationIndicator = ({ notifCenterName = 'sideright' } = {}) => {
    const unreadCountState = createState(0);
    const [unreadCount, setUnreadCount] = unreadCountState;
    const [revealed, setRevealed] = createState(false);

    createEffect(() => {
        // This logic is complex due to how it determines unread count and visibility.
        // Simplified: show if DND is off and there are notifications.
        // Count increases on 'notified', resets when center is opened.
        if (Notifications.dnd.value) {
            setRevealed(false);
            return;
        }
        // If there are notifications, and notif center is not open, show.
        // This doesn't perfectly match original logic for unread count for the icon itself.
        setRevealed(Notifications.notifications.value.length > 0);

    }, [Notifications.dnd, Notifications.notifications, App.windows]); // App.windows to react to window state changes indirectly

    // Hooks for unread count (simplified)
    // This is tricky because we need to differentiate between new popups and existing notifications.
    // The original logic was flawed. A better system would be needed for perfect unread count.
    // For now, let's use total non-popup notifications if DND is off.
    createEffect(() => {
        if (Notifications.dnd.value) {
            setUnreadCount(0);
        } else {
            // A simple count of active notifications
            setUnreadCount(Notifications.notifications.value.length);
        }
    }, [Notifications.notifications, Notifications.dnd]);

    App.connect('window-toggled', (app, name, visible) => {
        if (name === notifCenterName && visible) {
            setUnreadCount(0); // Reset count when notification center opens
            setRevealed(false); // Hide indicator when center is open
        }
    });


    return revealer({
        transition: Gtk.RevealerTransitionType.SLIDE_LEFT,
        transitionDuration: userOptions.animations?.durationSmall || 150,
        revealChild: revealed,
        child: box({
            children: [
                MaterialIcon({ icon: 'notifications', size: 'norm' }),
                label({
                    className: 'txt-small titlefont', // Ensure SCSS has styles
                    label: unreadCount.transform(count => `${count > 0 ? count : ''}`), // Show count if > 0
                })
            ]
        })
    });
};

export const BluetoothIndicator = () => stack({
    transition: Gtk.StackTransitionType.SLIDE_UP_DOWN,
    transitionDuration: userOptions.animations?.durationSmall || 150,
    children: {
        'disabled': MaterialIcon({ icon: 'bluetooth_disabled', size: 'norm', className: 'txt-norm' }),
        'enabled': MaterialIcon({ icon: 'bluetooth', size: 'norm', className: 'txt-norm' }),
        'connected': MaterialIcon({ icon: 'bluetooth_connected', size: 'norm', className: 'txt-norm' }),
    },
    shown: createBinding(
        [Bluetooth.enabled_accessor, Bluetooth.connected_devices_accessor],
        (enabled, devices) => {
            if (!enabled) return 'disabled';
            if (devices.length === 0) return 'enabled';
            return 'connected';
        },
        'disabled' // Initial state
    ),
});

const BluetoothDevices = () => box({
    className: 'spacing-h-5',
    visible: Bluetooth.connected_devices_accessor.transform(devices => devices.length > 0),
    // Children are dynamically generated based on connected_devices
    // This requires a way to map an accessor array to child widgets.
    // <For each={...}> is the typical AGS v2 way.
    // For now, using createEffect to manually update children (less ideal).
    setup: (self) => {
        createEffect(() => {
            self.children = Bluetooth.connected_devices.value.map(device => box({
                className: 'bar-bluetooth-device spacing-h-5',
                vpack: 'center',
                tooltipText: device.name,
                children: [
                    AgsIcon({ icon: `${device.iconName || 'bluetooth'}-symbolic` }), // Use AgsIcon
                    ...(device.batteryPercentage !== null && device.batteryPercentage !== undefined ? [label({
                        className: 'txt-smallie',
                        label: `${device.batteryPercentage}%`,
                        // TODO: Hook into device-specific battery updates if the fake service supported it more deeply
                    })] : []),
                ]
            }));
        }, [Bluetooth.connected_devices_accessor]);
    }
});


const SimpleNetworkIndicator = () => AgsIcon({
    icon: Network.primary_accessor.transform(primary => Network[primary || 'wifi']?.iconName || ''),
    visible: Network.primary_accessor.transform(primary => !!(Network[primary || 'wifi']?.iconName)),
});

const NetworkWiredIndicator = () => stack({
    transition: Gtk.StackTransitionType.SLIDE_UP_DOWN,
    transitionDuration: userOptions.animations?.durationSmall || 150,
    children: {
        'fallback': SimpleNetworkIndicator(), // Shown if logic below fails
        'unknown': MaterialIcon({ icon: 'wifi_off', size: 'norm', className: 'txt-norm' }),
        'disconnected': MaterialIcon({ icon: 'signal_wifi_off', size: 'norm', className: 'txt-norm' }), // Using wifi off for generic disconnected
        'connected': MaterialIcon({ icon: 'lan', size: 'norm', className: 'txt-norm' }),
        'connecting': MaterialIcon({ icon: 'settings_ethernet', size: 'norm', className: 'txt-norm' }),
    },
    shown: createBinding(
        [Network.wired?.internet_accessor, Network.connectivity_accessor],
        (wiredInternet, generalConnectivity) => {
            if (!Network.wired) return 'unknown'; // Should not happen if wired is primary
            if (['connecting', 'connected'].includes(wiredInternet)) return wiredInternet;
            if (generalConnectivity !== 'full') return 'disconnected'; // wired but no full connectivity
            return 'fallback'; // Should ideally be 'connected' or specific state
        },
        'unknown'
    ),
});

const NetworkWifiIndicator = () => stack({
    transition: Gtk.StackTransitionType.SLIDE_UP_DOWN,
    transitionDuration: userOptions.animations?.durationSmall || 150,
    children: {
        'disabled': MaterialIcon({ icon: 'signal_wifi_off', size: 'norm', className: 'txt-norm' }),
        'disconnected': MaterialIcon({ icon: 'signal_wifi_statusbar_not_connected', size: 'norm', className: 'txt-norm' }),
        'connecting': MaterialIcon({ icon: 'settings_ethernet', size: 'norm', className: 'txt-norm' }), // Placeholder
        '0': MaterialIcon({ icon: 'signal_wifi_0_bar', size: 'norm', className: 'txt-norm' }),
        '1': MaterialIcon({ icon: 'network_wifi_1_bar', size: 'norm', className: 'txt-norm' }),
        '2': MaterialIcon({ icon: 'network_wifi_2_bar', size: 'norm', className: 'txt-norm' }),
        '3': MaterialIcon({ icon: 'network_wifi_3_bar', size: 'norm', className: 'txt-norm' }),
        '4': MaterialIcon({ icon: 'signal_wifi_4_bar', size: 'norm', className: 'txt-norm' }),
    },
    shown: createBinding(
        [Network.wifi?.enabled_accessor, Network.wifi?.internet_accessor, Network.wifi?.strength_accessor],
        (enabled, internet, strength) => {
            if (!Network.wifi) return 'disabled';
            if (!enabled) return 'disabled';
            if (internet === 'connected') return String(Math.ceil(strength / 25));
            if (['disconnected', 'connecting'].includes(internet)) return internet;
            return 'disabled'; // Fallback
        },
        'disabled'
    ),
});

export const NetworkIndicator = () => stack({
    transition: Gtk.StackTransitionType.SLIDE_UP_DOWN,
    transitionDuration: userOptions.animations?.durationSmall || 150,
    children: {
        'fallback': SimpleNetworkIndicator(),
        'wifi': NetworkWifiIndicator(),
        'wired': NetworkWiredIndicator(),
    },
    shown: Network.primary_accessor.transform(primary => {
        if (!primary) return 'wifi'; // Default to wifi if no primary
        if (['wifi', 'wired'].includes(primary)) return primary;
        return 'fallback';
    }),
});

// HyprlandXkbKeyboardLayout - This is complex due to async exec and dynamic children
// For v2, it's better if Hyprland service exposes keyboard layouts reactively.
// Simplified placeholder for now. A full migration needs careful state management for async data.
const HyprlandXkbKeyboardLayout = ({ useFlag = false } = {}) => {
    const [currentLayoutLabel, setCurrentLayoutLabel] = createState("?");
    const [availableLayouts, setAvailableLayouts] = createState([]); // Store { layout: 'us', display: '🇺🇸' }

    createEffect(async () => {
        try {
            const devicesOutput = await execAsync(['hyprctl', '-j', 'devices']);
            const devices = JSON.parse(devicesOutput);
            const foundKeyboards = devices.keyboards || [];
            let detectedLayouts = [];
            foundKeyboards.forEach(kb => {
                detectedLayouts.push(...kb.layout.split(',').map(l => l.trim()));
            });
            detectedLayouts = [...new Set(detectedLayouts)]; // Unique layouts

            const layoutMap = detectedLayouts.map(l_id => {
                const langEntry = languages.find(lang => lang.layout === l_id || lang.name === l_id); // Match by layout or name
                return {
                    id: l_id,
                    display: langEntry ? (useFlag ? langEntry.flag : langEntry.layout.toUpperCase()) : l_id.toUpperCase()
                };
            });
            setAvailableLayouts(layoutMap);

            // Set current based on Hyprland active layout (simplified)
            // This needs a reactive way to get current layout name from Hyprland service
            const activeLayoutName = Hyprland.active_accessor?.keyboard?.value?.layoutName || "";
            const activeDisplay = layoutMap.find(l => activeLayoutName.includes(l.id) || activeLayoutName.includes(languages.find(lang => lang.layout === l.id)?.name))?.display;
            setCurrentLayoutLabel(activeDisplay || layoutMap[0]?.display || "?");

        } catch (e) {
            console.error("Failed to get Hyprland keyboard layouts:", e);
            setCurrentLayoutLabel("ERR");
        }
    }, [Hyprland.active_accessor?.keyboard]); // React to active keyboard layout changes

    return revealer({ // Only show if more than one layout or explicitly configured
        transition: Gtk.RevealerTransitionType.SLIDE_LEFT,
        transitionDuration: userOptions.animations?.durationSmall || 150,
        revealChild: availableLayouts.transform(layouts => layouts.length > 1), // Show if multiple layouts
        child: label({ label: currentLayoutLabel }),
    });
};


// Global instance for keyboard layout (original pre-rendered for all monitors)
// This is tricky for v2. Each monitor might need its own instance if `monitor` prop affects it.
// For now, assuming one global instance is fine, or it's simple enough to recreate.
// The original `optionalKeyboardLayoutInstances[monitor]` implies per-monitor.
// Let's make StatusIcons pass monitor to a keyboard layout component.
const KeyboardLayoutIndicator = ({ monitor, useFlag }) => {
    // If HyprlandXkbKeyboardLayout itself needs monitor context, pass it.
    // For now, it's global.
    return HyprlandXkbKeyboardLayout({ useFlag });
};


export const StatusIcons = ({ className = '', monitor = 0 } = {}) => box({
    className: `spacing-h-15 ${className}`, // Original had props first, then child
    children: [
        MicMuteIndicator(),
        KeyboardLayoutIndicator({ monitor, useFlag: userOptions.appearance?.keyboardUseFlag }),
        NotificationIndicator({ notifCenterName: 'sideright' }), // Pass prop
        NetworkIndicator(),
        box({
            className: 'spacing-h-5',
            children: [BluetoothIndicator(), BluetoothDevices()]
        })
    ]
});
export default StatusIcons; // Default export for easier usage in SpaceRight.js
