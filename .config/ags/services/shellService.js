import { createState } from 'ags';

// This is a placeholder. In a real scenario, this would interact
// with Hyprland/Sway or some other mechanism to determine the shell mode.
// For now, it just provides a reactive state that can be cycled for testing.
// Modes could be "normal", "focus", "nothing" per monitor.
// Example: modesByMonitor = { 0: "normal", 1: "focus" }

// For simplicity, let's assume a single mode for all monitors or that Bar passes monitorId
// The original currentShellMode.value was an array, e.g. currentShellMode.value[monitor]
// So, let's make currentModes an array.
const [currentModes, setCurrentModes] = createState(["normal", "normal", "normal", "normal"]); // Max 4 monitors for placeholder

export const shellModes = currentModes; // Accessor for the array of modes

// Function to cycle mode for a specific monitor (for testing)
let availableModes = ["normal", "focus", "nothing"];
export function cycleMonitorMode(monitorId) {
    setCurrentModes(prevModes => {
        const newModes = [...prevModes];
        const currentMonitorMode = newModes[monitorId] || "normal";
        const currentIndex = availableModes.indexOf(currentMonitorMode);
        const nextIndex = (currentIndex + 1) % availableModes.length;
        newModes[monitorId] = availableModes[nextIndex];
        console.log(`Monitor ${monitorId} mode changed to ${newModes[monitorId]}`);
        return newModes;
    });
}

// Function to set mode for a specific monitor
export function setMonitorMode(monitorId, mode) {
     if (!availableModes.includes(mode)) {
        console.warn(`Invalid shell mode: ${mode}`);
        return;
    }
    setCurrentModes(prevModes => {
        const newModes = [...prevModes];
        newModes[monitorId] = mode;
        return newModes;
    });
}

// TODO: Implement actual logic to listen to shell events or commands
// to update these modes.
