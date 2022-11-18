import {Request} from "express";

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

/**
 * Returns the authorization token in the request.
 * @param req The HTTP request.
 * @return The authorization token, or null if none is found.
 */
export function getToken(req: Request): string | null {
    return (<string> req.headers.authorization) ?? undefined;
}

/**
 * Generates a random string of the specified length.
 * @param length The length of the string.
 * @return The random string.
 */
export function randomString(length: number): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

/**
 * Creates a new object from the given object.
 * @param object The object to copy.
 * @param overrides The overrides to apply.
 */
export function defaultObject<Type>(object: object, overrides: Type): Type {
    // Duplicate the object.
    object = Object.assign({}, object);

    // Assign the overrides.
    for (const key in overrides)
        Object.assign(object, {[key]: overrides[key]});
    return <Type> object; // Return the new object.
}