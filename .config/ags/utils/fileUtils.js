import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export function fileExists(filePath) {
    if (!filePath) return false;
    const file = Gio.File.new_for_path(filePath);
    return file.query_exists(null);
}

export function expandTilde(path) {
    if (typeof path !== 'string') return path;
    if (path.startsWith('~')) {
        return GLib.get_home_dir() + path.slice(1);
    } else {
        return path;
    }
}
