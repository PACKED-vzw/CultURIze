import { resolve } from "path";
import { Url } from "url";

const octokit = require('@octokit/rest')()

export class User{

    userName: string
    avatar_url: string

    constructor(userName: string, avatar_url: string){
        this.userName = userName
        this.avatar_url = avatar_url

    }

    public static getUserInfo(token: string): Promise<User>{
        octokit.authenticate({
            type: "oauth",
            token: token
        })
        return new Promise<User>((resolve,reject)=> {
            octokit.users.get({})
            .then((result: any) =>{
               const userName:string = result.data.login
               const avatar_url:string = result.data.avatar_url
               var newUser: User = new User(userName, avatar_url)
               resolve(newUser)
            })
            .catch((error: any) => {
                console.log("error getting UserInfo: ")
                console.log(error)
                reject("failed to retrieve user info")
            })
        })
    }
}