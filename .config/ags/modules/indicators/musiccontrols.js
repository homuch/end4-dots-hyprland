const { GLib } = imports.gi;
import app from 'ags/gtk4/app'; // Corrected App import
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import Mpris from 'ags/service/mpris'; // Corrected Mpris import
const { exec, execAsync } = Utils;
// const { Box, EventBox, Icon, Scrollable, Label, Button, Revealer } = Widget; // To be removed

import { fileExists } from '../.miscutils/files.js';
import { AnimatedCircProg } from "../.commonwidgets/cairo_circularprogress.js";
import { showMusicControls } from '../../variables.js';
import { darkMode, hasPlasmaIntegration } from '../.miscutils/system.js';
import { setupCursorHover } from '../.widgetutils/cursorhover.js';

const COMPILED_STYLE_DIR = `${GLib.get_user_cache_dir()}/ags/user/generated`
const LIGHTDARK_FILE_LOCATION = `${GLib.get_user_state_dir()}/ags/user/colormode.txt`;
const colorMode = Utils.exec(`bash -c "sed -n \'1p\' '${LIGHTDARK_FILE_LOCATION}'"`);
const lightDark = (colorMode == "light") ? 'light' : '';
const COVER_COLORSCHEME_SUFFIX = '_colorscheme.css';
var lastCoverPath = '';

function isRealPlayer(player) {
    return (
        // Remove unecessary native buses from browsers if there's plasma integration
        // !(hasPlasmaIntegration && player.busName.startsWith('org.mpris.MediaPlayer2.firefox')) &&
        // !(hasPlasmaIntegration && player.busName.startsWith('org.mpris.MediaPlayer2.chromium')) &&
        // playerctld just copies other buses and we don't need duplicates
        !player.busName.startsWith('org.mpris.MediaPlayer2.playerctld') &&
        // Non-instance mpd bus
        !(player.busName.endsWith('.mpd') && !player.busName.endsWith('MediaPlayer2.mpd'))
    );
}

export const getPlayer = (name = userOptions.music.preferredPlayer) => Mpris.getPlayer(name) || Mpris.players[0] || null;
function lengthStr(length) {
    const min = Math.floor(length / 60);
    const sec = Math.floor(length % 60);
    const sec0 = sec < 10 ? '0' : '';
    return `${min}:${sec0}${sec}`;
}

