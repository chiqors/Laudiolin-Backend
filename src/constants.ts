import {logger} from "./index";

export default {
    /* The port to listen on. */
    PORT: process.env["PORT"] || 3000,
    /* The path to store files in. */
    STORAGE_PATH: process.env["STORAGE_PATH"] || `${process.cwd()}/files`,
    /* The MongoDB connection URI to use. */
    MONGODB_URI: process.env["MONGODB_URI"] || "mongodb://localhost:27017/",

    /* Spotify client ID. */
    SPOTIFY_CLIENT_ID: process.env["SPOTIFY_CLIENT_ID"] || "",
    /* Spotify client secret. */
    SPOTIFY_CLIENT_SECRET: process.env["SPOTIFY_CLIENT_SECRET"] || "",
    /* Spotify redirect URI. */
    SPOTIFY_REDIRECT_URI: process.env["SPOTIFY_REDIRECT_URI"] || "",

    /* The logger's log level. */
    LOG_LEVEL: process.env["LOG_LEVEL"] || "info",
    /* Should the logger run in debug? */
    LOGGER_DEBUG: process.env["LOGGER_DEBUG"] == "yes",

    /* MongoDB connection configuration. */
    MONGODB_CONFIG: {dbName: "arikatsu", autoCreate: true},

    /* HTTP server bind callback. */
    BIND: () => {
        logger.info(`Listening on port ${process.env["PORT"] || 3000}.`);
    },

    /* No search results. */
    NO_RESULTS: () => {
        return {timestamp: Date.now(), results: [], code: 404, message: "No results were found."};
    }
};