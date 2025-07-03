import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk'; // For Gdk.ModifierType
import app from 'ags/gtk4/app';
import { Applications, Hyprland } from '../../../services/placeholderServices.js'; // Placeholders
// TODO: Import real services:
// import Applications from 'ags/service/applications';
// import Hyprland from '../../services/hyprlandService.js';
import { createEffect, createState, createBinding, Utils } from 'ags';
import { execAsync, exec } from 'ags/process';


import {
    CalculationResultButton, CustomCommandButton, DirectoryButton,
    DesktopEntryButton, ExecuteCommandButton, SearchButton, AiButton, NoResultButton,
} from './SearchButtonTypes.js';
import { checkKeybind } from '../../../utils/keybindUtils.js'; // Migrated
import {
    execAndClose, launchCustomCommand, couldBeMath, ls, hasUnterminatedBackslash
} from '../../../utils/overviewUtils.js'; // Migrated
// import GeminiService from '../../../services/geminiService.js'; // Placeholder if not created
// Using the same FakeGeminiService as in SearchButtonTypes.js
const FakeGeminiService = {
    send: (text) => console.log(`GeminiService (Fake): Send "${text}"`)
};
const GeminiService = FakeGeminiService;
import { options as userOptions } from '../../../options.js';


// Math funcs for eval (use with caution)
const { abs, sin, cos, tan, asin, acos, atan } = Math; // cot, acot removed as they are not std Math
const pi = Math.PI;
const sind = x => sin(x * pi / 180);
const cosd = x => cos(x * pi / 180);
const tand = x => tan(x * pi / 180);
// const cotd = x => 1 / tan(x * pi / 180); // Implement if needed
const asind = x => asin(x) * 180 / pi;
const acosd = x => acos(x) * 180 / pi;
const atand = x => atan(x) * 180 / pi;
// const acotd = x => (pi / 2 - atan(x)) * 180 / pi; // Implement if needed


const MAX_RESULTS = userOptions.overview?.maxResults || 10;

// Placeholder for Hyprland Overview content
// const HyprlandOverviewDisplay = () => box({child: label({label: "Hyprland Overview Placeholder"})});
// TODO: Import the actual HyprlandOverviewDisplay when migrated
import HyprlandOverviewDisplay from './HyprlandOverviewDisplay.js';


