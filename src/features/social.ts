/* Imports. */
import {Request, Response, Router} from "express";
import constants from "app/constants";

import type { BasicUser, OfflineUser, OnlineUser } from "app/types";

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
    const active = <string> req.query.active ?? "false";

    // Get the online users.
    let users = Object.values(onlineUsers);
    // Check if the user wants to filter out inactive users.
    if (active == "true") {
        users = users.filter(user => user.listeningTo != null);
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
    rsp.status(200).send(constants.SUCCESS({
        recentUsers: Object.values(recentUsers)
    }));
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/social/available", available);
app.get("/social/recent", recent);

/* Export the router. */
export default app;