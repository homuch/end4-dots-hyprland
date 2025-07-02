import Gtk from 'gi://Gtk?version=4.0';
import { box, label, progressbar, revealer } from 'ags/widgets';
import { createEffect, createBinding, createState } from 'ags';

import Audio from '../../services/audioService.js';         // Fake service
import Brightness from '../../services/brightnessService.js'; // Fake service
import Indicator from '../../services/indicatorService.js';   // Fake service (for popup state)
import MaterialIcon from '../common/MaterialIcon.js';
// import { MarginRevealer } from '../AdvancedRevealers.js'; // Problematic, using standard revealer

// getString placeholder
const getString = (str) => str; // TODO: i18n

const OsdValue = ({
    name, // string
    icon, // string (MaterialIcon name)
    name_accessor, // Optional accessor for dynamic name
    value_accessor, // Accessor for numeric value (0-100 for label, 0-1 for progressbar)
    icon_accessor, // Optional accessor for dynamic icon
    extraClassName = '',
    extraProgressClassName = '',
    ...rest
}) => {
    const valueName = label({
        xalign: 0, yalign: 0, hexpand: true,
        className: 'osd-label', // Ensure SCSS
        label: name_accessor || name, // Bind to accessor or use static name
    });

    const valueNumber = label({
        hexpand: false, className: 'osd-value-txt', // Ensure SCSS
        label: value_accessor.transform(v => `${Math.round(v * 100)}`), // Assuming value_accessor is 0-1, display as 0-100
    });

    return box({
        ...rest,
        hexpand: true,
        className: `osd-bg osd-value ${extraClassName} spacing-h-5`, // Ensure SCSS
        children: [
            MaterialIcon({
                icon: icon_accessor || icon, // Bind to accessor or use static icon
                size: 'hugeass', // Original size
                vpack: 'center'
            }),
            box({
                vertical: true,
                className: 'spacing-v-5', // Ensure SCSS
                vpack: 'center',
                children: [
                    box({
                        children: [ valueName, valueNumber ]
                    }),
                    progressbar({ // AGS v2 progressbar
                        className: `osd-progress ${extraProgressClassName}`, // Ensure SCSS
                        hexpand: true,
                        // vertical: false, // Default for Gtk.ProgressBar
                        value: value_accessor, // Bind directly to 0-1 value accessor
                    })
                ]
            })
        ],
    });
};

export default function IndicatorValuesDisplay({ monitor = 0 } = {}) {
    const brightnessNameAccessor = createState(getString('Brightness'))[0]; // Example if name needed to be dynamic
    const volumeNameAccessor = createState(getString('Volume'))[0];

    // Brightness icon can be static 'light_mode'
    // Volume icon changes based on mute state and volume level
    const volumeIconAccessor = createBinding(
        [Audio.speaker._muted_accessor, Audio.speaker._volume_accessor], // Use internal accessors from fake service
        (muted, vol) => {
            if (muted || vol === 0) return 'volume_off';
            if (vol < 0.1) return 'volume_mute'; // Typically very low
            if (vol < 0.5) return 'volume_down';
            return 'volume_up';
        },
        'volume_up' // Initial icon
    );

    // Update volume name based on device (headphones/speakers)
    // This was complex in original. Simplified: assume name doesn't change often or is static.
    // If dynamic name is needed, Audio service should provide an accessor for current output name.
    // For now, static names.

    const brightnessIndicator = OsdValue({
        name: getString('Brightness'), // i18n
        icon: 'light_mode',
        extraClassName: 'osd-brightness',
        extraProgressClassName: 'osd-brightness-progress',
        value_accessor: Brightness.getMonitorApi(monitor).screen_value_accessor, // Assuming this is 0-1
    });

    const volumeIndicator = OsdValue({
        name: getString('Volume'), // i18n, could be dynamic based on Audio.speaker.description
        icon_accessor: volumeIconAccessor,
        extraClassName: 'osd-volume',
        extraProgressClassName: 'osd-volume-progress',
        value_accessor: Audio.speaker._volume_accessor, // Direct accessor from fake service (0-1)
    });

    return revealer({ // Replacing MarginRevealer
        transition: Gtk.RevealerTransitionType.SLIDE_DOWN,
        // Bind revealChild to Indicator.state.visible and ensure type matches (e.g. type 1 for these)
        revealChild: Indicator.state.transform(s => s.visible && s.type === 1),
        // Original MarginRevealer had showClass/hideClass for animations.
        // Standard revealer handles its own animation.
        // If specific classes are needed on the content during reveal, that's more complex.
        child: box({
            hpack: 'center',
            vertical: false, // Original was false
            className: 'indicator-values-box spacing-h--10', // Ensure SCSS. Original had spacing-h--10
            children: [
                brightnessIndicator,
                volumeIndicator,
            ]
        })
    });
}
