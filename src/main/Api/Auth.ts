// This files manages the logic for authenticating the user
// in the Culturize app.

// Note: This does not attempt to avoid the GitHub rate
// limit. If the app ends up being too popular
// and exceeds the rate limit frequently, modifications
// will be needed to avoid requests whenever possible.

import * as https from "https";
import * as querystring from "querystring";
import { BrowserWindow, dialog, Event } from "electron";
import { ApiConf } from "./ApiConf";

type LoginRequestCallback = (token: string, error: RegExpExecArray) => void;

// This class drives the login
// process, which includes showing a
// login popup to the user.
export class LoginAssistant {
    public parentWindow: BrowserWindow;
    private popup: BrowserWindow;
    private scope: string = "repo";

    constructor(parent: BrowserWindow) {
        this.parentWindow = parent;
    }

    // Shows the login popup, takes a
    // callback as argument which is called
    // once the request has been completed.
    public requestLogin(callback: LoginRequestCallback, scope: string = "repo") {
        this.scope = scope;

        const me = this;
        let currentlyHandlingRequest: boolean = false;
        this.popup = new BrowserWindow({
                title: "Login with GitHub",
                width: 600,
                height: 800,
                show: false,
                alwaysOnTop: true,
                parent: this.parentWindow,
            });
        this.popup.setMenu(null);
        this.popup.loadURL(this.getPopupURL());
        // Set callbacks
        this.popup.webContents.on("will-navigate", (event: Event, url: string) => {
            if (url.includes("localhost")) {
                currentlyHandlingRequest = true;
                me.gotRedirectRequest(callback, event, url);
            }
        });
        this.popup.on("ready-to-show", () => {
            me.popup.setMenu(null);
            me.popup.show();
        });
        this.popup.webContents.on("did-get-redirect-request", (event: Event, oldUrl: string, newUrl: string) => {
            if (newUrl.includes("localhost")) {
                currentlyHandlingRequest = true;
                me.gotRedirectRequest(callback, event, newUrl);
            }
        });
        this.popup.on("closed", () => {
            me.popup = null;
            if (!currentlyHandlingRequest) {
                callback(null, null);
            }
        });
    }

    private gotRedirectRequest(callback: LoginRequestCallback, event: Event, newUrl: string): void {
        console.log("Redirection URL: " + newUrl);
        // Extract relevant information
        const raw_code = /code=([^&]*)/.exec(newUrl) || null
        const code = (raw_code && raw_code.length > 1) ? raw_code[1] : null
        const error = /\?error=(.+)$/.exec(newUrl)

        this.popup.destroy();

        if (code) {
            console.log("Code Received: " + code);

            const postData = querystring.stringify({
                client_id : ApiConf.clientID,
                client_secret : ApiConf.clientSecret,
                code : code,
            });

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

            const req = https.request(post, (response: any) => {
                let result = "";
                response.on("data", (data: string) => {
                    result = result + data;
                });
                response.on("end", () => {
                    const json = JSON.parse(result.toString());
                    // console.log("Access Token Successfuly Received: " + json.access_token);
                    const token: string = json.access_token;
                    if (response && (response.statusCode === 200) && (token && (token !== ""))) {
                        // Positive callback
                        callback(token, null);
                    } else {
                        dialog.showErrorBox("Authentication Error",
                        `
                            Sorry, something went wrong while trying to log you in.
                            (GitHub API ${response.statusCode}).
                        `);
                        console.log(json);
                        callback(null, null);
                    }
                });
                response.on("error", (err: any) => {
                    dialog.showErrorBox("Authentication Error",
                    `
                        Sorry, something went wrong while trying to log you in.
                        (GitHub OAuth Request Error: ${err}).
                    `);
                    // Negative callback
                    callback(null, err);
                });
            });
            console.log("Trying to exchange code for token..");
            req.write(postData);
            req.end();
        } else if (error) {
            dialog.showErrorBox("Authentication Error",
            `
                Sorry, something went wrong while trying to log you in.
                Please try again.
            `);
            // Negative callback
            callback(null, error);
        } else {
            console.error("Critical error: Both the error & code are null");
            // Critical failure callback
            callback(null, null);
        }
    }

    private getPopupURL(): string {
        return`https://github.com/login/oauth/authorize?client_id=${ApiConf.clientID}&scope=${this.scope}`;
    }
}
