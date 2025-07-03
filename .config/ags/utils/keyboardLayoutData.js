// We're going to use ydotool
// See /usr/include/linux/input-event-codes.h for keycodes

export const DEFAULT_OSK_LAYOUT = "qwerty_full"
export const oskLayouts = {
    qwerty_full: {
        name: "QWERTY - Full",
        name_short: "US",
        comment: "Like physical keyboard",
        keys: [
            [
                { keytype: "normal", label: "Esc", shape: "fn", keycode: 1 },
                { keytype: "normal", label: "F1", shape: "fn", keycode: 59 },
                { keytype: "normal", label: "F2", shape: "fn", keycode: 60 },
                { keytype: "normal", label: "F3", shape: "fn", keycode: 61 },
                { keytype: "normal", label: "F4", shape: "fn", keycode: 62 },
                { keytype: "normal", label: "F5", shape: "fn", keycode: 63 },
                { keytype: "normal", label: "F6", shape: "fn", keycode: 64 },
                { keytype: "normal", label: "F7", shape: "fn", keycode: 65 },
                { keytype: "normal", label: "F8", shape: "fn", keycode: 66 },
                { keytype: "normal", label: "F9", shape: "fn", keycode: 67 },
                { keytype: "normal", label: "F10", shape: "fn", keycode: 68 },
                { keytype: "normal", label: "F11", shape: "fn", keycode: 87 },
                { keytype: "normal", label: "F12", shape: "fn", keycode: 88 },
                { keytype: "normal", label: "PrtSc", shape: "fn", keycode: 99 },
                { keytype: "normal", label: "Del", shape: "fn", keycode: 111 }
            ],
            [
                { keytype: "normal", label: "`", labelShift: "~", shape: "normal", keycode: 41 },
                { keytype: "normal", label: "1", labelShift: "!", shape: "normal", keycode: 2 },
                { keytype: "normal", label: "2", labelShift: "@", shape: "normal", keycode: 3 },
                { keytype: "normal", label: "3", labelShift: "#", shape: "normal", keycode: 4 },
                { keytype: "normal", label: "4", labelShift: "$", shape: "normal", keycode: 5 },
                { keytype: "normal", label: "5", labelShift: "%", shape: "normal", keycode: 6 },
                { keytype: "normal", label: "6", labelShift: "^", shape: "normal", keycode: 7 },
                { keytype: "normal", label: "7", labelShift: "&", shape: "normal", keycode: 8 },
                { keytype: "normal", label: "8", labelShift: "*", shape: "normal", keycode: 9 },
                { keytype: "normal", label: "9", labelShift: "(", shape: "normal", keycode: 10 },
                { keytype: "normal", label: "0", labelShift: ")", shape: "normal", keycode: 11 },
                { keytype: "normal", label: "-", labelShift: "_", shape: "normal", keycode: 12 },
                { keytype: "normal", label: "=", labelShift: "+", shape: "normal", keycode: 13 },
                { keytype: "normal", label: "Backspace", shape: "expand", keycode: 14 }
            ],
            [
                { keytype: "normal", label: "Tab", shape: "tab", keycode: 15 },
                { keytype: "normal", label: "q", labelShift: "Q", shape: "normal", keycode: 16 },
                { keytype: "normal", label: "w", labelShift: "W", shape: "normal", keycode: 17 },
                { keytype: "normal", label: "e", labelShift: "E", shape: "normal", keycode: 18 },
                { keytype: "normal", label: "r", labelShift: "R", shape: "normal", keycode: 19 },
                { keytype: "normal", label: "t", labelShift: "T", shape: "normal", keycode: 20 },
                { keytype: "normal", label: "y", labelShift: "Y", shape: "normal", keycode: 21 },
                { keytype: "normal", label: "u", labelShift: "U", shape: "normal", keycode: 22 },
                { keytype: "normal", label: "i", labelShift: "I", shape: "normal", keycode: 23 },
                { keytype: "normal", label: "o", labelShift: "O", shape: "normal", keycode: 24 },
                { keytype: "normal", label: "p", labelShift: "P", shape: "normal", keycode: 25 },
                { keytype: "normal", label: "[", labelShift: "{", shape: "normal", keycode: 26 },
                { keytype: "normal", label: "]", labelShift: "}", shape: "normal", keycode: 27 },
                { keytype: "normal", label: "\\", labelShift: "|", shape: "expand", keycode: 43 }
            ],
            [
                { keytype: "spacer", label: "", shape: "empty", ratio: 1.5 }, // Adjusted for typical CapsLock width
                { keytype: "normal", label: "a", labelShift: "A", shape: "normal", keycode: 30 },
                { keytype: "normal", label: "s", labelShift: "S", shape: "normal", keycode: 31 },
                { keytype: "normal", label: "d", labelShift: "D", shape: "normal", keycode: 32 },
                { keytype: "normal", label: "f", labelShift: "F", shape: "normal", keycode: 33 },
                { keytype: "normal", label: "g", labelShift: "G", shape: "normal", keycode: 34 },
                { keytype: "normal", label: "h", labelShift: "H", shape: "normal", keycode: 35 },
                { keytype: "normal", label: "j", labelShift: "J", shape: "normal", keycode: 36 },
                { keytype: "normal", label: "k", labelShift: "K", shape: "normal", keycode: 37 },
                { keytype: "normal", label: "l", labelShift: "L", shape: "normal", keycode: 38 },
                { keytype: "normal", label: ";", labelShift: ":", shape: "normal", keycode: 39 },
                { keytype: "normal", label: "'", labelShift: "\"", shape: "normal", keycode: 40 }, // Corrected quote
                { keytype: "normal", label: "Enter", shape: "expand", keycode: 28 }
            ],
            [
                { keytype: "modkey", label: "Shift", labelShift: "Shift ⇧", labelCaps: "Caps⇩", shape: "shift", keycode: 42 }, // Changed labelCaps
                { keytype: "normal", label: "z", labelShift: "Z", shape: "normal", keycode: 44 },
                { keytype: "normal", label: "x", labelShift: "X", shape: "normal", keycode: 45 },
                { keytype: "normal", label: "c", labelShift: "C", shape: "normal", keycode: 46 },
                { keytype: "normal", label: "v", labelShift: "V", shape: "normal", keycode: 47 },
                { keytype: "normal", label: "b", labelShift: "B", shape: "normal", keycode: 48 },
                { keytype: "normal", label: "n", labelShift: "N", shape: "normal", keycode: 49 },
                { keytype: "normal", label: "m", labelShift: "M", shape: "normal", keycode: 50 },
                { keytype: "normal", label: ",", labelShift: "<", shape: "normal", keycode: 51 },
                { keytype: "normal", label: ".", labelShift: ">", shape: "normal", keycode: 52 },
                { keytype: "normal", label: "/", labelShift: "?", shape: "normal", keycode: 53 },
                { keytype: "modkey", label: "Shift", labelShift: "Shift ⇧", labelCaps: "Caps⇩", shape: "expand", keycode: 54 }
            ],
            [
                { keytype: "modkey", label: "Ctrl", shape: "control", keycode: 29 },
                { keytype: "modkey", label: "Alt", shape: "normal", keycode: 56 }, // Meta/Super can be here if desired: { keytype: "modkey", label: "Super", shape: "normal", keycode: 125 },
                { keytype: "normal", label: "Space", shape: "space", keycode: 57 },
                { keytype: "modkey", label: "AltGr", shape: "normal", keycode: 100 }, // AltGr
                { keytype: "normal", label: "Menu", shape: "normal", keycode: 139 }, // Context Menu key
                { keytype: "modkey", label: "Ctrl", shape: "control", keycode: 97 }
            ]
        ]
    },
    qwertz_full: { // ... (qwertz layout can be added similarly if needed) ...
        name: "QWERTZ - Full",
        name_short: "DE",
        comment: "Keyboard layout commonly used in German-speaking countries",
        keys: [/* ... qwertz keys ... */]
    }
};

