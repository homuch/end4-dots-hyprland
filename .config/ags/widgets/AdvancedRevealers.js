import Gtk from 'gi://Gtk?version=4.0';
import { revealer, scrollable } from 'ags/widgets'; // Assuming these are the AGS v2 intrinsic names
import { createState, createEffect } from 'ags'; // For state and side effects

// DoubleRevealer for AGS v2
export function DoubleRevealer({
    transition1 = 'slide_right', // Gtk.RevealerTransitionType
    transition2 = 'slide_left',  // Gtk.RevealerTransitionType
    duration1 = 150,
    duration2 = 150,
    initialReveal = false, // New prop to control initial state
    children,
    ...rest
}) {
    const [revealed, setRevealed] = createState(initialReveal);

    // Expose a function to toggle, could also be done by exporting setRevealed directly
    // or by passing a new prop like 'reveal' which is an accessor.
    // For now, this component controls its own state based on initialReveal.
    // To make it externally controllable, it should take 'revealed' as a prop (an Accessor).

    return revealer({
        ...rest,
        transitionType: Gtk.RevealerTransitionType[transition1.toUpperCase()] || Gtk.RevealerTransitionType.SLIDE_RIGHT,
        transitionDuration: duration1,
        revealChild: revealed,
        child: revealer({
            transitionType: Gtk.RevealerTransitionType[transition2.toUpperCase()] || Gtk.RevealerTransitionType.SLIDE_LEFT,
            transitionDuration: duration2,
            revealChild: revealed,
            child: children,
        }),
        // Add a way to control this from outside if needed, e.g. by passing a prop
        // This is an example of an internal toggle method if not controlled by external prop
        // toggle: () => setRevealed(v => !v),
    });
}


