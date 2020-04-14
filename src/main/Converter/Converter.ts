/**
 * @file This file contains the functions/classes used to generate a .htaccess
 * file from a .csv file.
 */

const csv_parser = require("csv-parse");
const fs = require("fs");
const log = require('electron-log');

import { CSVConf, HTAccessConf } from "./../../culturize.conf";

/**
 * This is a function type used by createArrayFromCSV which is
 * called when the function accepts a row and pushes it to the resulting array.
 */
type OnAcceptRow = (row: CSVRow) => void;

/**
 * This is a function type used by createArrayFromCSV which is
 * called when the function rejects a row (insufficiant/incompatible data)
 */
type OnRejectRow = (row: CSVRow) => void;

/**
 * This class contains the relevant data of a CSV file row. This is usually
 * used in arrays.
 */
export class CSVRow {
    /**
     * Creates an array of CSVRow objects from a file "filepath".
     *
     * @static
     * @returns a Promise, resolved with the result on success, rejected with an error message on error.
     * @param {string} filepath The path to the .csv file
     * @param {OnAcceptRow} rowAccept The function that will be called when a row is accepted
     *                      (= satisfies every requirement) and pushed to the array.
     * @param {OnRejectRow} rowReject The function that will be called when a row is rejected
     *                      (= insufficient/incompatible data)
     */
    public static createArrayFromCSV(filepath: string, rowAccept: OnAcceptRow,
                                     rowReject: OnRejectRow): Promise<CSVRow[]> {
        return new Promise<CSVRow[]>((resolve, reject) => {
            // Read the file to a buffer
            const str: string = fs.readFileSync(filepath, "utf8");

            // Create the array
            const array: CSVRow[] = new Array<CSVRow>();

            // Check if the file isn't empty
            if (str.length === 0) {
                reject("The file is empty");
                return;
            }

            // Create the parser instance
            // See all options at http://csv.adaltas.com/parse/#parser-options
            const parser = csv_parser(
                {
                    // Set columns to true, which makes the parser treat
                    // the first row of the .csv as the column names.
                    columns: true,

                    // Makes the parser discard
                    // inconsistent column count instead of crashing
                    relax_column_count: true,
                });

            // Set the functions that handles the parsing process
            parser.on("readable", () => {
                let data: any;
                while (data = parser.read()) {
                    const row: CSVRow = CSVRow.createRow(data);
                    if (row != null) {
                        // If it isn't null, check the 'legality'/validity of the row
                        const validity = row.isValid();
                        if (validity != null) {
                            rowReject(row);
                            if (!CSVConf.IGNORE_ON_INVALID_DATA) {
                                log.warn("The CSV file contains invalid data:" + validity);
                                reject(validity);
                                break;
                            }
                        } else {
                            // We're good, push
                            rowAccept(row);
                            array.push(row);
                        }
                    } else {
                        rowReject(row);
                    }
                }
            });

            // Sets the function that handles errors
            parser.on("error", (err: any) => {
                log.error(`Error while parsing the CSV file: ${err}`);
                reject("Error while parsing the CSV file");
            });

            // Sets the function that finishes the parsing
            // process
            parser.on("finish", () => {
                if (array.length === 0) {
                    log.error("No valid row found in the CSV File.");
                    reject("No valid row found in the CSV File.");
                    return;
                } else {
                    // If the array contains something, check it for
                    // duplicates
                    CSVRow.checkArrayForDuplicates(array)
                        .then(() => {
                            resolve(array);
                        })
                        .catch((reason: string) => {
                            reject(reason);
                        });
                }
            });

            // Send the .csv data to the parser & trigger the
            // parsing.
            parser.write(str);
            parser.end();
        });
    }

    /**
     * Creates a CSVRow instance from a (presumed valid) row of data.
     * @param {any} row The row of data
     * @returns The instance, or null if the row of data is invalid/incomplete or disabled.
     */
    public static createRow(row: any): CSVRow {
        if (this.satisfiesMinimumRequirements(row) && this.isEnabled(row)) {
            return new CSVRow(
                row[CSVConf.COL_PID],
                row[CSVConf.COL_DOCTYPE],
                row[CSVConf.COL_URL],
            );
        }
        return null;
    }

