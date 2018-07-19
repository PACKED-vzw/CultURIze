// This file contains the functions & variables
// used by the main menu page.

import { ipcRenderer, remote } from "electron";
import { PublishRequest } from "./../../common/Objects/PublishObjects";
const dialog = remote.dialog;

type FileFoundCallback = (filepath: string, errorMsg: string) => void;

// Opens the prompt for the user to look for a file
// The prompt window will be attached to the current window, which should
// be the main window.
// The callback's first arg will be null on error, and the error message
// will be contained in the second arg.
export function lookForFile(callback: FileFoundCallback) {
    const currentWindow = remote.getCurrentWindow();
    dialog.showOpenDialog(
        currentWindow,
        {
            title: "Select a .csv file",
            filters: [
                {
                    name: "Comma-separated values",
                    extensions: ["csv"],
                },
            ],
            properties: ["openFile"],
        },
        (files: string[]) => {
            if (files) {
                if (files.length !== 1) {
                    callback(null, "Too many files selected!");
                } else {
                    callback(files[0], "");
                }
            } else {
                callback(null, "No file selected!");
            }
        },
    );
}

// This function is called to initiate a publish process. It fires an IPC event,
// and returns immediatly. You can handle the result of the publish request by
// handling the finished-publishing event.
export function publish(filepath: string, subdir: string, repoUrl: string, branch: string, commitMsg: string, prTitle: string, prBody: string) {
   ipcRenderer.send("request-publishing", new PublishRequest(filepath, subdir, repoUrl, branch, commitMsg, prTitle, prBody ));
}