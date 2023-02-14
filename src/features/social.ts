/* Imports. */
import { Request, Response, Router } from "express";
import constants from "app/constants";

import type { BasicUser, OfflineUser, OnlineUser } from "app/types";
import { getToken } from "app/utils";
import * as discord from "features/discord";
import * as database from "features/database";

export let availableUsers: BasicUser[] = []; // Users which are online.
export let onlineUsers: { [key: string]: OnlineUser } = {}; // Users which are actively using Laudiolin.
export let recentUsers: { [key: string]: OfflineUser } = {}; // Users which have been online recently.

/* -------------------------------------------------- */

/**
 * Fetch available users.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function available(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const token = getToken(req);
    const active = <string> req.query.active ?? "false";

    // Get the online users.
    let users = Object.values(onlineUsers);
    const allUsers = Object.values(recentUsers);
    // Check if the request wants to filter out inactive users.
    if (active == "true") {
        users = users.filter(user => user.listeningTo != null);
    }

    // Filter out users which are not public.
    users = users.filter(user => user.socialStatus == "Everyone");
    // Validate users which are friends.
    if (token) {
        // Check if there are any online users which are 'Friends'.
        const friendUsers = allUsers.filter(user => user.socialStatus == "Friends");
        if (friendUsers.length != 0) {
            // Fetch the friends of the user.
            const user = await database.getUserByToken(token);
            let friends = (await discord.getFriends(user))
                .map(friend => friend.id);

            // Add friends to the original array which are friends of the user.
            users = users.concat(friendUsers.filter(user => friends.includes(user.userId)));
        }
    }

    // Send the users.
    rsp.status(200).send(constants.SUCCESS({ onlineUsers: users }));
}

/**
 * Fetches recently online users.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function recent(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const token = getToken(req);

    // Get the offline users.
    let users = Object.values(recentUsers);
    const allUsers = Object.values(recentUsers);
    // Filter out users which are not public.
    users = users.filter(user => user.socialStatus == "Everyone");
    // Validate users which are friends.
    if (token) {
        // Check if there are any online users which are 'Friends'.
        const friendUsers = allUsers.filter(user => user.socialStatus == "Friends");
        if (friendUsers.length != 0) {
            // Fetch the friends of the user.
            const user = await database.getUserByToken(token);
            let friends = (await discord.getFriends(user))
                .map(friend => friend.id);

            // Add friends to the original array which are friends of the user.
            users = users.concat(friendUsers.filter(user => friends.includes(user.userId)));
        }
    }

    // Send the users.
    rsp.status(200).send(constants.SUCCESS({ recentUsers: users }));
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/social/available", available);
app.get("/social/recent", recent);

/* Export the router. */
export default app;