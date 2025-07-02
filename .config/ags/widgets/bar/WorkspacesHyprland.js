import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import Pango from 'gi://Pango';
import PangoCairo from 'gi://PangoCairo';
import Cairo from 'gi://cairo';
import App from 'ags/app';
import { drawingarea, eventbox, box } from 'ags/widgets';
import { createEffect, createState, createBinding } from 'ags';
import { execAsync } from 'ags/process';
import { options as userOptions } from '../../options.js';

import Hyprland from '../../services/hyprlandService.js'; // Import centralized service
// No more FakeHyprland definition here

const mix = (value1, value2, perc) => {
    return value1 * perc + value2 * (1 - perc);
};

const getFontWeightName = (weight) => { // Pango.Weight to string
    // This might need adjustment based on exact Pango.Weight enum values in GJS for GTK4
    if (weight === Pango.Weight.ULTRA_LIGHT) return 'UltraLight';
    if (weight === Pango.Weight.LIGHT) return 'Light';
    if (weight === Pango.Weight.NORMAL) return 'Normal';
    if (weight === Pango.Weight.BOLD) return 'Bold';
    if (weight === Pango.Weight.ULTRA_BOLD) return 'UltraBold';
    if (weight === Pango.Weight.HEAVY) return 'Heavy';
    return 'Normal';
};

// Number of workspaces to show (e.g., 10)
const WORKSPACE_COUNT = userOptions.workspaces?.shown || 10;

const WorkspaceContents = ({ activeWsId_accessor, workspaces_accessor }) => {
    const [workspaceMask, setWorkspaceMask] = createState(0);
    const [currentWsGroup, setCurrentWsGroup] = createState(0);
    // We need to pass activeWsId and workspaces list to drawFn closure or access them via hyprland global.
    // For reactivity, it's better to use accessors passed as props.

    createEffect(() => {
        const activeId = activeWsId_accessor.value;
        const newGroup = Math.floor((activeId - 1) / WORKSPACE_COUNT);
        if (newGroup !== currentWsGroup.value) {
            setCurrentWsGroup(newGroup);
        }
        // Update mask based on active workspace and all workspaces
        // This effect depends on both activeWsId_accessor and workspaces_accessor
        const offset = newGroup * WORKSPACE_COUNT;
        let newMask = 0;
        for (const ws of workspaces_accessor.value) {
            if (ws.id <= offset || ws.id > offset + WORKSPACE_COUNT) continue;
            if (ws.windows > 0) {
                newMask |= (1 << (ws.id - offset));
            }
        }
        setWorkspaceMask(newMask);

    }, [activeWsId_accessor, workspaces_accessor, currentWsGroup]); // currentWsGroup is also a dep to recalc offset

    const drawFn = (area, cr, width, height) => {
        const activeId = activeWsId_accessor.value; // Current active workspace ID
        const groupOffset = currentWsGroup.value * WORKSPACE_COUNT;
        const currentMask = workspaceMask.value; // Current mask for occupied workspaces

        // Style properties: These should ideally be fetched from CSS or theme configuration
        // For now, using placeholder values.
        const workspaceDiameter = userOptions.workspaces?.diameter || 24; // Diameter of each workspace dot
        const workspaceRadius = workspaceDiameter / 2;
        const workspaceFontSize = userOptions.workspaces?.fontSize || 10;
        const workspaceFontFamily = userOptions.workspaces?.fontFamily || "sans-serif";
        const workspaceFontWeight = Pango.Weight.NORMAL; // Placeholder

        // Colors (placeholders, should come from theme/CSS)
        const wsbg = { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 }; // Default background
        const wsfg = { red: 0.9, green: 0.9, blue: 0.9, alpha: 1 }; // Default foreground (number)
        const occupiedbg = { red: 0.4, green: 0.4, blue: 0.4, alpha: 1 }; // Occupied background
        const occupiedfg = { red: 1, green: 1, blue: 1, alpha: 1 };     // Occupied foreground (number)
        const activebg = { red: 0.3, green: 0.5, blue: 0.8, alpha: 1 };   // Active background
        const activefg = { red: 1, green: 1, blue: 1, alpha: 1 };       // Active foreground (number)

        // In a real scenario, one would use area.get_style_context() and get colors/fonts
        // const styleContext = area.get_style_context();
        // const wsbg = styleContext.get_property('background-color', Gtk.StateFlags.NORMAL); // etc.
        // This requires CSS to be set up correctly for the drawingarea or its parent.

        area.set_size_request(workspaceDiameter * WORKSPACE_COUNT, workspaceDiameter); // Request size

        const activeWsInCurrentGroup = (activeId - 1) % WORKSPACE_COUNT + 1;
        const activeWsCenterX = -(workspaceRadius) + (workspaceDiameter * activeWsInCurrentGroup);
        const activeWsCenterY = height / 2;

        const layout = PangoCairo.create_layout(cr);
        const fontDesc = Pango.FontDescription.from_string(`${workspaceFontFamily} ${getFontWeightName(workspaceFontWeight)} ${workspaceFontSize}`);
        layout.set_font_description(fontDesc);
        cr.set_antialias(Cairo.Antialias.BEST);

        // Draw occupied highlights (simplified version of original connected rects)
        for (let i = 1; i <= WORKSPACE_COUNT; i++) {
            if (currentMask & (1 << i)) {
                cr.set_source_rgba(occupiedbg.red, occupiedbg.green, occupiedbg.blue, occupiedbg.alpha);
                const wsCenterX = -(workspaceRadius) + (workspaceDiameter * i);
                cr.arc(wsCenterX, activeWsCenterY, workspaceRadius * 0.8, 0, 2 * Math.PI); // Smaller circle for occupied
                cr.fill();
            }
        }

        // Draw active ws indicator (larger circle)
        cr.set_source_rgba(activebg.red, activebg.green, activebg.blue, activebg.alpha);
        cr.arc(activeWsCenterX, activeWsCenterY, workspaceRadius, 0, 2 * Math.PI);
        cr.fill();

        // Draw workspace numbers
        for (let i = 1; i <= WORKSPACE_COUNT; i++) {
            const displayId = i + groupOffset;
            const isOccupied = currentMask & (1 << i);
            const isActive = displayId === activeId;

            let fgColor = wsfg;
            if (isActive) fgColor = activefg;
            else if (isOccupied) fgColor = occupiedfg;

            cr.set_source_rgba(fgColor.red, fgColor.green, fgColor.blue, fgColor.alpha);

            layout.set_text(`${displayId}`, -1);
            const [textWidth, textHeight] = layout.get_pixel_size();
            const x = -(workspaceRadius) + (workspaceDiameter * i) - (textWidth / 2);
            const y = (height - textHeight) / 2;
            cr.move_to(x, y);
            PangoCairo.show_layout(cr, layout);
            // cr.stroke(); // Not typically needed for show_layout if color is set
        }
    };

    return drawingarea({
        className: 'bar-ws-container',
        drawFn: drawFn, // Pass the drawing function
        // Request redraw when dependent states change
        // This is a bit manual. createEffect on the drawingarea widget itself might be cleaner.
        // Or, the drawFn should be pure and drawingarea should have props that trigger redraw.
        // For now, let's rely on the effect in parent component to trigger redraw via prop change to drawingarea.
        // Or, if drawingarea has an 'observe' prop:
        // observe: [activeWsId_accessor, workspaces_accessor, workspaceMask, currentWsGroup],
        // This is not standard. Redraws usually happen from queue_draw() or prop changes.
        // The current createEffect updates `workspaceMask`, which could be a prop to this drawingarea.
        // Let's assume drawingarea redraws if its props change.
        // So, pass mask and activeId as props to make it reactive.
        // This component is now simplified to mostly just drawing.
        // The state logic (mask, group) is good here if it's self-contained for this drawing.
        // The parent component (WorkspacesHyprland) will call queue_draw on this drawingarea when needed.
        // The drawingarea's internal state (mask, group) will be updated by effects.
        // And those effects should call area.queue_draw().
        setup: (self) => {
             createEffect(() => { // Effect inside drawingarea setup to trigger redraw on its state change
                self.queue_draw();
             }, [workspaceMask, activeWsId_accessor, currentWsGroup]); // Redraw if mask or active ID or group changes
        }
    });
};


