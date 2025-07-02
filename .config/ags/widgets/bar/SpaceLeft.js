import App from 'ags/app';
import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import { box, label, scrollable, overlay, eventbox } from 'ags/widgets';
import { createBinding, createEffect, createState } from 'ags';
import Brightness from '../../services/brightnessService.js'; // Placeholder
import Indicator from '../../services/indicatorService.js';   // Placeholder
import { distance } from '../../utils/mathfuncs.js'; // Migrated

import Hyprland from '../../services/hyprlandService.js'; // Import the new centralized service
// No more FakeHyprland here

const OSD_DISMISS_DISTANCE = 10;

const WindowTitle = () => {
    // Hyprland.active.client is an accessor for the active client object.
    // It might be null if no client is active (e.g., empty workspace).
    // The client object itself has properties like .class, .title which should also be accessors.

    // Fallback values for when client or its properties are null/undefined
    const defaultClientClass = "Desktop";
    const defaultClientTitle = (wsId) => `Workspace ${wsId}`;

    return scrollable({
        hexpand: true, vexpand: true,
        hscrollbarPolicy: Gtk.ScrollablePolicy.AUTOMATIC,
        vscrollbarPolicy: Gtk.ScrollablePolicy.NEVER,
        child: box({
            vertical: true,
            children: [
                label({
                    xalign: 0,
                    truncate: 'end',
                    className: 'txt-smaller bar-wintitle-topdesc txt',
                    // Hyprland.active.client.transform(c => c?.class_accessor?.value || defaultClientClass)
                    // If client.class is already an accessor:
                    label: Hyprland.active.client.transform(c => c?.class || defaultClientClass),
                }),
                label({
                    xalign: 0,
                    truncate: 'end',
                    className: 'txt-smallie bar-wintitle-txt',
                    label: createBinding(
                        [Hyprland.active.client, Hyprland.active.workspace],
                        (client, workspace) => {
                            const clientClass = client?.class || "";
                            const clientTitle = client?.title || "";
                            const wsId = workspace?.id || Hyprland.active.workspace.value?.id || 1; // Fallback for workspace ID

                            if (clientClass.length === 0 && clientTitle.length === 0) return defaultClientTitle(wsId);
                            // If only title is empty but class exists, could show class or workspace name
                            if (clientTitle.length === 0 && clientClass.length > 0) return defaultClientTitle(wsId);
                            return clientTitle;
                        }
                    ),
                })
            ]
        })
    });
};

export default function SpaceLeft({ monitor = 0 } = {}) {
    // const optionalWindowTitleInstance = WindowTitle(); // This is a component function, call it
    const windowTitleWidget = WindowTitle(); // This will be JSX or null

    let scrollCursorX = 0;
    let scrollCursorY = 0;

    return eventbox({
        onScrollUp: (self, event) => {
            // const coords = event.get_coords(); // GDK3 way [boolean, x, y]
            // scrollCursorX = coords[1]; scrollCursorY = coords[2];
            // GDK4: event from onScrollUp might be Gdk.ScrollEvent which has get_delta()
            // For now, assuming it's a generic event that might have get_coords if it's also a motion event
            // However, onScrollUp/Down specifically might not provide coords directly.
            // The original code got coords, but it might have been from a more general scroll event binding.
            // For now, let's assume we don't need coords for brightness change itself.
            Indicator.popup(1);
            Brightness[monitor].screen_value += 0.05;
            return Gdk.EVENT_STOP; // Stop event propagation
        },
        onScrollDown: (self, event) => {
            Indicator.popup(1);
            Brightness[monitor].screen_value -= 0.05;
            return Gdk.EVENT_STOP;
        },
        onPrimaryClick: () => {
            App.toggleWindow('sideleft');
        },
        // For motion-notify-event to dismiss OSD
        setup: (self) => { // self is the eventbox
            const motionController = Gtk.EventControllerMotion.new();
            motionController.connect('motion', (controller, x, y) => {
                // The original code used event.get_coords() which includes device info.
                // Here x and y are direct surface coordinates.
                // This might need adjustment if scrollCursorX/Y were from a different coord system.
                // Assuming scrollCursorX/Y are also surface-relative.
                // The initial scrollCursorX/Y are 0,0. They should be set on scroll start.
                // This logic is a bit flawed as scrollCursorX/Y are not updated on scroll start here.
                // A better OSD dismiss might be a timeout on the Indicator service itself.
                // For now, replicating the distance check, but it will always be from (0,0) initially.
                // This part of the logic needs to be re-thought for robust OSD dismissal.
                // A simple timeout based dismiss in Indicator.popup might be better.
                // If Indicator.popup(1) is called, it can set a timer to call Indicator.popup(-1).
                // Any new Indicator.popup(1) call would reset the timer.
                // This avoids complex motion tracking here.

                // For now, let's keep the original intent, but it needs scrollCursorX/Y to be set.
                // This can be done if onScrollUp/Down also provide event with coords.
                // Or, if we capture button-press before scroll to get initial coords.
                // The original code was:
                // onScrollUp: (self, event) => { let _; [_, scrollCursorX, scrollCursorY] = event.get_coords(); ... }
                // This suggests the event passed to onScrollUp/Down DOES have get_coords().
                // The AGS v2 eventbox onScrollUp handler signature is (widget, event: Gdk.Event).
                // Gdk.Event is too generic. It's likely a Gdk.ScrollEvent.
                // Gdk.ScrollEvent does not have get_coords(). It has get_deltas() and get_position().
                // Let's assume get_position() gives the necessary coordinates for scrollCursorX/Y.
                // This needs to be tested with actual events.
                // For now, will comment out the problematic motion logic.
                // Indicator.popup(-1); // Simplistic dismiss, or rely on timeout in IndicatorService
            });
            // self.add_controller(motionController); // If using the motion controller.
        },
        child: box({
            homogeneous: false,
            children: [
                box({ className: 'bar-corner-spacing' }), // For styling
                overlay({
                    passThrough: true, // Allow clicks to pass to windowTitleWidget if it's interactive
                    child: box({ hexpand: true }), // This seems to be a spacer or background element
                    overlays: [
                        box({
                            className: 'bar-sidemodule', hexpand: true,
                            children: [
                                box({
                                    vertical: true,
                                    className: 'bar-space-button', // Main container for the title
                                    children: [
                                        windowTitleWidget || box(), // Ensure something is a child, even if empty
                                    ]
                                })
                            ]
                        }),
                    ]
                })
            ]
        })
    });
}
