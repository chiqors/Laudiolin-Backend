/* Imports. */
import constants from "app/constants";
import {Request, Response, Router} from "express";
import * as database from "features/database";

import {Playlist} from "app/types";
import {isJson, getToken} from "app/utils";

/**
 * Creates a playlist.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function createPlaylist(req: Request, rsp: Response): Promise<void> {
    // Check for authorization.
    const token = getToken(req);
    if (token == null) {
        rsp.status(403).send(constants.NO_AUTHORIZATION()); return;
    }

    // Get the user from the database.
    const user = (await database.getUserByToken(token));

    // Get body data.
    if (!req.is("application/json") || !isJson(req.body)) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS()); return;
    }
    // Parse the body data.
    const playlist: Playlist = JSON.parse(req.body);

    // Change the playlist data.
    playlist.id = (await database.generatePlaylistId());
    playlist.owner = user.userId;

    // Save the playlist to the database.
    await database.savePlaylist(playlist);
    // Send the playlist.
    rsp.status(201).send(playlist);
}

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
app.post("/playlist/create", createPlaylist);
app.get("/playlist/:id", fetchPlaylist);

/* Export the router. */
export default app;