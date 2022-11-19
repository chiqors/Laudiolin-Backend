// This file serves as the primary database manager.
// Other functionality is split into separate files.

// Imports.
import {logger} from "app/index";
import constants from "app/constants";

import {Mongoose, Schema, Model, connect} from "mongoose";
import {Playlist, User} from "app/types";

import {randomString} from "app/utils";

let database: Mongoose|null = null;

/* Connect to the database. */
connect(constants.MONGODB_URI, constants.MONGODB_CONFIG).then(db => {
    database = db; // Save the database.
    logger.info("Connected to the database.");

    // Set constants.
    PlaylistModel = database.model("Playlist", PlaylistSchema);
    UserModel = database.model("User", UserSchema);

    // Create collections.
    PlaylistModel.createCollection().then(() => {
        logger.debug("Created the playlist collection.");
    });
    UserModel.createCollection().then(() => {
        logger.debug("Created the user collection.");
    });
}).catch(console.error);

export const PlaylistSchema = new Schema({
    owner: String,
    id: String,
    name: String,
    description: String,
    icon: String,
    isPrivate: Boolean,
    tracks: Array
});
export const UserSchema = new Schema({
    playlists: Array, // List of playlist IDs.
    likedSongs: Array, // List of track IDs.

    accessToken: String, // The user's client access token.

    userId: String, // Discord user ID.
    scope: String, // Discord OAuth2 scopes.
    refresh: String, // Discord OAuth2 refresh token.
    type: String // Discord OAuth2 token type.
});

export let PlaylistModel: Model<any> = undefined;
export let UserModel: Model<any> = undefined;

/*
 * Database methods.
 */

/**
 * Saves the playlist to the database.
 * @param playlist The playlist to save.
 */
export async function savePlaylist(playlist: Playlist): Promise<void> {
    await PlaylistModel.create(playlist);
}

/**
 * Retrieves the playlist from the database.
 * @param id The ID of the playlist to retrieve.
 */
export async function getPlaylist(id: string): Promise<Playlist | null> {
    const result = PlaylistModel.findOne({ id });
    const playlist = await result.exec();
    return playlist ? playlist.toObject() : null;
}

/**
 * Updates the playlist in the database.
 * @param playlist The playlist to update.
 */
export async function updatePlaylist(playlist: Playlist): Promise<void> {
    await PlaylistModel.updateOne({ id: playlist.id }, playlist);
}

/**
 * Deletes the playlist from the database.
 * @param id The ID of the playlist to delete.
 */
export async function deletePlaylist(id: string): Promise<void> {
    await PlaylistModel.deleteOne({id});
}

/**
 * Saves the user to the database.
 * @param user The user to save.
 */
export async function saveUser(user: User): Promise<void> {
    await UserModel.create(user);
}

/**
 * Retrieves the user from the database.
 * @param userId The ID of the user to retrieve.
 */
export async function getUser(userId: string): Promise<User|null> {
    const result = UserModel.findOne({ userId });
    const user = await result.exec();
    return user ? user.toObject() : null;
}

/**
 * Attempts to update the user's data.
 * @param user The user data to update.
 */
export async function updateUser(user: User): Promise<void> {
    await UserModel.updateOne({ userId: user.userId }, user).exec();
}

/**
 * Deletes the user from the database.
 * @param userId The ID of the user to delete.
 */
export async function deleteUser(userId: string): Promise<void> {
    await UserModel.deleteOne({userId});
}

/*
 * Utility methods.
 */

/**
 * Gets a user from the database.
 * @param token The user's access token.
 * @return The user, or null if not found.
 */
export async function getUserByToken(token: string): Promise<User|null> {
    const result = UserModel.findOne({ accessToken: token });
    const user = await result.exec();
    return user ? user.toObject() : null;
}

/**
 * Generates a random 32 character string.
 * This string cannot overlap with any other tokens.
 * @param userId The user's ID.
 * @return The generated token.
 */
export async function generateUserToken(userId: string | null = null): Promise<string> {
    let found = false, token = "";
    while (!found) {
        // Generate a random token.
        token = randomString(32);
        // Check if the token is already in use.
        const user = await getUserByToken(token);
        if (!user) found = true;
    }

    // Save the token.
    if (userId) await UserModel.updateOne({ userId },
        { accessToken: token }).exec();

    return token;
}

/**
 * Generates a random 24 character string.
 * This string cannot overlap with any other IDs.
 * @return The random string.
 */
export async function generatePlaylistId(): Promise<string> {
    let found = false, id = "";
    while (!found) {
        // Generate a random string.
        id = randomString(24);
        // Check if the ID exists.
        const playlist = await getPlaylist(id);
        if (!playlist) found = true;
    }

    return id;
}