import Wp from 'gi://AstalWp';

// Get the default WirePlumber instance
const wp = Wp.get_default();

// The AstalWp.Audio service is available as wp.audio
// It provides default_speaker and default_microphone which are AstalWp.Endpoint objects.
// These Endpoint objects have GObject properties like 'volume' and 'mute'
// that AGS can bind to directly.

// Example of how to wait for the 'ready' signal if needed for imperative actions,
// but for reactive bindings, AGS usually handles this fine.
// wp.connect('ready', () => {
//     console.log('WirePlumber service is ready.');
//     console.log('Initial speaker volume:', wp.audio.default_speaker?.volume);
// });

const AudioService = {
    // Expose the default speaker and microphone directly.
    // AGS should be able to bind to their properties like:
    // audioService.speaker.volume
    // audioService.speaker.mute
    // audioService.microphone.volume
    // audioService.microphone.mute
    get speaker() {
        return wp.audio.default_speaker;
    },

    get microphone() {
        return wp.audio.default_microphone;
    },

    // Provide lists of available devices if needed by UI
    get speakers() {
        return wp.audio.speakers; // This is a GList of AstalWpEndpoint objects
    },

    get microphones() {
        return wp.audio.microphones; // This is a GList of AstalWpEndpoint objects
    },

    // Expose the core AstalWp.Audio instance if deeper access is needed
    get wpAudio() {
        return wp.audio;
    },

    // connect method for the service itself, if top-level signals are needed.
    // For property changes on speaker/microphone, connect directly to those objects.
    // connect: (signal, callback) => {
    //    return wp.audio.connect(signal, callback);
    // }
};

export default AudioService;
