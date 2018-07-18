const octokit = require("@octokit/rest")();
const GitUrlParse = require("git-url-parse");

export class ForkManager {
    baseOwner: string   // The owner of the original repo
    currentUser: string // The username of the current user
    repo: string        // The name of the repo
    branch: string
    token: string      

    constructor(token: string) {
        this.token = token;
        octokit.authenticate({
            type: "oauth",
            token: this.token,
        });
    }

    // Forks a repo and updates it with the main branch.
    public async forkRepo(repoURL: string, currentUser: string, branch: string): Promise<string> {
        this.currentUser = currentUser;
        this.branch = branch;
        try {
            const parsedURL = GitUrlParse(repoURL);
            this.baseOwner = parsedURL.owner;
            this.repo = parsedURL.name;

            const fork_url = await this.createFork();
            console.log('Fork created/found at "' + fork_url + '"')

            console.log('Attempting to update fork')
            await this.updateFork();
            console.log('Done')
            return fork_url;
        } catch (error) {
            return Promise.reject<string>(error);
        }
    }

    // Creates the fork
    private createFork(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            octokit.repos.fork({
                owner : this.baseOwner,
                repo  : this.repo,
            }, (error: any, result: any) => {
                // console.log(result)
                if (error != null) {
                    reject("Error while attempting to fork " + this.baseOwner + "/" + this.repo);
                } else {
                    resolve(result.data.svn_url);
                }
            });
        });

    }
    private updateFork(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            octokit.gitdata.getReference({
                owner : this.baseOwner,
                repo  : this.repo,
                ref   : "heads/" + this.branch,
            }, (refError: any, result: any) => {
                // console.log(result.data.object)
                // console.log(error)
                if (refError != null) {
                    console.error(refError);
                    reject("Couldn't update the fork: failed to retrieve the reference to the upstream head");
                } else {
                    const resultobject = result.data.object;
                    const sha  = resultobject.sha;
                    const type = resultobject.type;
                    const url  = resultobject.url;
                    console.log("Successfully retrieved the reference to the upstream head, attempting merge operation");
                    console.log(`{ sha: ${sha}, type: ${type}, url: ${url} }`);
                    this.merge(sha, this.token)
                        .then((statuscode: number) => {
                            console.log("Merged successfully (" + statuscode + ")");
                            resolve();
                        })
                        .catch((mergeError: any) => {
                            console.log('Merge error');
                            console.error(mergeError);
                            reject(mergeError);
                        });
                }
            });
        });
    }

    private merge(sha: string, token: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            octokit.repos.merge({
                owner : this.currentUser,
                repo  : this.repo,
                base  : this.branch,
                head  : sha,
                commit_message : "Updating fork",
            }, (error: any, result: any) => {
                if (error != null) {
                    console.error(error);
                    reject("Failed to update the fork: merge error");
                } else {
                    resolve(result.status);
                }
            });
        });
    }
}
