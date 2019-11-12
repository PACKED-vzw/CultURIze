/**
 * @file This file contains function used by the main.html
 */
import { ipcRenderer, remote } from "electron";
import { PublishRequest } from "./../../common/Objects/PublishObjects";
const dialog = remote.dialog;

/**
 * The type of the callback that's called when the user is done
 * looking for a file (dialog box is closed)
 *
 * The first arg is the path to the file (maybe null)
 *
 * The second arg is the error message, if applicable (maybe null)
 */
type FileFoundCallback = (filepath: string, errorMsg: string) => void;

/**
 * This function will open the "Search for file" window.
 * It is asynchronous, and the callback is called when the operation is done.
 * @async
 * @param {FileFoundCallback} callback The callback called when the dialog window is closed (the user is done)
 */
export async function lookForFile(callback: FileFoundCallback) {
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
                if (files.length > 1) {
                    callback(null, "Too many files selected!");
                } else if (files.length === 1) {
                    callback(files[0], "");
                }
            } else {
                callback(null, "No file selected!");
            }
        },
    );
}

/**
 * Initiates the publishing process. Usually called by the javascript
 * code in main.html
 * @param {string} filepath The CSV file to be converted
 * @param {string} subdir   Subdirectory (optional)
 * @param {string} repoUrl  GitHub repo URL
 * @param {string} branch   GitHub branch to use
 * @param {string} commitMsg GitHub commit message
 * @param {string} prTitle  GitHub Pull Request title
 * @param {string} prBody   GitHub Pull Request body.
 */
export function publish(filepath: string, subdir: string, repoUrl: string, branch: string,
                        commitMsg: string, prTitle: string, prBody: string, forApache: boolean) {
   ipcRenderer.send("request-publishing",
                    new PublishRequest(filepath, subdir, repoUrl, branch,
                                       commitMsg, prTitle, prBody, forApache));
}
