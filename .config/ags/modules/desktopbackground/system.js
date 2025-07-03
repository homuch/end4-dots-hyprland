// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { execAsync, exec } = Utils;
// const { box, eventBox, label, revealer, overlay } = Widget; // To be removed
import { AnimatedCircProg } from "../.commonwidgets/cairo_circularprogress.js";
import { MaterialIcon } from '../.commonwidgets/materialicon.js';

const ResourceValue = (name, icon, interval, valueUpdateCmd, displayFunc, props = {}) => box({
    ...props,
    className: 'bg-system-bg txt',
    children: [
        revealer({
            transition: 'slide_left',
            transitionDuration: userOptions.animations.durationLarge,
            child: box({
                vpack: 'center',
                vertical: true,
                className: 'margin-right-15',
                children: [
                    label({
                        xalign: 1,
                        className: 'txt-small txt',
                        label: `${name}`,
                    }),
                    label({
                        xalign: 1,
                        className: 'titlefont txt-norm txt-onSecondaryContainer',
                        setup: (self) => self
                            .poll(interval, (label) => displayFunc(label))
                        ,
                    })
                ]
            })
        }),
        overlay({
            child: AnimatedCircProg({
                className: 'bg-system-circprog',
                extraSetup: (self) => self
                    .poll(interval, (self) => {
                        execAsync(['bash', '-c', `${valueUpdateCmd}`]).then((newValue) => {
                            self.css = `font-size: ${Math.round(newValue)}px;`
                        }).catch(print);
                    })
                ,
            }),
            overlays: [
                MaterialIcon(`${icon}`, 'hugeass'),
            ],
            setup: self => self.set_overlay_pass_through(self.get_children()[1], true),
        }),
    ]
})

const resources = box({
    vpack: 'fill',
    vertical: true,
    className: 'spacing-v-15',
    children: [
        ResourceValue('Memory', 'memory', 10000, `free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`,
            (label) => {
                execAsync(['bash', '-c', `free -h | awk '/^Mem/ {print $3 " / " $2}' | sed 's/Gi/Gib/g'`])
                    .then((output) => {
                        label.label = `${output}`
                    }).catch(print);
            }, { hpack: 'end' }),
        ResourceValue('Swap', 'swap_horiz', 10000, `free | awk '/^Swap/ {if ($2 > 0) printf("%.2f\\n", ($3/$2) * 100); else print "0";}'`,
            (label) => {
                execAsync(['bash', '-c', `free -h | awk '/^Swap/ {if ($2 != "0") print $3 " / " $2; else print "No swap"}' | sed 's/Gi/Gib/g'`])
                    .then((output) => {
                        label.label = `${output}`
                    }).catch(print);
            }, { hpack: 'end' }),
        ResourceValue('Disk space', 'hard_drive_2', 3600000, `echo $(df --output=pcent / | tr -dc '0-9')`,
            (label) => {
                execAsync(['bash', '-c', `df -h --output=avail / | awk 'NR==2{print $1}'`])
                    .then((output) => {
                        label.label = `${output} available`
                    }).catch(print);
            }, { hpack: 'end' }),
    ]
});

const distroAndVersion = box({
    vertical: true,
    children: [
        box({
            hpack: 'end',
            children: [
                label({
                    className: 'bg-distro-txt',
                    xalign: 0,
                    label: 'Hyping on ',
                }),
                label({
                    className: 'bg-distro-name',
                    xalign: 0,
                    label: '<distro>',
                    setup: (label) => {
                        execAsync([`grep`, `-oP`, `PRETTY_NAME="\\K[^"]+`, `/etc/os-release`]).then(distro => {
                            label.label = distro;
                        }).catch(print);
                    },
                }),
            ]
        }),
        box({
            hpack: 'end',
            children: [
                label({
                    className: 'bg-distro-txt',
                    xalign: 0,
                    label: 'with ',
                }),
                label({
                    className: 'bg-distro-name',
                    xalign: 0,
                    label: 'An environment idk',
                    setup: (label) => {
                        // hyprctl will return unsuccessfully if Hyprland isn't running
                        execAsync([`bash`, `-c`, `hyprctl version | grep -oP "Tag: v\\K\\d+\\.\\d+\\.\\d+"`]).then(version => {
                            label.label = `Hyprland ${version}`;
                        }).catch(() => execAsync([`bash`, `-c`, `sway -v | cut -d'-' -f1 | sed 's/sway version /v/'`]).then(version => {
                            label.label = `Sway ${version}`;
                        }).catch(print));
                    },
                }),
            ]
        })
    ]
})

export default () => box({
    hpack: 'end',
    vpack: 'end',
    children: [
        eventBox({
            child: box({
                hpack: 'end',
                vpack: 'end',
                className: 'bg-distro-box spacing-v-20',
                vertical: true,
                children: [
                    resources,
                    distroAndVersion,
                ]
            }),
            onPrimaryClickRelease: () => {
                const kids = resources.get_children();
                for (let i = 0; i < kids.length; i++) {
                    const child = kids[i];
                    const firstChild = child.get_children()[0];
                    firstChild.revealChild = !firstChild.revealChild;
                }

            },
        })
    ],
})



