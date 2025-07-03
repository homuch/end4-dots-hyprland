const { Gtk } = imports.gi;
import app from 'ags/gtk4/app'; // Corrected App import
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

// const { Box, EventBox, Button, Revealer } = Widget; // To be removed
const { execAsync, exec } = Utils; // exec was used in startYdotoolIfNeeded
import { MaterialIcon } from '../.commonwidgets/materialicon.js';
import { DEFAULT_OSK_LAYOUT, oskLayouts } from './data_keyboardlayouts.js';
import { setupCursorHoverGrab } from '../.widgetutils/cursorhover.js';

const keyboardLayout = oskLayouts[userOptions.onScreenKeyboard.layout] ? userOptions.onScreenKeyboard.layout : DEFAULT_OSK_LAYOUT;
const keyboardJson = oskLayouts[keyboardLayout];

async function startYdotoolIfNeeded() {
    const running = exec('pidof ydotool')
    if (!running) execAsync(['ydotoold']).catch(print);
}

function releaseAllKeys() {
    const keycodes = Array.from(Array(249).keys());
    execAsync([`ydotool`, `key`, ...keycodes.map(keycode => `${keycode}:0`)])
        .then(console.log('[OSK] Released all keys'))
        .catch(print);
}
class ShiftMode {
    static Off = new ShiftMode('Off');
    static Normal = new ShiftMode('Normal');
    static Locked = new ShiftMode('Locked');

    constructor(name) {
        this.name = name;
    }
    toString() {
        return `ShiftMode.${this.name}`;
    }
}
var modsPressed = false;

const TopDecor = () => box({
    vertical: true,
    children: [
        box({
            hpack: 'center',
            className: 'osk-dragline',
            homogeneous: true,
            children: [eventBox({
                setup: setupCursorHoverGrab,
            })]
        })
    ]
});

const KeyboardControlButton = (icon, text, runFunction) => button({
    className: 'osk-control-button spacing-h-10',
    onClicked: () => runFunction(),
    child: box({
        children: [
            MaterialIcon(icon, 'norm'),
            label({
                label: `${text}`,
            }),
        ]
    })
})

const KeyboardControls = () => box({
    vertical: true,
    className: 'spacing-v-5',
    children: [
        button({
            className: 'osk-control-button txt-norm icon-material',
            onClicked: () => {
                releaseAllKeys();
                toggleWindowOnAllMonitors('osk'); // This global function uses App, ensure it's updated or app passed
            },
            label: 'keyboard_hide',
        }),
        button({
            className: 'osk-control-button txt-norm',
            label: `${keyboardJson['name_short']}`,
        }),
        button({
            className: 'osk-control-button txt-norm icon-material',
            onClicked: () => { // TODO: Proper clipboard widget, since fuzzel doesn't receive mouse inputs
                execAsync([`bash`, `-c`, "pkill fuzzel || cliphist list | fuzzel  --match-mode fzf --dmenu | cliphist decode | wl-copy"]).catch(print);
            },
            label: 'assignment',
        }),
    ]
})

