import { Gtk, Gdk, Pango, PangoCairo, Cairo } from 'ags/gtk4'; // Corrected imports
import { app } from 'ags/gtk4/app'; // Corrected
// Intrinsics: <drawingarea>, <box>
import { createEffect, createState, createBinding } from 'ags';
import { execAsync } from 'ags/process';
import { options as userOptions } from '../../options.js';
import Hyprland from 'gi://AstalHyprland';

const mix = (value1, value2, perc) => value1 * perc + value2 * (1 - perc);

const getFontWeightName = (weight) => {
    if (weight === Pango.Weight.ULTRA_LIGHT) return 'UltraLight';
    if (weight === Pango.Weight.LIGHT) return 'Light';
    if (weight === Pango.Weight.NORMAL) return 'Normal';
    if (weight === Pango.Weight.BOLD) return 'Bold';
    if (weight === Pango.Weight.ULTRA_BOLD) return 'UltraBold';
    if (weight === Pango.Weight.HEAVY) return 'Heavy';
    return 'Normal';
};

const WORKSPACE_COUNT = userOptions.workspaces?.shown || 10;

// This component is passed gdkmonitor if it needs monitor-specific info not available from Hyprland service directly
const WorkspaceContents = ({ activeWsId_accessor, workspaces_accessor, gdkmonitor }) => {
    // Dummy widgets for style property fetching
    const dummyWsActive = box({ class: 'bar-ws bar-ws-active' });
    const dummyWsOccupied = box({ class: 'bar-ws bar-ws-occupied' });
    const dummyWsInactive = box({ class: 'bar-ws' });

    const [workspaceMask, setWorkspaceMask] = createState(0);
    const [currentWsGroup, setCurrentWsGroup] = createState(0);

    createEffect(() => {
        const activeId = activeWsId_accessor.value;
        const newGroup = Math.floor(((activeId || 1) - 1) / WORKSPACE_COUNT);
        if (newGroup !== currentWsGroup.value) {
            setCurrentWsGroup(newGroup);
        }
        const offset = newGroup * WORKSPACE_COUNT;
        let newMask = 0;
        (workspaces_accessor.value || []).forEach(ws => {
            if (ws.id <= offset || ws.id > offset + WORKSPACE_COUNT) return;
            if (ws.windows > 0) newMask |= (1 << (ws.id - offset));
        });
        setWorkspaceMask(newMask);
    }, [activeWsId_accessor, workspaces_accessor, currentWsGroup]);

    const drawFn = (area, cr, width, height) => {
        const activeId = activeWsId_accessor.value || 1;
        const groupOffset = currentWsGroup.value * WORKSPACE_COUNT;
        const currentMask = workspaceMask.value;
        const styleContext = area.get_style_context();

        // Fetch style properties from the drawingarea's context
        // These should be defined in SCSS for the '.bar-ws-container' or specific classes.
        const workspaceDiameter = styleContext.get_property('min-width', Gtk.StateFlags.NORMAL) / WORKSPACE_COUNT || (userOptions.workspaces?.diameter || 24);
        const workspaceRadius = workspaceDiameter / 2;
        const workspaceFontSize = styleContext.get_property('font-size', Gtk.StateFlags.NORMAL) || (userOptions.workspaces?.fontSize || 10);
        const fontFamily = styleContext.get_property('font-family', Gtk.StateFlags.NORMAL)?.to_string() || "sans-serif";
        const fontWeight = styleContext.get_property('font-weight', Gtk.StateFlags.NORMAL) || Pango.Weight.NORMAL;

        // Get colors from dummy widgets
        const activeStyleContext = dummyWsActive.get_style_context();
        const occupiedStyleContext = dummyWsOccupied.get_style_context();
        const inactiveStyleContext = dummyWsInactive.get_style_context();

        const activebg = activeStyleContext.get_property('background-color', Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 0.3, green: 0.5, blue: 0.8, alpha: 1 });
        const activefg = activeStyleContext.get_color(Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 1, green: 1, blue: 1, alpha: 1 });

        const occupiedbg = occupiedStyleContext.get_property('background-color', Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 0.4, green: 0.4, blue: 0.4, alpha: 1 });
        const occupiedfg = occupiedStyleContext.get_color(Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 1, green: 1, blue: 1, alpha: 1 });

        const wsbg = inactiveStyleContext.get_property('background-color', Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 0.2, green: 0.2, blue: 0.2, alpha: 1 });
        const wsfg = inactiveStyleContext.get_color(Gtk.StateFlags.NORMAL) || new Gdk.RGBA({ red: 0.9, green: 0.9, blue: 0.9, alpha: 1 });


        area.set_size_request(workspaceDiameter * WORKSPACE_COUNT, workspaceDiameter);

        const activeWsInCurrentGroup = (activeId - 1) % WORKSPACE_COUNT + 1;
        const activeWsCenterX = -(workspaceRadius) + (workspaceDiameter * activeWsInCurrentGroup);
        const activeWsCenterY = height / 2;

        const layout = PangoCairo.create_layout(cr);
        const fontDesc = Pango.FontDescription.from_string(`${fontFamily} ${getFontWeightName(fontWeight)} ${workspaceFontSize}`);
        layout.set_font_description(fontDesc);
        cr.set_antialias(Cairo.Antialias.BEST);

        for (let i = 1; i <= WORKSPACE_COUNT; i++) {
            if (currentMask & (1 << i)) {
                cr.set_source_rgba(occupiedbg.red, occupiedbg.green, occupiedbg.blue, occupiedbg.alpha);
                const wsCenterX = -(workspaceRadius) + (workspaceDiameter * i);
                cr.arc(wsCenterX, activeWsCenterY, workspaceRadius * 0.7, 0, 2 * Math.PI); // Smaller indicator for occupied
                cr.fill();
            }
        }

        cr.set_source_rgba(activebg.red, activebg.green, activebg.blue, activebg.alpha);
        cr.arc(activeWsCenterX, activeWsCenterY, workspaceRadius * 0.85, 0, 2 * Math.PI); // Slightly smaller than full radius
        cr.fill();

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
        }
    };

    return (
        <drawingarea
            class='bar-ws-container'
            drawFn={drawFn}
            $={self => {
                 createEffect(() => {
                    self.queue_draw();
                 }, [workspaceMask, activeWsId_accessor, currentWsGroup, Hyprland.monitors]); // Redraw on monitor changes too
            }}
        />
    );
};

