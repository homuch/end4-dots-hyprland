import app from 'ags/gtk4/app';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

import Audio from '../../../services/audioService.js'; // Uses re-exported gi://AstalWp
import SystemTray from 'ags/service/systemtray'; // Standard v2/v3 path
const { execAsync } = Utils;
import Indicator from '../../../services/indicator.js';
import { StatusIcons } from '../../.commonwidgets/statusicons.js';
import { Tray } from "./tray.js";
import { distance } from '../../.miscutils/mathfuncs.js';

const OSD_DISMISS_DISTANCE = 10;

const SeparatorDot = () => revealer({
    transition: 'slide_left',
    revealChild: false,
    attribute: {
        'count': SystemTray.items.length,
        'update': (self, diff) => {
            self.attribute.count += diff;
            self.revealChild = (self.attribute.count > 0);
        }
    },
    child: box({
        vpack: 'center',
        className: 'separator-circle',
    }),
    setup: (self) => self
        .hook(SystemTray, (self) => self.attribute.update(self, 1), 'added')
        .hook(SystemTray, (self) => self.attribute.update(self, -1), 'removed')
    ,
});

export default (monitor = 0) => {
    const barTray = Tray();
    const barStatusIcons = StatusIcons({
        className: 'bar-statusicons',
        setup: (self) => self.hook(App, (self, currentName, visible) => {
            if (currentName === 'sideright') {
                self.toggleClassName('bar-statusicons-active', visible);
            }
        }),
    }, monitor);
    const SpaceRightInteractions = (child) => eventBox({
        onHover: () => { barStatusIcons.toggleClassName('bar-statusicons-hover', true) },
        onHoverLost: () => { barStatusIcons.toggleClassName('bar-statusicons-hover', false) },
        onPrimaryClick: () => App.toggleWindow('sideright'),
        onSecondaryClick: () => execAsync(['bash', '-c', 'playerctl next || playerctl position `bc <<< "100 * $(playerctl metadata mpris:length) / 1000000 / 100"` &']).catch(print),
        onMiddleClick: () => execAsync('playerctl play-pause').catch(print),
        setup: (self) => self.on('button-press-event', (self, event) => {
            if (event.get_button()[1] === 8)
                execAsync('playerctl previous').catch(print)
        }).on('motion-notify-event', (self, event) => {
            Indicator.popup(-1);
        }),
        child: child,
    });
    const emptyArea = SpaceRightInteractions(box({ hexpand: true, }));
    const indicatorArea = SpaceRightInteractions(box({
        children: [
            SeparatorDot(),
            barStatusIcons
        ],
    }));
    const actualContent = box({
        hexpand: true,
        className: 'spacing-h-5 bar-spaceright',
        children: [
            emptyArea,
            barTray,
            indicatorArea
        ],
    });

    let scrollCursorX, scrollCursorY;
    return eventBox({
        onScrollUp: (self, event) => {
            if (!Audio.speaker) return;
            let _;
            [_, scrollCursorX, scrollCursorY] = event.get_coords();
            if (Audio.speaker.volume <= 0.09) Audio.speaker.volume += 0.01;
            else Audio.speaker.volume += 0.03;
            Indicator.popup(1);
        },
        onScrollDown: (self, event) => {
            if (!Audio.speaker) return;
            let _;
            [_, scrollCursorX, scrollCursorY] = event.get_coords();
            if (Audio.speaker.volume <= 0.09) Audio.speaker.volume -= 0.01;
            else Audio.speaker.volume -= 0.03;
            Indicator.popup(1);
        },
        setup: (self) => self.on('motion-notify-event', (self, event) => {
            const [_, cursorX, cursorY] = event.get_coords();
            if (distance(cursorX, cursorY, scrollCursorX, scrollCursorY) >= OSD_DISMISS_DISTANCE)
                Indicator.popup(-1);
        }),
        child: box({
            children: [
                actualContent,
                SpaceRightInteractions(box({ className: 'bar-corner-spacing' })),
            ]
        })
    });
}