const { Gtk } = imports.gi;
import app from 'ags/gtk4/app'; // Corrected App import
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { execAsync, exec } = Utils;
import { searchItem } from './searchitem.js';
import { execAndClose, couldBeMath, launchCustomCommand } from './miscfunctions.js';
import GeminiService from '../../services/gemini.js';

export const NoResultButton = () => searchItem({
    materialIconName: 'Error',
    name: "Search invalid",
    content: "No results found!",
    onActivate: () => {
        App.closeWindow('overview');
    },
});

export const DirectoryButton = ({ parentPath, name, type, icon: fileIcon }) => { // icon renamed to fileIcon
    const actionText = revealer({
        revealChild: false,
        transition: "crossfade",
        transitionDuration: userOptions.animations.durationLarge,
        child: label({
            className: 'overview-search-results-txt txt txt-small txt-action',
            label: 'Open',
        })
    });
    const actionTextRevealer = revealer({
        revealChild: false,
        transition: "slide_left",
        transitionDuration: userOptions.animations.durationSmall,
        child: actionText,
    });
    return button({
        className: 'overview-search-result-btn',
        onClicked: () => {
            app.closeWindow('overview'); // app instead of App
            execAsync(['bash', '-c', `xdg-open '${parentPath}/${name}'`, `&`]).catch(print);
        },
        child: box({
            children: [
                box({
                    vertical: false,
                    children: [
                        box({
                            className: 'overview-search-results-icon',
                            homogeneous: true,
                            child: icon({ // icon instead of Widget.Icon
                                icon: fileIcon,
                            }),
                        }),
                        label({
                            className: 'overview-search-results-txt txt txt-norm',
                            label: name,
                        }),
                        box({ hexpand: true }),
                        actionTextRevealer,
                    ]
                })
            ]
        }),
        setup: (self) => self
            .on('focus-in-event', (button) => {
                actionText.revealChild = true;
                actionTextRevealer.revealChild = true;
            })
            .on('focus-out-event', (button) => {
                actionText.revealChild = false;
                actionTextRevealer.revealChild = false;
            })
        ,
    })
}

export const CalculationResultButton = ({ result, text }) => searchItem({
    materialIconName: 'calculate',
    name: `Math result`,
    actionName: "Copy",
    content: `${result}`,
    onActivate: () => {
        app.closeWindow('overview'); // Corrected
        execAsync(['wl-copy', `${result}`]).catch(print);
    },
});

export const DesktopEntryButton = (appEntry) => { // app renamed to appEntry
    const actionText = revealer({ // Corrected
        revealChild: false,
        transition: "crossfade",
        transitionDuration: userOptions.animations.durationLarge,
        child: label({ // Corrected
            className: 'overview-search-results-txt txt txt-small txt-action',
            label: 'Launch',
        })
    });
    const actionTextRevealer = revealer({ // Corrected
        revealChild: false,
        transition: "slide_left",
        transitionDuration: userOptions.animations.durationSmall,
        child: actionText,
    });
    return button({ // Corrected
        className: 'overview-search-result-btn',
        onClicked: () => {
            app.closeWindow('overview'); // Corrected
            appEntry.launch();
        },
        child: box({ // Corrected
            children: [
                box({ // Corrected
                    vertical: false,
                    children: [
                        box({ // Corrected
                            className: 'overview-search-results-icon',
                            homogeneous: true,
                            child: icon({ // Corrected
                                icon: appEntry.iconName,
                            }),
                        }),
                        label({ // Corrected
                            className: 'overview-search-results-txt txt txt-norm',
                            label: appEntry.name,
                        }),
                        box({ hexpand: true }), // Corrected
                        actionTextRevealer,
                    ]
                })
            ]
        }),
        setup: (self) => self
            .on('focus-in-event', (button) => {
                actionText.revealChild = true;
                actionTextRevealer.revealChild = true;
            })
            .on('focus-out-event', (button) => {
                actionText.revealChild = false;
                actionTextRevealer.revealChild = false;
            })
        ,
    })
}

export const ExecuteCommandButton = ({ command, terminal = false }) => searchItem({
    materialIconName: `${terminal ? 'terminal' : 'settings_b_roll'}`,
    name: `Run command`,
    actionName: `Execute ${terminal ? 'in terminal' : ''}`,
    content: `${command}`,
    onActivate: () => execAndClose(command, terminal),
    extraClassName: 'techfont',
})

export const CustomCommandButton = ({ text = '' }) => searchItem({
    materialIconName: 'settings_suggest',
    name: 'Action',
    actionName: 'Run',
    content: `${text}`,
    onActivate: () => {
        app.closeWindow('overview'); // Corrected
        launchCustomCommand(text);
    },
});

export const SearchButton = ({ text = '' }) => searchItem({
    materialIconName: 'travel_explore',
    name: 'Search the web',
    actionName: 'Go',
    content: `${text}`,
    onActivate: () => {
        app.closeWindow('overview'); // Corrected
        let search = userOptions.search.engineBaseUrl + text;
        for (let site of userOptions.search.excludedSites) {
            if (site) search += ` -site:${site}`;
        }
        execAsync(['bash', '-c', `xdg-open '${search}' &`]).catch(print);
    },
});

export const AiButton = ({ text }) => searchItem({
    materialIconName: 'chat_paste_go',
    name: 'Ask Gemini',
    actionName: 'Ask',
    content: `${text}`,
    onActivate: () => {
        GeminiService.send(text);
        app.closeWindow('overview'); // Corrected
        app.openWindow('sideleft'); // Corrected
    },
});
