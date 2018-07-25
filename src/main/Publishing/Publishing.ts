
/**
 * @file This file is responsible for orchestrating
 * the whole publishing process. Note: functions in this file won't check
 * the user object. This is done by the main.ts file, prior to calling publish.
 *
 *  0.  'request-publishing' IPC Event is fired, and caught in the main.ts file.
 *       The function that handles this event then calls 'publish', which is defined below.
 *  1.  Publish first checks the Publish Request for invalid or incomplete information.
 *      If the information is found to be incorrect, an error is emitted.
 *  2.  We convert the .csv to .htaccess. This is done early, so if this step fails we can abort
 *      without touching the GitHub repos.    
 *  3.  The GitHub repo URL is parsed to retrieve the name of the repo and the name of the owner.
 *  4.  The name of the currently logged-in user is compared to the name of the repo.
 *      -> If the current user is found to be the owner, skip step 5 & 9.
 *  5.  We fork the target repo on the user's account.
 *  6.  We initialize the GitRepoManager instance, which will clone/update the local copy of the
 *      repo.
 *  7.  We save the .htaccess to the desired location.
 *  8.  We push to the remote repo.
 *  9.  We make a pull request to ask the owner of the target repo to accept the changes.
 */

import { PublishRequest, PublishRequestResult } from "./../../common/Objects/PublishObjects";
import { mainWindow } from "./../../main";
import { ForkManager } from "./../Api/ForkManager";
import { convertCSVtoHTACCESS } from "./../Converter/Converter";
import { GitRepoManager } from "./../Git/Git";
import { PublishOptions } from "./../../culturize.conf"
import fs = require('fs');
const isGithubUrl = require("is-github-url");
const octokit = require("@octokit/rest")();
const GitUrlParse = require("git-url-parse");

/**
 * This is the regular expression used to check the 
 * validity of the subdirectory given by the user
 * (and the baseSubdir of PublishOptions)
 */
const dirRegex = /^((\w)+)(((\/)(\w+))+)?$/;

/**
 * This is a small function that can be used with await to "sleep" (wait) 
 * for a certain time.
 * 
 * This is often used by the publish function to wait a bit before
 * starting a computation-intensive task (such as converting the file) to
 * allow the renderer process to receive and process the event. 
 * 
 * This allows us to notify the user that something is happened, so he doesn't think that the app crashed.
 * @param {number} ms The number of milliseconds to sleep for
 */
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));


/**
 * This function is the entry point of the publishing process. 
 * It will execute the request!
 * @async
 * @param {PublishRequest} request The request that will be processed
 */
export async function publish(request: PublishRequest) {
    notifyStep("Preparing");
    // Prepare the Subdirectory by inserting the baseSubdir if applicable.
    let baseSubdir : string = PublishOptions.baseSubdir ? PublishOptions.baseSubdir : "";
    if(baseSubdir !== "")
    {
        if(dirRegex.test(baseSubdir))
            request.subdir = baseSubdir + '/' + request.subdir;
        else 
            console.error("Ignored the base subdirectory \"" + baseSubdir + "\" because it is not valid");
    }
    try {

        console.log('Request Data: ' + JSON.stringify(request))
        // Check the request for incorrect input
        notifyStep("Checking input");
        await checkRequestInput(request);

        // Get user
        const user = request.user;
    
        // Convert the file before doing anything with the GitHub api,
        // so if this steps fail, we can stop the process without
        // touching the remote repos.
        notifyStep("Converting file");
        await sleep(10);
        let response = await convertCSVtoHTACCESS(request.csvPath);
        console.log("Conversion result: " + response.file.length + " characters in the .htaccess, generated from " 
        + response.numLinesAccepted + " rows (" + response.numLinesRejected + ")");

        // Parse the url
        notifyStep("Parsing URL");
        const parsedURL = GitUrlParse(request.repoUrl);
        const destOwner = parsedURL.owner;
        const destName = parsedURL.name;
        const prettyName = destOwner + "/" + destName;

        // Case-insensitive comparison
        let isOwnerOfRepo = (destOwner.toUpperCase() === user.userName.toUpperCase())

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
        manager.saveStringToFile(response.file, ".htaccess", request.subdir);

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
            new PublishRequestResult(true, null, response.numLinesAccepted, response.numLinesRejected),
        );
    } catch (error) {
        console.error(<string>error)
        sendRequestResult(
            new PublishRequestResult(false, <string>error),
        );
    }
}

/**
 * Notifies the user that a certain step is occuring. This
 * will fire a "update-publish-step" event, and also log
 * the step to the console.
 * @param {string} stepDesc Description of the step that'll be displayed to the user
 */
function notifyStep(stepDesc: string) {
    console.log(stepDesc);
    mainWindow.webContents.send("update-publish-step", stepDesc);
}

/**
 * Notifies the renderer process that we are done processing the request.
 * @param {PublishRequestResult} result The result of the request
 */
function sendRequestResult(result: PublishRequestResult) {
    mainWindow.webContents.send("publish-done", result);
}

/**
 * Prepares an instance of the GitRepoManager class, calling "updateLocalCopy"
 * to clone/pull/reset the repo on the local machine
 * 
 * Note: the username is extracted from the URL by the GitRepoManager
 * 
 * Note: the currently logged in user must have write access to that repo to use push.
 * @param {string} repoURL The URL of the repo that'll be cloned
 * @param {string} branch  The branch of the repo that'll be checked out
 * @param {string} token   The user token (used to push/pull). 
 */
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

/**
 * This is a function called by "createPullRequest" to generate a 
 * title/body for the PullRequest
 */
type StringProvider = () => string;

/**
 * Makes a pull request to "github.com/owner/repo" to implement
 * the changes in "github.com/user/repo"
 * @param {string} token     The token
 * @param {string} owner     The owner of the repo where we want to make the PR
 * @param {string} repo      The name of the repo where we want to make the PR
 * @param {string} user      The name of the current user
 * @param {string} branch    The name of the branche
 * @param {StringProvider} titleProvider The function that will generate a title for the PR
 * @param {StringProvider} bodyProvider  The function that will generate a body for the PR
 */
function createPullRequest (token: string, owner: string, repo: string, user: string, branch: string,
    titleProvider: StringProvider, bodyProvider: StringProvider): Promise<void> {
    // Authenticate with octokit
    octokit.authenticate({
        type: "oauth",
        token: token
    });
    // Send the pull request (asynchronous)
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
                //console.error(error);
                let str: string = error.message;                
                let errors = JSON.parse(str).errors;
                reject(errors[0].message);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Checks a request for incorrect/invalid/illegal inputs.
 * @param {PublishRequest} request The request that will be checked
 */
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
        if ((subdir.length > 0) && (!dirRegex.test(subdir))) {
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