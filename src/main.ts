/**
 * @file This file contains the entry point of the app, and handles most ipc events sent
 * the main process.
 */
import { app, BrowserWindow, dialog, globalShortcut, ipcMain } from "electron";
import { PublishRequest } from "./common/Objects/PublishObjects";
import { User } from "./common/Objects/UserObject";
import { getUserInfo } from "./main/Api/User";
import { publish } from "./main/Publishing/Publishing";

import log = require("electron-log");
import fs = require("fs");
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

    let settings = {"github-key": ""};
    try {
        const path = app.getPath("userData") + "/culturize.json";
        console.log(path);
        settings = JSON.parse(fs.readFileSync(path, {encoding: "utf8"}));
    } catch (e) {/* */}

    if (!settings["github-key"]) {
        console.log("retreiving github pa token");
        loadTokenLoginpage();
    } else {
        // validating token
        validateToken(settings["github-key"]);
    }

    // loadLoginpage();

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
function loadMainMenu() {
    mainWindow.loadFile(__dirname + "/../static/main.html");
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
    writeToken("");
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
    const workingDir = app.getPath("userData") + "/repo";
    rimraf(workingDir, () => { log.info(`Folder repo deleted ${workingDir}`); });
});

function writeToken(token: string) {
    const path = app.getPath("userData") + "/culturize.json";
    console.log(path);
    const settings = {"github-key": token};
    fs.writeFileSync(path, JSON.stringify(settings));
}

async function validateToken(token: string) {
    try {
        log.info("validating user token");
        currentUser = await getUserInfo(token);
        loadMainMenu();
        writeToken(token);
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
        // Proceed
        publish(request);
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
