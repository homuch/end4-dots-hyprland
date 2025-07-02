import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import App from 'ags/app';
import { window, box, revealer, button, icon as AgsIcon, overlay, eventbox } from 'ags/widgets';
import Applications from 'ags/service/applications'; // Assuming real service path
import Hyprland from '../../services/hyprlandService.js'; // Centralized placeholder/real service
import { createEffect, createState, createBinding, Utils } from 'ags';
import { execAsync } from 'ags/process';

import { setupCursorHover } from '../../utils/cursorHover.js';
import { getAllFiles, searchIcons } from '../../utils/dockIconUtils.js';
import MaterialIcon from '../common/MaterialIcon.js';
import { substitute } from '../../utils/iconUtils.js'; // For general icon name substitution
import { options as userOptions } from '../../options.js';


// Module-level cache for icon paths, similar to original
const iconFileCacheByAppName = new Map();
const iconFilesBySearchPath = new Map(); // Cache for getAllFiles results

// Pre-fetch all icon files from specified search paths if paths are defined
if (userOptions.icons?.searchPaths && Array.isArray(userOptions.icons.searchPaths)) {
    userOptions.icons.searchPaths.forEach(path => {
        if (path && !iconFilesBySearchPath.has(path)) {
            iconFilesBySearchPath.set(path, getAllFiles(path));
        }
    });
}
const flatIconFileList = Array.from(iconFilesBySearchPath.values()).flat(1);


// To manage auto-hide timers
let autoHideTimers = [];
function clearAutoHideTimers() {
    autoHideTimers.forEach(id => GLib.source_remove(id));
    autoHideTimers = [];
}

// Helper to check if a client window should be excluded from the dock
function shouldExcludeWindow(client) {
    if (!client) return true;
    // Original conditions:
    if (client.pid === -1) return true; // Invalid process
    // if (client.title?.includes("win") && client.class?.toLowerCase().includes("jetbrains")) return true; // Jetbrains specific popups
    if (client.title === '' && client.class === '') return true; // Empty vscode windows

    // Add more general rules if needed, e.g., for docks, desktop widgets, etc.
    // if (client.role === 'desktop' || client.window_type?.includes('dock')) return true;
    return false;
}

function focusClient(client) {
    if (client && client.address) {
        // Hyprland.messageAsync(`dispatch focuswindow address:${client.address}`).catch(print);
        execAsync(`hyprctl dispatch focuswindow address:${client.address}`).catch(print); // Using exec for placeholder
    }
}

const DockSeparator = (props = {}) => box({
    ...props,
    className: 'dock-separator', // Ensure SCSS has this
});

// AppButton: Common button for PinnedApps and Taskbar
const AppButton = ({ iconPath, client, appData, isPinnedApp = false, term = "" }) => {
    const [currentTooltip, setCurrentTooltip] = createState(appData?.name || client?.title || "App");
    const [isActive, setIsActive] = createState(false);
    const [isFocused, setIsFocused] = createState(false);

    // Effect to update active/focused state and tooltip
    createEffect(() => {
        if (isPinnedApp) {
            const runningClient = Hyprland.clients.value.find(c =>
                (c.class && c.class.toLowerCase().includes(term.toLowerCase())) ||
                (c.initialClass && c.initialClass.toLowerCase().includes(term.toLowerCase()))
            );
            setIsActive(!!runningClient);
            setIsFocused(!!runningClient && Hyprland.active.client.value?.address === runningClient.address);
            setCurrentTooltip(runningClient ? runningClient.title : (appData?.name || "App"));
        } else if (client) { // For taskbar apps (direct client)
            setIsActive(true); // Always active if it's a taskbar client
            setIsFocused(Hyprland.active.client.value?.address === client.address);
            setCurrentTooltip(client.title || client.class || "App");
        }
    }, [Hyprland.clients, Hyprland.active.client]);


    return revealer({ // Each app button can animate in/out
        revealChild: true, // Controlled by parent for add/remove, or always true for pinned
        transition: Gtk.RevealerTransitionType.SLIDE_RIGHT, // Example transition
        transitionDuration: userOptions.animations?.durationLarge || 150,
        child: button({
            className: createBinding([isActive, isFocused], (active, focused) =>
                `dock-app-btn dock-app-btn-animate ${active ? 'active' : 'notrunning'} ${focused ? 'focused' : ''}`
            ),
            tooltipText: currentTooltip,
            onClicked: () => {
                if (isPinnedApp) {
                    const runningClient = Hyprland.clients.value.find(c =>
                        (c.class && c.class.toLowerCase().includes(term.toLowerCase())) ||
                        (c.initialClass && c.initialClass.toLowerCase().includes(term.toLowerCase()))
                    );
                    if (runningClient) focusClient(runningClient);
                    else appData?.launch();
                } else if (client) {
                    focusClient(client);
                }
            },
            onMiddleClick: () => { // Always launch for pinned, no specific middle click for taskbar in original
                if (isPinnedApp) appData?.launch();
            },
            child: box({ // Using simple box for icon, original had overlay for indicator dot
                className: 'dock-app-icon',
                homogeneous: true, // If icon should fill
                child: AgsIcon({ icon: iconPath, size: 32 }), // Standard icon size for dock
                // TODO: Add indicator dot overlay if needed, bind to isActive/isFocused
            }),
            setup: setupCursorHover,
        })
    });
};

