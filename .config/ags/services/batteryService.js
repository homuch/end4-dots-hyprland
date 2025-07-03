// This file now re-exports the AstalBattery service.
// Components should import this file if they need a consistent
// import path, or import 'gi://AstalBattery' directly.
import Battery from 'gi://AstalBattery';

// You can add any custom logic or extensions to the Battery service here if needed,
// then export your customized version. For now, just re-exporting.

// For easy console testing if desired: globalThis.battery = Battery;
export default Battery;
