/* Imports. */
import {Client} from "features/gateway";
import {LatencyMessage} from "app/types";

/**
 * Handles a ping message.
 * @param client The client that sent the message.
 * @param data The latency message received.
 */
export default function(client: Client, data: LatencyMessage) {
    // Update the last ping.
    client.lastPing = data.timestamp;
    // Send a ping message.
    client.ping();
}