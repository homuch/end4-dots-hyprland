// Placeholder for Network Service
import { createState } from 'ags';

const [_primary, _setPrimary] = createState('wifi'); // 'wifi' or 'wired' or null
const [_connectivity, _setConnectivity] = createState('full'); // 'none', 'limited', 'full', 'connecting', 'disconnected'

const FakeWifi = {
    _enabled_accessor: createState(true),
    get enabled_accessor() { return this._enabled_accessor[0];},
    get enabled() { return this._enabled_accessor[0].value; },
    set enabled(val) { this._enabled_accessor[1](!!val); },

    _ssid_accessor: createState("FakeWifiNetwork"),
    get ssid_accessor() { return this._ssid_accessor[0]; },
    get ssid() { return this._ssid_accessor[0].value; },
    set ssid(val) { this._ssid_accessor[1](val); },

    _strength_accessor: createState(85), // 0-100
    get strength_accessor() { return this._strength_accessor[0]; },
    get strength() { return this._strength_accessor[0].value; },
    set strength(val) { this._strength_accessor[1](Math.max(0, Math.min(100, val))); },

    _internet_accessor: createState('connected'), // 'connected', 'disconnected', 'connecting'
    get internet_accessor() { return this._internet_accessor[0]; },
    get internet() { return this._internet_accessor[0].value; },
    set internet(val) { this._internet_accessor[1](val); },

    get iconName() { // Logic from original NetworkWifiIndicator
        if (!this.enabled) return 'signal_wifi_off'; // Or specific disabled icon
        if (this.internet === 'connected') {
            return `network_wifi_${Math.ceil(this.strength / 25)}_bar`; // Assumes 0-4 bar icons
        }
        if (this.internet === 'connecting') return 'settings_ethernet'; // Placeholder for connecting
        return 'signal_wifi_statusbar_not_connected';
    },
};

const FakeWired = {
    _internet_accessor: createState('disconnected'), // 'connected', 'disconnected', 'connecting'
    get internet_accessor() { return this._internet_accessor[0]; },
    get internet() { return this._internet_accessor[0].value; },
    set internet(val) { this._internet_accessor[1](val); },

    get iconName() { // Logic from original NetworkWiredIndicator
        if (this.internet === 'connected') return 'lan';
        if (this.internet === 'connecting') return 'settings_ethernet';
        return 'signal_wifi_off'; // Placeholder for disconnected wired
    },
};

const FakeNetworkService = {
    get primary_accessor() { return _primary; },
    get primary() { return _primary.value; }, // 'wifi' or 'wired'
    set primary(val) { _setPrimary(val); },

    get connectivity_accessor() { return _connectivity; },
    get connectivity() { return _connectivity.value; }, // 'full', 'limited', 'none'
    set connectivity(val) { _setConnectivity(val); },

    wifi: FakeWifi,
    wired: FakeWired,

    // For SimpleNetworkIndicator fallback
    get iconName() {
        if (this.primary === 'wifi') return this.wifi.iconName;
        if (this.primary === 'wired') return this.wired.iconName;
        return 'network_wifi_0_bar'; // Default fallback
    },

    connect: (signal, callback) => { /* console.log(`FakeNetwork: connect to ${signal}`); */ },
};

// globalThis.fns = FakeNetworkService; // For testing
export default FakeNetworkService;
