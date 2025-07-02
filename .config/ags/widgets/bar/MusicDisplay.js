import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import App from 'ags/app';
import { box, button, eventbox, label, overlay, revealer } from 'ags/widgets';
import { execAsync, exec } from 'ags/process';
import { createPoll, createBinding, createEffect, createState } from 'ags';
// Using AGS v2 Mpris service
import Mpris from 'ags/service/mpris';
// Mpris service is imported, no longer fake.

import { options as userOptions } from '../../options.js';
import { showMusicControls, toggleMusicControls, setMusicControlsVisible } from '../../services/uiService.js';

// Placeholders for common widgets that need migration
const PlaceholderWidget = (name, props = {}) => box({ ...props, children: [label({ label: `PH: ${name}` })] }); // label is AgsLabel here, assuming 'label' is imported or intrinsic
import AnimatedCircProg from '../../common/AnimatedCircularProgress.js'; // Import actual component
import MaterialIcon from '../../common/MaterialIcon.js'; // Import actual component


const CUSTOM_MODULE_CONTENT_INTERVAL_FILE = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-interval.txt`;
const CUSTOM_MODULE_CONTENT_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-poll.sh`;
const CUSTOM_MODULE_LEFTCLICK_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-leftclick.sh`;
const CUSTOM_MODULE_RIGHTCLICK_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-rightclick.sh`;
const CUSTOM_MODULE_MIDDLECLICK_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-middleclick.sh`;
const CUSTOM_MODULE_SCROLLUP_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-scrollup.sh`;
const CUSTOM_MODULE_SCROLLDOWN_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-scrolldown.sh`;

function trimTrackTitle(title) {
    if (!title) return '';
    const cleanPatterns = [
        /【[^】]*】/,
        " [FREE DOWNLOAD]",
    ];
    let newTitle = title;
    cleanPatterns.forEach((expr) => newTitle = newTitle.replace(expr, ''));
    return newTitle;
}

function adjustVolume(direction) {
    const step = 0.1;
    const player = Mpris.player.value; // Get current player instance from accessor
    if (player && typeof player.volume !== 'undefined') {
        let newVolume = player.volume + (direction === 'up' ? step : -step);
        newVolume = Math.max(0, Math.min(1, newVolume));
        player.volume = newVolume;
    } else {
        // console.warn("Cannot adjust volume: No player or player.volume undefined.");
    }
}

const BarGroup = ({ children }) => box({
    className: 'bar-group-margin bar-sides',
    children: [
        box({
            className: `bar-group ${userOptions.appearance?.borderless ? '-borderless' : ''} bar-group-standalone bar-group-pad-system`,
            children: children,
        }),
    ]
});

// BarResource using createPoll
const BarResource = ({ name, icon, command, circprogClassName = '', textClassName = 'txt-onSurfaceVariant', iconClassName = 'bar-batt' }) => {
    const circProgRef = { widget: null }; // To hold the widget instance for direct CSS manipulation if needed

    // Poll the command
    const pollData = createPoll(
        userOptions.bar?.resourcePollInterval || 5000, // Make interval configurable
        () => {
            try {
                const output = exec(command); // Assuming sync exec is fine for quick commands
                const value = parseFloat(output);
                return isNaN(value) ? 0 : value;
            } catch (e) {
                // console.warn(`Error polling for ${name}: ${e}`);
                return 0;
            }
        },
        0 // initial value
    );

    return button({
        onClicked: () => execAsync([userOptions.apps?.taskManager || 'gnome-system-monitor']).catch(print),
        tooltipText: pollData.transform(v => `${name}: ${Math.round(v)}%`),
        child: box({
            className: `spacing-h-4 ${textClassName}`,
            children: [
                overlay({
                    child: box({
                        vpack: 'center',
                        className: iconClassName,
                        homogeneous: true,
                        children: [MaterialIcon(icon, 'small')],
                    }),
                    overlays: [
                        AnimatedCircProg({
                            className: `${circprogClassName} ${userOptions.appearance?.borderless ? 'bar-batt-circprog-borderless' : ''}`,
                            vpack: 'center',
                            hpack: 'center',
                            // Bind value to pollData
                            // Assuming AnimatedCircProg takes a 'value' prop (0-100)
                            value: pollData,
                            // Original used CSS font-size. If AnimatedCircProg still needs that:
                            // $: (self) => circProgRef.widget = self, // then use createEffect for CSS
                        }),
                    ]
                }),
                label({
                    className: `txt-smallie ${textClassName}`,
                    label: pollData.transform(v => `${Math.round(v)}%`),
                }),
            ],
        })
    });
};


const TrackProgress = () => {
    // Use Mpris.player accessor
    const currentPlayer = Mpris.player;

    const progressValue = currentPlayer.transform(p => {
        if (!p || typeof p.position === 'undefined' || typeof p.length === 'undefined' || p.length === 0) {
            return 0;
        }
        // Assuming p.position and p.length are direct reactive properties (or already accessors)
        // If they are GObject properties that need binding for updates within this transform,
        // this specific transform won't be reactive to sub-property changes, only to player changes.
        // For full reactivity:
        // const position = createBinding([p], current_player => current_player?.position || 0);
        // const length = createBinding([p], current_player => current_player?.length || 1);
        // Then bind these to the calculation.
        // However, AGS services usually make these properties on the player object directly reactive.
        return Math.max(0, Math.min(100, (p.position / p.length) * 100));
    });

    // If player properties (position, length) are not themselves accessors on the player object,
    // but GObject properties, then TrackProgress would need to take the player object
    // and create its own bindings:
    // e.g. TrackProgress = ({ player }) => { if(!player) return null; const pos = createBinding(player, 'position'); ... }
    // For now, assuming Mpris.player.transform gives a player whose .position & .length are reactive.

    return AnimatedCircProg({
        className: `bar-music-circprog ${userOptions.appearance?.borderless ? 'bar-music-circprog-borderless' : ''}`,
        vpack: 'center', hpack: 'center',
        value_accessor: progressValue, // Pass the accessor to AnimatedCircularProgress
    });
};

export default function MusicDisplay() {
    // Mpris.player is an accessor for the current preferred player (or null)
    const currentPlayer = Mpris.player;

    const playPauseLabel = label({
        vpack: 'center',
        className: 'bar-music-playstate-txt',
        justification: 'center',
        label: currentPlayer.transform(p => (p && p.play_back_status === 'Playing' ? 'pause' : 'play_arrow')),
    });

    const playingStateBox = box({
        vpack: 'center',
        className: 'bar-music-playstate', // Base class
        homogeneous: true,
        children: [playPauseLabel],
        setup: self => createEffect(() => { // Use setup for effects on the widget instance
            const playerInstance = currentPlayer.value;
            if (playerInstance) {
                // Assuming playerInstance.play_back_status is also an accessor or GObject prop
                // If it's a direct value that changes, this effect won't re-run unless currentPlayer itself changes.
                // For true reactivity, playerInstance.play_back_status needs to be an accessor.
                // Let's assume Mpris service provides player instances whose properties are reactive.
                const status = playerInstance.play_back_status;
                self.toggleClassName('bar-music-playstate-playing', status === 'Playing');
            } else {
                self.toggleClassName('bar-music-playstate-playing', false);
            }
        }, [currentPlayer, currentPlayer.transform(p => p?.play_back_status)]) // React to player change and its status
    });

    const trackTitleLabel = label({
        hexpand: true,
        className: 'txt-smallie bar-music-txt',
        truncate: 'end',
        maxWidthChars: 1, // Adjust for better display; or use wrap and ellipsize
        label: currentPlayer.transform(p => {
            if (!p || !p.track_title) return userOptions.language?.noMedia || 'No media';
            return `${trimTrackTitle(p.track_title)} • ${(p.track_artists || []).join(', ')}`;
        }),
    });

    const musicStuff = box({
        className: 'spacing-h-10',
        hexpand: true,
        children: [
            overlay({
                child: playingStateBox,
                overlays: [TrackProgress()] // TrackProgress needs to use Mpris.player too
            }),
            trackTitleLabel,
        ]
    });

    const CustomModule = () => {
        // ... (CustomModule logic remains largely the same, using exec, createPoll)
        const intervalFileContent = GLib.file_test(CUSTOM_MODULE_CONTENT_INTERVAL_FILE, GLib.FileTest.EXISTS) ?
            exec(`cat ${CUSTOM_MODULE_CONTENT_INTERVAL_FILE}`) : '5000';
        const interval = parseInt(intervalFileContent) || 5000;
        const customLabelContent = createPoll(interval, () => exec(CUSTOM_MODULE_CONTENT_SCRIPT), "");
        return BarGroup({ /* ... */ child: button({ child: label({ label: customLabelContent, ... }) }) });
    };

    const SystemResources = () => revealer({
        transition: Gtk.RevealerTransitionType.SLIDE_LEFT,
        transitionDuration: userOptions.animations?.durationLarge || 150,
        child: box({ /* ... BarResource children ... */ }),
        revealChild: currentPlayer.transform(p =>
            (!p || p.play_back_status !== 'Playing' || userOptions.bar?.alwaysShowFullResources)
        ),
    });

    const systemOrCustom = GLib.file_test(CUSTOM_MODULE_CONTENT_SCRIPT, GLib.FileTest.EXISTS) ?
        CustomModule() :
        BarGroup({ /* ... BarResource and SystemResources ... */ });

    return eventbox({
        onScrollUp: () => adjustVolume('up'), // adjustVolume needs to use Mpris.player
        onScrollDown: () => adjustVolume('down'), // adjustVolume needs to use Mpris.player
        child: box({
            className: 'spacing-h-4',
            children: [
                systemOrCustom,
                eventbox({
                    child: BarGroup({ children: [musicStuff] }),
                    onPrimaryClick: () => toggleMusicControls(),
                    onSecondaryClick: () => execAsync(['bash', '-c', 'playerctl next || playerctl position `bc <<< "100 * $(playerctl metadata mpris:length) / 1000000 / 100"` &']).catch(print),
                    onMiddleClick: () => execAsync('playerctl play-pause').catch(print),
                    setup: (self) => { // For side mouse buttons (button 8)
                        const controller = Gtk.EventControllerGesture.new();
                        controller.set_button(0); // Listen for all buttons
                        controller.connect('pressed', (gesture, nPress, x, y) => {
                            if (gesture.get_current_button() === 8) { // 8 is often a side button (back)
                                execAsync('playerctl previous').catch(print);
                            }
                        });
                        self.add_controller(controller);
                    }
                })
            ]
        })
    });
}
