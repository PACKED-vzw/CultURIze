/**
 * @file This files contain Objects related to the Publishing process :
 * The PublishRequest object and the PublishRequestResult object.
 */

import { User } from './UserObject'

/**
 * Encapsulates a request to publish a CSV file
 */
export class PublishRequest {
    csvPath: string;
    subdir: string;
    repoUrl: string;
    branch: string;
    commitMsg: string;
    prTitle: string;
    prBody : string
    user: User;

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
    constructor(csv: string, dir: string, url: string,
    branch: string, commitMsg: string, prTitle: string, prBody: string) {
        this.csvPath = csv;
        this.subdir = dir;
        this.repoUrl = url;
        this.branch = branch;
        this.commitMsg = commitMsg
        this.prTitle = prTitle;
        this.prBody = prBody;
    }

    /**
     * Checks if the user object is not null
     * @returns true if this.user is not null
     */
    public hasUser(): boolean {
        return (this.user != null);
    }

    /**
     * Checks if the csvPath is no null or empty
     * @returns true if this.csvPath is not null and not empty.
     */
    public hasSelectedFile(): boolean {
        return (this.csvPath != null) && (this.csvPath !== "");
    }
}

/**
 * This class encapsulates the result of a Publish request.
 */
export class PublishRequestResult {
    successful: boolean;
    error: string;
    numLinesAccepted: number;
    numLinesRejected: number;

    /**
     * @constructor
     * @param {boolean} successful Set to true to indicate that the process was successful, false otherwise
     * @param {string} error Set to null if no error (successful = true), else, this should contain the error message
     * @param {number} numLinesAccepted The number of lines that were used (to create the .htaccess) in the csv file
     * @param {number} numLinesRejected The number of lines that were rejected from the csv file
     */
    constructor(successful: boolean, error: string = null, numLinesAccepted: number = 0, numLinesRejected: number = 0) {
        this.successful = successful;
        this.error = error;
        this.numLinesAccepted = numLinesAccepted;
        this.numLinesRejected = numLinesRejected;
    }
}
