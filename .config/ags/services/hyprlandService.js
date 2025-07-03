// Placeholder for Hyprland Service (ags/service/hyprland.js or gi://Hyprland)
import { createState, createBinding } from 'ags';

// --- Active State ---
const [_activeClientAddress, _setActiveClientAddress] = createState(null); // Store address, resolve to client object
const [_activeWorkspaceId, _setActiveWorkspaceId] = createState(1);
const [_activeMonitorId, _setActiveMonitorId] = createState(0);

// --- Overall Lists ---
// Client: { address: string, pid: number, class: string, initialClass: string, title: string, workspace: {id: number}, monitor: number, ... }
const [_clients, _setClients] = createState([]);
// Workspace: { id: number, windows: number, name: string, monitor: string, ... }
const [_workspaces, _setWorkspaces] = createState([{id: 1, windows: 0, name: "1", monitor: "DP-1"}]);
// Monitor: { id: number, name: string, width: number, height: number, x:number, y:number, activeWorkspace: {id:number}, ...}
const [_monitors, _setMonitors] = createState([{id: 0, name: "DP-1", width: 1920, height: 1080, x:0, y:0, activeWorkspace: {id:1}}]);


// --- Derived Active Objects (Accessors) ---
const activeClient_accessor = createBinding(
    [_activeClientAddress, _clients],
    (addr, clientsList) => clientsList.find(c => c.address === addr) ||
                           { address: '', pid: -1, class: '', initialClass: '', title: 'Desktop', workspace: {id: _activeWorkspaceId.value }, monitor: _activeMonitorId.value } // Fallback
);

const activeWorkspace_accessor = createBinding(
    [_activeWorkspaceId, _workspaces],
    (id, wsList) => wsList.find(w => w.id === id) || { id: id, windows: 0, name: `${id}`, monitor: _monitors.value.find(m=>m.id===_activeMonitorId.value)?.name || "" } // Fallback
);

const activeMonitor_accessor = createBinding(
    [_activeMonitorId, _monitors],
    (id, monList) => monList.find(m => m.id === id) || { id: id, name: `MONITOR${id}`, activeWorkspace: {id: _activeWorkspaceId.value} } // Fallback
);

// --- Signal Handling (Simplified for Fake) ---
const _listeners = new Map();
let _signalIdCounter = 0;

