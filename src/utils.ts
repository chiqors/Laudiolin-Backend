import { Request } from "express";
import { SearchEngine } from "./types";

/**
 * Checks if the given value is valid JSON.
 * @param data The value to check.
 */
export function isJson(data: any): boolean {
    // Check if the body data is already parsed.
    if (typeof data == "object") return true;

    try {
        // Try to parse the body data.
        JSON.parse(data);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if the given value is a URL.
 * @param url The value to check.
 */
export function isUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
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
    return <string>req.headers.authorization ?? undefined;
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
    for (const key in overrides) Object.assign(object, { [key]: overrides[key] });
    return <Type>object; // Return the new object.
}

/**
 * Sanitizes the given MongoDB object.
 * @param object The object to sanitize.
 * @param remove Other keys to remove.
 */
export function sanitize(object: object, remove: string[] = []): object {
    // Remove the MongoDB keys.
    delete object["_id"];
    delete object["__v"];
    // Remove the other keys.
    for (const key of remove) delete object[key];

    return object; // Return the sanitized object.
}

/**
 * Creates an object from the model.
 * @param object The model to convert.
 * @param model The model to use.
 */
export function modelFrom(object: object, model: object): object {
    // Create a new object from the model.
    const result = Object.assign({}, model);
    // Assign the object's values.
    for (const key in object) {
        // Check the type of the value.
        if (typeof object[key] == typeof result[key])
            // Assign the value.
            Object.assign(result, { [key]: object[key] });
    }

    // Check the model does not have missing keys.
    for (const key in model) if (result[key] == undefined) throw new Error(`Missing key: ${key}`);
    // Check the model does not have extra keys.
    for (const key in result) if (model[key] == undefined) throw new Error(`Extra key: ${key}`);

    return result; // Return the new object.
}

/**
 * Shuffles an array.
 * @param array The array to shuffle.
 */
export function shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length,
        randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}

/**
 * Convert a Blob to a Buffer.
 * @param blob The Blob to convert.
 */
export async function toBuffer(blob: Blob): Promise<Buffer> {
    return Buffer.from(await blob.arrayBuffer());
}

/**
 * Identifies what engine to use from a URL.
 * @param url The URL to identify.
 * @returns The engine, or null if none is found.
 */
export function identifyUrl(url: string): SearchEngine | null {
    if (url.includes("https://youtu.be")
        || url.includes("https://youtube.com")
        || url.includes("https://www.youtube.com")) return "YouTube";
    if (url.includes("https://open.spotify.com")) return "Spotify";
    if (url.includes("https://soundcloud.com")) return "SoundCloud";

    return null;
}

/**
 * Extracts the ID of a playlist from a URL.
 * @param url The URL to extract from.
 */
export function extractPlaylistId(url: string): string | null {
    const type = identifyUrl(url);
    if (type == "YouTube")
        return url.includes("playlist?list=") ?
            url.split("playlist?list=")[1] :
            url.split("https://youtu.be/")[1];
    if (type == "Spotify") return url.split("playlist/")[1];
    if (type == "SoundCloud") return url.split("sets/")[1];

    return null;
}