const PinnedApps = () => {
    const apps = userOptions.dock?.pinnedApps
        ?.map(term => ({ appDef: Applications.query(term)?.[0], term }))
        .filter(({ appDef }) => !!appDef) || [];

    return box({
        className: 'dock-apps', // Matches Taskbar for consistent styling
        homogeneous: userOptions.dock?.homogeneous ?? true, // Or some default
        children: apps.map(({ appDef, term }) => {
            let iconPath = appDef.icon_name; // Default to app's own icon name
            if (userOptions.dock?.searchPinnedAppIcons && appDef.name) {
                const foundPath = searchIcons(appDef.name, flatIconFileList);
                if (foundPath) iconPath = foundPath;
            }
            return AppButton({
                iconPath: iconPath || 'application-x-executable', // Fallback icon
                appData: appDef,
                isPinnedApp: true,
                term: term,
            });
        }),
    });
};

const Taskbar = ({ monitor }) => {
    // Maps client address to its AppButton component instance/key for dynamic updates
    const [clientButtons, setClientButtons] = createState(new Map());

    createEffect(() => {
        const newMap = new Map(clientButtons.value);
        const currentAddresses = new Set();

        Hyprland.clients.value.forEach(client => {
            if (client.pid === -1 || shouldExcludeWindow(client)) return;
            // TODO: Filter by monitor if dock is per-monitor and client has monitor info
            // if (client.monitor !== monitor && userOptions.dock.perMonitor) return;

            currentAddresses.add(client.address);
            if (!newMap.has(client.address)) {
                let appClass = substitute(client.class || client.initialClass || '');
                let iconPath = iconFileCacheByAppName.get(appClass.toLowerCase());
                if (!iconPath) {
                    iconPath = searchIcons(appClass, flatIconFileList) || appClass; // Fallback to class name
                    if (iconPath !== appClass) iconFileCacheByAppName.set(appClass.toLowerCase(), iconPath);
                }

                newMap.set(client.address, AppButton({ // This creates JSX, not a widget instance for map
                    iconPath: iconPath || 'application-x-executable',
                    client: client,
                    isPinnedApp: false,
                }));
            } else {
                // Update existing button if necessary (e.g. title change, but AppButton handles this internally)
                // No, AppButton should be recreated if client data fundamentally changes for it.
                // For now, assume client object in AppButton's closure updates.
            }
        });

        // Remove buttons for closed clients
        for (const addr of newMap.keys()) {
            if (!currentAddresses.has(addr)) {
                newMap.delete(addr); // This is deleting JSX, not managing widget lifecycle well.
                                   // This approach with replacing children array is better for AGS v2.
            }
        }
        setClientButtons(newMap);

    }, [Hyprland.clients]);


    return box({
        className: 'dock-apps',
        // Children derived from clientButtons map.
        // This needs to render the JSX values from the map.
        children: clientButtons.transform(map => Array.from(map.values())),
    });
};


