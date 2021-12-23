import {logger} from "app/index";
import constants from "app/constants";
import {Innertube} from "youtubei.js";
import {SearchResults, SearchResult} from "app/types";
import {existsSync, createWriteStream} from "node:fs";
import Video from "youtubei.js/dist/src/parser/classes/Video";
import {streamToIterable} from "youtubei.js/dist/src/utils/Utils";

let youtube = undefined;
Innertube.create().then(instance => {
    youtube = instance;
    logger.info("Successfully authenticated with the YouTube API.");
});

/**
 * Performs a YouTube video search.
 * @param query The query to search for.
 */
export async function search(query: string): Promise<SearchResults> {
    const search = await youtube.search(query);
    const results = search.videos.map(video => {
        if(video instanceof Video)
            return parseVideo(video);
    }).slice(0, 8);

    return {top: results[0], results};
}

/**
 * Parses a video into a search result.
 * @param video The YouTube video to parse.
 */
export function parseVideo(video: Video): SearchResult {
    return {
        title: video.title.text,
        artist: video.author.name,
        icon: video.thumbnails[0].url,
        url: "https://youtu.be/" + video.id,
        duration: video.duration.seconds * 1000
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
        type: "audio", quality: "best", format: "any"
    });

    // Save the file to the disk.
    const filePath = `${constants.STORAGE_PATH}/${id}.mp3`;

    // Check if the file already exists.
    if(existsSync(filePath)) {
        return filePath; // Return the path to the file.
    }

    const file = createWriteStream(filePath);
    for await (const chunk of streamToIterable(stream))
        file.write(chunk);

    // Return the path to the file.
    return filePath;
}