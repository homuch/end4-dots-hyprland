import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import App from 'ags/app';
import { box, label, button, icon as AgsIcon, revealer, eventbox } from 'ags/widgets';
import { createState, createEffect, Utils } from 'ags';
import { execAsync } from 'ags/process';

import MaterialIcon from './MaterialIcon.js';
// import AnimatedCircularProgress from './AnimatedCircularProgress.js'; // Not used in this version
import { setupCursorHover } from '../../utils/cursorHover.js';
import { options as userOptions } from '../../options.js';

const getString = (str) => str; // Placeholder for i18n

function guessMessageType(summary) {
    const keywordsToTypes = {
        'reboot': 'restart_alt', 'recording': 'screen_record', 'battery': 'power',
        'power': 'power', 'screenshot': 'screenshot_monitor', 'welcome': 'waving_hand',
        'time': 'scheduleb', 'installed': 'download', 'update': 'update',
        'ai response': 'neurology', 'startswith:file': 'folder_copy',
    };
    if (!summary) return 'chat';
    const lowerSummary = summary.toLowerCase();
    for (const [keyword, type] of Object.entries(keywordsToTypes)) {
        if (keyword.startsWith('startswith:')) {
            const startsWithKeyword = keyword.replace('startswith:', '');
            if (lowerSummary.startsWith(startsWithKeyword)) return type;
        } else if (lowerSummary.includes(keyword)) return type;
    }
    return 'chat';
}

function processNotificationBody(body, appName) {
    if (!body) return "";
    let processedBody = body;
    if (appName?.toLowerCase().includes('chrome')) {
        processedBody = body.split('\n\n').slice(1).join('\n\n');
    }
    processedBody = processedBody.replace(/<[^>]*>/g, '');
    return processedBody;
}

const getFriendlyNotifTimeString = (timeInSeconds) => {
    const messageTime = GLib.DateTime.new_from_unix_local(timeInSeconds);
    const now = GLib.DateTime.new_now_local();
    const diffSeconds = now.difference(messageTime) / 1000000;

    if (diffSeconds < 60) return getString('Now');

    const todayStart = now.get_beginning_of_day();
    if (messageTime.compare(todayStart) >= 0) {
        return messageTime.format(userOptions.time?.format || '%H:%M') || "Time Error";
    }

    const yesterdayStart = todayStart.add_days(-1);
    if (messageTime.compare(yesterdayStart) >= 0) {
        return getString('Yesterday');
    }
    return messageTime.format(userOptions.time?.dateFormat || '%d/%m') || "Date Error";
};

const NotificationIcon = ({ notif }) => { // Changed prop name for clarity
    const imagePathHint = notif.hints?.['image-path']?.deepUnpack?.();
    const imageUri = notif.imagePath; // Standard GNotification image path (can be file URI or themed icon)

    let bgImageCSS = '';
    if (imagePathHint && typeof imagePathHint === 'string' && imagePathHint.startsWith('file://')) {
        bgImageCSS = `background-image: url("${imagePathHint}");`;
    } else if (imageUri && typeof imageUri === 'string' && imageUri.startsWith('file://')) {
        bgImageCSS = `background-image: url("${imageUri}");`;
    }

    if (bgImageCSS) {
        return box({
            vpack: 'center', hexpand: false, className: 'notif-icon',
            css: `${bgImageCSS} background-size: cover; background-position: center; min-width: 48px; min-height: 48px; border-radius: 8px;`, // Added size and radius
        });
    }

    let iconName = notif.app_icon || ''; // Standard GNotification app_icon
    if (iconName.startsWith("file://")) iconName = iconName.substring(7);

    const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    const useMaterialFallback = !iconName || !iconTheme.has_icon(iconName);
    const urgencyStr = notif.urgency?.value_nick || 'normal';

    return box({
        vpack: 'start', // Align icon to the top of its allocated space
        hexpand: false,
        className: `notif-icon-box ${useMaterialFallback ? `notif-icon-material-${urgencyStr}` : ''}`,
        homogeneous: true,
        css: 'min-width: 48px; min-height: 48px;', // Ensure box has a size for icon
        child: useMaterialFallback ?
            MaterialIcon({ icon: `${urgencyStr === 'critical' ? 'release_alert' : guessMessageType(notif.summary)}`, size: 'huge', hexpand: true }) : // Adjusted size
            AgsIcon({ icon: iconName, size: 32, vpack: 'center' }), // Icon size
    });
};

