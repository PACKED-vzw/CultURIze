/**
 * @file This file contains the entry point of the app, and handles most ipc events sent
 * the main process.
*/
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { PublishRequest } from "./common/Objects/PublishObjects";
import { LoginAssistant } from "./main/Api/Auth";
import { publish } from "./main/Publishing/Publishing";
import { getUserInfo } from "./main/Api/User";
import { User } from "./common/Objects/UserObject";
const octokit = require("@octokit/rest")();
const log = require('electron-log');

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
        height: 800,
        width: 800,
    });
    mainWindow.setMenu(null);
    mainWindow.maximize();

    loadLoginpage()
    // mainWindow.webContents.openDevTools()

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

}

/**
 * This function set the current active page of the mainwindow
 * to the login page. (/static/login.html)
 */
function loadLoginpage() {
    mainWindow.loadFile(__dirname + "/../static/login.html");
}

/**
 * This function set the current active page of the mainwindow
 * to the main menu (/static/main.html)
 */
function loadMainMenu() {
    mainWindow.loadFile(__dirname + "/../static/main.html");
}

/**
 * Handles a request to login the user from the Renderer process.
 * This event is usually fired by the renderer when the user clicks
 * on the "login" button.
 */
ipcMain.on("request-login", () => {
    log.info("Requested a login!");
    const assist = new LoginAssistant(mainWindow);
    assist.requestLogin((token, error) => {
        log.info("Token " + (token ? "not null" : "null") + ", Error " + (error ? "not null" : "null"));
        if (token) {
            finishLogin(token)
        } else {
            mainWindow.webContents.send("login-failure", error);
        }
    });
});

/**
 * Handles a authentication-related error, and displays a "error" box to the user
 * giving him some information about what happened. This is called when the
 * user tries to do something without being authenticated
 * (which should never happen, unless there's a bug in the app that
 * allows the user to access main.html without being logged in)
 * or if the GitHub API refuses to give us user information (again, because of
 * a bug, or if the API is down)
 * @param {string} error The error message to be displayed to the user
 */
export function authError(error: string) {
    log.error("Login/Auth Error.");
    if(error != null){
        log.error(error);
        dialog.showErrorBox("Auth Error", error);
    }
    loadLoginpage();
}

/**
 * Handles a logout event, which is usually fired by the renderer process
 * on a "logout" button press.
 * This will clear the cookies of the Electron app, logging the user
 * out of GitHub on our app for good. (Next time he'll have to re-enter
 * his credentials)
 */
ipcMain.on("logout-user", () => {
    // Clear the cookies
    mainWindow.webContents.session.clearStorageData(null, () => {});
    loadLoginpage();
})

/**
 * This function completes the login process by retrieving the user's
 * information and showing the main-menu page (see loadMainMenu}. If the
 * user information cannot be retrieved, authError is called, and the error
 * is logged to the console using console.error()
 * @async
 * @param {string} token The access token returned by the GitHub API
 */
async function finishLogin(token: string) {
    try {
        log.info("Logging in: Retrieving user information.");
        currentUser = await getUserInfo(token);
        log.info("Redirecting...");
        loadMainMenu();
    } catch(error) {
        log.error(`Something went wrong and we couldn't log you in. ${error}`);
        authError("Something went wrong and we couldn't log you in.");
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
        authError("You can't publish a file without being authenticated.");
    }
});

/**
 * This checks that "currentUser" is valid (not null and with all fields set).
 * NOTE: This will not check that the token works, this will only check
 * that it's a valid string.
 * @returns {boolean} True if the current user is valid, false otherwise.
 */
function isCurrentUserValid() : boolean {
    if(currentUser == null)
        return false;

    if((currentUser.userName == null) || (currentUser.avatar_url == null) || (currentUser.token == null))
        return false;

    return (currentUser.avatar_url !== "") && (currentUser.userName != "") && (currentUser.token !== "");
}

/**
 * Forwards the handling of the "ready" event to the "createWindow" function
 */
app.on("ready", createWindow);

/**
 * Handles the "all windows closed" event.
 * This is will quit the app on most platform, except on
 * OSX ("darwin") where it won't, because on osx it's common
 * to leave the app active until the user quits explicitly with Cmd + Q.
 */
app.on("window-all-closed", () => {
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
    log.info('A Window requested a copy of the user object');
    event.returnValue = currentUser.withoutToken();
})