// MarginRevealer for AGS v2 - This is more complex due to direct style manipulation
// The direct CSS margin manipulation is a hack and might not be ideal in GTK4/AGS v2.
// Consider using Gtk.Stack with Gtk.StackTransitionType or proper animations if possible.
export function MarginRevealer({
    transition = 'slide_down', // 'slide_down', 'slide_up', 'slide_left', 'slide_right'
    initialReveal = false,
    showClass = 'element-show', // For animation curve
    hideClass = 'element-hide', // For animation curve
    // extraSetup, // Use $ prop in JSX for this
    children,
    ...rest
}) {
    const [revealed, setRevealed] = createState(initialReveal);
    let childWidget = null; // To store the actual child Gtk.Widget

    // This is tricky. In AGS v1, `child.css` was a thing.
    // In AGS v2/GTK4, direct widget.css is not standard.
    // We'd typically use style contexts and CSS classes or providers.
    // For dynamic margins based on allocated size, this is harder.
    // One way is to add/remove a specific class that has the margin,
    // but the margin value is dynamic.
    // Another is to use Gtk.Fixed or Gtk.Overlay and manually position.

    // Attempting a similar approach with style context and CSS variables if possible,
    // or falling back to trying to set inline styles if absolutely necessary and available.
    // For now, this will be a placeholder for the animation logic.

    const applyStyles = (widget, isRevealed) => {
        if (!widget) return;

        widget.toggleClassName(hideClass, !isRevealed);
        widget.toggleClassName(showClass, isRevealed);

        const styleContext = widget.get_style_context();

        if (isRevealed) {
            // Attempt to reset margin-like properties using CSS variables or removing classes
            // This is highly dependent on how styles are structured.
            // For simplicity, let's assume a class 'no-margin' exists or is added.
            widget.toggleClassName('margin-revealer-no-margin', true);
            widget.remove_css_class('margin-revealer-slide-left');
            widget.remove_css_class('margin-revealer-slide-right');
            widget.remove_css_class('margin-revealer-slide-up');
            widget.remove_css_class('margin-revealer-slide-down');
            // Or, if we can set CSS variables:
            // styleContext.set_property('--dynamic-margin', '0px', Gtk.STYLE_PROVIDER_PRIORITY_USER);

        } else {
            widget.toggleClassName('margin-revealer-no-margin', false);
            const width = widget.get_allocated_width();
            const height = widget.get_allocated_height();
            let marginClass = '';
            // This is where it gets hacky without direct .css access.
            // We might need to define classes like:
            // .margin-revealer-slide-left { margin-left: var(--slide-margin-value); }
            // And then set --slide-margin-value.
            // Or, have pre-defined (though less flexible) slide-out classes.

            // Simulating the old behavior conceptually:
            if (transition == 'slide_left') widget.add_css_class('margin-revealer-slide-left'); // CSS needs to define this with large negative margin
            else if (transition == 'slide_right') widget.add_css_class('margin-revealer-slide-right');
            else if (transition == 'slide_up') widget.add_css_class('margin-revealer-slide-up');
            else if (transition == 'slide_down') widget.add_css_class('margin-revealer-slide-down');
        }
    };

    createEffect(() => {
        if (childWidget) {
            applyStyles(childWidget, revealed.value);
        }
    }, [revealed]);


    // The original used Scrollable. This might be to control overflow if margins make content larger.
    // Or it was just a convenient container.
    // If the child itself is the thing getting margins, it should be wrapped.
    // The child passed to MarginRevealer in v1 was the direct child that got margins.

    // In JSX, the child is passed like <MarginRevealer><TheChild/></MarginRevealer>
    // We need to get a reference to <TheChild/> to apply styles.
    // The `children` prop in AGS v2 for a custom widget function will be the JSX element.
    // We need to ensure it's a Gtk.Widget.

    // Let's assume `children` is a single Gtk.Widget for now.
    // We'll need to assign it to childWidget in the setup ($) phase.
    const scrollableWidget = scrollable({
        ...rest,
        // Attributes for methods - not directly idiomatic in v2.
        // Functionality is now driven by `revealed` state.
        // toggle: () => setRevealed(v => !v),
        // show: () => setRevealed(true),
        // hide: () => setRevealed(false),

        // Hscroll/Vscroll: In v2, these are Gtk.ScrollablePolicy
        hscrollbarPolicy: revealed.transform(v => v ? Gtk.ScrollablePolicy.NEVER : Gtk.ScrollablePolicy.NEVER), // Original had 'always' when hidden
        vscrollbarPolicy: revealed.transform(v => v ? Gtk.ScrollablePolicy.NEVER : Gtk.ScrollablePolicy.NEVER), // Original had 'always' when hidden

        child: children, // This child is the direct child of scrollable
        // We need to get the actual child of `MarginRevealer` which is `children` here.
        // The `children` of MarginRevealer IS the one we apply styles to.
        // So, the structure should be:
        // Scrollable -> children (which is the actual content passed to MarginRevealer)
        // And `children` is `childWidget`.

        // This means `children` passed to MarginRevealer should be the one getting styles.
        // So, the scrollable's direct child IS `childWidget`.
        // This is slightly confusing. Let's clarify:
        // MarginRevealer({ children: <MyContent/> })
        // `children` in MarginRevealer's scope is <MyContent/>. This becomes `childWidget`.
        // The scrollable then wraps `childWidget`.

        // The issue is `children` is JSX, not the instantiated widget yet in the function body.
        // The setup function ($) of the scrollable or its child is where we get the instance.

        // Let's simplify: MarginRevealer itself will be the container, and its child is `children`.
        // We will apply styles to `children` directly if it's a single widget.
        // The scrollable part might be optional or configured.
        // The original used Scrollable as the main widget.

        // If `children` is the styled one, then the scrollable wraps it.
        // The actual Gtk.Widget instance for `children` is needed.
        // This might require using the `$` ref on the child itself.
        // This is getting complicated. Let's assume `children` is a widget that we can style.
        // And we'll pass it to the scrollable.
        // The reference to `children` (the Gtk.Widget) needs to be captured.

        // The easiest way is if MarginRevealer returns the scrollable, and the child
        // passed to MarginRevealer is given to the scrollable.
        // Then, in the scrollable's $ (setup), we get its child.
        $: (self) => { // self is the scrollable
            const actualChild = self.get_child();
            if (actualChild) {
                childWidget = actualChild;
                applyStyles(childWidget, revealed.value); // Initial style
                actualChild.toggleClassName(revealed.value ? showClass : hideClass, true);
            }
            // if(extraSetup && typeof extraSetup === 'function') extraSetup(self);
        }
    });

    // To control it, the parent component would need access to `setRevealed`.
    // One way is to pass `revealed` and `setRevealed` as props if controlled from outside.
    // Or, the component can return an object: { widget: scrollableWidget, setRevealed }

    // For now, making it self-contained and toggled by a passed prop or internal logic.
    // The original had `attribute.toggle`, `show`, `hide`.
    // We can add these as methods to the returned widget if that pattern is desired.
    // This is not very "AGS v2 functional" but might be needed for v1 compatibility.
    // scrollableWidget.attribute = {
    //  toggle: () => setRevealed(v => !v),
    //  show: () => setRevealed(true),
    //  hide: () => setRevealed(false),
    //  get reveló() { return revealed.value; }
    // };
    // Better: return an object like { widget, controls: { toggle, show, hide } }
    // Or simply make `revealed` prop an accessor from parent.

    return scrollableWidget; // For now, just return the widget.
}

// CSS would be needed for .margin-revealer-slide-left etc. For example:
// .margin-revealer-slide-left { margin-left: -1000px; transition: margin-left 0.2s ease-out; }
// .margin-revealer-no-margin { margin: 0px !important; }
// The actual margin value needs to be dynamic based on widget size for perfect slide out.
// This simple CSS class approach is not as flexible as direct margin setting with widget.get_allocated_width().
// This MarginRevealer is a significant challenge to migrate perfectly without direct CSS manipulation
// or a more complex GtkConstraintLayout/Animation approach.
// The current MarginRevealer above is a rough sketch and likely won't work as intended without
// a robust way to set dynamic margins for out-of-view animation in GTK4.
// A Gtk.Revealer with appropriate transition types is the recommended GTK4 way.
// If the exact margin-based animation is critical, it would require deeper GTK4 style system work.
// For now, users should prefer Gtk.Revealer.
// This MarginRevealer is marked as problematic.
console.warn("MarginRevealer is difficult to migrate perfectly to AGS V2/GTK4's styling paradigms while preserving its exact dynamic margin animation. Consider using standard Gtk.Revealer or other GTK4 animation/transition features. The migrated MarginRevealer is a non-functional sketch for the animation part.");