export default function NotificationWidget({
    notifObject, // This is a GNotification object
    isPopup = false,
    onDismiss, // (id: string) => void
    onAction,  // (id: string, actionId: string) => void
    ...rest
}) {
    if (!notifObject) return box({ child: label({ label: "Error: No notification object" }) });

    const { id, app_name, summary, body, urgency, time, actions = [] } = notifObject;
    const urgencyStr = urgency?.value_nick || 'normal';

    const [expanded, setExpanded] = createState(false);
    const [hovered, setHovered] = createState(false);
    const [held, setHeld] = createState(false);
    const [interactedWhileHeld, setInteractedWhileHeld] = createState(false);
    const mainRevealerRef = { widget: null };

    const destroyWithAnims = () => {
        if (mainRevealerRef.widget) {
            mainRevealerRef.widget.reveal_child = false;
            Utils.timeout(userOptions.animations?.durationLarge || 200, () => {
                if (onDismiss) onDismiss(id);
            });
        } else {
            if (onDismiss) onDismiss(id);
        }
    };

    createEffect(() => {
        let timeoutId = null;
        if (isPopup && !hovered.value && !held.value && notifObject.timeout !== 0) {
            const actualTimeout = (notifObject.timeout > 0) ? notifObject.timeout * 1000 :
                                  (urgencyStr === 'critical' ? userOptions.notifications?.criticalPopupTimeout || 8000 : userOptions.notifications?.popupTimeout || 5000);
            if (actualTimeout > 0) {
                timeoutId = Utils.timeout(actualTimeout, () => {
                    if (!hovered.value && !held.value) destroyWithAnims(); // Check again before dismissing
                });
            }
        }
        return () => { if (timeoutId) Utils.timeout_remove(timeoutId); };
    }, [isPopup, hovered, held, notifObject.timeout, urgencyStr]);

    const summaryLabelRef = { widget: null };

    const notifTextPreview = label({
        xalign: 0, className: `txt-smallie notif-body-${urgencyStr}`, useMarkup: true,
        justify: Gtk.Justification.LEFT, maxWidthChars: 100, // Increased max chars
        truncate: 'end', ellipsize: Pango.EllipsizeMode.END,
        label: (processNotificationBody(body, app_name) || "").split("\n")[0],
    });

    const expandedContentActions = [];
    if (actions.length > 0) {
        expandedContentActions.push(box({
            className: 'notif-actions spacing-h-5 margin-top-10',
            hpack: 'end',
            children: actions.map(action => button({
                label: action.label, hexpand: true,
                className: `notif-action notif-action-${urgencyStr}`,
                onClicked: () => { if (onAction) onAction(id, action.id); /* No auto-dismiss here, let app handle it */ }
            }))
        }));
    } else if (userOptions.notifications?.showCloseButtonEvenWithActions || actions.length === 0) { // Show close if no actions or if option is set
        expandedContentActions.push(box({
            className: 'notif-actions margin-top-10', hpack: 'end',
            children: [button({
                hexpand: false, // Don't let close button expand if other actions might be there
                className: `notif-action notif-action-default notif-action-${urgencyStr}`,
                onClicked: destroyWithAnims, setup: setupCursorHover,
                child: label({ label: getString('Close') }),
            })]
        }));
    }

    const notifTextExpanded = box({
        vertical: true, className: 'spacing-v-5',
        children: [
            label({
                xalign: 0, className: `txt-smallie notif-body-${urgencyStr}`, useMarkup: true,
                justify: Gtk.Justification.LEFT, wrap: true, wrapMode: Pango.WrapMode.WORD_CHAR,
                label: processNotificationBody(body, app_name),
            }),
            ...expandedContentActions
        ]
    });

    const notifExpandButton = button({
        vpack: 'start', className: 'notif-expand-btn',
        onClicked: () => setExpanded(e => !e),
        child: MaterialIcon({ icon: expanded.transform(e => e ? 'expand_less' : 'expand_more'), size: 'norm', vpack: 'center' }),
        setup: setupCursorHover,
    });

    const notificationMainContent = box({
        className: `notification-main-content ${isPopup ? 'popup-' : ''}notif-${urgencyStr} spacing-h-10 ${rest.className || ''}`,
        children: [
            NotificationIcon({ notif: notifObject }), // Pass notifObject as 'notif'
            box({
                className: 'spacing-h-5', hexpand: true,
                children: [
                    box({
                        vpack: 'start', vertical: true, hexpand: true, className: 'spacing-v-3',
                        children: [
                            box({ // Summary and time
                                children: [
                                    label({
                                        xalign: 0, className: 'txt-small txt-semibold titlefont',
                                        justify: Gtk.Justification.LEFT, hexpand: true,
                                        maxWidthChars: 100, truncate: 'end', ellipsize: Pango.EllipsizeMode.END,
                                        useMarkup: summary?.startsWith('<'), label: summary || '',
                                        setup: self => summaryLabelRef.widget = self,
                                    }),
                                    label({
                                        vpack: 'start', className: 'txt-tiny', // Smaller time
                                        label: getFriendlyNotifTimeString(time || Date.now() / 1000),
                                    }),
                                ]
                            }),
                            revealer({ revealChild: expanded.transform(e => !e), transition: Gtk.RevealerTransitionType.SLIDE_DOWN, child: notifTextPreview }),
                            revealer({ revealChild: expanded, transition: Gtk.RevealerTransitionType.SLIDE_UP, child: notifTextExpanded }),
                        ]
                    }),
                    notifExpandButton,
                ]
            })
        ]
    });

    const eventWrapper = eventbox({
        onHover: () => setHovered(true),
        onHoverLost: () => setHovered(false),
        onMiddleClickRelease: destroyWithAnims,
        onSecondaryClickRelease: (event) => { // Prevent context menu on GtkLabel if possible
            setExpanded(e => !e);
            return Gdk.EVENT_STOP;
        },
        child: notificationMainContent,
        setup: (self) => {
            const longPress = Gtk.GestureLongPress.new();
            longPress.connect('pressed', () => {
                setHeld(true); setInteractedWhileHeld(false);
                notificationMainContent.toggleClassName(`${isPopup ? 'popup-' : ''}notif-clicked-${urgencyStr}`, true);
            });
            longPress.connect('cancelled', () => {
                setHeld(false);
                notificationMainContent.toggleClassName(`${isPopup ? 'popup-' : ''}notif-clicked-${urgencyStr}`, false);
            });
            longPress.connect('activated', () => {
                if (!interactedWhileHeld.value && body) {
                    execAsync(['wl-copy', `${body}`]).catch(print);
                    if (summaryLabelRef.widget) {
                        const originalSummary = summary || '';
                        summaryLabelRef.widget.label = `${originalSummary} (copied)`;
                        Utils.timeout(3000, () => {
                            if (summaryLabelRef.widget) summaryLabelRef.widget.label = originalSummary;
                        });
                    }
                }
                setHeld(false);
                notificationMainContent.toggleClassName(`${isPopup ? 'popup-' : ''}notif-clicked-${urgencyStr}`, false);
            });
            self.add_controller(longPress);
            // Drag simplified to not include visual drag, middle click is primary dismiss.
        }
    });

    return revealer({
        ...rest, // Spread other props (like className from parent)
        attribute: { hovered: hovered, destroyWithAnims: destroyWithAnims, id: id, },
        revealChild: true,
        transition: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transitionDuration: userOptions.animations?.durationLarge || 180,
        child: eventWrapper,
        setup: self => mainRevealerRef.widget = self,
    });
}
