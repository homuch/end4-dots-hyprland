import { app } from 'ags/gtk4/app'; // Corrected
import { Astal, Gtk, Gdk, GLib } from 'ags/gtk4'; // Corrected, added GLib
// Intrinsics: <window>, <box>, <revealer>, <button>, <icon>, <overlay>
import Applications from 'ags/service/applications';
import Hyprland from 'gi://AstalHyprland';
import { createEffect, createState, createBinding, Utils } from 'ags'; // Utils for GLib.timeout_add
import { execAsync } from 'ags/process';

import { setupCursorHover } from '../../utils/cursorHover.js';
import { getAllFiles, searchIcons } from '../../utils/dockIconUtils.js';
import MaterialIcon from '../common/MaterialIcon.js';
import { substitute as substituteIconName } from '../../utils/iconUtils.js';
import { options as userOptions } from '../../options.js';


const iconFileCacheByAppName = new Map();
const iconFilesBySearchPath = new Map();

if (userOptions.icons?.searchPaths && Array.isArray(userOptions.icons.searchPaths)) {
    userOptions.icons.searchPaths.forEach(path => {
        if (path && !iconFilesBySearchPath.has(path)) {
            iconFilesBySearchPath.set(path, getAllFiles(path));
        }
    });
}
const flatIconFileList = Array.from(iconFilesBySearchPath.values()).flat(1);

let autoHideTimers = [];
function clearAutoHideTimers() {
    autoHideTimers.forEach(id => GLib.source_remove(id)); // Use GLib.source_remove
    autoHideTimers = [];
}

function shouldExcludeWindow(client) {
    if (!client) return true;
    if (client.pid === -1) return true;
    if (client.title === '' && client.class === '') return true;
    return false;
}

function focusClient(client) {
    if (client && client.address) {
        Hyprland.messageAsync(`dispatch focuswindow address:${client.address}`).catch(print);
    }
}

const DockSeparator = (props = {}) => <box {...props} class='dock-separator' />;

const AppButton = ({ iconPath, client, appData, isPinnedApp = false, term = "" }) => {
    const [currentTooltip, setCurrentTooltip] = createState(appData?.name || client?.title || "App");
    const [isActive, setIsActive] = createState(false);
    const [isFocused, setIsFocused] = createState(false);

    createEffect(() => {
        const currentClients = Hyprland.clients.value || [];
        const activeClient = Hyprland.active.client.value;
        if (isPinnedApp) {
            const runningClient = currentClients.find(c =>
                (c.class && c.class.toLowerCase().includes(term.toLowerCase())) ||
                (c.initialClass && c.initialClass.toLowerCase().includes(term.toLowerCase()))
            );
            setIsActive(!!runningClient);
            setIsFocused(!!runningClient && activeClient?.address === runningClient.address);
            setCurrentTooltip(runningClient ? (runningClient.title || runningClient.class) : (appData?.name || "App"));
        } else if (client) {
            setIsActive(true);
            setIsFocused(activeClient?.address === client.address);
            setCurrentTooltip(client.title || client.class || "App");
        }
    }, [Hyprland.clients, Hyprland.active.client]); // Depend on accessors

    return (
        <revealer
            revealChild={true}
            transition={Gtk.RevealerTransitionType.SLIDE_RIGHT}
            transitionDuration={userOptions.animations?.durationLarge || 150}
        >
            <button
                class={createBinding([isActive, isFocused], (active, focused) =>
                    `dock-app-btn dock-app-btn-animate ${active ? 'active' : 'notrunning'} ${focused ? 'focused' : ''}`
                )}
                tooltipText={currentTooltip}
                onClicked={() => {
                    if (isPinnedApp) {
                        const currentClients = Hyprland.clients.value || [];
                        const runningClient = currentClients.find(c =>
                            (c.class && c.class.toLowerCase().includes(term.toLowerCase())) ||
                            (c.initialClass && c.initialClass.toLowerCase().includes(term.toLowerCase()))
                        );
                        if (runningClient) focusClient(runningClient);
                        else appData?.launch();
                    } else if (client) {
                        focusClient(client);
                    }
                }}
                onMiddleClick={() => { if (isPinnedApp) appData?.launch(); }}
                $={setupCursorHover}
            >
                <box class='dock-app-icon' homogeneous={true}>
                    {/* TODO: Indicator dot overlay */}
                    <overlay>
                        <icon $type="child" icon={iconPath || 'application-x-executable-symbolic'} size={32} />
                        <box $type="overlay" class={createBinding([isActive, isFocused], (a,f) => `indicator ${ (a || f) ? 'active' : ''}`)} // Example indicator class
                             vpack={Gtk.Align.END} hpack={Gtk.Align.CENTER} />
                    </overlay>
                </box>
            </button>
        </revealer>
    );
};

