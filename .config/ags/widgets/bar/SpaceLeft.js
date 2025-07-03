import { app } from 'ags/gtk4/app'; // Corrected
import { Gtk, Gdk, Pango } from 'ags/gtk4'; // Corrected, Added Pango
// Intrinsics: <box>, <label>, <scrollable>, <overlay>
import { createBinding } from 'ags';
import Brightness from '../../services/brightnessService.js';
import Indicator from '../../services/indicatorService.js';
import { distance } from '../../utils/mathfuncs.js';
import Hyprland from 'ags/service/hyprland'; // Corrected: Use actual service path
import { options as userOptions } from '../../options.js';

const OSD_DISMISS_DISTANCE = userOptions.osd?.dismissDistance || 10;

const WindowTitle = () => {
    const defaultClientClass = "Desktop";
    const defaultClientTitle = (wsId) => `Workspace ${wsId || '?'}`;

    // Hyprland.active.client and Hyprland.active.workspace are accessors
    const clientClassLabel = Hyprland.active.client.transform(c => c?.class || defaultClientClass);
    const clientTitleLabel = createBinding(
        [Hyprland.active.client, Hyprland.active.workspace],
        (client, workspace) => {
            const clientClass = client?.class || "";
            const clientTitle = client?.title || "";
            const wsId = workspace?.id || Hyprland.active.workspace.value?.id || 1;

            if (clientClass.length === 0 && clientTitle.length === 0) return defaultClientTitle(wsId);
            if (clientTitle.length === 0 && clientClass.length > 0) return defaultClientTitle(wsId);
            return clientTitle;
        }
    );

    return (
        <scrollable
            hexpand={true} vexpand={true}
            hscrollbarPolicy={Gtk.ScrollablePolicy.AUTOMATIC}
            vscrollbarPolicy={Gtk.ScrollablePolicy.NEVER}
        >
            <box vertical={true}>
                <label
                    xalign={0}
                    truncate='end'
                    ellipsize={Pango.EllipsizeMode.END}
                    class='txt-smaller bar-wintitle-topdesc txt'
                    label={clientClassLabel}
                />
                <label
                    xalign={0}
                    truncate='end'
                    ellipsize={Pango.EllipsizeMode.END}
                    class='txt-smallie bar-wintitle-txt'
                    label={clientTitleLabel}
                />
            </box>
        </scrollable>
    );
};

// SpaceLeft expects gdkmonitor prop
export default function SpaceLeft({ gdkmonitor }) {
    const monitorId = gdkmonitor.get_monitor_number();
    const windowTitleWidget = WindowTitle();

    // OSD dismiss logic is problematic with scroll events not providing coordinates easily.
    // A timeout in IndicatorService is preferred. Removing motion-based dismiss from here.
    // let scrollCursorX = 0;
    // let scrollCursorY = 0;

    return (
        // Replace eventbox with box and gestures
        <box
            class='space-left-eventbox' // Add a class for potential styling
            $={self => {
                // Scroll for Brightness
                const scrollController = Gtk.EventControllerScroll.new(Gtk.EventControllerScrollFlags.VERTICAL);
                scrollController.connect('scroll', (controller, dx, dy) => {
                    // dy > 0 is scroll down, dy < 0 is scroll up
                    if (dy < 0) { // Scroll Up
                        Indicator.popup(1); // Show OSD for brightness/volume type
                        Brightness[monitorId].screen_value += 0.05;
                    } else if (dy > 0) { // Scroll Down
                        Indicator.popup(1);
                        Brightness[monitorId].screen_value -= 0.05;
                    }
                    return Gdk.EVENT_STOP; // Consume the event
                });
                self.add_controller(scrollController);

                // Click to toggle sideleft
                const clickController = Gtk.GestureClick.new();
                clickController.connect('released', () => app.toggleWindow('sideleft'));
                self.add_controller(clickController);
            }}
        >
            <box homogeneous={false}>
                <box class='bar-corner-spacing' />
                <overlay passThrough={true}> {/* Original had passThrough, might be needed if title has own interactions */}
                    <box $type="child" hexpand={true} />
                    <box $type="overlay" class='bar-sidemodule' hexpand={true}>
                        <box vertical={true} class='bar-space-button'>
                            {windowTitleWidget || <box />}
                        </box>
                    </box>
                </overlay>
            </box>
        </box>
    );
}
