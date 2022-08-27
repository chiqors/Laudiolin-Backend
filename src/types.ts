// All types in this file should be appropriately named.
// If needed, use /** */ to write extra information about the type.
// Else, try not to bloat the types file.

export type SearchEngine = "YouTube" | "Spotify" | "SoundCloud" | "all";
/**
 * @param icon The URL to the icon of the search result.
 * @param duration The duration of the song in milliseconds.
 */
export type SearchResult = {
    title: string;
    artist: string;
    icon: string;
    url: string;
    override?: string;
    duration: number;
};
export type SearchResults = {
    top: SearchResult;
    results: SearchResult[];
};