import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib'; // For file paths
import App from 'ags/app';
import { box, label, button, revealer } from 'ags/widgets';
import { createState, createEffect, createBinding, Utils } // Utils for execAsync
    from 'ags';
import { execAsync } from 'ags/process';


import MaterialIcon from '../common/MaterialIcon.js';
import ConfigToggle from '../common/ConfigToggle.js';
import ConfigMultipleSelection from '../common/ConfigMultipleSelection.js';
import { setupCursorHover } from '../../utils/cursorHover.js';
import { options as userOptions } from '../../options.js'; // For initial values or defaults

// Import system dark mode state and i18n placeholder
import { darkMode, setDarkMode } from '../../utils/system.js'; // Assuming setDarkMode also triggers style recompilation via effect
// Placeholder for i18n
const getString = (str) => str;
// Placeholder for showColorScheme state (originally from variables.js)
// This state should be managed by a service, e.g., uiService.js
import { showColorScheme, toggleColorScheme, setColorSchemeVisible } from '../../services/uiService.js'; // Assuming it's added here


const ColorBox = ({ name, className = '', ...rest }) => box({
    ...rest,
    className: `color-box ${className}`, // Base class + specific color class
    homogeneous: true, // To make it a square or consistent size if desired via CSS
    child: label({ label: name }), // Text inside the color box
    // CSS will define the background color for .osd-color-primary etc.
});

const schemeOptionsArr = [ // From original colorscheme.js
    [
        { name: getString('Tonal Spot'), value: 'tonalspot' },
        { name: getString('Fruit Salad'), value: 'fruitsalad' },
        { name: getString('Fidelity'), value: 'fidelity' },
        { name: getString('Rainbow'), value: 'rainbow' },
    ],
    [
        { name: getString('Neutral'), value: 'neutral' },
        { name: getString('Monochrome'), value: 'monochrome' },
        { name: getString('Expressive'), value: 'expressive' },
        { name: getString('Vibrant'), value: 'vibrant' },
    ],
    [
        // Original had Vibrant+ as a single item row, ensure ConfigMultipleSelection handles varied row lengths or adjust data
        { name: getString('Vibrant+'), value: 'morevibrant' },
    ],
];

const LIGHTDARK_FILE_PATH = `${GLib.get_user_state_dir()}/ags/user/colormode.txt`;

// Helper to read initial values from colormode.txt
function getInitialStates() {
    let transparency = 'opaque'; // Default
    let scheme = 'vibrant';    // Default
    try {
        if (GLib.file_test(LIGHTDARK_FILE_PATH, GLib.FileTest.EXISTS)) {
            const content = Utils.readFile(LIGHTDARK_FILE_PATH); // ags/utils.readFile or GLib
            const lines = content.split('\n');
            // darkMode is handled by system.js
            if (lines.length > 1) transparency = lines[1].trim();
            if (lines.length > 2) scheme = lines[2].trim();
        }
    } catch (e) {
        console.warn("Failed to read colormode.txt for initial states:", e);
    }
    return {
        initialTransparencyIsTransparent: transparency === "transparent",
        initialSchemeValue: scheme,
    };
}
const { initialTransparencyIsTransparent, initialSchemeValue } = getInitialStates();

function calculateSchemeInitIndex(optionsArray, searchValue) {
    if (!searchValue) searchValue = 'vibrant'; // Default from original
    for (let r = 0; r < optionsArray.length; r++) {
        for (let c = 0; c < optionsArray[r].length; c++) {
            if (optionsArray[r][c].value === searchValue) {
                return [r, c];
            }
        }
    }
    return [1, 3]; // Fallback to 'vibrant' index if not found
}
const initialSchemeIndices = calculateSchemeInitIndex(schemeOptionsArr, initialSchemeValue);


const ColorSchemeSettings = () => {
    return box({
        className: 'osd-colorscheme-settings spacing-v-5 margin-20', // Ensure SCSS
        vertical: true,
        vpack: 'center',
        children: [
            box({ // Options section
                vertical: true,
                children: [
                    label({
                        xalign: 0, className: 'txt-norm titlefont txt', label: getString('Options'), hpack: 'center',
                    }),
                    ConfigToggle({
                        icon: 'dark_mode', name: getString('Dark Mode'), desc: getString('Ya should go to sleep!'),
                        active_accessor: darkMode, // Bind to global dark mode state
                        onToggleChange: (newValue) => {
                            setDarkMode(newValue); // This will trigger style recompilation via effect in stylingService
                        },
                    }),
                    ConfigToggle({
                        icon: 'border_clear', name: getString('Transparency'), desc: getString('Make shell elements transparent'),
                        initialValue: initialTransparencyIsTransparent,
                        onToggleChange: (newValue) => {
                            const transparencyValue = newValue ? "transparent" : "opaque";
                            execAsync([`bash`, `-c`, `mkdir -p ${GLib.get_user_state_dir()}/ags/user && sed -i "2s/.*/${transparencyValue}/" ${LIGHTDARK_FILE_PATH}`])
                                .then(() => execAsync([`${App.configDir}/scripts/color_generation/switchcolor.sh`])) // This script should trigger ags style reload
                                .catch(print);
                        },
                    }),
                ]
            }),
            box({ // Scheme styles section
                vertical: true,
                className: 'spacing-v-5',
                children: [
                    label({
                        xalign: 0, className: 'txt-norm titlefont txt margin-top-5', label: getString('Scheme styles'), hpack: 'center',
                    }),
                    ConfigMultipleSelection({
                        hpack: 'center', vpack: 'center',
                        optionsArr: schemeOptionsArr,
                        initialSelection: initialSchemeIndices, // Use calculated initial indices
                        onSelectionChange: (value, name) => {
                            execAsync([`bash`, `-c`, `mkdir -p ${GLib.get_user_state_dir()}/ags/user && sed -i "3s/.*/${value}/" ${LIGHTDARK_FILE_PATH}`])
                                .then(() => execAsync([`${App.configDir}/scripts/color_generation/switchcolor.sh`]))
                                .catch(print);
                        },
                    }),
                ]
            })
        ]
    });
};


