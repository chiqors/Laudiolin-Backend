/* Imports. */
import {logger} from "app/index";
import constants from "app/constants";
import {Request, Response, Router} from "express";

import {getToken} from "app/utils";
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
        rsp.status(400).send(constants.INVALID_ARGUMENTS()); return;
    }

    // Get the user from the database.
    const user = id ?
        await database.getUser(id as string) :
        await database.getUserByToken(token);
    // Check if the user is empty.
    if(user == null) {
        rsp.status(404).send(constants.NO_RESULTS()); return;
    }

    // Remove private user information.
    const publicUser = Object.assign({}, user);
    delete publicUser.accessToken;
    delete publicUser.refresh;
    delete publicUser.scope;
    delete publicUser.type;
    delete publicUser["__v"]; // These are MongoDB flags.
    delete publicUser["_id"]; // These are MongoDB flags.

    // Send the user.
    rsp.status(301).send(publicUser);
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/user", fetch)
app.get("/user/:id", fetch);

/* Export the router. */
export default app;