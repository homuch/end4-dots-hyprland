import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import Pango from 'gi://Pango'; // For text rendering if needed beyond simple labels
// import PangoCairo from 'gi://PangoCairo'; // If using PangoCairo for custom text on drawingarea
// import Cairo from 'gi://cairo'; // If using custom drawing for workspaces (original did not)

import App from 'ags/app';
import { box, label, button, icon as AgsIcon, revealer, eventbox, fixed as AgsFixed, menu, menuitem } from 'ags/widgets';
import { createState, createEffect, createBinding, Utils } from 'ags';
import { execAsync } from 'ags/process';

import Hyprland from 'gi://AstalHyprland';
import { options as userOptions } from '../../../options.js';
import { setupCursorHover, setupCursorHoverGrab } from '../../../utils/cursorHover.js';
import { dumpToWorkspace, swapWorkspace } from '../../../utils/overviewActions.js';
import { substitute as substituteIconName } from '../../../utils/iconUtils.js';
// import { monitors as monitorDataFallback } from '../../../utils/monitorData.js'; // If hyprland service doesn't provide detailed monitor data

const NUM_OF_WORKSPACES_SHOWN = (userOptions.overview?.numOfCols || 5) * (userOptions.overview?.numOfRows || 2);
const TARGET_PLAIN_TEXT = [{ target: 'text/plain', flags: Gtk.TargetFlags.SAME_APP, info: 0 }];


