import Gio from 'gi://Gio';
import GLib from 'gi://GLib'; // Not strictly needed for these functions but often related

function gioExists(path) { // Renamed to avoid conflict if fileUtils.fileExists is imported
    if (!path || typeof path !== 'string') return false;
    try {
        return Gio.File.new_for_path(path).query_exists(null);
    } catch (e) {
        // console.warn(`Error checking existence of path "${path}":`, e);
        return false;
    }
}

export function levenshteinDistance(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return Math.max(a?.length || 0, b?.length || 0);
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const matrix = Array(a.length + 1).fill(null).map(() =>
        Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= b.length; i++) matrix[0][i] = i;
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // Deletion
                matrix[i][j - 1] + 1,      // Insertion
                matrix[i - 1][j - 1] + cost // Substitution
            );
        }
    }
    return matrix[a.length][b.length];
}

export function getAllFiles(dir) {
    const files = [];
    if (!dir || !gioExists(dir)) {
        return files;
    }

    try {
        const file = Gio.File.new_for_path(dir);
        const enumerator = file.enumerate_children(
            'standard::name,standard::type',
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            const childPath = `${dir}/${info.get_name()}`;
            if (info.get_file_type() === Gio.FileType.DIRECTORY) {
                files.push(...getAllFiles(childPath)); // Recurse and spread
            } else {
                files.push(childPath);
            }
        }
        enumerator.close(null); // Close enumerator
    } catch (e) {
        // console.warn(`Error enumerating files in "${dir}":`, e);
    }
    return files;
}


// Cache for icon search paths to avoid re-listing files frequently
const iconFileCache = new Map();

export function searchIcons(appClass, searchPaths = []) {
    if (!appClass || typeof appClass !== 'string') return "";
    const lowerAppClass = appClass.toLowerCase();

    let bestMatchPath = "";
    let minScore = Infinity;

    for (const dir of searchPaths) {
        if (!dir) continue;

        let filesInDir = iconFileCache.get(dir);
        if (!filesInDir) {
            filesInDir = getAllFiles(dir);
            iconFileCache.set(dir, filesInDir);
        }

        for (const itemPath of filesInDir) {
            const fileName = itemPath.split("/").pop().toLowerCase();
            const baseName = fileName.split(".")[0]; // Remove extension

            // Prioritize exact matches or matches with common icon naming schemes
            if (baseName === lowerAppClass || baseName.startsWith(lowerAppClass) || lowerAppClass.startsWith(baseName)) {
                 // Simple heuristic: if it's a direct match or common prefix/suffix, score it high
                const score = levenshteinDistance(baseName, lowerAppClass);
                if (score < minScore) {
                    minScore = score;
                    bestMatchPath = itemPath;
                    if (score === 0) return bestMatchPath; // Exact match found
                }
            } else { // Fallback to levenshtein for less direct matches
                const score = levenshteinDistance(baseName, lowerAppClass);
                if (score < minScore) {
                    minScore = score;
                    bestMatchPath = itemPath;
                }
            }
        }
    }
    // console.log(`Search for ${appClass}: best match ${bestMatchPath} (score ${minScore})`);
    return bestMatchPath;
}
