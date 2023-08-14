/**
 * @file This file contains the entry point of the app, and handles most ipc events sent
 * the main process.
 */
import { Octokit } from "@octokit/rest";
import { app, BrowserWindow, dialog, globalShortcut, ipcMain } from "electron";
import { Action, ActionRequest, Target } from "./common/Objects/ActionRequest";
import { RepoDetails } from "./common/Objects/RepoDetails";
import { User } from "./common/Objects/User";
import { Version } from "./common/Objects/Version";
import { publish } from "./main/Actions/Publishing";
import { validate } from "./main/Actions/Validating";
import { getUserInfo } from "./main/Api/GithubUser";
import { getDefaultBranch, getLatestRelease } from "./main/Api/Release";
// const { BrowserWindow } = require("@electron/remote");
import * as remoteMain from "@electron/remote/main";

import { PublishFormDefaults } from "./culturize.conf";

import log = require("electron-log");
import fs = require("fs");
import path = require("path");
const rimraf = require("rimraf");
remoteMain.initialize();


/**
 * This is the main window of the program.
 * It is exported so other classes can access it to
 * send events, attach child windows to it, etc.
 */
export let mainWindow: BrowserWindow;
export let validationAborted: boolean = false;

/**
 * The currently logged-in user.
 * It is null if the user is not connected.
 */
let currentUser: User = null;

/**
 * An initiated octokit object
 * It is null if not yes initiated
 */
let octokit: Octokit = null;

/**
 * The application version
 */
let version: Version = null;

/**
 * The application settings
 */
let settings: { [id: string]: any } = {"github-key": "", "input-history": []};
let actionHistory: ActionRequest[] = [];

/**
 * This function is called when the app is ready, and is tasked with
 * creating the main window.
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        height: 720,
        width: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    require("@electron/remote/main").enable(mainWindow.webContents);
    mainWindow.setMenu(null);
    mainWindow.maximize();

    try {
        const appPath = app.getPath("userData") + "/culturize";
        const filename = appPath + "/culturize.json";
        const oldFilename = app.getPath("userData") + "/culturize.json";
        if (!fs.existsSync(appPath)) {
            fs.mkdirSync(appPath);
        }
        if (fs.existsSync(filename)) {
            console.log("reading from " + filename);
            settings = JSON.parse(fs.readFileSync(filename, {encoding: "utf8"}));
        } else if (fs.existsSync(oldFilename)) {
            console.log("reading from " + oldFilename);
            settings = JSON.parse(fs.readFileSync(oldFilename, {encoding: "utf8"}));
            settings["input-history"] = [];
        }
        parseHistory();

    } catch (e) {/* */}

    version = new Version(app.getVersion());

    if (!settings["github-key"]) {
        console.log("retreiving github pa token");
        loadTokenLoginpage();
    } else {
        validateToken(settings["github-key"]);
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    mainWindow.on("close", (e: any) => {
        console.log("main window close");
        const globalAny: any = global;

        if (globalAny.sharedObj.transforming)  {
            const choice = dialog.showMessageBoxSync(
                mainWindow,
                {
                    type: "question",
                    buttons: ["Yes", "No, I am transforming a CSV file"],
                    title: "Confirm your actions",
                    message: "Do you really want to close the application? \
                        If you are transforming a CSV and the operation is \
                        not done you will lose all information.",
                },
            );

            console.log("CHOICE: ", choice);
            if (choice > 0) {
                e.preventDefault();
            }
        }
    });
}

/**
 * This function set the current active page of the mainwindow
 * to the token login page. (/static/tokenlogin.html)
 */
async function loadTokenLoginpage() {
    await mainWindow.loadFile(__dirname + "/../static/tokenlogin.html");
    // mainWindow.webContents.openDevTools();
    console.log("token login loaded");
}

/**
 * This function set the current active page of the mainwindow
 * to the main menu (/static/main.html)
 */
async function loadMainMenu() {
    await mainWindow.loadFile(__dirname + "/../static/main.html");
    passInputHistory();
    const latestVersion = await getLatestRelease(octokit);
    console.log(latestVersion, version);
    if (version.isNewer(latestVersion)) {
        mainWindow.webContents.send("show-update");
    }
}

function parseHistory() {
    if (settings["input-history"].length === 0) {
        return;
    }

    for (const input of settings["input-history"]) {
        const aReq: ActionRequest = new ActionRequest(Action.none, "", "", "", "", "", Target.nginx);
        aReq.loadData(input);
        actionHistory.push(aReq);
    }
}

function passInputHistory() {
    if (actionHistory.length === 0) {
        return;
    }
    const prevData: Array<{ [index: string]: any}> = [];
    for (const input of actionHistory) {
        prevData.push(input.dumpData());
    }

    if (prevData.length > 0) {
        mainWindow.webContents.send("input-values", prevData);
    }
}

ipcMain.on("validate-token", (event: Event, token: string) => {
    log.info("validate a github pa token");
    validateToken(token);
});

/**
 * Handles a logout event, which is usually fired by the renderer process
 * on a "logout" button press.
 * This will clear the cookies of the Electron app, logging the user
 * out of GitHub on our app for good. (Next time he'll have to re-enter
 * his credentials)
 */
ipcMain.on("logout-user", () => {
    // Clear the cookies
    mainWindow.webContents.session.clearStorageData();
    settings["github-key"] = "";
    writeSettings();
    loadTokenLoginpage();
});

/**
 * Handles a Hard Reset button click.
 * A hard reset clears the cache and deletes the repos of a user
 */
