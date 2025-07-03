// Common items used within Bar sub-modules
import { Gtk } from 'ags/gtk4'; // For Gtk.Align if needed by children, not directly by BarGroup
// No direct import for <box> intrinsic
import { options as userOptions } from '../../options.js';

export const BarGroup = ({ children, class: B_class = '', ...rest  }) => ( // Added class prop
    <box {...rest} class={`bar-group-margin bar-sides ${B_class}`}>
        <box
            class={`bar-group ${userOptions.appearance?.borderless ? '-borderless' : ''} bar-group-standalone bar-group-pad-system`}
        >
            {children}
        </box>
    </box>
);

// If BarResource becomes common, it would go here too,
// but it's currently defined slightly differently or with different dependencies in MusicDisplay vs SystemDisplay.
// For now, only BarGroup.

import { Gtk } from 'ags/gtk4';
import { button, box, overlay, label } from 'ags/widgets';
import { exec, execAsync } from 'ags/process'; // exec for polling, execAsync for onClicked
import { createPoll } from 'ags/time'; // Corrected: createPoll from ags/time
import MaterialIcon from '../../common/MaterialIcon.js'; // For BarResource
import AnimatedCircProg from '../../common/AnimatedCircularProgress.js'; // For BarResource

export const BarResource = ({ name, icon, command, circprogClassName = '', textClassName = 'txt-onSurfaceVariant', iconClassName = 'bar-batt', onClickedCommand }) => {
    const pollData = createPoll(
        userOptions.bar?.resourcePollInterval || 5000,
        () => {
            try {
                const output = exec(command);
                const value = parseFloat(output);
                return isNaN(value) ? 0 : (value > 100 ? 100 : (value < 0 ? 0 : value)); // Clamp 0-100
            } catch (e) { return 0; }
        },
        0
    );

    return (
        <button
            onClicked={() => {
                if (onClickedCommand) execAsync(onClickedCommand).catch(print);
                else execAsync(userOptions.apps?.taskManager || 'gnome-system-monitor').catch(print);
            }}
            tooltipText={pollData.transform(v => `${name}: ${Math.round(v)}%`)}
        >
            <box class={`spacing-h-4 ${textClassName}`}>
                <overlay>
                    <box $type="child" vpack={Gtk.Align.CENTER} class={iconClassName} homogeneous={true}>
                        <MaterialIcon icon={icon} size='small' />
                    </box>
                    <AnimatedCircProg
                        $type="overlay"
                        class={`${circprogClassName} ${userOptions.appearance?.borderless ? 'bar-batt-circprog-borderless' : ''}`}
                        vpack={Gtk.Align.CENTER} hpack={Gtk.Align.CENTER}
                        value_accessor={pollData}
                    />
                </overlay>
                <label class={`txt-smallie ${textClassName}`} label={pollData.transform(v => `${Math.round(v)}%`)} />
            </box>
        </button>
    );
};
// Need to import userOptions for BarResource default poll interval. It's already imported for BarGroup.
