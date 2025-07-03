import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import app from 'ags/gtk4/app';
import { createState, createEffect, Utils } from 'ags'; // Utils for execAsync if not from ags/process
import { execAsync } from 'ags/process';


import { PopupWindow } from './PopupWindow.js'; // Migrated
import MaterialIcon from '../common/MaterialIcon.js'; // Migrated
import { setupCursorHover } from '../../utils/cursorHover.js';
import { options as userOptions } from '../../options.js';
// import { monitors as monitorData } from '../../utils/monitorData.js'; // Placeholder if hyprland service not used for this

// getString placeholder
const getString = (str) => str; // TODO: i18n

// Helper to close all session windows (if multiple monitors show separate session screens)
// Or just close the specific one. The original used closeWindowOnAllMonitors('session').
// For now, assume each session window is named session<id>.
function closeSessionWindow(monitorId) {
    app.closeWindow(`session${monitorId}`);
}


const SessionButton = ({ name, icon, command, className = '', colorId = 0, onFocus, onFocusLost }) => {
    const [isHoveredOrFocused, setIsHoveredOrFocused] = createState(false);

    return button({
        className: `session-button session-color-${colorId} ${className}`, // Ensure SCSS
        onClicked: command,
        child: overlay({
            className: 'session-button-box', // Ensure SCSS
            child: label({ // Was MaterialIcon in original, but label for icon font is common
                vexpand: true,
                className: 'icon-material', // Ensure SCSS for icon font and size
                label: icon,
            }),
            overlays: [
                revealer({
                    vpack: 'end',
                    transition: Gtk.RevealerTransitionType.SLIDE_DOWN,
                    transitionDuration: userOptions.animations?.durationSmall || 150,
                    revealChild: isHoveredOrFocused,
                    child: label({
                        className: 'txt-smaller session-button-desc', // Ensure SCSS
                        label: name,
                    }),
                }),
            ]
        }),
        setup: (self) => {
            setupCursorHover(self);
            self.connect('notify::has-focus', () => {
                setIsHoveredOrFocused(self.has_focus);
                if (self.has_focus && onFocus) onFocus();
                else if (!self.has_focus && onFocusLost) onFocusLost();
            });
            // Gtk.EventControllerMotion for hover (more reliable than widget signals sometimes)
            const hoverController = Gtk.EventControllerMotion.new();
            hoverController.connect('enter', () => setIsHoveredOrFocused(true));
            hoverController.connect('leave', () => { if(!self.has_focus) setIsHoveredOrFocused(false); });
            self.add_controller(hoverController);
        }
    });
};

const SessionScreenContent = ({ monitorId = 0 }) => {
    const screenGeom = Gdk.Display.get_default()?.get_monitor(monitorId)?.get_geometry();
    const screenWidth = screenGeom?.width || 1920; // Fallback
    const screenHeight = screenGeom?.height || 1080; // Fallback

    const lockButtonRef = { widget: null }; // To grab focus

    const buttons = [
        { name: getString('Lock'), icon: 'lock', command: () => { closeSessionWindow(monitorId); execAsync(['loginctl', 'lock-session']).catch(print); }, colorId: 1, ref: lockButtonRef },
        { name: getString('Logout'), icon: 'logout', command: () => { closeSessionWindow(monitorId); execAsync(['bash', '-c', 'pkill Hyprland || pkill sway || pkill niri || loginctl terminate-user $USER']).catch(print); }, colorId: 2 },
        { name: getString('Sleep'), icon: 'sleep', command: () => { closeSessionWindow(monitorId); execAsync(['systemctl', 'suspend', '||', 'loginctl', 'suspend']).catch(print); }, colorId: 3 },
        { name: getString('Hibernate'), icon: 'downloading', command: () => { closeSessionWindow(monitorId); execAsync(['systemctl', 'hibernate', '||', 'loginctl', 'hibernate']).catch(print); }, colorId: 4 },
        { name: getString('Shutdown'), icon: 'power_settings_new', command: () => { closeSessionWindow(monitorId); execAsync(['systemctl', 'poweroff', '||', 'loginctl', 'poweroff']).catch(print); }, colorId: 5 },
        { name: getString('Reboot'), icon: 'restart_alt', command: () => { closeSessionWindow(monitorId); execAsync(['systemctl', 'reboot', '||', 'loginctl', 'reboot']).catch(print); }, colorId: 6 },
    ];
    const cancelButton = SessionButton({ name: getString('Cancel'), icon: 'close', command: () => closeSessionWindow(monitorId), className: 'session-button-cancel', colorId: 7 });

    const sessionDescription = box({
        vertical: true,
        css: 'margin-bottom: 0.682rem;', // Original style
        children: [
            label({ className: 'txt-title txt', label: getString('Session') }), // Ensure SCSS
            label({
                justify: Gtk.Justification.CENTER, className: 'txt-small txt', // Ensure SCSS
                label: getString('Use arrow keys to navigate.\nEnter to select, Esc to cancel.')
            }),
        ]
    });

    const SessionButtonRow = (children) => box({
        hpack: 'center', className: 'spacing-h-15 session-button-row', children: children, // Ensure SCSS for row styling
    });

    return box({
        className: 'session-bg', // Ensure SCSS for background
        css: `min-width: ${screenWidth}px; min-height: ${screenHeight}px;`,
        vertical: true,
        children: [
            // Top click-close region (optional, PopupWindow handles Escape)
            // eventbox({ vexpand: true, onPrimaryClick: () => closeSessionWindow(monitorId) }),
            box({ // Main content centered
                hpack: 'center', vpack: 'center',
                vexpand: true,
                vertical: true,
                children: [
                    box({
                        vpack: 'center', vertical: true, className: 'spacing-v-15 session-content-box', // Ensure SCSS
                        children: [
                            sessionDescription,
                            SessionButtonRow(buttons.slice(0, 3).map(b => SessionButton(b))),
                            SessionButtonRow(buttons.slice(3, 6).map(b => SessionButton(b))),
                            SessionButtonRow([cancelButton]),
                        ]
                    })
                ]
            }),
            // Bottom click-close region (optional)
            // eventbox({ vexpand: true, onPrimaryClick: () => closeSessionWindow(monitorId) }),
        ],
        setup: (self) => {
            // Grab focus for the first button when the window is mapped (becomes visible)
            // This needs to be connected to the PopupWindow's actual Gtk.Window.
            // For now, assuming this setup is on a widget that's shown with the window.
            Utils.timeout(100, () => { // Delay to ensure button is created and window is visible
                if (lockButtonRef.widget && lockButtonRef.widget.is_visible()) {
                    lockButtonRef.widget.grab_focus();
                }
            });
        },
    });
};


// Main Session Window Component
export default function SessionWindow({ monitor = 0 } = {}) {
    return PopupWindow({
        monitor: monitor,
        name: `session${monitor}`,
        visible: false, // Starts hidden
        keymode: 'on-demand', // From original
        layer: Gtk.LayerShellLayer.OVERLAY, // Use Gtk enum
        exclusivity: 'ignore', // Gtk.LayerShellLayerExclusivity
        anchor: ['top', 'bottom', 'left', 'right'], // Fill screen
        child: SessionScreenContent({ monitorId: monitor }),
        // PopupWindow already handles Escape key to close itself.
        // Additional key navigation (arrows, Enter) would be handled by SessionScreenContent
        // if it had a Gtk.FlowBox or similar for button navigation, or custom EventController.
        // For now, mouse/touch interaction is primary for buttons.
    });
}
