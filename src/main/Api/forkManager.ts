const octokit = require('@octokit/rest')()

export class ForkManager {
    constructor(repoURL:string,token:string){
        this.authenticate(token)
        this.repoURL = repoURL
    }
    repoURL:string

    public forkRepo():string{
        var result = ""
        //parse URL here
        this.createFork("dummy", "dummy"," token")

        return result
    }
    private authenticate(token: string) :void {
        octokit.authenticate({
            type: "oauth",
            token: token
        })
    }
    private createFork(owner: string, repo: string, token:string){
        octokit.repos.fork({
            owner : "oSoc18",
            repo  : "resolver"
        }, (error:any, result:any) => {
            console.log(result)
            console.log("error: " + error)
            })
        }
        private updateFork(owner:string, repo:string, token:string){
            octokit.gitdata.getReference({
                owner : "oSoc18",
                repo  : "resolver",
                ref   : "heads/master"
            },(error:any, result:any) => {
                //console.log(result.data.object)
               // console.log(error)
               
                const resultobject = result.data.object
                const sha = resultobject.sha
                const type = resultobject.type
                const url = resultobject.url
                console.log("sha: "+ sha)
                console.log("type: "+ type)
                console.log("url: " + url)
                //this.merge("dummy", "dummy", sha, token)
                
        
            })
        }
        private merge(owner:string, repo:string, sha:string, token:string):void{
            octokit.repos.merge({
                owner : "BertSchoovaerts",
                repo  : "resolver",
                base  : "master",
                head  : sha,
                commit_message : "testerdefloepswoeps"
            },(error:any, result:any) => {
                console.log(result)
                console.log(error)
            })
        }
}
