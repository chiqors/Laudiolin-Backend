import { isUrl } from "./utils";

/**
 * Attempts to validate the track object.
 * @param track The track to validate.
 */
export function track(track: any): boolean {
    // Check basic track data.
    const basic =
        track &&
        typeof track == "object" &&
        typeof track.title == "string" &&
        typeof track.artist == "string" &&
        typeof track.icon == "string" &&
        typeof track.url == "string" &&
        typeof track.id == "string" &&
        typeof track.duration == "number";
    if (!basic) return false;

    // Validate the duration.
    if (track.duration < 0) return false;
    // Validate the URL.
    if (!isUrl(track.url)) return false;
    // Validate the icon.
    // Finish validating the track.
    return isUrl(track.icon);
}

/**
 * Attempts to validate the playlist object.
 * @param playlist The playlist to validate.
 */
export function playlist(playlist: any): boolean {
    // Check basic playlist data.
    const basic =
        playlist &&
        typeof playlist == "object" &&
        typeof playlist.owner == "string" &&
        typeof playlist.id == "string" &&
        typeof playlist.name == "string" &&
        typeof playlist.description == "string" &&
        typeof playlist.icon == "string" &&
        typeof playlist.isPrivate == "boolean" &&
        Array.isArray(playlist.tracks);
    if (!basic) return false;

    // Validate the tracks.
    for (const song of playlist.tracks) {
        if (!track(song)) return false;
    }

    // Finish validating the playlist.
    return isUrl(playlist.icon);
}
