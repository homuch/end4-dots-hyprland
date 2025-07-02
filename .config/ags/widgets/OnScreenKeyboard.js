import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import App from 'ags/app';
import { box, button, label, eventbox, revealer } from 'ags/widgets';
import { createState, createEffect, Utils } from 'ags';
import { execAsync, exec } from 'ags/process';

import MaterialIcon from '../common/MaterialIcon.js';
import { PopupWindow } from './PopupWindow.js'; // Assuming PopupWindow is in ./widgets/
import { DEFAULT_OSK_LAYOUT, oskLayouts } from '../../utils/keyboardLayoutData.js';
import { setupCursorHover, setupCursorHoverGrab } from '../../utils/cursorHover.js';
import { options as userOptions } from '../../options.js';
// TODO: Import actual Hyprland service if needed for ydotool cursor pos
// import Hyprland from '../../services/hyprlandService.js';

// Shift Mode Enum (can be a simple object too)
const ShiftMode = {
    OFF: 'Off',
    NORMAL: 'Normal', // Shift is active for one key press
    LOCKED: 'Locked', // Caps Lock is active
};

// Ensure ydotool daemon is running (call once at app startup or OSK init)
async function startYdotoolIfNeeded() {
    try {
        const pid = exec('pidof ydotool'); // Check if daemon ydotool (ydotoold) is running
                                           // Original checked for ydotool, but usually it's ydotoold for daemon
        // This check might be insufficient if 'ydotool' cmd exists but daemon 'ydotoold' isn't running.
        // A more robust check would be `systemctl is-active ydotoold.service` or similar.
        // For now, assuming this check is for the command line tool itself.
    } catch (e) { // If pidof fails (no process found)
        console.log("ydotool daemon (ydotoold) not running, attempting to start...");
        try {
            await execAsync(['ydotoold']); // Start the daemon
            console.log("ydotoold started.");
        } catch (daemonError) {
            console.error("Failed to start ydotoold:", daemonError);
            App.notify({ // Use AGS App.notify
                summary: "OSK Error",
                body: "ydotoold daemon failed to start. On-screen keyboard may not function.",
                urgency: "critical",
            });
        }
    }
}
startYdotoolIfNeeded(); // Call on module load

function releaseAllKeys() {
    const keycodes = Array.from(Array(249).keys()); // 0-248 keycodes
    execAsync(['ydotool', 'key', ...keycodes.map(kc => `${kc}:0`)])
        .then(() => console.log('[OSK] Released all keys (simulated)'))
        .catch(print);
}

// --- OSK Sub-Components ---

const TopDecor = () => box({ // Used for dragging the OSK window (if not anchored)
    vertical: true,
    children: [
        box({
            hpack: 'center',
            className: 'osk-dragline', // Ensure SCSS
            child: eventbox({ setup: setupCursorHoverGrab }), // Empty box for grab cursor
            // This was eventbox inside homogeneous box. Simplified.
            // css: 'min-height: 10px; min-width: 50px; background-color: rgba(255,255,255,0.1); border-radius: 5px;', // Example style
        })
    ]
});

