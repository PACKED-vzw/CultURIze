
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
import { User } from "./../../common/Objects/UserObject";
import { PublishOptions } from "./../../culturize.conf";
import { mainWindow, showResultWindow, toggleTransformation } from "./../../main";
import { ConversionResult, convertCSVtoWebConfig, CSVRow } from "./../Converter/Converter";
import { GitRepoManager } from "./../Git/Git";

import log = require("electron-log");
import fs = require("fs");
const isGithubUrl = require("is-github-url");
import octokit = require("@octokit/rest");
import GitUrlParse = require("git-url-parse");
import path = require("path");

import { shell } from "electron";

/**
 * This is the regular expression used to check the
 * validity of the subdirectory given by the user
 * (and the baseSubdir of PublishOptions)
 */
const dirRegex = /^([\w-]+)(((\/)([\w-]+))+)?$/;

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
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));


/**
 * This function is the entry point of the publishing process.
 * It will execute the request!
 * @async
 * @param {PublishRequest} request The request that will be processed
 * @param {string} path to sync git repositories to
 */
export async function publish(request: PublishRequest, repoPath: string) {
    notifyStep("Preparing");
    // Prepare the Subdirectory by inserting the baseSubdir if applicable.
    const baseSubdir: string = PublishOptions.baseSubdir ? PublishOptions.baseSubdir : "";
    if (baseSubdir !== "") {
        if (dirRegex.test(baseSubdir)) {
            request.subdir = baseSubdir + "/" + request.subdir;
        } else {
            log.error(`Ignored the base subdirectory "${baseSubdir}" because it is not valid`);
        }
    }
    try {
        // set the start of the transformation
        toggleTransformation(true);

        log.info(`Request Data: ${JSON.stringify(request)}`);
        // Check the request for incorrect input
        notifyStep("Checking input");
        if (!checkRequestInput(request)) {
            throw new Error("invalid input");
        }

        // Get user
        const user = request.user;

        // Convert the file before doing anything with the GitHub api,
        // so if this steps fail, we can stop the process without
        // touching the remote repos.
        notifyStep("Converting file");
        await sleep(10);
        log.info("generation config file for" + request.forApache ? "apache" : "nginx");
        const response: ConversionResult = await convertCSVtoWebConfig(request.csvPath,
                                                                       request.forApache,
                                                                       request.subdir);
        log.info("Conversion result: " + response.file.length + " characters in the configuration, generated from "
                 + response.numLinesAccepted + " rows (" + response.numLinesRejected + ")");
        if (request.checkUrl) {
            notifyStep("Checking URLs");
            await checkURLs(response.rows);
        }
        notifyStep("Writing report");
        const reportFilename = writeReport(request.csvPath, response, request);

        // Parse the url
        notifyStep("Parsing URL");
        const parsedURL = GitUrlParse(request.repoUrl);
        log.info(`repo information ${parsedURL}`);

        const destOwner = parsedURL.owner;
        const destName = parsedURL.name;
        const prettyName = destOwner + "/" + destName;

        // Case-insensitive comparison
        const isOwnerOfRepo = (destOwner.toUpperCase() === user.userName.toUpperCase());

        // The URL of the repo that we're going to clone/manage.
        let repoURL: string;

        // Here, depending on if the user's the owner of the repo he wants
        // to send the .htaccess to, we'll either do a direct push to his repo
        // or fork the repo so we can make a pull request later.

        // If the current user owns the repo
        repoURL = request.repoUrl;
        if (isOwnerOfRepo) {
            notifyStep(`${user.userName} owns ${request.repoUrl}`);
        } else {
            notifyStep(`${user.userName} does not own the repo ${request.repoUrl}, make sure you have permissions to
                    push and pull this repo.`);
        }

        // Prepare the repoManager
        notifyStep("Preparing Git");
        log.info("Preparing GitRepoManager instance");
        const manager = await prepareGitRepoManager(repoURL, request.branch, user, repoPath);

        // Save the file
        notifyStep("Saving the configuration file to the desired location");
        if (request.forApache) {
            manager.saveStringToFile(response.file, ".htaccess", request.subdir);
        } else {
            manager.saveStringToFile(response.file, "nginx_redirect.conf", request.subdir);
        }

        // Push the changes
        notifyStep("Pushing changes");
        await manager.pushChanges(request.commitMsg);

        notifyStep("Done !");
        if (!request.checkUrl) {
            const resultWindow = showResultWindow();
            resultWindow.loadURL("file://" + reportFilename);
        }

        // set the end of the transformations
        toggleTransformation(false);

        sendRequestResult(
            new PublishRequestResult(true, null, response.numLinesAccepted, response.numLinesRejected),
        );
    } catch (error) {
        // set the end of the transformations
        toggleTransformation(false);

        log.error(error as string);
        sendRequestResult(
            new PublishRequestResult(false, error as string),
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
    log.info(stepDesc);
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
 * @param {string} repoPath   Path to sync git repositories to
 */
async function prepareGitRepoManager(repoURL: string, branch: string,
                                     user: User, repoPath: string): Promise<GitRepoManager> {
    const grm = new GitRepoManager(repoURL, branch, user, repoPath);
    log.info("Updating local copy");
    try {
        await grm.updateLocalCopy();
    } catch (error) {
        log.error(error);
        throw error;
    }
    return grm;
}

/**
 * Checks a request for incorrect/invalid/illegal inputs.
 * @param {PublishRequest} request The request that will be checked
 */
function checkRequestInput(request: PublishRequest): boolean {
    const repoUrl = request.repoUrl;

    // Check if the repo URL is a GitHub URL
    if (!isGithubUrl(repoUrl)) {
        log.error('"' + repoUrl + '" is not a valid GitHub repository');
        return false;
    }

    // Check if the subdir is a valid path.
    const subdir = request.subdir;
    if ((subdir.length > 0) && (!dirRegex.test(subdir))) {
        log.error('"' + subdir + '" is not a valid path');
        return false;
    }

    // Check if the path to the csv exists.
    const csvPath = request.csvPath;
    if (!fs.existsSync(csvPath)) {
        log.error("The file \"" + path + "\" does not exists.");
        return false;
    }

    // Check if the path ends with .csv
    if (!csvPath.endsWith(".csv")) {
        log.error("The file \"" + path + "\" is not a .csv file.");
        return false;
    }

    // If we passed every check, resolve the promise.
    return true;
}

/**
 * check csv rows URL's
 * @param {CSVRow[]} rows csv rows
 */
async function checkURLs(rows: CSVRow[]) {
    const resultWindow = showResultWindow();
    console.log(__dirname);
    await resultWindow.loadFile(__dirname + "/../../../static/report.html");
    let numAccepted = 0;
    let numRejected = 0;

    for (const row of rows) {
        await row.checkURL();
        if (row.isValidAndEnabled()) {
            numAccepted += 1;
        } else {
            numRejected += 1;
        }
        const data = {
            html: row.createHTMLRow(),
            accepted: numAccepted,
            rejected: numRejected,
        };
        resultWindow.webContents.send("new-data", data);
    }
}

/**
 * Write conversion result report
 * @param {string} csvPath location of the csv file, -report.html will be appended
 * @param {CSVRow[]} rows csv rows
 */
function writeReport(csvPath: string, result: ConversionResult, request: PublishRequest) {
    const filename: string = path.join(path.dirname(csvPath), path.basename(csvPath) + "-report.html");

    const header: string = `<html>\n` +
        `<head>\n` +
        `<title>CultURIze conversion report</title>\n` +
        `<style type=text/css>` +
            `#tresults, th, td {border: 1px solid black;}` +
            `.invalid {background-color: #efd1d1;}` +
            `.error {background-color: #db9898;}` +
            `#tresults tr > *:nth-child(1) {display: none;}` +
            `${request.checkUrl ? "" : "#tresults tr > *:nth-child(7) {display: none;}"}` +
        `</style>\n` +
        `</head>\n` +
        `<body>\n` +
        `<div id="hcontainer">\n` +
            `<h1>CultURIze conversion result\n</h1>` +
            `<div id="rcontainer">\n` +
                `Converted <span id="accepted">${result.numLinesAccepted}</span> rows and ` +
                `rejected <span id="rejected">${result.numLinesRejected}</span>.` +
            `</div>\n` +
            `<div id="bcontainer">\n` +
                `<button id="show-errors" class="filter-button">\n` +
                    `Only show errors` +
                `</button>\n` +
                `<button id="show-all" class="filter-button">\n` +
                    `Show all` +
                `</button>\n` +
            `</div>\n` +
        `</div>\n` +
        `<script type="text/javascript">\n` +
            `document.getElementById("show-errors").onclick = function showErrors() {` +
                `var lst = document.getElementsByClassName("valid");` +
                `for (var i=0; i < lst.length; i++) {` +
                    `lst[i].style.display = "none";` +
                `}` +
            `};` +
            `document.getElementById("show-all").onclick = function showAll() {` +
                `var lst = document.getElementsByClassName("valid");` +
                `for (var i=0; i < lst.length; i++) {` +
                    `lst[i].style.display = "";` +
                `}` +
            `};` +
        `</script>\n` +
        `<div id="tcontainer">\n` +
            `<table id="tresults">\n` +
                `<tr id="theader">` +
                    `<td>id</td>` +
                    `<td>enabled</td>` +
                    `<td>document Type</td>` +
                    `<td>PID</td>` +
                    `<td>URL</td>` +
                    `<td>affected cels</td>` +
                    `<td>URL check</td>` +
                `</tr>\n`;

    fs.writeFileSync(filename, header);

    let data: string = "";
    for (const row of result.rows) {
        data += row.createHTMLRow();
    }
    fs.appendFileSync(filename, data);
    const footer: string = `</table>\n` +
        `</div>\n` +
        `</body>\n` +
        `</html>`;

    fs.appendFileSync(filename, footer);

    return filename;
}
