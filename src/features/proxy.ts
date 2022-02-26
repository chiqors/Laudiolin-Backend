/* Imports. */
import constants from "app/constants";
import {Request, Response, Router} from "express";

import {toBuffer} from "app/utils";

// URL for Google Images.
const imageUrl = `https://lh3.googleusercontent.com`;

/**
 * Proxy a request.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function handle(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const url: string = req.params.arg;
    const from: string = <string> (req.query.from || "");

    // Check if the arguments are valid.
    if (url == null || from == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS()); return;
    }

    // Proxy the request.
    switch(from) {
    default:
        rsp.status(400).send(constants.INVALID_ARGUMENTS()); return;
    case "cart": // Cover art.
        const response = await fetch(`${imageUrl}/${url}`);
        const buffer = await response.blob();
        rsp.status(200).send(await toBuffer(buffer));
        return;
    }
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/proxy/:arg", handle);

/* Export the router. */
export default app;