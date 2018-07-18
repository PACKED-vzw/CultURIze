// This file is responsible for orchestrating
// the whole 'publishing' process.
// Explanation
/*
    0.  'request-publishing' IPC Event is fired, and caught in the main.
         The function that handles this event then calls 'publish' below.
*/

import { PublishRequest, PublishRequestResult } from "./../common/PublishObjects";
import { mainWindow } from "./../main";
import { ForkManager } from "./Api/ForkManager";
import { convertCSVtoHTACCESS } from "./Converter/Converter";
import { GitRepoManager } from "./Git";
import { User } from './Api/User'
const isGithubUrl = require("is-github-url");
const octokit = require("@octokit/rest")();
const GitUrlParse = require("git-url-parse");

// Handle a publishing request
export async function publish(request: PublishRequest) {
    try {
        // Check the request for incorrect input
        console.log("Checking Request for incorrect input");
        await checkRequestInput(request);

        // Gather user information
        let user = await User.getUserInfo(request.token)

        // Parse the url
        console.log("Parsing URL");
        const parsedURL = GitUrlParse(request.repoUrl);
        const destOwner = parsedURL.owner;
        const destName = parsedURL.name;
        const prettyName = destOwner + "/" + destName;
        console.log({ repoOwner:destOwner, repoName:destName })

        let isOwnerOfRepo = (destOwner === user.userName)

        // Convert the file before doing anything with the GitHub api,
        // so if this steps fail, we don't mess with the GitHub api
        let content = await convertCSVtoHTACCESS(request.csvPath);

        // The URL of the repo that we're going to clone/manage.
        let repoURL : string

        if(isOwnerOfRepo)
        {
            // If the current user owns the repo, no forking will be required
            console.log(user.userName + ' owns ' + request.repoUrl + ', no forking required')
            repoURL = request.repoUrl
        }
        else 
        {
            // If the current user doesn't own the repo, we'll have to fork it

            // Fork the goal repo if we don't own it
            console.log("Attempting to fork " + prettyName);
            const forks = new ForkManager(request.token);

            // Todo: replace master with request.branch when it's added
            repoURL = await forks.forkRepo(request.repoUrl, user.userName, "master");
            console.log("Successfully forked " + prettyName + ' at "' + repoURL + '"');
        }

        // Prepare the repoManager
        console.log("Preparing GitRepoManager instance");
        const manager = await prepareGitRepoManager(repoURL, request.token);

        // Save the file
        console.log("Saving the .htaccess to the desired location");
        manager.saveStringToFile(content, ".htaccess", request.subdir);

        // Push the changes
        console.log("Pushing changes");
        await manager.pushChanges("Culturize import", "master");

        // Make the pull request if we don't own the repo
        if(!isOwnerOfRepo)
        {
            console.log("Creating pull request");
            await createPullRequest(request.token, destOwner, destName, "Pierre-vh", "master",
                () => "some title", () => "some body");
        }
        else 
            console.log("The current owner owns the repo, no Pull Request required")

        console.log('Done !')
        
        sendRequestResult(
            new PublishRequestResult(true),
        );
    } catch (error) {
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
function prepareGitRepoManager(repoURL: string, token: string): Promise<GitRepoManager> {
    return new Promise<GitRepoManager>((resolve, reject) => {
        const grm = new GitRepoManager(repoURL, token);
        grm.updateLocalCopy()
            .then(() => { resolve(grm); })
            .catch((err: any) => { reject(err); });
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
        if (!isGithubUrl(request.repoUrl)) {
            reject('"' + request.repoUrl + '" is not a valid GitHub repository');
            return
        } 
        
        if ((request.subdir.length > 0) && (!/^((\w)+)(((\/)(\w+))+)?$/.test(request.subdir))) {
            reject('"' + request.subdir + '" is not a valid path');
            return
        } 
        
        if((request.token === "") || (request.token == null))
        {
            reject("Unauthorized user (empty/null token)")
            return
        }

        resolve();
    });
}