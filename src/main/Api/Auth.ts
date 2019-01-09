/**
 * @file This file contains function/classes to interact with the GitHub
 * api and log a user in.
 *
 * Note: the interaction with GitHub is done manually, and not
 * through octokit, because this is needed to handle the WebFlow login
 * correctly.
 */

import * as https from "https";
import * as querystring from "querystring";
import { BrowserWindow, dialog, Event } from "electron";
import { APIConf } from "./../../culturize.conf";
const log = require('electron-log');

/**
 * The type of the function called when the Login request has been completed.
 */
type LoginRequestCallback = (token: string, error: string) => void;

/**
 * This class assists with the sign-in process.
 */
export class LoginAssistant {

    parentWindow: BrowserWindow;

    private popup: BrowserWindow;
    private scope: string;

    /**
     * @constructor
     * @param {BrowserWindow} parent The BrowserWindow that will be used
     * as the parent of the login popup.
     */
    constructor(parent: BrowserWindow) {
        this.parentWindow = parent;
    }

    /**
     * Handles most of the login process, displaying a popup
     * containing the GitHub "log in" page.
     * @param {LoginRequestCallback} callback The callback called when the process has been completed
     * @param {string} scope The scope of the auth. Note: this needs to, at least, be of the "repo" level.
     * WARNING: We need read/write access to the user's repo for most of the functionality of the app.
     * It is recommended to leave this to it's default value: "repo".
     */
    public requestLogin(callback: LoginRequestCallback, scope: string = "repo") {
        this.scope = scope;

        // A "proxy" variable containing the "this" object,
        // to make the this object accessible in the functions
        // below.
        const me = this;


        let currentlyHandlingRequest: boolean = false;

        // Create the window object
        this.popup = new BrowserWindow({
                title: "Login with GitHub",
                width: 600,
                height: 800,
                show: false,
                alwaysOnTop: true,
                parent: this.parentWindow,
            });

        // remove the "file-options-help" bar.
        this.popup.setMenu(null);
        // Loads the URL
        this.popup.loadURL(this.getPopupURL());

        // Set event handlers
        this.popup.webContents.on("will-navigate", (event: Event, url: string) => {
            // The github redir should be to localhost, so if we try to navigate to a
            // localhost url, that's the github callback.
            if (url.includes("localhost")) {
                currentlyHandlingRequest = true;
                me.gotRedirectRequest(callback, event, url);
            }
        });

        // Shows the popup when it's ready
        this.popup.on("ready-to-show", () => {
            me.popup.show();
        });

        // Handles a redirect request
        this.popup.webContents.on("did-get-redirect-request", (event: Event, oldUrl: string, newUrl: string) => {
            // Same as above
            if (newUrl.includes("localhost")) {
                currentlyHandlingRequest = true;
                me.gotRedirectRequest(callback, event, newUrl);
            }
        });

        // Handles the closing of the window.
        this.popup.on("closed", () => {
            me.popup = null;
            if (!currentlyHandlingRequest) {
                callback(null, null);
            }
        });
    }

    /**
     * Handles the github redirection, extracting the code/error code and
     * acting appropriately based on the results.
     * @param {LoginRequestCallback} callback
     * @param {event} event The event object, currently unused so it can be left null.
     * @param {string} url The redirection URL
     */
    private gotRedirectRequest(callback: LoginRequestCallback, event: Event, url: string): void {
        log.info("Redirection URL: " + url);

        // Extract relevant information
        const raw_code = /code=([^&]*)/.exec(url) || null
        const code = (raw_code && raw_code.length > 1) ? raw_code[1] : null
        const error = /\?error=(.+)$/.exec(url)

        this.popup.destroy();

        if (code) {
            log.info(`Code Received: ${code}`);

            // Create the post data
            const postData = querystring.stringify({
                client_id : APIConf.clientID,
                client_secret : APIConf.clientSecret,
                code : code,
            });

            // Create the post request
            const post = {
                host: "github.com",
                path: "/login/oauth/access_token",
                method: "POST",
                headers:
                {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": postData.length,
                    "Accept": "application/json",
                },
            };

            // Create the request object
            const req = https.request(post, (response: any) => {
                let result = "";
                response.on("data", (data: string) => {
                    result = result + data;
                });
                response.on("end", () => {
                    const json = JSON.parse(result.toString());
                    const token: string = json.access_token;
                    if (response && (response.statusCode === 200) && (token && (token !== ""))) {
                        // Positive callback
                        callback(token, null);
                    } else {
                        let message = "Github API returned code " + response.statusCode;
                        log.info(json);
                        callback(null, message);
                    }
                });
                response.on("error", (err: any) => {
                    log.error(`request error: ${err}`)
                    callback(null, "Request error: " + err);
                });
            });
            log.info("Trying to exchange code for token..");
            // Send the request
            req.write(postData);
            req.end();
        } else if (error) {
            // Handle the case where there's no code and an errro
            log.error(`Login error : ${error}`);
            callback(null, `Login Error: ${error}`);
        } else {
            // Handle the case where both the error and the code are null
            log.error("Both the code & error are null, redirection URL must be invalid!");
            callback(null, "Invalid redirection, please try again");
        }
    }

    /**
     * Creates a Popup URL based on the Client ID and scope
     * @returns The URL
     */
    private getPopupURL(): string {
        return`https://github.com/login/oauth/authorize?client_id=${APIConf.clientID}&scope=${this.scope}`;
    }
}
