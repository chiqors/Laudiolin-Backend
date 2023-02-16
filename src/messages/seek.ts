/* Imports. */
import { Client } from "features/gateway";
import type { SeekMessage } from "app/types";

/**
 * Handles the playing message received.
 * @param client The client that sent the message.
 * @param data The playing message received.
 */
export default async function (client: Client, data: SeekMessage) {
    if (!client.isLoggedIn()) return; // Check if the client is logged in.

    const { seek } = data; // Pull message data.
    client.progress = seek; // Update the client's progress.
    await client.updateOnlineStatus(seek); // Update the client's online status.
}
