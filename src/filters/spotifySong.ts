/* Imports. */
import { SearchResult, SearchResults } from "app/types";
import * as youtube from "engines/youtube";

/**
 * Filters the specified data.
 * Input Data: YouTube search results for an ISRC.
 * Output Data: YouTube search results for songs that are provided.
 * @param data The data to filter.
 * @return The filtered data.
 */
export default async function (data: SearchResults): Promise<SearchResults | undefined> {
    let filtered: SearchResult[] = [];
    for (const result of data.results) {
        const after = await filter(result);
        if (after) filtered.push(after);
    }

    if (filtered.length == 0) {
        return undefined;
    }

    return {
        top: filtered[0],
        results: filtered
    };
}

/**
 * Filters the specified data.
 * @param data The data to filter.
 */
async function filter(data: SearchResult): Promise<SearchResult | undefined> {
    const id = data.id;
    if (!id) return undefined;

    // Perform a YouTube search for the song.
    const results = (await youtube.search(id)).results;
    // Check if a song matches the result.
    const result = results.find((result) => {
        return (
            result.title == data.title &&
            (result.artist.includes(data.artist) || result.artist.includes("Various Artists")) &&
            result.artist.includes("Topic")
        );
    });

    // Return the result if it exists.
    if (result) return result;

    // Attempt to perform a YouTube lookup.
    const searchQuery = `${data.title} ${data.artist} - Topic`;
    return (await youtube.search(searchQuery)).top;
}