var shiftMode = ShiftMode.Off;
var shiftButton;
var rightShiftButton;
var allButtons = [];
const KeyboardItself = (kbJson) => {
    return box({
        vertical: true,
        className: 'spacing-v-5',
        children: kbJson.keys.map(row => box({
            vertical: false,
            className: 'spacing-h-5',
            children: row.map(key => {
                return button({
                    className: `osk-key osk-key-${key.shape}`,
                    hexpand: ["space", "expand"].includes(key.shape),
                    label: key.label,
                    attribute:
                        { key: key },
                    setup: (button) => {
                        let pressed = false;
                        allButtons = allButtons.concat(button);
                        if (key.keytype == "normal") {
                            button.connect('pressed', () => { // mouse down
                                execAsync(`ydotool key ${key.keycode}:1`).catch(print);
                            });
                            button.connect('clicked', () => { // release
                                execAsync(`ydotool key ${key.keycode}:0`).catch(print);

                                if (shiftMode == ShiftMode.Normal) {
                                    shiftMode = ShiftMode.Off;
                                    if (typeof shiftButton !== 'undefined') {
                                        execAsync(`ydotool key 42:0`).catch(print);
                                        shiftButton.toggleClassName('osk-key-active', false);
                                    }
                                    if (typeof rightShiftButton !== 'undefined') {
                                        execAsync(`ydotool key 54:0`).catch(print);
                                        rightShiftButton.toggleClassName('osk-key-active', false);
                                    }
                                    allButtons.forEach(button => {
                                        if (typeof button.attribute.key.labelShift !== 'undefined') button.label = button.attribute.key.label;
                                    })
                                }
                            });
                        }
                        else if (key.keytype == "modkey") {
                            button.connect('pressed', () => { // release
                                if (pressed) {
                                    execAsync(`ydotool key ${key.keycode}:0`).catch(print);
                                    button.toggleClassName('osk-key-active', false);
                                    pressed = false;
                                    if (key.keycode == 100) { // Alt Gr button
                                        allButtons.forEach(button => { if (typeof button.attribute.key.labelAlt !== 'undefined') button.label = button.attribute.key.label; });
                                    }
                                }
                                else {
                                    execAsync(`ydotool key ${key.keycode}:1`).catch(print);
                                    button.toggleClassName('osk-key-active', true);
                                    if (!(key.keycode == 42 || key.keycode == 54)) pressed = true;
                                    else switch (shiftMode.name) { // This toggles the shift button state
                                        case "Off": {
                                            shiftMode = ShiftMode.Normal;
                                            allButtons.forEach(button => { if (typeof button.attribute.key.labelShift !== 'undefined') button.label = button.attribute.key.labelShift; })
                                            if (typeof shiftButton !== 'undefined') {
                                                shiftButton.toggleClassName('osk-key-active', true);
                                            }
                                            if (typeof rightShiftButton !== 'undefined') {
                                                rightShiftButton.toggleClassName('osk-key-active', true);
                                            }
                                        } break;
                                        case "Normal": {
                                            shiftMode = ShiftMode.Locked;
                                            if (typeof shiftButton !== 'undefined') shiftButton.label = key.labelCaps;
                                            if (typeof rightShiftButton !== 'undefined') rightShiftButton.label = key.labelCaps;
                                        } break;
                                        case "Locked": {
                                            shiftMode = ShiftMode.Off;
                                            if (typeof shiftButton !== 'undefined') {
                                                shiftButton.label = key.label;
                                                shiftButton.toggleClassName('osk-key-active', false);
                                            }
                                            if (typeof rightShiftButton !== 'undefined') {
                                                rightShiftButton.label = key.label;
                                                rightShiftButton.toggleClassName('osk-key-active', false);
                                            }
                                            execAsync(`ydotool key ${key.keycode}:0`).catch(print);

                                            allButtons.forEach(button => { if (typeof button.attribute.key.labelShift !== 'undefined') button.label = button.attribute.key.label; }
                                            )
                                        };
                                    }
                                    if (key.keycode == 100) { // Alt Gr button
                                        allButtons.forEach(button => { if (typeof button.attribute.key.labelAlt !== 'undefined') button.label = button.attribute.key.labelAlt; });
                                    }
                                    modsPressed = true;
                                }
                            });
                            if (key.keycode == 42) shiftButton = button;
                            else if (key.keycode == 54) rightShiftButton = button;
                        }
                    }
                })
            })
        }))
    })
}

const KeyboardWindow = () => box({
    vexpand: true,
    hexpand: true,
    vertical: true,
    className: 'osk-window spacing-v-5',
    children: [
        TopDecor(),
        box({
            className: 'osk-body spacing-h-10',
            children: [
                KeyboardControls(),
                box({ className: 'separator-line' }), // Corrected: Widget.Box to box
                KeyboardItself(keyboardJson),
            ],
        })
    ],
    setup: (self) => self.hook(app, (self, name, visible) => { // Update on open, Corrected to app
        if (!name) return;
        if (name.startsWith('osk') && visible) {
            self.setCss(`margin-bottom: -0px;`);
        }
    }),
});

export default ({ id }) => {
    const kbWindow = KeyboardWindow();
    const gestureEvBox = eventBox({ child: kbWindow }) // Corrected to eventBox
    const gesture = Gtk.GestureDrag.new(gestureEvBox);
    gesture.connect('drag-begin', async () => {
        try {
            const Hyprland = await import('gi://AstalHyprland'); // Corrected Hyprland import
            Hyprland.messageAsync('j/cursorpos').then((out) => {
                gesture.startY = JSON.parse(out).y;
            }).catch(print);
        } catch {
            return;
        }
    });
    gesture.connect('drag-update', async () => {
        try {
            const Hyprland = await import('gi://AstalHyprland'); // Corrected Hyprland import
            Hyprland.messageAsync('j/cursorpos').then((out) => {
                const currentY = JSON.parse(out).y;
                const offset = gesture.startY - currentY;

                if (offset > 0) return;

                kbWindow.setCss(`
                margin-bottom: ${offset}px;
            `);
            }).catch(print);
        } catch {
            return;
        }
    });
    gesture.connect('drag-end', () => {
        var offset = gesture.get_offset()[2];
        if (offset > 50) {
            app.closeWindow(`osk${id}`); // Corrected to app
        }
        else {
            kbWindow.setCss(`
            transition: margin-bottom 170ms cubic-bezier(0.05, 0.7, 0.1, 1);
            margin-bottom: 0px;
        `);
        }
    })
    return gestureEvBox;
};
