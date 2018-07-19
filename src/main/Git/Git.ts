// This file is reponsible for the interaction with Git, the command-line tool.
// simpleGit is used to make the interaction with Git easier.

// Bug description :
/*
    -> Directory is not created even tho it doesn't exists

    Error: Cannot use simple-git on a directory that does not exist.
    at module.exports (C:\Users\pierre.vanhoutryve\Desktop\Resolver\serious\resolver\node_modules\simple-git\src\index.js:11:15)
    at new GitRepoManager (C:\Users\pierre.vanhoutryve\Desktop\Resolver\serious\resolver\dist\main\Git\Git.js:33:20)
    at Promise (C:\Users\pierre.vanhoutryve\Desktop\Resolver\serious\resolver\dist\main\Publishing\Publishing.js:101:21)
    at new Promise (<anonymous>)
    at prepareGitRepoManager (C:\Users\pierre.vanhoutryve\Desktop\Resolver\serious\resolver\dist\main\Publishing\Publishing.js:100:12)
    at Object.<anonymous> (C:\Users\pierre.vanhoutryve\Desktop\Resolver\serious\resolver\dist\main\Publishing\Publishing.js:67:35)
    at Generator.next (<anonymous>)
    at fulfilled (C:\Users\pierre.vanhoutryve\Desktop\Resolver\serious\resolver\dist\main\Publishing\Publishing.js:11:58)
    at <anonymous>
    at process._tickCallback (internal/process/next_tick.js:188:7)
*/

import { app } from "electron";
import fs = require("fs");
const GitUrlParse = require("git-url-parse");
const shellJs = require("shelljs");
const simpleGit = require("simple-git");

// This class is responsible to manage
// the local clone of a git repo owned
// by the current user.
export class GitRepoManager {
    repoURL: string
    workingDir: string
    repoName: string
    ownerName: string
    repoDir: string
    token: string
    branch: string;
    git: any;

    constructor(repoURL: string, branch: string, token: string, workingDir: string = "") {
        this.repoURL = repoURL;
        this.token = token;
        this.branch = branch;

        if (workingDir == "") {
            this.workingDir = app.getPath("userData") + "\\repo";
        } else {
            this.workingDir = workingDir;
        }
        const parsedURL = GitUrlParse(this.repoURL);
        this.repoName = parsedURL.name;
        this.ownerName = parsedURL.owner;
        this.repoDir = this.workingDir + "\\" + this.repoName;

        this.createFoldersIfNeeded(this.workingDir);

        // Setup git instance
        this.git = simpleGit(this.repoDir)
        console.log('GitRepoManager Initialisation complete.')
        console.log(this)
    }

    // This will clone the repo if we don't have a local copy yet
    // or will run a pull if we have a local copy.
    // The callback is called once the operation is completed.
    public updateLocalCopy(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.hasRepo()
            .then((result) => {
                if (result) {
                    console.log("Local copy detected, pulling changes");
                    // Note, if we start to allow different branches,
                    // we'll need to pull/checkout the correct branch
                    // through simpleGit
                    // TODO: Add checkouts
                    this.git.checkout(this.branch).pull((err: any) => {
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
                    this.git.clone(this.repoURL, undefined, (err: any) => {
                        if (err == null) {
                            console.log("Cloning success");
                            resolve();
                        } else {
                            console.error(err);
                            reject('Failed to clone "' + this.repoURL + '"');
                        }
                    }).checkout(this.branch); // Checkout to the correct branch
                }
            })
            .catch((error) => {
                console.error(error);
                reject('Error while attempting to determine if "' + this.repoDir + '" is a repository');
            });
        });
    }

    // Save the content of a string (often the .htaccess file)
    // to a subdir in the repo. This will overwrite the file if it already
    // exists.
    public saveStringToFile(fileContent: string, fileName: string, subDir: string = "") {
        const outFolderPath = this.repoDir + "/" + subDir;
        const outFilePath = outFolderPath + "/" +  fileName;
        this.createFoldersIfNeeded(outFolderPath);
        fs.writeFileSync(outFilePath, fileContent);
    }

    // This will call Git Commit/Push to send every change to the remote.
    public pushChanges(commitMessage: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const url = this.makeGitHTTPSUrl();
            try{
                this.git
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
                console.log('OOF')
                console.error(err)
            }
        });
    }

    // Creates the https url of the repo for git to use.
    private makeGitHTTPSUrl() {
        return `https://${this.ownerName}:${this.token}@github.com/${this.ownerName}/${this.repoName}.git`;
    }

    // Will return true if the current workingDir contains a repo,
    // false if not.
    // The promise is rejected on error.
    private hasRepo(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (!fs.existsSync(this.repoDir)) {
                console.log('"' + this.repoDir + '" does not contain a repository');
                resolve(false);
            } else {
                this.git.checkIsRepo((error: Error, result: boolean) => {
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

    // Creates one or more folder if they don't exist
    private createFoldersIfNeeded(filepath: string) {
        if (!fs.existsSync(filepath)) {
            shellJs.mkdir("-p", filepath);
        }
    }

}

