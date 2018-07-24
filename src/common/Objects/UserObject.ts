// This class contains the User object, to be used
// by the renderer process and the main process.
export class User {
    userName: string;
    avatar_url: string;
    token: string;

    constructor(token: string, userName: string, avatar_url: string){
        this.token = token;
        this.userName = userName;
        this.avatar_url = avatar_url;
    }

    public withoutToken() : User {
        return new User(null, this.userName, this.avatar_url);
    }
}