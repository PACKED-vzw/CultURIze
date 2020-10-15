/**
 * @file This file contains the ConversionResult class
 */

import { CSVRow } from "./../../common/Objects/CSVRow";

/**
 * This class encapsulates the result of a conversion process.
 * This essentially contains the data (the string) as well as some statistics
 * on how the process went.
 */
export class ConversionResult {
    // The file content
    public file: string;

    // Stats
    public numLinesRejected: number;
    public numLinesAccepted: number;

    // data
    public rows: CSVRow[];

    /**
     * @constructor
     * @param {string} file  The data (file CONTENT)
     * @param {number} rejected The number of rows rejected in the original CSV
     * @param {number} accepted The number of rows used/accepted in the original CSV
     */
    constructor(file: string, rejected: number, accepted: number, rows: CSVRow[]) {
        this.file = file;
        this.numLinesAccepted = accepted;
        this.numLinesRejected = rejected;
        this.rows = rows;
    }
}