ipcMain.on("hard-reset", () => {
    // Clear the cookies
    mainWindow.webContents.session.clearStorageData();
    loadTokenLoginpage();

    // removes the repositories
    const workingDir = app.getPath("userData") + "/culturize/repo";
    rimraf(workingDir, () => { log.info(`Folder repo deleted ${workingDir}`); });
});

function writeSettings() {
    settings["input-history"] = [];
    if (actionHistory.length > 0) {
        for (const hist of actionHistory) {
            settings["input-history"].push(hist.dumpData());
        }
    }

    const settingsPath = app.getPath("userData") + "/culturize/culturize.json";
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
}

async function validateToken(token: string) {
    try {
        log.info("validating user token");
        octokit = new Octokit({ auth: `token ${token}`});
        currentUser = await getUserInfo(token, octokit);
        loadMainMenu();
        settings["github-key"] = token;
        writeSettings();
        log.info("user validated");
    } catch (error) {
        log.error("Token isn't valid " + error);
        const url: string = mainWindow.webContents.getURL();
        if (url.indexOf("tokenlogin") === -1) {
            loadTokenLoginpage();
            mainWindow.webContents.once("dom-ready", () => {
                log.info("sending login failure");
                mainWindow.webContents.send("token-expired");
            });
        } else {
            mainWindow.webContents.send("login-failure", error);
        }
    }
}

/**
 * Save input settings for restore on next convertion
 */
function saveInputSettings(request: ActionRequest) {
    let index: number = -1;

    for (let i: number = 0; i < actionHistory.length; i++) {
        if (actionHistory[i].hasSameArguments(request)) {
            index = i;
            break;
        }
    }

    if (index !== -1) {
        if (index !== 0) {
            const backup: ActionRequest = actionHistory[0];
            actionHistory[0] = request;
            actionHistory[index] = backup;
        } else {
            actionHistory[index] = request;
        }
    } else {
        actionHistory.unshift(request);
        actionHistory = actionHistory.slice(0, 5);
    }

    writeSettings();
    passInputHistory();
}

/**
 * Handles the publishing request event, fired by the renderer process when "publish" is
 * pressed. This will check that the current user is valid before proceeding.
 * If the user is valid, it'll complete the request with the user's information
 * and call publish() from src/main/Publishing/Publishing.ts
 * to handle the publishing process.
 * If the user is not valid, authError is called and a error is logged to the console
 * using console.error()
 */
ipcMain.on("request-action", async (event: Event, request: ActionRequest) => {
    // If the current logged in user is valid, proceed.
    log.info("Current user is valid, calling publish().");
    // Complete the request with the user
    // objects coming from renderer process don't have a type, copy to fix this
    const nReq: ActionRequest = new ActionRequest(Action.none, "", "", "", "", "", Target.nginx);
    nReq.copyFrom(request);
    nReq.user = currentUser;
    // save input settings
    saveInputSettings(nReq);
    // Proceed
    if (nReq.action === Action.publish) {
        const repoDetails = new RepoDetails(nReq.repoUrl);
        const defaultBranch = await getDefaultBranch(octokit, repoDetails.getOwner(), repoDetails.getRepo());

        publish(nReq, repoDetails, defaultBranch, path.join(app.getPath("userData"), "culturize", "repo"));
    } else if (nReq.action === Action.validate) {
        validationAborted = false;
        validate(nReq);
    }
});

/**
 * This checks that "currentUser" is valid (not null and with all fields set).
 * NOTE: This will not check that the token works, this will only check
 * that it's a valid string.
 * @returns {boolean} True if the current user is valid, false otherwise.
 */
function isCurrentUserValid(): boolean {
    if (currentUser == null) {
        return false;
    }

    if ((currentUser.userName == null) || (currentUser.avatarURL == null) || (currentUser.token == null)) {
        return false;
    }

    return (currentUser.avatarURL !== "") && (currentUser.userName !== "") && (currentUser.token !== "");
}

/**
 * Forwards the handling of the "ready" event to the "createWindow" function
 */
app.on("ready", () => {
    createWindow();
});

/**
 * Handles the "all windows closed" event.
 * This is will quit the app on most platform, except on
 * OSX ("darwin") where it won't, because on osx it's common
 * to leave the app active until the user quits explicitly with Cmd + Q.
 */
app.on("window-all-closed", () => {
    console.log("closed2");

    if (process.platform !== "darwin") {
        app.quit();
    }
});

/**
 * Handles the "active" event, which will re-create the main window
 * if it's null. This is used on OSX when the dock icon is clicked.
 */
app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});

/**
 * Handles the "get-user-object" event, which is usually sent by webpages
 * when they want a copy of the user object. We always send a copy
 * WITHOUT the token, for security reasons and because webpage will never, ever need
 * it.
 */
ipcMain.on("get-user-object", (event: any) => {
    log.info("A Window requested a copy of the user object");
    event.returnValue = currentUser.withoutToken();
});


/*
 * initialize a global with the info if a transformation is happening or not
 */
export function toggleTransformation(toggle: boolean) {
    const globalAny: any = global;
    globalAny.sharedObj = {transforming: toggle};

    if (mainWindow) {
        mainWindow.webContents.send("transformation", toggle);
    }
}
toggleTransformation(false);

export function showResultWindow() {
    const resultWindow = new BrowserWindow({
        height: 820,
        width: 1000,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        parent: mainWindow,
    });
    resultWindow.setMenu(null);
    resultWindow.on("close", (e: any) => {
        console.log("result window close");
        validationAborted = true;
    });

    return resultWindow;
}
