/**
 * @file Contains the User object
 */

 /**
  * This encapsulates the data of the GitHub user
  */
export class User {
    userName: string;
    avatar_url: string;
    token: string;

    /**
     * @constructor
     * @param {string} token The user's token
     * @param {string} userName The user's name
     * @param {string} avatar_url The url to the user's profile picture
     */
    constructor(token: string, userName: string, avatarURL: string) {
        this.token = token;
        this.userName = userName;
        this.avatar_url = avatarURL;
    }

    /**
     * Creates a new User instance, identical to this one, but that doesn't contain a token.
     * This is usually used to pass the User instance to the front-end, removing the sensitive information
     * (the token)
     * @returns the new instance
     */
    public withoutToken(): User {
        return new User(null, this.userName, this.avatar_url);
    }
}
