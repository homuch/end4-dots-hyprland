import { Gtk, Gdk, GLib, Pango } from 'ags/gtk4';
import { app } from 'ags/gtk4/app';
import { box, label, button, icon as AgsIcon, revealer, overlay } from 'ags/widgets';
import { createState, createEffect, createBinding, Utils } from 'ags'; // Utils for timeout
import { execAsync, exec } from 'ags/process'; // For scripts
import { writeFileAsync } from 'ags/file'; // For writing color scheme file

import Mpris from 'ags/service/mpris';
import { options as userOptions } from '../../../options.js';
import { showMusicControls } from '../../../services/uiService.js'; // To control visibility
import { darkMode } from '../../../utils/system.js'; // For dark/light mode in color gen
import { fileExists } from '../../../utils/fileUtils.js';
import { setupCursorHover } from '../../../utils/cursorHover.js';

import MaterialIcon from '../../common/MaterialIcon.js';
import AnimatedCircularProgress from '../../common/AnimatedCircularProgress.js';

// From original musiccontrols.js
const COMPILED_STYLE_DIR = `${GLib.get_user_cache_dir()}/ags/user/generated`; // Used by original applyCss
const LIGHTDARK_FILE_LOCATION = `${GLib.get_user_state_dir()}/ags/user/colormode.txt`; // Not directly used here but by scripts
const COVER_COLORSCHEME_SUFFIX = '_colorscheme.css';
var lastCoverPath = ''; // Module level variable to track cover changes

const getString = (str) => str; // TODO: i18n

function isRealPlayer(player) { // From original
    return !player.bus_name?.startsWith('org.mpris.MediaPlayer2.playerctld') &&
           !(player.bus_name?.endsWith('.mpd') && !player.bus_name?.endsWith('MediaPlayer2.mpd'));
}

// Original used Mpris.getPlayer(userOptions.music.preferredPlayer) || Mpris.players[0]
// Mpris.player accessor should handle preferred player logic.
// const getPlayer = () => Mpris.player.value; // Get current player instance

