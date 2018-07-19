// This file is responsible for orchestrating
// the whole 'publishing' process.
// Explanation
/*
    0.  'request-publishing' IPC Event is fired, and caught in the main.
         The function that handles this event then calls 'publish' below.
*/

import { PublishRequest, PublishRequestResult } from "./../../common/Objects/PublishObjects";
import { mainWindow } from "./../../main";
import { ForkManager } from "./../Api/ForkManager";
import { convertCSVtoHTACCESS } from "./../Converter/Converter";
import { GitRepoManager } from "./../Git/Git";
import fs = require('fs');
const isGithubUrl = require("is-github-url");
const octokit = require("@octokit/rest")();
const GitUrlParse = require("git-url-parse");

// Handle a publishing request
export async function publish(request: PublishRequest) {
    try {
        console.log('Request Data: ' + JSON.stringify(request))
        // Check the request for incorrect input
        console.log("Checking Request for incorrect input");
        await checkRequestInput(request);

        // Get user
        const user = request.user;
        
        // Parse the url
        console.log("Parsing URL");
        const parsedURL = GitUrlParse(request.repoUrl);
        const destOwner = parsedURL.owner;
        const destName = parsedURL.name;
        const prettyName = destOwner + "/" + destName;

        let isOwnerOfRepo = (destOwner === user.userName)

        // Convert the file before doing anything with the GitHub api,
        // so if this steps fail, we can stop the process without
        // touching the remote repos.
        let content = await convertCSVtoHTACCESS(request.csvPath);

        // The URL of the repo that we're going to clone/manage.
        let repoURL : string

        // Here, depending on if the user's the owner of the repo he wants
        // to send the .htaccess to, we'll either do a direct push to his repo
        // or fork the repo so we can make a pull request later.
        if(isOwnerOfRepo)
        {
            // If the current user owns the repo, no forking will be required
            console.log(user.userName + ' owns ' + request.repoUrl + ', no forking required')
            repoURL = request.repoUrl
        }
        else 
        {
            // If the current user doesn't own the repo, we have to fork it
            console.log("Attempting to fork " + prettyName);

            const forks = new ForkManager(user.token);
            repoURL = await forks.forkRepo(request.repoUrl, user.userName, request.branch);
            
            console.log("Successfully forked " + prettyName + ' at "' + repoURL + '"');
        }

        // Prepare the repoManager
        console.log("Preparing GitRepoManager instance");
        const manager = await prepareGitRepoManager(repoURL, request.branch, user.token);

        // Save the file
        console.log("Saving the .htaccess to the desired location");
        manager.saveStringToFile(content, ".htaccess", request.subdir);

        // Push the changes
        console.log("Pushing changes");
        await manager.pushChanges(request.commitMsg);

        // Make the pull request if we don't own the repo
        if(!isOwnerOfRepo)
        {
            console.log("Creating pull request");
            await createPullRequest(user.token, destOwner, destName, user.userName, request.branch,
                () => request.prTitle, () => request.prBody);
        }
        else 
            console.log("The current owner owns the repo, no Pull Request required")

        console.log('Done !')
        
        sendRequestResult(
            new PublishRequestResult(true),
        );
    } catch (error) {
        console.error(error)
        sendRequestResult(
            new PublishRequestResult(false, error),
        );
    }
}

// Sends an IPC event to the renderer process
// to notify it that we are done.
function sendRequestResult(result: PublishRequestResult) {
    mainWindow.webContents.send("publish-done", result);
}

// Prepares an instance of the GitRepoManager class.
// The promise resolves once the cloning/pulling process of the
// local copy of the repo is done. Rejected (with the error message) on error.
function prepareGitRepoManager(repoURL: string, branch: string, token: string): Promise<GitRepoManager> {
    return new Promise<GitRepoManager>((resolve, reject) => {
        const grm = new GitRepoManager(repoURL, branch, token);
        console.log("Updating local copy")
        grm.updateLocalCopy()
            .then(() => { 
                resolve(grm); 
            })
            .catch((err: any) => { 
                console.error(err);
                reject(err);
             });
    });
}

// This function is called to generate a string (e.g. body/title of a pull request)
type StringProvider = () => string;

// Creates the pull request from the fork to the goal repo
function createPullRequest (token: string, owner: string, repo: string, user: string, branch: string,
    titleProvider: StringProvider, bodyProvider: StringProvider): Promise<void> {
    octokit.authenticate({
        type: "oauth",
        token,
    });
    return new Promise<void>((resolve, reject) => {
        octokit.pullRequests.create({
            owner,
            repo,
            title : titleProvider(),
            head  : user + ":" + branch,
            body  : bodyProvider(),
            base  : branch,
        }, (error: any , result: any) => {
            if (error != null) {
                console.error(error);
                reject("Failed to create the Pull Request.");
            } else {
                resolve();
            }
        });
    });
}

// Checks the request for invalid information. For use
// within the publish function
function checkRequestInput(request: PublishRequest): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const repoUrl = request.repoUrl

        if (!isGithubUrl(repoUrl)) {
            reject('"' + repoUrl + '" is not a valid GitHub repository');
            return
        } 

        const subdir = request.subdir
        if ((subdir.length > 0) && (!/^((\w)+)(((\/)(\w+))+)?$/.test(subdir))) {
            reject('"' + subdir + '" is not a valid path');
            return
        } 

        if(request.user == null)
        {
            reject("Unauthorized user (user is null)")
            return
        } else if ((request.user.token == null) || (request.user.token === "")) {
            reject("Unauthorized user (token is null or empty)")
            return
        }

        const path = request.csvPath
        if(!fs.existsSync(path)){
            reject("this path is not valid: "+path)
            return
        }
        if(!path.endsWith(".csv")){
            reject("this is not a csv file")
            return
        }
        
        resolve();
    });
}