/* Imports. */
import type { Friend, User } from "app/types";

import { logger } from "app/index";
import constants from "app/constants";
import { Request, Response, Router } from "express";

import * as database from "features/database";
import { defaultObject } from "app/utils";
import { Presence } from "app/types";

/**
 * Renews a user's access token.
 * Asynchronously updates the user's access token.
 * @param user The user to renew. This object is updated.
 */
export async function renew(user: User): Promise<void> {
    // Check if the user is invalid.
    if (!user) return;

    // Check if the user is due for a refresh.
    if (Date.now() < user.expires ?? 0) return;
    // Check if the user has a refresh token.
    if (!user.refresh) return;

    // Perform OAuth2 exchange.
    const response = await fetch(constants.DISCORD_TOKEN_EXCHANGE, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            client_id: constants.DISCORD_CLIENT_ID,
            client_secret: constants.DISCORD_CLIENT_SECRET,
            refresh_token: user.refresh,
            grant_type: "refresh_token"
        })
    });

    // Get the response data.
    const data = await response.json();
    // Check if the response is valid.
    if (!data || !response.ok) return;
    if (!data.access_token) return;

    // Update the user's access token.
    user.discord = data.access_token;
    user.expires = Date.now() + (data.expires_in ?? 0) * 1000;
    user.refresh = data.refresh_token ?? user.refresh;
    user.scope = data.scope ?? user.scope;

    // Save the user.
    database.updateUser(user)
        .catch(err => logger.error(err));
}

/**
 * Gets the user's friends.
 * @param user The user.
 */
export async function getFriends(user: User | string): Promise<Friend[] | null> {
    // Check if the user is a string.
    if (typeof user == "string") {
        // Fetch the user from the database.
        user = await database.getUser(user);
    }

    // Check if the user exists.
    if (!user) return null;

    await renew(user); // Check if the user needs to refresh.

    // Fetch the user's friends.
    const response = await fetch(constants.DISCORD_RELATIONSHIPS, {
        method: "GET",
        headers: { Authorization: `${user.type} ${user.discord}` }
    });

    // Get the response data.
    const data = await response.json();
    // Check if the response is valid.
    if (!data || !response.ok) return null;

    return data as Friend[]; // Return the friends.
}

/**
 * Updates the user's presence.
 * @param user The user to update.
 * @param presence The new presence.
 */
export async function updatePresence(
    user: User | string,
    presence: Presence | null
) {
    // Check if the user is a string.
    if (typeof user == "string") {
        // Fetch the user from the database.
        user = await database.getUser(user);
        // Check if the user exists.
        if (!user) return;
    }

    if (!user) return; // Check if the user is invalid.
    await renew(user); // Check if the user needs to refresh.
    const oldPresenceToken = user.presenceToken; // Get the old presence token.

    if (presence == null) {
        // Delete the token.
        user.presenceToken = null;
        // Save the user.
        database.updateUser(user)
            .catch(err => logger.error(err));
    } else {
        // Update the presence.
        const response = await fetch(constants.DISCORD_PRESENCE, {
            method: "POST", headers: {
                Authorization: `${user.type} ${user.discord}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ activities: [presence] })
        });

        // Get the response data.
        const data = await response.json();
        // Check if the response is valid.
        if (!data || !response.ok) {
            // Check if a rate limit has been hit.
            if (response.status == 429) {
                // Retry after the rate limit.
                setTimeout(() => updatePresence(user, presence),
                    data.retry_after * 1000);
                logger.debug(`Rate limit hit while updating presence. Trying again in ${data.retry_after}s.`);
                return;
            }

            logger.warn("Invalid response from Discord's API.", data);
            return;
        }

        try {
            // Update the token.
            user.presenceToken = data.token;
            // Save the user.
            await database.updateUser(user);
        } catch (err) {
            throw err;
        }
    }

    {
        // Delete the presence.
        const response = await fetch(`${constants.DISCORD_PRESENCE}/delete`, {
            method: "POST", headers: {
                Authorization: `${user.type} ${user.discord}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token: oldPresenceToken })
        });

        // Check if a rate limit has been hit.
        if (response.status == 429) {
            const { retry_after } = await response.json();
            // Retry after the rate limit.
            setTimeout(() => updatePresence(user, presence), retry_after * 1000);
            return;
        }
    }
}

/* -------------------------------------------------- */

/**
 * Redirects the user to the configured OAuth2 URL.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function redirect(req: Request, rsp: Response): Promise<void> {
    return rsp.redirect(constants.DISCORD_OAUTH2_URL);
}

/**
 * The OAuth2 callback for Discord authentication.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function handle(req: Request, rsp: Response): Promise<void> {
    // Get URL parameters.
    const code = <string>req.query.code;

    // Check if the code is valid.
    if (!code) {
        rsp.status(400).send(constants.INVALID_TOKEN());
        return;
    }

    // Perform OAuth2 exchange.
    const response = await fetch(constants.DISCORD_TOKEN_EXCHANGE, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            client_id: constants.DISCORD_CLIENT_ID,
            client_secret: constants.DISCORD_CLIENT_SECRET,
            redirect_uri: constants.DISCORD_REDIRECT_URI,
            grant_type: "authorization_code",
            code
        })
    });

    // Get the response data.
    const data = await response.json();
    if (!data || !response.ok) {
        rsp.status(400).send(constants.INVALID_TOKEN());
        return;
    }

    // Pull data from the response.
    const { access_token, refresh_token,
        token_type, scope, expires_in } = data;
    // Get the user information.
    const userResponse = await fetch(constants.DISCORD_USER_INFO, {
        method: "GET",
        headers: {
            authorization: `${token_type} ${access_token}`
        }
    });

    // Get the user data.
    const userData = await userResponse.json();
    if (!userData || !userResponse.ok) {
        rsp.status(400).send(constants.INVALID_TOKEN());
        return;
    }

    // Pull data from the user response.
    const { id, avatar, username, discriminator } = userData;
    // Generate a new token.
    const token = await database.generateUserToken();
    // Get the avatar URL.
    const avatarUrl = getAvatarUrl(id, avatar);

    // Save the data to the database.
    const newUserData = {
        userId: id,
        username,
        discriminator,
        accessToken: token,
        avatar: avatarUrl,

        scope,
        type: token_type,
        discord: access_token,
        refresh: refresh_token,
        expires: Date.now() + (expires_in * 1000)
    };

    // Check if the user already exists.
    const user = await database.getUser(id);
    if (user == null)
        await database.saveUser(defaultObject<User>(constants.DEFAULT_USER, newUserData));
    else await database.updateUser(newUserData);

    // Handoff to the browser.
    rsp.redirect(`/handoff?code=${token}&redirectUrl=${constants.WEB_TARGET}%2Fauthorize.html`);
}

/**
 * Redirects the user to the handoff page.
 * @param req The HTTP request.
 * @param rsp The new response.
 */
async function handoff(req: Request, rsp: Response): Promise<void> {
    rsp.render("authorized"); // Display the handoff page.
}

/*
 * Utility methods.
 */

/**
 * Gets the URL for the user's avatar.
 * @param id The user's ID.
 * @param hash The user's avatar hash.
 */
function getAvatarUrl(id: string, hash: string): string {
    return `https://cdn.discordapp.com/avatars/${id}/${hash}.png`;
}

/* -------------------------------------------------- */

/* Create a router. */
const app: Router = Router();

/* Configure routes. */
app.get("/discord", redirect);
app.get("/discord/callback/", handle);
app.get("/handoff", handoff);

/* Export the router. */
export default app;
