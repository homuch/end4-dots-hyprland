import Gdk from 'gi://Gdk';

const MODS = {
    'shift': Gdk.ModifierType.SHIFT_MASK,
    'ctrl': Gdk.ModifierType.CONTROL_MASK,
    'alt': Gdk.ModifierType.ALT_MASK, // GDK3 used MOD1_MASK for Alt. GDK4 uses ALT_MASK.
    'hyper': Gdk.ModifierType.HYPER_MASK,
    'meta': Gdk.ModifierType.META_MASK, // GDK3 used SUPER_MASK for Meta/Super. GDK4 uses META_MASK.
    // It's important to verify these Gdk.ModifierType values against GDK4.
    // Gdk.ModifierType.MOD1_MASK was often Alt. Gdk.ModifierType.MOD4_MASK could be Super.
    // For GTK4/GDK4:
    // Gdk.ModifierType.ALT_MASK is usually Alt.
    // Gdk.ModifierType.SUPER_MASK is usually Super/Windows key.
    // Gdk.ModifierType.META_MASK might be something else or aliased.
    // The original code used ALT_MASK and META_MASK which are generally correct for GDK4.
};

// Add common alternatives if necessary, e.g. MOD1_MASK for Alt if some systems report that.
// However, Gdk.ModifierType.ALT_MASK should be the standard for GDK4.

const checkSingleKeybind = (event, keybindString) => {
    const pressedModMask = event.get_state(); // In GDK4, get_state() returns Gdk.ModifierType directly
    const pressedKey = event.get_keyval();   // In GDK4, get_keyval() returns the keyval directly

    const keys = keybindString.split('+');
    let expectedModMask = 0;
    let expectedKey = null;

    for (const key of keys) {
        const lowerKey = key.toLowerCase();
        if (lowerKey in MODS) {
            expectedModMask |= MODS[lowerKey];
        } else {
            // Check for Gdk.KEY_xyz, Gdk.KEY_Xyz, Gdk.KEY_xYz etc.
            // Gdk.keyval_from_name(`KEY_${key}`) might be more robust if direct Gdk[`KEY_${key}`] fails.
            // However, Gdk.KEY_A, Gdk.KEY_a etc. are standard.
            // The original code checked Gdk[`KEY_${keys[i]}`] and Gdk[`KEY_${keys[i].toLowerCase()}`]
            // This implies the key in the keybind string could be case-sensitive for GDK constants.
            // GDK key names are typically like "KEY_A", "KEY_Shift_L", "KEY_plus".
            // We should ensure the keybind string format matches GDK key names after "KEY_".
            // For simplicity, let's assume key from string is like "A", "B", "plus", "Shift_L".

            // Try to find the GDK key value for the non-modifier part
            // Gdk.keyval_from_name is more robust than Gdk[`KEY_${key}`]
            const keyvalFromName = Gdk.keyval_from_name(key);
            const keyvalFromNameUpper = Gdk.keyval_from_name(key.toUpperCase());
            const keyvalFromNameLower = Gdk.keyval_from_name(key.toLowerCase());

            if (Gdk[`KEY_${key}`] !== undefined) expectedKey = Gdk[`KEY_${key}`];
            else if (Gdk[`KEY_${key.toUpperCase()}`] !== undefined) expectedKey = Gdk[`KEY_${key.toUpperCase()}`];
            else if (Gdk[`KEY_${key.toLowerCase()}`] !== undefined) expectedKey = Gdk[`KEY_${key.toLowerCase()}`];
            else if (keyvalFromName !== 0 && keyvalFromName !== Gdk.KEY_VoidSymbol) expectedKey = keyvalFromName;
            else if (keyvalFromNameUpper !== 0 && keyvalFromNameUpper !== Gdk.KEY_VoidSymbol) expectedKey = keyvalFromNameUpper;
            else if (keyvalFromNameLower !== 0 && keyvalFromNameLower !== Gdk.KEY_VoidSymbol) expectedKey = keyvalFromNameLower;
            else {
                // console.warn(`Unknown key in keybind string: ${key}`);
                return false; // Unknown key
            }
        }
    }

    // Check if all expected modifiers are pressed AND no other modifiers are pressed
    // (Strict check: (pressedModMask & expectedModMask) === expectedModMask && (pressedModMask & (~expectedModMask)) === 0)
    // More lenient check (original): only checks if expected mods are present, allows others
    // The original code was: `if (!(pressedModMask & MODS[keys[i].toLowerCase()])) return false;`
    // This means it checks if the *required* modifiers are set. It doesn't care if *extra* modifiers are also set.
    // Let's stick to that: (pressedModMask & expectedModMask) === expectedModMask

    if ((pressedModMask & expectedModMask) !== expectedModMask) {
        return false;
    }

    // Check if the non-modifier key matches
    if (expectedKey !== null && pressedKey !== expectedKey) {
        return false;
    }

    // If we only had modifiers in the keybind string (e.g., "Ctrl+Shift")
    // and expectedKey is null, we need to ensure no actual key was pressed,
    // or that this function is only for key presses, not releases or pure modifier changes.
    // Assuming this is for actual key presses that might include modifiers.
    if (expectedKey === null && keys.some(k => !(k.toLowerCase() in MODS))) {
        // This case implies a malformed keybind string where a non-modifier key was expected but not parsed.
        return false;
    }


    return true;
};

/**
 * Checks if a GDK key event matches a given keybind string.
 * The keybind string can contain multiple keybinds separated by commas (e.g., "Ctrl+X, Alt+F4").
 * Each keybind is a "+" separated list of modifiers and a final key (e.g., "Ctrl+Shift+A").
 * Modifiers: Shift, Ctrl, Alt, Hyper, Meta.
 * Key names should correspond to GDK_KEY_* constants (e.g., "A", "B", "plus", "Shift_L", "Page_Down").
 * @param {Gdk.Event} event The GDK key event.
 * @param {string} keybindString The keybind string to check against.
 * @returns {boolean} True if the event matches any of the keybinds, false otherwise.
 */
export function checkKeybind(event, keybindString) {
    if (!event || !keybindString || typeof keybindString !== 'string') {
        return false;
    }
    const keybinds = keybindString.replace(/\s/g, '').split(',');
    for (const kb of keybinds) {
        if (kb.trim() === "") continue;
        if (checkSingleKeybind(event, kb)) {
            return true;
        }
    }
    return false;
}
