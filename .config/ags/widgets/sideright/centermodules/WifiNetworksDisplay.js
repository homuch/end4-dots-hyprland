import { Gtk } from 'ags/gtk4';
import { box, label, button, icon as AgsIcon, scrollable, switchwidget as AgsSwitch, entry as AgsEntry, revealer } from 'ags/widgets';
import { createBinding, createState } from 'ags';
import { execAsync } from 'ags/process'; // For nmcli commands if needed for connect

import Network from 'ags/service/network';
import MaterialIcon from '../../common/MaterialIcon.js';
import { setupCursorHover } from '../../../utils/cursorHover.js';
import { options as userOptions } from '../../../options.js';

// getString placeholder
const getString = (str) => str; // TODO: i18n

const WifiAPItem = (ap) => { // ap is a Network.AccessPoint GObject
    const [connecting, setConnecting] = createState(false);
    const [showPasswordEntry, setShowPasswordEntry] = createState(false);
    const passwordEntryRef = { widget: null };

    const strengthIconName = createBinding([ap], currentAp => {
        if (!currentAp) return 'network_wifi_0_bar'; // Fallback
        const strength = currentAp.strength; // 0-100
        if (strength > 80) return 'network_wifi_4_bar';
        if (strength > 55) return 'network_wifi_3_bar';
        if (strength > 30) return 'network_wifi_2_bar';
        if (strength > 5) return 'network_wifi_1_bar';
        return 'network_wifi_0_bar';
    });

    const securityIcon = ap.security !== 'open' && ap.security !== '' ?
        MaterialIcon({icon: 'lock', size: 'small', className: 'wifi-ap-security-icon'}) : null;

    const connectAction = async (password = null) => {
        setConnecting(true);
        setShowPasswordEntry(false); // Hide password entry during attempt
        try {
            await Network.wifi.connect(ap.bssid, password);
            // Success will trigger service updates, no need to setConnecting(false) here
            // unless there's specific UI feedback for success before service update.
        } catch (err) {
            console.error(`Failed to connect to ${ap.ssid}: ${err}`);
            // TODO: Show error message to user
            if (err.message.includes("secrets were required")) {
                setShowPasswordEntry(true); // Re-show if secrets needed
            }
        } finally {
            // Only set connecting to false if it didn't succeed and trigger a state change
            // This is tricky because success changes ap.active, which should rebuild the list.
            // If we are still here and not re-rendered due to ap.active change, it means it likely failed.
            if(!ap.active) setConnecting(false);
        }
    };

    return box({
        vertical: true,
        className: `wifi-ap-item spacing-v-5 ${ap.active ? 'active-ap' : ''}`, // Ensure SCSS
        children: [
            button({
                className: 'wifi-ap-button spacing-h-10 padding-5 card', // Ensure SCSS
                onClicked: () => {
                    if (ap.active || connecting.value) return;
                    if (ap.security !== 'open' && ap.security !== '') {
                        setShowPasswordEntry(true);
                    } else {
                        connectAction();
                    }
                },
                setup: setupCursorHover,
                child: box({
                    children: [
                        AgsIcon({ icon: strengthIconName, className: 'wifi-ap-strength-icon' }),
                        label({ label: ap.ssid || "Unknown SSID", hexpand: true, xalign: 0, className: 'wifi-ap-ssid' }),
                        securityIcon,
                        connecting.transform(c => c ? MaterialIcon({icon: 'pending', className: 'spinning'}) : (ap.active ? MaterialIcon('check') : null)),
                    ].filter(Boolean)
                }),
            }),
            revealer({
                revealChild: showPasswordEntry,
                transition: 'slide_down',
                child: box({
                    className: 'wifi-password-entry-box spacing-h-5 margin-top-5',
                    children: [
                        AgsEntry({
                            ref: passwordEntryRef,
                            placeholderText: `Password for ${ap.ssid}`,
                            visibility: false, // Password entry
                            hexpand: true,
                            onAccept: ({text}) => connectAction(text),
                        }),
                        button({
                            label: getString("Connect"),
                            onClicked: () => {
                                if (passwordEntryRef.widget) connectAction(passwordEntryRef.widget.text);
                            }
                        })
                    ]
                })
            })
        ]
    });
};

const WifiList = () => scrollable({
    vexpand: true,
    hscrollbarPolicy: Gtk.ScrollPolicyType.NEVER,
    vscrollbarPolicy: Gtk.ScrollPolicyType.AUTOMATIC,
    child: box({
        vertical: true,
        className: 'wifi-network-list spacing-v-10', // Ensure SCSS
        children: Network.wifi.bind('access_points').transform(aps =>
            aps.sort((a,b) => b.strength - a.strength) // Sort by strength
               .map(ap => WifiAPItem(ap))
        )
    })
});

const EmptyContent = () => box({
    homogeneous: true,
    vexpand: true,
    child: box({
        vertical: true,
        vpack: 'center',
        hpack: 'center',
        className: 'txt spacing-v-10',
        children: [
            MaterialIcon('wifi_off', 'gigantic'), // Ensure SCSS
            label({ label: getString('WiFi is disabled or no networks found.'), className: 'txt-small' }),
        ]
    })
});

const Header = () => box({
    className: 'wifi-header spacing-h-10 margin-bottom-5',
    children: [
        label({
            hexpand: true,
            xalign: 0,
            className: 'txt-small titlefont', // Ensure SCSS
            label: Network.wifi.bind('ssid').transform(ssid => ssid || getString("Disconnected"))
        }),
        AgsSwitch({
            active: Network.wifi.bind('enabled'),
            onActivate: ({active}) => {
                Network.wifi.enabled = active;
            },
            setup: setupCursorHover,
        }),
        // TODO: Button to open system Network settings
    ]
});

export default function WifiNetworksDisplay() {
    return (
        <box vertical={true} vexpand={true} hexpand={true} class="wifi-networks-display padding-10 spacing-v-5">
            <label label={getString("WiFi Networks")} class="txt-large category-title" hpack={Gtk.Align.START} />
            <Header />
            {Network.wifi.bind('enabled').transform(enabled =>
                enabled && Network.wifi.access_points.length > 0 ? WifiList() : EmptyContent()
            )}
        </box>
    );
}
