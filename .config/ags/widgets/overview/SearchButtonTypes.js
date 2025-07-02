import Gtk from 'gi://Gtk?version=4.0';
import App from 'ags/app';
import { box, label, icon as AgsIcon, button, revealer } from 'ags/widgets'; // AgsIcon for Gtk.Icon
import { execAsync } from 'ags/process';
import SearchItemBase from './SearchItemBase.js';
import { execAndClose, launchCustomCommand } from '../../utils/overviewUtils.js';
// import GeminiService from '../../../services/geminiService.js'; // Placeholder if needed
import { options as userOptions } from '../../../options.js';

// Placeholder for GeminiService if not yet migrated/created
const FakeGeminiService = {
    send: (text) => console.log(`GeminiService (Fake): Send "${text}"`)
};
const GeminiService = FakeGeminiService; // Use placeholder


export const NoResultButton = () => SearchItemBase({
    materialIconName: 'error', // MaterialIcon name
    name: "Search invalid", // Top small label
    content: "No results found!", // Main content label
    actionName: "Dismiss", // Text shown on hover/focus
    onActivate: () => App.closeWindow('overview'), // Action on click
});

export const DirectoryButton = ({ parentPath, name, type, icon: iconName }) => {
    // Original DirectoryButton had its own structure, let's adapt it to use SearchItemBase if possible,
    // or keep it separate if the layout is too different.
    // For now, let's try to use SearchItemBase.
    // If iconName is a full path, MaterialIcon won't work. SearchItemBase expects a material icon name.
    // We need a way for SearchItemBase to accept a Gtk.Icon or an image path.
    // Modifying SearchItemBase or creating a more generic ItemBase might be needed.
    // For now, let's keep DirectoryButton custom if SearchItemBase is too restrictive.

    const actionTextLabel = label({
        className: 'overview-search-results-txt txt txt-small txt-action', label: 'Open',
    });
    const actionTextRevealer = revealer({
        revealChild: false, transition: Gtk.RevealerTransitionType.SLIDE_LEFT,
        transitionDuration: userOptions.animations?.durationSmall || 150, child: actionTextLabel,
    });

    return button({
        className: 'overview-search-result-btn', // General class for all search results
        onClicked: () => {
            App.closeWindow('overview');
            execAsync(['xdg-open', `${parentPath}/${name}`]).catch(print);
        },
        child: box({
            children: [
                AgsIcon({ icon: iconName, className: 'overview-search-results-icon' }), // Use AgsIcon for system icons/paths
                label({ className: 'overview-search-results-txt txt txt-norm', label: name, hexpand: true, xalign: 0 }),
                actionTextRevealer,
            ]
        }),
        setup: (self) => {
            self.connect('focus-in-event', () => { actionTextRevealer.reveal_child = true; return false; });
            self.connect('focus-out-event', () => { actionTextRevealer.reveal_child = false; return false; });
        },
    });
};


export const CalculationResultButton = ({ result, text }) => SearchItemBase({
    materialIconName: 'calculate',
    name: `Math result: ${text}`, // Include original text for context
    actionName: "Copy",
    content: `${result}`,
    onActivate: () => {
        App.closeWindow('overview');
        execAsync(['wl-copy', `${result}`]).catch(print);
    },
});

export const DesktopEntryButton = ({ app }) => { // app is an Application object
    // Similar to DirectoryButton, this uses Gtk.Icon with app.icon_name
    // If SearchItemBase is used, it needs to support Gtk.Icon or app.icon_name directly.
    // For now, custom structure:
    const actionTextLabel = label({
        className: 'overview-search-results-txt txt txt-small txt-action', label: 'Launch',
    });
    const actionTextRevealer = revealer({
        revealChild: false, transition: Gtk.RevealerTransitionType.SLIDE_LEFT,
        transitionDuration: userOptions.animations?.durationSmall || 150, child: actionTextLabel,
    });
    return button({
        className: 'overview-search-result-btn',
        onClicked: () => {
            App.closeWindow('overview');
            app.launch();
        },
        child: box({
            children: [
                AgsIcon({ icon: app.icon_name || 'application-x-executable', className: 'overview-search-results-icon' }),
                label({ className: 'overview-search-results-txt txt txt-norm', label: app.name, hexpand: true, xalign: 0 }),
                actionTextRevealer,
            ]
        }),
        setup: (self) => {
            self.connect('focus-in-event', () => { actionTextRevealer.reveal_child = true; return false; });
            self.connect('focus-out-event', () => { actionTextRevealer.reveal_child = false; return false; });
        },
    });
};

export const ExecuteCommandButton = ({ command, terminal = false }) => SearchItemBase({
    materialIconName: `${terminal ? 'terminal' : 'settings_b_roll'}`,
    name: `Run command`,
    actionName: `Execute ${terminal ? 'in terminal' : ''}`,
    content: `${command}`,
    onActivate: () => execAndClose(command, terminal), // execAndClose from overviewUtils
    extraClassName: 'techfont', // Ensure SCSS
});

export const CustomCommandButton = ({ text = '' }) => SearchItemBase({
    materialIconName: 'settings_suggest',
    name: 'Action', // Or derive from text
    actionName: 'Run',
    content: `${text}`,
    onActivate: () => {
        // App.closeWindow('overview'); // launchCustomCommand might not always want this
        launchCustomCommand(text); // from overviewUtils
    },
});

export const SearchButton = ({ text = '' }) => SearchItemBase({
    materialIconName: 'travel_explore',
    name: 'Search the web',
    actionName: 'Go',
    content: `${text}`,
    onActivate: () => {
        App.closeWindow('overview');
        let searchUrl = (userOptions.search?.engineBaseUrl || 'https://www.google.com/search?q=') + encodeURIComponent(text);
        // Original excludedSites logic can be added here if needed
        execAsync(['xdg-open', searchUrl]).catch(print);
    },
});

export const AiButton = ({ text }) => SearchItemBase({
    materialIconName: 'chat_paste_go', // Or a more AI specific one like 'psychology' or 'hub'
    name: 'Ask Gemini', // Or a generic "Ask AI"
    actionName: 'Ask',
    content: `${text}`,
    onActivate: () => {
        GeminiService.send(text); // Assuming GeminiService is set up
        App.closeWindow('overview');
        // App.openWindow('sideleft'); // Or whatever window shows AI chat
        // This depends on specific UI flow for AI.
    },
});
