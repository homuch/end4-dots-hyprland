import GLib from 'gi://GLib';
import { Gtk, Pango } from 'ags/gtk4'; // Corrected Gtk import, added Pango
import { app } from 'ags/gtk4/app'; // Corrected app import
// Intrinsics <box>, <button>, <eventbox>, <label>, <overlay>, <revealer> are used
import { execAsync, exec } from 'ags/process';
import { createPoll, createBinding, createEffect, createState } from 'ags';
import Mpris from 'ags/service/mpris';

import { options as userOptions } from '../../options.js';
import { showMusicControls, toggleMusicControls } from '../../services/uiService.js';

import AnimatedCircProg from '../../common/AnimatedCircularProgress.js';
import MaterialIcon from '../../common/MaterialIcon.js';
import { BarGroup, BarResource } from './commonBarItems.js'; // Import common items

// getString placeholder
const getString = (str) => str; // TODO: i18n

const CUSTOM_MODULE_CONTENT_INTERVAL_FILE = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-interval.txt`;
const CUSTOM_MODULE_CONTENT_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-poll.sh`;
const CUSTOM_MODULE_LEFTCLICK_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-leftclick.sh`;
const CUSTOM_MODULE_RIGHTCLICK_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-rightclick.sh`;
const CUSTOM_MODULE_MIDDLECLICK_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-middleclick.sh`;
const CUSTOM_MODULE_SCROLLUP_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-scrollup.sh`;
const CUSTOM_MODULE_SCROLLDOWN_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-scrolldown.sh`;


function trimTrackTitle(title) {
    if (!title) return '';
    const cleanPatterns = [ /【[^】]*】/, " [FREE DOWNLOAD]" ];
    let newTitle = title;
    cleanPatterns.forEach((expr) => newTitle = newTitle.replace(expr, ''));
    return newTitle;
}

function adjustVolume(direction) {
    const step = 0.1;
    const player = Mpris.player.value;
    if (player && typeof player.volume === 'number') { // Check if volume is a number
        let newVolume = player.volume + (direction === 'up' ? step : -step);
        newVolume = Math.max(0, Math.min(1, newVolume));
        player.volume = newVolume;
    }
}

const TrackProgress = () => {
    const currentPlayer = Mpris.player;
    const progressValue = currentPlayer.transform(p => {
        if (!p || typeof p.position !== 'number' || typeof p.length !== 'number' || p.length === 0) return 0;
        return Math.max(0, Math.min(100, (p.position / p.length) * 100));
    });
    return (
        <AnimatedCircProg
            class={`bar-music-circprog ${userOptions.appearance?.borderless ? 'bar-music-circprog-borderless' : ''}`}
            vpack={Gtk.Align.CENTER} hpack={Gtk.Align.CENTER}
            value_accessor={progressValue}
        />
    );
};

export default function MusicDisplay() {
    const currentPlayer = Mpris.player;

    const playPauseLabel = <label
        vpack={Gtk.Align.CENTER}
        class='bar-music-playstate-txt'
        justify={Gtk.Justification.CENTER}
        label={currentPlayer.transform(p => (p && p.play_back_status === 'Playing' ? 'pause' : 'play_arrow'))}
    />;

    const playingStateBox = (
        <box
            vpack={Gtk.Align.CENTER}
            class='bar-music-playstate'
            homogeneous={true}
            $={self => createEffect(() => {
                const playerInstance = currentPlayer.value;
                const status = playerInstance?.play_back_status; // Access GObject property directly
                self.toggleClassName('bar-music-playstate-playing', status === 'Playing');
            }, [currentPlayer.transform(p => p?.play_back_status)])} // React to player or its status change
        >
            {playPauseLabel}
        </box>
    );

    const trackTitleLabel = <label
        hexpand={true}
        class='txt-smallie bar-music-txt'
        truncate='end'
        ellipsize={Pango.EllipsizeMode.END}
        maxWidthChars={userOptions.music?.trackDescriptionChars || 30} // Increased default
        label={currentPlayer.transform(p => {
            if (!p || !p.track_title) return getString('No media'); // track_title for GObject
            return `${trimTrackTitle(p.track_title)} • ${(p.track_artists || []).join(', ')}`; // track_artists for GObject
        })}
    />;

    const musicStuff = (
        <box class='spacing-h-10' hexpand={true}>
            <overlay $type="child" child={playingStateBox}>
                 <TrackProgress $type="overlay"/>
            </overlay>
            {trackTitleLabel}
        </box>
    );

    const CustomModule = () => {
        const intervalFileContent = GLib.file_test(CUSTOM_MODULE_CONTENT_INTERVAL_FILE, GLib.FileTest.EXISTS) ?
            exec(`cat ${CUSTOM_MODULE_CONTENT_INTERVAL_FILE}`) : '5000';
        const interval = parseInt(intervalFileContent) || 5000;
        const customLabelContent = createPoll(interval, () => exec(CUSTOM_MODULE_CONTENT_SCRIPT), "");
        return (
            <BarGroup>
                <button
                    onPrimaryClick={() => execAsync(CUSTOM_MODULE_LEFTCLICK_SCRIPT).catch(print)} // onClicked is simpler
                    onSecondaryClick={() => execAsync(CUSTOM_MODULE_RIGHTCLICK_SCRIPT).catch(print)}
                    onMiddleClick={() => execAsync(CUSTOM_MODULE_MIDDLECLICK_SCRIPT).catch(print)}
                    onScrollUp={() => execAsync(CUSTOM_MODULE_SCROLLUP_SCRIPT).catch(print)}
                    onScrollDown={() => execAsync(CUSTOM_MODULE_SCROLLDOWN_SCRIPT).catch(print)}
                >
                    <label class='txt-smallie txt-onSurfaceVariant' useMarkup={true} label={customLabelContent} />
                </button>
            </BarGroup>
        );
    };

    const SystemResourcesRevealer = () => (
        <revealer
            transition={Gtk.RevealerTransitionType.SLIDE_LEFT}
            transitionDuration={userOptions.animations?.durationLarge || 150}
            revealChild={currentPlayer.transform(p =>
                (!p || p?.play_back_status !== 'Playing' || userOptions.bar?.alwaysShowFullResources)
            )}
        >
            <box class='spacing-h-10 margin-left-10'>
                <BarResource name={getString('RAM Usage')} icon='memory' command={`LANG=C free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`}
                    circprogClassName={`bar-ram-circprog ${userOptions.appearance?.borderless ? 'bar-ram-circprog-borderless' : ''}`} textClassName='bar-ram-txt' iconClassName='bar-ram-icon'/>
                <BarResource name={getString('Swap Usage')} icon='swap_horiz' command={`LANG=C free | awk '/^Swap/ {if ($2 > 0) printf("%.2f\\n", ($3/$2) * 100); else print "0";}'`}
                    circprogClassName={`bar-swap-circprog ${userOptions.appearance?.borderless ? 'bar-swap-circprog-borderless' : ''}`} textClassName='bar-swap-txt' iconClassName='bar-swap-icon'/>
                <BarResource name={getString('CPU Usage')} icon='settings_motion_mode' command={`LANG=C top -bn1 | grep Cpu | sed 's/\\,/\\./g' | awk '{print $2}'`}
                    circprogClassName={`bar-cpu-circprog ${userOptions.appearance?.borderless ? 'bar-cpu-circprog-borderless' : ''}`} textClassName='bar-cpu-txt' iconClassName='bar-cpu-icon'/>
            </box>
        </revealer>
    );

    const systemOrCustom = GLib.file_test(CUSTOM_MODULE_CONTENT_SCRIPT, GLib.FileTest.EXISTS) ?
        <CustomModule /> :
        <BarGroup>
            <box>
                 <BarResource name={getString('RAM Usage')} icon='memory' command={`LANG=C free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`}
                    circprogClassName={`bar-ram-circprog ${userOptions.appearance?.borderless ? 'bar-ram-circprog-borderless' : ''}`} textClassName='bar-ram-txt' iconClassName='bar-ram-icon'/>
                <SystemResourcesRevealer />
            </box>
        </BarGroup>;

    return (
        <eventbox // Replace with <box> and Gtk.GestureClick/Scroll if eventbox is not available or problematic
            onScrollUp={() => adjustVolume('up')}
            onScrollDown={() => adjustVolume('down')}
        >
            <box class='spacing-h-4'>
                {systemOrCustom}
                <eventbox // This one too
                    onPrimaryClick={() => toggleMusicControls()}
                    onSecondaryClick={() => execAsync(['bash', '-c', 'playerctl next || playerctl position `bc <<< "100 * $(playerctl metadata mpris:length) / 1000000 / 100"` &']).catch(print)}
                    onMiddleClick={() => execAsync('playerctl play-pause').catch(print)}
                    $={self => {
                        const controller = Gtk.EventControllerGesture.new();
                        controller.set_button(0);
                        controller.connect('pressed', (gesture, nPress, x, y) => {
                            if (gesture.get_current_button() === 8) {
                                execAsync('playerctl previous').catch(print);
                            }
                        });
                        self.add_controller(controller);
                    }}
                >
                    <BarGroup>{musicStuff}</BarGroup>
                </eventbox>
            </box>
        </eventbox>
    );
}
