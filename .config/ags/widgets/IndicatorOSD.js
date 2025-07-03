import Gtk from 'gi://Gtk?version=4.0';
import app from 'ags/gtk4/app';

import Indicator from '../../services/indicatorService.js'; // Fake service, for popup method
import IndicatorValuesDisplay from './IndicatorValuesDisplay.js';
import MusicControlsDisplay from './MusicControlsDisplay.js'; // Placeholder for now
import NotificationPopupsDisplay from './NotificationPopupsDisplay.js';
import ColorSchemeDisplay from './ColorSchemeDisplay.js';

// Placeholder for MusicControlsDisplay if its file is not yet created or fully migrated
const FallbackMusicControlsDisplay = () => box({
    // child: label({ label: "Music Controls Placeholder" })
});


export default function IndicatorOSDWindow({ monitor = 0 } = {}) {
    return AgsWindow({
        name: `indicator${monitor}`,
        monitor: monitor,
        className: 'indicator-osd-window', // Base class for the window
        layer: Gtk.LayerShellLayer.OVERLAY,
        anchor: ['top'], // Anchored at the top center (default hpack for child box)
        exclusivity: 'ignore', // Allows clicks to pass through if not on its content
        visible: true, // The window itself is always there; content revealer controls what's shown
                       // However, an OSD might want to be visible:false and shown by IndicatorService
                       // For now, let's make it visible and content inside is revealed.
                       // The original was visible:true and child EventBox hid content on hover.
                       // This seems more like a container whose children are revealed by services.

        child: eventbox({
            // Original: onHover makes Indicator.popup(-1) which hides IndicatorValuesDisplay.
            // This implies the OSD window itself doesn't hide, but its content might.
            // If the whole OSD should hide on hover, then this eventbox should control a revealer around all content.
            // For now, let's assume individual components manage their visibility based on service states.
            // The onHover here seems to be a quick dismiss for IndicatorValues if mouse touches the OSD area.
            onHover: () => {
                Indicator.popup(-1); // Dismiss brightness/volume OSD specifically
            },
            child: box({
                vertical: true,
                className: 'osd-main-content-box', // Ensure SCSS for padding etc.
                // css: 'min-height: 2px;', // Original style
                children: [
                    IndicatorValuesDisplay({ monitor: monitor }),
                    // MusicControlsDisplay(), // Use Fallback until fully migrated
                    FallbackMusicControlsDisplay(), // Using fallback
                    NotificationPopupsDisplay(),
                    ColorSchemeDisplay(),
                ]
            })
        }),
    });
}
