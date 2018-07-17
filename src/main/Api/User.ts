import { resolve } from "path";

const octokit = require('@octokit/rest')()

export class User{

    userName:string

    constructor(userName: string){
        this.userName = userName
    }
    public static getUserInfo(token: string):Promise<User>{
        return new Promise<User>((resolve,reject)=> {
            octokit.users.get({}).then((result: any) =>{
               // newUser:User = get the fields here and resolve the user or tellem to fuckit
                
            })
        })
    }
}