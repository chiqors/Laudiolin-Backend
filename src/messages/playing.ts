/* Imports. */
import { Client } from "features/gateway";
import { NowPlayingMessage } from "app/types";

/**
 * Handles the playing message received.
 * @param client The client that sent the message.
 * @param data The playing message received.
 */
export default function (client: Client, data: NowPlayingMessage) {
    // Set the currently listening track.
    client.listeningTo = data.track;
    // Set the progress.
    client.progress = data.seek;

    // Update listening to clients.
    for (const id in client.listeningAlong) {
        client.listeningAlong[id]?.syncWith();
    }
}
