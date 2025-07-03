import { app } from 'ags/gtk4/app'; // Corrected
import { Gtk, Gdk, Pango } from 'ags/gtk4'; // Corrected, added Pango if needed by labels
// Intrinsics: <box>, <label>, <revealer>, <stack>, <icon>
import { createEffect, createBinding, createState } from 'ags';
import { exec, execAsync } from 'ags/process';

import MaterialIcon from './MaterialIcon.js';
import { languages } from '../../utils/languageData.js';
import { options as userOptions } from '../../options.js';

import Audio from 'ags/service/audio';
import Bluetooth from 'ags/service/bluetooth';
import Network from 'ags/service/network';
import Notifications from 'ags/service/notifications';
import Hyprland from 'ags/service/hyprland';

const getString = (str) => str; // TODO: i18n

function isLanguageMatch(abbreviation, word) {
    if (!abbreviation || !word) return false;
    const lowerAbbreviation = abbreviation.toLowerCase();
    const lowerWord = word.toLowerCase();
    let j = 0;
    for (let i = 0; i < lowerWord.length; i++) {
        if (lowerWord[i] === lowerAbbreviation[j]) j++;
        if (j === lowerAbbreviation.length) return true;
    }
    return false;
}

export const MicMuteIndicator = () => (
    <revealer
        transition={Gtk.RevealerTransitionType.SLIDE_LEFT}
        transitionDuration={userOptions.animations?.durationSmall || 150}
        revealChild={Audio.microphone?.bind('muted') || createState(false)[0]} // Bind to 'muted' or 'is_muted'
    >
        <MaterialIcon icon='mic_off' size='norm' />
    </revealer>
);

export const NotificationIndicator = ({ notifCenterName = 'sideright' } = {}) => {
    const [unreadCount, setUnreadCount] = createState(0);
    const [isRevealed, setIsRevealed] = createState(false); // Explicit state for revealer

    createEffect(() => { // Logic to control isRevealed and unreadCount
        const dnd = Notifications.dnd; // Assuming Notifications.dnd is an accessor
        const notifs = Notifications.notifications; // Assuming this is an accessor to the list

        if (dnd) {
            setIsRevealed(false);
            setUnreadCount(0); // Also reset count when DND is on
            return;
        }
        // Show if there are any notifications (popups or stored)
        setIsRevealed(notifs.length > 0);
        setUnreadCount(notifs.filter(n => !n.transient).length); // Count non-transient (non-popup) as unread for the indicator
                                                              // Or simply Notifications.unreadCount if service provides it
    }, [Notifications.dnd, Notifications.notifications]);

    // Reset count when notification center is opened
    app.connect('window-toggled', (appInstance, windowName, visible) => {
        if (windowName === notifCenterName && visible) {
            setUnreadCount(0);
            // Optionally hide indicator icon itself when center is open (original did this)
            // setIsRevealed(false); // This might be too aggressive if you want to see it while center is open.
        }
    });

    return (
        <revealer
            transition={Gtk.RevealerTransitionType.SLIDE_LEFT}
            transitionDuration={userOptions.animations?.durationSmall || 150}
            revealChild={isRevealed}
        >
            <box class="spacing-h-3"> {/* Ensure SCSS for spacing */}
                <MaterialIcon icon='notifications' size='norm' />
                {unreadCount.transform(count => count > 0 ? <label class='txt-small titlefont' label={`${count}`} /> : null)}
            </box>
        </revealer>
    );
};

export const BluetoothIndicator = () => (
    <stack
        transition={Gtk.StackTransitionType.SLIDE_UP_DOWN}
        transitionDuration={userOptions.animations?.durationSmall || 150}
        shown={createBinding( // Use createBinding for complex state dependencies
            [Bluetooth.enabled, Bluetooth.connected_devices], // Assuming these are GObject props or accessors
            (enabled, devices) => {
                if (!enabled) return 'disabled';
                if (!devices || devices.length === 0) return 'enabled';
                return 'connected';
            }
        )}
    >
        {{ // Stack children as an object
            'disabled': <MaterialIcon icon='bluetooth_disabled' size='norm' class='txt-norm' />,
            'enabled': <MaterialIcon icon='bluetooth' size='norm' class='txt-norm' />,
            'connected': <MaterialIcon icon='bluetooth_connected' size='norm' class='txt-norm' />,
        }}
    </stack>
);

const BluetoothDevices = () => (
    <box
        class='spacing-h-5 bar-bluetooth-devices-container' // Add a container class
        visible={Bluetooth.connected_devices.transform(devices => (devices || []).length > 0)}
    >
        {/* Use .transform() to map devices to JSX elements */}
        {Bluetooth.connected_devices.transform(devices => (devices || []).map(device => (
            <box key={device.address || device.name} // Need a unique key for list items
                class='bar-bluetooth-device spacing-h-5'
                vpack={Gtk.Align.CENTER}
                tooltipText={device.name}
            >
                <icon icon={`${device.icon_name || 'bluetooth'}-symbolic`} />
                {device.battery_percentage !== undefined && device.battery_percentage !== null && device.battery_percentage > 0 && (
                    <label class='txt-smallie' label={`${device.battery_percentage}%`} />
                )}
            </box>
        )))}
    </box>
);

const SimpleNetworkIndicator = () => (
    <icon
        icon={Network.bind('primary').transform(p => Network[p || 'wifi']?.icon_name || 'network-offline-symbolic')}
        visible={Network.bind('primary').transform(p => !!Network[p || 'wifi']?.icon_name)}
    />
);

