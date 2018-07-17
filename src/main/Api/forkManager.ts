const octokit = require('@octokit/rest')()
const GitUrlParse = require('git-url-parse')

export class ForkManager
{
    owner: string 
    repo: string 
    token: string

    constructor(token: string){
        this.token = token
        octokit.authenticate({
            type:'oauth',
            token:this.token
        })
    }

    // Forks a repo and updates it with the main branch.
    public async forkRepo(repoURL: string): Promise<string>
    {
        try{
            let parsedURL = GitUrlParse(repoURL);
            this.owner = parsedURL.owner
            this.repo = parsedURL.name
            let fork_url = await this.createFork()
            console.log('Created fork URL')
            await this.updateFork()
    
            return fork_url
        }
        catch(error)
        {
            return Promise.reject<string>(error)
        }
    }

    private createFork():Promise<string>{
        return new Promise<string>((resolve,reject) => {
            octokit.repos.fork({
                owner : this.owner,
                repo  : this.repo
            }, (error:any, result:any) => {
                console.log(result)
                if(error != null){
                    reject('Error while attempting to fork ' + this.owner + '/' + this.repo)
                }
                else{
                    resolve(result.data.svn_url)
                }
            })
        })
       
    }
    private updateFork(): Promise<void>
    {
        return new Promise<void>((resolve,reject) => {
            octokit.gitdata.getReference({
                owner : this.owner,
                repo  : this.repo,
                ref   : "heads/master"
            },(error:any, result:any) => {
                //console.log(result.data.object)
                // console.log(error)
                if(error != null){
                    console.error(error)
                    reject("Couldn't update the fork: failed to retrieve the reference to the upstream head")
                }
                else{
                    const resultobject = result.data.object
                    const sha  = resultobject.sha
                    const type = resultobject.type
                    const url  = resultobject.url
                    console.log("Successfully retrieve the reference to the upstream head")
                    console.log(`{ sha: ${sha}, type: ${type}, url: ${url} }`)
                    this.merge(sha, this.token)
                        .then((statuscode:number)=>
                        {
                            console.log('Merged successfully (' + statuscode + ')')
                            resolve()
                        })
                        .catch((error: any)=>{
                            reject(error)
                        })
                }
            })
        })    
    }

    private merge(sha:string, token:string): Promise<number>
    {
        return new Promise<number>((resolve,reject)=> {
            octokit.repos.merge({
                owner : "Pierre-vh",
                repo  : "resolver",
                base  : "master",
                head  : sha,
                commit_message : "Updating fork"
            },(error:any, result:any) => {
                if(error != null)
                {
                    console.error(error)
                    reject('Failed to update the fork: merge error')
                }
                else
                    resolve(result.status)
            })
        })
    }
}
