import {logger} from "../index";
import {Innertube} from "youtubei.js";
import {SearchResults, SearchResult} from "../types";
import Video from "youtubei.js/dist/src/parser/classes/Video";

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
    const results = search.videos.map((video: Video) => {
        return parseVideo(video);
    });

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