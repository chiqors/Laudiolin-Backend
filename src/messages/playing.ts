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
    const { track, seek } = data;

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

    // Update listening to clients.
    for (const id in client.listeningAlong) {
        client.listeningAlong[id]?.syncWith();
    }

    // Set user's online status.
    const user = availableUsers.find(u => u.userId == client.getUserId());
    if (!user) return;

    if (track && !onlineUsers.find(u => u.userId == client.getUserId())) {
        onlineUsers.push({
            ...user,
            listeningTo: track,
            progress: seek
        });
    } else if (!track && onlineUsers.find(u => u.userId == client.getUserId())) {
        onlineUsers.splice(onlineUsers.findIndex(u => u.userId == client.getUserId()), 1);
    }
}