const PinnedApps = () => {
    const apps = userOptions.dock?.pinnedApps
        ?.map(term => ({ appDef: Applications.query(term)?.[0], term }))
        .filter(({ appDef }) => !!appDef) || [];

    return (
        <box class='dock-apps' homogeneous={userOptions.dock?.homogeneous ?? true}>
            {apps.map(({ appDef, term }) => {
                let iconPath = appDef.icon_name;
                if (userOptions.dock?.searchPinnedAppIcons && appDef.name) {
                    const foundPath = searchIcons(appDef.name, flatIconFileList);
                    if (foundPath) iconPath = foundPath;
                }
                return <AppButton iconPath={iconPath} appData={appDef} isPinnedApp={true} term={term} />;
            })}
        </box>
    );
};

const Taskbar = ({ gdkmonitor }) => { // Expect Gdk.Monitor
    const monitorId = gdkmonitor.get_monitor_number();
    // Use Hyprland.clients accessor, which is an array of client objects
    // Filter clients for the current monitor if perMonitor is enabled
    const taskbarClients = createBinding(
        [Hyprland.clients, Hyprland.active.monitor], // Depend on active monitor if exclusivity is on
        (clients, activeMonitor) => {
            return (clients || []).filter(client => {
                if (shouldExcludeWindow(client)) return false;
                if (userOptions.dock?.monitorExclusivity === "exclusive" || userOptions.dock?.monitorExclusivity === true) { // "exclusive" or boolean true
                    return client.monitor === monitorId;
                }
                if (userOptions.dock?.monitorExclusivity === "focused") { // New option based on original logic
                     return client.monitor === (activeMonitor?.id || 0);
                }
                return true; // Show all if not exclusive or focused
            });
        }
    );

    return (
        <box class='dock-apps'>
            {taskbarClients.transform(clients => clients.map(client => {
                let appClass = substituteIconName(client.class || client.initialClass || '');
                let iconPath = iconFileCacheByAppName.get(appClass.toLowerCase());
                if (!iconPath) {
                    iconPath = searchIcons(appClass, flatIconFileList) || appClass;
                    if (iconPath !== appClass) iconFileCacheByAppName.set(appClass.toLowerCase(), iconPath);
                }
                return <AppButton iconPath={iconPath} client={client} isPinnedApp={false} />;
            }))}
        </box>
    );
};

