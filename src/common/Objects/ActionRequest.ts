import { PublishFormDefaults } from "./../../culturize.conf";
import { User } from "./User";

import path = require("path");

export enum Action {
    publish,
    validate,
    none,
}

export enum Target {
    nginx,
    apache,
}
/**
 * Encapsulates a request to publish a CSV file
 */
export class ActionRequest {
    public action: Action;
    public csvPath: string;
    public subdir: string;
    public repoUrl: string;
    public branch: string;
    public commitMsg: string;
    public prTitle: string;
    public prBody: string;
    public user: User;
    public target: Target;
    public timestamp: string;

    public advanced: boolean;
    public noSubDir: boolean;

    /**
     * Note: this constructor doesn't take the user object, because it's
     * manually filled by the main process when it passes the request along, and
     * not filled at creation of the object (which is done by the renderer process, which
     * doesn't access to the full user object)
     * @constructor
     * @param {string} csv Path to the CSV
     * @param {string} dir Subdirectory to save the .htaccess in
     * @param {string} url URL of the repo to push/pr to
     * @param {string} branch The branch to push/pr to
     * @param {string} commitMsg The message of the commit which adds the .htaccess
     * @param {string} prTitle The title of the pull request, if one is made
     * @param {string} prBody The body of the pull request, if one is made.
     */
    constructor(action: Action, csv: string, dir: string, url: string, branch: string,
                commitMsg: string, prTitle: string, prBody: string, target: Target) {
        this.action = action;
        this.csvPath = csv;
        this.subdir = dir;
        this.repoUrl = url;
        this.branch = branch;
        this.commitMsg = commitMsg;
        this.prTitle = prTitle;
        this.prBody = prBody;
        this.target = target;
        const now = new Date();
        this.timestamp = `${now.getFullYear()}-${("0" + (now.getMonth() + 1)).slice(-2)}-${("0" + now.getDate()).slice(-2)} ` +
            `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

        this.advanced = false;
        if (this.branch !== PublishFormDefaults.branch) {
            this.advanced = true;
        }
        if (this.commitMsg !== PublishFormDefaults.commitMessage) {
            this.advanced = true;
        }
        if (this.prTitle !== PublishFormDefaults.pullrequestTitle) {
            this.advanced = true;
        }
        if (this.prBody !== PublishFormDefaults.pullrequestBody) {
            this.advanced = true;
        }

        this.noSubDir = false;
        if (this.action === Action.publish && this.subdir === "") {
            this.noSubDir = true;
            this.advanced = true;
        }
    }

    public copyFrom(other: ActionRequest) {
        this.action = other.action;
        this.csvPath = other.csvPath;
        this.subdir = other.subdir;
        this.repoUrl = other.repoUrl;
        this.branch = other.branch;
        this.commitMsg = other.commitMsg;
        this.prTitle = other.prTitle;
        this.prBody = other.prBody;
        this.target = other.target;
        this.advanced = other.advanced;
        this.noSubDir = other.noSubDir;
        this.timestamp = other.timestamp;
    }

    public loadData(data: { [index: string]: any}) {
        this.csvPath = data.csvPath;
        this.subdir = data.subdir;
        this.repoUrl = data.repoUrl;
        this.branch = data.branch;
        this.commitMsg = data.commitMsg;
        this.prTitle = data.prTitle;
        this.prBody = data.prBody;
        this.target = data.forApache ? Target.apache : Target.nginx;
        this.advanced = data.advanced;
        this.noSubDir = data.noSubDir;
        this.timestamp = data.timestamp;
    }

    public dumpData(): { [index: string]: any} {
        const data: { [index: string]: any} = {};

        data.csvPath = this.csvPath;
        data.filename = path.basename(this.csvPath);
        data.subdir = this.subdir;
        data.repoUrl = this.repoUrl;
        data.branch = this.branch;
        data.commitMsg = this.commitMsg;
        data.prTitle = this.prTitle;
        data.prBody = this.prBody;
        data.forApache = this.target === Target.apache ? true : false;
        data.advanced = this.advanced;
        data.noSubDir = this.noSubDir;
        data.timestamp = this.timestamp;

        return data;
    }

    /**
     * Checks if the user object is not null
     * @returns true if this.user is not null
     */
    public hasUser(): boolean {
        return (this.user !== undefined && this.user != null);
    }

    /**
     * Checks if the csvPath is no null or empty
     * @returns true if this.csvPath is not null and not empty.
     */
    public hasSelectedFile(): boolean {
        return (this.csvPath != null) && (this.csvPath !== "");
    }

    public hasSameArguments(other: ActionRequest): boolean {
        if (this.csvPath === other.csvPath &&
            this.subdir === other.subdir &&
            this.repoUrl === other.repoUrl &&
            this.branch === other.branch &&
            this.commitMsg === other.commitMsg &&
            this.prTitle === other.prTitle &&
            this.prBody === other.prBody &&
            this.target === other.target) {
            return true;
        } else {
            return false;
        }
    }
}
