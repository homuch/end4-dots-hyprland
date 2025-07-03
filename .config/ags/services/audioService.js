// Placeholder for Audio Service
// Original: resource:///com/github/Aylur/ags/service/audio.js
// V2 might be: import Audio from 'gi://Gvc'; or similar for PipeWire/PulseAudio control.
import { createState } from 'ags';

const [speakerVolume, setSpeakerVolume] = createState(0.75);
const [speakerMuted, setSpeakerMuted] = createState(false);
// Similar for microphone if needed

const FakeSpeaker = {
    _volume_accessor: speakerVolume, // For direct binding
    _muted_accessor: speakerMuted,   // For direct binding

    get volume() { return speakerVolume.value; },
    set volume(val) {
        const clampedVal = Math.max(0, Math.min(1, val));
        setSpeakerVolume(clampedVal);
        console.log(`Speaker volume set to ${clampedVal.toFixed(2)}`);
        // Real service would use amixer, pactl, or Gvc
    },
    get muted() { return speakerMuted.value; },
    set muted(val) {
        setSpeakerMuted(!!val);
        console.log(`Speaker muted: ${!!val}`);
    },
    // connect for property changes (e.g., 'notify::volume')
    // This fake service uses createState, so direct binding to accessors is preferred.
    connect: (signal, callback) => { /* console.log(`FakeAudio.speaker: connect to ${signal}`); */ }
};

const AudioService = {
    speaker: FakeSpeaker,
    // microphone: FakeMicrophone, // if needed
    // Other properties like 'speakers' (list of sinks), 'microphones' (list of sources)
    // connect: (signal, callback) => { /* console.log(`FakeAudio service: connect to ${signal}`); */ }
};

// For easy console testing: globalThis.fa = AudioService; fa.speaker.volume = 0.5;
export default AudioService;
