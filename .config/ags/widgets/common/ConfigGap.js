import Gtk from 'gi://Gtk?version=4.0';
import { box } from 'ags/widgets';

export default function ConfigGap({
    vertical = true,
    size = 5, // This would map to a class like gap-v-5 or gap-h-5
    className = '',
    ...rest // Other Gtk.Box properties
}) {
    // The class name itself should define the margin/padding for the gap.
    // e.g., in SCSS:
    // .gap-v-5 { margin-top: 5px; margin-bottom: 5px; } or min-height: 10px;
    // .gap-h-5 { margin-left: 5px; margin-right: 5px; } or min-width: 10px;
    // For simplicity, let's assume CSS handles the actual sizing based on the class.
    // This component just provides a styled box.

    const gapClassName = `config-gap ${vertical ? 'gap-v' : 'gap-h'}-${size} ${className}`;

    return box({
        ...rest,
        className: gapClassName,
        // If not relying purely on CSS margins for the gap,
        // you could set width/height request here, but CSS is more flexible.
        // css: vertical ? `min-height: ${size * 2}px;` : `min-width: ${size * 2}px;`, // Example direct style
    });
}
