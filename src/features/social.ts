/* Imports. */
import {Request, Response, Router} from "express";
import constants from "app/constants";

import type { BasicUser, OnlineUser } from "app/types";

export let availableUsers: BasicUser[] = []; // Users which are online.
export let onlineUsers: OnlineUser[] = []; // Users which are actively using Laudiolin.

/* -------------------------------------------------- */

/**
 * Fetch available users.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function available(req: Request, rsp: Response): Promise<void> {
    rsp.status(200).send(constants.SUCCESS({ onlineUsers }));
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/social/available", available);

/* Export the router. */
export default app;