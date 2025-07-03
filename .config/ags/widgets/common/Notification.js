import Gtk from 'gi://Gtk?version=4.0';
import { createState, createEffect } from 'ags';
// Placeholder for a single Notification widget (as used in popups or lists)

export default function Notification({
    notifObject, // The notification object from Notifications service
    isPopup = false, // True if this is for a popup, false if for a list item in a center
    className = '',
    onDismiss, // Callback when notification's close button is clicked: (id) => void
    onAction,  // Callback for actions: (id, actionId) => void
    ...props
}) {
    if (!notifObject) {
        return box({ child: label({label: "Empty notification data"})});
    }

    const { id, app_name, summary, body, urgency, icon_name, time, actions = [] } = notifObject;
    const [hovered, setHovered] = createState(false);

    // TODO: Implement actual layout and styling for a notification
    // This is a very basic placeholder structure.
    // Original likely had more complex layout with app icon, app name, summary, body, time, close button, actions.

    // Placeholder for dismiss timer if it's a popup
    createEffect(() => {
        let timeoutId = null;
        if (isPopup && !hovered.value) {
            // Original had logic for auto-dismiss after a delay (e.g., 5s)
            // timeoutId = Utils.timeout(5000, () => {
            //    if(onDismiss) onDismiss(id); // Or self.destroyWithAnims();
            // });
        }
        return () => {
            if (timeoutId) GLib.source_remove(timeoutId); // GLib needs import
        };
    }, [isPopup, hovered]);


    return revealer({ // To animate in/out
        ...props,
        className: `notification-widget ${urgency} ${className}`, // Add urgency as class
        revealChild: true, // Initially revealed, parent controls actual add/remove for popups
        transition: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transitionDuration: 200, // Example
        child: eventbox({ // To detect hover for popups
            onHover: () => setHovered(true),
            onHoverLost: () => setHovered(false),
            child: box({
                className: 'notification-content-box spacing-v-5 padding-10', // Ensure SCSS
                vertical: true,
                children: [
                    box({ // Header: app icon, name, time, close button
                        className: 'spacing-h-10',
                        children: [
                            icon({ icon: icon_name || app_icon || 'dialog-information-symbolic', size: 24 }), // App icon
                            label({ label: app_name || 'Notification', hexpand: true, xalign: 0, className: 'txt-bold' }),
                            label({ label: new Date(time).toLocaleTimeString(), className: 'txt-small' }),
                            button({
                                child: icon({icon: 'window-close-symbolic'}),
                                onClicked: () => { if (onDismiss) onDismiss(id); },
                                className: 'notification-close-button',
                            })
                        ]
                    }),
                    label({ label: summary, hexpand: true, xalign: 0, className: 'txt-norm notification-summary', wrap: true }),
                    label({ label: body, hexpand: true, xalign: 0, className: 'txt-small notification-body', wrap: true, useMarkup: true }),
                    // TODO: Action buttons if (actions.length > 0)
                    ...(actions.length > 0 ? [
                        box({
                            className: 'notification-actions spacing-h-5 margin-top-5',
                            hpack: 'end',
                            children: actions.map(action => button({
                                label: action.label,
                                onClicked: () => { if (onAction) onAction(id, action.id); }
                            }))
                        })
                    ] : [])
                ]
            })
        }),
        // Attribute for original logic compatibility if needed by NotificationPopupsDisplay
        attribute: {
            hovered: hovered, // Accessor
            // destroyWithAnims: () => { /* TODO: implement animation out then destroy/remove */ }
        }
    });
}

// Need GLib for timeout cleanup if used
import GLib from 'gi://GLib';
// Need app_icon from Applications service if used
// import Applications from 'ags/service/applications';
// const app_icon = Applications.get_app(app_entry)?.icon;
const app_icon = 'dialog-information-symbolic'; // Fallback
