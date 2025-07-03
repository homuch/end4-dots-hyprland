import { Gtk } from 'ags/gtk4'; // For Gtk.Align if needed
import { box, label, scrollable } from 'ags/widgets';
import { AgsToggle, AgsSpinButton } from '../../../common/AppConfigWidgets.js'; // Adjusted path
// For SegmentedSelection, if I add it later:
// import ConfigSegmentedSelection from '../../../common/ConfigSegmentedSelection.js';

// getString placeholder
const getString = (str) => str; // TODO: i18n

const ConfigSection = ({ title, children }) => box({
    vertical: true,
    className: 'config-section spacing-v-10 margin-bottom-15', // Ensure SCSS
    children: [
        label({
            label: title,
            hpack: Gtk.Align.START,
            className: 'txt-large category-title margin-bottom-5', // Ensure SCSS
        }),
        ...children,
    ],
});

export default function ConfigureDisplay() {
    // Note: The 'option' prop in AgsToggle/AgsSpinButton needs to be the exact path
    // to the option in user_options.jsonc. These are examples.
    return scrollable({
        vexpand: true,
        hexpand: true,
        hscrollbarPolicy: Gtk.ScrollPolicyType.NEVER,
        vscrollbarPolicy: Gtk.ScrollPolicyType.AUTOMATIC,
        child: box({
            vertical: true,
            vexpand: false, // So scrollable works
            hexpand: true,
            class: "padding-10 spacing-v-15", // Ensure SCSS
            children: [
                ConfigSection({
                    title: getString("Appearance"),
                    children: [
                        AgsToggle({
                            option: "appearance.autoDarkMode.enabled", // Example path
                            icon: "dark_mode",
                            name: getString("Auto Dark Mode"),
                            desc: getString("Automatically switch between light and dark themes."),
                        }),
                        AgsToggle({
                            option: "appearance.barRoundCorners", // Example path
                            icon: "rounded_corner",
                            name: getString("Bar: Rounded Corners"),
                            desc: getString("Enable rounded corners for the bar."),
                        }),
                        AgsSpinButton({
                            option: "animations.durationLarge", // Example path
                            icon: "slow_motion_video",
                            name: getString("Animation Duration (Large)"),
                            desc: getString("Duration for larger animations (e.g., window transitions) in milliseconds."),
                            minValue: 0,
                            maxValue: 2000,
                            step: 50,
                        }),
                        AgsSpinButton({
                            option: "appearance.fakeScreenRounding", // Example path
                            icon: "aspect_ratio",
                            name: getString("Screen Rounding Strength"),
                            desc: getString("Strength of fake screen rounding. 0=Off, 1=Always, 2=Hide on Fullscreen."),
                            minValue: 0,
                            maxValue: 2,
                            step: 1,
                        }),
                    ]
                }),
                ConfigSection({
                    title: getString("Bar"),
                    children: [
                        AgsToggle({
                            option: "bar.alwaysShowFullResources", // Example path
                            icon: "memory",
                            name: getString("Always Show Full Resources"),
                            desc: getString("Show all system resources in the bar, even when media is playing."),
                        }),
                        // Example for a segmented control if it were simple (actual options may vary)
                        // ConfigSegmentedSelection({
                        //     options: [
                        //         { name: "Top", value: "top" },
                        //         { name: "Bottom", value: "bottom" },
                        //     ],
                        //     initialIndex: userOptions.bar?.position === "bottom" ? 1 : 0, // Needs userOptions access
                        //     onChange: (value) => { /* update userOptions.bar.position */ },
                        // }),
                    ]
                }),
                ConfigSection({
                    title: getString("Dock"),
                    children: [
                        AgsToggle({
                            option: "dock.enabled", // Example path
                            icon: "dock",
                            name: getString("Enable Dock"),
                        }),
                        AgsSpinButton({
                            option: "dock.hiddenThickness", // Example path
                            icon: "unfold_less",
                            name: getString("Dock Hidden Thickness"),
                            desc: getString("Thickness of the dock when auto-hidden (px)."),
                            minValue: 0,
                            maxValue: 20,
                            step: 1,
                            visible: userOptions.dock?.enabled, // Example conditional visibility
                        }),
                    ]
                }),
                // TODO: Add more configuration sections as needed (e.g., Search, Sidebar, Gaming)
            ]
        })
    });
}