function detectMediaSource(link) {
    if (link.startsWith("file://")) {
        if (link.includes('firefox-mpris'))
            return '󰈹 Firefox'
        return "󰈣 File";
    }
    let url = link.replace(/(^\w+:|^)\/\//, '');
    let domain = url.match(/(?:[a-z]+\.)?([a-z]+\.[a-z]+)/i)[1];
    if (domain == 'ytimg.com') return '󰗃 Youtube';
    if (domain == 'discordapp.net') return '󰙯 Discord';
    if (domain == 'sndcdn.com') return '󰓀 SoundCloud';
    return domain;
}

const DEFAULT_MUSIC_FONT = 'Gabarito, sans-serif';
function getTrackfont(player) {
    const title = player.trackTitle;
    const artists = player.trackArtists.join(' ');
    if (artists.includes('TANO*C') || artists.includes('USAO') || artists.includes('Kobaryo'))
        return 'Chakra Petch'; // Rigid square replacement
    if (title.includes('東方'))
        return 'Crimson Text, serif'; // Serif for Touhou stuff
    return DEFAULT_MUSIC_FONT;
}
function trimTrackTitle(title) {
    if (!title) return '';
    const cleanPatterns = [
        /【[^】]*】/,         // Touhou n weeb stuff
        " [FREE DOWNLOAD]", // F-777
    ];
    cleanPatterns.forEach((expr) => title = title.replace(expr, ''));
    return title;
}

const TrackProgress = ({ player, ...rest }) => {
    const _updateProgress = (circprog) => {
        // const player = Mpris.getPlayer();
        if (!player) return;
        // Set circular progress (see definition of AnimatedCircProg for explanation)
        circprog.css = `font-size: ${Math.max(player.position / player.length * 100, 0)}px;`
    }
    return AnimatedCircProg({ // This is an imported component, not a direct widget call
        ...rest,
        className: 'osd-music-circprog',
        vpack: 'center',
        extraSetup: (self) => self
            .hook(Mpris, _updateProgress)
            .poll(3000, _updateProgress)
        ,
    })
}

const TrackTitle = ({ player, ...rest }) => label({ // Changed to lowercase
    ...rest,
    label: 'No music playing',
    xalign: 0,
    truncate: 'end',
    // wrap: true,
    className: 'osd-music-title',
    setup: (self) => self.hook(player, (self) => {
        // Player name
        self.label = player.trackTitle.length > 0 ? trimTrackTitle(player.trackTitle) : 'No media';
        // Font based on track/artist
        const fontForThisTrack = getTrackfont(player);
        self.css = `font-family: ${fontForThisTrack}, ${DEFAULT_MUSIC_FONT};`;
    }, 'notify::track-title'),
});

const TrackArtists = ({ player, ...rest }) => label({ // Changed to lowercase
    ...rest,
    xalign: 0,
    className: 'osd-music-artists',
    truncate: 'end',
    setup: (self) => self.hook(player, (self) => {
        self.label = player.trackArtists.length > 0 ? player.trackArtists.join(', ') : '';
    }, 'notify::track-artists'),
})

const CoverArt = ({ player, ...rest }) => {
    const fallbackCoverArt = box({ // Fallback
        className: 'osd-music-cover-fallback',
        homogeneous: true,
        children: [label({ // Changed to lowercase
            className: 'icon-material txt-gigantic txt-thin',
            label: 'music_note',
        })]
    });
    // const coverArtDrawingArea = Widget.DrawingArea({ className: 'osd-music-cover-art' });
    // const coverArtDrawingAreaStyleContext = coverArtDrawingArea.get_style_context();
    const realCoverArt = box({ // Changed to lowercase
        className: 'osd-music-cover-art',
        homogeneous: true,
        // children: [coverArtDrawingArea],
        attribute: {
            'pixbuf': null,
            // 'showImage': (self, imagePath) => {
            //     const borderRadius = coverArtDrawingAreaStyleContext.get_property('border-radius', Gtk.StateFlags.NORMAL);
            //     const frameHeight = coverArtDrawingAreaStyleContext.get_property('min-height', Gtk.StateFlags.NORMAL);
            //     const frameWidth = coverArtDrawingAreaStyleContext.get_property('min-width', Gtk.StateFlags.NORMAL);
            //     let imageHeight = frameHeight;
            //     let imageWidth = frameWidth;
            //     // Get image dimensions
            //     execAsync(['identify', '-format', '{"w":%w,"h":%h}', imagePath])
            //         .then((output) => {
            //             const imageDimensions = JSON.parse(output);
            //             const imageAspectRatio = imageDimensions.w / imageDimensions.h;
            //             const displayedAspectRatio = imageWidth / imageHeight;
            //             if (imageAspectRatio >= displayedAspectRatio) {
            //                 imageWidth = imageHeight * imageAspectRatio;
            //             } else {
            //                 imageHeight = imageWidth / imageAspectRatio;
            //             }
            //             // Real stuff
            //             // TODO: fix memory leak(?)
            //             // if (self.attribute.pixbuf) {
            //             //     self.attribute.pixbuf.unref();
            //             //     self.attribute.pixbuf = null;
            //             // }
            //             self.attribute.pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(imagePath, imageWidth, imageHeight);

            //             coverArtDrawingArea.set_size_request(frameWidth, frameHeight);
            //             coverArtDrawingArea.connect("draw", (widget, cr) => {
            //                 // Clip a rounded rectangle area
            //                 cr.arc(borderRadius, borderRadius, borderRadius, Math.PI, 1.5 * Math.PI);
            //                 cr.arc(frameWidth - borderRadius, borderRadius, borderRadius, 1.5 * Math.PI, 2 * Math.PI);
            //                 cr.arc(frameWidth - borderRadius, frameHeight - borderRadius, borderRadius, 0, 0.5 * Math.PI);
            //                 cr.arc(borderRadius, frameHeight - borderRadius, borderRadius, 0.5 * Math.PI, Math.PI);
            //                 cr.closePath();
            //                 cr.clip();
            //                 // Paint image as bg, centered
            //                 Gdk.cairo_set_source_pixbuf(cr, self.attribute.pixbuf,
            //                     frameWidth / 2 - imageWidth / 2,
            //                     frameHeight / 2 - imageHeight / 2
            //                 );
            //                 cr.paint();
            //             });
            //         }).catch(print)
            // },
            'updateCover': (self) => {
                // const player = Mpris.getPlayer(); // Maybe no need to re-get player.. can't remember why I had this
                // Player closed
                // Note that cover path still remains, so we're checking title
                if (!player || player.trackTitle == "" || !player.coverPath) {
                    self.css = `background-image: none;`; // CSS image
                    App.applyCss(`${COMPILED_STYLE_DIR}/style.css`);
                    return;
                }

                const coverPath = player.coverPath;
                const stylePath = `${player.coverPath}${darkMode.value ? '' : '-l'}${COVER_COLORSCHEME_SUFFIX}`;
                if (player.coverPath == lastCoverPath) { // Since 'notify::cover-path' emits on cover download complete
                    Utils.timeout(200, () => {
                        // self.attribute.showImage(self, coverPath);
                        self.css = `background-image: url('${coverPath}');`; // CSS image
                    });
                }
                lastCoverPath = player.coverPath;

                // If a colorscheme has already been generated, skip generation
                if (fileExists(stylePath)) {
                    // self.attribute.showImage(self, coverPath)
                    self.css = `background-image: url('${coverPath}');`; // CSS image
                    app.applyCss(stylePath); // Corrected to app
                    return;
                }

                // Generate colors
                execAsync(['bash', '-c',
                    `${app.configDir}/scripts/color_generation/generate_colors_material.py --path '${coverPath}' --mode ${darkMode.value ? 'dark' : 'light'} > ${GLib.get_user_state_dir()}/ags/scss/_musicmaterial.scss`]) // Corrected to app
                    .then(() => {
                        const dominantColor = `#${Utils.exec(`sh -c "magick '${coverPath}' -scale 1x1\\! -format '%[fx:int(255*r+.5)],%[fx:int(255*g+.5)],%[fx:int(255*b+.5)]' info: | sed 's/,/\\n/g' | xargs -L 1 printf '%02x' ; echo"`)}`
                        // exec(`${app.configDir}/scripts/color_generation/pywal.sh -i "${player.coverPath}" -n -t -s -e -q ${darkMode.value ? '' : '-l'}`) // Corrected to app
                        // exec(`cp ${GLib.get_user_cache_dir()}/wal/colors.scss ${GLib.get_user_state_dir()}/ags/scss/_musicwal.scss`);
                        exec(`cp '${app.configDir}/scripts/templates/wal/_musicwal.scss' '${GLib.get_user_state_dir()}/ags/scss/_musicwal.scss'`); // Corrected to app
                        exec(`sed -i 's/{{dominantColor}}/${dominantColor}/g' '${GLib.get_user_state_dir()}/ags/scss/_musicwal.scss'`)
                        exec(`sed -i 's/{{backgroundColor}}/${darkMode.value ? "#0E1415" : "#EEF4F4"}/g' '${GLib.get_user_state_dir()}/ags/scss/_musicwal.scss'`)
                        exec(`sed -i 's/{{foregroundColor}}/${darkMode.value ? "#EEF4F4" : "#0E1415"}/g' '${GLib.get_user_state_dir()}/ags/scss/_musicwal.scss'`)

                        exec(`sass -I "${GLib.get_user_state_dir()}/ags/scss" -I "${app.configDir}/scss/fallback" "${app.configDir}/scss/_music.scss" "${stylePath}"`); // Corrected to app
                        Utils.timeout(200, () => {
                            // self.attribute.showImage(self, coverPath)
                            self.css = `background-image: url('${coverPath}');`; // CSS image
                        });
                        app.applyCss(`${stylePath}`); // Corrected to app
                    })
                    .catch(print);
            },
        },
        setup: (self) => self
            .hook(player, (self) => {
                self.attribute.updateCover(self);
            }, 'notify::cover-path')
        ,
    });
    return box({ // Changed to lowercase
        ...rest,
        className: 'osd-music-cover',
        children: [
            overlay({ // Changed to lowercase
                child: fallbackCoverArt,
                overlays: [realCoverArt],
            })
        ],
    })
}

const TrackControls = ({ player, ...rest }) => revealer({ // Changed to lowercase
    revealChild: false,
    transition: 'slide_right',
    transitionDuration: userOptions.animations.durationLarge,
    child: box({ // Changed to lowercase
        ...rest,
        vpack: 'center',
        className: 'osd-music-controls spacing-h-3',
        children: [
            button({ // Changed to lowercase
                className: 'osd-music-controlbtn',
                onClicked: () => player.previous(),
                child: label({ // Changed to lowercase
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'skip_previous',
                }),
                setup: setupCursorHover
            }),
            button({ // Changed to lowercase
                className: 'osd-music-controlbtn',
                onClicked: () => player.next(),
                child: label({ // Changed to lowercase
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'skip_next',
                }),
                setup: setupCursorHover
            }),
        ],
    }),
    setup: (self) => self.hook(Mpris, (self) => {
        // const player = Mpris.getPlayer();
        if (!player)
            self.revealChild = false;
        else
            self.revealChild = true;
    }, 'notify::play-back-status'),
});

const TrackSource = ({ player, ...rest }) => revealer({ // Changed to lowercase
    revealChild: false,
    transition: 'slide_left',
    transitionDuration: userOptions.animations.durationLarge,
    child: box({ // Changed to lowercase
        ...rest,
        className: 'osd-music-pill spacing-h-5',
        homogeneous: true,
        children: [
            label({ // Changed to lowercase
                hpack: 'fill',
                justification: 'center',
                className: 'icon-nerd',
                setup: (self) => self.hook(player, (self) => {
                    self.label = detectMediaSource(player.trackCoverUrl);
                }, 'notify::cover-path'),
            }),
        ],
    }),
    setup: (self) => self.hook(Mpris, (self) => {
        const mpris = Mpris.getPlayer('');
        if (!mpris)
            self.revealChild = false;
        else
            self.revealChild = true;
    }),
});

const TrackTime = ({ player, ...rest }) => {
    return revealer({ // Changed to lowercase
        revealChild: false,
        transition: 'slide_left',
        transitionDuration: userOptions.animations.durationLarge,
        child: box({ // Changed to lowercase
            ...rest,
            vpack: 'center',
            className: 'osd-music-pill spacing-h-5',
            children: [
                label({ // Changed to lowercase
                    setup: (self) => self.poll(1000, (self) => {
                        // const player = Mpris.getPlayer();
                        if (!player) return;
                        self.label = lengthStr(player.position);
                    }),
                }),
                label({ label: '/' }), // Changed to lowercase
                label({ // Changed to lowercase
                    setup: (self) => self.hook(Mpris, (self) => {
                        // const player = Mpris.getPlayer();
                        if (!player) return;
                        self.label = lengthStr(player.length);
                    }),
                }),
            ],
        }),
        setup: (self) => self.hook(Mpris, (self) => {
            if (!player) self.revealChild = false;
            else self.revealChild = true;
        }),
    })
}

const PlayState = ({ player }) => {
    var position = 0;
    const trackCircProg = TrackProgress({ player: player });
    return button({ // Changed to lowercase
        className: 'osd-music-playstate',
        child: overlay({ // Changed to lowercase
            child: trackCircProg,
            overlays: [
                button({ // Changed to lowercase
                    className: 'osd-music-playstate-btn',
                    onClicked: () => player.playPause(),
                    child: label({ // Changed to lowercase
                        justification: 'center',
                        hpack: 'fill',
                        vpack: 'center',
                        setup: (self) => self.hook(player, (label) => {
                            label.label = `${player.playBackStatus == 'Playing' ? 'pause' : 'play_arrow'}`;
                        }, 'notify::play-back-status'),
                    }),
                    setup: setupCursorHover
                }),
            ],
            passThrough: true,
        }),
    });
}

const MusicControlsWidget = (player) => box({ // Changed to lowercase
    className: 'osd-music spacing-h-20 test',
    children: [
        CoverArt({ player: player, vpack: 'center' }),
        box({ // Changed to lowercase
            vertical: true,
            className: 'spacing-v-5 osd-music-info',
            children: [
                box({ // Changed to lowercase
                    vertical: true,
                    vpack: 'center',
                    hexpand: true,
                    children: [
                        TrackTitle({ player: player }),
                        TrackArtists({ player: player }),
                    ]
                }),
                box({ vexpand: true }), // Changed to lowercase
                box({ // Changed to lowercase
                    className: 'spacing-h-10',
                    setup: (box) => {
                        box.pack_start(TrackControls({ player: player }), false, false, 0);
                        box.pack_end(PlayState({ player: player }), false, false, 0);
                        if(hasPlasmaIntegration || player.busName.startsWith('org.mpris.MediaPlayer2.chromium')) box.pack_end(TrackTime({ player: player }), false, false, 0)
                        // box.pack_end(TrackSource({ vpack: 'center', player: player }), false, false, 0);
                    }
                })
            ]
        })
    ]
})

export default () => revealer({ // Changed to lowercase
    transition: 'slide_down',
    transitionDuration: userOptions.animations.durationLarge,
    revealChild: false,
    child: box({ // Changed to lowercase
        children: Mpris.bind("players")
            .as(players => players.map((player) => (isRealPlayer(player) ? MusicControlsWidget(player) : null)))
    }),
    setup: (self) => self.hook(showMusicControls, (revealer) => {
        revealer.revealChild = showMusicControls.value;
    }),
})
