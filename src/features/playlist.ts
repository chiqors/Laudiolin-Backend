/* Imports. */
import constants from "app/constants";
import {Request, Response, Router} from "express";
import * as database from "features/database";

/**
 * Fetches the playlist with the specified ID.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function fetchPlaylist(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const id: string = (<string> req.query.id) || "";

    // Validate arguments.
    if(id == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS()); return;
    }

    // Fetch the playlist from the database.
    const playlist = await database.getPlaylist(id);
    // Check if the playlist is empty or private.
    if(playlist == null || playlist.isPrivate) {
        rsp.status(404).send(constants.NO_RESULTS()); return;
    }

    // Send the playlist.
    rsp.status(301).send(playlist);
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/playlist/:id", fetchPlaylist);

/* Export the router. */
export default app;