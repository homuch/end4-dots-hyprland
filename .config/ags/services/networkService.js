// This file now re-exports the AstalNetwork service.
// Components should import this file if they need a consistent
// import path, or import 'gi://AstalNetwork' directly.
import Network from 'gi://AstalNetwork';

// You can add any custom logic or extensions to the Network service here if needed,
// then export your customized version. For now, just re-exporting.

// For easy console testing if desired: globalThis.network = Network;
export default Network;