const HyprlandService = {
    // Active state accessors (these are read-only from component perspective)
    active: {
        get client() { return activeClient_accessor; },
        get workspace() { return activeWorkspace_accessor; },
        get monitor() { return activeMonitor_accessor; },
    },

    // List accessors
    get clients() { return _clients[0]; }, // Direct accessor for the list
    get workspaces() { return _workspaces[0]; },
    get monitors() { return _monitors[0]; },

    // Methods
    messageAsync: async (command) => {
        console.log(`FakeHyprland: Simulating hyprctl command: ${command}`);
        // Simulate some common commands for testing UI reactions
        if (command.startsWith('dispatch focuswindow address:')) {
            const addr = command.split(':')[2];
            const client = _clients[0].value.find(c => c.address === addr);
            if (client) {
                _setActiveClientAddress(addr);
                _setActiveWorkspaceId(client.workspace.id);
                _setActiveMonitorId(client.monitor);
                HyprlandService._emitSignal('event', 'activewindow', `${client.class},${client.title}`); // Example event
            }
        } else if (command.startsWith('dispatch workspace')) {
            const wsName = command.split(' ')[2];
            let targetId = parseInt(wsName);
            if (wsName.startsWith('r')) { // Relative
                const diff = parseInt(wsName.substring(1));
                targetId = _activeWorkspaceId.value + diff;
            } else if (wsName === 'previous') {
                targetId = _activeWorkspaceId.value - 1; // Simplified
            }
            // Clamp targetId to existing workspaces or handle creation
            const existingWs = _workspaces[0].value.find(w => w.id === targetId);
            if (existingWs) {
                _setActiveWorkspaceId(targetId);
                HyprlandService._emitSignal('workspace', `${targetId}`);
            } else if (targetId > 0) { // Simulate creating a new workspace
                 _workspaces[1](ws => [...ws, {id: targetId, windows:0, name: `${targetId}`, monitor: _activeMonitorId.value}].sort((a,b)=>a.id-b.id));
                _setActiveWorkspaceId(targetId);
                HyprlandService._emitSignal('workspace', `${targetId}`);
            }
        }
        return Promise.resolve(""); // Simulate async hyprctl call
    },

    // Signal connection (simplified)
    connect: (signal, callback) => {
        const id = ++_signalIdCounter;
        if (!_listeners.has(signal)) _listeners.set(signal, new Map());
        _listeners.get(signal).set(id, callback);
        console.log(`FakeHyprland: connect to '${signal}', id: ${id}`);
        return id;
    },
    disconnect: (id) => {
        for (const signal of _listeners.keys()) {
            if (_listeners.get(signal).has(id)) {
                _listeners.get(signal).delete(id); return;
            }
        }
    },
    _emitSignal: (signal, ...args) => {
        if (_listeners.has(signal)) {
            for (const callback of _listeners.get(signal).values()) {
                callback(HyprlandService, ...args);
            }
        }
    },

    // --- Test methods to simulate Hyprland changes ---
    _test_addClient: (clientData) => {
        _setClients(cs => [...cs, clientData]);
        HyprlandService._emitSignal('client-added', clientData.address);
        // Update workspace window count
        _setWorkspaces(wsList => wsList.map(w =>
            w.id === clientData.workspace.id ? { ...w, windows: w.windows + 1 } : w
        ));
    },
    _test_removeClient: (address) => {
        const client = _clients[0].value.find(c=>c.address === address);
        if(client){
            _setClients(cs => cs.filter(c => c.address !== address));
            HyprlandService._emitSignal('client-removed', address);
            _setWorkspaces(wsList => wsList.map(w =>
                w.id === client.workspace.id ? { ...w, windows: Math.max(0, w.windows - 1) } : w
            ));
            if(_activeClientAddress.value === address) _setActiveClientAddress(null);
        }
    },
    _test_setActiveWorkspace: (id) => _setActiveWorkspaceId(id),
    _test_setFullscreen: (monitorId, isFullscreen) => {
        // Simulate the 'fullscreen' event from original screencorners
        // The event data was '1' for fullscreen, '0' for not.
        // The original connected to Hyprland.connect('event', (service, name, data) => if (name == 'fullscreen') ...)
        // So we emit a generic 'event' with name 'fullscreen'.
        // The original event did not directly provide monitorId in data, it used Hyprland.active.monitor.id
        // So, we should set active monitor first if this event is per-monitor.
        _setActiveMonitorId(monitorId); // Assume this monitor became active for this event
        HyprlandService._emitSignal('event', 'fullscreen', isFullscreen ? '1' : '0');
    },
     _test_addWorkspace: (id) => {
        const exists = _workspaces[0].value.some(w => w.id === id);
        if (!exists) {
            _workspaces[1](ws => [...ws, { id, windows: 0, name: `${id}`, monitor: "DP-1" }].sort((a,b)=>a.id-b.id));
            HyprlandService._emitSignal('notify::workspaces'); // Generic signal for list change
        }
    },
};

// Initialize with some data
HyprlandService._test_addClient({ address: '0x1', pid: 1001, class: 'Firefox', initialClass: 'firefox', title: 'AGS GitHub', workspace: {id: 1}, monitor: 0 });
HyprlandService._test_addClient({ address: '0x2', pid: 1002, class: 'kitty', initialClass: 'kitty', title: 'AGS Migration', workspace: {id: 1}, monitor: 0 });
HyprlandService._test_addWorkspace(2);
HyprlandService._test_addWorkspace(3);
_setActiveClientAddress('0x2'); // Make kitty active

// globalThis.HyprlandService = HyprlandService; // For console testing
export default HyprlandService;