export default function SearchAndWindowsDisplay() {
    const [searchText, setSearchText] = createState("");
    const [searchResults, setSearchResults] = createState([]); // Array of widget components

    const resultsBox = box({
        className: 'overview-search-results', // Ensure SCSS
        vertical: true,
        children: searchResults.transform(res => res), // Bind children to searchResults accessor
    });

    const resultsRevealer = revealer({
        transition: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transitionDuration: userOptions.animations?.durationLarge || 180,
        revealChild: searchText.transform(txt => txt.length > 0),
        hpack: 'center',
        child: resultsBox,
    });

    const entryPromptLabel = label({
        className: 'overview-search-prompt txt-small txt', // Ensure SCSS
        label: getString('Type to search'), // i18n placeholder
    });
    const entryPromptRevealer = revealer({
        transition: Gtk.RevealerTransitionType.CROSSFADE,
        transitionDuration: userOptions.animations?.durationLarge || 180,
        revealChild: searchText.transform(txt => txt.length === 0),
        hpack: 'center',
        child: entryPromptLabel,
    });

    const entryIconLabel = label({
        className: 'txt txt-large icon-material overview-search-icon', // Ensure SCSS
        label: 'search', // MaterialIcon ligature
    });
    const entryIconRevealer = revealer({
        transition: Gtk.RevealerTransitionType.CROSSFADE,
        transitionDuration: userOptions.animations?.durationLarge || 180,
        revealChild: searchText.transform(txt => txt.length > 0),
        hpack: 'end', // Original was end, this makes it appear on the right of entry
        child: entryIconLabel,
    });

    const searchEntry = AgsEntry({
        className: 'overview-search-box txt-small txt', // Ensure SCSS
        hpack: 'center',
        text: searchText.value, // Initial text (empty)
        onAccept: () => {
            // Activate the first result if any
            const currentResults = searchResults.value;
            if (currentResults.length > 0 && currentResults[0]?.onClicked) {
                currentResults[0].onClicked(); // This assumes result is a button with onClicked
                                               // This needs actual widget instances to call methods.
                                               // Better: get the button widget and call its activate().
                const firstButton = resultsBox.get_first_child(); // If resultsBox contains buttons
                if (firstButton && typeof firstButton.activate === 'function') firstButton.activate();
            }
        },
        onChange: ({ text }) => { // AGS Entry onChange usually passes { text }
            setSearchText(text || ""); // Update state
        },
        setup: (self) => { // To make entry grow/shrink with text
             createEffect(() => {
                self.toggleClassName('overview-search-box-extended', searchText.value.length > 0);
             }, [searchText]);
        }
    });

    // Effect to update search results when searchText changes
    createEffect(() => {
        const text = searchText.value;
        if (text === '') {
            setSearchResults([]);
            return;
        }

        let newResults = [];
        const isAction = text.startsWith('>');
        const isDir = ['/', '~'].includes(text[0]);

        // Calculate
        if (userOptions.search?.enableFeatures?.mathResults && couldBeMath(text)) {
            try {
                // WARNING: eval is dangerous. Use a safer math parser in production.
                const mathResult = eval(text.replace(/\^/g, "**"));
                if (typeof mathResult === 'number' && !isNaN(mathResult)) {
                     newResults.push(CalculationResultButton({ result: mathResult, text: text }));
                }
            } catch (e) { /* ignore math errors */ }
        }
        // Directory
        if (userOptions.search?.enableFeatures?.directorySearch && isDir) {
            const contents = ls({ path: text, silent: true }); // From overviewUtils
            contents.slice(0, MAX_RESULTS - newResults.length).forEach(item => {
                newResults.push(DirectoryButton(item)); // Pass item directly
            });
        }
        // Custom command action
        if (userOptions.search?.enableFeatures?.actions && isAction) {
            newResults.push(CustomCommandButton({ text: text }));
        }
        // Applications
        const appSearchResults = Applications.query(text);
        appSearchResults.slice(0, MAX_RESULTS - newResults.length).forEach(app => {
            newResults.push(DesktopEntryButton({ app }));
        });

        // Fallbacks
        if (newResults.length < MAX_RESULTS && userOptions.search?.enableFeatures?.commands && !isAction && !hasUnterminatedBackslash(text)) {
            try {
                if (exec(`bash -c "command -v ${text.split(' ')[0]}"`).trim() !== '') {
                     newResults.push(ExecuteCommandButton({ command: text, terminal: text.startsWith('sudo') }));
                }
            } catch(e) { /* command not found */ }
        }
        if (newResults.length < MAX_RESULTS && userOptions.search?.enableFeatures?.aiSearch) {
            newResults.push(AiButton({ text: text }));
        }
        if (newResults.length < MAX_RESULTS && userOptions.search?.enableFeatures?.webSearch) {
            newResults.push(SearchButton({ text: text }));
        }

        if (newResults.length === 0) {
            newResults.push(NoResultButton());
        }
        setSearchResults(newResults.slice(0, MAX_RESULTS));

    }, [searchText]);


    // Workspace Overview Content (conditionally shown)
    const overviewWsContent = HyprlandOverviewDisplay(); // This needs to be a valid component

    return box({
        vertical: true,
        className: 'search-and-windows-display', // Add a class for potential styling
        children: [
            box({ // Search Entry Area
                hpack: 'center',
                className: 'overview-search-bar-container', // For styling the bar itself
                children: [
                    searchEntry,
                    // Prompt and Icon are absolutely positioned over the entry or handled by CSS
                    // For now, putting them in a box that might overlay or sit next to.
                    // This part of layout needs careful CSS.
                    // Original had entryPromptRevealer and entryIcon in separate boxes.
                    entryPromptRevealer, // This should ideally overlay the entry's start
                    entryIconRevealer,   // This should ideally overlay the entry's end
                ]
            }),
            // Conditional display: search results or workspace overview
            createBinding([searchText, searchResults], (st, sr) => {
                // If there's search text, show results (resultsRevealer handles empty results internally via NoResultButton)
                // If no search text, show workspace overview.
                return st.length > 0 ? resultsRevealer : overviewWsContent;
            }),
        ],
        setup: (self) => {
            // Clear search when overview is closed
            app.connect('window-toggled', (_app, name, visible) => { // _app since app is already in scope
                if (name.startsWith('overview') && !visible) { // Assuming overview windows are named overview, overview0, etc.
                    setSearchText('');
                }
            });

            // Key press handling for text entry navigation (delegated from parent)
            const keyController = Gtk.EventControllerKey.new();
            keyController.connect('key-pressed', (controller, keyval, keycode, modifier) => {
                const mockEvent = { get_keyval: () => keyval, get_state: () => modifier }; // For checkKeybind
                // TODO: userOptions might not be fully loaded at this point if this setup runs too early.
                // It's better to get userOptions.keybinds inside the event handler or ensure it's loaded.
                const overviewKeybinds = userOptions.keybinds?.overview;

                if (overviewKeybinds) {
                    if (checkKeybind(mockEvent, overviewKeybinds.altMoveLeft)) {
                        searchEntry.set_position(Math.max(searchEntry.get_position() - 1, 0));
                        return Gdk.EVENT_STOP;
                    }
                    if (checkKeybind(mockEvent, overviewKeybinds.altMoveRight)) {
                        searchEntry.set_position(Math.min(searchEntry.get_position() + 1, searchEntry.get_text().length));
                        return Gdk.EVENT_STOP;
                    }
                    if (checkKeybind(mockEvent, overviewKeybinds.deleteToEnd)) {
                        const text = searchEntry.get_text();
                        const pos = searchEntry.get_position();
                        const newText = text.slice(0, pos);
                        searchEntry.set_text(newText);
                        searchEntry.set_position(newText.length);
                        return Gdk.EVENT_STOP;
                    }
                }
                // If not a modifier key press, and focus is not on entry, focus entry and type
                // This logic was in original, might need adjustment for focus management in GTK4
                if (!(modifier & Gdk.ModifierType.CONTROL_MASK) && !(modifier & Gdk.ModifierType.ALT_MASK)) {
                    if (keyval >= Gdk.KEY_space && keyval <= Gdk.KEY_asciitilde) { // Printable chars
                        if (!searchEntry.has_focus) {
                            searchEntry.grab_focus();
                            // Entry might not get the key that triggered focus, so append manually if needed.
                            // However, grab_focus should make it receive subsequent events.
                            // The timeout trick might still be needed for the very first char.
                            // Utils.timeout(1, () => {
                            //    searchEntry.text += String.fromCharCode(keyval); // If keyval is ASCII
                            //    searchEntry.position = -1;
                            // });
                        }
                    }
                }
                return Gdk.EVENT_PROPAGATE;
            });
            self.add_controller(keyController);
        },
    });
}
// getString placeholder
const getString = (str) => str;
