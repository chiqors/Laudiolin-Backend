/* Imports. */
import constants from "app/constants";
import { Request, Response, Router } from "express";

import { toBuffer } from "app/utils";

// URL for Google Images.
const googleUrl = `https://lh3.googleusercontent.com`;
const spotifyUrl = `https://i.scdn.co/image`;
const youTubeUrl = `https://i.ytimg.com/vi`

/**
 * Proxy a request.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function handle(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const url: string = req.params.arg;
    const from: string = <string>(req.query.from || "");

    // Check if the arguments are valid.
    if (url == null || from == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Proxy the request.
    let response = null, buffer = null;

    switch (from) {
        default:
            rsp.status(400).send(constants.INVALID_ARGUMENTS());
            return;
        case "cart": // Google cover art.
            response = await fetch(`${googleUrl}/${url}`);
            buffer = await response.blob();
            rsp.status(200).send(await toBuffer(buffer));
            break;
        case "spot": // Spotify cover art.
            response = await fetch(`${spotifyUrl}/${url}`);
            buffer = await response.blob();
            break;
        case "yt": // YouTube cover art.
            response = await fetch(`${youTubeUrl}/${url}/hq720.jpg`);
            buffer = await response.blob();
            break;
    }

    // Send the response.
    rsp.status(200).send(await toBuffer(buffer));
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/proxy/:arg", handle);

/* Export the router. */
export default app;
