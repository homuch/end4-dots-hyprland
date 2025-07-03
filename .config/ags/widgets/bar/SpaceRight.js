import { app } from 'ags/gtk4/app'; // Corrected
import { Gtk, Gdk } from 'ags/gtk4'; // Corrected
// Intrinsics: <box>, <revealer>
import { createBinding, createEffect, createState } from 'ags';
import { execAsync } from 'ags/process';

import Audio from 'ags/service/audio'; // Corrected import
import Indicator from '../../services/indicatorService.js';
import SystemTray from 'ags/service/systemtray';
import { options as userOptions } from '../../options.js';

// import { distance } from '../../utils/mathfuncs.js'; // Not used if motion dismiss removed

import Tray from './Tray.js';
import StatusIcons from '../../common/StatusIcons.js';
import { setupCursorHover } from '../../utils/cursorHover.js'; // For hover on interactions area

// const OSD_DISMISS_DISTANCE = userOptions.osd?.dismissDistance || 10;

const SeparatorDot = () => (
    <revealer
        transition={Gtk.RevealerTransitionType.SLIDE_LEFT}
        revealChild={SystemTray.items.transform(items => items.length > 0)}
    >
        <box vpack={Gtk.Align.CENTER} class='separator-circle' />
    </revealer>
);

// SpaceRightInteractions becomes a functional component applying controllers/signals
const InteractiveSection = ({ children, onHover, onHoverLost, onPrimaryClick, onSecondaryClick, onMiddleClick, onButton8Press }) => (
    // Replace eventbox with box + gestures/controllers
    <box
        hexpand={children ? false : true} // Expand if it's an empty spacer area
        $={self => {
            if (onHover || onHoverLost) {
                const hoverCtrl = Gtk.EventControllerMotion.new();
                if(onHover) hoverCtrl.connect('enter', onHover);
                if(onHoverLost) hoverCtrl.connect('leave', onHoverLost);
                self.add_controller(hoverCtrl);
            }
            if (onPrimaryClick || onSecondaryClick || onMiddleClick || onButton8Press) {
                const clickCtrl = Gtk.EventControllerGesture.new();
                clickCtrl.set_button(0); // Listen for all buttons
                clickCtrl.connect('pressed', (gesture, nPress, x, y) => {
                    const button = gesture.get_current_button();
                    if (button === Gdk.BUTTON_PRIMARY && onPrimaryClick) onPrimaryClick();
                    else if (button === Gdk.BUTTON_SECONDARY && onSecondaryClick) onSecondaryClick();
                    else if (button === Gdk.BUTTON_MIDDLE && onMiddleClick) onMiddleClick();
                    else if (button === 8 && onButton8Press) onButton8Press(); // Button 8 for side mouse
                });
                self.add_controller(clickCtrl);
            }
            setupCursorHover(self); // General pointer cursor for interactive areas
        }}
    >
        {children}
    </box>
);


// SpaceRight expects gdkmonitor prop (passed as monitor in original, now gdkmonitor)
export default function SpaceRight({ gdkmonitor }) {
    const monitorId = gdkmonitor.get_monitor_number();

    const barStatusIconsRef = { widget: null }; // To toggle class from InteractiveSection

    const actualContent = (
        <box hexpand={true} class='spacing-h-5 bar-spaceright'>
            <InteractiveSection onHover={() => barStatusIconsRef.widget?.toggleClassName('bar-statusicons-hover', true)}
                                 onHoverLost={() => barStatusIconsRef.widget?.toggleClassName('bar-statusicons-hover', false)}
                                 onPrimaryClick={() => app.toggleWindow('sideright')}
                                 onSecondaryClick={() => execAsync(['bash', '-c', 'playerctl next || playerctl position `bc <<< "100 * $(playerctl metadata mpris:length) / 1000000 / 100"` &']).catch(print)}
                                 onMiddleClick={() => execAsync('playerctl play-pause').catch(print)}
                                 onButton8Press={() => execAsync('playerctl previous').catch(print)}
            >
                {/* This box is the empty expanding area */}
                <box hexpand={true}/>
            </InteractiveSection>

            <Tray />

            <InteractiveSection onHover={() => barStatusIconsRef.widget?.toggleClassName('bar-statusicons-hover', true)}
                                 onHoverLost={() => barStatusIconsRef.widget?.toggleClassName('bar-statusicons-hover', false)}
                                 onPrimaryClick={() => app.toggleWindow('sideright')}
                                 onSecondaryClick={() => execAsync(['bash', '-c', 'playerctl next || playerctl position `bc <<< "100 * $(playerctl metadata mpris:length) / 1000000 / 100"` &']).catch(print)}
                                 onMiddleClick={() => execAsync('playerctl play-pause').catch(print)}
                                 onButton8Press={() => execAsync('playerctl previous').catch(print)}
            >
                <box class="spacing-h-5"> {/* Inner box for separator and status icons */}
                    <SeparatorDot />
                    <StatusIcons
                        class='bar-statusicons'
                        monitor={monitorId} // Pass monitorId if StatusIcons needs it
                        $={self => {
                            barStatusIconsRef.widget = self; // Store ref
                            app.connect('window-toggled', (appInstance, windowName, visible) => {
                                if (windowName === 'sideright') {
                                    self.toggleClassName('bar-statusicons-active', visible);
                                }
                            });
                        }}
                    />
                </box>
            </InteractiveSection>
        </box>
    );

    return (
        // Root box replacing EventBox, handles volume scroll
        <box
            class='spaceright-root-eventbox' // Add class for potential styling
            $={self => {
                const scrollController = Gtk.EventControllerScroll.new(Gtk.EventControllerScrollFlags.VERTICAL);
                scrollController.connect('scroll', (controller, dx, dy) => {
                    if (!Audio.speaker) return Gdk.EVENT_PROPAGATE;
                    const currentVolume = Audio.speaker.volume; // Assuming Audio.speaker.volume is reactive or get/set works
                    let newVolume;
                    if (dy < 0) { // Scroll Up - Increase Volume
                        newVolume = currentVolume <= 0.09 ? currentVolume + 0.01 : currentVolume + 0.03;
                    } else { // Scroll Down - Decrease Volume
                        newVolume = currentVolume <= 0.09 ? currentVolume - 0.01 : currentVolume - 0.03;
                    }
                    Audio.speaker.volume = Math.max(0, Math.min(1, newVolume)); // Clamp and set
                    Indicator.popup(1); // Show OSD (type 1 for volume/brightness)
                    return Gdk.EVENT_STOP;
                });
                self.add_controller(scrollController);
            }}
        >
            <box> {/* Original structure had another box here */}
                {actualContent}
                <InteractiveSection onPrimaryClick={() => app.toggleWindow('sideright')}> {/* Corner spacing, make it clickable */}
                    <box class='bar-corner-spacing' />
                </InteractiveSection>
            </box>
        </box>
    );
}
