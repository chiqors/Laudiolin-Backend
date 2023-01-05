import { logger } from "app/index";
import constants from "app/constants";
import { Innertube } from "youtubei.js";

import { existsSync, createWriteStream, createReadStream } from "node:fs";
import { streamToIterable } from "youtubei.js/dist/src/utils/Utils";

import Music from "youtubei.js/dist/src/core/Music";

import { SearchResults, SearchResult, Playlist } from "app/types";
import PlaylistVideo from "youtubei.js/dist/src/parser/classes/PlaylistVideo";

import * as utils from "app/utils";
import Video from "youtubei.js/dist/src/parser/classes/Video";

let youtube: Innertube | null = null;
let music: Music | null = null;
Innertube.create().then((instance) => {
    youtube = instance;
    music = instance.music;
    logger.info("Successfully authenticated with the YouTube API.");
});

/**
 * Performs a YouTube video search.
 * @param query The query to search for.
 */
export async function search(query: string): Promise<SearchResults> {
    const search = await youtube.search(query);
    const tracks = search.videos;

    const results = tracks
        .map((track) => {
            if (track instanceof Video)
                return parseVideo(track);
        })
        .slice(0, 8);

    return { top: results[0], results };
}

/**
 * Parses a YouTube Music search into a collection of tracks.
 * @param url The URL to parse.
 */
export async function playlist(url: string): Promise<Playlist> {
    const { items, info } = await youtube.getPlaylist(
        utils.extractPlaylistId(url));

    // Create the playlist data.
    const playlist: Playlist = {
        owner: "", id: "",
        name: info.title ?? "No title.",
        description: info.description ?? "No description.",
        icon: info.thumbnails[0] ? info.thumbnails[0].url : "",
        isPrivate: info.privacy != "PUBLIC",
        tracks: []
    };

    // Parse the playlist tracks.
    for (const item of items) {
        if (item instanceof PlaylistVideo)
            playlist.tracks.push(await parseVideo(item));
    }

    return playlist;
}

/**
 * Parses a video into a search result.
 * @param video The YouTube video to parse.
 */
export function parseVideo(video: Video | PlaylistVideo): SearchResult {
    return {
        title: video.title.text,
        artist: video.author.name,
        icon: video.thumbnails[0].url,
        url: "https://youtu.be/" + video.id,
        id: video.id,
        duration: video.duration.seconds
    };
}

/**
 * Extracts the YouTube video ID from a URL.
 * @param url The URL to extract the ID from.
 */
export function extractId(url: string): string {
    return url.split("/")[3];
}

/**
 * Downloads the specified video.
 * Saves the video to the local system.
 * Returns the path to the file on the local system.
 * @param url The URL of the video to download.
 */
export async function download(url: string): Promise<string> {
    const id: string = url.includes("http") ? extractId(url) : url;

    // Save the file to the disk.
    const filePath = `${constants.STORAGE_PATH}/${id}.mp3`;

    // Check if the file already exists.
    if (existsSync(filePath)) {
        return filePath; // Return the path to the file.
    }

    // Create a stream for the video.
    const stream = await youtube.download(id, {
        type: "audio",
        quality: "best",
        format: "any"
    });

    const file = createWriteStream(filePath);
    for await (const chunk of streamToIterable(stream)) file.write(chunk);

    // Return the path to the file.
    return filePath;
}

/**
 * Streams the specified video.
 * Pipes the data to the response.
 * @param url The URL of the video to stream.
 * @param pipe The response to pipe the data to.
 */
export async function stream(url: string, pipe: any): Promise<void> {
    const id: string = url.includes("http") ? extractId(url) : url;

    // Check if the video exists on the file system.
    const filePath = `${constants.STORAGE_PATH}/${id}.mp3`;

    // Check if the file already exists.
    if (existsSync(filePath)) {
        const fileStream = createReadStream(filePath);
        for await (const chunk of fileStream) pipe.write(chunk);

        return;
    }

    // Create a stream for the video.
    const stream = await youtube.download(id, {
        type: "audio",
        quality: "best",
        format: "any"
    });

    // Pipe the data to the response.
    for await (const chunk of streamToIterable(stream)) pipe.write(chunk);
}
