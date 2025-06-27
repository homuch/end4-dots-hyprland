import Gtk from 'gi://Gtk';
// userOptions would ideally be imported or passed if this module needs it directly.
// For now, we'll modify 'substitute' to accept it as a parameter.

export function iconExists(iconName) {
    let iconTheme = Gtk.IconTheme.get_default();
    return iconTheme.has_icon(iconName);
}

export function substitute(str, iconUserOptions) {
    if (!iconUserOptions || !iconUserOptions.substitutions || !iconUserOptions.regexSubstitutions) {
        // If options are not provided, perform basic kebab-case conversion and return
        if (!iconExists(str)) {
            const kebabCase = str.toLowerCase().replace(/\s+/g, "-");
            if (iconExists(kebabCase)) return kebabCase;
        }
        return str; // Return original or its direct kebab if that exists
    }

    // Normal substitutions
    if (iconUserOptions.substitutions[str]) {
        return iconUserOptions.substitutions[str];
    }

    // Regex substitutions
    for (let i = 0; i < iconUserOptions.regexSubstitutions.length; i++) {
        const substitution = iconUserOptions.regexSubstitutions[i];
        // Ensure regex is valid if it's stored as a string in JSON
        let regex;
        if (typeof substitution.regex === 'string') {
            // Attempt to create RegExp object. This might need flags if they were implicit.
            // Assuming simple regex string without flags for now.
            try {
                regex = new RegExp(substitution.regex);
            } catch (e) {
                print(`Invalid regex string in icon substitutions: ${substitution.regex}`);
                continue; // Skip this substitution
            }
        } else if (substitution.regex instanceof RegExp) {
            regex = substitution.regex;
        } else {
            print(`Regex substitution is not a string or RegExp: ${substitution.regex}`);
            continue;
        }

        const replacedName = str.replace(
            regex,
            substitution.replace,
        );
        if (replacedName !== str) {
            return replacedName;
        }
    }

    // Guess: convert to kebab case if no substitutions applied and original doesn't exist
    if (!iconExists(str)) {
        const kebabCase = str.toLowerCase().replace(/\s+/g, "-");
        // We only return kebab-case if it actually results in an existing icon.
        // Otherwise, we prefer returning the original string even if it doesn't exist,
        // as per the original logic's fallback.
        if (iconExists(kebabCase)) return kebabCase;
    }

    // Original string (or original string if kebab-case didn't exist)
    return str;
}