const NetworkWiredIndicator = () => (
    <stack
        transition={Gtk.StackTransitionType.SLIDE_UP_DOWN}
        transitionDuration={userOptions.animations?.durationSmall || 150}
        shown={createBinding([Network.wired], (wired) => { // Assuming Network.wired itself is reactive or has reactive props
            if (!wired) return 'unknown';
            const internetState = wired.internet_state; // Assuming 'internet_state' like 'connected', 'connecting'
            if (['connecting', 'connected'].includes(internetState)) return internetState;
            // if (Network.connectivity !== 'full') return 'disconnected'; // General connectivity check
            return 'disconnected'; // Fallback if not explicitly connected/connecting
        })}
    >
        {{
            'unknown': <MaterialIcon icon='wifi_off' size='norm' class='txt-norm' />,
            'disconnected': <MaterialIcon icon='signal_wifi_off' size='norm' class='txt-norm' />,
            'connected': <MaterialIcon icon='lan' size='norm' class='txt-norm' />,
            'connecting': <MaterialIcon icon='settings_ethernet' size='norm' class='txt-norm' />,
            // 'fallback': <SimpleNetworkIndicator />, // Fallback if logic is complex
        }}
    </stack>
);

const NetworkWifiIndicator = () => (
    <stack
        transition={Gtk.StackTransitionType.SLIDE_UP_DOWN}
        transitionDuration={userOptions.animations?.durationSmall || 150}
        shown={createBinding([Network.wifi], (wifi) => { // Assuming Network.wifi is reactive
            if (!wifi || !wifi.enabled) return 'disabled';
            if (wifi.internet_state === 'connected') return String(Math.ceil((wifi.strength || 0) / 25));
            if (['disconnected', 'connecting'].includes(wifi.internet_state)) return wifi.internet_state;
            return 'disabled';
        })}
    >
        {{
            'disabled': <MaterialIcon icon='signal_wifi_off' size='norm' class='txt-norm' />,
            'disconnected': <MaterialIcon icon='signal_wifi_statusbar_not_connected' size='norm' class='txt-norm' />,
            'connecting': <MaterialIcon icon='settings_ethernet' size='norm' class='txt-norm' />,
            '0': <MaterialIcon icon='signal_wifi_0_bar' size='norm' class='txt-norm' />,
            '1': <MaterialIcon icon='network_wifi_1_bar' size='norm' class='txt-norm' />,
            '2': <MaterialIcon icon='network_wifi_2_bar' size='norm' class='txt-norm' />,
            '3': <MaterialIcon icon='network_wifi_3_bar' size='norm' class='txt-norm' />,
            '4': <MaterialIcon icon='signal_wifi_4_bar' size='norm' class='txt-norm' />,
        }}
    </stack>
);

export const NetworkIndicator = () => (
    <stack
        transition={Gtk.StackTransitionType.SLIDE_UP_DOWN}
        transitionDuration={userOptions.animations?.durationSmall || 150}
        shown={Network.bind('primary').transform(p => ['wifi', 'wired'].includes(p) ? p : (Network.wifi?.enabled ? 'wifi':'fallback'))}
    >
        {{
            'fallback': <SimpleNetworkIndicator />,
            'wifi': <NetworkWifiIndicator />,
            'wired': <NetworkWiredIndicator />,
        }}
    </stack>
);

// HyprlandXkbKeyboardLayout (Simplified to use Hyprland service's active keyboard state)
const HyprlandXkbKeyboardLayout = ({ useFlag = false } = {}) => {
    // Hyprland.active.keyboard should be an accessor for the active keyboard object
    // which has a 'layout' or 'layout_name' property (also an accessor).
    const currentLayoutDisplay = Hyprland.active.keyboard.transform(kb => {
        if (!kb || !kb.layout_name) return "?";
        const layoutName = kb.layout_name; // e.g., "English (US)"
        // Find corresponding entry in our languageData
        const langEntry = languages.find(lang => layoutName.includes(lang.name) || layoutName.toLowerCase().startsWith(lang.layout));
        return langEntry ? (useFlag ? langEntry.flag : langEntry.layout.toUpperCase()) : layoutName.substring(0,2).toUpperCase();
    });

    // Revealer logic based on number of available layouts (more complex, needs Hyprland.keyboards accessor)
    // For now, always show the current layout if available.
    // const showIndicator = Hyprland.keyboards.transform(kbs => kbs && kbs.length > 1); // Assuming Hyprland.keyboards accessor

    return (
        // <revealer revealChild={showIndicator} ...>
        <label label={currentLayoutDisplay} class="keyboard-layout-indicator" />
        // </revealer>
    );
};

const KeyboardLayoutIndicator = ({ monitor, useFlag }) => {
    // The original pre-rendered instances. If HyprlandXkbKeyboardLayout is simple, just call it.
    // If it needs monitor prop for some reason (e.g. per-monitor layout source), pass it.
    return <HyprlandXkbKeyboardLayout useFlag={useFlag} />;
};

export const StatusIcons = ({ className = '', monitor = 0 } = {}) => (
    <box class={`spacing-h-15 ${className}`}>
        <MicMuteIndicator />
        <KeyboardLayoutIndicator monitor={monitor} useFlag={userOptions.appearance?.keyboardUseFlag} />
        <NotificationIndicator notifCenterName='sideright' />
        <NetworkIndicator />
        <box class='spacing-h-5'>
            <BluetoothIndicator />
            <BluetoothDevices />
        </box>
    </box>
);
export default StatusIcons;
