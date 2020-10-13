/**
 * @file This file contains the entry point of the app, and handles most ipc events sent
 * the main process.
 */
import { Octokit } from "@octokit/rest";
import { app, BrowserWindow, dialog, globalShortcut, ipcMain } from "electron";
import { PublishRequest } from "./common/Objects/PublishObjects";
import { User } from "./common/Objects/UserObject";
import { Version } from "./common/Objects/VersionObject";
import { getLatestRelease } from "./main/Api/Release";
import { getUserInfo } from "./main/Api/User";
import { publish } from "./main/Publishing/Publishing";

import { PublishFormDefaults } from "./culturize.conf";

import log = require("electron-log");
import fs = require("fs");
import path = require("path");
const rimraf = require("rimraf");


/**
 * This is the main window of the program.
 * It is exported so other classes can access it to
 * send events, attach child windows to it, etc.
 */
export let mainWindow: BrowserWindow;

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
        },
    });
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
        console.log(settings["input-history"].length);

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
function loadTokenLoginpage() {
    mainWindow.loadFile(__dirname + "/../static/tokenlogin.html");
}

/**
 * This function set the current active page of the mainwindow
 * to the main menu (/static/main.html)
 */
async function loadMainMenu() {
    await mainWindow.loadFile(__dirname + "/../static/main.html");
    preloadInputFields();
    const latestVersion = await getLatestRelease(octokit);
    console.log(latestVersion, version);
    if (version.isNewer(latestVersion)) {
        mainWindow.webContents.send("show-update");
    }
}

function preloadInputFields() {
    if (settings["input-history"].length === 0) {
        return;
    }
    const lastSettings = settings["input-history"][0];
    const preload: { [index: string]: any} = {};
    preload.csvPath = lastSettings.csvPath;
    preload.subdir = lastSettings.subdir;
    preload.repoUrl = lastSettings.repoUrl;
    preload.branch = lastSettings.branch;
    preload.commitMsg = lastSettings.commitMsg;
    preload.prTitle = lastSettings.prTitle;
    preload.prBody = lastSettings.prBody;
    preload.forApache = lastSettings.forApache;
    preload.checkUrl = lastSettings.checkUrl;
    preload.advanced = lastSettings.advanced;
    preload.checkUrl = lastSettings.checkUrl;
    preload.noSubDir = lastSettings.noSubDir;

    mainWindow.webContents.send("input-values", preload);
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
function saveInputSettings(request: PublishRequest) {
    const input: { [index: string]: any} = {};
    input["advanced"] = false;
    input["csvPath"] = request.csvPath;
    input["subdir"] = request.subdir;
    if (request.subdir === "") {
        input["noSubDir"] = true;
        input["advanced"] = true;
    }
    input["repoUrl"] = request.repoUrl;
    input["branch"] = request.branch;
    input["commitMsg"] = request.commitMsg;
    input["prTitle"] = request.prTitle;
    input["prBody"] = request.prBody;
    input["forApache"] = request.forApache;
    input["checkUrl"] = request.checkUrl;

    if (request.branch !== PublishFormDefaults.branch) {
        input["advanced"] = true;
    }
    if (request.commitMsg !== PublishFormDefaults.commitMessage) {
        input["advanced"] = true;
    }
    if (request.prTitle !== PublishFormDefaults.pullrequestTitle) {
        input["advanced"] = true;
    }
    if (request.prBody !== PublishFormDefaults.pullrequestBody) {
        input["advanced"] = true;
    }
    if (request.checkUrl !== PublishFormDefaults.checkUrl) {
        input["advanced"] = true;
    }

    settings["input-history"].unshift(input);
    settings["input-history"] = settings["input-history"].slice(0, 5);
    writeSettings();
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
ipcMain.on("request-publishing", (event: Event, request: PublishRequest) => {
    // If the current logged in user is valid, proceed.
    if (isCurrentUserValid()) {
        log.info("Current user is valid, calling publish().");
        // Complete the request with the user
        request.user = currentUser;
        // save input settings
        saveInputSettings(request);
        // Proceed
        publish(request, path.join(app.getPath("userData"), "culturize", "repo"));
    } else {
        log.error("Aborting publishing process because the current user is invalid.");
        // Else, the user is not valid, request him to login again
        loadTokenLoginpage();
        mainWindow.webContents.once("dom-ready", () => {
            log.info("sending login failure");
            mainWindow.webContents.send("token-expired");
        });
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

    if ((currentUser.userName == null) || (currentUser.avatar_url == null) || (currentUser.token == null)) {
        return false;
    }

    return (currentUser.avatar_url !== "") && (currentUser.userName !== "") && (currentUser.token !== "");
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
    console.log("showing results window");
    const resultWindow = new BrowserWindow({
        useContentSize: true,
        webPreferences: {
            nodeIntegration: true,
        },
        parent: mainWindow,
    });
    resultWindow.setMenu(null);
    //resultWindow.maximize();
    return resultWindow;
}