const DockContent = ({ gdkmonitor, isPinned_accessor, setPinned_func }) => {
    const monitorId = gdkmonitor.get_monitor_number();
    const [revealed, setRevealed] = createState(userOptions.dock?.initialVisibility ?? true);

    createEffect(() => {
        const isCurrentlyPinned = isPinned_accessor.value;
        if (isCurrentlyPinned) {
            setRevealed(true);
            clearAutoHideTimers();
            return;
        }
    }, [isPinned_accessor]);

    const showDockTemporarily = (trigger) => {
        if (isPinned_accessor.value) return;
        if (!userOptions.dock?.trigger?.includes(trigger)) return;

        const activeMonitorId = Hyprland.active.monitor.value?.id;
        if (userOptions.dock?.monitorExclusivity === "exclusive" && activeMonitorId !== monitorId) {
             setRevealed(false); return;
        }
        if (userOptions.dock?.monitorExclusivity === "focused" && activeMonitorId !== monitorId) {
            // If dock is per-monitor and this isn't the active one, but trigger is global
            // This logic might need refinement based on desired "focused" behavior
             setRevealed(false); return;
        }

        setRevealed(true);
        clearAutoHideTimers();
        const autoHideRule = userOptions.dock?.autoHide?.find(e => e.trigger === trigger);
        if (autoHideRule && autoHideRule.interval > 0) {
            const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, autoHideRule.interval, () => {
                if (!isPinned_accessor.value) setRevealed(false);
                autoHideTimers = autoHideTimers.filter(existingId => existingId !== id); // Remove from list
                return GLib.SOURCE_REMOVE; // Stop timeout
            });
            autoHideTimers.push(id);
        }
    };

    createEffect(() => Hyprland.active.workspace.value && showDockTemporarily('workspace-active'), [Hyprland.active.workspace]);
    createEffect(() => Hyprland.active.client.value && showDockTemporarily('client-active'), [Hyprland.active.client]);
    // For client-added/removed, using Hyprland.clients accessor for Taskbar updates is enough.
    // If these events specifically need to trigger dock visibility:
    Hyprland.connect('client-added', () => showDockTemporarily('client-added'));
    Hyprland.connect('client-removed', () => showDockTemporarily('client-removed'));

    const PinButtonWidget = () => (
        <button
            class={isPinned_accessor.transform(p => `dock-app-btn dock-app-btn-animate ${p ? "pinned-dock-app-btn" : ""}`)}
            tooltipText={userOptions.language?.pinDock || 'Pin Dock'}
            onClicked={() => setPinned_func(v => !v)}
            $={setupCursorHover}
        >
            <box homogeneous={true} class='dock-app-icon txt'>
                <MaterialIcon icon='push_pin' size='hugeass' />
            </box>
        </button>
    );

    const LauncherButtonWidget = () => (
        <button
            class='dock-app-btn dock-app-btn-animate'
            tooltipText={userOptions.language?.openLauncher || 'Open launcher'}
            onClicked={() => app.toggleWindow('overview')}
            $={setupCursorHover}
        >
            <box homogeneous={true} class='dock-app-icon txt'>
                <MaterialIcon icon='apps' size={userOptions.dock?.launcherButtonIconSize || 'hugerass'} />
            </box>
        </button>
    );

    return (
        // Replace eventbox with box + Gtk.EventControllerMotion for hover
        <box
            class="dock-hover-area" // Class for potential styling
            $={self => {
                const motion = Gtk.EventControllerMotion.new();
                motion.connect('enter', () => {
                    if (!isPinned_accessor.value) setRevealed(true);
                    clearAutoHideTimers();
                });
                motion.connect('leave', () => {
                    if (!isPinned_accessor.value) {
                        const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                            if (!isPinned_accessor.value) setRevealed(false);
                            autoHideTimers = autoHideTimers.filter(existingId => existingId !== id);
                            return GLib.SOURCE_REMOVE;
                        });
                        autoHideTimers.push(id);
                    }
                });
                self.add_controller(motion);
            }}
        >
            <box
                css={revealed.transform(r => r ? '' : `min-height: ${userOptions.dock?.hiddenThickness || 5}px;`)}
                homogeneous={true}
            >
                <revealer
                    revealChild={revealed}
                    transition={Gtk.RevealerTransitionType.SLIDE_UP}
                    transitionDuration={userOptions.animations?.durationLarge || 150}
                >
                    <box class='dock-bg spacing-h-5'>
                        <PinButtonWidget />
                        <PinnedApps />
                        <DockSeparator />
                        <Taskbar gdkmonitor={gdkmonitor} />
                        <LauncherButtonWidget />
                    </box>
                </revealer>
            </box>
        </box>
    );
};

export default function DockWindow({ gdkmonitor }) { // Expects Gdk.Monitor
    const [isPinned, setIsPinned] = createState(false);
    const monitorId = gdkmonitor.get_monitor_number();

    return (
        <window
            gdkmonitor={gdkmonitor}
            name={`dock${monitorId}`}
            layer={userOptions.dock?.layer === 'overlay' ? Astal.Layer.OVERLAY : Astal.Layer.BOTTOM} // Example mapping
            anchor={userOptions.dock?.anchorCorner ? userOptions.dock.anchorCorner.split(' ').map(s => Astal.WindowAnchor[s.toUpperCase()])
                                                    .reduce((a,b) => a | b, 0)
                                                  : Astal.WindowAnchor.BOTTOM }
            exclusivity={userOptions.dock?.exclusivity === 'exclusive' ? Astal.Exclusivity.EXCLUSIVE : Astal.Exclusivity.NORMAL}
            application={app}
            visible={true}
        >
            <DockContent
                gdkmonitor={gdkmonitor}
                isPinned_accessor={isPinned}
                setPinned_func={setIsPinned}
            />
        </window>
    );
}
