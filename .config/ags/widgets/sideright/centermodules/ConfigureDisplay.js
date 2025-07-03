import { box, label } from 'ags/widgets';
// This module likely used AgsToggle, AgsSpinButton etc. from AppConfigWidgets.
// For placeholder, just a label.
// import { AgsToggle, AgsSpinButton } from '../../../common/AppConfigWidgets.js';

export default function ConfigureDisplay() {
    return (
        <box vertical={true} vexpand={true} hexpand={true} class="padding-10">
            <label label="Quick Config Placeholder" class="txt-large" />
            {/* TODO: Display various AgsToggle, AgsSpinButton for user options */}
            {/* Example: <AgsToggle option="appearance.borderless" name="Borderless Windows" /> */}
        </box>
    );
}
