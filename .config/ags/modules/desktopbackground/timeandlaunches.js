const { GLib } = imports.gi;
import app from 'ags/gtk4/app'; // Corrected import, though not directly used here
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
// import Service from 'resource:///com/github/Aylur/ags/service.js'; // Not used
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

// import Variable from 'resource:///com/github/Aylur/ags/variable.js'; // Not used
const { execAsync, exec } = Utils; // exec not used
// const { Box, Label, Button, Revealer, EventBox } = Widget; // To be removed
import { setupCursorHover } from '../.widgetutils/cursorhover.js';
import { quickLaunchItems } from './data_quicklaunches.js'

const TimeAndDate = () => box({
    vertical: true,
    className: 'spacing-v--5',
    children: [
        label({
            className: 'bg-time-clock',
            xalign: 0,
            label: GLib.DateTime.new_now_local().format(userOptions.time.format),
            setup: (self) => self.poll(userOptions.time.interval, label => {
                label.label = GLib.DateTime.new_now_local().format(userOptions.time.format);
            }),
        }),
        label({
            className: 'bg-time-date',
            xalign: 0,
            label: GLib.DateTime.new_now_local().format(userOptions.time.dateFormatLong),
            setup: (self) => self.poll(userOptions.time.dateInterval, (label) => {
                label.label = GLib.DateTime.new_now_local().format(userOptions.time.dateFormatLong);
            }),
        }),
    ]
})

const QuickLaunches = () => box({
    vertical: true,
    className: 'spacing-v-10',
    children: [
        label({
            xalign: 0,
            className: 'bg-quicklaunch-title',
            label: 'Quick Launches',
        }),
        box({
            hpack: 'start',
            className: 'spacing-h-5',
            children: quickLaunchItems.map((item, i) => button({
                onClicked: () => {
                    execAsync(['bash', '-c', `${item["command"]}`]).catch(print);
                },
                className: 'bg-quicklaunch-btn',
                child: label({
                    label: `${item["name"]}`,
                }),
                setup: (self) => {
                    setupCursorHover(self);
                }
            })),
        })
    ]
})

export default () => box({
    hpack: 'start',
    vpack: 'end',
    vertical: true,
    className: 'bg-time-box spacing-h--10',
    children: [
        TimeAndDate(),
        // QuickLaunches(),
    ],
})

