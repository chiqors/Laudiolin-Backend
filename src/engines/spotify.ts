import { logger } from "app/index";
import { Playlist, SearchResult, SearchResults } from "app/types";
import constants from "app/constants";
import filter from "filters/spotifySong";
import SpotifyWebApi from "spotify-web-api-node";

import * as youtube from "./youtube";
import * as utils from "app/utils";

const spotify = new SpotifyWebApi({
    clientId: constants.SPOTIFY_CLIENT_ID,
    clientSecret: constants.SPOTIFY_CLIENT_SECRET,
    redirectUri: constants.SPOTIFY_REDIRECT_URI
});
authorize(); // Authorize the Spotify API.

// Set refresh task.
setInterval(() => {
    authorize();
}, 1000 * 60 * 60);

// Cached, filtered search results.
const cache: { [key: string]: SearchResults } = {};
// Cached Spotify tracks.
const tracks: { [key: string]: SearchResult } = {};

/**
 * Authorizes with the Spotify API.
 */
export function authorize(): void {
    spotify
        .clientCredentialsGrant()
        .then((data) => {
            spotify.setAccessToken(data.body["access_token"]);
            logger.info("Successfully authenticated with the Spotify API.");
        })
        .catch((error) => {
            logger.error("Failed to authenticate with the Spotify API.", error);
        });
}

/**
 * Performs a Spotify search.
 * @param query The query to search for.
 * @param smartFilter Whether to perform a smart filter on the results.
 */
export async function search(query: string, smartFilter: boolean = false): Promise<SearchResults> {
    const search = await spotify.searchTracks(query);

    let results = [];
    for (const track of search.body.tracks.items) {
        const result = parseTrack(track);
        if (result == null) continue;
        results.push(result);
    } results = results.slice(0, 8);

    // Return result data.
    const data = { top: results[0], results };
    if (!smartFilter) return data;

    // Return cached/filtered data.
    if (cache[query]) return cache[query];
    return (cache[query] = await filter(data));
}

/**
 * Performs a Spotify search.
 * @param isrc The ISRC to search for.
 */
export async function searchIsrc(isrc: string): Promise<SearchResult> {
    // Check if the ID is an ISRC.
    if (isrc.length != 12) {
        // Get the ISRC from Spotify.
        isrc = await getIsrc(isrc);
    }

    const search = await spotify.searchTracks(`isrc:${isrc}`);
    const items = search.body.tracks.items;

    if (items.length == 0) return null;
    return tracks[isrc] = parseTrack(items[0]);
}

/**
 * Creates a playlist from a Spotify playlist.
 * @param url The playlist URL.
 */
export async function playlist(url: string): Promise<Playlist> {
    const {body} = await spotify.getPlaylist(utils.extractPlaylistId(url));

    // Create the playlist data.
    const playlist: Playlist = {
        owner: "", id: "",
        name: body.name,
        description: body.description,
        icon: body.images[0].url,
        isPrivate: !body.public,
        tracks: []
    };

    // Parse the playlist tracks.
    let offset = 0, limit = body.tracks.total;
    let items = body.tracks.items;
    while (true) {
        for (const item of items) {
            const track = item.track;
            if (!track) continue;

            // Parse the track.
            const parsed = parseTrack(track);
            if (!parsed) continue;
            playlist.tracks.push(parsed);
        }

        // Check if there are more tracks.
        if (offset < limit) {
            offset += items.length;
            items = (await spotify.getPlaylistTracks(
                body.id, { offset })).body.items;
        } else break;
    }

    return playlist;
}

/**
 * Parses a track into a search result.
 * @param track The Spotify track to parse.
 */
export function parseTrack(track: any): SearchResult | null {
    if (track.id == null) return null;

    const isrc = track.external_ids.isrc;
    return tracks[isrc] = {
        title: track.name,
        artist: track.artists[0].name,
        icon: track.album.images[0].url,
        url: track.external_urls.spotify,
        id: track.external_ids.isrc,
        duration: Math.floor(track.duration_ms / 1000)
    };
}

/**
 * Fetches the ISRC of a Spotify track.
 * @param spotifyId The Spotify ID of the track.
 */
async function getIsrc(spotifyId: string): Promise<string> {
    const {body} = await spotify.getTrack(spotifyId);
    return body.external_ids.isrc ?? spotifyId;
}

/**
 * Downloads the specified track.
 * Uses the YouTube engine to download an associated video.
 * Returns the path to the file on the local system.
 * @param isrc The ISRC of the track to download.
 */
export async function download(isrc: string): Promise<string> {
    // Check if the ID is an ISRC.
    if (isrc.length != 12) {
        // Get the ISRC from Spotify.
        isrc = await getIsrc(isrc);
    }

    // Get the track data from the ISRC.
    let track = tracks[isrc];
    if (!track) {
        // Perform a search for the track.
        track = await searchIsrc(isrc);
    }

    // Search for the track.
    const searchResults = await youtube.search(
        `${track.title} - ${track.artist} - Topic`);
    const topResultUrl = searchResults.top.url;

    // Download the track.
    return await youtube.download(topResultUrl);
}

/**
 * Streams the specified track.
 * Uses the YouTube engine to download an associated video.
 * Pipes the data to the response.
 * @param isrc The ISRC of the track to download.
 * @param pipe The pipe to stream the data to.
 */
export async function stream(isrc: string, pipe: any): Promise<void> {
    // Check if the ID is an ISRC.
    if (isrc.length != 12) {
        // Get the ISRC from Spotify.
        isrc = await getIsrc(isrc);
    }

    // Get the track data from the ISRC.
    let track = tracks[isrc];
    if (!track) {
        // Perform a search for the track.
        track = await searchIsrc(isrc);
    }

    // Search for the track.
    const searchResults = await youtube.search(
        `${track.title} - ${track.artist} - Topic`);
    const topResultUrl = searchResults.top.url;

    // Download the track.
    return await youtube.stream(topResultUrl, pipe);
}
