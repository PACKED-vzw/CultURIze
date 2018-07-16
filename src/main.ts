import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from "path";
import { LoginAssistant } from './main/Api/Auth'
import { GitRepoManager } from './main/Git/Git'
import { PublishRequest } from './common/PublishObjects'

const octokit = require('@octokit/rest')()

let mainWindow: Electron.BrowserWindow;

function createWindow() {

  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 800,
    width: 800,
  });
  mainWindow.maximize()

  //console.log('dir:' + __dirname)
  mainWindow.loadFile(__dirname + '/../static/index.html')

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

}

export class LoginRequestResult 
{
    token: string 
    error: any

    constructor(token: string, error: any)
    {
        this.token = token 
        this.error = error
    }
}

ipcMain.on('request-login', (event: Event,arg: any) => {
    console.log('Requested a login!')
    let assist = new LoginAssistant(mainWindow)
    assist.requestLogin((token,error)=>{
        console.log('Token: ' + token)
        console.log('Error: ' + error)
        if(token)
        {
          
            let manager = new GitRepoManager('https://github.com/Pierre-vh/Moonshot.git',token)
            manager.updateLocalCopy(()=>{
                console.log('job done ')
            })
          
          // Set credentials 
          octokit.authenticate({
              type:'oauth',
              token: token
          })
          // Change window
          mainWindow.loadFile(__dirname + '/../static/main.html')
        }
        else 
        {
            mainWindow.webContents.send('login-failure',error)
        }
    })
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
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

ipcMain.on('request-publishing',(event: Event, request: PublishRequest) => {
    console.log(request.csvPath + ',' + request.repoUrl + ',' + request.subdir)
})