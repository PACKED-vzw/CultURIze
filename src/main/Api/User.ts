/**
 * @file This file is tasked with retrieving the user information
 * using the GitHub API.
 */
import Octokit = require("@octokit/rest");
import log = require("electron-log");
import { User } from "../../common/Objects/UserObject";

/**
 * Uses the token to query the GitHub API to create User object
 * containing the user's relevant information, such as his username
 * and profile picture.
 * @param {string} token The access token
 * @returns a Promise of a User object, resolved on success, rejected with an error message on failure.
 */
export function getUserInfo(token: string): Promise<User> {
    const octokit = new Octokit({
        auth: `token ${token}`,
    });
    return new Promise<User>((resolve, reject) => {
        octokit.users.getAuthenticated({})
            .then((result: any) => {
                log.info("logged in user: " + result.data.login);

                const userName: string = result.data.login;
                const avatar_url: string = result.data.avatar_url;
                const newUser: User = new User(token, userName, avatar_url);
                resolve(newUser);
            })
            .catch((error: any) => {
                log.error(`Failed to retrieve user information from GitHub. ${error}`);
                reject("Failed to retrieve user information from GitHub");
            });
    });
}
