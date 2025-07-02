import Gtk from 'gi://Gtk?version=4.0';
import { box, button, label, revealer } from 'ags/widgets';
import { createState, createEffect, createBinding } from 'ags';
import MaterialIcon from './MaterialIcon.js'; // For the checkmark icon
import { setupCursorHover } from '../../utils/cursorHover.js';
import { options as userOptions } from '../../options.js'; // For animation durations

export default function ConfigSegmentedSelection({
    // icon, // Not used in original ConfigSegmentedSelection, but could be added
    // name, // Typically this widget is part of a larger config item with a name/label
    // desc = '', // Tooltip for the whole group
    options = [{ name: 'Option 1', value: 0 }, { name: 'Option 2', value: 1 }],
    initialIndex = 0, // Index of the initially selected option
    onChange = (value, name) => {}, // (value: any, name: string) => void
    className = '',
    buttonClassName = 'segment-btn', // Base class for segment buttons
    activeButtonClassName = 'segment-btn-enabled', // Class for active segment button
    // ...rest // Props for the root box
    hpack, vpack, hexpand, vexpand, // Common layout props for the root box
}) {
    const [selectedIndex, setSelectedIndex] = createState(initialIndex);

    // Effect to call onChange when selection changes
    createEffect(() => {
        const currentOption = options[selectedIndex.value];
        if (currentOption) {
            onChange(currentOption.value, currentOption.name);
        }
    }, [selectedIndex]);

    return box({
        // ...rest, // Apply other Gtk.Box props
        hpack, vpack, hexpand, vexpand,
        className: `config-segmented-selection ${className} segment-container`, // Ensure SCSS for segment-container
        // homogeneous: true, // Original was true for the outer box, depends on desired button sizing
        children: options.map((option, id) => {
            const isActive = selectedIndex.transform(idx => idx === id);

            const selectedIcon = revealer({
                revealChild: isActive,
                transition: Gtk.RevealerTransitionType.SLIDE_RIGHT, // Or crossfade
                transitionDuration: userOptions.animations?.durationSmall || 150,
                child: MaterialIcon({ icon: 'check', size: 'norm', className: 'segment-btn-checkicon' }), // Ensure SCSS
            });

            return button({
                setup: setupCursorHover,
                className: isActive.transform(active => `${buttonClassName} ${active ? activeButtonClassName : ''}`),
                child: box({
                    hpack: 'center',
                    className: 'spacing-h-5', // Ensure SCSS for spacing between icon and label
                    children: [
                        selectedIcon,
                        label({ label: option.name, className: 'segment-btn-label' }), // Ensure SCSS
                    ]
                }),
                onClicked: () => {
                    setSelectedIndex(id);
                }
            });
        }),
    });
}