function lengthStr(lengthInSeconds) {
    const min = Math.floor(lengthInSeconds / 60);
    const sec = Math.floor(lengthInSeconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function detectMediaSource(link) { // From original
    if (!link || typeof link !== 'string') return 'unknown';
    if (link.startsWith("file://")) {
        if (link.includes('firefox-mpris')) return '󰈹 Firefox'; // Icon font character
        return "󰈣 File"; // Icon font character
    }
    try {
        let url = link.replace(/(^\w+:|^)\/\//, '');
        let domain = url.match(/(?:[a-z]+\.)?([a-z0-9-]+\.[a-z]+)/i)?.[1] || url.split('/')[0]; // Extract domain
        if (domain === 'ytimg.com' || domain === 'youtube.com' || domain === 'youtu.be') return '󰗃 Youtube';
        if (domain === 'discordapp.net') return '󰙯 Discord';
        if (domain === 'sndcdn.com' || domain === 'soundcloud.com') return '󰓀 SoundCloud';
        return domain.charAt(0).toUpperCase() + domain.slice(1); // Capitalize
    } catch (e) { return 'unknown'; }
}

const DEFAULT_MUSIC_FONT = userOptions.font?.font || 'Gabarito, sans-serif'; // Use global font or specific
function getTrackfont(player) { // From original
    if (!player) return DEFAULT_MUSIC_FONT;
    const title = player.track_title || "";
    const artists = (player.track_artists || []).join(' ');
    if (artists.includes('TANO*C') || artists.includes('USAO') || artists.includes('Kobaryo')) return 'Chakra Petch';
    if (title.includes('東方')) return 'Crimson Text, serif';
    return DEFAULT_MUSIC_FONT;
}
function trimTrackTitle(title) { // From original
    if (!title) return '';
    const cleanPatterns = [ /【[^】]*】/, " [FREE DOWNLOAD]" ];
    let newTitle = title;
    cleanPatterns.forEach((expr) => newTitle = newTitle.replace(expr, ''));
    return newTitle;
}

const TrackProgressDisplay = ({ player }) => { // Renamed, expects player object
    const progressValue = createBinding([player], p => { // Rebind if player changes
        if (!p || typeof p.position !== 'number' || typeof p.length !== 'number' || p.length === 0) return 0;
        return Math.max(0, Math.min(100, (p.position / p.length) * 100));
    });
    // Original polled, but Mpris service should provide reactive position/length
    // If not, a createPoll wrapping player.position/length would be needed here.
    return (
        <AnimatedCircularProgress
            class='osd-music-circprog' // Ensure SCSS
            vpack={Gtk.Align.CENTER} hpack={Gtk.Align.CENTER}
            value_accessor={progressValue}
        />
    );
};

const TrackTitleDisplay = ({ player }) => ( // Expects player object
    <label
        label={createBinding([player], p =>
            (p && p.track_title) ? trimTrackTitle(p.track_title) : getString('No media')
        )}
        xalign={0}
        truncate='end'
        ellipsize={Pango.EllipsizeMode.END}
        class='osd-music-title' // Ensure SCSS
        css={createBinding([player], p => `font-family: ${getTrackfont(p)}, ${DEFAULT_MUSIC_FONT};`)}
    />
);

const TrackArtistsDisplay = ({ player }) => ( // Expects player object
    <label
        label={createBinding([player], p => (p && p.track_artists) ? (p.track_artists || []).join(', ') : '')}
        xalign={0}
        truncate='end'
        ellipsize={Pango.EllipsizeMode.END}
        class='osd-music-artists' // Ensure SCSS
    />
);

const CoverArtDisplay = ({ player }) => { // Expects player object
    const [currentCoverCss, setCurrentCoverCss] = createState('');

    createEffect(async () => {
        if (!player || !player.cover_path || player.track_title === "") {
            setCurrentCoverCss('background-image: none;');
            // Reset custom music style if player stops or no cover
            // This depends on how styles are managed. If musicwal.scss is specific, clear it.
            // execAsync(`echo "" > ${GLib.get_user_state_dir()}/ags/scss/_musicmaterial.scss`);
            // execAsync(`echo "" > ${GLib.get_user_state_dir()}/ags/scss/_musicwal.scss`);
            // app.resetCss(); app.applyCss(...main_css...); // Reapply main style
            return;
        }

        const coverPath = player.cover_path;
        const stylePath = `${player.cover_path}${darkMode.value ? '' : '-l'}${COVER_COLORSCHEME_SUFFIX}`;

        if (coverPath === lastCoverPath && fileExists(stylePath)) { // Check if style already exists
            setCurrentCoverCss(`background-image: url('${coverPath}');`);
            app.applyCss(stylePath); // Apply specific colorscheme for this cover
            return;
        }
        lastCoverPath = coverPath;

        try {
            // Generate material colors
            await execAsync([
                'python',
                `${app.configDir}/scripts/color_generation/generate_colors_material.py`,
                '--path', coverPath,
                '--mode', darkMode.value ? 'dark' : 'light',
                // Output to a temporary file first to avoid race condition if main CSS is recompiled
                // For now, directly overwriting as in original.
                ` > ${GLib.get_user_state_dir()}/ags/scss/_musicmaterial.scss` // This is a redirect, use bash -c
            ]);
            // Simpler: `await execAsync(['bash', '-c', `python cmd > file`]);`

            // Generate wal colors (simplified from original)
            const dominantColorOutput = await execAsync(`sh -c "magick '${coverPath}' -scale 1x1\\! -format '%[fx:int(255*r+.5)],%[fx:int(255*g+.5)],%[fx:int(255*b+.5)]' info: | sed 's/,/\\n/g' | xargs -L 1 printf '%02x' ; echo"`);
            const dominantColor = `#${dominantColorOutput.trim()}`;

            const musicWalTemplate = await Utils.readFileAsync(`${app.configDir}/scripts/templates/wal/_musicwal.scss`);
            const musicWalContent = musicWalTemplate
                .replace(/{{dominantColor}}/g, dominantColor)
                .replace(/{{backgroundColor}}/g, darkMode.value ? "#0E1415" : "#EEF4F4")
                .replace(/{{foregroundColor}}/g, darkMode.value ? "#EEF4F4" : "#0E1415");
            await writeFileAsync(musicWalContent, `${GLib.get_user_state_dir()}/ags/scss/_musicwal.scss`);

            // Compile _music.scss which should import _musicmaterial.scss and _musicwal.scss
            await execAsync([
                'sass',
                `-I "${GLib.get_user_state_dir()}/ags/scss"`,
                `-I "${app.configDir}/scss/fallback"`,
                `"${app.configDir}/scss/_music.scss"`,
                `"${stylePath}"`
            ]);

            setCurrentCoverCss(`background-image: url('${coverPath}');`);
            app.applyCss(stylePath); // Apply the newly generated style

        } catch (e) {
            console.error("Failed to generate/apply music color scheme:", e);
            setCurrentCoverCss(`background-image: url('${coverPath}');`); // Show cover even if colors fail
        }

    }, [player?.cover_path, darkMode]); // React to cover path and dark mode changes

    return (
        <box class='osd-music-cover'>
            <overlay>
                <box $type="child" class='osd-music-cover-fallback' homogeneous={true}>
                    <MaterialIcon icon='music_note' size='gigantic' class='txt-thin' />
                </box>
                <box $type="overlay" class='osd-music-cover-art' css={currentCoverCss} />
            </overlay>
        </box>
    );
};

const TrackControlsDisplay = ({ player }) => ( // Expects player object
    <revealer
        revealChild={createBinding([player], p => !!p)} // Show if player exists
        transition={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        transitionDuration={userOptions.animations?.durationLarge || 150}
    >
        <box vpack={Gtk.Align.CENTER} class='osd-music-controls spacing-h-3'>
            <button class='osd-music-controlbtn' onClicked={() => player?.previous()} $={setupCursorHover}>
                <MaterialIcon icon='skip_previous' size='norm' class='osd-music-controlbtn-txt' />
            </button>
            <button class='osd-music-controlbtn' onClicked={() => player?.next()} $={setupCursorHover}>
                <MaterialIcon icon='skip_next' size='norm' class='osd-music-controlbtn-txt' />
            </button>
        </box>
    </revealer>
);

const TrackTimeDisplay = ({ player }) => ( // Expects player object
    <revealer
        revealChild={createBinding([player], p => !!p)}
        transition={Gtk.RevealerTransitionType.SLIDE_LEFT}
        transitionDuration={userOptions.animations?.durationLarge || 150}
    >
        <box vpack={Gtk.Align.CENTER} class='osd-music-pill spacing-h-5'>
            <label label={createPoll(1000, () => player ? lengthStr(player.position) : "0:00", "0:00", () => !!player)} />
            <label label='/' />
            <label label={createBinding([player], p => p ? lengthStr(p.length) : "0:00")} />
        </box>
    </revealer>
);

const PlayStateDisplay = ({ player }) => ( // Expects player object
    <button class='osd-music-playstate' onClicked={() => player?.playPause()}>
        <overlay>
            <TrackProgressDisplay $type="child" player={player} />
            <button $type="overlay" class='osd-music-playstate-btn' onClicked={() => player?.playPause()} $={setupCursorHover}>
                <label
                    justify={Gtk.Justification.CENTER}
                    hpack={Gtk.Align.FILL} vpack={Gtk.Align.CENTER}
                    label={createBinding([player], p => p?.play_back_status === 'Playing' ? 'pause' : 'play_arrow')}
                />
            </button>
        </overlay>
    </button>
);

const MusicControlsWidget = ({ player }) => ( // Expects player GObject
    <box class='osd-music spacing-h-20'>
        <CoverArtDisplay player={player} vpack={Gtk.Align.CENTER} />
        <box vertical={true} class='spacing-v-5 osd-music-info'>
            <box vertical={true} vpack={Gtk.Align.CENTER} hexpand={true}>
                <TrackTitleDisplay player={player} />
                <TrackArtistsDisplay player={player} />
            </box>
            <box vexpand={true} /> {/* Spacer */}
            <box class='spacing-h-10'>
                <TrackControlsDisplay player={player} />
                <box hexpand={true}/> {/* Spacer */}
                {/* Original had plasma integration check for time display, simplified */}
                {(player?.bus_name?.startsWith('org.mpris.MediaPlayer2.chromium') || player?.bus_name?.includes('plasma')) &&
                    <TrackTimeDisplay player={player} />}
                <PlayStateDisplay player={player} />
            </box>
        </box>
    </box>
);

export default function MusicControlsDisplayContainer() { // Renamed main export
    // This revealer is controlled by the global `showMusicControls` state
    return (
        <revealer
            transition={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={userOptions.animations?.durationLarge || 180}
            revealChild={showMusicControls} // Bind to accessor from uiService
        >
            {/* Map active players. Mpris.players is an array of player objects. */}
            {/* For simplicity, using Mpris.player which should be the preferred/active one. */}
            {/* If multiple players need to be shown, this would map Mpris.players. */}
            {Mpris.player.transform(p => p && isRealPlayer(p) ? MusicControlsWidget({player: p}) : <box />)}
        </revealer>
    );
}
