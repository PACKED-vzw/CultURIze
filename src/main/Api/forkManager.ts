import { resolve } from "dns";

const octokit = require('@octokit/rest')()

export class ForkManager {
    constructor(repoURL:string,token:string){
        this.authenticate(token)
        this.repoURL = repoURL
    }
    repoURL:string

    public async forkRepo():Promise<string>{
        try{
            var result = ""
            //parse URL here
            const fork_url:string = await this.createFork("dummy", "dummy","token")
            await this.updateFork("dummy", "dummy", "token")
    
            return result
        }
        catch(error)
        {
            console.error(error)
        }
    }
    private authenticate(token: string) :void {
        octokit.authenticate({
            type: "oauth",
            token: token
        })
    }
    private createFork(owner: string, repo: string, token:string):Promise<string>{
        return new Promise<string>((resolve,reject)=> octokit.repos.fork({
            owner : "oSoc18",
            repo  : "resolver"
        }, (error:any, result:any) => {
            if(error != null){
                console.log("could not create a fork: "+ error)
                reject(error)
            }
            else{
                console.log(result)
                console.log("A fork was succesfully created")
                resolve(result.data.url)
            }
         }))
       
    }
    private updateFork(owner:string, repo:string, token:string):Promise<void>{
        return new Promise<void>((resolve,reject)=> {
            octokit.gitdata.getReference({
                owner : "oSoc18",
                repo  : "resolver",
                ref   : "heads/master"
            },(error:any, result:any) => {
                //console.log(result.data.object)
                // console.log(error)
                if(error != null){
                    console.log("could not get the reference to the upstream head")
                    console.log(error)
                    reject(error)
                }
                else{
                    const resultobject = result.data.object
                    const sha = resultobject.sha
                    const type = resultobject.type
                    const url = resultobject.url
                    console.log("sha: "+ sha)
                    console.log("type: "+ type)
                    console.log("url: " + url)
                    console.log("succesfully got the reference to upstream head")
                    const statuscode = this.merge("dummy", "dummy", sha, token)
                    .then((statuscode:number)=>
                    {
                        console.log("ksldfjqlsisefjsqiljqlskejqlejfmama")
                        switch (statuscode)
                        {
                            case 202:
                                console.log("merge accepted")
                                break;
                            default: 
                                console.log(statuscode);
                        }
                        resolve()
                    })
                    .catch((err:any)=>{
                        console.log("qlksdjflqsjflmsfpapa")
                        console.error(error)
                        reject(error)
                    })
                }
            })
        })    
    }
    private merge(owner:string, repo:string, sha:string, token:string): Promise<number>{
        return new Promise<number>((resolve,reject)=> {
            octokit.repos.merge({
                owner : "BertSchoovaerts",
                repo  : "resolver",
                base  : "master",
                head  : sha,
                commit_message : "nieuwe update test"
            },(error:any, result:any) => {
                console.log("hakuna mata matafaka")
                console.log(error)
                if(error != null)
                    reject(error)
                else
                    resolve(result.status)
                        
            })
        })
    }
}
