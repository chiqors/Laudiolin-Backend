/* Imports. */
import {Request, Response, Router} from "express";
import constants from "app/constants";

import type { BasicUser, OnlineUser } from "app/types";

export let availableUsers: BasicUser[] = []; // Users which are online.
export let onlineUsers: { [key: string]: OnlineUser } = {}; // Users which are actively using Laudiolin.
export let recentUsers: { [key: string]: BasicUser } = {}; // Users which have been online recently.

/* -------------------------------------------------- */

/**
 * Fetch available users.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function available(req: Request, rsp: Response): Promise<void> {
    rsp.status(200).send(constants.SUCCESS({
        onlineUsers: Object.values(onlineUsers)
    }));
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