/* Imports. */
import { Client, getUserById } from "features/gateway";
import { ListenMessage } from "app/types";

/**
 * Handles the playing message received.
 * @param client The client that sent the message.
 * @param data The playing message received.
 */
export default function (client: Client, data: ListenMessage) {
    // Get the person to listen with.
    const targetUser = data.with;

    // Check if the target is null.
    if (targetUser == null) {
        // Stop listening along.
        client.stopListeningAlong();
        return;
    } else {
        // Get the target user object.
        const user = getUserById(targetUser);
        // Check if the user exists.
        if (!user) return;

        // Listen along.
        client.listenAlong(user);
    }
}
