// This file serves as the primary database manager.
// Other functionality is split into separate files.

// Imports.
import {logger} from "app/index";
import constants from "app/constants";

import {Mongoose, Schema, connect} from "mongoose";
import {Playlist} from "app/types";

let database: Mongoose|null = null;

/* Connect to the database. */
connect(constants.MONGODB_URI).then(db => {
    database = db; // Save the database.
    logger.info("Connected to the database.");

    // Set constants.
    TrackModel = database.model("Track", TrackSchema);
    PlaylistModel = database.model("Playlist", PlaylistSchema);
}).catch(logger.error);

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
export let TrackModel = undefined;
export let PlaylistModel = undefined;

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