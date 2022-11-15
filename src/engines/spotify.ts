import {logger} from "app/index";
import {SearchResult, SearchResults} from "app/types";
import constants from "app/constants";
import filter from "filters/spotifySong";
import SpotifyWebApi from "spotify-web-api-node";

import * as youtube from "./youtube";

const spotify = new SpotifyWebApi({
    clientId: constants.SPOTIFY_CLIENT_ID,
    clientSecret: constants.SPOTIFY_CLIENT_SECRET,
    redirectUri: constants.SPOTIFY_REDIRECT_URI
}); authorize(); // Authorize the Spotify API.

// Set refresh task.
setInterval(() => {
    authorize();
}, 1000 * 60 * 60);

// Cached, filtered search results.
const cache: {[key: string]: SearchResults} = {};

/**
 * Authorizes with the Spotify API.
 */
export function authorize(): void {
    spotify.clientCredentialsGrant().then(data => {
        spotify.setAccessToken(data.body["access_token"]);
        logger.info("Successfully authenticated with the Spotify API.");
    }).catch(error => {
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
    const results = search.body.tracks.items.map(track => {
        return parseTrack(track);
    }).slice(0, 8);

    // Return result data.
    const data = {top: results[0], results};
    if(!smartFilter) return data;

    // Return cached/filtered data.
    if(cache[query]) return cache[query];
    return cache[query] = await filter(data);
}

/**
 * Parses a track into a search result.
 * @param track The Spotify track to parse.
 */
export function parseTrack(track: any): SearchResult {
    return {
        title: track.name,
        artist: track.artists[0].name,
        icon: track.album.images[0].url,
        url: track.external_urls.spotify,
        id: track.external_ids.isrc,
        duration: track.duration_ms
    };
}

/**
 * Downloads the specified track.
 * Uses the YouTube engine to download an associated video.
 * Returns the path to the file on the local system.
 * @param isrc The ISRC of the track to download.
 */
export async function download(isrc: string): Promise<string> {
    // Perform a search for the track.
    const searchResults = await youtube.search(isrc);
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
    // Perform a search for the track.
    const searchResults = await youtube.search(isrc);
    const topResultUrl = searchResults.top.url;

    // Download the track.
    return await youtube.stream(topResultUrl, pipe);
}