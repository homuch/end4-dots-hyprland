import Gtk from 'gi://Gtk?version=4.0'; // Ensure Gtk4
import Gdk from 'gi://Gdk'; // Corrected import location
import { options as userOptions } from '../options.js';

let iconTheme = null;
function getIconTheme() {
    if (!iconTheme) {
        iconTheme = Gtk.IconTheme.get_default();
        // For GTK4, we might need to adjust how the theme is fetched or if display is needed
        const display = Gdk.Display.get_default();
        if (display) {
            iconTheme = Gtk.IconTheme.get_for_display(display);
        }
    }
    // Additional check if Gtk.IconTheme.get_default() is deprecated or needs display in GTK4
    // For now, assuming get_default() or get_for_display() works.
    // If specific icon sets are defined in userOptions, apply them here if needed.
    // e.g., iconTheme.set_search_path([...]);
    return iconTheme;
}


export function iconExists(iconName) {
    if (!iconName || typeof iconName !== 'string') return false;
    const theme = getIconTheme();
    return theme.has_icon(iconName);
}

export function substitute(str) {
    if (typeof str !== 'string') return str;

    // Normal substitutions
    if (userOptions.icons?.substitutions?.[str]) {
        return userOptions.icons.substitutions[str];
    }

    // Regex substitutions
    if (userOptions.icons?.regexSubstitutions) {
        for (const substitution of userOptions.icons.regexSubstitutions) {
            try {
                // Regexes in JSON are strings, so we need to create RegExp objects.
                // Assume the string is just the pattern, no flags from JSON.
                const regex = new RegExp(substitution.regex);
                if (regex.test(str)) {
                    const replacedName = str.replace(regex, substitution.replace);
                    if (replacedName !== str) return replacedName;
                }
            } catch (e) {
                console.warn(`Invalid regex in icon substitutions: ${substitution.regex}`, e);
            }
        }
    }

    // Guess: convert to kebab case if original or substituted icon doesn't exist
    // This check should ideally happen after all substitutions are attempted.
    // The original code did it before returning the original string if no subs applied.
    // Let's try to see if the current 'str' (potentially after some substitutions) exists.
    // If not, then try kebab case.
    if (!iconExists(str)) {
        const kebabCaseStr = str.toLowerCase().replace(/\s+/g, "-");
        if (kebabCaseStr !== str && iconExists(kebabCaseStr)) {
            return kebabCaseStr;
        }
        // If kebab-case also doesn't exist or is same as str, stick with current str.
    }

    return str;
}

// Helper to get a themed icon
// Might be useful for other modules
export function getIcon(iconName, size = Gtk.IconSize.NORMAL) {
    const substitutedName = substitute(iconName);
    if (iconExists(substitutedName)) {
        // Gtk.Image.new_from_icon_name is still valid in GTK4
        // However, in JSX, you'd often set the icon_name property on an <icon> or <image>
        // This function could return the name, or a Gtk.Image if that's more useful.
        // For now, let's return the name, assuming it will be used in a widget property.
        return substitutedName;
    }
    // Fallback icon if nothing found
    return userOptions.icons?.substitutions?.[""] || "image-missing";
}

// Import Gdk for display removed from here
