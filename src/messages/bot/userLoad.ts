/* Imports. */
import { Client, users } from "features/gateway";
import { DiscordLoadUsersMessage } from "app/types";

import { availableUsers, onlineUsers } from "features/social";

/**
 * Handles the user load message received.
 * @param client The client that sent the message.
 * @param data The user load message received.
 */
export default function (client: Client, data: DiscordLoadUsersMessage) {
    // Get the users being loaded.
    const { users: discordUsers } = data;

    availableUsers.splice(0, availableUsers.length); // Clear the online users list.
    availableUsers.push(...discordUsers); // Add the users to the online users list.

    // Load all Laudiolin-online users.
    Object.keys(users).forEach(async (userId) => {
        const gatewayUser = users[userId][0];
        const onlineUser = await gatewayUser.asOnlineUser();
        onlineUser && gatewayUser && (onlineUsers[userId] = {
            ...onlineUser,
            listeningTo: gatewayUser.listeningTo,
            progress: gatewayUser.progress
        });
    });
}
