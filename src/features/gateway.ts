// This file also serves as the primary websocket handler.
// Other functionality is split into separate files.

/* Imports. */
import constants from "app/constants";

import { logger } from "app/index";
import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { GatewayMessage, Track } from "app/types";
import * as types from "app/types";

import { isJson } from "app/utils";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";

const clients: { [key: string]: Client } = {};

/**
 * Handles a new websocket connection.
 * Adds listeners to events.
 * @param ws The socket connection.
 * @param incMsg The incoming message.
 */
function handleConnection(ws: WebSocket, incMsg: IncomingMessage): void {
    // Create an ID for the socket & create a client.
    (<any>ws).id = randomUUID().toString();
    const client = (clients[(<any>ws).id] = new Client(ws));

    // Add event handlers.
    ws.on("message", client.handleMessage.bind(client));
    ws.on("close", client.handleClose.bind(client));
}

/* A collection of message handlers. */
const handlers = {
    /* Gateway ping. (client) */
    latency: require("messages/latency"),
    /* Now playing. (client) */
    playing: require("messages/playing"),
    /* Update volume. (client) */
    volume: require("messages/volume")
};

/* Create a connection handler. */
export default function (socket: WebSocket, incMsg: IncomingMessage): void {
    // Process the connection.
    handleConnection(socket, incMsg);
}

export class Client {
    private hasInitialized: boolean = false;
    lastPing: number = Date.now();

    /* Player information. */
    listeningTo: Track | null = null;
    progress: number = 0;
    volume: number = 1.0;

    /* Social information. */
    listeningAlong: { [key: string]: Client } = {};
    listeningWith: Client | null = null;

    constructor(private readonly socket: WebSocket) {
        // Send the initialize message.
        this.send(constants.GATEWAY_INIT());
        // Log a message to the console.
        logger.debug(`New client connected: ${this.getId()}`);
    }

    /*
     * Getters.
     */

    /**
     * Returns the client's socket.
     */
    getHandle(): WebSocket {
        return this.socket;
    }

    /**
     * Returns the client's ID.
     */
    getId(): string {
        return (<any>this.socket).id;
    }

    /**
     * Returns the client that this client is listening with.
     */
    getListeningWith(): Client | null {
        return this.listeningWith;
    }

    /*
     * Social utilities.
     */

    /**
     * Listen along to another client.
     * @param client The client to listen along with.
     */
    listenAlong(client: Client): void {
        // Add this client to the target's listening along list.
        client.listeningAlong[this.getId()] = this;
        // Set this client's listening with.
        this.listeningWith = client;

        // Sync with the target.
        this.syncWith();
    }

    /**
     * Syncs this client with the listening with client.
     */
    syncWith(): void {
        // Check if the client is listening with someone.
        if (!this.listeningWith) return;
        const listeningWith = this.listeningWith;

        // Send a sync message.
        this.send(<types.SyncMessage>{
            track: listeningWith.listeningTo,
            progress: listeningWith.progress
        });
    }

    /*
     * Websocket utilities.
     */

    /**
     * Disconnects the client.
     */
    disconnect(code?: number): void {
        this.socket.close(code);
    }

    /**
     * Sends a message to the client.
     * @param data The data to send.
     */
    send(data: any): void {
        if (!data.timestamp) data.timestamp = Date.now();

        this.socket.send(JSON.stringify(data));
    }

    /*
     * Utility checks.
     */

    /**
     * Pings the client.
     */
    ping(): void {
        // Calculate the latency.
        const latency: number = Date.now() - this.lastPing;
        // Send a ping message.
        this.send(constants.GATEWAY_PING(latency));
    }

    /**
     * Checks if this client has initialized.
     * @param data The data received.
     * @private
     */
    private initialized(data: GatewayMessage): boolean {
        if (this.hasInitialized) return true;

        // Check if the client has initialized.
        if (!this.hasInitialized && data.type != "initialize") return false;

        // Set the initialized flag.
        this.hasInitialized = true;
        // Ping the client.
        this.ping();
        return true;
    }

    /*
     * Event handlers.
     */

    /**
     * Handles a received message.
     * @param data The data received.
     */
    handleMessage(data: string): void {
        // Check if the data is JSON.
        if (!isJson(data)) {
            // Send an error message.
            this.send(constants.INVALID_JSON());
            // Log a message to the console.
            logger.debug(`Invalid JSON received from ${this.getId()}.`);
            // Disconnect the client.
            this.disconnect();
            return;
        }

        // Parse the JSON.
        const json: GatewayMessage = JSON.parse(data);
        // Do initialization check.
        if (!this.initialized(json)) {
            // Send an error message.
            this.send(constants.GATEWAY_NOT_INITIALIZED());
            // Log a message to the console.
            logger.debug(`Client ${this.getId()} has not initialized.`);
            // Disconnect the client.
            this.disconnect();
            return;
        }
        if (json.type == "initialize") return;

        // Handle the message.
        const handler = handlers[json.type];
        if (handler) {
            handler.default(this, json);
        } else {
            // Send an error message.
            this.send(constants.GATEWAY_UNKNOWN_MESSAGE());
            // Log a message to the console.
            logger.debug(`Unknown message received from ${this.getId()}.`, json);
            // Disconnect the client.
            this.disconnect();
            return;
        }
    }

    /**
     * Handles the client disconnecting.
     */
    handleClose(): void {
        // Log a message to the console.
        logger.debug("Client disconnected.");
    }
}