// Expects gdkmonitor prop
export default function WorkspacesHyprland({ gdkmonitor }) {
    const [isClicked, setIsClicked] = createState(false);

    const workspaceDisplay = WorkspaceContents({
        activeWsId_accessor: Hyprland.active.workspace.transform(ws => ws?.id), // Pass accessor to id
        workspaces_accessor: Hyprland.workspaces, // Pass accessor to the array of workspaces
        gdkmonitor: gdkmonitor,
    });

    return (
        // Replace eventbox with box and gestures
        <box
            class='workspaces-hyprland-eventbox' // Add class for styling
            $={self => {
                const scrollController = Gtk.EventControllerScroll.new(Gtk.EventControllerScrollFlags.VERTICAL);
                scrollController.connect('scroll', (controller, dx, dy) => {
                    if (dy > 0) Hyprland.messageAsync(`dispatch workspace r+1`).catch(print);
                    else Hyprland.messageAsync(`dispatch workspace r-1`).catch(print);
                    return Gdk.EVENT_STOP;
                });
                self.add_controller(scrollController);

                const clickCtrl = Gtk.GestureClick.new();
                clickCtrl.connect('pressed', (gesture, n_press, x, y) => {
                    const button = gesture.get_current_button();
                    if (button === Gdk.BUTTON_PRIMARY) {
                        setIsClicked(true);
                        const widgetWidth = self.get_allocated_width();
                        const groupOffset = Math.floor(((Hyprland.active.workspace.value?.id || 1) - 1) / WORKSPACE_COUNT) * WORKSPACE_COUNT;
                        const wsId = Math.ceil(x * WORKSPACE_COUNT / widgetWidth) + groupOffset;
                        execAsync([`${app.configDir}/scripts/hyprland/workspace_action.sh`, 'workspace', `${Math.max(1,Math.floor(wsId))}`]).catch(print);
                    } else if (button === Gdk.BUTTON_MIDDLE) {
                        app.toggleWindow(`osk${gdkmonitor.get_monitor_number()}`);
                    } else if (button === Gdk.BUTTON_SECONDARY) {
                        app.toggleWindow('overview');
                    } else if (button === 8) { // Side button
                        Hyprland.messageAsync(`dispatch togglespecialworkspace`).catch(print);
                    }
                });
                clickCtrl.connect('released', () => setIsClicked(false));
                self.add_controller(clickCtrl);

                const motionCtrl = Gtk.EventControllerMotion.new();
                motionCtrl.connect('motion', (controller, x, y) => {
                    if (isClicked.value) {
                        const widgetWidth = self.get_allocated_width();
                        const groupOffset = Math.floor(((Hyprland.active.workspace.value?.id || 1) - 1) / WORKSPACE_COUNT) * WORKSPACE_COUNT;
                        const wsId = Math.ceil(x * WORKSPACE_COUNT / widgetWidth) + groupOffset;
                        execAsync([`${app.configDir}/scripts/hyprland/workspace_action.sh`, 'workspace', `${Math.max(1,Math.floor(wsId))}`]).catch(print);
                    }
                });
                self.add_controller(motionCtrl);
            }}
        >
            <box homogeneous={true} class='bar-group-margin'>
                <box
                    class={`bar-group ${userOptions.appearance?.borderless ? '-borderless' : ''} bar-group-standalone bar-group-pad`}
                    css='min-width: 2px;'
                >
                    {workspaceDisplay}
                </box>
            </box>
        </box>
    );
}