// --- Client Window Representation ---
const ClientWindow = ({ clientJson, overviewMonitorId_accessor, overviewScale_accessor }) => {
    const { address, at, size, workspace, class: clientClass, initialClass, monitor: clientMonitorId, title, xwayland } = clientJson;

    // Calculate scaled size and position
    // This needs access to current monitor data (for scaling if windows are on different DPI monitors)
    // and the overview monitor's data (to scale relative to it).
    // For now, assuming Hyprland.monitors accessor provides this.

    const [scaledPosSize, setScaledPosSize] = createState({ x: 0, y: 0, w: 10, h: 10 });

    createEffect(() => {
        const overviewMonId = overviewMonitorId_accessor.value;
        const allMonitors = Hyprland.monitors.value; // Array of monitor objects
        const overviewMon = allMonitors.find(m => m.id === overviewMonId);
        const clientMon = allMonitors.find(m => m.id === clientMonitorId);
        const scale = overviewScale_accessor.value;

        if (!overviewMon || !clientMon || !at || !size) {
            // console.warn("ClientWindow: Missing monitor or client data for scaling", clientJson, overviewMon, clientMon);
            return;
        }

        let [x, y] = at;
        let [w, h] = size;

        // Adjust for multi-monitor origin relative to overview monitor
        x = x - clientMon.x + overviewMon.x;
        y = y - clientMon.y + overviewMon.y;

        // Scale relative to client's original monitor then to overview monitor's scale if different physical sizes/dpis
        // This part is complex if monitors have different DPIs/resolutions.
        // Simplified: assume direct scaling for now.
        // The original logic:
        // w *= overviewMon.width / clientMon.width;
        // h *= overviewMon.height / clientMon.height;
        // This might be problematic if aspect ratios differ wildly or if scale isn't just about relative size.

        let sX = Math.round(x * scale);
        let sY = Math.round(y * scale);
        let sW = Math.round(w * scale);
        let sH = Math.round(h * scale);

        // Truncate if offscreen (relative to overviewMon's scaled dimensions)
        const scaledOverviewWidth = overviewMon.width * scale;
        const scaledOverviewHeight = overviewMon.height * scale;

        if (sX < 0) { sW = Math.max(0, sW + sX); sX = 0; }
        if (sY < 0) { sH = Math.max(0, sH + sY); sY = 0; }
        if (sX + sW > scaledOverviewWidth) sW = Math.max(0, scaledOverviewWidth - sX);
        if (sY + sH > scaledOverviewHeight) sH = Math.max(0, scaledOverviewHeight - sY);

        setScaledPosSize({ x: sX, y: sY, w: sW, h: sH });

    }, [Hyprland.monitors, overviewMonitorId_accessor, overviewScale_accessor, clientJson]); // Re-calc if these change


    const effectiveClass = clientClass || initialClass || "";
    const iconName = substituteIconName(effectiveClass); // Use general icon util
    const displayTitle = (title?.length || 0) <= 1 && effectiveClass ? `${effectiveClass}: ${title}` : title || effectiveClass || "Window";
    const revealInfoCondition = scaledPosSize.transform(sps => Math.min(sps.w, sps.h) > 70); // Based on scaled size

    const appIcon = AgsIcon({
        icon: iconName || 'application-x-executable-symbolic', // Fallback
        size: scaledPosSize.transform(sps => Math.max(16, Math.min(sps.w, sps.h) / 2.5)), // Dynamic icon size
    });

    const clientButton = button({
        className: 'overview-tasks-window', // Ensure SCSS
        tooltipText: `${effectiveClass}: ${title}`,
        onClicked: () => {
            Hyprland.messageAsync(`dispatch focuswindow address:${address}`).catch(print);
            App.closeWindow('overview'); // Assuming overview window is named 'overview'
        },
        onMiddleClickRelease: () => Hyprland.messageAsync(`dispatch closewindow address:${address}`).catch(print),
        onSecondaryClick: (btnWidget) => {
            btnWidget.toggleClassName('overview-tasks-window-selected', true);
            const contextMenu = menu({
                className: 'menu', // Ensure SCSS
                children: [
                    menuitem({ label: "Close (Middle-click)", onActivate: () => Hyprland.messageAsync(`dispatch closewindow address:${address}`).catch(print) }),
                    // TODO: ContextMenuWorkspaceArray equivalent for v2 if possible, or simplify.
                    // This requires dynamically building menu items based on available workspaces.
                    // For now, this part is omitted for simplicity.
                ],
                setup: (m) => { // Setup for the menu itself
                    m.connect("deactivate", () => btnWidget.toggleClassName('overview-tasks-window-selected', false));
                    // old: selection-done
                }
            });
            contextMenu.popup_at_widget(btnWidget, Gdk.Gravity.SOUTH, Gdk.Gravity.NORTH, null);
        },
        child: box({
            homogeneous: true, // To center its child if smaller
            child: box({
                vertical: true, vpack: 'center',
                children: [
                    appIcon,
                    revealer({
                        transition: Gtk.RevealerTransitionType.SLIDE_RIGHT, // Example
                        revealChild: revealInfoCondition,
                        child: revealer({ // Nested for combined effect
                            transition: Gtk.RevealerTransitionType.SLIDE_DOWN,
                            revealChild: revealInfoCondition,
                            child: label({
                                maxWidthChars: 15, truncate: 'end', ellipsize: Pango.EllipsizeMode.END,
                                className: `margin-top-5 ${xwayland ? 'txt txt-italic' : 'txt'}`, // Ensure SCSS
                                css: createBinding([Hyprland.monitors, overviewMonitorId_accessor, overviewScale_accessor],
                                    (mons, ovMonId, ovScale) => {
                                        const ovMon = mons.find(m=>m.id === ovMonId);
                                        if(!ovMon) return '';
                                        return `font-size: ${Math.min(ovMon.width, ovMon.height) * ovScale / 14.6}px; margin: 0px ${Math.min(ovMon.width, ovMon.height) * ovScale / 10}px;`;
                                    }
                                ),
                                label: displayTitle,
                            })
                        })
                    })
                ]
            })
        }),
        setup: (btn) => {
            setupCursorHoverGrab(btn);
            // Drag and Drop setup
            const dragSource = Gtk.DragSource.new();
            dragSource.set_actions(Gdk.DragAction.MOVE);
            dragSource.connect("prepare", (source, x, y) => {
                const data = new GLib.Bytes(address); // Drag client address
                const content = Gdk.ContentProvider.new_for_bytes('text/plain', data);
                return content;
            });
            dragSource.connect("drag-begin", (source, drag) => {
                btn.toggleClassName('overview-tasks-window-dragging', true);
                 // Set icon for drag operation
                const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
                const paintable = iconTheme.load_icon(iconName || 'application-x-executable-symbolic', 48, 0, null);
                if (paintable) dragSource.set_icon_paintable(paintable) ; // Gdk.Paintable
            });
            dragSource.connect("drag-end", (source, drag, deleteData) => {
                btn.toggleClassName('overview-tasks-window-dragging', false);
            });
            btn.add_controller(dragSource);
        }
    });

    // This button is positioned by the parent AgsFixed.
    // We return the button and its desired scaled position/size.
    return { widget: clientButton, posSize_accessor: scaledPosSize, address: address };
};


