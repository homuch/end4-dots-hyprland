import Gtk from 'gi://Gtk?version=4.0';
import { box, label, revealer, button } from 'ags/widgets';
import MaterialIcon from '../../common/MaterialIcon.js'; // Assuming MaterialIcon is common
import { options as userOptions } from '../../../options.js'; // Corrected path to options

export default function SearchItemBase({
    materialIconName,
    name,
    actionName,
    content,
    onActivate,
    onFocusIn, // New prop for focus handling
    onFocusOut, // New prop for focus handling
    extraClassName = '',
    ...rest
}) {
    const actionTextLabel = label({
        className: 'overview-search-results-txt txt txt-small txt-action', // Ensure SCSS
        label: `${actionName}`,
    });

    const actionTextRevealer = revealer({
        revealChild: false, // Controlled by focus
        transition: Gtk.RevealerTransitionType.SLIDE_LEFT,
        transitionDuration: userOptions.animations?.durationSmall || 150,
        child: actionTextLabel,
    });

    return button({
        ...rest,
        className: `overview-search-result-btn txt ${extraClassName}`, // Ensure SCSS
        onClicked: onActivate,
        child: box({
            // vertical: false, // Default for box
            children: [
                MaterialIcon({icon: materialIconName, size: 'norm', className: 'overview-search-results-icon'}), // Ensure SCSS for icon class too
                box({
                    vertical: true,
                    hexpand: true, // Allow text content to take space
                    children: [
                        label({
                            hpack: 'start',
                            className: 'overview-search-results-txt txt-smallie txt-subtext', // Ensure SCSS
                            label: `${name}`,
                            truncate: 'end',
                            ellipsize: Pango.EllipsizeMode.END, // Pango import needed
                        }),
                        label({
                            hpack: 'start',
                            className: 'overview-search-results-txt txt-norm', // Ensure SCSS
                            label: `${content}`,
                            truncate: 'end',
                            ellipsize: Pango.EllipsizeMode.END,
                        }),
                    ]
                }),
                // box({ hexpand: true }), // Spacer, handled by text box hexpand
                actionTextRevealer,
            ],
        }),
        setup: (self) => { // Gtk.Widget
            // Focus handling: In GTK4, use EventControllerFocus or signals.
            // 'focus-in-event' and 'focus-out-event' are Gdk.Event based.
            // Simpler: 'notify::has-focus' or 'focus_entered'/'focus_left' on EventController.
            // For now, using standard signals if they work on GtkButton.
            self.connect('focus-in-event', () => {
                actionTextRevealer.reveal_child = true;
                if(onFocusIn) onFocusIn();
                return false; // Propagate
            });
            self.connect('focus-out-event', () => {
                actionTextRevealer.reveal_child = false;
                if(onFocusOut) onFocusOut();
                return false; // Propagate
            });
        },
    });
}

import Pango from 'gi://Pango'; // For EllipsizeMode
