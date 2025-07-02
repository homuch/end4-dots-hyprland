export function getNestedProperty(obj, path) {
    if (typeof path !== 'string' || !obj) {
        return undefined;
    }
    return path.split('.').reduce((current, key) => {
        return (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, key)) ? current[key] : undefined;
    }, obj);
}

export function updateNestedProperty(obj, path, newValue) {
    if (typeof path !== 'string' || !obj) {
        return false;
    }
    const pathArray = path.split('.');
    const lastKeyIndex = pathArray.length - 1;

    let current = obj;

    for (let i = 0; i < lastKeyIndex; i++) {
        const key = pathArray[i];
        if (!current || typeof current !== 'object') {
            // If a part of the path is not an object, we cannot proceed.
            // Or, decide to create intermediate objects if that's the desired behavior.
            // For now, let's assume intermediate objects should exist or be creatable.
            // If current[key] is undefined or not an object, create it.
            if (!Object.prototype.hasOwnProperty.call(current, key) || typeof current[key] !== 'object' || current[key] === null) {
                current[key] = {}; // Create the missing object
            }
        }
        current = current[key];
    }

    const lastKey = pathArray[lastKeyIndex];

    if (!current || typeof current !== 'object') {
        return false; // Parent of the target key is not an object
    }

    current[lastKey] = newValue;
    return true;
}
