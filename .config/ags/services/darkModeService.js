import GLib from 'gi://GLib';
import { interval } from 'ags/utils'; // AGS v2 interval utility
import { options } from '../options.js'; // Migrated user options
import { setDarkMode } from '../utils/system.js'; // Migrated system utility with reactive state

const timeToArray = (timeStr) => timeStr.split(':').map(Number);

const timeBefore = (time1, time2) => { // Arrays of [hour, minute]
    if (time1[0] === time2[0]) return time1[1] < time2[1];
    return time1[0] < time2[0];
};

const timeSame = (time1, time2) => // Arrays of [hour, minute]
    (time1[0] === time2[0] && time1[1] === time2[1]);

const timeBeforeOrSame = (time1, time2) => // Arrays of [hour, minute]
    (timeBefore(time1, time2) || timeSame(time1, time2));

const timeInRange = (time, rangeStart, rangeEnd) => { // Arrays of [hour, minute]
    // Clone arrays to prevent modification of original time arrays if they are passed from options
    const currentLocalTime = [...time];
    const localRangeStart = [...rangeStart];
    const localRangeEnd = [...rangeEnd];

    if (timeBefore(localRangeStart, localRangeEnd)) { // e.g., 08:00 to 18:00
        return timeBeforeOrSame(localRangeStart, currentLocalTime) && timeBeforeOrSame(currentLocalTime, localRangeEnd);
    } else { // rangeEnd < rangeStart, meaning it ends the following day, e.g., 18:00 to 06:00
        // If current time is before rangeStart, it might be on the "next day" part of the cycle
        if (timeBefore(currentLocalTime, localRangeStart)) {
            currentLocalTime[0] += 24; // Treat current time as "next day"
        }
        localRangeEnd[0] += 24; // Treat end time as "next day"
        return timeBeforeOrSame(localRangeStart, currentLocalTime) && timeBeforeOrSame(currentLocalTime, localRangeEnd);
    }
};

let autoDarkModeInterval = null;

export function startAutoDarkModeService() {
    if (autoDarkModeInterval) {
        GLib.source_remove(autoDarkModeInterval); // Stop existing interval if any
        autoDarkModeInterval = null;
    }

    if (!options.appearance?.autoDarkMode?.enabled) {
        return;
    }

    const updateInterval = options.time?.interval || 60000; // Default to 60 seconds if not set

    autoDarkModeInterval = interval(updateInterval, () => {
        if (!options.appearance?.autoDarkMode?.enabled) {
            // If disabled while running, stop the interval
            if (autoDarkModeInterval) {
                GLib.source_remove(autoDarkModeInterval);
                autoDarkModeInterval = null;
            }
            return;
        }

        const fromTimeStr = options.appearance.autoDarkMode.from;
        const toTimeStr = options.appearance.autoDarkMode.to;

        if (!fromTimeStr || !toTimeStr) {
            console.warn("AutoDarkMode: 'from' or 'to' time not defined in options.");
            return;
        }

        const fromTime = timeToArray(fromTimeStr);
        const toTime = timeToArray(toTimeStr);

        if (fromTime.length !== 2 || toTime.length !== 2 || fromTime.some(isNaN) || toTime.some(isNaN)) {
            console.warn("AutoDarkMode: Invalid 'from' or 'to' time format.");
            return;
        }

        if (timeSame(fromTime, toTime)) return; // No range

        const currentDateTime = GLib.DateTime.new_now_local();
        const currentTime = [currentDateTime.get_hour(), currentDateTime.get_minute()];

        const shouldBeDark = timeInRange(currentTime, fromTime, toTime);
        setDarkMode(shouldBeDark);
    });
}

export function stopAutoDarkModeService() {
    if (autoDarkModeInterval) {
        GLib.source_remove(autoDarkModeInterval);
        autoDarkModeInterval = null;
    }
}

// Initial check when service is loaded (optional, could also be done in app.js)
// startAutoDarkModeService(); // Or call this from app.js
