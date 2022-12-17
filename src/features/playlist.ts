/* Imports. */
import constants from "app/constants";
import { Request, Response, Router } from "express";
import * as database from "features/database";
import * as validate from "app/validate";

import { Playlist, Track } from "app/types";
import { isJson, getToken, sanitize, modelFrom, identifyUrl } from "app/utils";

import * as youtube from "engines/youtube";
import * as spotify from "engines/spotify";

/**
 * Creates a playlist.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function createPlaylist(req: Request, rsp: Response): Promise<void> {
    // Check for authorization.
    const token = getToken(req);
    if (token == null) {
        rsp.status(403).send(constants.NO_AUTHORIZATION());
        return;
    }

    // Get the user from the database.
    const user = await database.getUserByToken(token);

    // Get body data.
    if (!req.is("application/json") || !isJson(req.body)) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }
    // Parse the body data.
    const playlist: Playlist = typeof req.body == "object" ? req.body : JSON.parse(req.body);

    // Change the playlist data.
    playlist.id = await database.generatePlaylistId();
    playlist.owner = user.userId;

    // Validate the playlist data.
    if (!validate.playlist(playlist)) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Save the playlist to the database.
    await database.savePlaylist(playlist);
    // Add the playlist ID to the user.
    user.playlists.push(playlist.id);
    await database.updateUser(user);

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
    const id: string = <string>req.params.id || "";

    // Validate arguments.
    if (id == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Fetch the playlist from the database.
    const playlist = await database.getPlaylist(id);
    if (playlist == null) {
        rsp.status(404).send(constants.NO_RESULTS());
        return;
    }

    // Check if the user can view the playlist.
    if (playlist.isPrivate) {
        // Check for authorization.
        const token = getToken(req);
        if (token == null) {
            rsp.status(404).send(constants.NO_RESULTS());
            return;
        }

        // Get the user from the database.
        const user = await database.getUserByToken(token);
        // Validate the user can view the playlist.
        if (!user || user.userId != playlist.owner) {
            rsp.status(404).send(constants.NO_RESULTS());
            return;
        }
    }

    // Send the playlist.
    rsp.status(301).send(sanitize(playlist));
}

/**
 * Updates a playlist with the specified ID.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function editPlaylist(req: Request, rsp: Response): Promise<void> {
    // Check for authorization.
    const token = getToken(req);
    if (token == null) {
        rsp.status(403).send(constants.NO_AUTHORIZATION());
        return;
    }

    // Pull parameters.
    const id = <string>req.params.id || "";
    const type = <string>req.query.type || "";
    // Validate parameters.
    if (id == "" || type == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Get the playlist from the database.
    const playlist = await database.getPlaylist(id);
    if (playlist == null) {
        rsp.status(404).send(constants.NO_RESULTS());
        return;
    }

    // Get the user from the database.
    const user = await database.getUserByToken(token);
    // Validate the user can edit the playlist.
    if (!user || user.userId != playlist.owner) {
        rsp.status(403).send(constants.NO_AUTHORIZATION());
        return;
    }

    // Get body data.
    const body: any = req.body;

    // Modify the playlist depending on type.
    switch (type) {
        default:
            rsp.status(400).send(constants.INVALID_ARGUMENTS());
            return;
        case "rename":
            // Validate the body.
            if (typeof body.name != "string") {
                rsp.status(400).send(constants.INVALID_ARGUMENTS());
                return;
            }

            // Change the playlist name.
            playlist.name = body.name;
            break;
        case "describe":
            // Validate the body.
            if (typeof body.description != "string") {
                rsp.status(400).send(constants.INVALID_ARGUMENTS());
                return;
            }

            // Change the playlist description.
            playlist.description = body.description;
            break;
        case "icon":
            // Validate the body.
            if (typeof body.icon != "string") {
                rsp.status(400).send(constants.INVALID_ARGUMENTS());
                return;
            }

            // Change the playlist icon.
            playlist.icon = body.icon;
            break;
        case "privacy":
            // Validate the body.
            if (typeof body.isPrivate != "boolean") {
                rsp.status(400).send(constants.INVALID_ARGUMENTS());
                return;
            }

            // Change the playlist privacy.
            playlist.isPrivate = body.isPrivate;
            break;
        case "add":
            // Validate the body.
            if (typeof body != "object") {
                rsp.status(400).send(constants.INVALID_ARGUMENTS());
                return;
            }

            // Validate the track.
            if (!validate.track(body)) {
                rsp.status(400).send(constants.INVALID_ARGUMENTS());
                return;
            }

            try {
                // Add the song to the playlist.
                playlist.tracks.push(modelFrom(body, constants.TRACK_MODEL) as Track);
            } catch {
                rsp.status(400).send(constants.INVALID_ARGUMENTS());
                return;
            }

            break;
        case "remove":
            // Validate the body.
            if (typeof body.index != "number") {
                rsp.status(400).send(constants.INVALID_ARGUMENTS());
                return;
            }

            // Remove the song from the playlist.
            playlist.tracks.splice(body.index, 1);
            break;
        case "bulk":
            // Validate the body.
            if (typeof body != "object") {
                rsp.status(400).send(constants.INVALID_ARGUMENTS());
                return;
            }

            // Validate all the tracks.
            const tracks = [];
            for (const track of body.tracks ?? [])
                try {
                    tracks.push(modelFrom(track, constants.TRACK_MODEL) as Track);
                } catch {
                    rsp.status(400).send(constants.INVALID_ARGUMENTS());
                    return;
                }

            // Change the playlist data.
            playlist.tracks = tracks;
            playlist.isPrivate = body.isPrivate ?? playlist.isPrivate;
            playlist.name = body.name ?? playlist.name;
            playlist.description = body.description ?? playlist.description;
            break;
    }

    // Validate the playlist.
    if (!validate.playlist(playlist)) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Save the playlist to the database.
    await database.updatePlaylist(playlist);
    // Send the playlist.
    rsp.status(200).send(sanitize(playlist));
}

/**
 * Deletes a playlist with the specified ID.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function deletePlaylist(req: Request, rsp: Response): Promise<void> {
    // Check for authorization.
    const token = getToken(req);
    if (token == null) {
        rsp.status(403).send(constants.NO_AUTHORIZATION());
        return;
    }

    // Get the user from the database.
    const user = await database.getUserByToken(token);

    // Pull parameters.
    const id = <string>req.params.id || "";
    // Validate parameters.
    if (id == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Get the playlist from the database.
    const playlist = await database.getPlaylist(id);
    if (playlist == null) {
        rsp.status(404).send(constants.NO_RESULTS());
        return;
    }

    // Validate the user can edit the playlist.
    if (!user || user.userId != playlist.owner) {
        rsp.status(403).send(constants.NO_AUTHORIZATION());
        return;
    }

    // Delete the playlist from the database.
    await database.deletePlaylist(id);
    // Remove the playlist from the user.
    user.playlists.splice(user.playlists.indexOf(id), 1);
    await database.updateUser(user);

    // Send a response.
    rsp.status(200).send(constants.SUCCESS());
}

/**
 * Imports a playlist from another source through a URL.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function importPlaylist(req: Request, rsp: Response): Promise<void> {
    // Check for authorization.
    const token = getToken(req);
    if (token == null) {
        rsp.status(403).send(constants.NO_AUTHORIZATION());
        return;
    }

    // Get the user from the database.
    const user = await database.getUserByToken(token);

    // Pull parameters.
    const url = <string> req.body.url || "";
    // Validate parameters.
    if (!url || url == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Validate the user can edit the playlist.
    if (!user) {
        rsp.status(403).send(constants.NO_AUTHORIZATION());
        return;
    }

    // Identify the search engine to use.
    const engine = identifyUrl(url);
    if (engine == null) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Parse the playlist into a Laudiolin playlist.
    let playlist: Playlist | null = null;
    switch (engine) {
    case "YouTube":
        playlist = await youtube.playlist(url);
        break;
    case "Spotify":
        playlist = await spotify.playlist(url);
        break;
    }

    // Check if the playlist is null.
    if (playlist == null) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Generate the playlist data.
    playlist.id = await database.generatePlaylistId();
    playlist.owner = user.userId;

    // Check if the playlist is valid.
    if (!validate.playlist(playlist)) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Save the playlist to the database.
    await database.savePlaylist(playlist);
    // Add the playlist ID to the user.
    user.playlists.push(playlist.id);
    await database.updateUser(user);

    // Send the playlist.
    rsp.status(201).send(playlist);
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.post("/playlist/create", createPlaylist);
app.patch("/playlist/import", importPlaylist);
app.get("/playlist/:id", fetchPlaylist);
app.patch("/playlist/:id", editPlaylist);
app.delete("/playlist/:id", deletePlaylist);

/* Export the router. */
export default app;