// --- Workspace Representation ---
const Workspace = ({ workspaceId, overviewMonitorId_accessor, overviewScale_accessor, clientsInWs_accessor }) => {
    const fixedLayout = AgsFixed({ // Use AGS Fixed intrinsic
        // This fixed layout will contain ClientWindow widgets
    });

    // Effect to update children of AgsFixed when clientsInWs_accessor changes
    createEffect(() => {
        const clientWidgetsMap = new Map(); // address -> { widget, posSize_accessor }
        fixedLayout.get_children().forEach(child => { // Clear old children (brute force, could be smarter)
            if (child.address_for_removal) clientWidgetsMap.set(child.address_for_removal, child); // Keep track if needed
            fixedLayout.remove(child);
        });

        clientsInWs_accessor.value.forEach(clientJson => {
            const clientRepresentation = ClientWindow({
                clientJson,
                overviewMonitorId_accessor,
                overviewScale_accessor
            });

            clientRepresentation.widget.address_for_removal = clientJson.address; // For easier removal
            clientWidgetsMap.set(clientJson.address, clientRepresentation);

            // Effect to update position in AgsFixed when scaledPosSize changes for this client
            createEffect(() => {
                const { x, y } = clientRepresentation.posSize_accessor.value;
                // Check if widget is still a child before moving (it might have been removed)
                if(clientRepresentation.widget.get_parent() === fixedLayout) {
                    fixedLayout.move(clientRepresentation.widget, x, y);
                }
            }, [clientRepresentation.posSize_accessor]);

            // Add initially
            const { x, y } = clientRepresentation.posSize_accessor.value;
            fixedLayout.put(clientRepresentation.widget, x, y);
        });

    }, [clientsInWs_accessor, overviewMonitorId_accessor, overviewScale_accessor]);


    const WorkspaceNumberLabel = ({ wsId }) => label({
        className: 'overview-tasks-workspace-number', // Ensure SCSS
        label: `${wsId}`, // This needs to adjust if showing grouped workspaces
        css: createBinding([Hyprland.monitors, overviewMonitorId_accessor, overviewScale_accessor],
            (mons, ovMonId, ovScale) => {
                const ovMon = mons.find(m=>m.id === ovMonId);
                if(!ovMon) return '';
                const margin = Math.min(ovMon.width, ovMon.height) * ovScale * (userOptions.overview?.wsNumMarginScale || 0.07);
                const fontSize = ovMon.height * ovScale * (userOptions.overview?.wsNumScale || 0.09);
                return `margin: ${margin}px; font-size: ${fontSize}px;`;
            }
        ),
    });

    return box({
        className: 'overview-tasks-workspace', // Ensure SCSS
        vpack: 'center', // Or fill, depending on desired layout
        css: createBinding([Hyprland.monitors, overviewMonitorId_accessor, overviewScale_accessor],
            (mons, ovMonId, ovScale) => {
                const ovMon = mons.find(m=>m.id === ovMonId);
                if(!ovMon) return 'min-width: 200px; min-height: 120px;'; // Fallback size
                return `min-width: ${1 + Math.round(ovMon.width * ovScale)}px; min-height: ${1 + Math.round(ovMon.height * ovScale)}px;`;
            }
        ),
        child: eventbox({
            hexpand: true, vexpand: true, // Make eventbox fill the workspace area
            onPrimaryClick: () => {
                Hyprland.messageAsync(`dispatch workspace ${workspaceId}`).catch(print);
                App.closeWindow('overview');
            },
            setup: (eventBox) => { // Setup for DropTarget
                const dropTarget = Gtk.DropTarget.new(GLib.Bytes, Gdk.DragAction.MOVE);
                dropTarget.set_gtypes([Gtk.Widget]); // Accept Gtk.Widget (or text/plain for address)
                                                   // The original used text/plain for address.
                dropTarget.connect('drop', (target, value, x, y) => {
                    // Value here depends on what DragSource provides.
                    // If it's the client address (string):
                    if (typeof value === 'string') {
                        Hyprland.messageAsync(`dispatch movetoworkspacesilent ${workspaceId},address:${value}`).catch(print);
                        // overviewTick.setValue(!overviewTick.value); // Trigger refresh if needed
                        return true;
                    }
                    return false;
                });
                eventBox.add_controller(dropTarget);
            },
            child: overlay({ // To put workspace number over the fixed layout
                child: fixedLayout, // The area where client windows are placed
                overlays: [
                    WorkspaceNumberLabel({ wsId: workspaceId, hpack: 'start', vpack: 'start' }),
                ]
            }),
        }),
    });
};


