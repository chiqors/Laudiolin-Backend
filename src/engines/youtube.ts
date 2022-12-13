import { logger } from "app/index";
import constants from "app/constants";
import { Innertube } from "youtubei.js";
import { noResults } from "features/search";

import { existsSync, createWriteStream, createReadStream } from "node:fs";
import { streamToIterable } from "youtubei.js/dist/src/utils/Utils";

import Video from "youtubei.js/dist/src/parser/classes/Video";
import Music from "youtubei.js/dist/src/core/Music";

import { SearchResults, SearchResult, Playlist } from "app/types";
import MusicResponsiveListItem from "youtubei.js/dist/src/parser/classes/MusicResponsiveListItem";
import * as utils from "app/utils";

let youtube: Innertube | null = null;
let music: Music | null = null;
Innertube.create().then((instance) => {
    youtube = instance;
    music = instance.music;
    logger.info("Successfully authenticated with the YouTube API.");

    playlist("https://www.youtube.com/playlist?list=PL_vMOKCH_Y_s32YQ7UXWFVffRHr7gjLeM");
});

/**
 * Performs a YouTube video search.
 * @param query The query to search for.
 */
export async function search(query: string): Promise<SearchResults> {
    const search = await music.search(query);
    if (search.songs == null) return noResults;

    const tracks = search.songs.contents;

    // console.log(search.songs.contents);
    // console.log(search.videos.contents);
    // console.log(search.albums.contents);

    const results = tracks
        .map((track) => {
            if (track instanceof MusicResponsiveListItem) return parseVideo(track);
        })
        .slice(0, 8);

    return { top: results[0], results };
}

/**
 * Parses a YouTube Music search into a collection of tracks.
 * @param url The URL to parse.
 */
export async function playlist(url: string): Promise<Playlist> {
    const playlist = await youtube.getPlaylist(utils.extractPlaylistId(url));
    const info = playlist.info;
    console.log(playlist);
    return null;
}

/**
 * Parses a video into a search result.
 * @param video The YouTube video to parse.
 */
export function parseVideo(video: MusicResponsiveListItem): SearchResult {
    let mergedArtists = "";
    for (let i = 0; i < video.artists.length; i++) {
        mergedArtists += video.artists[i].name;
        if (i < video.artists.length - 1) mergedArtists += ", ";
    }

    return {
        title: video.title,
        artist: mergedArtists,
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

    // Create a stream for the video.
    const stream = await youtube.download(id, {
        type: "audio",
        quality: "best",
        format: "any"
    });

    // Save the file to the disk.
    const filePath = `${constants.STORAGE_PATH}/${id}.mp3`;

    // Check if the file already exists.
    if (existsSync(filePath)) {
        return filePath; // Return the path to the file.
    }

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
