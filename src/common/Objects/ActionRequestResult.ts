import { Action } from "./../../common/Objects/ActionRequest";

/**
 * This class encapsulates the result of an Action request.
 */
export class ActionRequestResult {
    public action: Action;
    public successful: boolean;
    public error: string;
    public reportPath: string;
    public numLinesAccepted: number;
    public numLinesRejected: number;

    /**
     * @constructor
     * @param {Action} action The action that was performed
     * @param {boolean} successful Set to true to indicate that the process was successful, false otherwise
     * @param {string} error Set to null if no error (successful = true), else, this should contain the error message
     * @param {number} numLinesAccepted The number of lines that were used (to create the .htaccess) in the csv file
     * @param {number} numLinesRejected The number of lines that were rejected from the csv file
     */
    constructor(action: Action, successful: boolean, error: string = null, reportPath: string = "",
                numLinesAccepted: number = 0, numLinesRejected: number = 0) {
        this.action = action;
        this.successful = successful;
        this.error = error;
        this.reportPath = reportPath;
        this.numLinesAccepted = numLinesAccepted;
        this.numLinesRejected = numLinesRejected;
    }
}