// Adding a 'spacer' keytype for empty cells, and 'ratio' for hexpand on specific keys.
// Example: { keytype: "spacer", shape: "empty", ratio: 1.5 } // ratio is arbitrary for flex
// Key shapes: 'normal', 'fn' (half height), 'tab', 'caps' (larger than normal), 'shift' (larger),
//             'control' (larger), 'space' (very wide), 'expand' (fills remaining row space), 'empty' (spacer)
// The 'shape' will primarily map to CSS classes for styling (width, height, flex).
// 'hexpand' on button will be set if shape is 'space' or 'expand'.
// Modkey 'labelCaps' is for when Shift is locked (Caps Lock mode).
// AltGr (keycode 100) needs 'labelAlt' on other keys for third-level characters.
// The original had some empty spacers, added a 'spacer' keytype.
// The original didn't have a CapsLock key, it was simulated by double-tapping Shift.
// This can be maintained or a dedicated CapsLock key added.
// For simplicity, keeping the double-tap Shift logic for Caps.
// The original 'fn' shape wasn't well-defined beyond being half-height, might just be 'normal' with CSS.
// For now, 'fn' shape implies a smaller button.
// Backspace, Enter, Tab, Shift (right) were 'expand' in original, meaning they take more horizontal space.
// Space was 'space'. Ctrl, Alt were 'normal' or 'control'.
// This data structure is now more detailed for rendering.
// The 'shape' string will be used for CSS class: osk-key-<shape>
// labelAlt is added for AltGr characters.
oskLayouts.qwerty_full.keys[3][0] = { keytype: "spacer", label: "", shape: "caps", ratio: 1.75 }; // Placeholder for CapsLock space
oskLayouts.qwerty_full.keys[3][1] = { keytype: "spacer", label: "", shape: "empty", ratio: 0.25 }; // Small spacer after caps
// The original layout had empty spacers, this tries to represent them for flexbox based layout.
// A 'ratio' property can be used by the layout engine if using flexbox for row children.
// If not using flexbox ratios, these spacers might just be empty boxes with fixed/min widths.
// The original had 14 items in first value row, 14 in second, 14 in third (incl expand),
// 13 in fourth (incl expand), 12 in fifth (incl expand), 6 in sixth.
// This structure is kept.
// The key 'labelShift: "Shift ⇧", labelCaps: "Locked ⇩"' for shift implies dynamic label change.
// My current key data has 'labelCaps' for shift keys.
// The 'labelAlt' is for characters produced with AltGr.
// The 'keyboardJson['name_short']' was used for a button label.
// The 'ydotool key code:1' (press) and 'code:0' (release) is the core mechanism.
// Shift mode logic: Off -> Normal (Shift down) -> Locked (Shift still down, pressed again) -> Off (Shift released or pressed again)
// Normal keys auto-release shift from Normal to Off.
// This logic needs to be carefully replicated.
