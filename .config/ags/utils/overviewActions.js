import { execAsync } from 'ags/process';
import Hyprland from '../services/hyprlandService.js'; // Using placeholder/migrated service

function moveClientToWorkspace(address, workspaceId) {
    // Original used: `hyprctl dispatch movetoworkspacesilent ${workspace},address:${address} &`
    // The `&` is for backgrounding, execAsync handles this.
    // Ensure workspaceId is a valid ID or name.
    Hyprland.messageAsync(`dispatch movetoworkspacesilent ${workspaceId},address:${address}`).catch(print);
}

export function dumpToWorkspace(fromWorkspaceId, toWorkspaceId) {
    if (fromWorkspaceId == toWorkspaceId) return;

    // Hyprland.clients is an accessor. Need its .value
    Hyprland.clients.value.forEach(client => {
        if (client.workspace.id == fromWorkspaceId) {
            moveClientToWorkspace(client.address, toWorkspaceId);
        }
    });
}

export function swapWorkspace(workspaceAId, workspaceBId) {
    if (workspaceAId == workspaceBId) return;

    const clientsA = [];
    const clientsB = [];
    Hyprland.clients.value.forEach(client => {
        if (client.workspace.id == workspaceAId) clientsA.push(client.address);
        if (client.workspace.id == workspaceBId) clientsB.push(client.address);
    });

    clientsA.forEach((address) => moveClientToWorkspace(address, workspaceBId));
    clientsB.forEach((address) => moveClientToWorkspace(address, workspaceAId));
}
