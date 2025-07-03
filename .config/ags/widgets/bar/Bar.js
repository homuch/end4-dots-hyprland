import { app } from 'ags/gtk4/app';
import { Astal, Gtk, Gdk } from 'ags/gtk4';
import { createEffect, createBinding, createState } from 'ags';
import { options as userOptions } from '../../options.js';
import { enableClickthrough } from '../../utils/clickthrough.js';
import { shellModes } from '../../services/shellService.js';
import Battery from 'ags/service/battery'; // Corrected import

// Migrated sub-modules
import MusicDisplay from './MusicDisplay.js';
import SystemDisplay from './SystemDisplay.js';
import SpaceLeft from './SpaceLeft.js';
import SpaceRight from './SpaceRight.js';

// Workspace component imports
import WorkspacesHyprland from './WorkspacesHyprland.js';
import WorkspacesSway from './WorkspacesSway.js';
import FocusWorkspacesHyprland from './FocusWorkspacesHyprland.js';
import FocusWorkspacesSway from './FocusWorkspacesSway.js';

import RoundedCorner from '../common/RoundedCorner.js';

const PlaceholderComponent = (name) => () => <box><label label={`PH: ${name}`} /></box>;

const NormalOptionalWorkspaces = async () => {
    try {
        // TODO: Add logic to detect if Hyprland is active
        return WorkspacesHyprland;
    } catch (e) {
        try {
            // TODO: Add logic to detect if Sway is active
            return WorkspacesSway;
        } catch (e2) {
            return PlaceholderComponent("NormalWorkspaces");
        }
    }
};

const FocusOptionalWorkspaces = async () => {
    try {
        return FocusWorkspacesHyprland;
    } catch (e) {
        try {
            return FocusWorkspacesSway;
        } catch (e2) {
            return PlaceholderComponent("FocusWorkspaces");
        }
    }
};

const SideModule = ({ children }) => <box class='bar-sidemodule'>{children}</box>;

const NormalBarContent = async ({ gdkmonitor }) => {
    const NrmWksComponent = await NormalOptionalWorkspaces();
    const monitorId = gdkmonitor.get_monitor_number();
    return (
        <centerbox class='bar-bg'>
            <SpaceLeft $type="start" gdkmonitor={gdkmonitor} />
            <box $type="center" class='spacing-h-4'>
                <SideModule><MusicDisplay /></SideModule>
                <box homogeneous={true}>
                    <NrmWksComponent gdkmonitor={gdkmonitor} />
                </box>
                <SideModule><SystemDisplay monitorId={monitorId} gdkmonitor={gdkmonitor} /></SideModule>
            </box>
            <SpaceRight $type="end" gdkmonitor={gdkmonitor} />
        </centerbox>
    );
};

const FocusedBarContent = async ({ gdkmonitor }) => {
    const FcsWksComponent = await FocusOptionalWorkspaces();
    return (
        <centerbox
            class={createBinding(
                [Battery.available, Battery.percent, Battery.charging, Battery.low], // Assuming these are accessors or GObject props
                (avail, perc, chrg, lowThreshold) =>
                    `bar-bg-focus ${ (avail && perc <= (lowThreshold || userOptions.battery?.low || 20) && !chrg) ? 'bar-bg-focus-batterylow' : '' }`
            )}
        >
            <box $type="start" />
            <box $type="center" class='spacing-h-4'>
                <SideModule />
                <box homogeneous={true}>
                    <FcsWksComponent gdkmonitor={gdkmonitor} />
                </box>
                <SideModule />
            </box>
            <box $type="end" />
        </centerbox>
    );
};

const NothingContent = () => <box class='bar-bg-nothing' />;

// Main Bar Window Component
// Expects `gdkmonitor` (a Gdk.Monitor object) as a prop.
export const BarWindow = async ({ gdkmonitor }) => {
    const monitorId = gdkmonitor.get_monitor_number();

    const normalContent = await NormalBarContent({ gdkmonitor });
    const focusContent = await FocusedBarContent({ gdkmonitor });

    return (
        <window
            gdkmonitor={gdkmonitor}
            name={`bar${monitorId}`}
            class='bar-window'
            anchor={[Astal.WindowAnchor.TOP, Astal.WindowAnchor.LEFT, Astal.WindowAnchor.RIGHT]}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            layer='top'
            application={app}
            visible={true}
        >
            <stack
                homogeneous={false}
                transition={Gtk.StackTransitionType.SLIDE_UP_DOWN}
                transitionDuration={userOptions.animations?.durationLarge || 180}
                shown={shellModes.transform(modes => modes[monitorId] || 'normal')}
                children={{ // Stack children are defined as an object
                    'normal': normalContent,
                    'focus': focusContent,
                    'nothing': NothingContent(),
                }}
            />
        </window>
    );
};

// Bar Corner Components
// Expect `gdkmonitor` (a Gdk.Monitor object) as a prop.
export const BarCornerTopleft = ({ gdkmonitor }) => (
    <window
        gdkmonitor={gdkmonitor}
        name={`barcornertl${gdkmonitor.get_monitor_number()}`}
        layer='overlay'
        anchor={[Astal.WindowAnchor.TOP, Astal.WindowAnchor.LEFT]}
        exclusivity={Astal.Exclusivity.IGNORE}
        application={app}
        visible={userOptions.appearance.barRoundCorners ?? false}
        $={self => enableClickthrough(self)} // Use $ for setup
    >
        <RoundedCorner place='topleft' class='corner' />
    </window>
);

export const BarCornerTopright = ({ gdkmonitor }) => (
    <window
        gdkmonitor={gdkmonitor}
        name={`barcornertr${gdkmonitor.get_monitor_number()}`}
        layer='overlay'
        anchor={[Astal.WindowAnchor.TOP, Astal.WindowAnchor.RIGHT]}
        exclusivity={Astal.Exclusivity.IGNORE}
        application={app}
        visible={userOptions.appearance.barRoundCorners ?? false}
        $={self => enableClickthrough(self)}
    >
        <RoundedCorner place='topright' class='corner' />
    </window>
);
