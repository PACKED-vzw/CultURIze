
/**
 * @file This file is responsible for orchestrating
 * the validation process.
 *
 */

import { BrowserWindow } from "electron";
import { Action, ActionRequest } from "./../../common/Objects/ActionRequest";
import { ActionRequestResult } from "./../../common/Objects/ActionRequestResult";
import { ConversionResult } from "./../../common/Objects/ConversionResult";
import { CSVRow } from "./../../common/Objects/CSVRow";
import { User } from "./../../common/Objects/User";
import { PublishOptions } from "./../../culturize.conf";
import { mainWindow, showResultWindow, toggleTransformation } from "./../../main";
import { createArrayFromCSV } from "./../Parser/Parser";

import log = require("electron-log");
import fs = require("fs");
const isGithubUrl = require("is-github-url");
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
export async function validate(request: ActionRequest) {
    notifyStep("Preparing");
    try {
        // set the start of the transformation
        toggleTransformation(true);

        log.info(`Request Data: ${JSON.stringify(request)}`);
        // Check the request for incorrect input
        notifyStep("Checking input parameters");
        if (!checkRequestInput(request)) {
            throw new Error("invalid input");
        }


        // Convert the file before doing anything with the GitHub api,
        // so if this steps fail, we can stop the process without
        // touching the remote repos.
        notifyStep("Parsing CSV");
        let numAccepted: number = 0;
        let numRejected: number = 0;
        const rows = await createArrayFromCSV(request.csvPath,
                                              () => { numAccepted++; },
                                              (row: CSVRow) => { numRejected++; },
                                              true);
        notifyStep("Checking URLs");
        const resultWindow = showResultWindow();
        await resultWindow.loadFile(__dirname + "/../../../static/report.html");
        resultWindow.webContents.send("start-validation");

        await checkURLs(rows, resultWindow);

        numAccepted = 0;
        numRejected = 0;

        for (const row of rows) {
            if (row.valid && row.urlWorking && row.duplicateOf === -1) {
                numAccepted += 1;
            } else {
                numRejected += 1;
            }
        }

        notifyStep("Writing report");
        // TODO writing report. Can we save html from window?

        const reportFilename: string = path.join(path.dirname(request.csvPath),
                                                 path.basename(request.csvPath) + "-" +
                                                 request.timestamp.replace(/ /, "_") + "-report.html");
        await resultWindow.webContents.savePage(reportFilename, "HTMLComplete");

        notifyStep("Done !");

        // set the end of the transformations
        toggleTransformation(false);

        sendRequestResult(
            new ActionRequestResult(Action.validate,
                                    true,
                                    null,
                                    reportFilename,
                                    numAccepted,
                                    numRejected),
        );
    } catch (error) {
        // set the end of the transformations
        toggleTransformation(false);

        log.error(error as string);
        sendRequestResult(
            new ActionRequestResult(Action.validate, false, error as string),
        );
    }
}

/**
 * Notifies the user that a certain step is occuring. This
 * will fire a "update-action-step" event, and also log
 * the step to the console.
 * @param {string} stepDesc Description of the step that'll be displayed to the user
 */
function notifyStep(stepDesc: string) {
    log.info(stepDesc);
    mainWindow.webContents.send("update-action-step", stepDesc);
}

/**
 * Notifies the renderer process that we are done processing the request.
 * @param {ActionRequestResult} result The result of the request
 */
function sendRequestResult(result: ActionRequestResult) {
    mainWindow.webContents.send("validate-done", result);
}

/**
 * Checks a request for incorrect/invalid/illegal inputs.
 * @param {PublishRequest} request The request that will be checked
 */
function checkRequestInput(request: ActionRequest): boolean {
    const repoUrl = request.repoUrl;

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
async function checkURLs(rows: CSVRow[], resultWindow: BrowserWindow) {
    let numAccepted = 0;
    let numRejected = 0;

    for (const row of rows) {
        await row.checkURL();

        if (row.valid && row.urlWorking && row.duplicateOf === -1) {
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
