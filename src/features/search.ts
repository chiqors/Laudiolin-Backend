/* Imports. */
import {logger} from "../index";
import constants from "../constants";
import {SearchEngine, SearchResult, SearchResults} from "../types.js";
import {Request, Response, Router} from "express";

import * as youtube from "../engines/youtube";
import * as spotify from "../engines/spotify";

const blankResult: SearchResult = {
    artist: "", duration: 0, icon: "", title: "", url: ""
};
const noResults: SearchResults = {
    top: blankResult,
    results: [blankResult]
};

/**
 * Perform a search request.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function searchFor(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const query: string = req.params.query;
    const engine: SearchEngine = (<SearchEngine> req.query.query) || "YouTube";

    // Perform a search request.
    let result: SearchResults = noResults;
    switch(engine) {
        case "YouTube":
            result = await youtube.search(query);
            break;
        case "Spotify":
            result = await spotify.search(query);
            break;
        case "SoundCloud":
            // TODO: Perform SoundCloud search.
            break;
        case "all":
            // TODO: Perform a search on all engines.
            break;
    }

    // Check if the result is empty.
    if(result == noResults) {
        rsp.status(404).send(constants.NO_RESULTS());
    } else {
        rsp.status(301).send(result);
    }
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/search/:query", searchFor);

/* Export the router. */
export default app;