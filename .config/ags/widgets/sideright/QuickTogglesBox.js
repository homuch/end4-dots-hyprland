import { Gtk } from 'ags/gtk4';
import { box, button, label } from 'ags/widgets';
import MaterialIcon from '../../common/MaterialIcon.js';
import { options as userOptions } from '../../../options.js';

// Placeholder for individual toggle button components
// These would typically interact with services (Network, Bluetooth, custom scripts, etc.)
const ToggleButtonPlaceholder = ({ icon, name, initialValue = false }) => {
    // const [toggled, setToggled] = createState(initialValue); // Internal state for a fake toggle
    return (
        <button
            class="quicktoggle-button" // Ensure SCSS
            // onClicked={() => setToggled(v => !v)}
            tooltipText={name}
        >
            <box vertical={true} class="spacing-v-5" hpack={Gtk.Align.CENTER} vpack={Gtk.Align.CENTER}>
                <MaterialIcon
                    icon={icon}
                    size="larger" // Ensure SCSS size
                    // class={toggled.transform(t => t ? "quicktoggle-icon-active" : "")}
                />
                <label label={name} class="txt-tiny" />
            </box>
        </button>
    );
};

// Based on userOptions.sidebar.quickToggles.order
const configuredToggles = userOptions.sidebar?.quickToggles?.order ||
    ['wifi', 'bluetooth', 'nightlight', 'gamemode', 'idleinhibitor', 'cloudflarewarp']; // Default order

// Map keys to icons and names (could be more structured)
const toggleData = {
    'wifi': { icon: 'wifi', name: 'Wi-Fi' },
    'bluetooth': { icon: 'bluetooth', name: 'Bluetooth' },
    'nightlight': { icon: 'night_sight_auto', name: 'Night Light' },
    'gamemode': { icon: 'stadia_controller', name: 'Game Mode' },
    'idleinhibitor': { icon: 'coffee', name: 'Caffeine' }, // Assuming 'coffee' for idle inhibitor
    'cloudflarewarp': { icon: 'cloud', name: 'Cloudflare Warp' }, // Assuming generic cloud
    // Add others as needed from original quicktoggles.js like rawinput, touchpad etc.
    'rawinput': {icon: 'mouse', name: 'Raw Input'},
    'touchpad': {icon: 'touchpad_mouse', name: 'Touchpad Typing'},
    // ... any other toggles from the original QUICK_TOGGLES map
};


export default function QuickTogglesBox() {
    return (
        <box class="quicktoggles-box spacing-h-10" hpack={Gtk.Align.CENTER}> {/* Ensure SCSS */}
            {configuredToggles.map(key => {
                const data = toggleData[key];
                if (!data) return null; // Skip if no data for this key
                return <ToggleButtonPlaceholder icon={data.icon} name={data.name} />;
            }).filter(Boolean)}
        </box>
    );
}

// Need createState if individual toggles have internal state for demo
import { createState } from 'ags';