// Main Dock Component (formerly the default export of dock.js)
const DockContent = ({ monitor, isPinned_accessor, setPinned_func }) => {
    const [revealed, setRevealed] = createState(userOptions.dock?.initialVisibility ?? true);

    // Auto-hide logic
    createEffect(() => {
        const isCurrentlyPinned = isPinned_accessor.value;
        if (isCurrentlyPinned) {
            setRevealed(true); // Pinned dock stays open
            clearAutoHideTimers();
            return;
        }
        // This effect also needs to depend on relevant Hyprland events if they change `triggerToShow`.
        // For simplicity, assume relevant events are connected to showDockTemporarily.
    }, [isPinned_accessor]);


    const showDockTemporarily = (trigger) => {
        if (isPinned_accessor.value) return;
        if (!userOptions.dock?.trigger?.includes(trigger)) return;

        // Monitor exclusivity check
        if (userOptions.dock?.monitorExclusivity && Hyprland.active.monitor.value?.id !== monitor) {
            setRevealed(false);
            return;
        }

        setRevealed(true);
        clearAutoHideTimers();
        const autoHideRule = userOptions.dock?.autoHide?.find(e => e.trigger === trigger);
        if (autoHideRule && autoHideRule.interval > 0) {
            const id = Utils.timeout(autoHideRule.interval, () => {
                if (!isPinned_accessor.value) setRevealed(false);
            });
            autoHideTimers.push(id);
        }
    };

    // Hooks for auto-hide triggers
    createEffect(() => Hyprland.active.workspace.value && showDockTemporarily('workspace-active'), [Hyprland.active.workspace]);
    createEffect(() => Hyprland.active.client.value && showDockTemporarily('client-active'), [Hyprland.active.client]);
    // For client-added/removed, Hyprland service needs to emit these as signals or update a list we can watch.
    // Assuming Hyprland.clients.value changes trigger the effect for Taskbar, which is fine.
    // If specific events are needed for dock visibility:
    // Hyprland.connect('client-added', () => showDockTemporarily('client-added'));
    // Hyprland.connect('client-removed', () => showDockTemporarily('client-removed'));


    const PinButtonWidget = button({
        className: isPinned_accessor.transform(p => `dock-app-btn dock-app-btn-animate ${p ? "pinned-dock-app-btn" : ""}`),
        tooltipText: userOptions.language?.pinDock || 'Pin Dock',
        child: box({
            homogeneous: true, className: 'dock-app-icon txt',
            child: MaterialIcon({icon: 'push_pin', size: 'hugeass'})
        }),
        onClicked: () => setPinned_func(v => !v),
        setup: setupCursorHover,
    });

    const LauncherButtonWidget = button({
        className: 'dock-app-btn dock-app-btn-animate',
        tooltipText: userOptions.language?.openLauncher || 'Open launcher',
        child: box({
            homogeneous: true, className: 'dock-app-icon txt',
            child: MaterialIcon({icon: 'apps', size: 'hugerass'}) // Original was 'hugerass'
        }),
        onClicked: () => App.toggleWindow('overview'), // Assuming 'overview' is a registered window
        setup: setupCursorHover,
    });

    return eventbox({
        onHover: () => {
            if (!isPinned_accessor.value) setRevealed(true);
            clearAutoHideTimers();
        },
        onHoverLost: () => {
            if (!isPinned_accessor.value) {
                 // Add a short delay before hiding on hover lost, unless another show trigger happens
                const id = Utils.timeout(300, () => {
                    if (!isPinned_accessor.value) setRevealed(false);
                });
                autoHideTimers.push(id);
            }
        },
        child: box({ // This box is for the min-height when hidden
            css: revealed.transform(r => r ? '' : `min-height: ${userOptions.dock?.hiddenThickness || 5}px;`),
            homogeneous: true, // To center the revealer if it's smaller
            children: [
                revealer({
                    revealChild: revealed,
                    transition: Gtk.RevealerTransitionType.SLIDE_UP,
                    transitionDuration: userOptions.animations?.durationLarge || 150,
                    child: box({
                        className: 'dock-bg spacing-h-5', // Main visible dock bar
                        children: [
                            PinButtonWidget,
                            PinnedApps(),
                            DockSeparator(),
                            Taskbar({ monitor }),
                            LauncherButtonWidget,
                        ]
                    })
                })
            ],
        }),
    });
};


// Main Window component for the Dock (formerly default export of main.js)
export default function DockWindow({ monitor = 0 } = {}) {
    const [isPinned, setIsPinned] = createState(false); // Dock's own pinned state

    return window({
        monitor,
        name: `dock${monitor}`,
        layer: userOptions.dock?.layer || 'bottom', // Gtk.LayerShellLayer
        anchor: [userOptions.dock?.anchorCorner || 'bottom'], // Gtk.LayerShellEdge
        exclusivity: userOptions.dock?.exclusivity || 'normal',
        visible: true, // Dock window is always there, content visibility is handled by DockContent
        child: DockContent({
            monitor,
            isPinned_accessor: isPinned,
            setPinned_func: setIsPinned
        }),
    });
}
