// This file also serves as the primary websocket handler.
// Other functionality is split into separate files.

/* Imports. */
import constants from "app/constants";

import { logger } from "app/index";
import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { GatewayMessage, InitializeMessage, Track } from "app/types";
import * as types from "app/types";
import * as database from "features/database";

import { isJson } from "app/utils";
import { randomUUID } from "crypto";

let hasBot: boolean = false;
const clients: { [key: string]: Client } = {};
export const users: { [key: string]: Client[] } = {};

/**
 * Handles a new websocket connection.
 * Adds listeners to events.
 * @param ws The socket connection.
 * @param incMsg The incoming message.
 */
function handleConnection(ws: WebSocket, incMsg: IncomingMessage): void {
    // Create an ID for the socket & create a client.
    ws["id"] = randomUUID().toString();
    const client = (clients[ws["id"]] = new Client(ws));

    // Add event handlers.
    ws.on("message", client.handleMessage.bind(client));
    ws.on("close", client.handleClose.bind(client));
}

/**
 * Broadcasts a message to all clients.
 * @param userId The user ID to broadcast to.
 * @param payload The payload to send.
 */
function broadcast(userId: string, payload: GatewayMessage): void {
    // Get the clients.
    const clients = users[userId];
    if (!clients) return;

    // Send the message to each client.
    for (const client of clients) {
        client.send(payload);
    }
}

/* A collection of message handlers. */
const handlers = {
    /* Gateway ping. (client) */
    latency: require("messages/latency"),
    /* Now playing. (client) */
    playing: require("messages/playing"),
    /* Update volume. (client) */
    volume: require("messages/volume"),
    /* Listen along. (client) */
    listen: require("messages/listen"),
    /* Update player state. (client) */
    "update-player": require("messages/player"),

    /* Load users. (bot) */
    "load-users": require("messages/bot/userLoad"),
    /* Update user. (bot) */
    "user-update": require("messages/bot/userState"),
};

/* Create a connection handler. */
export default function (socket: WebSocket, incMsg: IncomingMessage): void {
    // Process the connection.
    handleConnection(socket, incMsg);
}

/**
 * Tries to get a client in the gateway by the user ID.
 * @param userId The user ID to search for.
 */
export function getUserById(userId: string): Client[] | null {
    return users[userId] || null;
}

export class Client {
    private hasInitialized: boolean = false;
    private userId: string = null;
    lastPing: number = Date.now();

    /* Player information. */
    listeningTo: Track | null = null;
    paused: boolean = true;
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
     * Returns the client's login state.
     */
    isLoggedIn(): boolean {
        return this.userId != null;
    }

    /**
     * Returns the client's socket.
     */
    getHandle(): WebSocket {
        return this.socket;
    }

    /**
     * Returns the associated user.
     */
    async getUser(): Promise<types.User> {
        return await database.getUser(this.userId);
    }

    /**
     * Returns the client's ID.
     */
    getId(): string {
        return this.socket["id"];
    }

    /**
     * Returns the client's user's ID.
     */
    getUserId(): string | null {
        return this.userId;
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
     * Stops listening along with another client.
     */
    stopListeningAlong(): void {
        // Check if the client is listening along.
        if (!this.listeningWith) return;

        // Remove this client from the listening along list.
        delete this.listeningWith.listeningAlong[this.getId()];
        // Remove the listening with.
        this.listeningWith = null;
    }

    /**
     * Syncs this client with the listening with client.
     */
    syncWith(): void {
        // Check if the client is listening with someone.
        if (!this.listeningWith) return;

        // Send a sync message.
        this.send(<types.SyncMessage> {
            type: "sync",
            track: this.listeningWith.listeningTo,
            progress: this.listeningWith.progress,
            paused: this.listeningWith.paused,
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
     * Adds the track to the recently played list.
     * @param track The track to add.
     */
    async addRecentlyPlayed(track: Track): Promise<void> {
        // Get the user from the database.
        const user = await this.getUser();

        // Pull the list of recently played tracks.
        const recentlyPlayed = user.recentlyPlayed || [];
        // Check if the track is already in the list.
        const index = recentlyPlayed.findIndex(t => t.id == track.id);
        if (index != -1)
            // Remove the track from the list.
            recentlyPlayed.splice(index, 1);
        // Add the track to the start of the list.
        recentlyPlayed.unshift(track);

        // Update the user's recently played tracks.
        user.recentlyPlayed = recentlyPlayed.slice(0, 9);

        // Save the user.
        await database.updateUser(user);
        // Send the recently played list.
        broadcast(this.userId, <types.RecentsMessage> {
            type: "recents",
            recents: user.recentlyPlayed
        });
    }

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

        // Check if the message is from a bot.
        const { token } = data as InitializeMessage;
        if (!hasBot && token == constants.DISCORD_TOKEN) {
            setTimeout(async () => {
                // Set the user as the bot.
                this.userId = "bot"; hasBot = true;
                // Log a message to the console.
                logger.debug(`Client ${this.getId()} initialized as bot.`);

                // Fetch for online members.
                this.send(constants.SUCCESS({ type: "fetch" }));
            }, 1000);
        } else {
            setTimeout(async () => {
                // Attempt to find the user.
                const user = await database.getUserByToken(token);

                // Check if the user was found.
                if (user) {
                    // Set the user.
                    this.userId = user.userId;
                    // Log a message to the console.
                    logger.debug(`Client ${this.getId()} initialized as ${user.userId}.`);

                    // Update the users list.
                    if (!users[user.userId])
                        users[user.userId] = [];
                    users[user.userId].push(this);
                }
            }, 1000);
        }

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
            // noinspection TypeScriptValidateJSTypes
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
        // Remove the client from the collections.
        delete clients[this.getId()];
        if (this.userId && users[this.userId]) {
            if (users[this.userId].length < 2)
                delete users[this.userId];
            else
                users[this.userId]
                    .splice(users[this.userId]
                        .indexOf(this), 1);
        }
    }
}
