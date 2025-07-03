// TODO
// - Make client destroy/create not destroy and recreate the whole thing
// - Active ws hook optimization: only update when moving to next group
//
const { Gdk, Gtk } = imports.gi;
const { Gravity } = imports.gi.Gdk;
import app from 'ags/gtk4/app'; // Corrected App import
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

import Hyprland from 'gi://AstalHyprland';
const { execAsync, exec } = Utils;
import { setupCursorHoverGrab } from '../.widgetutils/cursorhover.js';
import { dumpToWorkspace, swapWorkspace } from "./actions.js";
import { iconExists, substitute } from "../.miscutils/icons.js";
import { monitors } from '../.commondata/hyprlanddata.js';
import { MaterialIcon } from '../.commonwidgets/materialicon.js';

const NUM_OF_WORKSPACES_SHOWN = userOptions.overview.numOfCols * userOptions.overview.numOfRows;
const TARGET = [Gtk.TargetEntry.new('text/plain', Gtk.TargetFlags.SAME_APP, 0)];

const overviewTick = Variable(false);
const overviewMonitor = Variable(0);

export default () => {
    const clientMap = new Map();
    const ContextMenuWorkspaceArray = ({ label, actionFunc, thisWorkspace }) => Gtk.MenuItem({ // Changed to Gtk.MenuItem
        label: `${label}`,
        setup: (menuItem) => {
            let submenu = new Gtk.Menu(); // Already Gtk.Menu, which is fine
            submenu.className = 'menu';

            const offset = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN) * NUM_OF_WORKSPACES_SHOWN;
            const startWorkspace = offset + 1;
            const endWorkspace = startWorkspace + NUM_OF_WORKSPACES_SHOWN - 1;
            for (let i = startWorkspace; i <= endWorkspace; i++) {
                let button = new Gtk.MenuItem({
                    label: `Workspace ${i}`
                });
                button.connect("activate", () => {
                    // execAsync([`${onClickBinary}`, `${thisWorkspace}`, `${i}`]).catch(print);
                    actionFunc(thisWorkspace, i);
                    overviewTick.setValue(!overviewTick.value);
                });
                submenu.append(button);
            }
            menuItem.set_reserve_indicator(true);
            menuItem.set_submenu(submenu);
        }
    })

    const Window = ({ address, at: [x, y], size: [w, h], workspace: { id, name }, class: c, initialClass, monitor, title, xwayland }, screenCoords) => {
        const revealInfoCondition = (Math.min(w, h) * userOptions.overview.scale > 70);
        if (w <= 0 || h <= 0 || (c === '' && title === '')) return null;
        // Non-primary monitors
        if (screenCoords.x != 0) x -= screenCoords.x;
        if (screenCoords.y != 0) y -= screenCoords.y;
        // Other offscreen adjustments
        if (x + w <= 0) x += (Math.floor(x / monitors[monitor].width) * monitors[monitor].width);
        else if (x < 0) { w = x + w; x = 0; }
        if (y + h <= 0) x += (Math.floor(y / monitors[monitor].height) * monitors[monitor].height);
        else if (y < 0) { h = y + h; y = 0; }
        // Prevents throwing an error when multiple monitors are plugged in but only one is enabled (#1047)
        if (monitors.length - 1 < monitor) {
            monitor = monitors.length - 1;
        }
        // Properly scale for multi monitors
        w *= monitors[overviewMonitor.value].width / monitors[monitor].width;
        h *= monitors[overviewMonitor.value].height / monitors[monitor].height;
        // Truncate if offscreen
        if (x + w > monitors[overviewMonitor.value].width) w = monitors[overviewMonitor.value].width - x;
        if (y + h > monitors[overviewMonitor.value].height) h = monitors[overviewMonitor.value].height - y;

        if (c.length == 0) c = initialClass;
        const iconName = substitute(c);
        // const appIcon = iconExists(iconName) ? Widget.Icon({
        //     icon: iconName,
        //     size: Math.min(w, h) * userOptions.overview.scale / 2.5,
        // }) : MaterialIcon('terminal', 'gigantic', {
        //     css: `font-size: ${Math.min(w, h) * userOptions.overview.scale / 2.5}px`,
        // });
        const appIcon = icon({ // Changed to lowercase
            icon: iconName,
            size: Math.min(w, h) * userOptions.overview.scale / 2.5,
        });
        return button({ // Changed to lowercase
            attribute: {
                address, x, y, w, h, ws: id,
                updateIconSize: (self) => {
                    appIcon.size = Math.min(self.attribute.w, self.attribute.h) * userOptions.overview.scale / 2.5;
                },
            },
            className: 'overview-tasks-window',
            hpack: 'start',
            vpack: 'start',
            css: `
                margin-left: ${Math.round(x * userOptions.overview.scale)}px;
                margin-top: ${Math.round(y * userOptions.overview.scale)}px;
                margin-right: -${Math.round((x + w) * userOptions.overview.scale)}px;
                margin-bottom: -${Math.round((y + h) * userOptions.overview.scale)}px;
            `,
            onClicked: (self) => {
                Hyprland.messageAsync(`dispatch focuswindow address:${address}`);
                app.closeWindow('overview'); // Corrected to app
            },
            onMiddleClickRelease: () => Hyprland.messageAsync(`dispatch closewindow address:${address}`),
            onSecondaryClick: (button) => {
                button.toggleClassName('overview-tasks-window-selected', true);
                const menu = new Gtk.Menu({ // Changed to Gtk.Menu constructor
                    className: 'menu',
                    children: [ // Children of Gtk.Menu are Gtk.MenuItems
                        Gtk.MenuItem({ // Changed to Gtk.MenuItem
                            child: label({ // Changed to lowercase
                                xalign: 0,
                                label: "Close (Middle-click)",
                            }),
                            onActivate: () => Hyprland.messageAsync(`dispatch closewindow address:${address}`),
                        }),
                        ContextMenuWorkspaceArray({ // This is a local function returning Gtk.MenuItem
                            label: "Dump windows to workspace",
                            actionFunc: dumpToWorkspace,
                            thisWorkspace: Number(id)
                        }),
                        ContextMenuWorkspaceArray({ // This is a local function returning Gtk.MenuItem
                            label: "Swap windows with workspace",
                            actionFunc: swapWorkspace,
                            thisWorkspace: Number(id)
                        }),
                    ],
                });
                menu.connect("deactivate", () => {
                    button.toggleClassName('overview-tasks-window-selected', false);
                })
                menu.connect("selection-done", () => { // selection-done is Gtk3, Gtk4 uses 'hide' or 'deactivate'
                    button.toggleClassName('overview-tasks-window-selected', false);
                })
                menu.popup_at_widget(button.get_parent(), Gravity.SOUTH, Gravity.NORTH, null); // Show menu below the button
                button.connect("destroy", () => menu.destroy());
            },
            child: box({ // Changed to lowercase
                homogeneous: true,
                child: box({ // Changed to lowercase
                    vertical: true,
                    vpack: 'center',
                    children: [
                        appIcon,
                        // TODO: Add xwayland tag instead of just having italics
                        revealer({ // Changed to lowercase
                            transition: 'slide_right',
                            revealChild: revealInfoCondition,
                            child: revealer({ // Changed to lowercase
                                transition: 'slide_down',
                                revealChild: revealInfoCondition,
                                child: label({ // Changed to lowercase
                                    maxWidthChars: 1, // Doesn't matter what number
                                    truncate: 'end',
                                    className: `margin-top-5 ${xwayland ? 'txt txt-italic' : 'txt'}`,
                                    css: overviewMonitor.bind().as(monitor => `
                                        font-size: ${Math.min(monitors[monitor].width, monitors[monitor].height) * userOptions.overview.scale / 14.6}px;
                                        margin: 0px ${Math.min(monitors[monitor].width, monitors[monitor].height) * userOptions.overview.scale / 10}px;
                                    `),
                                    // If the title is too short, include the class
                                    label: (title.length <= 1 ? `${c}: ${title}` : title),
                                })
                            })
                        })
                    ]
                })
            }),
            tooltipText: `${c}: ${title}`,
            setup: (button) => {
                setupCursorHoverGrab(button);

                button.drag_source_set(Gdk.ModifierType.BUTTON1_MASK, TARGET, Gdk.DragAction.MOVE);
                button.drag_source_set_icon_name(substitute(c));

                button.connect('drag-begin', (button) => {  // On drag start, add the dragging class
                    button.toggleClassName('overview-tasks-window-dragging', true);
                });
                button.connect('drag-data-get', (_w, _c, data) => { // On drag finish, give address
                    data.set_text(address, address.length);
                    button.toggleClassName('overview-tasks-window-dragging', false);
                });
            },
        });
    }

    const Workspace = (index) => {
        // const fixed = Widget.Fixed({
        //     attribute: {
        //         put: (widget, x, y) => {
        //             fixed.put(widget, x, y);
        //         },
        //         move: (widget, x, y) => {
        //             fixed.move(widget, x, y);
        //         },
        //     }
        // });
        const fixed = box({ // Changed to lowercase
            attribute: {
                put: (widget, x, y) => {
                    if (!widget.attribute) return;
                    // Note: x and y are already multiplied by userOptions.overview.scale
                    const newCss = `
                        margin-left: ${Math.round(x)}px;
                        margin-top: ${Math.round(y)}px;
                        margin-right: -${Math.round(x + (widget.attribute.w * userOptions.overview.scale))}px;
                        margin-bottom: -${Math.round(y + (widget.attribute.h * userOptions.overview.scale))}px;
                    `;
                    widget.css = newCss;
                    fixed.pack_start(widget, false, false, 0);
                },
                move: (widget, x, y) => {
                    if (!widget) return;
                    if (!widget.attribute) return;
                    // Note: x and y are already multiplied by userOptions.overview.scale
                    const newCss = `
                        margin-left: ${Math.round(x)}px;
                        margin-top: ${Math.round(y)}px;
                        margin-right: -${Math.round(x + (widget.attribute.w * userOptions.overview.scale))}px;
                        margin-bottom: -${Math.round(y + (widget.attribute.h * userOptions.overview.scale))}px;
                    `;
                    widget.css = newCss;
                },
            }
        })
        const WorkspaceNumber = ({ index, ...rest }) => label({ // Changed to lowercase
            className: 'overview-tasks-workspace-number',
            label: `${index}`,
            css: overviewMonitor.bind().as(monitor => `
                margin: ${Math.min(monitors[monitor].width, monitors[monitor].height) * userOptions.overview.scale * userOptions.overview.wsNumMarginScale}px;
                font-size: ${monitors[monitor].height * userOptions.overview.scale * userOptions.overview.wsNumScale}px;
            `),
            setup: (self) => self.hook(Hyprland.active.workspace, (self) => {
                // Update when going to new ws group
                const currentGroup = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN);
                self.label = `${currentGroup * NUM_OF_WORKSPACES_SHOWN + index}`;
            }),
            ...rest,
        })
        const widget = box({ // Changed to lowercase
            className: 'overview-tasks-workspace',
            vpack: 'center',
            // Rounding and adding 1px to minimum width/height to work around scaling inaccuracy:
            css: overviewMonitor.bind().as(monitor => `
                min-width: ${1 + Math.round(monitors[monitor].width * userOptions.overview.scale)}px;
                min-height: ${1 + Math.round(monitors[monitor].height * userOptions.overview.scale)}px;
            `),
            children: [eventBox({ // Changed to lowercase
                hexpand: true,
                onPrimaryClick: () => {
                    Hyprland.messageAsync(`dispatch workspace ${index}`);
                    app.closeWindow('overview'); // Corrected to app
                },
                setup: (eventbox) => {
                    eventbox.drag_dest_set(Gtk.DestDefaults.ALL, TARGET, Gdk.DragAction.COPY);
                    eventbox.connect('drag-data-received', (_w, _c, _x, _y, data) => {
                        const offset = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN) * NUM_OF_WORKSPACES_SHOWN;
                        Hyprland.messageAsync(`dispatch movetoworkspacesilent ${index + offset},address:${data.get_text()}`)
                        overviewTick.setValue(!overviewTick.value);
                    });
                },
                child: overlay({ // Changed to lowercase
                    child: box({}), // Changed to lowercase
                    overlays: [
                        WorkspaceNumber({ index: index, hpack: 'start', vpack: 'start' }),
                        fixed
                    ]
                }),
            })],
        });
        const offset = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN) * NUM_OF_WORKSPACES_SHOWN;
        fixed.attribute.put(WorkspaceNumber(offset + index), 0, 0);
        widget.clear = () => {
            const offset = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN) * NUM_OF_WORKSPACES_SHOWN;
            clientMap.forEach((client, address) => {
                if (!client) return;
                if ((client.attribute.ws <= offset || client.attribute.ws > offset + NUM_OF_WORKSPACES_SHOWN) ||
                    (client.attribute.ws == offset + index)) {
                    client.destroy();
                    client = null;
                    clientMap.delete(address);
                }
            });
        }
        widget.set = (clientJson, screenCoords) => {
            let c = clientMap.get(clientJson.address);
            if (c) {
                if (c.attribute?.ws !== clientJson.workspace.id) {
                    c.destroy();
                    c = null;
                    clientMap.delete(clientJson.address);
                }
                else if (c) {
                    c.attribute.w = clientJson.size[0];
                    c.attribute.h = clientJson.size[1];
                    c.attribute.updateIconSize(c);
                    fixed.attribute.move(c,
                        Math.max(0, clientJson.at[0] * userOptions.overview.scale),
                        Math.max(0, clientJson.at[1] * userOptions.overview.scale)
                    );
                    return;
                }
            }
            const newWindow = Window(clientJson, screenCoords);
            if (newWindow === null) return;
            // clientMap.set(clientJson.address, newWindow);
            fixed.attribute.put(newWindow,
                Math.max(0, newWindow.attribute.x * userOptions.overview.scale),
                Math.max(0, newWindow.attribute.y * userOptions.overview.scale)
            );
            clientMap.set(clientJson.address, newWindow);
        };
        widget.unset = (clientAddress) => {
            const offset = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN) * NUM_OF_WORKSPACES_SHOWN;
            let c = clientMap.get(clientAddress);
            if (!c) return;
            c.destroy();
            c = null;
            clientMap.delete(clientAddress);
        };
        widget.show = () => {
            fixed.show_all();
        }
        return widget;
    };

    const arr = (s, n) => {
        const array = [];
        for (let i = 0; i < n; i++)
            array.push(s + i);

        return array;
    };

    const OverviewRow = ({ startWorkspace, workspaces, windowName = 'overview' }) => box({ // Changed to lowercase
        children: arr(startWorkspace, workspaces).map(Workspace),
        attribute: {
            workspaceGroup: Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN),
            monitorMap: [],
            getMonitorMap: (box) => {
                execAsync('hyprctl -j monitors').then(monitors => {
                    box.attribute.monitorMap = JSON.parse(monitors).reduce((acc, item) => {
                        acc[item.id] = { x: item.x, y: item.y };
                        return acc;
                    }, {});
                });
            },
            update: (box) => {
                const offset = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN) * NUM_OF_WORKSPACES_SHOWN;
                Hyprland.messageAsync('j/clients').then(clients => {
                    const allClients = JSON.parse(clients);
                    const kids = box.get_children();
                    kids.forEach(kid => kid.clear());
                    for (let i = 0; i < allClients.length; i++) {
                        const client = allClients[i];
                        const childID = client.workspace.id - (offset + startWorkspace);
                        if (offset + startWorkspace <= client.workspace.id &&
                            client.workspace.id <= offset + startWorkspace + workspaces) {
                            const screenCoords = box.attribute.monitorMap[client.monitor];
                            if (kids[childID]) {
                                kids[childID].set(client, screenCoords);
                            }
                            continue;
                        }
                    }
                    kids.forEach(kid => kid.show());
                }).catch(print);
            },
            updateWorkspace: (box, id) => {
                const offset = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN) * NUM_OF_WORKSPACES_SHOWN;
                if (!( // Not in range, ignore
                    offset + startWorkspace <= id &&
                    id <= offset + startWorkspace + workspaces
                )) return;
                // if (!App.getWindow(windowName)?.visible) return;
                Hyprland.messageAsync('j/clients').then(clients => {
                    const allClients = JSON.parse(clients);
                    const kids = box.get_children();
                    for (let i = 0; i < allClients.length; i++) {
                        const client = allClients[i];
                        if (client.workspace.id != id) continue;
                        const screenCoords = box.attribute.monitorMap[client.monitor];
                        kids[id - (offset + startWorkspace)]?.set(client, screenCoords);
                    }
                    kids[id - (offset + startWorkspace)]?.show();
                }).catch(print);
            },
        },
        setup: (box) => {
            box.attribute.getMonitorMap(box);
            box
                .hook(overviewTick, (box) => box.attribute.update(box))
                .hook(Hyprland, (box, clientAddress) => {
                    const offset = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN) * NUM_OF_WORKSPACES_SHOWN;
                    const kids = box.get_children();
                    const client = Hyprland.getClient(clientAddress);
                    if (!client) return;
                    const id = client.workspace.id;

                    box.attribute.updateWorkspace(box, id);
                    kids[id - (offset + startWorkspace)]?.unset(clientAddress);
                }, 'client-removed')
                .hook(Hyprland, (box, clientAddress) => {
                    const client = Hyprland.getClient(clientAddress);
                    if (!client) return;
                    box.attribute.updateWorkspace(box, client.workspace.id);
                }, 'client-added')
                .hook(Hyprland.active.workspace, (box) => {
                    // Full update when going to new ws group
                    const previousGroup = box.attribute.workspaceGroup;
                    const currentGroup = Math.floor((Hyprland.active.workspace.id - 1) / NUM_OF_WORKSPACES_SHOWN);
                    if (currentGroup !== previousGroup) {
                        if (!app.getWindow(windowName) || !app.getWindow(windowName).visible) return; // Corrected to app
                        box.attribute.update(box);
                        box.attribute.workspaceGroup = currentGroup;
                    }
                })
                .hook(app, (box, name, visible) => { // Update on open // Corrected to app
                    if (name == 'overview' && visible) {
                        overviewMonitor.value = Hyprland.active.monitor.id;
                        box.attribute.update(box);
                    }
                })
        },
    });

    return revealer({ // Changed to lowercase
        revealChild: true,
        // hpack to prevent unneeded expansion in overview-tasks-workspace:
        hpack: 'center',
        transition: 'slide_down',
        transitionDuration: userOptions.animations.durationLarge,
        child: box({ // Changed to lowercase
            vertical: true,
            className: 'overview-tasks',
            children: Array.from({ length: userOptions.overview.numOfRows }, (_, index) =>
                OverviewRow({
                    startWorkspace: 1 + index * userOptions.overview.numOfCols,
                    workspaces: userOptions.overview.numOfCols,
                })
            )
        }),
    });
}