// --- Main Overview Display ---
export default function HyprlandOverviewDisplay() {
    // State for the current monitor being shown in overview (if multi-monitor overview is a concept)
    // Original used a global `overviewMonitor` variable.
    const [currentOverviewMonitorId, setCurrentOverviewMonitorId] = createState(Hyprland.active.monitor.value?.id || 0);
    // Update this if active monitor changes while overview is open
    createEffect(() => {
        // This check is important: only update if overview is visible.
        // App.getWindow('overview')?.visible can check this.
        // For now, assume it updates.
        setCurrentOverviewMonitorId(Hyprland.active.monitor.value?.id || 0);
    }, [Hyprland.active.monitor]);


    // Scale for overview elements
    const overviewScale = createState(userOptions.overview?.scale || 0.18)[0]; // Make it an accessor

    // Group workspaces by row
    const rows = [];
    const numCols = userOptions.overview?.numOfCols || 5;
    const numRows = userOptions.overview?.numOfRows || 2;
    const currentWsGroupId = Hyprland.active.workspace.transform(ws => Math.floor(( (ws?.id || 1) - 1) / NUM_OF_WORKSPACES_SHOWN) );

    // Create accessor for the list of workspaces to display (current group)
    const displayedWorkspaces_accessor = createBinding(
        [Hyprland.workspaces, currentWsGroupId],
        (allWs, groupId) => {
            const groupOffset = groupId * NUM_OF_WORKSPACES_SHOWN;
            return allWs.filter(ws => ws.id > groupOffset && ws.id <= groupOffset + NUM_OF_WORKSPACES_SHOWN);
            // If you need to show empty placeholders for non-existent workspaces up to NUM_OF_WORKSPACES_SHOWN:
            // const activeGroupWs = [];
            // for (let i = 1; i <= NUM_OF_WORKSPACES_SHOWN; i++) {
            //    const id = groupOffset + i;
            //    activeGroupWs.push(allWs.find(w => w.id === id) || { id, windows: 0, name: `${id}` });
            // }
            // return activeGroupWs;
        }
    );

    // Create grid of Workspace components
    for (let i = 0; i < numRows; i++) {
        const rowChildren = [];
        for (let j = 0; j < numCols; j++) {
            const wsIndexInGroup = i * numCols + j; // 0-indexed within the current group of NUM_OF_WORKSPACES_SHOWN

            // Create an accessor for this specific workspace's ID based on group and index
            const workspaceId_accessor = createBinding(
                [currentWsGroupId], (groupId) => (groupId * NUM_OF_WORKSPACES_SHOWN) + wsIndexInGroup + 1
            );

            // Create an accessor for clients only in this specific workspace
            const clientsForThisWs_accessor = createBinding(
                [Hyprland.clients, workspaceId_accessor],
                (allClients, currentWsId) => allClients.filter(c => c.workspace.id === currentWsId)
            );

            rowChildren.push(Workspace({
                // workspaceId: wsId, // Pass the static or reactive ID
                workspaceId_accessor: workspaceId_accessor, // Pass accessor
                overviewMonitorId_accessor: currentOverviewMonitorId,
                overviewScale_accessor: overviewScale,
                clientsInWs_accessor: clientsForThisWs_accessor,
            }));
        }
        rows.push(box({ children: rowChildren, className: 'overview-row spacing-h-10' })); // Ensure SCSS for spacing
    }

    return revealer({ // Main revealer for the whole overview content
        revealChild: true, // Or bind to overview visibility state
        hpack: 'center',
        vpack: 'center',
        transition: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transitionDuration: userOptions.animations?.durationLarge || 180,
        child: box({
            vertical: true,
            className: 'overview-tasks spacing-v-10', // Ensure SCSS for spacing
            children: rows,
        }),
        // Original had hooks for overviewTick, client-added/removed, active.workspace, App visibility
        // These are now handled by createEffect within Workspace and ClientWindow components,
        // and by Hyprland service providing reactive accessors.
    });
}