    /**
     *
     * Helper function that checks a CSVRow array for duplicate redirections.
     *
     * @static
     * @returns A promise, resolved if the array contains no duplicates, rejected with
     * an error message if it contains duplicates.
     * @param {CSVRow[]} array The array to be checked
     */
    private static checkArrayForDuplicates(array: CSVRow[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const redirs = new Array<string>();

            // Iterate over the array, and populate the "redirs" array
            // with strings of the form element.docType + '/' + element.pid
            for (const element of array) {
                let tmp: string = element.docType + "/" + element.pid;

                // If the redirections are going to be case insensitive,
                // compare all the redirections in uppercase.
                // If we ignored this step, we could generate false positives,
                // claiming that the array doesn't contain duplicate redirections
                // while it does.
                if (HTAccessConf.caseInsensitiveRedirs) {
                    tmp = tmp.toUpperCase();
                }

                redirs.push(tmp);
            }

            // Sort the array
            redirs.sort();

            // Check if there's a place where the (element before) === (element after)
            const duplicates = new Array<string>();
            const redirsLength = redirs.length;
            for (let k = 0; k < redirsLength - 1; k++) {
                if (redirs[k] === redirs[k + 1]) {
                    duplicates.push(redirs[k]);
                }
            }

            // Check if the duplicates contains anything
            if (duplicates.length !== 0) {
                // Create a "diagnostic" string that contains every duplicate
                let diagStr: string = "Duplicate redirections found: ";
                for (const duplicate of duplicates) {
                    log.error(`Duplicate redirection of ${duplicate}`);
                    diagStr += duplicate + ", ";
                }
                reject(diagStr);
                return;
            }

            // If we passed every check, we are good!
            resolve();
        });
    }

    /**
     * Checks if a row of data satisfies the minimum requirements to form a
     * valid CSVRow instance.
     *
     * A Row is considered valid if the PID, URL and document type aren't null or empty.
     * Note that document type may be null/empty if the ALLOW_NO_DOCTYPE is set to true.
     *
     * @static
     * @param {any} row The row of data to be checked
     * @returns True if the row is valid, false otherwise.
     */
    private static satisfiesMinimumRequirements(row: any): boolean {
        /**
         * Helper function that checks if a key in the row is not null or empty.
         * @param {string} key The key to be checked in the row
         * @returns True if the key is valid, false otherwise
         */
        const isValid = (key: string): boolean => {
            const data = row[key];
            return (data != null) && (data !== "");
        };
        return isValid(CSVConf.COL_PID) && isValid(CSVConf.COL_URL)
                && (isValid(CSVConf.COL_DOCTYPE) || CSVConf.ALLOW_NO_DOCTYPE);
    }

    /**
     * Checks if a row of data should be enabled or not.
     *
     * A row is enabled in all cases, except if the COL_ENABLED field is
     * present and set to 0.
     * @static
     * @param {any} row The row to be checked
     * @returns true if the row should be enabled, false otherwise.
     */
    private static isEnabled(row: any): boolean {
        const value: string = row[CSVConf.COL_ENABLED];
        if ((value != null) && (value === "0")) {
            return false;
        }
        return true;
    }

    // Members
    public pid: string;
    public docType: string;
    public url: string;

    /**
     * The constructor of the class, which is private so it can
     * only be used by the factory method createRow.
     * @constructor
     * @param {string} pid The value of the PID field
     * @param {string} docType The value of the Document Type field
     * @param {string} url The value of the URL Field
     */
    private constructor(pid: string, docType: string, url: string) {
        this.pid = pid.trim();
        if (docType != null) {
            this.docType = docType.trim();
        } else {
            this.docType = "";
        }
        // Replace "%" with "\%" to prohibit apache from
        // recognizing it as a regex substitution argument.
        this.url = url.trim().replace("%", "\\%");
    }

    /**
     * Helper function that checks if a CSVRow instance contains
     * valid data.
     *
     * @returns null if the row is valid, or an error message if it isn't.
     */
    private isValid(): string {
        /**
         * Checks if a string obeys the "^([a-z]|[A-Z]|[0-9]|-|_)+$"
         * regular expression.
         *
         * TL;DR: The string can only contains uppercase/lowercase letters, numbers, dashes and underscores.
         * @param {string} text The string to be checked
         * @returns True if the string is considered valid, false otherwise.
         */
        const fn = (text: string): boolean => {
            return /^([a-z]|[A-Z]|[0-9]|-|_)+$/.test(text);
        };

        // Check if the doctype isn't empty
        if (this.docType !== "") {
            // If the document type is not empty, check if it's recognized by the Regular Expression.
            // If it isn't, we have an error.
            if (!fn(this.docType)) {
                return "The document type \"" + this.docType + "\" contains invalid characters";
            }
        // If the doctype is empty, check if it's allowed. If it isn't -> error.
        } else if (!CSVConf.ALLOW_NO_DOCTYPE) {
            return "No document type in row";
        }

        // Check the PID.
        if (!fn(this.pid)) {
            return "The PID \"" + this.pid + "\" contains invalid characters";
        }

        // If we passed all the checks, return "null" (for success)
        return null;
    }
}

/**
 * This class manages the nginx configuration file creation
 * process from a CSVRow[]
 */
