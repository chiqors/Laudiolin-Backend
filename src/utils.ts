/**
 * Checks if the given value is a string.
 * @param data The value to check.
 */
export function isJson(data: string): boolean {
    try {
        JSON.parse(data); return true;
    } catch {
        return false;
    }
}