/* Imports. */
import { logger } from "app/index";
import constants from "app/constants";
import { Request, Response, Router } from "express";

import { getToken, sanitize } from "app/utils";
import * as database from "features/database";

/**
 * Fetches the specified user.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function fetch(req: Request, rsp: Response): Promise<void> {
    // Check for authorization.
    const token = getToken(req);
    // Check for a user ID in the request.
    const id = req.params.id;

    // Check if one of the prerequisites is missing.
    if (token == null && id == null) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Get the user from the database.
    const user = id ? await database.getUser(id as string) : await database.getUserByToken(token);
    // Check if the user is empty.
    if (user == null) {
        rsp.status(404).send(constants.NO_RESULTS());
        return;
    }

    // Remove private user information.
    let publicUser = Object.assign({}, user);
    publicUser = sanitize(publicUser, ["accessToken", "refresh", "scope", "type"]);

    // Update the playlists if needed.
    let removePrivate = false;
    if (token && id) {
        // Check if the user is authorized.
        if (user.accessToken != token) removePrivate = true;
    } else if (!token && id) {
        removePrivate = true;
    }

    if (removePrivate) {
        publicUser.playlists = [];
        for (const playlist of user.playlists) {
            // Fetch the playlist data.
            const data = await database.getPlaylist(playlist);
            if (!data.isPrivate) publicUser.playlists.push(playlist);
        }
    }

    // Send the user.
    rsp.status(301).send(publicUser);
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/user", fetch);
app.get("/user/:id", fetch);

/* Export the router. */
export default app;