export class NginxConfCreator {
    private csvArray: CSVRow[];

    /**
     * @constructor
     * @param {CSVRow[]} csvArray The array that will be converted to nginx config
     */
    constructor(csvArray: CSVRow[]) {
        this.csvArray = csvArray;
    }

    /**
     * Compiles the array to nginx config
     * @returns The nginx config file content
     */
    public makeNginxConfFile(): string {
        // Create the header
        let data: string = "";

        // Create the RewriteRule for each CSVRow
        for (const row of this.csvArray) {
            data += this.getRewriteRule(row) + "\n";
        }

        return data;
    }

    /**
     * Creates a nginx "RewriteRule" from a CSVRow.
     *
     * @param {CSVRow} row The row
     * @returns The string containing the RewriteRule
     */
    private getRewriteRule(row: CSVRow): string {
        if (row.pid === "" || row.url === "") {
            return "";
        }

        // Create redirection
        let redir: string = "";
        if (row.docType !== "") {
            redir = row.docType + "/" + row.pid;
        } else {
            redir = row.pid;
        }
        return `rewrite ^/${redir}$ ${row.url} redirect ;`;
    }
}

/**
 * This class manages the HTAccess file creation
 * process from a CSVRow[]
 */
export class HTAccessCreator {
    private csvArray: CSVRow[];

    /**
     * @constructor
     * @param {CSVRow[]} csvArray The array that will be converted to .htaccess
     */
    constructor(csvArray: CSVRow[]) {
        this.csvArray = csvArray;
    }

    /**
     * Compiles the array to .htaccess
     * @returns The .htaccess file content
     */
    public makeHTAccessFile(): string {
        // Create the header
        let data: string = this.getHeader() + "\n\n";

        // Create the RewriteRule for each CSVRow
        for (const row of this.csvArray) {
            data += this.getRewriteRule(row) + "\n";
        }

        return data;
    }

    /**
     * Helper function that creates the header for the .htaccess file.
     * @returns the string containing the header
     */
    private getHeader(): string {
        return "Options +FollowSymLinks\nRewriteEngine on";
    }

    /**
     * Creates a .htaccess "RewriteRule" from a CSVRow.
     *
     * @param {CSVRow} row The row
     * @returns The string containing the RewriteRule
     */
    private getRewriteRule(row: CSVRow): string {
        if (row.pid === "" || row.url === "") {
            return "";
        }

        // Create options
        let options: string = "R=" + HTAccessConf.redirectionCode;
        if (HTAccessConf.caseInsensitiveRedirs) {
            options += ",NC";
        }
        if (HTAccessConf.noEscape) {
            options += ",NE";
        }
        options += ",L";

        // Create redirection
        let redir: string = "";
        if (row.docType !== "") {
            redir = row.docType + "/" + row.pid;
        } else {
            redir = row.pid;
        }
        return `RewriteRule ^${redir}$ ${row.url} [${options}]`;
    }
}

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

    /**
     * @constructor
     * @param {string} file  The data (file CONTENT)
     * @param {number} rejected The number of rows rejected in the original CSV
     * @param {number} accepted The number of rows used/accepted in the original CSV
     */
    constructor(file: string, rejected: number, accepted: number) {
        this.file = file;
        this.numLinesAccepted = accepted;
        this.numLinesRejected = rejected;
    }
}

/**
 * This function orchestrates the conversion process. You give it
 * a path to a .csv file as input ("filepath"), and if everything
 * goes right it'll return back a response object (ConversionResult)
 * containing the .htaccess file content.
 * @param {string} filepath The path to the .csv rile
 * @param {boolean} forApache Flag to see if configuration for apache or nginx is requested
 * @returns a Promise of a ConversionResult, resolved on success, rejected with an error message
 * on error.
 */
export function convertCSVtoWebConfig(filepath: string, forApache: boolean): Promise<ConversionResult> {
    return new Promise<ConversionResult>((resolve, reject) => {
        // Counters
        let numAccepted: number = 0;
        let numRejected: number = 0;

        // Create the array
        CSVRow.createArrayFromCSV(filepath,
        // Acceptation
        () => {
            numAccepted++;
        },
        // Rejection
        (row: CSVRow) => {
            numRejected ++;
        })
        .then((value: CSVRow[]) => {
                if (forApache) {
                    const creator = new HTAccessCreator(value);
                    resolve(new ConversionResult(creator.makeHTAccessFile(), numRejected, numAccepted));
                } else {
                    const creator = new NginxConfCreator(value);
                    resolve(new ConversionResult(creator.makeNginxConfFile(), numRejected, numAccepted));
                }
            })
        .catch((error: string) => {
            reject(error);
        });
    });
}
