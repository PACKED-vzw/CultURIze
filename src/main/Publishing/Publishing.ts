// This file is responsible for orchestrating
// the whole 'publishing' process.
// Note: this class doesn't check the user data, this
// is done by the main process with the function "isUserValid", which
// is called prior to calling publish.
// Explanation
/*
    0.  'request-publishing' IPC Event is fired, and caught in the main.ts file.
         The function that handles this event then calls 'publish', which is defined below.
    1.  Publish first checks the Publish Request for invalid or incomplete information.
        If the information is found to be incorrect, an error is emitted.
    2.  We convert the .csv to .htaccess. This is done early, so if this step fails we can abort
        without touching the GitHub repos.    
    3.  The GitHub repo URL is parsed to retrieve the name of the repo and the name of the owner.
    4.  The name of the currently logged-in user is compared to the name of the repo.
        If the current user is found to be the owner, skip step 5 & 9.
    5.  We fork the target repo on the user's account.
    6.  We initialize the GitRepoManager instance, which will clone/update the local copy of the
        repo.
    7.  We save the .htaccess to the desired location.
    8.  We push to the remote repo.
    9.  We make a pull request to ask the owner of the target repo to accept the changes.
*/

import { PublishRequest, PublishRequestResult } from "./../../common/Objects/PublishObjects";
import { mainWindow } from "./../../main";
import { ForkManager } from "./../Api/ForkManager";
import { convertCSVtoHTACCESS } from "./../Converter/Converter";
import { GitRepoManager } from "./../Git/Git";
import { PublishFormDefaults } from "./../../culturize.conf"
import fs = require('fs');
const isGithubUrl = require("is-github-url");
const octokit = require("@octokit/rest")();
const GitUrlParse = require("git-url-parse");

// Handle a publishing request
export async function publish(request: PublishRequest) {
    // Add the ForcedSubdir to the request
    request.subdir = PublishFormDefaults.forcedSubdir + request.subdir;
    try {
        console.log('Request Data: ' + JSON.stringify(request))
        // Check the request for incorrect input
        notifyStep("Checking input.");
        await checkRequestInput(request);

        // Get user
        const user = request.user;
        console.log(request);
    
        // Convert the file before doing anything with the GitHub api,
        // so if this steps fail, we can stop the process without
        // touching the remote repos.
        let content = await convertCSVtoHTACCESS(request.csvPath);

        // Parse the url
        notifyStep("Parsing URL");
        const parsedURL = GitUrlParse(request.repoUrl);
        const destOwner = parsedURL.owner;
        const destName = parsedURL.name;
        const prettyName = destOwner + "/" + destName;

        let isOwnerOfRepo = (destOwner === user.userName)

        // The URL of the repo that we're going to clone/manage.
        let repoURL : string

        // Here, depending on if the user's the owner of the repo he wants
        // to send the .htaccess to, we'll either do a direct push to his repo
        // or fork the repo so we can make a pull request later.
        if(isOwnerOfRepo)
        {
            // If the current user owns the repo, no forking will be required
            notifyStep(user.userName + ' owns ' + request.repoUrl + ', no forking required')
            repoURL = request.repoUrl
        }
        else 
        {
            // If the current user doesn't own the repo, we have to fork it
            notifyStep("Attempting to fork " + prettyName);

            const forks = new ForkManager(user.token);
            repoURL = await forks.forkRepo(request.repoUrl, user.userName, request.branch);
            
            notifyStep("Successfully forked " + prettyName + ' at "' + repoURL + '"');
        }

        // Prepare the repoManager
        notifyStep("Preparing Git");
        console.log("Preparing GitRepoManager instance");
        const manager = await prepareGitRepoManager(repoURL, request.branch, user.token);

        // Save the file
        notifyStep("Saving the .htaccess to the desired location");
        manager.saveStringToFile(content, ".htaccess", request.subdir);

        // Push the changes
        notifyStep("Pushing changes");
        await manager.pushChanges(request.commitMsg);

        // Make the pull request if we don't own the repo
        if(!isOwnerOfRepo)
        {
            notifyStep("Creating pull request");
            await createPullRequest(user.token, destOwner, destName, user.userName, request.branch,
                () => request.prTitle, () => request.prBody);
        }
        else 
            notifyStep("The current owner owns the repo, no Pull Request required")

        notifyStep('Done !')

        sendRequestResult(
            new PublishRequestResult(true),
        );
    } catch (error) {
        console.error(<string>error)
        sendRequestResult(
            new PublishRequestResult(false, <string>error),
        );
    }
}

function notifyStep(stepDesc: string) {
    console.log(stepDesc);
    mainWindow.webContents.send("update-publish-step", stepDesc);
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
        token: token
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

        // Check if the repo URL is a GitHub URL
        if (!isGithubUrl(repoUrl)) {
            reject('"' + repoUrl + '" is not a valid GitHub repository');
            return
        } 

        // Check if the subdir is a valid path.
        const subdir = request.subdir
        if ((subdir.length > 0) && (!/^((\w)+)(((\/)(\w+))+)?$/.test(subdir))) {
            reject('"' + subdir + '" is not a valid path');
            return
        } 

        // Check if the path to the csv exists.
        const path = request.csvPath
        if(!fs.existsSync(path)){
            reject("The file \""+path+"\" does not exists.");
            return;
        }

        // Check if the path ends with .csv
        if(!path.endsWith(".csv")){
            reject("The file \""+path+"\" is not a .csv file.");
            return;
        }
        
        // If we passed every check, resolve the promise.
        resolve();
    });
}