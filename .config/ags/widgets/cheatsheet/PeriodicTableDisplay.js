import { Gtk } from 'ags/gtk4'; // Corrected Gtk import
// Intrinsics <box>, <label>, <icon> are used
import { periodicTable, series, niceTypes } from '../../utils/periodicTableData.js';
import { options as userOptions } from '../../options.js'; // For any theming options if needed

// Helper function for ElementTile, as it's used multiple times
const ElementContent = (element) => {
    if (element.name === '') return null;

    return [
        <box class='padding-left-8 padding-right-8 padding-top-8'>
            <label
                label={`${element.number}`}
                class="cheatsheet-periodictable-elementnum txt-tiny txt-bold"
            />
            <box hexpand={true} />
            <label
                label={`${element.weight}`}
                class="txt-smaller"
            />
        </box>,
        element.icon ?
            <icon
                icon={element.icon}
                class="txt-hugerass txt-bold" // Ensure SCSS for size, 'hugerass' is custom
            /> :
            <label
                label={`${element.symbol}`}
                class="cheatsheet-periodictable-elementsymbol"
            />,
        <label
            label={`${element.name}`}
            class="txt-tiny"
        />
    ];
};

const ElementTile = (element) => (
    <box
        vertical={true}
        tooltipText={element.electronConfig ? `${element.electronConfig}` : undefined} // undefined if no tooltip
        class={`cheatsheet-periodictable-${element.type}`}
    >
        {ElementContent(element) || []}
    </box>
);

const BoardColor = (type) => (
    <box class='spacing-h-5'>
        <box
            homogeneous={true}
            class='cheatsheet-periodictable-legend-color-wrapper'
        >
            <box class={`cheatsheet-periodictable-legend-color-${type}`} />
        </box>
        <label
            label={`${niceTypes[type] || type}`}
            class="txt txt-small"
        />
    </box>
);

export default function PeriodicTableDisplay() {
    const mainBoard = (
        <box hpack={Gtk.Align.CENTER} vertical={true} class="spacing-v-3">
            {periodicTable.map(row => (
                <box class="spacing-h-5">
                    {row.map(element => ElementTile(element))}
                </box>
            ))}
        </box>
    );

    const seriesBoard = (
        <box hpack={Gtk.Align.CENTER} vertical={true} class="spacing-v-3">
            {series.map(row => (
                <box class="spacing-h-5">
                    {row.map(element => ElementTile(element))}
                </box>
            ))}
        </box>
    );

    const legend = (
        <box hpack={Gtk.Align.CENTER} class='spacing-h-20'>
            <BoardColor type='metal' />
            <BoardColor type='nonmetal' />
            <BoardColor type='noblegas' />
            <BoardColor type='lanthanum' />
            <BoardColor type='actinium' />
        </box>
    );

    return (
        <box vertical={true} class='spacing-v-20 cheatsheet-content-box'>
            {mainBoard}
            {seriesBoard}
            {legend}
        </box>
    );
}
