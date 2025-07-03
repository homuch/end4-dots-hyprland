import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
// GtkSource import needs to be dynamic based on getSourceViewVersion or use a fixed version known to work.
// For now, keeping ActualGtkSource which is dynamically resolved.
import app from 'ags/gtk4/app'; // Corrected
import { exec, execAsync } from 'ags/process'; // exec is fine, writeFile was an issue
import { writeFileSync } from 'ags/file'; // Correct: use this for sync writes
import { createEffect } from 'ags'; // Moved import to top

import { darkMode } from '../../utils/system.js'; // Corrected path
import { options as userOptions } from '../../options.js'; // Corrected path
import { COMPILED_STYLE_DIR } from '../../app.js'; // Corrected path

function getSourceViewVersion() {
    try {
        const GtkSource5 = imports.gi.GtkSource?._version === 5 ? imports.gi.GtkSource : null;
        if (GtkSource5) return 5;
    } catch (e) { /* ignore */ }
    try {
        const GtkSource4 = imports.gi.GtkSource?._version === 4 ? imports.gi.GtkSource : null;
        if (GtkSource4) return 4;
    } catch (e) { /* ignore */ }
    try {
        const GtkSource3 = imports.gi.GtkSource?._version === 3 ? imports.gi.GtkSource : null;
        if (GtkSource3) return 3; // Should not happen with GTK4
    } catch (e) { /* ignore */ }
    return 4; // Default assumption
}

const GTK_SOURCE_VERSION = getSourceViewVersion();
const ActualGtkSource = imports.gi.GtkSource; // Will be version 3, 4 or 5 based on availability


function loadSourceViewColorScheme() {
    // Determine path based on dark mode state from the darkMode accessor
    const schemePath = `${app.configDir}/assets/themes/sourceviewtheme${darkMode.value ? '' : '-light'}.xml`; // Corrected

    const file = Gio.File.new_for_path(schemePath);
    if (!file.query_exists(null)) {
        console.warn(`SourceView theme not found: ${schemePath}`);
        return;
    }

    const schemeManager = ActualGtkSource.StyleSchemeManager.get_default();
    const searchPath = file.get_parent().get_path();

    // Prepend search path. In GtkSourceView 5, append_search_path is deprecated.
    // set_search_path takes an array.
    const existingPaths = schemeManager.get_search_path() || [];
    if (!existingPaths.includes(searchPath)) {
        if (GTK_SOURCE_VERSION >= 5) {
             const newPaths = [searchPath, ...existingPaths];
             schemeManager.set_search_path(newPaths);
        } else {
            schemeManager.prepend_search_path(searchPath); // For GtkSourceView 3/4
        }
    }
    // The scheme should be loadable by its ID now if the XML file is correct.
    // GtkSource.StyleSchemeManager.force_rescan() might be needed for GtkSourceView 5.
    if (GTK_SOURCE_VERSION >= 5 && typeof schemeManager.force_rescan === 'function') {
        schemeManager.force_rescan();
    }
}

export function handleStyles(resetMusic = false) {
    // Reset
    exec(`mkdir -p "${GLib.get_user_state_dir()}/ags/scss"`);
    if (resetMusic) {
        // Use execAsync for commands that don't need to block
        execAsync(['bash', '-c', `echo "" > ${GLib.get_user_state_dir()}/ags/scss/_musicwal.scss`]).catch(print);
        execAsync(['bash', '-c', `echo "" > ${GLib.get_user_state_dir()}/ags/scss/_musicmaterial.scss`]).catch(print);
    }

    // Generate overrides for lib_mixins
    // Use darkMode.value (assuming it's reactive and gives current boolean state)
    const lightdark = darkMode.value ? "dark" : "light";
    const symbolicTheme = userOptions.icons?.symbolicIconTheme?.[lightdark] || (lightdark === "dark" ? "Adwaita" : "Adwaita");

    writeFileSync(
        `
@mixin symbolic-icon {
    -gtk-icon-theme: '${symbolicTheme}';
}
`,
        `${GLib.get_user_state_dir()}/ags/scss/_lib_mixins_overrides.scss`);

    // Compile and apply
    async function applyStyle() {
        exec(`mkdir -p ${COMPILED_STYLE_DIR}`);
        const sassCommand = [
            'sass',
            `-I "${GLib.get_user_state_dir()}/ags/scss"`,
            `-I "${app.configDir}/scss/fallback"`, // Corrected
            `"${app.configDir}/scss/main.scss"`,   // Corrected
            `"${COMPILED_STYLE_DIR}/style.css"`
        ].join(' ');

        try {
            await execAsync(['bash', '-c', sassCommand]);
            app.resetCss(); // Corrected
            app.applyCss(`${COMPILED_STYLE_DIR}/style.css`); // Corrected
            console.log('[LOG] Styles loaded');
        } catch (error) {
            console.error('Error applying styles:', error);
        }
    }

    applyStyle().then(() => {
        loadSourceViewColorScheme();
    }).catch(print);
}

// Initial style handling
// handleStyles(true); // Call this from app.js after options are loaded and darkMode state is initialized.

// Function to be called when dark mode changes
export function onDarkModeChanged() {
    handleStyles(false); // Don't reset music styles on every dark mode toggle
}

// Import createEffect for reacting to darkMode changes
import { createEffect } from 'ags';

// Effect to automatically handle style changes when dark mode changes
createEffect(() => {
    // This function will run whenever darkMode.value changes.
    // The initial run of handleStyles(true) should be managed by app.js.
    // This effect handles subsequent changes to darkMode.
    // To prevent an immediate call on app load before initial setup,
    // we can add a check or ensure initial handleStyles(true) sets a flag.
    // For now, let this run. If it causes issues with initial load, we can refine.
    onDarkModeChanged();
    loadSourceViewColorScheme(); // Also reload source view theme
}, [darkMode]); // Dependency: react when darkMode accessor changes
