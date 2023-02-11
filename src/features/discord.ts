/* Imports. */
import type { User } from "app/types";

import constants from "app/constants";
import { Request, Response, Router } from "express";

import * as database from "features/database";
import { defaultObject } from "app/utils";

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
    const { access_token, refresh_token, token_type, scope } = data;
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
        refresh: refresh_token,
        type: token_type,
        scope
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
