import { createState } from 'ags';

// Placeholder for UI-related global states
// Example: used by music.js for showMusicControls

// showMusicControls: boolean state
const [showMusicControlsState, setShowMusicControlsState] = createState(false);
export const showMusicControls = showMusicControlsState;
export const toggleMusicControls = () => setShowMusicControlsState(v => !v);
export const setMusicControlsVisible = (visible) => setShowMusicControlsState(visible);

// Add other UI states here as needed, e.g., for sidebars visibility, etc.
