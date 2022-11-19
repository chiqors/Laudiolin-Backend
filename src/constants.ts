import {logger} from "./index";
import {Track, User} from "app/types";

import * as http from "node:http";
import * as https from "node:https";

/**
 * Gets the environment variable.
 * Defaults to the fallback.
 * @param selector The environment variable selector.
 * @param fallback The fallback value.
 */
function $<Type>(selector: string, fallback: Type): Type {
    return <Type> (process.env[selector] || fallback);
}

const DOMAIN = $("DOMAIN", "localhost");
const SSL_KEY = $("SSL_KEY", <string> `/etc/letsencrypt/live/${process.env["DOMAIN"]}/privkey.pem`);
const SSL_CERT = $("SSL_CERT", <string> `/etc/letsencrypt/live/${process.env["DOMAIN"]}/fullchain.pem`);

export default {
    /* The port to listen on. */
    PORT: $("PORT", 3000),
    /* The path to store files in. */
    STORAGE_PATH: $("STORAGE_PATH", `${process.cwd()}/files`),
    /* The MongoDB connection URI to use. */
    MONGODB_URI: $("MONGODB_URI", <string> "mongodb://localhost:27017/"),

    DOMAIN, /* The app domain. */
    SSL_KEY, /* SSL key path. */
    SSL_CERT, /* SSL cert path. */

    /* Spotify client ID. */
    SPOTIFY_CLIENT_ID: $("SPOTIFY_CLIENT_ID", ""),
    /* Spotify client secret. */
    SPOTIFY_CLIENT_SECRET: $("SPOTIFY_CLIENT_SECRET", ""),
    /* Spotify redirect URI. */
    SPOTIFY_REDIRECT_URI: $("SPOTIFY_REDIRECT_URI", ""),

    /* Discord client ID. */
    DISCORD_CLIENT_ID: $("DISCORD_CLIENT_ID", ""),
    /* Discord client secret. */
    DISCORD_CLIENT_SECRET: $("DISCORD_CLIENT_SECRET", ""),
    /* Discord redirect URI. */
    DISCORD_REDIRECT_URI: $("DISCORD_REDIRECT_URI", ""),
    /* Discord OAuth2 URL. */
    DISCORD_OAUTH2_URL: $("DISCORD_OAUTH2_URL", ""),

    /* Discord exchange URL. */
    DISCORD_TOKEN_EXCHANGE: "https://discord.com/api/v10/oauth2/token",
    /* Discord user info URL. */
    DISCORD_USER_INFO: "https://discord.com/api/v10/users/@me",

    /* The logger's log level. */
    LOG_LEVEL: $("LOG_LEVEL", "info"),
    /* Should the logger run in debug? */
    LOGGER_DEBUG: (<string> $("LOGGER_DEBUG", "no")) == "yes",

    /* MongoDB connection configuration. */
    MONGODB_CONFIG: {dbName: "laudiolin", autoCreate: true},

    /* The default user object. */
    DEFAULT_USER: <User> {
        playlists: [],
        likedSongs: [],
        accessToken: "",
        userId: "",
        scope: "",
        refresh: "",
        type: ""
    },

    /* A playlist track model. */
    TRACK_MODEL: <Track> {
        title: "",
        artist: "",
        icon: "",
        url: "",
        id: "",
        duration: 0
    },

    /* HTTP server bind callback. */
    BIND: () => {
        logger.info(`HTTP server listening on port ${$("PORT", 3000)}.`);
    },
    /* WebSocket server bind callback. */
    BIND_SOCKET: () => {
        logger.info(`WebSocket server listening on port ${$("SOCKET_PORT", 3001)}.`)
    },
    /* Creates an HTTP(S) server. */
    CREATE_SERVER: (port: number, handler?: any|undefined) => {
        if(port == 8443 || port == 443) {
            return https.createServer({
                key: SSL_KEY,
                cert: SSL_CERT
            }, handler);
        }

        return http.createServer(handler);
    },

    /* Gateway initial message. */
    GATEWAY_INIT: () => {
        return {type: "initialize", code: 0, message: "Welcome to Laudiolin!", timestamp: Date.now()};
    },
    GATEWAY_PING: latency => {
        return {type: "latency", code: 0, message: "", timestamp: Date.now(), latency};
    },
    INVALID_JSON: () => {
        return {type: "", code: 1, message: "Invalid JSON received.", timestamp: Date.now()};
    },
    GATEWAY_NOT_INITIALIZED: () => {
        return {type: "", code: 2, message: "Gateway not initialized.", timestamp: Date.now()};
    },
    GATEWAY_UNKNOWN_MESSAGE: () => {
        return {type: "", code: 3, message: "Invalid message received.", timestamp: Date.now()};
    },

    /* Successful. */
    SUCCESS: () => {
        return {timestamp: Date.now(), code: 200, message: "Success."};
    },
    /* No search results. */
    NO_RESULTS: () => {
        return {timestamp: Date.now(), results: [], code: 404, message: "No results were found."};
    },
    /* Invalid arguments. */
    INVALID_ARGUMENTS: () => {
        return {timestamp: Date.now(), code: 400, message: "Invalid arguments were provided."};
    },
    /* Invalid token. */
    INVALID_TOKEN: () => {
        return {timestamp: Date.now(), code: 400, message: "Invalid token provided."};
    },
    /* No authorization. */
    NO_AUTHORIZATION: () => {
        return {timestamp: Date.now(), code: 403, message: "No authorization provided."};
    }
};