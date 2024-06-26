/**
 * @file This file contains the csv parsing functionality
 */

import * as csv_parser from "csv-parse";
import * as fs from "fs";

import { CSVRow } from "./../../common/Objects/CSVRow";
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
export async function createArrayFromCSV(filepath: string,
                                         rowAccept: OnAcceptRow,
                                         rowReject: OnRejectRow,
                                         allowDuplicates: boolean = false): Promise<CSVRow[]> {
    return new Promise<CSVRow[]>((resolve, reject) => {
        // Read the file to a buffer
        const str: string = fs.readFileSync(filepath, "utf8").replace("\r\n", "\n");

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
                delimiter: [",", ";"],
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
            data = parser.read();
            while (data) {
                const row: CSVRow = CSVRow.createRow(data);
                if (row != null) {
                    // If it isn't null, check the 'legality'/validity of the row
                    if (!row.isValidAndEnabled()) {
                        rowReject(row);
                        if (!CSVConf.IGNORE_ON_INVALID_DATA) {
                            reject(row.error);
                            break;
                        }
                    } else {
                        // We're good, push
                        rowAccept(row);
                    }
                    array.push(row);
                } else {
                    rowReject(row);
                }
                data = parser.read();
            }
        });

        // Sets the function that handles errors
        parser.on("error", (err: any) => {
            reject("Error while parsing the CSV file");
        });

        // Sets the function that finishes the parsing
        // process
        parser.on("end", () => {
            if (array.length === 0) {
                reject("No valid row found in the CSV File.");
                return;
            } else {
                // If the array contains something, check it for
                // duplicates
                if (checkArrayForDuplicates(array)) {
                    if (allowDuplicates) {
                        resolve(array);
                    } else {
                        reject("Duplicates found, validate CSV first!");
                    }
                } else {
                    resolve(array);
                }
            }
        });

        // reset row count in CSVRow class to 2
        // first row containing data is at row 2 of the csv sheet, because of header
        CSVRow.count = 2;
        // Send the .csv data to the parser & trigger the
        // parsing.
        parser.write(str);
        parser.end();
    });
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
function checkArrayForDuplicates(array: CSVRow[]): boolean {
    class Row {
        public name: string;
        public csvRow: CSVRow;

        constructor(row: CSVRow) {
            this.name = row.docType + "/" + row.pid;
            this.csvRow = row;
        }
    }
    const redirs = new Array<Row>();
    // Iterate over the array, and populate the "redirs" array
    // with strings of the form element.docType + '/' + element.pid
    for (const element of array) {
        if (!element.isValidAndEnabled()) {
            continue;
        }
        const row = new Row(element);

        // If the redirections are going to be case insensitive,
        // compare all the redirections in uppercase.
        // If we ignored this step, we could generate false positives,
        // claiming that the array doesn't contain duplicate redirections
        // while it does.
        if (HTAccessConf.caseInsensitiveRedirs) {
            row.name = row.name.toUpperCase();
        }

        redirs.push(row);
    }

    function compare(firstEl: Row, secondEl: Row): number {
        if (firstEl.name < secondEl.name) {
            return -1;
        } else if (firstEl.name === secondEl.name) {
            return 0;
        } else {
            return 1;
        }
    }

    // Sort the array
    redirs.sort(compare);

    // Check if there's a place where the (element before) === (element after)
    const duplicates = new Array<Row>();
    const redirsLength = redirs.length;
    for (let k = 0; k < redirsLength - 1; k++) {
        if (redirs[k].name === redirs[k + 1].name) {
            redirs[k].csvRow.markAsDuplicateOf(redirs[k + 1].csvRow.index);
            redirs[k + 1].csvRow.markAsDuplicateOf(redirs[k].csvRow.index);
            duplicates.push(redirs[k]);
        }
    }

    // Check if the duplicates contains anything
    if (duplicates.length !== 0) {
        return true;
    }

    // If we passed every check, we are good!
    return false;
}
