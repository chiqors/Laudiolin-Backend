import { logger } from "app/index";
import constants from "app/constants";
import { Innertube } from "youtubei.js";

import { existsSync, createWriteStream, rmSync } from "node:fs";
import { streamToIterable } from "youtubei.js/dist/src/utils/Utils";

import { SearchResults, SearchResult, Playlist } from "app/types";
import Music from "youtubei.js/dist/src/core/Music";
import Video from "youtubei.js/dist/src/parser/classes/Video";
import Format from "youtubei.js/dist/src/parser/classes/misc/Format";
import PlaylistVideo from "youtubei.js/dist/src/parser/classes/PlaylistVideo";
import { DownloadOptions } from "youtubei.js/dist/src/parser/youtube/VideoInfo";

import * as utils from "app/utils";
import ffmpeg from "fluent-ffmpeg";

const downloadOptions: DownloadOptions = {
    type: "audio",
    quality: "best",
    format: "any"
};

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

    // Write the stream to a temporary file.
    const temporary = `${filePath}.tmp`;
    const fileStream = createWriteStream(temporary);
    for await (const chunk of streamToIterable(stream)) fileStream.write(chunk);
    fileStream.end();

    // Convert the data with ffmpeg and pipe to the file.
    const promise = new Promise<string>((resolve, reject) => {
        ffmpeg(temporary)
            .on("end", () => {
                resolve(filePath);

                // Delete the temporary file.
                rmSync(temporary, { force: true });
            })
            .on("error", err => {
                reject(err); console.error("Error: ", err);
            })
            .audioBitrate(128)
            .audioFrequency(44100)
            .audioChannels(2)
            .save(filePath)
    });

    // Return the path to the file.
    await promise; return filePath;
}

/**
 * Streams the specified video.
 * Does not support MP3 conversion.
 * Requires a minimum and maximum byte range.
 * @param url The URL of the video to stream.
 * @param min The minimum byte range.
 * @param max The maximum byte range.
 */
export async function stream(
    url: string, min: number, max: number
): Promise<{ buffer: Uint8Array, data: Format }> {
    const id: string = url.includes("http") ? extractId(url) : url;
    const streamingData = await youtube.getStreamingData(id, downloadOptions);

    // Download the video.
    const options = {
        ...downloadOptions,
        range: {
            start: min,
            end: Math.min(max, streamingData.content_length)
        }
    };
    const stream = await youtube.download(id, options);

    // Convert the stream to a buffer.
    const chunks: Uint8Array[] = [];
    for await (const chunk of streamToIterable(stream))
        chunks.push(chunk);

    // Return the buffer.
    return {
        data: streamingData,
        buffer: chunks.reduce((a, b) => {
            const c = new Uint8Array(a.length + b.length);
            c.set(a); c.set(b, a.length);
            return c;
        }),
    };
}