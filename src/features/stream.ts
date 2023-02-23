/* Imports. */
import constants from "app/constants";
import { Request, Response, Router } from "express";
import * as youtube from "engines/youtube";
import * as spotify from "engines/spotify";
import { identifyId } from "app/utils";

/**
 * Download the specified video.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function download(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const id: string = <string>req.query.id || "";
    let source: string = <string>req.query.engine || "";

    // Validate arguments.
    if (id == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Identify source.
    if (source == "") {
        source = identifyId(id);
    }

    // Download the video.
    let path: string = "";
    switch (source) {
        case "All":
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
    rsp.status(200).sendFile(path);
}

/**
 * Streams the specified video to the response.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function stream(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const id: string = <string>req.query.id || "";
    let source: string = <string>req.query.engine || "";

    // Validate arguments.
    if (id == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Identify source.
    if (source == "") {
        source = identifyId(id);
    }

    // Check for a range.
    const range = req.range(Infinity, { combine: true });
    let start = 0, end = null;
    if (range) {
        start = range[0].start;
        end = range[0].end;
    }

    // Download the video.
    let bytes: Uint8Array = null;
    switch (source) {
        case "YouTube":
            bytes = await youtube.stream(id);
            break;
        case "Spotify":
            bytes = await spotify.stream(id);
            break;
    }

    // Check if the bytes are empty.
    if (bytes == null) {
        rsp.status(404).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Validate the end position.
    const length = bytes.length;
    if (end == Infinity) end = length - 1;
    const chunkSize = (end - start) + 1;
    // Get the chunk of bytes.
    const chunk = bytes.slice(start, end + 1);

    // Prepare the headers.
    if (range) {
        rsp.writeHead(206, {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + length,
            'Accept-Ranges': 'bytes', 'Content-Length': chunkSize,
            'Content-Type': 'audio/mpeg'
        });
    } else {
        rsp.writeHead(200, {
            "Content-Length": length,
            "Content-Type": "audio/mpeg",
        });
    }
    // Send the bytes.
    rsp.write(chunk, () => rsp.end());
}

/**
 * Caches a track by ID.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function cache(req: Request, rsp: Response): Promise<void> {
    // Pull arguments.
    const id: string = <string>req.query.id || "";
    let source: string = <string>req.query.engine || "";

    // Validate arguments.
    if (id == "") {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Identify source.
    if (source == "") {
        source = identifyId(id);
    }

    // Download the video.
    switch (source) {
        case "YouTube":
            await youtube.download(id);
            break;
        case "Spotify":
            await spotify.download(id);
            break;
    }

    // Send a response if unable to stream.
    rsp.status(200).send(constants.SUCCESS());
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/download", download);
app.get("/stream", stream);
app.get("/cache", cache);

/* Export the router. */
export default app;
