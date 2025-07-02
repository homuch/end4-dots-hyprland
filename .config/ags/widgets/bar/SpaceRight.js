import App from 'ags/app';
import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import { box, revealer, eventbox } from 'ags/widgets';
import { createBinding, createEffect, createState } from 'ags';
import { execAsync } from 'ags/process';

import Audio from '../../services/audioService.js'; // Placeholder
import Indicator from '../../services/indicatorService.js'; // Placeholder
// TODO: import SystemTray from 'gi://SystemTray'; // Or actual v2 service name
// For now, using a fake SystemTray service
const FakeSystemTray = {
    _items: createState([]), // Array of fake tray item objects
    get items() { return this._items[0]; }, // Accessor
    addItem: (item) => FakeSystemTray._items[1](current => [...current, item]),
    removeItem: (id) => FakeSystemTray._items[1](current => current.filter(it => it.id !== id)),
    connect: (signal, callback) => { /* console.log(`FakeSystemTray: connect to ${signal}`); */ }
};
const SystemTray = FakeSystemTray;
// globalThis.fst = FakeSystemTray; fst.addItem({id: 'test1', icon: 'firefox'});

import { distance } from '../../utils/mathfuncs.js';

// Placeholders for sub-components that need migration
const PlaceholderWidget = (name, props = {}) => box({ ...props, children: [Gtk.Label.new(`PH: ${name}`)]}); // Direct Gtk.Label
import Tray from './Tray.js'; // Import actual Tray component
import StatusIcons from '../../common/StatusIcons.js'; // Import actual component


const OSD_DISMISS_DISTANCE = 10; // As in original

const SeparatorDot = () => revealer({
    transition: Gtk.RevealerTransitionType.SLIDE_LEFT,
    // revealChild: false, // Initial state, will be bound
    child: box({
        vpack: 'center',
        className: 'separator-circle', // Ensure this class exists in SCSS
    }),
    // Bind revealChild to the number of tray items
    revealChild: SystemTray.items.transform(items => items.length > 0),
});

export default function SpaceRight({ monitor = 0 } = {}) {
    const barTray = Tray(); // Placeholder Tray widget
    const barStatusIcons = StatusIcons({ // Placeholder StatusIcons widget
        className: 'bar-statusicons', // Base class
        // Setup for sideright active class
        $: (self) => {
            App.connect('window-toggled', (app, windowName, visible) => {
                if (windowName === 'sideright') { // Assuming 'sideright' is the name
                    self.toggleClassName('bar-statusicons-active', visible);
                }
            });
        }
    }, monitor);

    const SpaceRightInteractions = ({ children }) => eventbox({
        onHover: () => barStatusIcons.toggleClassName('bar-statusicons-hover', true),
        onHoverLost: () => barStatusIcons.toggleClassName('bar-statusicons-hover', false),
        onPrimaryClick: () => App.toggleWindow('sideright'),
        onSecondaryClick: () => execAsync(['bash', '-c', 'playerctl next || playerctl position `bc <<< "100 * $(playerctl metadata mpris:length) / 1000000 / 100"` &']).catch(print),
        onMiddleClick: () => execAsync('playerctl play-pause').catch(print),
        setup: (self) => { // For side mouse buttons (button 8)
            const controller = Gtk.EventControllerGesture.new();
            controller.set_button(0); // Listen for all buttons
            controller.connect('pressed', (gesture, nPress, x, y) => {
                if (gesture.get_current_button() === 8) { // 8 is often a side button (back)
                    execAsync('playerctl previous').catch(print);
                }
            });
            self.add_controller(controller);

            // OSD dismiss on motion - this was on SpaceRightInteractions in v1
            // This is problematic as explained in SpaceLeft.js.
            // Indicator.popup(-1) should ideally be managed by a timeout within IndicatorService.
            // self.connect('motion-notify-event', (widget, event) => {
            // Indicator.popup(-1);
            // });
        },
        child: children,
    });

    const emptyArea = SpaceRightInteractions({ children: [box({ hexpand: true })] });
    const indicatorArea = SpaceRightInteractions({
        children: [
            box({ // Inner box for spacing or structure
                children: [
                    SeparatorDot(),
                    barStatusIcons
                ]
            })
        ]
    });

    const actualContent = box({
        hexpand: true,
        className: 'spacing-h-5 bar-spaceright', // Ensure SCSS has styles
        children: [
            emptyArea,
            barTray,
            indicatorArea
        ],
    });

    let scrollCursorX = 0; // These are not reliably set for OSD dismiss logic
    let scrollCursorY = 0;

    return eventbox({
        onScrollUp: (self, event) => {
            if (!Audio.speaker) return Gdk.EVENT_PROPAGATE;
            // const [success, x, y] = event.get_position(); // Gdk.ScrollEvent method
            // if(success) { scrollCursorX = x; scrollCursorY = y; }

            const currentVolume = Audio.speaker.volume;
            if (currentVolume <= 0.09) Audio.speaker.volume += 0.01;
            else Audio.speaker.volume += 0.03;
            Indicator.popup(1); // Show OSD
            return Gdk.EVENT_STOP;
        },
        onScrollDown: (self, event) => {
            if (!Audio.speaker) return Gdk.EVENT_PROPAGATE;
            // const [success, x, y] = event.get_position();
            // if(success) { scrollCursorX = x; scrollCursorY = y; }

            const currentVolume = Audio.speaker.volume;
            if (currentVolume <= 0.09) Audio.speaker.volume -= 0.01; // Ensure it doesn't go far below 0 if step is large
            else Audio.speaker.volume -= 0.03;
            Indicator.popup(1); // Show OSD
            return Gdk.EVENT_STOP;
        },
        setup: (self) => {
            // OSD dismiss on motion - same issue as in SpaceLeft.js and SpaceRightInteractions
            // self.connect('motion-notify-event', (widget, event) => {
            //     const [x, y] = event.get_coords_for_surface(self.get_surface()); // Example for Gdk.Event from motion
            //     if (distance(x, y, scrollCursorX, scrollCursorY) >= OSD_DISMISS_DISTANCE)
            //         Indicator.popup(-1);
            // });
        },
        child: box({
            children: [
                actualContent,
                SpaceRightInteractions({ children: [box({ className: 'bar-corner-spacing' })] }), // For styling
            ]
        })
    });
}
