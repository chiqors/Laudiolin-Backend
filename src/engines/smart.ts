import { logger } from "app/index";
import { proxyFetch, shuffle } from "app/utils";
import constants from "app/constants";

import type { SearchResult, SearchResults, Track } from "app/types";
import { blankResult } from "features/search";

import { Innertube } from "youtubei.js";
import { ObservedArray } from "youtubei.js/dist/src/parser/helpers";
import Music from "youtubei.js/dist/src/core/Music";
import Search from "youtubei.js/dist/src/parser/ytmusic/Search";
import Video from "youtubei.js/dist/src/parser/classes/Video";
import MusicResponsiveListItem from "youtubei.js/dist/src/parser/classes/MusicResponsiveListItem";
import VideoInfo from "youtubei.js/dist/src/parser/youtube/VideoInfo";

/*
 * Authorization methods.
 */

/**
 * Configure the search APIs.
 */
async function configure(): Promise<void> {
    youtube = await Innertube.create(); // Create the YouTube API.
    ytmusic = youtube.music; // Create the YouTube Music API.
}

/*
 * API wrapper instances.
 */

let youtube: Innertube | null = null;
let ytmusic: Music | null = null;

configure() // Configure the search APIs.
    .then(() => logger.info("Configured search engines."))
    .catch((error) => logger.error("Failed to configure search engines.", error));

/*
 * Smart searching:
 * The track is first searched on YouTube Music.
 * The track is then searched on YouTube.
 */

/**
 * Performs a smart search.
 * @param query The query to search for.
 */
export async function search(query: string): Promise<SearchResults> {
    const ytMusicSearch = await ytmusic.search(query);
    const ytSearch = await youtube.search(query);

    const results: SearchResult[] = [];
    results.push(...(await parseTracks(ytMusicSearch)));
    results.push(...parseVideos(ytSearch));

    return {
        top: results[0] ?? blankResult,
        results: results.length > 0 ? shuffle(results) : [blankResult]
    };
}

/**
 * Fetches a track's data from its ID.
 * @param id The ID of the track to fetch.
 * @param engine The engine to search from.
 */
export async function fetchTrack(id: string, engine?: string): Promise<Track | null> {
    // Get the video data.
    const video = await youtube.getInfo(id);
    // Parse the video into a track.
    return parseVideoInfo(video);
}

/**
 * Parses a YouTube Music search into a collection of tracks.
 * @param search The search to parse.
 * @return Parsed search results.
 */
async function parseTracks(search: Search): Promise<SearchResult[]> {
    // Extract different search results.
    // These are sorted from high -> low priority.
    const albums: any = search.albums;
    const songs: any = search.songs;

    // Parse each search result into a collection of tracks.
    let albumTracks = [], songTracks = [];
    if (albums && albums.contents) albumTracks = await parseShelf(albums.contents);
    if (songs && songs.contents) songTracks = await parseShelf(songs.contents);

    // Merge all tracks into a single collection.
    return [...albumTracks, ...songTracks];
}

/**
 * Returns search results from within an album.
 * @param album The album to search within.
 */
async function parseAlbum(album: MusicResponsiveListItem): Promise<SearchResult[]> {
    // Check the item type.
    if (album.item_type != "album") return [];

    // Get the album tracks.
    const result = await ytmusic.getAlbum(album.id);
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

    // Check if the icon should be requested through the proxy.
    if (!icon) icon = item.thumbnails[0].url;
    if (icon.includes("lh3.googleusercontent")) {
        icon = `${constants.TARGET}/proxy/${icon.split("/")[3]}?from=cart`;
    }

    return {
        title: item.title,
        artist: artists,
        icon,
        url: "https://youtu.be/" + item.id,
        id: item.id,
        duration: item.duration.seconds
    };
}

/**
 * Parses YouTube video search results.
 * @param search The YouTube search results.
 */
function parseVideos(search: any): SearchResult[] {
    const results = search.results; // Pull search results.
    const videos = results.filter(
        // Filter out non-video results.
        (result) => result.type === "Video"
    );

    // Parse each video.
    const filteredVideos = [];
    for (const video of videos) {
        let result = parseVideo(video);
        if (result) filteredVideos.push(result);
    }
    return filteredVideos;
}

/**
 * Parses a video into a search result.
 * @param video The video to parse.
 */
function parseVideo(video: Video): SearchResult | null {
    if (!video.duration.seconds) return null;

    return {
        title: video.title.text,
        artist: video.author.name,
        icon: video.best_thumbnail.url,
        url: `https://youtu.be/${video.id}`,
        duration: video.duration.seconds,
        id: video.id
    };
}

/**
 * Parses a video's info into a track.
 * @param video The video to parse.
 */
function parseVideoInfo(video: VideoInfo): Track | null {
    const info = video.basic_info;

    if (!info.duration) return null;

    return {
        title: info.title,
        artist: info.author,
        icon: info.thumbnail[0].url,
        url: `https://youtu.be/${info.id}`,
        duration: info.duration,
        id: info.id
    };
}
