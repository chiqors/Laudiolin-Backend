// All types in this file should be appropriately named.
// If needed, use /** */ to write extra information about the type.
// Else, try not to bloat the types file.

/**
 * @param icon The URL to the icon of the track.
 * @param duration The duration of the track in milliseconds.
 */
export type Track = {
    title: string;
    artist: string;
    icon: string;
    url: string;
    id: string;
    duration: number;
};
/**
 * @param icon The URL to the icon of the playlist.
 */
export type Playlist = {
    owner: string;
    id: string;
    name: string;
    description: string;
    icon: string;
    isPrivate: boolean;
    tracks: Track[];
};

export type SocialStatus = "Nobody" | "Friends" | "Everyone";

/*
 * User/Authentication.
 */

export type BasicUser = {
    username?: string;
    discriminator?: string;
    userId?: string;
    avatar?: string;
};

export type OnlineUser = BasicUser & {
    socialStatus: SocialStatus;
    listeningTo?: Track;
    progress?: number;
};

export type OfflineUser = BasicUser & {
    socialStatus: SocialStatus;
    lastSeen: number;
    lastListeningTo: Track;
};

/**
 * @param accessToken The user's client access token.
 * @param refresh The user's refresh token.
 * @param scope Any OAuth2 scopes.
 * @param type The authentication token type.
 */
export type User = BasicUser & {
    playlists?: string[];
    likedSongs?: Track[];
    recentlyPlayed?: Track[];

    accessToken?: string;
    authCode?: string;
    codeExpires?: string;

    scope?: string;
    refresh?: string;
    type?: string;
};

/*
 * Search.
 */

export type SearchEngine = "YouTube" | "Spotify" | "SoundCloud" | "All";
export type SearchResult = Track & {
    id?: string;
};
export type SearchResults = {
    top: SearchResult;
    results: SearchResult[];
};

/*
 * Gateway.
 */

// From client.
export type InitializeMessage = BaseGatewayMessage & {
    type: "initialize";
    token?: string;
    broadcast?: SocialStatus;
};
// From client.
export type LatencyMessage = BaseGatewayMessage & {
    type: "latency";
};
// From client.
export type NowPlayingMessage = BaseGatewayMessage & {
    type: "playing";
    track: Track | null;
    seek: number;
    sync?: boolean;
    paused?: boolean;
    seeked?: boolean;
};
/**
 * From client.
 * @param with The user ID of the person to listen along with. Can be null to stop.
 */
export type ListenMessage = BaseGatewayMessage & {
    type: "listen";
    with: string;
}

// To & from client.
export type VolumeMessage = BaseGatewayMessage & {
    type: "volume";
    volume: number;
    send_back: boolean;
};
/**
 * To & from client.
 * @param listen true = listening to client; false = client listening with
 * @param totalClients The number of clients listening with the server.
 */
export type ListeningMessage = BaseGatewayMessage & {
    type: "listening";
    listen: boolean;
    totalClients: number;
};

// To client.
export type SyncMessage = BaseGatewayMessage & {
    type: "sync";
    track: Track | null;
    progress: number;
    paused: boolean;
    seek: boolean;
};
// To client.
export type RecentsMessage = BaseGatewayMessage & {
    type: "recents";
    recents: Track[];
};

// From Discord bot.
export type DiscordLoadUsersMessage = BaseGatewayMessage & {
    type: "load-users";
    users: BasicUser[];
}
// From Discord bot.
export type DiscordUserUpdateMessage = BaseGatewayMessage & {
    type: "user-update";
    user: BasicUser;
    state: "online" | "offline";
};

export type BaseGatewayMessage = {
    type: string;
    timestamp: number;
};
export type GatewayMessage = BaseGatewayMessage | InitializeMessage | LatencyMessage;