const ColorSchemeSettingsRevealer = () => {
    const [isSettingsRevealed, setIsSettingsRevealed] = createState(false);
    const [isHovered, setIsHovered] = createState(false); // To manage hover state for auto-hide

    // Auto-hide logic based on hover (from original)
    createEffect(() => {
        if (!isHovered.value && isSettingsRevealed.value) {
            const id = Utils.timeout(1500, () => { // GLib.timeout_add or ags/utils.timeout
                if (!isHovered.value) { // Check again before hiding
                    setIsSettingsRevealed(false);
                }
            });
            return () => Utils.timeout_remove(id); // GLib.source_remove
        }
    }, [isHovered, isSettingsRevealed]);

    return eventbox({
        onHover: () => setIsHovered(true),
        onHoverLost: () => setIsHovered(false),
        child: box({
            vertical: true,
            children: [
                button({
                    className: 'osd-settings-btn-arrow', // Ensure SCSS
                    onClicked: () => setIsSettingsRevealed(v => !v),
                    setup: setupCursorHover,
                    hpack: 'end',
                    child: MaterialIcon({ icon: isSettingsRevealed.transform(r => r ? 'expand_less' : 'expand_more'), size: 'norm' }),
                }),
                revealer({
                    revealChild: isSettingsRevealed,
                    transition: Gtk.RevealerTransitionType.SLIDE_DOWN,
                    transitionDuration: 200, // userOptions.animations.durationNormal or similar
                    child: ColorSchemeSettings(),
                }),
            ]
        }),
    });
};

const ColorschemeContent = () => box({
    className: 'osd-colorscheme spacing-v-5', // Ensure SCSS
    vertical: true,
    hpack: 'center',
    children: [
        label({
            xalign: 0, className: 'txt-norm titlefont txt', label: getString('Color scheme'), hpack: 'center',
        }),
        box({ // Row 1 of colors
            className: 'spacing-h-5', hpack: 'center',
            children: [
                ColorBox({ name: 'P', className: 'osd-color osd-color-primary' }),
                ColorBox({ name: 'S', className: 'osd-color osd-color-secondary' }),
                ColorBox({ name: 'T', className: 'osd-color osd-color-tertiary' }),
                ColorBox({ name: 'Sf', className: 'osd-color osd-color-surface' }),
                ColorBox({ name: 'Sf-i', className: 'osd-color osd-color-inverseSurface' }),
                ColorBox({ name: 'E', className: 'osd-color osd-color-error' }),
            ]
        }),
        box({ // Row 2 of colors
            className: 'spacing-h-5', hpack: 'center',
            children: [
                ColorBox({ name: 'P-c', className: 'osd-color osd-color-primaryContainer' }),
                ColorBox({ name: 'S-c', className: 'osd-color osd-color-secondaryContainer' }),
                ColorBox({ name: 'T-c', className: 'osd-color osd-color-tertiaryContainer' }),
                ColorBox({ name: 'Sf-c', className: 'osd-color osd-color-surfaceContainer' }),
                ColorBox({ name: 'Sf-v', className: 'osd-color osd-color-surfaceVariant' }),
                ColorBox({ name: 'E-c', className: 'osd-color osd-color-errorContainer' }),
            ]
        }),
        ColorSchemeSettingsRevealer(),
    ]
});


export default function ColorSchemeDisplay() {
    // This main revealer's visibility is controlled by `showColorScheme` (from uiService)
    // and the hover state of its own settings panel (`isHoveredColorschemeSettings` in original).
    // The original logic was a bit convoluted. Let's simplify:
    // Show if `showColorScheme` is true OR if the settings panel is hovered (managed internally by ColorSchemeSettingsRevealer).
    // This might require `ColorSchemeSettingsRevealer` to expose its hover state or for this parent to also track hover.
    // For now, let's primarily bind to `showColorScheme`. The hover logic within ColorSchemeSettingsRevealer handles its own content.

    const [isHoveredOverall, setIsHoveredOverall] = createState(false); // Hover for the whole ColorSchemeDisplay

    // Combined visibility logic
    const mainRevealState = createBinding(
        [showColorScheme, isHoveredOverall], // showColorScheme from uiService
        (showExplicitly, isMouseOver) => {
            // If showColorScheme is true, always show.
            // If showColorScheme is false, show only if mouse is over (original logic was more complex with timeouts).
            // The original logic meant: if showColorScheme is false, it would hide UNLESS settings were hovered.
            // And if settings were hovered, it would stay visible for a bit even after unhover.
            // This is complex to replicate perfectly without direct access to settings revealer's internal hover.
            // Simplified: If showColorScheme is on, it's on. If off, it's off. Hover on settings reveals settings.
            return showExplicitly; // Simpler: controlled by global state. Settings hover is internal to settings.
        }
    );

    return revealer({
        transition: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transitionDuration: userOptions.animations?.durationLarge || 180,
        revealChild: mainRevealState,
        // Removed onHover/onHoverLost here for simplicity, relying on showColorScheme toggle.
        // The internal ColorSchemeSettingsRevealer manages its own hover for its content.
        child: ColorschemeContent(),
    });
}
