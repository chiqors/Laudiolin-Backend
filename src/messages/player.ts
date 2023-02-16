/* Imports. */
import { logger } from "app/index";
import { Client } from "features/gateway";
import type { PlayerMessage } from "app/types";

/**
 * Handles the player message received.
 * @param client The client that sent the message.
 * @param data The player message received.
 */
export default function (client: Client, data: PlayerMessage) {
    const { track, seek, paused } = data; // Pull message data.

    // Run social-related pre-updates.
    if (client.isLoggedIn()) {
        // Check if the client is listening to a different track.
        if (client.listeningTo?.id != track?.id) {
            client.startedListening = Date.now();
            client.addRecentlyPlayed(track)
                .catch(err => logger.warn(err));
        }
    }

    // Update player data.
    client.startedListening = track ? Date.now() : null;
    client.listeningTo = track;
    client.progress = seek;
    client.paused = paused;

    // Run social-related post-updates.
    if (client.isLoggedIn()) {
        // Update the client's rich presence.
        client.updatePresence()
            .catch(err => logger.warn(err));
        // Update the listeners of the client.
        client.updateListeners();
        // Update the client's online status.
        client.updateOnlineStatus()
            .catch(err => logger.warn(err));
    }
}