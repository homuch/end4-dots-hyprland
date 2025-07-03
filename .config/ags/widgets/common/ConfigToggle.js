import { Gtk } from 'ags/gtk4'; // Corrected Gtk import
// Intrinsics like <box>, <label>, <button> don't need direct import from 'ags/widgets'
import { createState, createEffect } from 'ags';
// Utils.timeout is not directly from 'ags', use 'ags/time' or GLib for timeouts if needed.
// For now, removing Utils import as direct timeouts are not used in this refactored version's core logic.
import MaterialIcon from './MaterialIcon.js';
import { setupCursorHover } from '../../utils/cursorHover.js';
import { options as userOptions } from '../../options.js'; // For animation durations (if any, not directly here now)

export default function ConfigToggle({
    icon,
    name,
    desc = '',
    initialValue = false,
    expandWidget = true,
    resetButton = false,
    onChange = (newValue) => {},
    onReset = async () => {},
    fetchValue = () => false,
    className = '',
    active_accessor,
    onToggle_handler,
    // Spread other props to the root <box>
    ...rest
}) {
    const isControlled = !!active_accessor;
    const [_internalEnabled, _setInternalEnabled] = createState(initialValue);

    const enabled = isControlled ? active_accessor : _internalEnabled;
    const setEnabled = (val_or_func) => {
        let newValueToSet;
        if (typeof val_or_func === 'function') {
            newValueToSet = val_or_func(enabled.value);
        } else {
            newValueToSet = val_or_func;
        }

        if (isControlled) {
            if (onToggle_handler) onToggle_handler(newValueToSet);
        } else {
            _setInternalEnabled(newValueToSet);
        }
    };

    createEffect(() => {
        onChange(enabled.value);
    }, [enabled]);

    const toggleIcon = <label
        class={createBinding([enabled], (e) => `switch-icon-label icon-material txt-bold ${e ? '' : 'txt-poof'}`)}
        label={enabled.transform(e => e ? 'check' : '')}
    />;

    const toggleButtonIndicator = (
        <box
            class={enabled.transform(e => `switch-fg ${e ? 'switch-fg-true' : ''}`)}
            vpack={Gtk.Align.CENTER} // Use Gtk.Align
            hpack={Gtk.Align.START}   // Use Gtk.Align
        >
            {toggleIcon}
        </box>
    );

    const toggleButtonBg = (
        <box
            hpack={Gtk.Align.END}    // Use Gtk.Align
            vpack={Gtk.Align.CENTER} // Use Gtk.Align
            class={enabled.transform(e => `switch-bg ${e ? 'switch-bg-true' : ''}`)}
        >
            {toggleButtonIndicator}
        </box>
    );

    const mainToggleButton = (
        <button
            class='config-toggle-button'
            onClicked={() => setEnabled(val => !val)}
            $={setupCursorHover} // Apply setup directly
        >
            {toggleButtonBg}
        </button>
    );

    return (
        <box {...rest} class={`configtoggle-box-outer spacing-h-5 ${rest.class || ''} ${className}`}>
            <box
                tooltipText={desc}
                class={`config-toggle-content txt spacing-h-10`}
            >
                {icon && <MaterialIcon icon={icon} size='norm' vpack={Gtk.Align.CENTER} />}
                {name && <label vpack={Gtk.Align.CENTER} class='txt txt-small' label={name} />}
                {expandWidget && <box hexpand={true} />}
                {mainToggleButton}
            </box>
            {resetButton && (
                <button
                    class='configtoggle-reset'
                    onClicked={async () => {
                        await onReset();
                        const fetchedVal = await fetchValue();
                        setEnabled(fetchedVal);
                    }}
                    $={setupCursorHover}
                >
                    <MaterialIcon icon='settings_backup_restore' size='small' />
                </button>
            )}
        </box>
    );
}
