import { Gtk } from 'ags/gtk4'; // Corrected Gtk import
// Intrinsics <box>, <button>, <label>, <revealer> are used
import { createState, createEffect, createBinding } from 'ags';
import MaterialIcon from './MaterialIcon.js';
import { setupCursorHover } from '../../utils/cursorHover.js';
import { options as userOptions } from '../../options.js';

export default function ConfigSegmentedSelection({
    options = [{ name: 'Option 1', value: 0 }, { name: 'Option 2', value: 1 }],
    initialIndex = 0,
    onChange = (value, name) => {},
    className = '',
    buttonClassName = 'segment-btn',
    activeButtonClassName = 'segment-btn-enabled',
    hpack = 'center', // Default hpack for the root box
    vpack = 'center', // Default vpack for the root box
    hexpand,
    vexpand,
    ...rest // Other props for the root box
}) {
    const [selectedIndex, setSelectedIndex] = createState(initialIndex);

    createEffect(() => {
        const currentOption = options[selectedIndex.value];
        if (currentOption) {
            onChange(currentOption.value, currentOption.name);
        }
    }, [selectedIndex]);

    const mapAlign = (alignStr) => {
        switch(alignStr) {
            case 'start': return Gtk.Align.START;
            case 'end': return Gtk.Align.END;
            case 'fill': return Gtk.Align.FILL;
            case 'center': default: return Gtk.Align.CENTER;
        }
    };

    return (
        <box
            {...rest}
            orientation={Gtk.Orientation.HORIZONTAL} // Segmented buttons are usually horizontal
            hpack={mapAlign(hpack)}
            vpack={mapAlign(vpack)}
            hexpand={hexpand}
            vexpand={vexpand}
            class={`config-segmented-selection segment-container ${className}`}
        >
            {options.map((option, id) => {
                const isActive = selectedIndex.transform(idx => idx === id);
                return (
                    <button
                        $={setupCursorHover}
                        class={isActive.transform(active => `${buttonClassName} ${active ? activeButtonClassName : ''}`)}
                        onClicked={() => setSelectedIndex(id)}
                    >
                        <box hpack={Gtk.Align.CENTER} class='spacing-h-5'>
                            <revealer
                                revealChild={isActive}
                                transition={Gtk.RevealerTransitionType.SLIDE_RIGHT}
                                transitionDuration={userOptions.animations?.durationSmall || 150}
                            >
                                <MaterialIcon icon='check' size='norm' class='segment-btn-checkicon' />
                            </revealer>
                            <label label={option.name} class='segment-btn-label' />
                        </box>
                    </button>
                );
            })}
        </box>
    );
}
