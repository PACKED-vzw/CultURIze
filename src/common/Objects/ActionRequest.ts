import { User } from "./User";

export enum Action {
    publish,
    validate,
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
        this.timestamp = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
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
}
