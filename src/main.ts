// This file is then entry point of the app and handles
// most ipc event coming from the renderer process.
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { PublishRequest } from "./common/Objects/PublishObjects";
import { LoginAssistant } from "./main/Api/Auth";
import { publish } from "./main/Publishing/Publishing";
import { getUserInfo } from "./main/Api/User";
import { User } from "./common/Objects/UserObject";
const octokit = require("@octokit/rest")();
export let mainWindow: BrowserWindow;

// The current authenticated user. If this is null
// the user is considered not authenticated.
let currentUser: User = null;

// This function is called by the app when it is ready
// to create the window.
function createWindow() {
    mainWindow = new BrowserWindow({
        height: 800,
        width: 800,
    });
    //mainWindow.setMenu(null);
    mainWindow.maximize();

    loadLoginpage()
    // mainWindow.webContents.openDevTools()

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

}

// Loads the login page
function loadLoginpage() {
    mainWindow.loadFile(__dirname + "/../static/login.html");
}

// Loads the main menu
function loadMainMenu() {
    mainWindow.loadFile(__dirname + "/../static/main.html");
}

// Handle login requests
ipcMain.on("request-login", (event: Event, arg: any) => {
    console.log("Requested a login!");
    const assist = new LoginAssistant(mainWindow);
    assist.requestLogin((token, error) => {
        console.log("Token: " + token);
        console.log("Error: " + error);
        if (token) {
            handleLogin(token)
        } else {
            mainWindow.webContents.send("login-failure", error);
        }
    });
});

// Handles an error related to the authentication of the user,
// and redirects him to the login page.
ipcMain.on("auth-error", (event: Event, error: string) => {
    console.error("Authentication Error!");
    console.error(error);
    if(!error)
        error = "Sorry, something went wrong! (Unknown reason)";
    authError(error);
})

// Handles a login error, displaying a error box
// if a message is available. This will bring the user
// back to the login page.
export function authError(error: string) {
    console.error("Login/Auth Error.");
    if(error != null){
        console.error(error);
        dialog.showErrorBox("Auth Error", error);
    }
    loadLoginpage();
}

// Handles a "logout" button press, clearing the cookies to logout
// the user for good.
ipcMain.on("logout-user", () => {
    // Clear the cookies
    mainWindow.webContents.session.clearStorageData(null, () => {});
    loadLoginpage();
})

// Handles the login process, switching the current view to the main menu and
// setting the current user.
async function handleLogin(token: string) {
    try {
        console.log("Logging in: Retrieving user information.");
        currentUser = await getUserInfo(token);
        console.log("Redirecting...");
        loadMainMenu();
    } catch(error) {
        console.error(error);
        authError("Something went wrong and we couldn't log you in.");
    }
}

// Handle publishing requests
ipcMain.on("request-publishing", (event: Event, request: PublishRequest) => {
    // If the current logged in user is valid, proceed.
    if (isUserValid(currentUser)) {
        console.log("Current user is valid, calling publish().");
        // Complete the request with the user
        request.user = currentUser;
        // Proceed
        publish(request);
    } else {
        console.error("Aborting publishing process because the current user is invalid.");
        // Else, the user is not valid, request him to login again
        authError("You can't publish a file without being authenticated.");
    }
});

// Checks if the current user is valid.
function isUserValid(user: User) : boolean {
    if(user == null)
        return false; 
    
    if((user.userName == null) || (user.avatar_url == null) || (user.token == null))
        return false;

    return (user.avatar_url !== "") && (user.userName != "") && (user.token !== ""); 
}

// app-specific events
app.on("ready", createWindow);

app.on("window-all-closed", () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});


// This is called by webpages when they want a copy
// of the user object. We always send a copy without
// the token.
ipcMain.on("get-user-object", (event: any) => {
    console.log('A Window requested a copy of the user object');
    event.returnValue = currentUser.withoutToken();
})

