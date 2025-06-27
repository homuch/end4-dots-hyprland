import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk'; // For Gtk.CssProvider if needed
import GtkSource from "gi://GtkSource?version=3.0"; // Assuming GtkSource v3 is still used/compatible

// import App from 'resource:///com/github/Aylur/ags/app.js' // v1
// import * as Utils from 'resource:///com/github/Aylur/ags/utils.js' // v1
import Astal from 'gi://Astal';
const App = Astal.App; // Assuming Astal.App provides configDir
const AstalUtils = Astal.Utils; // Assuming Astal.Utils for exec, writeFileSync

import { darkMode } from './modules/.miscutils/system.js'; // This should be the migrated Astal.Variable
import userOptions from './modules/.configuration/user_options.js'; // Import userOptions

const CUSTOM_SOURCEVIEW_SCHEME_PATH = () => `${App.configDir}/assets/themes/sourceviewtheme${darkMode.value ? '' : '-light'}.xml`;

export const COMPILED_STYLE_DIR = `${GLib.get_user_cache_dir()}/ags/user/generated`;

function loadSourceViewColorScheme(filePath) {
    const file = Gio.File.new_for_path(filePath);
    const [success, contents] = file.load_contents(null);

    if (!success) {
        print('Failed to load the SourceView XML file: ' + filePath); // Changed logError to print
        return;
    }
    const schemeManager = GtkSource.StyleSchemeManager.get_default();
    const parentDir = file.get_parent();
    if (parentDir) {
        schemeManager.append_search_path(parentDir.get_path());
         // TODO: Potentially need to load the scheme explicitly if just appending path isn't enough
         // schemeManager.set_scheme(schemeId_from_xml);
    } else {
        print('Could not get parent directory for SourceView theme: ' + filePath);
    }
}

globalThis['handleStyles'] = (resetMusic) => {
    // Reset
    AstalUtils.exec(`mkdir -p "${GLib.get_user_state_dir()}/ags/scss"`);
    if (resetMusic) {
        AstalUtils.exec(`bash -c 'echo "" > ${GLib.get_user_state_dir()}/ags/scss/_musicwal.scss'`);
        AstalUtils.exec(`bash -c 'echo "" > ${GLib.get_user_state_dir()}/ags/scss/_musicmaterial.scss'`);
    }
    // Generate overrides
    let lightdark = darkMode.value ? "dark" : "light";
    // Ensure userOptions and necessary nested properties exist
    const themeName = userOptions?.icons?.symbolicIconTheme?.[lightdark] || "default-symbolic-theme";
    AstalUtils.writeFileSync(
        `
@mixin symbolic-icon {
    -gtk-icon-theme: '${themeName}';
}
`,
        `${GLib.get_user_state_dir()}/ags/scss/_lib_mixins_overrides.scss`);

    // Compile SCSS
    async function compileAndApplyStyle() {
        AstalUtils.exec(`mkdir -p ${COMPILED_STYLE_DIR}`);
        const sassCommand = `sass -I "${GLib.get_user_state_dir()}/ags/scss" -I "${App.configDir}/scss/fallback" "${App.configDir}/scss/main.scss" "${COMPILED_STYLE_DIR}/style.css"`;
        try {
            AstalUtils.exec(sassCommand); // Use synchronous exec for compilation as subsequent steps depend on it.
                                        // Or make this part of an async chain if execAsync is preferred and robust.
            console.log('[LOG] SCSS compiled successfully.');

            // CSS Application to Astal:
            // Option 1: Astal.App.config({ style: '...' }) handles this by monitoring the file (ideal).
            // In this case, no further action is needed here after compilation.

            // Option 2: Astal provides a way to reload styles.
            // if (Astal.App.reloadStyles) { Astal.App.reloadStyles(); }

            // Option 3: Manual reload using Gtk.CssProvider (more involved).
            // This would require managing the CssProvider instance.
            // For example:
            // const display = Gdk.Display.get_default();
            // const screen = display.get_default_screen(); // Deprecated in Gtk4
            // if (globalThis.currentCssProvider) {
            //    Gtk.StyleContext.remove_provider_for_display(display, globalThis.currentCssProvider);
            // }
            // globalThis.currentCssProvider = new Gtk.CssProvider();
            // globalThis.currentCssProvider.load_from_path(`${COMPILED_STYLE_DIR}/style.css`);
            // Gtk.StyleContext.add_provider_for_display(display, globalThis.currentCssProvider, Gtk.STYLE_PROVIDER_PRIORITY_USER);

            console.log('[LOG] Styles potentially reloaded by Astal or manual method.');

        } catch (e) {
            print(`Error compiling or applying SCSS: ${e}`);
        }
    }

    compileAndApplyStyle().then(() => {
        const sourceViewPath = CUSTOM_SOURCEVIEW_SCHEME_PATH();
        if (sourceViewPath) { // Ensure path is valid
            loadSourceViewColorScheme(sourceViewPath);
        }
    }).catch(print);
};
