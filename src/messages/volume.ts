/* Imports. */
import {Client} from "features/gateway";
import {VolumeMessage} from "app/types";

/**
 * Handles the volume message received.
 * @param client The client that sent the message.
 * @param data The volume message received.
 */
export default function(client: Client, data: VolumeMessage) {
    // Set the volume.
    client.volume = data.volume;
    // Send volume to client.
    data.send_back && client.send(<VolumeMessage> {
        volume: data.volume
    });
}