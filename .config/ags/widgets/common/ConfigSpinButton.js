import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk'; // For Gdk.EventControllerMotion if used, or Gdk.EVENT_STOP etc.
import { box, label, button, spinbutton as AgsSpinButton, eventbox } from 'ags/widgets'; // AgsSpinButton
import { createState, createEffect, Utils } from 'ags';
import MaterialIcon from './MaterialIcon.js';
import { setupCursorHover, setupCursorHoverHResize } from '../../utils/cursorHover.js'; // setupCursorHoverHResize for drag area

export default function ConfigSpinButton({
    icon,
    name,
    desc = '',
    initialValue = 0,
    minValue = 0,
    maxValue = 100,
    step = 1,
    expandWidget = true,
    resetButton = false,
    scrubRatio = 1 / 20, // From original, pixels dragged per unit value change
    roundValue = true, // Whether to round value during scrub
    onChange = (newValue) => {}, // (newValue: number) => void
    // extraSetup for the root box
    onReset = async () => {}, // Should return new value or rely on fetchValue
    fetchValue = () => initialValue, // Function to get the default/reset value
    className = '',
    // For controlled component behavior
    value_accessor,     // Optional: Pass an accessor for external state control
    onValueChange_handler, // Optional: If controlled, this is like `setEnabled` for ConfigToggle
    ...rest
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
        newValue = Math.max(minValue, Math.min(maxValue, newValue)); // Clamp
        if (roundValue) newValue = Math.round(newValue);

        if (isControlled) {
            if (onValueChange_handler) onValueChange_handler(newValue);
        } else {
            _setInternalValue(newValue);
        }
        onChange(newValue); // Call general onChange for both controlled/uncontrolled
    };

    // Ensure spinbutton UI reflects state changes if controlled externally
    const spinButtonRef = { widget: null };
    createEffect(() => {
        if (spinButtonRef.widget && currentValue.value !== spinButtonRef.widget.value) {
            spinButtonRef.widget.value = currentValue.value;
        }
    }, [currentValue]);


    const spinBtn = AgsSpinButton({
        className: 'spinbutton', // Ensure SCSS
        range: [minValue, maxValue],
        increments: [step, step], // [step, pageIncrement]
        value: currentValue.value, // Initial value
        on_value_changed: (sb) => { // Signal when spinbutton's value changes by user or programmatically
            // Avoid feedback loop if programmatically setting due to currentValue effect
            if (sb.value !== currentValue.value) {
                 setValue(sb.value);
            }
        },
        setup: self => spinButtonRef.widget = self,
    });

    const widgetContent = box({
        tooltipText: desc,
        className: `config-spinbutton-content ${className} txt spacing-h-5`, // Ensure SCSS
        children: [
            ...(icon ? [MaterialIcon({ icon, size: 'norm', vpack: 'center' })] : []),
            ...(name ? [label({ className: 'txt txt-small', label: name, vpack: 'center' })] : []),
            ...(expandWidget ? [box({ hexpand: true })] : []),
            spinBtn,
        ]
    });

    // EventBox for drag scrubbing (original wrapped the whole thing)
    const scrubEventBox = eventbox({
        child: widgetContent,
        setup: (self) => {
            setupCursorHoverHResize(self); // Change cursor on hover
            const gesture = Gtk.GestureDrag.new();
            let gestureValueOnDragBegin = 0;

            gesture.connect('drag-begin', (g) => {
                gestureValueOnDragBegin = currentValue.value;
                g.set_state(Gtk.EventSequenceState.CLAIMED); // Claim the drag
            });
            gesture.connect('drag-update', (g) => {
                const [offsetX, offsetY] = g.get_offset(); // [dx, dy] from start point
                let newValue = gestureValueOnDragBegin + (offsetX * scrubRatio);
                // Clamping and rounding is handled by setValue
                setValue(newValue);
            });
            // No 'drag-end' needed if value is updated continuously
            self.add_controller(gesture);
        }
    });

    return box({
        ...rest,
        className: `config-spinbutton-box-outer spacing-h-5 ${props.className || ''}`,
        children: [
            scrubEventBox,
            ...(resetButton ? [button({
                className: 'configtoggle-reset spinbutton-reset', // Ensure SCSS
                onClicked: async () => {
                    // onReset might do async things, then fetchValue gets the actual default.
                    await onReset();
                    const fetchedDefValue = await fetchValue(); // Ensure fetchValue can be async if needed
                    setValue(fetchedDefValue);
                },
                child: MaterialIcon({ icon: 'settings_backup_restore', size: 'small' }),
                setup: setupCursorHover,
            })] : []),
        ]
    });
}
