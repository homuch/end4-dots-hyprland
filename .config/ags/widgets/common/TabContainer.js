import Gtk from 'gi://Gtk?version=4.0';
import { box, button, eventbox, label, stack } from 'ags/widgets';
import { createState, createEffect, createBinding } from 'ags';
import { options as userOptions } from '../../options.js';
import { setupCursorHover } from '../../utils/cursorHover.js';
import MaterialIcon from './MaterialIcon.js'; // Migrated
// import { NavigationIndicator } from './NavigationIndicator.js'; // TODO: Needs migration
// import { DoubleRevealer } from '../AdvancedRevealers.js'; // Migrated (sketch)
// For ExpandingIconTabContainer, we need DoubleRevealer.
// Let's assume AdvancedRevealers.js exports it.
import { DoubleRevealer } from '../AdvancedRevealers.js';


// IconTabContainer
export function IconTabContainer({
    iconWidgets, // Array of JSX elements for tab icons
    names,       // Array of strings for tooltips
    children,    // Array of JSX elements for content
    className = '',
    // Props for controlled component:
    shownIndex_accessor, // AGS Accessor for the current index
    onTabChange_handler, // (newIndex: number) => void - effectively the setShownIndex from parent
    // Original props:
    // initialIndex = 0, (Parent will handle initial state)
    // onChange, // Covered by onTabChange_handler
    tabsHpack = 'center', // Gtk.Align
    tabSwitcherClassName = '',
    transition = Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
    transitionDuration = userOptions.animations?.durationSmall || 150,
    ...rest
}) {
    // const [shownIndex, setShownIndex] = createState(initialIndex); // State managed by parent
    const count = Math.min(iconWidgets?.length || 0, names?.length || 0, children?.length || 0);

    if (count === 0) {
        return box({ child: label({label: "No tabs to display in IconTabContainer"})});
    }

    const actualTabsHpack = (() => {
        switch(tabsHpack) {
            case 'start': return Gtk.Align.START;
            case 'end': return Gtk.Align.END;
            case 'fill': return Gtk.Align.FILL;
            case 'center':
            default: return Gtk.Align.CENTER;
        }
    })();

    const tabButtons = Array.from({ length: count }, (_, i) => button({
        className: shownIndex_accessor.transform(idx => `tab-icon ${idx === i ? 'tab-icon-active' : ''}`),
        tooltipText: names[i],
        child: iconWidgets[i],
        onClicked: () => onTabChange_handler(i), // Call parent's handler
        setup: setupCursorHover,
    }));

    const tabSection = eventbox({
        onScrollUp: () => onTabChange_handler(Math.max(shownIndex_accessor.value - 1, 0)),
        onScrollDown: () => onTabChange_handler(Math.min(shownIndex_accessor.value + 1, count - 1)),
        child: box({
            hpack: actualTabsHpack,
            className: `tab-switcher ${tabSwitcherClassName} spacing-h-5`,
            children: tabButtons,
        })
    });

    const contentStack = stack({
        transition: transition,
        transitionDuration: transitionDuration,
        children: children.reduce((acc, child, i) => {
            acc[`${i}`] = child;
            return acc;
        }, {}),
        shown: shownIndex_accessor.transform(idx => `${idx}`),
    });

    return box({ // mainBox
        ...rest,
        vertical: true,
        className: `icon-tab-container ${className} spacing-v-5`,
        children: [
            tabSection,
            contentStack,
        ],
    });
}