const KeyboardControlsDisplay = ({ oskWindowName }) => { // Renamed from KeyboardControls
    const currentLayoutName = oskLayouts[userOptions.onScreenKeyboard?.layout || DEFAULT_OSK_LAYOUT]?.name_short || "US";
    return box({
        vertical: true,
        className: 'osk-controls spacing-v-5', // Ensure SCSS
        children: [
            button({
                className: 'osk-control-button txt-norm icon-material', // Ensure SCSS
                onClicked: () => {
                    releaseAllKeys();
                    App.closeWindow(oskWindowName); // Close this specific OSK instance
                },
                child: MaterialIcon({ icon: 'keyboard_hide', size: 'norm' }),
                tooltipText: "Hide Keyboard",
            }),
            button({ // Display current layout, non-interactive for now
                className: 'osk-control-button txt-norm',
                label: currentLayoutName,
                tooltipText: "Keyboard Layout (static)",
            }),
            button({
                className: 'osk-control-button txt-norm icon-material',
                onClicked: () => {
                    execAsync([`bash`, `-c`, "pkill fuzzel || cliphist list | fuzzel --match-mode fzf --dmenu | cliphist decode | wl-copy`]).catch(print);
                },
                child: MaterialIcon({ icon: 'assignment', size: 'norm' }),
                tooltipText: "Clipboard History (Fuzzel)",
            }),
        ]
    });
};


// --- Main OSK Content ---
const KeyboardWindowContent = ({ oskWindowName, monitorId }) => {
    const [shiftMode, setShiftMode] = createState(ShiftMode.OFF);
    const [altGrMode, setAltGrMode] = createState(false); // For AltGr state

    // Store references to shift buttons if needed for dynamic label changes (not ideal)
    // It's better if KeyButton itself reacts to shiftMode.
    // let leftShiftButtonRef = { widget: null };
    // let rightShiftButtonRef = { widget: null };

    const selectedLayoutName = userOptions.onScreenKeyboard?.layout || DEFAULT_OSK_LAYOUT;
    const keyboardJson = oskLayouts[selectedLayoutName] || oskLayouts[DEFAULT_OSK_LAYOUT];

    const KeyButton = ({ keyDef }) => {
        const [isPressed, setIsPressed] = createState(false); // For modkey visual state

        const getLabel = () => {
            if (altGrMode.value && keyDef.labelAlt) return keyDef.labelAlt;
            if (shiftMode.value === ShiftMode.NORMAL && keyDef.labelShift) return keyDef.labelShift;
            if (shiftMode.value === ShiftMode.LOCKED && keyDef.labelCaps) return keyDef.labelCaps;
            if (shiftMode.value === ShiftMode.LOCKED && keyDef.labelShift) return keyDef.labelShift; // Fallback for caps if no specific labelCaps
            return keyDef.label;
        };

        const handleClick = () => {
            if (keyDef.keytype === "spacer" || keyDef.shape === "empty") return;

            if (keyDef.keytype === "normal") {
                execAsync(`ydotool key ${keyDef.keycode}:1 ${keyDef.keycode}:0`).catch(print); // Press and release
                if (shiftMode.value === ShiftMode.NORMAL) {
                    setShiftMode(ShiftMode.OFF);
                    // If left/right shift were held by ydotool, release them
                    // This needs to track which shift key was used to enter Normal mode.
                    // execAsync(`ydotool key 42:0 54:0`).catch(print); // Release both L/R Shift
                }
                if (altGrMode.value) { // Auto-release AltGr after normal key, if desired
                    // execAsync(`ydotool key 100:0`).catch(print); // Release AltGr
                    // setAltGrMode(false);
                }
            } else if (keyDef.keytype === "modkey") {
                if (keyDef.keycode === 42 || keyDef.keycode === 54) { // Shift keys
                    if (shiftMode.value === ShiftMode.OFF) {
                        setShiftMode(ShiftMode.NORMAL);
                        // execAsync(`ydotool key ${keyDef.keycode}:1`).catch(print); // Hold this shift
                    } else if (shiftMode.value === ShiftMode.NORMAL) {
                        setShiftMode(ShiftMode.LOCKED);
                        // Key remains held from Normal state, or re-press if it auto-released
                    } else { // Locked
                        setShiftMode(ShiftMode.OFF);
                        // execAsync(`ydotool key 42:0 54:0`).catch(print); // Release both shifts
                    }
                } else if (keyDef.keycode === 100) { // AltGr
                    setAltGrMode(m => !m);
                    // execAsync(`ydotool key ${keyDef.keycode}:${altGrMode.value ? 1:0}`).catch(print);
                } else { // Other modkeys (Ctrl, Alt) - toggle state
                    setIsPressed(p => !p);
                    // execAsync(`ydotool key ${keyDef.keycode}:${!isPressed.value ? 1:0}`).catch(print);
                }
            }
            // Actual ydotool commands for holding mods are tricky with multiple modkeys.
            // The simple press/release for normal keys is fine.
            // For modkeys, ydotool needs to reflect the actual keyboard state.
            // This OSK is more of a "direct input" than a true modifier state manager.
            // The original code also just sent key down/up for mods per click.
            // For held mods, it's complex. The current logic is simplified.
            // The original logic for shift: press shift once for next char shifted, twice for caps lock.
            // This is partially replicated.
        };

        // For ydotool, we send key down and key up immediately for normal keys.
        // For mod keys, it's more like a toggle. The original code had separate pressed/clicked.
        // Let's use onClicked for all, and handle type inside.
        // 'pressed' and 'clicked' signals on GtkButton are for mouse button state, not keyboard state.

        return button({
            className: createBinding([shiftMode, altGrMode, isPressed], (sm, agm, ip) =>
                `osk-key osk-key-${keyDef.shape} ` +
                `${(keyDef.keycode === 42 || keyDef.keycode === 54) && (sm === ShiftMode.NORMAL || sm === ShiftMode.LOCKED) ? 'osk-key-active' : ''} ` +
                `${keyDef.keycode === 100 && agm ? 'osk-key-active' : ''} ` +
                `${(keyDef.keytype === 'modkey' && !(keyDef.keycode === 42 || keyDef.keycode === 54 || keyDef.keycode === 100) && ip) ? 'osk-key-active' : ''}`
            ).transform(classes => classes.replace(/\s+/g, ' ').trim()),
            hexpand: ["space", "expand"].includes(keyDef.shape) || keyDef.ratio > 1, // Basic hexpand logic
            // css: keyDef.ratio > 1 ? `flex-grow: ${keyDef.ratio};` : '', // If using flexbox for rows
            label: createBinding([shiftMode, altGrMode], () => getLabel()),
            onClicked: handleClick,
        });
    };

    const keyboardLayout = box({
        vertical: true,
        className: 'osk-layout spacing-v-5', // Ensure SCSS
        children: keyboardJson.keys.map(row => box({
            vertical: false,
            className: 'osk-key-row spacing-h-5', // Ensure SCSS
            children: row.map(keyDef => KeyButton({ keyDef })),
        })),
    });

    // Drag to hide logic (simplified from original)
    const mainOskBox = box({
        vexpand: true, hexpand: true,
        vertical: true,
        className: 'osk-window-content spacing-v-5', // Ensure SCSS
        children: [
            TopDecor(),
            box({
                className: 'osk-body spacing-h-10', // Ensure SCSS
                children: [
                    KeyboardControlsDisplay({ oskWindowName: `osk${monitorId}` }),
                    box({ className: 'separator-line' }), // Ensure SCSS
                    keyboardLayout,
                ],
            })
        ],
        setup: (self) => { // Setup for drag-to-hide
            const gesture = Gtk.GestureDrag.new();
            let startY = 0;
            gesture.connect('drag-begin', (g, x, y) => {
                startY = y; // Gtk.GestureDrag provides sequence-local coordinates
            });
            gesture.connect('drag-update', (g, x, y) => { // x, y are offsets
                if (y > 0) { // Dragging down
                    self.set_css(`margin-bottom: ${-y}px; margin-top: ${y}px;`); // Visual feedback
                }
            });
            gesture.connect('drag-end', (g, x, y) => { // x, y are offsets
                if (y > 50) { // Dragged down significantly
                    App.closeWindow(`osk${monitorId}`);
                } else { // Snap back
                    self.set_css(`transition: margin 170ms cubic-bezier(0.05, 0.7, 0.1, 1); margin-bottom: 0px; margin-top: 0px;`);
                }
            });
            self.add_controller(gesture);
        }
    });
    return mainOskBox;
};


// Main OSK Window Component (replaces default export of main.js)
export default function OSKWindow({ monitor: id = 0 } = {}) { // Renamed monitor to id for consistency
    return PopupWindow({
        monitor: id,
        anchor: ['bottom'],
        name: `osk${id}`,
        showClassName: 'osk-show', // For CSS animations if any
        hideClassName: 'osk-hide', // For CSS animations if any
        child: KeyboardWindowContent({ oskWindowName: `osk${id}`, monitorId: id }),
    });
}
