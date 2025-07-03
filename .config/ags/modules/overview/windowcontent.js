const { Gdk, Gtk } = imports.gi;
import app from 'ags/gtk4/app'; // Corrected App import
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

import Applications from 'ags/service/applications'; // Corrected Applications import
const { execAsync, exec } = Utils;
import { execAndClose, expandTilde, hasUnterminatedBackslash, couldBeMath, launchCustomCommand, ls } from './miscfunctions.js';
import {
    CalculationResultButton, CustomCommandButton, DirectoryButton,
    DesktopEntryButton, ExecuteCommandButton, SearchButton, AiButton, NoResultButton,
} from './searchbuttons.js';
import { checkKeybind } from '../.widgetutils/keybind.js';
import GeminiService from '../../services/gemini.js';

// Add math funcs
const { abs, sin, cos, tan, cot, asin, acos, atan, acot } = Math;
const pi = Math.PI;
// trigonometric funcs for deg
const sind = x => sin(x * pi / 180);
const cosd = x => cos(x * pi / 180);
const tand = x => tan(x * pi / 180);
const cotd = x => cot(x * pi / 180);
const asind = x => asin(x) * 180 / pi;
const acosd = x => acos(x) * 180 / pi;
const atand = x => atan(x) * 180 / pi;
const acotd = x => acot(x) * 180 / pi;

const MAX_RESULTS = 10;
const OVERVIEW_SCALE = 0.18; // = overview workspace box / screen size
const OVERVIEW_WS_NUM_SCALE = 0.09;
const OVERVIEW_WS_NUM_MARGIN_SCALE = 0.07;
const TARGET = [Gtk.TargetEntry.new('text/plain', Gtk.TargetFlags.SAME_APP, 0)];

function iconExists(iconName) {
    let iconTheme = Gtk.IconTheme.get_default();
    return iconTheme.has_icon(iconName);
}

const OptionalOverview = async () => {
    try {
        return (await import('./overview_hyprland.js')).default();
    } catch {
        return box({}); // Corrected
        // return (await import('./overview_hyprland.js')).default();
    }
};

const overviewContent = await OptionalOverview();

