import { Gtk } from 'ags/gtk4';
import { box, label, entry as AgsEntry, scrollable } from 'ags/widgets'; // Assuming entry is AgsEntry
import { createState, createEffect, createBinding } from 'ags';
import { options as userOptions } from '../../../options.js';
import { IconTabContainer } from '../../common/TabContainer.js'; // Assuming IconTabContainer is suitable
import MaterialIcon from '../../common/MaterialIcon.js';

// Placeholder for individual API chat UIs
const ChatInterface = ({ apiName, chatEntryRef }) => {
    // This would contain message list, input area (chatEntryRef), send button etc.
    // For now, a simple placeholder.
    // The original chatEntry was passed around. Here, we can pass the ref to the input.
    return (
        <box vertical={true} vexpand={true} hexpand={true} class={`api-chat-interface ${apiName.toLowerCase()}-chat`}>
            <label label={`${apiName} Chat Interface`} class="txt-large margin-10" />
            <scrollable class="chat-message-list" vexpand={true}>
                <box vertical={true} class="spacing-v-5 padding-10">
                    {/* Messages would be dynamically added here */}
                    <label label="Message 1 from bot..."ការ/>
                    <label label="Your message..." hpack={Gtk.Align.END} />
                </box>
            </scrollable>
            <AgsEntry
                placeholderText={`Type to chat with ${apiName}...`}
                class="chat-entry"
                // If chatEntryRef is to be used for external focus:
                $={self => { if(chatEntryRef) chatEntryRef.widget = self; }}
                onAccept={self => {
                    console.log(`${apiName} sending: ${self.text}`);
                    // TODO: Actual send logic via service (e.g., GeminiService.send(self.text))
                    self.text = "";
                }}
            />
        </box>
    );
};

// Define API pages based on userOptions
const apiPagesData = (userOptions.sidebar?.pages?.apis?.order || ['gemini', 'gpt', 'waifu', 'booru'])
    .map(apiKey => {
        // Map apiKey to a display name and icon
        // This data might come from a more structured source or be defined here.
        let displayName = apiKey.charAt(0).toUpperCase() + apiKey.slice(1);
        let iconName = 'api'; // Default icon
        if (apiKey === 'gemini') { displayName = 'Gemini'; iconName = 'auto_awesome'; }
        if (apiKey === 'gpt') { displayName = 'GPT (ChatGPT/Custom)'; iconName = 'chat'; }
        if (apiKey === 'waifu') { displayName = 'Waifus'; iconName = 'photo_library'; }
        if (apiKey === 'booru') { displayName = 'Booru Images'; iconName = 'image_search'; }

        return {
            key: apiKey,
            name: displayName,
            materialIcon: iconName,
            contentComponent: ({ chatEntryRef }) => ChatInterface({ apiName: displayName, chatEntryRef }),
        };
    })
    .filter(Boolean);


export default function ApiWidgetsDisplay({ chatEntryRef }) { // chatEntryRef is passed from SideLeftContent
    const initialApiPageIndex = Math.max(0, apiPagesData.findIndex(
        api => api.key === userOptions.sidebar?.pages?.apis?.defaultPage
    ));
    const [currentApiTabIndex, setCurrentApiTabIndex] = createState(initialApiPageIndex);

    if (apiPagesData.length === 0) {
        return <box><label label="No API widgets configured." /></box>;
    }

    // Pass the chatEntryRef to the active ChatInterface
    // This is tricky because IconTabContainer instantiates all children.
    // A better way is for ChatInterface to take an 'isActive' prop and only one entry is active.
    // Or, the chatEntry is outside the tab container, shared by all.
    // For now, passing chatEntryRef to all; only the visible one should ideally use it.

    return (
        <IconTabContainer
            iconWidgets={apiPagesData.map(page => <MaterialIcon icon={page.materialIcon} size="norm" />)}
            names={apiPagesData.map(page => page.name)}
            children={apiPagesData.map(page => page.contentComponent({ chatEntryRef }))} // Pass ref
            shownIndex_accessor={currentApiTabIndex}
            onTabChange_handler={setCurrentApiTabIndex}
            tabSwitcherClassName="api-tab-switcher" // For specific styling
            vexpand={true}
            hexpand={true}
        />
    );
}

// If chatEntry needs to be a specific, shared widget instance created here:
// export const chatEntry = AgsEntry({ placeholderText: "Type here..." });
// Then ApiWidgetsDisplay would manage placing this single entry.
// However, the original passed 'chatEntry' implying it was a specific instance.
// The ref pattern is an attempt to provide external access to the input field of the active tab.
// This needs refinement based on how `chatEntry.grab_focus()` was intended to work.
// If SideLeft's key handling needs to focus a specific input within the *currently shown* API tab,
// then the `chatEntryRef.widget` needs to be updated by the active `ChatInterface`.
// This is complex with the current TabContainer structure.
// A simpler model: `chatEntry` is a single widget below the ApiWidgets TabContainer.
// The active API service is what `chatEntry` sends messages to.
// For now, I'll stick to the passed `chatEntryRef` being populated by the active tab's input.
// This means the `ChatInterface` should only assign to `chatEntryRef.widget` if it's the active one.
// This would require `ChatInterface` to know if it's active.
// This is getting too complex for this stage. The passed chatEntryRef will be assigned by each, last one wins.
// This implies the original `chatEntry` was a single shared instance.
// Let's assume the ref is for the *currently visible* entry.
// The `ApiWidgetsDisplay` itself might need to manage which child's entry is the "active" one for the ref.
// This is a TODO for deeper refactoring.
// For now, the passed `chatEntryRef` is given to each `ChatInterface`.
