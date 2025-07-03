import { box, label } from 'ags/widgets';

export default function AudioControlsDisplay() {
    return (
        <box vertical={true} vexpand={true} hexpand={true} class="padding-10">
            <label label="Audio Controls Placeholder" class="txt-large" />
            {/* TODO: Sliders for volume, input, app mixer etc. */}
        </box>
    );
}
