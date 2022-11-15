// This file serves as the primary database manager.
// Other functionality is split into separate files.

// Imports.
import {logger} from "app/index";
import constants from "app/constants";

import {Mongoose, Schema, connect} from "mongoose";
import {Playlist, User} from "app/types";

let database: Mongoose|null = null;

/* Connect to the database. */
connect(constants.MONGODB_URI).then(db => {
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

export const TrackSchema = new Schema({
    title: String,
    artist: String,
    icon: String,
    url: String,
    duration: Number
});
export const PlaylistSchema = new Schema({
    id: String,
    name: String,
    description: String,
    icon: String,
    isPrivate: Boolean,
    tracks: TrackSchema
});
export const UserSchema = new Schema({
    playlists: [], // List of playlist IDs.
    likedSongs: [], // List of track IDs.

    userId: String, // Discord user ID.
    scope: String, // Discord OAuth2 scopes.
    refresh: String, // Discord OAuth2 refresh token.
    type: String // Discord OAuth2 token type.
});

export let PlaylistModel = undefined;
export let UserModel = undefined;

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
export async function getPlaylist(id: string): Promise<Playlist|null> {
    return PlaylistModel.findOne({id});
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
    return UserModel.findOne({userId});
}

/**
 * Deletes the user from the database.
 * @param userId The ID of the user to delete.
 */
export async function deleteUser(userId: string): Promise<void> {
    await UserModel.deleteOne({userId});
}