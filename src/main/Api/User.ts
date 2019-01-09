/**
 * @file This file is tasked with retrieving the user information
 * using the GitHub API.
 */
const octokit = require('@octokit/rest')()
import { User } from "../../common/Objects/UserObject"
const log = require('electron-log');

/**
 * Uses the token to query the GitHub API to create User object
 * containing the user's relevant information, such as his username
 * and profile picture.
 * @param {string} token The access token
 * @returns a Promise of a User object, resolved on success, rejected with an error message on failure.
 */
export function getUserInfo(token: string): Promise<User>{
    octokit.authenticate({
        type: "oauth",
        token: token
    })
    return new Promise<User>((resolve,reject)=> {
        octokit.users.get({})
        .then((result: any) =>{
           const userName: string = result.data.login
           const avatar_url: string = result.data.avatar_url
           let newUser: User = new User(token, userName, avatar_url)
           resolve(newUser)
        })
        .catch((error: any) => {
            log.error(`Failed to retrieve user information from GitHub. ${error}`)
            reject("Failed to retrieve user information from GitHub")
        })
    })
}
