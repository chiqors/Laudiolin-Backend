/* Imports. */
import { Client } from "features/gateway";
import { NowPlayingMessage } from "app/types";
import { availableUsers, onlineUsers } from "features/social";

/**
 * Handles the playing message received.
 * @param client The client that sent the message.
 * @param data The playing message received.
 */
export default async function (client: Client, data: NowPlayingMessage) {
    const { track, seek, sync } = data;

    // Check if the current track is different to the one sent.
    if (client.isLoggedIn() && track &&
        client.listeningTo?.id != track?.id) {
        // Push the new track to the recently played list.
        await client.addRecentlyPlayed(track);
    }

    // Set the currently listening track.
    client.listeningTo = track;
    // Set the progress.
    client.progress = seek;

    // Check if the client should sync.
    if (sync) {
        // Update listening to clients.
        for (const id in client.listeningAlong) {
            client.listeningAlong[id]?.syncWith();
        }
    }

    // Set user's online status.
    const user = availableUsers.find(u => u.userId == client.getUserId());
    if (!user) return;

    if (track && !onlineUsers[client.getUserId()]) {
        // Set the online user's data.
        onlineUsers[client.getUserId()] = {
            ...user,
            listeningTo: track,
            progress: seek
        };
    } else if (!track && onlineUsers[client.getUserId()]) {
        // Remove the user as they aren't listening.
        delete onlineUsers[client.getUserId()];
    } else {
        // Update the user's progress & track.
        onlineUsers[client.getUserId()].listeningTo = track;
        onlineUsers[client.getUserId()].progress = seek;
    }
}
