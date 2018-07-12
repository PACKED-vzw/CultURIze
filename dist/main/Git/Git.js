"use strict";
// This file is reponsible for the interaction with Git, the command-line tool,
// through a npm package. 
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const GitUrlParse = require('git-url-parse');
const fs = require('fs');
const simpleGit = require('simple-git');
// This class is responsible to manage
// the local clone of a git repo
class GitRepoManager {
    constructor(repoURL, token, workingDir = '') {
        this.repoURL = repoURL;
        this.token = token;
        if (workingDir == '')
            this.workingDir = electron_1.app.getPath('userData') + '\\repo';
        else
            this.workingDir = workingDir;
        // RepoName
        let parsedURL = GitUrlParse(this.repoURL);
        this.repoName = parsedURL.name;
        this.ownerName = parsedURL.owner;
        this.repoDir = this.workingDir + '\\' + this.repoName;
        // Check if the directory exists, else we'll need to create it
        if (!fs.existsSync(this.workingDir)) {
            fs.mkdirSync(this.workingDir);
            console.log(this.workingDir + ' does not exists ');
        }
        else
            console.log(this.workingDir + ' exists');
        console.log('Initialization complete');
        console.log(this);
    }
    // This will clone the repo if we don't have a local copy yet
    // or will run a pull if we have a local copy.
    // The callback is called once the operation is completed.
    updateLocalCopy(callback) {
        this.hasRepo()
            .then((result) => {
            if (result) {
                // We got a local copy, pull
                console.log('Local copy detected, trying to pull');
                simpleGit(this.repoDir).pull((err) => {
                    if (!err)
                        console.log('Pulled successfuly');
                    else
                        console.log('Error while pulling');
                    callback();
                });
            }
            else {
                // We don't have a local copy, clone.
                console.log('Local copy not detected, cloning');
                simpleGit(this.workingDir).clone(this.repoURL, undefined, () => {
                    console.log('Cloning complete');
                    callback();
                });
            }
        })
            .catch((error) => {
            console.error('Error while trying to determine if we have a local copy of the repo');
            console.error(error);
            callback();
        });
    }
    makeGitHTTPSUrl() {
        return `https://${this.ownerName}:${this.token}@github.com/${this.ownerName}/${this.repoName}.git`;
    }
    // This will call git push to push all the changes to the git repo
    // This works
    pushChanges(commitMessage, branch = 'master', callback) {
        let url = this.makeGitHTTPSUrl();
        simpleGit(this.repoDir)
            .add('./*')
            .commit(commitMessage)
            .push(url, branch, callback());
    }
    // Will return true if the current workingDir contains a repo,
    // false if not.
    // The promise is rejected on error.
    hasRepo() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.repoDir))
                resolve(false);
            else {
                simpleGit(this.repoDir).checkIsRepo((error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                });
            }
        });
    }
}
exports.GitRepoManager = GitRepoManager;
