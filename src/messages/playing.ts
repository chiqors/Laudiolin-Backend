/* Imports. */
import { Client } from "features/gateway";
import { onlineUsers } from "features/social";
import { NowPlayingMessage } from "app/types";

/**
 * Handles the playing message received.
 * @param client The client that sent the message.
 * @param data The playing message received.
 */
export default async function (client: Client, data: NowPlayingMessage) {
    const { track, seek, sync, paused } = data;

    // Check if the current track is different to the one sent.
    if (client.isLoggedIn() && track &&
        client.listeningTo?.id != track?.id) {
        // Push the new track to the recently played list.
        await client.addRecentlyPlayed(track);
    }

    // Update the client's player status.
    client.listeningTo = track;
    client.progress = seek;
    client.paused = paused ?? false;

    // Check if the client should sync.
    if (sync) {
        // Update listening to clients.
        for (const id in client.listeningAlong) {
            client.listeningAlong[id]?.syncWith();
        }
    }

    // Set the user's online status.
    if (track && !onlineUsers[client.getUserId()]) {
        // Set the online user's data.
        onlineUsers[client.getUserId()] = await client.asOnlineUser();
    } else {
        // Update the user's progress & track.
        onlineUsers[client.getUserId()].listeningTo = track;
        onlineUsers[client.getUserId()].progress = seek;
    }
}
