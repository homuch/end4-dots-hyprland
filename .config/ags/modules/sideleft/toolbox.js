// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
// const { Box, Label, Scrollable } = Widget; // To be removed. Label not directly used here.
import QuickScripts from './tools/quickscripts.js';
import ColorPicker from './tools/colorpicker.js';
import Conversions from './tools/conversions.js';
import Name from './tools/name.js';

export default scrollable({ // Corrected
    hscroll: "never",
    vscroll: "automatic",
    child: box({ // Corrected
        vertical: true,
        className: 'spacing-v-10',
        children: [
            QuickScripts(),
            Conversions(),
            ColorPicker(),
            box({ vexpand: true }), // Corrected
            Name(),
        ]
    })
});
