"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const Auth_1 = require("./main/Api/Auth");
let mainWindow;
function createWindow() {
    // Create the browser window.
    mainWindow = new electron_1.BrowserWindow({
        height: 800,
        width: 800,
    });
    mainWindow.maximize();
    //console.log('dir:' + __dirname)
    mainWindow.loadFile(__dirname + '/../static/index.html');
    // Open the DevTools.
    //mainWindow.webContents.openDevTools()
    // Emitted when the window is closed.
    mainWindow.on("closed", () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
    let assist = new Auth_1.LoginAssistant(mainWindow);
    assist.requestLogin((token, error) => {
        console.log('Token: ' + token);
        console.log('Error: ' + error);
        if (token) {
            /*
              let manager = new GitRepoManager('https://github.com/Pierre-vh/Moonshot.git',token)
              manager.updateLocalCopy(()=>{
                  console.log('job done ')
                  manager.pushChanges('some message',undefined,() => {
                      console.log('Changes Pushed')
                  })
              })
            */
        }
        else
            console.log('No token, no HTTPS url, SAD!');
    });
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electron_1.app.on("ready", createWindow);
// Quit when all windows are closed.
electron_1.app.on("window-all-closed", () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