export const SearchAndWindows = () => {
    var _appSearchResults = [];

    const resultsBox = box({ // Corrected
        className: 'overview-search-results',
        vertical: true,
    });
    const resultsRevealer = revealer({ // Corrected
        transitionDuration: userOptions.animations.durationLarge,
        revealChild: false,
        transition: 'slide_down',
        // duration: 200,
        hpack: 'center',
        child: resultsBox,
    });
    const entryPromptRevealer = revealer({ // Corrected
        transition: 'crossfade',
        transitionDuration: userOptions.animations.durationLarge,
        revealChild: true,
        hpack: 'center',
        child: label({ // Corrected
            className: 'overview-search-prompt txt-small txt',
            label: getString('Type to search')
        }),
    });

    const entryIconRevealer = revealer({ // Corrected
        transition: 'crossfade',
        transitionDuration: userOptions.animations.durationLarge,
        revealChild: false,
        hpack: 'end',
        child: label({ // Corrected
            className: 'txt txt-large icon-material overview-search-icon',
            label: 'search',
        }),
    });

    const entryIcon = box({ // Corrected
        className: 'overview-search-prompt-box',
        setup: item => item.pack_start(entryIconRevealer, true, true, 0), // Renamed box to item for clarity
    });

    const entryWidget = entry({ // Corrected, renamed to entryWidget to avoid conflict with entry in onChange
        className: 'overview-search-box txt-small txt',
        hpack: 'center',
        onAccept: (self) => { // This is when you hit Enter
            resultsBox.children[0].onClicked();
        },
        onChange: (self) => { // this is when you type, self is the entry widget
            const isAction = self.text[0] == '>';
            const isDir = (['/', '~'].includes(self.text[0]));
            resultsBox.get_children().forEach(ch => ch.destroy());

            // check empty if so then dont do stuff
            if (self.text == '') {
                resultsRevealer.revealChild = false;
                overviewContent.revealChild = true;
                entryPromptRevealer.revealChild = true;
                entryIconRevealer.revealChild = false;
                self.toggleClassName('overview-search-box-extended', false);
                return;
            }
            const text = self.text;
            resultsRevealer.revealChild = true;
            overviewContent.revealChild = false;
            entryPromptRevealer.revealChild = false;
            entryIconRevealer.revealChild = true;
            self.toggleClassName('overview-search-box-extended', true);
            _appSearchResults = Applications.query(text);

            // Calculate
            if (userOptions.search.enableFeatures.mathResults && couldBeMath(text)) { // Eval on typing is dangerous; this is a small workaround.
                try {
                    const fullResult = eval(text.replace(/\^/g, "**"));
                    resultsBox.add(CalculationResultButton({ result: fullResult, text: text }));
                } catch (e) {
                    // console.log(e);
                }
            }
            if (userOptions.search.enableFeatures.directorySearch && isDir) {
                var contents = [];
                contents = ls({ path: text, silent: true });
                contents.forEach((item) => {
                    resultsBox.add(DirectoryButton(item));
                })
            }
            if (userOptions.search.enableFeatures.actions && isAction) { // Eval on typing is dangerous, this is a workaround.
                resultsBox.add(CustomCommandButton({ text: self.text }));
            }
            // Add application entries
            let appsToAdd = MAX_RESULTS;
            _appSearchResults.forEach(item => { // Renamed app to item
                if (appsToAdd == 0) return;
                resultsBox.add(DesktopEntryButton(item)); // Pass item
                appsToAdd--;
            });

            // Fallbacks
            // if the first word is an actual command
            if (userOptions.search.enableFeatures.commands && !isAction && !hasUnterminatedBackslash(text) && exec(`bash -c "command -v ${text.split(' ')[0]}"`) != '') {
                resultsBox.add(ExecuteCommandButton({ command: self.text, terminal: self.text.startsWith('sudo') }));
            }

            // Add fallback: search
            if (userOptions.search.enableFeatures.aiSearch)
                resultsBox.add(AiButton({ text: self.text }));
            if (userOptions.search.enableFeatures.webSearch)
                resultsBox.add(SearchButton({ text: self.text }));
            if (resultsBox.children.length == 0) resultsBox.add(NoResultButton());
            resultsBox.show_all();
        },
    });
    return box({ // Corrected
        vertical: true,
        children: [
            box({ // Corrected
                hpack: 'center',
                children: [
                    entryWidget, // Use new name
                    box({ // Corrected
                        className: 'overview-search-icon-box',
                        setup: (item) => { // Renamed box to item
                            item.pack_start(entryPromptRevealer, true, true, 0)
                        },
                    }),
                    entryIcon,
                ]
            }),
            overviewContent,
            resultsRevealer,
        ],
        setup: (self) => self
            .hook(app, (_b, name, visible) => { // Corrected to app
                if (name == 'overview' && !visible) {
                    resultsBox.children = [];
                    entryWidget.set_text(''); // Use new name
                }
            })
            .on('key-press-event', (widget, event) => { // Typing
                const keyval = event.get_keyval()[1];
                const modstate = event.get_state()[1];
                if (checkKeybind(event, userOptions.keybinds.overview.altMoveLeft))
                    entryWidget.set_position(Math.max(entryWidget.get_position() - 1, 0));
                else if (checkKeybind(event, userOptions.keybinds.overview.altMoveRight))
                    entryWidget.set_position(Math.min(entryWidget.get_position() + 1, entryWidget.get_text().length));
                else if (checkKeybind(event, userOptions.keybinds.overview.deleteToEnd)) {
                    const text = entryWidget.get_text();
                    const pos = entryWidget.get_position();
                    const newText = text.slice(0, pos);
                    entryWidget.set_text(newText);
                    entryWidget.set_position(newText.length);
                }
                else if (!(modstate & Gdk.ModifierType.CONTROL_MASK)) { // Ctrl not held
                    if (keyval >= 32 && keyval <= 126 && widget != entryWidget) { // Use entryWidget
                        Utils.timeout(1, () => entryWidget.grab_focus()); // Use entryWidget
                        entryWidget.set_text(entryWidget.text + String.fromCharCode(keyval)); // Use entryWidget
                        entryWidget.set_position(-1); // Use entryWidget
                    }
                }
            })
        ,
    });
};
