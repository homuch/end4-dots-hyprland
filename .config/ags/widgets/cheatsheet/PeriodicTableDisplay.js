import Gtk from 'gi://Gtk?version=4.0';
import { box, label, icon as AgsIcon } from 'ags/widgets';
import { periodicTable, series, niceTypes } from '../../utils/periodicTableData.js'; // Migrated data

// Helper function for ElementTile, as it's used multiple times
const ElementContent = (element) => {
    if (element.name === '') return null; // Empty cell

    return [
        box({ // Top row: number and weight
            className: 'padding-left-8 padding-right-8 padding-top-8', // Ensure SCSS has these
            children: [
                label({
                    label: `${element.number}`,
                    className: "cheatsheet-periodictable-elementnum txt-tiny txt-bold", // Ensure SCSS
                }),
                box({ hexpand: true }), // Spacer
                label({
                    label: `${element.weight}`,
                    className: "txt-smaller", // Ensure SCSS
                })
            ]
        }),
        // Middle: Symbol or Icon
        element.icon ? AgsIcon({ // Use AgsIcon
            icon: element.icon, // Assuming icon is a valid icon name
            className: "txt-hugerass txt-bold", // Ensure SCSS. 'hugerass' might need adjustment
        }) : label({
            label: `${element.symbol}`,
            className: "cheatsheet-periodictable-elementsymbol", // Ensure SCSS
        }),
        // Bottom: Name
        label({
            label: `${element.name}`,
            className: "txt-tiny", // Ensure SCSS
        })
    ];
};

const ElementTile = (element) => {
    return box({
        vertical: true,
        tooltipText: element.electronConfig ? `${element.electronConfig}` : null,
        className: `cheatsheet-periodictable-${element.type}`, // Ensure SCSS defines these type classes
        children: ElementContent(element) || [], // Ensure children is always an array
    });
};

const BoardColor = (type) => box({
    className: 'spacing-h-5', // Ensure SCSS
    children: [
        box({
            homogeneous: true, // If the color box should be constrained
            className: `cheatsheet-periodictable-legend-color-wrapper`, // Ensure SCSS
            child: box({
                className: `cheatsheet-periodictable-legend-color-${type}`, // CSS for background color based on type
            })
        }),
        label({
            label: `${niceTypes[type] || type}`, // Fallback to type if not in niceTypes
            className: "txt txt-small", // Ensure SCSS
        })
    ]
});

export default function PeriodicTableDisplay() {
    const mainBoard = box({
        hpack: 'center',
        vertical: true,
        className: "spacing-v-3", // Ensure SCSS
        children: periodicTable.map(row => box({ // Rows
            className: "spacing-h-5", // Ensure SCSS
            children: row.map(element => ElementTile(element))
        })),
    });

    const seriesBoard = box({
        hpack: 'center',
        vertical: true,
        className: "spacing-v-3", // Ensure SCSS
        children: series.map(row => box({ // Rows
            className: "spacing-h-5", // Ensure SCSS
            children: row.map(element => ElementTile(element))
        })),
    });

    const legend = box({
        hpack: 'center',
        className: 'spacing-h-20', // Ensure SCSS
        children: [
            BoardColor('metal'),
            BoardColor('nonmetal'),
            BoardColor('noblegas'),
            BoardColor('lanthanum'), // Corrected name from periodicTableData.js
            BoardColor('actinium'),  // Corrected name
        ]
    });

    return box({
        vertical: true,
        className: 'spacing-v-20 cheatsheet-content-box', // Added a general class for padding/styling
        children: [
            mainBoard,
            seriesBoard,
            legend
        ]
    });
}
