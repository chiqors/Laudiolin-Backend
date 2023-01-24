import { logger } from "app/index";
import { Innertube } from "youtubei.js";

import Music from "youtubei.js/dist/src/core/Music";
import Search from "youtubei.js/dist/src/parser/ytmusic/Search";
import MusicResponsiveListItem from "youtubei.js/dist/src/parser/classes/MusicResponsiveListItem";

import type { SearchResult, SearchResults } from "app/types";
import { ObservedArray } from "youtubei.js/dist/src/parser/helpers";
import * as utils from "app/utils";

let music: Music | null = null;
Innertube.create().then((instance) => {
    music = instance.music;
    logger.info("Successfully authenticated with the YTMusic API.");
});

/**
 * Performs a YouTube Music search.
 * @param query The query to search for.
 */
export async function search(query: string): Promise<SearchResults> {
    const search = await music.search(query); // Perform a YouTube music (basic) search.
    const tracks = await parseTracks(search); // Parse the tracks into a collection of tracks.

    // Return the top track and all tracks.
    return { top: tracks[0], results: tracks.splice(0, 10) };
}

/**
 * Parses a YouTube Music search into a collection of tracks.
 * @param search The search to parse.
 * @return Parsed search results.
 */
async function parseTracks(search: Search): Promise<SearchResult[]> {
    // Extract different search results.
    // These are sorted from high -> low priority.
    let albums, songs, videos;
    try { albums = await search.getMore(search.albums); } catch { }
    try { songs = await search.getMore(search.songs); } catch { }
    try { videos = await search.getMore(search.videos); } catch { }

    // Parse each search result into a collection of tracks.
    let albumTracks = [], songTracks = [], videoTracks = [];
    if (albums) albumTracks = await parseShelf(albums.results);
    if (songs) songTracks = await parseShelf(songs.results);
    if (videos) videoTracks = await parseShelf(videos.results);

    // Merge all tracks into a single collection.
    return [...albumTracks, ...songTracks, ...videoTracks];
}

/**
 * Returns search results from within an album.
 * @param album The album to search within.
 */
async function parseAlbum(album: MusicResponsiveListItem): Promise<SearchResult[]> {
    // Check the item type.
    if (album.item_type != "album") return [];

    // Get the album tracks.
    const result = await music.getAlbum(album.id);
    const tracks = result.contents;

    // Get album data.
    const icon = album.thumbnails[0].url;
    const artist = album.author ? album.author.name : "Unknown";

    return tracks.map((track) => parseItem(track, icon, artist));
}

/**
 * Parses a music shelf object into search results.
 * @param shelf The shelf to parse. (should be a "getMore" result)
 */
async function parseShelf(shelf: ObservedArray<MusicResponsiveListItem>): Promise<SearchResult[]> {
    if (!shelf) return [];

    const results: SearchResult[] = [];
    for (const track of shelf) {
        if (!(track instanceof MusicResponsiveListItem)) return;

        // Check the item type.
        if (track.item_type == "album") results.push(...(await parseAlbum(track)));
        else results.push(parseItem(track));
    }

    return results;
}

/**
 * Parses an item into a search result.
 * @param item The item to parse.
 * @param icon (optional) The icon to use.
 * @param artist (optional) The artist to use.
 */
function parseItem(
    item: MusicResponsiveListItem,
    icon: string | null = null,
    artist: string | null = null
): SearchResult {
    let artists = artist ?? "";

    // Check the artists type.
    if (item.artists) {
        for (let i = 0; i < item.artists.length; i++) {
            artists += item.artists[i].name;
            if (i < item.artists.length - 1) artists += ", ";
        }
    } else if (item.author) {
        artists = item.author.name;
    }

    return {
        title: item.title,
        artist: artists,
        icon: icon ?? item.thumbnails[0].url,
        url: "https://youtu.be/" + item.id,
        id: item.id,
        duration: item.duration.seconds
    };
}
