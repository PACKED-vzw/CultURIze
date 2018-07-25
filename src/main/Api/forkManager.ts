/**
 * @file This file contains the ForkManager class, which will fork a repo and make it
 * even with it's original.
 * 
 * Useful resources:
 *  To understand the logic behind syncing a fork with it's original: https://stackoverflow.com/a/27762278/3232822
 */
const octokit = require("@octokit/rest")();
const GitUrlParse = require("git-url-parse");

/**
 * This class manages the forking process.
 */
export class ForkManager {
    baseOwner: string;
    currentUser: string;
    repo: string;
    branch: string;
    token: string;  

    /**
     * @constructor
     * @param {string} token The user's token
     */
    constructor(token: string) {
        this.token = token;
        octokit.authenticate({
            type: "oauth",
            token: this.token,
        });
    }

    /**
     * Forks a repository located a "repoURL" for the "currentUser".
     * The forks "branch" branch is assured to be up to date (even) with the original's 
     * @param {string} repoURL The URL of the repo to fork. This repo must not be owned by the user logged in.
     * @param {string} currentUser The name of the currently logged in user.
     * @param {string} branch The branch that must be forked/kept even.
     * @returns a Promise of a string, resolved (with the URL of the fork) on success, rejected with a error message on failure.
     */
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

    /**
     * Helper function that creates a fork.
     * @returns a Promise of a string, resolved (with the URL of the fork) on success, rejected with a error message on failure.
     */
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

    /**
     * Helper function that updates the fork with it's original
     * @returns a Promise, resolved on success, rejected with an error message on failure.
     */
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
                    this.merge(sha)
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

    /**
     * Merges a head in the base. The head is the sha hash of a commit (usually the latest commit of a fork's origin).
     * This function will try to query the github api to make the repo "this.currentUser"/"this.repo" branch "this.branch"
     * even with the commit "sha".
     * @param {string} sha 
     * @returns a Promise of a number, resolved with the status code on success, rejected with an error on failure.
     */
    private merge(sha: string): Promise<number> {
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