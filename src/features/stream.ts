/* Imports. */
import constants from "app/constants";
import { Request, Response, Router } from "express";
import * as youtube from "engines/youtube";
import * as spotify from "engines/spotify";
import { identifyId } from "app/utils";
import Format from "youtubei.js/dist/src/parser/classes/misc/Format";

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
    const quality: string = <string>req.query.quality || "High";
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
    let start = 0, end = 3e5;
    if (range) {
        start = range[0].start;
        end = range[0].end;
    }

    if (end == Infinity) end = start + 3e5;

    // Check if the range is valid.
    if (start < 0 || end < 0 || start > end) {
        rsp.status(400).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Download the video.
    let data: { buffer: Uint8Array, data: Format };
    let bytes: Uint8Array = null;
    let length: number = 0;
    switch (source) {
        case "YouTube":
            data = await youtube.stream(id, start, end, quality);
            bytes = data.buffer;
            break;
        case "Spotify":
            data = await spotify.stream(id, start, end, quality);
            bytes = data.buffer; length = data.data.content_length;
            break;
    }

    // Check if the bytes are empty.
    if (bytes == null) {
        rsp.status(404).send(constants.INVALID_ARGUMENTS());
        return;
    }

    // Set the length.
    length = data.data.content_length;
    // Validate the end length.
    if (end > length) end = length;

    // Prepare the headers.
    if (range) {
        rsp.writeHead(206, {
            'Content-Range': 'bytes ' + start + '-' + (end - 1) + '/' + length,
            'Content-Length': length,
            'Accept-Ranges': 'bytes',
            'Content-Type': 'audio/mpeg'
        });
    } else {
        rsp.writeHead(200, {
            "Content-Length": length,
            "Content-Type": "audio/mpeg",
            "Transfer-Encoding": "chunked",
            "Accept-Ranges": "bytes"
        });
    }
    // Send the bytes.
    rsp.write(bytes);
    rsp.end();
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
