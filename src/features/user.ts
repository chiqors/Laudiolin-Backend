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

/**
 * Generates an authorization code.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function auth(req: Request, rsp: Response): Promise<void> {
    if (req.method == "GET") {
        // Check for authorization.
        const token = getToken(req);

        // Check if the token is missing.
        if (token == null) {
            rsp.status(401).send(constants.NO_AUTHORIZATION());
            return;
        }

        // Get the user from the database.
        const user = await database.getUserByToken(token);
        // Check if the user is empty.
        if (user == null) {
            rsp.status(400).send(constants.INVALID_TOKEN());
            return;
        }

        // Generate the authorization code.
        const code = await database.generateAuthCode(user.userId);
        // Check if the code is empty.
        if (code == null) {
            rsp.status(500).send(constants.INTERNAL_ERROR());
            return;
        }

        // Send the code.
        rsp.status(200).send(constants.SUCCESS({ authCode: code }));
    } else {
        // Get the auth code.
        const { code } = req.body;

        // Check if the code is missing.
        if (code == null) {
            rsp.status(400).send(constants.INVALID_ARGUMENTS());
            return;
        }

        // Get the user from the database.
        const user = await database.getUserByAuthCode(code);
        // Check if the user is empty.
        if (user == null) {
            rsp.status(400).send(constants.INVALID_TOKEN());
            return;
        }

        // Check if the auth code has expired.
        if (parseInt(user.codeExpires) < Date.now()) {
            rsp.status(400).send(constants.INVALID_TOKEN());
            return;
        }

        // Remove the auth code from the database.
        user.authCode = null;
        user.codeExpires = null;
        await database.updateUser(user);

        // Respond with the user's token.
        rsp.status(200).send(constants.SUCCESS({ token: user.accessToken }));
    }
}

/**
 * Modifies a user's favorite tracks.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function favorite(req: Request, rsp: Response): Promise<void> {
    // Check for authorization.
    const token = getToken(req);
    // Check for an operation.
    const operation = req.header("Operation");

    // Check if one of the prerequisites is missing.
    if (token == null || operation == null) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Check if the operation is valid.
    if (operation != "add" && operation != "remove") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Get the user from the database.
    const user = await database.getUserByToken(token);
    // Check if the user is empty.
    if (user == null) {
        rsp.status(404).send(constants.INVALID_TOKEN());
        return;
    }

    // Perform the operation on the user's favorites.
    const track = req.body;
    if (operation == "add") {
        // Check if the track is already in the favorites.
        if (user.likedSongs.find(t => t.id == track.id)) {
            rsp.status(400).send(constants.INVALID_ARGUMENTS());
            return;
        }

        // Add the track to the favorites.
        user.likedSongs.push(track);
    } else {
        // Remove the track from the favorites.
        user.likedSongs = user.likedSongs.filter(t => t.id != track.id);
    }

    // Update the user in the database.
    await database.updateUser(user);

    // Send the list of favorites.
    rsp.status(200).send(user.likedSongs);
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/user", fetch);
app.get("/user/auth", auth);
app.post("/user/auth", auth);
app.post("/user/favorite", favorite);
app.get("/user/:id", fetch);

/* Export the router. */
export default app;
