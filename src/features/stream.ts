/* Imports. */
import constants from "app/constants";
import { Request, Response, Router } from "express";
import * as youtube from "engines/youtube";
import * as spotify from "engines/spotify";

/**
 * Download the specified video.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function download(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const id: string = <string>req.query.id || "";
    const source: string = <string>req.query.engine || "YouTube";

    // Validate arguments.
    if (id == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Download the video.
    let path: string = "";
    switch (source) {
        case "YouTube":
            path = await youtube.download(id);
            break;
        case "Spotify":
            path = await spotify.download(id);
            break;
    }

    // Check if the path is empty.
    if (path == "") {
        rsp.status(404).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Serve the file.
    rsp.status(301).sendFile(path);
}

/**
 * Streams the specified video to the response.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function stream(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const id: string = <string>req.query.id || "";
    const source: string = <string>req.query.engine || "YouTube";

    // Validate arguments.
    if (id == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Set the response headers.
    rsp.set({
        Connection: "keep-alive",
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked"
    });

    // Download the video.
    switch (source) {
        case "YouTube":
            await youtube.stream(id, rsp);
            break;
        case "Spotify":
            await spotify.stream(id, rsp);
            break;
    }

    // Send a response if unable to stream.
    // rsp.status(400).send(constants.INVALID_ARGUMENTS());
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/download", download);
app.get("/stream", stream);

/* Export the router. */
export default app;