// ExpandingIconTabContainer - Refactored as a controlled component
export function ExpandingIconTabContainer({
    icons,
    names,
    children,
    className = '',
    // Props for controlled component:
    shownIndex_accessor,
    onTabChange_handler,
    // Original props:
    // initialIndex = 0,
    // onChange,
    tabsHpack = 'center',
    tabSwitcherClassName = '',
    transitionDuration = userOptions.animations?.durationLarge || 180,
    ...rest
}) {
    // const [shownIndex, setShownIndex] = createState(initialIndex); // State managed by parent
    const count = Math.min(icons?.length || 0, names?.length || 0, children?.length || 0);

    if (count === 0) {
        return box({ child: label({label: "No tabs to display in ExpandingIconTabContainer"})});
    }

    const actualTabsHpack = (() => {
        switch(tabsHpack) {
            case 'start': return Gtk.Align.START;
            case 'end': return Gtk.Align.END;
            case 'fill': return Gtk.Align.FILL;
            case 'center':
            default: return Gtk.Align.CENTER;
        }
    })();

    const tabButtons = Array.from({ length: count }, (_, i) => {
        const isActive = shownIndex_accessor.transform(idx => idx === i);

        const tabIcon = MaterialIcon({ icon: icons[i], size: 'norm', hexpand: isActive.transform(active => !active) });
        const tabNameLabel = label({
            className: 'margin-left-5 txt-small',
            label: names[i],
        });

        const labelRevealer = DoubleRevealer({
            transition1: Gtk.RevealerTransitionType.SLIDE_RIGHT,
            transition2: Gtk.RevealerTransitionType.CROSSFADE,
            duration1: userOptions.animations?.durationSmall || 150,
            duration2: userOptions.animations?.durationSmall || 150,
            revealChild: isActive, // Pass the reactive boolean accessor
            children: tabNameLabel,
        });

        return button({
            className: isActive.transform(active => `tab-icon-expandable ${active ? 'tab-icon-expandable-active' : ''}`),
            tooltipText: names[i],
            child: box({
                homogeneous: true,
                child: box({
                    hpack: 'center',
                    children: [ tabIcon, labelRevealer ]
                })
            }),
            setup: setupCursorHover,
            onClicked: () => onTabChange_handler(i),
        });
    });

    const tabSection = eventbox({
        onScrollUp: () => onTabChange_handler(Math.max(shownIndex_accessor.value - 1, 0)),
        onScrollDown: () => onTabChange_handler(Math.min(shownIndex_accessor.value + 1, count - 1)),
        child: box({
            hpack: actualTabsHpack,
            className: `tab-switcher ${tabSwitcherClassName} spacing-h-5`,
            children: tabButtons,
        })
    });

    const contentStack = stack({
        transition: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
        transitionDuration: transitionDuration,
        children: children.reduce((acc, child, i) => {
            acc[`${i}`] = child;
            return acc;
        }, {}),
        shown: shownIndex_accessor.transform(idx => `${idx}`),
    });

    return box({ // mainBox
        ...rest,
        vertical: true,
        className: `expanding-icon-tab-container ${className} spacing-v-5`,
        children: [
            tabSection,
            contentStack,
        ],
    });
}


import NavigationIndicator from './NavigationIndicator.js'; // Import migrated component

// Base TabContainer - Refactored as a controlled component
export function TabContainer({
    icons, // Array of MaterialIcon names (strings)
    names, // Array of strings for tab labels
    children,
    className = '',
    // Props for controlled component:
    shownIndex_accessor,
    onTabChange_handler,
    // Original props:
    // initialIndex = 0,
    // onChange,
    // setup = () => { }, // Use $ prop in JSX for setup
    extraTabStripWidgets = [], // Additional widgets for the tab strip
    tabStripClassName = 'tab-strip',
    tabButtonClassName = 'tab-btn',
    activeTabButtonClassName = 'tab-btn-active',
    tabIndicatorClassName = 'tab-indicator',
    contentStackClassName = 'tab-content-stack',
    transition = Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
    transitionDuration = userOptions.animations?.durationSmall || 150,
    ...rest
}) {
    const count = Math.min(icons?.length || 0, names?.length || 0, children?.length || 0);

    if (count === 0) {
        return box({ child: label({label: "No tabs to display in TabContainer"})});
    }

    const tabButtons = Array.from({ length: count }, (_, i) => button({
        className: shownIndex_accessor.transform(idx => `${tabButtonClassName} ${idx === i ? activeTabButtonClassName : ''}`),
        onClicked: () => onTabChange_handler(i),
        setup: setupCursorHover,
        child: box({
            hpack: 'center',
            vpack: 'center',
            className: 'spacing-h-5 txt-small', // Ensure SCSS
            children: [
                MaterialIcon({ icon: icons[i], size: 'norm' }),
                label({ label: names[i] }),
            ]
        })
    }));

    const tabsBox = box({
        homogeneous: true, // As per original
        children: tabButtons,
    });

    const tabIndicatorLine = box({ // Original had this as vertical box
        vertical: true,
        homogeneous: true,
        children: [
            NavigationIndicator({
                className: tabIndicatorClassName,
                count: count,
                selectedIndex_accessor: shownIndex_accessor,
            })
        ],
    });

    const tabSection = eventbox({
        onScrollUp: () => onTabChange_handler(Math.max(shownIndex_accessor.value - 1, 0)),
        onScrollDown: () => onTabChange_handler(Math.min(shownIndex_accessor.value + 1, count - 1)),
        child: box({
            className: `tab-section-inner ${tabStripClassName} spacing-h-5`, // Ensure SCSS
            children: [
                box({ // Container for tabs and indicator
                    vertical: true,
                    hexpand: true,
                    children: [
                        tabsBox,
                        tabIndicatorLine
                    ]
                }),
                ...extraTabStripWidgets,
            ]
        })
    });

    const contentStack = stack({
        className: contentStackClassName,
        transition: transition,
        transitionDuration: transitionDuration,
        children: children.reduce((acc, child, i) => {
            acc[`${i}`] = child;
            return acc;
        }, {}),
        shown: shownIndex_accessor.transform(idx => `${idx}`),
    });

    return box({ // mainBox
        ...rest,
        vertical: true,
        className: `tab-container ${className} spacing-v-5`,
        children: [
            tabSection,
            contentStack,
        ],
    });
}
