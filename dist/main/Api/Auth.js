"use strict";
// This files manages the logic for authenticating the user
// in the Culturize app.
Object.defineProperty(exports, "__esModule", { value: true });
// Note: This does not attempt to avoid the GitHub rate
// limit. If the app ends up being too popular
// and exceeds the rate limit frequently, modifications
// will be needed to avoid requests whenever possible.
var querystring = require('querystring');
var https = require("https");
const electron_1 = require("electron");
const ApiConf_1 = require("./ApiConf");
// This class drives the login
// process, which includes showing a 
// login popup to the user.
class LoginAssistant {
    constructor(parent) {
        this.parentWindow = parent;
    }
    // Shows the login popup, takes a 
    // callback as argument which is called
    // once the request has been completed.
    requestLogin(callback, scope = '...') {
        this.scope = scope;
        let me = this;
        let currentlyHandlingRequest = false;
        this.popup = new electron_1.BrowserWindow({
            title: 'Login with GitHub',
            width: 600,
            height: 800,
            show: false,
            alwaysOnTop: true,
            parent: this.parentWindow,
            titleBarStyle: 'hidden',
        });
        this.popup.loadURL(this.getPopupURL());
        // Set callbacks
        this.popup.webContents.on('will-navigate', function (event, url) {
            if (url.includes('localhost')) {
                currentlyHandlingRequest = true;
                me.gotRedirectRequest(callback, event, url);
            }
        });
        this.popup.on('ready-to-show', function () {
            me.popup.setMenu(null);
            me.popup.show();
        });
        this.popup.webContents.on('did-get-redirect-request', function (event, oldUrl, newUrl) {
            if (newUrl.includes('localhost')) {
                currentlyHandlingRequest = true;
                me.gotRedirectRequest(callback, event, newUrl);
            }
        });
        this.popup.on('closed', function () {
            me.popup = null;
            if (!currentlyHandlingRequest)
                callback(null, null);
        });
    }
    gotRedirectRequest(callback, event, newUrl) {
        console.log('Redirection URL: ' + newUrl);
        // Extract relevant information
        let raw_code = /code=([^&]*)/.exec(newUrl) || null, code = (raw_code && raw_code.length > 1) ? raw_code[1] : null, error = /\?error=(.+)$/.exec(newUrl);
        this.popup.destroy();
        if (code) {
            console.log('Code Received: ' + code);
            let postData = querystring.stringify({
                "client_id": ApiConf_1.ApiConf.client_id,
                "client_secret": ApiConf_1.ApiConf.client_secret,
                "code": code
            });
            let post = {
                host: "github.com",
                path: "/login/oauth/access_token",
                method: "POST",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length,
                    "Accept": "application/json"
                }
            };
            let req = https.request(post, (response) => {
                let result = '';
                response.on('data', (data) => {
                    result = result + data;
                });
                response.on('end', () => {
                    let json = JSON.parse(result.toString());
                    //console.log("Access Token Successfuly Received: " + json.access_token);
                    let token = json.access_token;
                    if (response && (response.statusCode == 200) && (token && (token != ''))) {
                        // Positive callback
                        callback(token, null);
                    }
                });
                response.on('error', (err) => {
                    electron_1.dialog.showErrorBox('Authentication Error', `
                        Sorry, something went wrong while trying to log you in.
                        (GitHub OAuth Request Error: ${err}).
                    `);
                    // Negative callback
                    callback(null, err);
                });
            });
            req.write(postData);
            req.end();
        }
        else if (error) {
            electron_1.dialog.showErrorBox('Authentication Error', `
                Sorry, something went wrong while trying to log you in.
                Please try again.
            `);
            // Negative callback
            callback(null, error);
        }
        else {
            console.error('Critical error: Both the error & code are null');
            // Critical failure callback
            callback(null, null);
        }
    }
    getPopupURL() {
        return `https://github.com/login/oauth/authorize?client_id=${ApiConf_1.ApiConf.client_id}&scope=${this.scope}`;
    }
}
exports.LoginAssistant = LoginAssistant;
