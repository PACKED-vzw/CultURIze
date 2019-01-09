/**
 * @file This file is reponsible for interacting with the Git command line tool.
 */
import { app } from "electron";
import fs = require("fs");
const GitUrlParse = require("git-url-parse");
const shellJs = require("shelljs");
const simpleGit = require("simple-git");
const path = require("path")

/**
 * This class is responsible for managing a local copy of a
 * GitHub repository.
 * It provides the following functionality:
 *
 *      Updating a local copy: This will clone or reset+pull the repo
 *
 *      Pushing: This will add/commit/push to the repo.
 *
 * Note that the current user must have write access to the repo you're
 * trying to manage!
 */
export class GitRepoManager {
    repoURL: string;
    workingDir: string;
    repoName: string;
    ownerName: string;
    repoDir: string;
    token: string;
    branch: string;

    /**
     * @constructor
     * @param {string} repoURL The URL of the repo that's going to be cloned.
     * @param {string} branch  The branch of the repo that should be checked out/pushed to
     * @param {string} token   The token
     * @param {string} workingDir (optional) The working directory where we'll operate
     * If "workingDir" is not provided, the default directory will be localed in %appdata%/(application name)/repo/
     */
    constructor(repoURL: string, branch: string, token: string, workingDir: string = "") {
        this.repoURL = repoURL;
        this.token = token;
        this.branch = branch;

        // Default to "userData" folder if no working dir is provided.
        if (workingDir == "") {
            this.workingDir = app.getPath("userData") + "/repo";
        } else {
            this.workingDir = workingDir;
        }

        // Parse the URL to retrieve the repoName & username
        const parsedURL = GitUrlParse(this.repoURL);
        this.repoName = parsedURL.name;
        this.ownerName = parsedURL.owner;
        this.repoDir = path.join(this.workingDir, this.repoName);

        // If it doesn't exists, create the working directory.
        this.createFoldersIfNeeded(this.workingDir);
    }

    /**
     * This function will done one of 2 things:
     *
     * If we already have a local copy of the repo, it'll
     * do "git checkout (this.branch)" + "git reset --hard" + "git pull"
     *
     * Else, it'll clone the repo and checkout the correct branch.
     * @returns A Promise, which is resolved once the operation is completed, rejected (with an error message) on error.
     */
    public updateLocalCopy(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.hasRepo()
            .then((result) => {
                // The user has a local copy
                if (result) {
                    console.log("Local copy detected, pulling changes");
                    // TODO if the git repository is empty and does not have an initial commit then this does not work.
                    // we get a crash with user message "Preparing GIT" which is not helpfull at all for an enduser.
                    // this error is due to their not being a master until we make the initial commit.
                    simpleGit(this.repoDir)
                    .checkout(this.branch)
                        .reset([ "--hard" ], (err:any) => {
                            if(err)
                                reject("Failed to reset local copy of the repo.");
                        }).pull((err: any) => {
                            if (err == null) {
                                console.log("Pull successful");
                                resolve();
                            } else {
                                console.error(err);
                                reject("Error while pulling");
                            }
                        });
                } else {
                    // We don't have a local copy, clone.
                    console.log("No local copy detected - Cloning");
                    simpleGit(this.workingDir)
                    .clone(this.repoURL, undefined, (err: any) => {
                        if (err == null) {
                            console.log("Cloning success");
                            console.log(this.repoDir);
                            simpleGit(this.repoDir).checkout(this.branch,(err:any) => {
                                if(err == null)
                                {
                                    console.log("Checkout Success");
                                    resolve();
                                }
                                else
                                {
                                    console.error("Failed to checkout branch");
                                    console.error(err);
                                    reject();
                                }
                            });
                        } else {
                            console.error(err);
                            reject('Failed to clone "' + this.repoURL + '"');
                        }
                    });
                }
            })
            .catch((error) => {
                console.error(error);
                reject('Error while attempting to determine if "' + this.repoDir + '" is a repository');
            });
        });
    }

    /**
     * Save the "fileContent" string in a file called "fileName"
     * in a directory of the repo"subDir".
     *
     * If the file already exists, it'll be deleted.
     *
     * @param {string} fileContent The string to be written to the file
     * @param {string} fileName    The name of the file
     * @param {string} subDir      The subdirectory of the repo where the file will be saved (will be created if needed)
     */
    public saveStringToFile(fileContent: string, fileName: string, subDir: string = "") {
        const outFolderPath = this.repoDir + "/" + subDir;
        const outFilePath = outFolderPath + "/" +  fileName;
        this.createFoldersIfNeeded(outFolderPath);
        fs.writeFileSync(outFilePath, fileContent);
    }

    /**
     * Runs "git add *", "git commit -m (commitMessage)" and "git push (url) (branch".
     * This will push every local change to the remote.
     * @param commitMessage The message of the commit that'll be created.
     * @returns A Promise, which is resolved on success, rejected (with an error message) on error.
     */
    public pushChanges(commitMessage: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const url = this.makeGitHTTPSUrl();
            try{
                simpleGit(this.repoDir)
                .add("./*")
                .commit(commitMessage)
                .push(url, this.branch, (err: any) => {
                    if (err != null) {
                        console.error(err);
                        reject("Failed to push changes");
                    } else {
                        resolve();
                    }
                });
            }
            catch(err)
            {
                console.error(err);
                reject("Failed to push changes");
            }
        });
    }

    /**
     * Utility function that'll generate a git https url, used to authenticate with the CLI git tool.
     *
     * The url has the following form: https:://username:token@github.com/owner/repo.git
     *
     * @returns the generated URL
     */
    private makeGitHTTPSUrl() {
        return `https://${this.ownerName}:${this.token}@github.com/${this.ownerName}/${this.repoName}.git`;
    }

    /**
     * Checks if "repoDir" contains a repo. This will check using 1 of 2 ways:
     *
     * 1st = Check if the "repoDir" folder exists. If it doesn't exists, resolve(false) is called. (= repo doesn't exist)
     *
     * 2nd = If "repoDir" exists, use "simpleGit.hasRepo" to check if it contains a valid GitHub repository.
     *
     * @returns a Promise, resolved with a boolean value (true = repo exists, false otherwise) on success,
     * rejected (with an error message) on error.
     */
    private hasRepo(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (!fs.existsSync(this.repoDir)) {
                console.log('"' + this.repoDir + '" does not contain a repository');
                resolve(false);
            } else {
                simpleGit(this.repoDir).checkIsRepo((error: Error, result: boolean) => {
                    if (error) {
                        console.error(error);
                        reject('Error while checking if "' + this.repoDir + '" is a repository');
                    } else {
                        if (result) {
                            console.log('"' + this.repoDir + '" is a repository');
                        } else {
                            console.log('"' + this.repoDir + '" does not contain a repository');
                        }
                        resolve(result);
                    }
                });
            }
        });
    }

    /**
     * Utility function that creates one or more subdirectory if they do not exist.
     * @param {string} filepath The folder path that must be created
     */
    private createFoldersIfNeeded(filepath: string) {
        if (!fs.existsSync(filepath)) {
            shellJs.mkdir("-p", filepath);
        }
    }

}
