import { Gtk, Gdk } from 'ags/gtk4'; // Corrected imports
// Intrinsics: <box>, <label>, <button>, <spinbutton>
import { createState, createEffect, Utils } from 'ags'; // Utils for timeout if onReset/fetchValue use it
import MaterialIcon from './MaterialIcon.js';
import { setupCursorHover, setupCursorHoverHResize } from '../../utils/cursorHover.js';

export default function ConfigSpinButton({
    icon,
    name,
    desc = '',
    initialValue = 0,
    minValue = 0,
    maxValue = 100,
    step = 1, // step for arrow keys
    pageIncrement = 5, // step for page up/down or larger scroll
    expandWidget = true,
    resetButton = false,
    scrubRatio = 1 / 20,
    roundValue = true,
    onChange = (newValue) => {},
    onReset = async () => {},
    fetchValue = () => initialValue,
    className = '',
    value_accessor,
    onValueChange_handler,
    ...rest // Props for the root <box>
}) {
    const isControlled = !!value_accessor;
    const [_internalValue, _setInternalValue] = createState(initialValue);

    const currentValue = isControlled ? value_accessor : _internalValue;
    const setValue = (val_or_func) => {
        let newValue;
        if (typeof val_or_func === 'function') {
            newValue = val_or_func(currentValue.value);
        } else {
            newValue = val_or_func;
        }
        newValue = Math.max(minValue, Math.min(maxValue, Number(newValue))); // Clamp and ensure number
        if (roundValue) newValue = Math.round(newValue);

        if (isControlled) {
            if (onValueChange_handler) onValueChange_handler(newValue);
        } else {
            _setInternalValue(newValue);
        }
        onChange(newValue);
    };

    const spinButtonRef = { widget: null };
    createEffect(() => {
        if (spinButtonRef.widget && currentValue.value !== spinButtonRef.widget.get_value_as_int()) { // Gtk.SpinButton method
             // Gtk.SpinButton value is float, but often treated as int if digits=0
            spinButtonRef.widget.set_value(currentValue.value);
        }
    }, [currentValue]);

    // Prepare Gtk.Adjustment for the spinbutton
    const adjustment = Gtk.Adjustment.new(currentValue.value, minValue, maxValue, step, pageIncrement, 0);
    // Bind adjustment value back to our state if it changes from spinbutton UI interaction
    adjustment.connect('value-changed', () => {
        const adjValue = adjustment.get_value();
        if (adjValue !== currentValue.value) {
            setValue(adjValue);
        }
    });
    // Also update adjustment if our state changes (e.g. from scrubbing or external control)
    createEffect(() => {
        if(adjustment.get_value() !== currentValue.value) {
            adjustment.set_value(currentValue.value);
        }
    }, [currentValue]);


    const spinBtn = (
        <spinbutton
            // class='spinbutton' // Already part of Gtk.SpinButton's style context
            adjustment={adjustment}
            digits={0} // Assuming integer values mostly, can be prop if float needed
            value={currentValue.value} // Initial value
            // on_value_changed is complex with Gtk.Adjustment. Handle via adjustment 'value-changed'.
            // Or, if Ags <spinbutton> has simpler onChange:
            // onChange={({value}) => setValue(value)}
            $={self => spinButtonRef.widget = self}
        />
    );

    const widgetContent = (
        <box
            tooltipText={desc}
            class={`config-spinbutton-content ${className} txt spacing-h-5`}
        >
            {icon && <MaterialIcon icon={icon} size='norm' vpack={Gtk.Align.CENTER} />}
            {name && <label class='txt txt-small' label={name} vpack={Gtk.Align.CENTER} />}
            {expandWidget && <box hexpand={true} />}
            {spinBtn}
        </box>
    );

    return (
        <box
            {...rest}
            class={`config-spinbutton-box-outer spacing-h-5 ${rest.class || ''}`}
        >
            <box $={self => { // This box will get the drag gesture
                setupCursorHoverHResize(self);
                const gesture = Gtk.GestureDrag.new();
                let gestureValueOnDragBegin = 0;

                gesture.connect('drag-begin', (g) => {
                    gestureValueOnDragBegin = currentValue.value;
                    g.set_state(Gtk.EventSequenceState.CLAIMED);
                });
                gesture.connect('drag-update', (g) => {
                    const [offsetX, offsetY] = g.get_offset();
                    let newValue = gestureValueOnDragBegin + (offsetX * scrubRatio);
                    setValue(newValue);
                });
                self.add_controller(gesture);
            }}>
                {widgetContent}
            </box>
            {resetButton && (
                <button
                    class='configtoggle-reset spinbutton-reset'
                    onClicked={async () => {
                        await onReset();
                        const fetchedDefValue = await fetchValue();
                        setValue(fetchedDefValue);
                    }}
                    $={setupCursorHover}
                >
                    <MaterialIcon icon='settings_backup_restore' size='small' />
                </button>
            )}
        </box>
    );
}
