// This file is then entry point of the app and handles
// most ipc event coming from the renderer process.
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { PublishRequest } from "./common/PublishObjects";
import { LoginAssistant } from "./main/Api/Auth";
import { publish } from "./main/Publishing";

export let mainWindow: BrowserWindow;

// The current token of the
// authenticated user. If this is null
// the user is not authenticated.
let currentToken: string = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        height: 800,
        width: 800,
    });
    mainWindow.setMenu(null);
    mainWindow.maximize();

    mainWindow.loadFile(__dirname + "/../static/index.html");
    // mainWindow.webContents.openDevTools()

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

}

// Handle login requests
ipcMain.on("request-login", (event: Event, arg: any) => {
    console.log("Requested a login!");
    const assist = new LoginAssistant(mainWindow);
    assist.requestLogin((token, error) => {
        console.log("Token: " + token);
        console.log("Error: " + error);
        if (token) {
            currentToken = token;
            mainWindow.loadFile(__dirname + "/../static/main.html");
          } else {
              mainWindow.webContents.send("login-failure", error);
        }
    });
});

// Handle publishing requests
ipcMain.on("request-publishing", (event: Event, request: PublishRequest) => {
    // If the token is not null, proceed, else, display an error
    if ((currentToken != null) && (currentToken !== "")) {
        // Complete the request with the token
        request.token = currentToken;
        // Proceed
        publish(request);
    } else {
        dialog.showErrorBox("Forbidden action"
        , "You can't publish a file without being authenticated.");
        // todo: send ipc event 'publish-done' with an error message.
    }
});

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