export default function WorkspacesHyprland() {
    const [isClicked, setIsClicked] = createState(false);

    // WorkspaceContents needs reactive access to active workspace ID and the list of workspaces
    // from the Hyprland service.
    const workspaceDisplay = WorkspaceContents({
        activeWsId_accessor: hyprland.active.workspace.id_accessor,
        workspaces_accessor: hyprland.workspaces[0], // Assuming hyprland.workspaces is [state, setState]
    });

    return eventbox({
        onScrollUp: () => hyprland.messageAsync(`dispatch workspace r-1`).catch(print),
        onScrollDown: () => hyprland.messageAsync(`dispatch workspace r+1`).catch(print),
        onMiddleClick: () => App.toggleWindow('osk0'), // Placeholder for toggleWindowOnAllMonitors
        onSecondaryClick: () => App.toggleWindow('overview'),
        child: box({
            homogeneous: true,
            className: 'bar-group-margin',
            children: [box({
                className: `bar-group ${userOptions.appearance?.borderless ? '-borderless' : ''} bar-group-standalone bar-group-pad`,
                css: 'min-width: 2px;', // Original style
                children: [workspaceDisplay],
            })]
        }),
        setup: (self) => {
            // For click and drag workspace change
            const gesture = Gtk.GestureClick.new();
            gesture.connect('pressed', (gesture, n_press, x, y) => {
                if (gesture.get_current_button() === Gdk.BUTTON_PRIMARY) {
                    setIsClicked(true);
                    const widgetWidth = self.get_allocated_width();
                    const wsId = Math.ceil(x * WORKSPACE_COUNT / widgetWidth) + (hyprland.active.workspace.id_accessor.value -1) / WORKSPACE_COUNT * WORKSPACE_COUNT; // Adjust for current group
                    //hyprland.messageAsync(`dispatch workspace ${Math.floor(wsId)}`).catch(print); // Original was execAsync script
                     execAsync([`${App.configDir}/scripts/hyprland/workspace_action.sh`, 'workspace', `${Math.floor(wsId)}`]).catch(print);
                } else if (gesture.get_current_button() === 8) { // Side button (button 8)
                    hyprland.messageAsync(`dispatch togglespecialworkspace`).catch(print);
                }
            });
            gesture.connect('released', () => {
                setIsClicked(false);
            });
            self.add_controller(gesture);

            const motion = Gtk.EventControllerMotion.new();
            motion.connect('motion', (controller, x, y) => {
                if (isClicked.value) { // Check reactive state
                    const widgetWidth = self.get_allocated_width();
                    const wsId = Math.ceil(x * WORKSPACE_COUNT / widgetWidth) + (hyprland.active.workspace.id_accessor.value -1) / WORKSPACE_COUNT * WORKSPACE_COUNT;
                    //hyprland.messageAsync(`dispatch workspace ${Math.floor(wsId)}`).catch(print);
                     execAsync([`${App.configDir}/scripts/hyprland/workspace_action.sh`, 'workspace', `${Math.floor(wsId)}`]).catch(print);
                }
            });
            self.add_controller(motion);
        }
    });
}
