/* Imports. */
import { Client } from "features/gateway";
import { NowPlayingMessage } from "app/types";

/**
 * Handles the playing message received.
 * @param client The client that sent the message.
 * @param data The playing message received.
 */
export default async function (client: Client, data: NowPlayingMessage) {
    const { track, seek } = data;

    // Check if the current track is different to the one sent.
    if (client.getUser() &&
        client.listeningTo?.id != track?.id) {
        // Push the current track to the recently played list.
        await client.addRecentlyPlayed(client.listeningTo);
    }

    // Set the currently listening track.
    client.listeningTo = track;
    // Set the progress.
    client.progress = seek;

    // Update listening to clients.
    for (const id in client.listeningAlong) {
        client.listeningAlong[id]?.syncWith();
    }
}
5