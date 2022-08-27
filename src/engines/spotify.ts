import {logger} from "../index";
import constants from "../constants";
import SpotifyWebApi from "spotify-web-api-node";
import {SearchResult, SearchResults} from "../types";

const spotify = new SpotifyWebApi({
    clientId: constants.SPOTIFY_CLIENT_ID,
    clientSecret: constants.SPOTIFY_CLIENT_SECRET,
    redirectUri: constants.SPOTIFY_REDIRECT_URI
}); authorize(); // Authorize the Spotify API.

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
 */
export async function search(query: string): Promise<SearchResults> {
    const search = await spotify.searchTracks(query);
    const results = search.body.tracks.items.map(track => {
        return parseTrack(track);
    });

    return {top: results[0], results};
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
        override: track.external_ids.isrc,
        duration: track.duration_ms
    };
}