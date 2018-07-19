// This file is tasked with retrieving the personal
// informations of the current logged-in user, like his
// username, profile picture,etc and filling a "User" object
// with this information.
const octokit = require('@octokit/rest')()
import { User } from "../../common/Objects/UserObject"

// Promises to return the User object once the data
// is available.
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
            console.log(error)
            reject("Failed to retrieve user information from GitHub")
        })
    })
}