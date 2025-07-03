import { Gtk } from 'ags/gtk4'; // For Gtk.Orientation, Gtk.Align
import { box, label, slider as AgsSlider, icon as AgsIcon, button } from 'ags/widgets';
import { createBinding } from 'ags';

import Audio from '../../../services/audioService.js'; // Corrected path
import MaterialIcon from '../../common/MaterialIcon.js'; // For icons
import { setupCursorHover } from '../../../utils/cursorHover.js';

// getString placeholder
const getString = (str) => str; // TODO: i18n

const VolumeSlider = ({ stream, type = 'speaker' }) => {
    if (!stream) {
        return box({ child: label({ label: `${type === 'speaker' ? "Output" : "Input"} device not available`}) });
    }

    const volumeIcon = AgsIcon({
        className: 'audio-control-icon', // Ensure SCSS
        // size: 24, // Or use CSS
        icon: createBinding([stream], s => {
            if (!s || s.mute) return type === 'speaker' ? 'volume_off' : 'mic_off';
            if (s.volume <= 0) return type === 'speaker' ? 'volume_mute' : 'mic_off'; // Or specific mic mute icon
            if (type === 'microphone') return 'mic'; // General mic on icon
            if (s.volume < 0.33) return 'volume_mute';
            if (s.volume < 0.66) return 'volume_down';
            return 'volume_up';
        }, ''),
    });

    const volumeSlider = AgsSlider({
        className: 'audio-control-slider', // Ensure SCSS
        hexpand: true,
        drawValue: false,
        value: stream.bind('volume'), // Bind directly to GObject property
        min: 0,
        max: 1,
        step: 0.01,
        // onChange: ({ value }) => stream.volume = value, // Direct binding handles this
    });

    const muteButton = button({
        className: 'audio-control-mute-button', // Ensure SCSS
        onClicked: () => stream.mute = !stream.mute,
        child: MaterialIcon({ icon: stream.bind('mute').transform(m => m ? (type === 'speaker' ? 'volume_off' : 'mic_off') : (type === 'speaker' ? 'volume_up' : 'mic')) }),
        setup: setupCursorHover,
    });

    return box({
        className: `audio-device-control spacing-h-10 ${type}-control`, // Ensure SCSS
        children: [
            volumeIcon,
            volumeSlider,
            muteButton,
            label({ // Percentage display
                className: 'audio-control-percentage', // Ensure SCSS
                label: stream.bind('volume').transform(v => `${Math.round(v * 100)}%`),
            })
        ]
    });
};

export default function AudioControlsDisplay() {
    // TODO: Add device selection dropdowns using Audio.speakers and Audio.microphones
    // For now, controls default speaker and microphone.

    return (
        <box vertical={true} vexpand={true} hexpand={true} class="audio-controls-display padding-10 spacing-v-15">
            <label label={getString("Volume Control")} class="txt-large category-title" hpack={Gtk.Align.START} />

            {/* Speaker Controls */}
            <box vertical={true} class="audio-device-section spacing-v-5">
                <label label={getString("Output")} class="txt-norm sub-category-title" hpack={Gtk.Align.START} />
                {Audio.speaker ? VolumeSlider({ stream: Audio.speaker, type: 'speaker' }) : box({child: label("No default speaker found.")}) }
            </box>

            {/* Microphone Controls */}
            <box vertical={true} class="audio-device-section spacing-v-5">
                <label label={getString("Input")} class="txt-norm sub-category-title" hpack={Gtk.Align.START} />
                 {Audio.microphone ? VolumeSlider({ stream: Audio.microphone, type: 'microphone' }) : box({child: label("No default microphone found.")}) }
            </box>

            {/* TODO: Application Volume Mixer */}
            {/* <box vertical={true} class="audio-device-section spacing-v-5">
                <label label="Application Mixer" class="txt-norm sub-category-title" hpack="start" />
                <label label="(Placeholder)" class="txt-small" />
            </box> */}
        </box>
    );
}
