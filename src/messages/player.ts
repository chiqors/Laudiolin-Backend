/* Imports. */
import { Client } from "features/gateway";
import { UpdatePlayerMessage } from "app/types";

/**
 * Handles the playing message received.
 * @param client The client that sent the message.
 * @param data The playing message received.
 */
export default async function (client: Client, data: UpdatePlayerMessage) {
    // Check if the client is listening to something.
    if (!client.listeningTo) return;
    // Check if anyone else is listening along.
    if (Object.keys(client.listeningAlong).length == 0) return;

    const { paused, progress } = data;

    // Update the client's state.
    client.paused = paused;
    client.progress = progress;

    // Send the update to the listening along clients.
    for (const id in client.listeningAlong) {
        client.listeningAlong[id]?.syncWith();
    }
}
