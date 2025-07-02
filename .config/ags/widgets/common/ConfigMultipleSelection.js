import Gtk from 'gi://Gtk?version=4.0';
import { box, button, label } from 'ags/widgets';
import { createState, createEffect } from 'ags';
import { setupCursorHover } from '../../utils/cursorHover.js';

// optionsArr: Array of arrays of { name: string, value: string }
// initialSelection: [rowIndex, colIndex]
// onSelectionChange: (value: string, name: string) => void

export default function ConfigMultipleSelection({
    optionsArr = [[]], // e.g., [[{name:'A',value:'a'},{name:'B',value:'b'}],[{name:'C',value:'c'}]]
    initialSelection = [0, 0], // [rowIndex, colIndex]
    onSelectionChange,
    className = '',
    buttonClassName = 'config-multi-selection-button', // Base class for buttons
    activeButtonClassName = 'config-multi-selection-button-active', // Class for active button
    hpack = 'center', // Gtk.Align for the whole component
    vpack = 'center', // Gtk.Align for the whole component
    ...props
}) {
    const [selectedRow, setSelectedRow] = createState(initialSelection[0] || 0);
    const [selectedCol, setSelectedCol] = createState(initialSelection[1] || 0);

    const getSafeValue = (r, c) => {
        return optionsArr[r]?.[c]?.value || null;
    };
    const getSafeName = (r, c) => {
        return optionsArr[r]?.[c]?.name || 'N/A';
    };

    // Call onSelectionChange when selection actually changes
    createEffect(() => {
        if (onSelectionChange && typeof onSelectionChange === 'function') {
            const val = getSafeValue(selectedRow.value, selectedCol.value);
            const name = getSafeName(selectedRow.value, selectedCol.value);
            if (val !== null) {
                onSelectionChange(val, name);
            }
        }
    }, [selectedRow, selectedCol]);

    return box({
        ...props,
        className: `config-multiple-selection ${className} spacing-v-5`,
        vertical: true,
        hpack: hpack,
        vpack: vpack,
        children: optionsArr.map((rowOptions, rIndex) => box({
            className: 'config-multi-selection-row spacing-h-5',
            hpack: 'center', // Center rows if they don't fill
            children: rowOptions.map((option, cIndex) => button({
                className: createBinding([selectedRow, selectedCol], (sR, sC) =>
                    `${buttonClassName} ${sR === rIndex && sC === cIndex ? activeButtonClassName : ''}`
                ),
                child: label({ label: option.name, className: 'txt-small' }), // Ensure SCSS
                onClicked: () => {
                    setSelectedRow(rIndex);
                    setSelectedCol(cIndex);
                },
                setup: setupCursorHover,
            }))
        }))
    });
}
