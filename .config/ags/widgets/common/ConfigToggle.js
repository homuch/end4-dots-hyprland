import Gtk from 'gi://Gtk?version=4.0';
import { box, label, button, revealer } from 'ags/widgets';
import { createState, createEffect, Utils } from 'ags'; // Utils for timeout if needed
import MaterialIcon from './MaterialIcon.js';
import { setupCursorHover } from '../../utils/cursorHover.js';
import { options as userOptions } from '../../options.js'; // For animation durations

export default function ConfigToggle({
    icon,
    name,
    desc = '',
    initialValue = false,
    expandWidget = true,
    resetButton = false,
    onChange = (newValue) => {}, // (newValue: boolean) => void
    // extraSetup is handled by passing $ to the root box if needed by parent
    onReset = async () => {}, // Should be async if it does async work
    fetchValue = () => false, // Should return the new value after reset
    className = '',
    active_accessor, // Optional: Pass an accessor to control the switch externally
    onToggle_handler, // Optional: If controlled, this is the setter for parent's state
    ...rest
}) {
    const isControlled = !!active_accessor;
    const [_enabled, _setEnabled] = createState(initialValue);

    const enabled = isControlled ? active_accessor : _enabled;
    const setEnabled = (val_or_func) => {
        if (isControlled) {
            if (onToggle_handler) {
                // If val_or_func is a function, parent needs to handle it like ags setState(prev => !prev)
                // For simplicity, assume onToggle_handler takes a boolean.
                // Parent should do: onToggle_handler(currentValue => !currentValue) if it wants toggle behavior.
                // Here, we'll call it with the new direct value if it's a simple toggle.
                // This part is tricky for controlled components wanting internal toggle logic.
                // The parent should ideally compute the new value.
                // For now, this toggle logic is for internal state.
                // If controlled, onToggle_handler should just be called with the new value.
                // The Button below calls `setEnabled(!enabled.value)`, so onToggle_handler will get the new bool.
                if (typeof val_or_func === 'function') { // This case is for internal state only.
                    console.warn("ConfigToggle: function passed to setEnabled on a controlled component. Parent should manage this.");
                    onToggle_handler(val_or_func(enabled.value)); // Try to accommodate
                } else {
                     onToggle_handler(val_or_func);
                }
            }
        } else {
            _setEnabled(val_or_func);
        }
    };

    // Effect for initial value if controlled
    createEffect(() => {
        if (isControlled) {
            // No need to set _enabled if active_accessor is used directly by UI elements.
            // This effect is mainly if UI elements were bound to _enabled.
            // Since UI elements will bind to `enabled` (which is active_accessor), this is fine.
        }
    }, [active_accessor]);


    // Visual state for the animated icon within the switch
    const [iconVisible, setIconVisible] = createState(enabled.value);
    const [isToggling, setIsToggling] = createState(false);

    createEffect(() => {
        const currentVal = enabled.value;
        setIconVisible(currentVal); // Set icon based on final state
        setIsToggling(false); // Reset toggling state
        onChange(currentVal); // Call external onChange with the new value
    }, [enabled]);


    const toggleIcon = label({
        // className: `icon-material txt-bold ${enabled.value ? '' : 'txt-poof'}`, // Original logic
        // Simpler: icon is either 'check' or empty. CSS handles 'txt-poof' via parent state.
        className: 'switch-icon-label icon-material txt-bold',
        label: iconVisible.transform(v => v ? 'check' : ''),
    });

    const toggleButtonIndicator = box({
        className: enabled.transform(e => `switch-fg ${e ? 'switch-fg-true' : ''}`),
        vpack: 'center',
        hpack: 'start', // This will make it stick to left unless parent is homogeneous with center pack
        children: [toggleIcon],
    });

    const toggleButtonBg = box({
        hpack: 'end',
        vpack: 'center',
        className: enabled.transform(e => `switch-bg ${e ? 'switch-bg-true' : ''}`),
        // homogeneous: true, // In original for toggleButtonIndicator to be centered within if smaller
        child: toggleButtonIndicator, // Original had array, but it's one child
    });

    const mainToggleButton = button({
        // This button acts as the clickable area for the switch
        className: 'config-toggle-button', // For general styling of the clickable switch part
        child: toggleButtonBg, // The visual switch
        onClicked: () => {
            setIsToggling(true); // Visual feedback for press
            // For a controlled component, onClicked should call onToggle_handler with the new desired state.
            // The parent then updates the active_accessor.
            // If not controlled, it updates its internal state.
            setEnabled(val => !val); // Toggle current value
        },
        setup: (self) => {
            setupCursorHover(self);
            // Original had complex class toggling on press/hoverLost for icon animation.
            // This can be simplified with CSS transitions on the switch-fg/bg classes and icon visibility.
            // self.connect('pressed', () => { setIsToggling(true); });
            // self.connect('released', () => { /* isToggling might be reset by effect */ });
        }
    });

    const widgetContent = box({
        tooltipText: desc,
        className: `config-toggle-content ${className} txt spacing-h-10`,
        children: [
            ...(icon ? [MaterialIcon({ icon, size: 'norm', vpack: 'center' })] : []),
            ...(name ? [label({
                vpack: 'center',
                className: 'txt txt-small', // Ensure SCSS
                label: name,
            })] : []),
            ...(expandWidget ? [box({ hexpand: true })] : []),
            mainToggleButton, // The custom switch
        ]
    });

    return box({
        ...rest, // Spread Gtk.Box props like hpack, vpack, etc.
        className: `configtoggle-box-outer spacing-h-5 ${props.className || ''}`,
        children: [
            widgetContent, // Changed from interactionWrapper to widgetContent directly if widgetContent handles click
                           // Original: interactionWrapper was a Button wrapping widgetContent.
                           // For custom switch, mainToggleButton is the interactive part for toggle.
                           // If the whole row should be clickable to toggle, widgetContent should be a button.
                           // For now, only the visual switch part is clickable for toggle.
            ...(resetButton ? [button({
                className: 'configtoggle-reset', // Ensure SCSS
                onClicked: async () => {
                    const newValue = await onReset(); // onReset should ideally return the new value or undefined
                    const fetchedVal = await fetchValue(); // fetchValue gets the default/reset value
                    setEnabled(fetchedVal); // Set to the fetched default value
                },
                child: MaterialIcon({ icon: 'settings_backup_restore', size: 'small' }),
                setup: setupCursorHover,
            })] : []),
        ]
    });
}
