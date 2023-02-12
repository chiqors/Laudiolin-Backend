/* Imports. */
import { Client, users } from "features/gateway";
import { DiscordUserUpdateMessage } from "app/types";

import { availableUsers, onlineUsers } from "features/social";

/**
 * Handles the user update message received.
 * @param client The client that sent the message.
 * @param data The user update message received.
 */
export default function (client: Client, data: DiscordUserUpdateMessage) {
    // Get the user data being updated.
    const { user, state } = data;
    const { userId } = user;

    // Check if the user is online.
    if (state == "online") {
        // Check if the user is already online.
        if (availableUsers.find((u) => u.userId == userId)) return;
        // Add the user to the online users list.
        availableUsers.push(user);

        // Check if the user is listening to Laudiolin.
        let gatewayUser = users[userId];
        gatewayUser && (onlineUsers[userId] = {
            ...user,
            listeningTo: gatewayUser[0].listeningTo,
            progress: gatewayUser[0].progress
        });
    } else if (state == "offline") {
        // Remove the user from the online users list.
        const aIndex = availableUsers.findIndex(u => u.userId == userId);
        (aIndex != -1) && availableUsers.splice(aIndex, 1);
        delete onlineUsers[userId];
    }
}
