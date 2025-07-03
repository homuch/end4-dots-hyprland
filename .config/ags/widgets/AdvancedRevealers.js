import { Gtk } from 'ags/gtk4'; // Corrected Gtk import
// Intrinsics <revealer>, <scrollable>, <box> are used
import { createState, createEffect } from 'ags';
import { options as userOptions } from '../../options.js'; // For animation durations

// DoubleRevealer for AGS v2
// Now accepts a reactive 'revealChild_accessor' prop for external control.
export function DoubleRevealer({
    transition1 = 'slide_right',
    transition2 = 'slide_left',
    duration1 = 150,
    duration2 = 150,
    // initialReveal = false, // Controlled by revealChild_accessor now
    revealChild_accessor, // AGS Accessor for controlling visibility
    children, // Note: Gtk.Revealer takes a single child. If multiple children passed, only first is used.
    ...rest
}) {
    // If no accessor provided, manage state internally (though less useful for parent control)
    const [_internalReveal, _setInternalReveal] = createState(false);
    const actualReveal = revealChild_accessor || _internalReveal;

    const mapTransition = (transitionNameStr) => {
        const upperName = transitionNameStr.toUpperCase();
        // Gtk.RevealerTransitionType enums are like SLIDE_LEFT, CROSSFADE etc.
        return Gtk.RevealerTransitionType[upperName] || Gtk.RevealerTransitionType.NONE;
    };

    return (
        <revealer
            {...rest}
            transitionType={mapTransition(transition1)}
            transitionDuration={duration1}
            revealChild={actualReveal}
        >
            <revealer
                transitionType={mapTransition(transition2)}
                transitionDuration={duration2}
                revealChild={actualReveal}
            >
                {children}
            </revealer>
        </revealer>
    );
}


// MarginRevealer for AGS v2 - Marked as problematic and simplified
// The original dynamic margin animation is very hard to replicate reliably in GTK4 without hacks
// or complex GtkConstraintLayout/GtkAnimation.
// This version simplifies to a standard revealer or a very basic class toggle.
export function MarginRevealer({
    transition = 'slide_down', // slide_down, slide_up, slide_left, slide_right
    // initialReveal = false, // Use revealChild_accessor
    revealChild_accessor, // AGS Accessor
    showClass = 'element-show',
    hideClass = 'element-hide', // Note: showClass/hideClass are not used for CSS margin animations in this version.
    children,
    ...rest
}) {
    console.warn("MarginRevealer: The original CSS margin-based animation is replaced by standard Gtk.Revealer slide/fade transitions. The 'showClass' and 'hideClass' props are not used for animation in this version. The 'transition' prop maps to Gtk.RevealerTransitionType.");

    const [_internalReveal, _setInternalReveal] = createState(false);
    const actualReveal = revealChild_accessor || _internalReveal;

    const mapTransitionType = (trans) => {
        switch(trans) {
            case 'slide_down': return Gtk.RevealerTransitionType.SLIDE_DOWN;
            case 'slide_up': return Gtk.RevealerTransitionType.SLIDE_UP;
            case 'slide_left': return Gtk.RevealerTransitionType.SLIDE_LEFT;
            case 'slide_right': return Gtk.RevealerTransitionType.SLIDE_RIGHT;
            default: return Gtk.RevealerTransitionType.NONE;
        }
    };

    // Option 1: Use a standard Gtk.Revealer
    return (
        <revealer
            {...rest}
            revealChild={actualReveal}
            transitionType={mapTransitionType(transition)}
            transitionDuration={userOptions.animations?.durationLarge || 180}
            // The showClass/hideClass for animation curves on content are harder to apply
            // directly with Gtk.Revealer, as it handles its own transition.
            // The child would need to react to actualReveal itself if it needs those classes.
            // For simplicity, child does not get show/hideClass applied by this MarginRevealer directly.
            // If child needs specific styling during reveal, it should react to `actualReveal` itself.
        >
            {children}
        </revealer>
    );
}

// Original console.warn for MarginRevealer (for reference during migration):
// console.warn("MarginRevealer is difficult to migrate perfectly to AGS V2/GTK4's styling paradigms while preserving its exact dynamic margin animation. Consider using standard Gtk.Revealer or other GTK4 animation/transition features. The migrated MarginRevealer is a non-functional sketch for the animation part.");
