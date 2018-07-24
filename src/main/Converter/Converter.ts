// This is the file charged with converting
// .csv files to .htaccess files

// Potential Area of Improvements:
    // Make the .htaccess generation more complete by generating multiple files
    // for each document type, and store each of theses files in another folder.
    // This can speed up the redirection time by 2x, at the cost of creating 2 more files.

const csv_parser = require("csv-parse");
const fs = require("fs");

import { CSVConf, HTAccessConf } from "./../../culturize.conf"

type OnAcceptRow = (row: CSVRow) => void;
type OnRejectRow = (row: CSVRow) => void;

// This class contains the relevant data of a CSV Row.
export class CSVRow {
    // Creates a Array of rows from the contents of a CSVFile located at filepath
    public static createArrayFromCSV(filepath: string, rowAccept: OnAcceptRow, rowReject: OnRejectRow): Promise<CSVRow[]> {
        return new Promise<CSVRow[]>((resolve, reject) => {
            const buffer: string = fs.readFileSync(filepath, "utf8");
            const array: CSVRow[] = new Array<CSVRow>();
            let str: string = "";

            if (buffer) {
                str = buffer.toString();
            }

            if (str.length === 0) {
                reject("The file is empty");
                return;
            }

            const parser = csv_parser({ columns: true, relax_column_count: true });

            parser.on("readable", () => {
                let data: any;
                while (data = parser.read()) {
                    const row: CSVRow = CSVRow.createRow(data);
                    if (row != null) {
                        // If it isn't null, check the 'legality'/validity of the row
                        let validity = row.isValid()
                        if(validity != null)
                        {
                            if(CSVConf.IGNORE_ON_INVALID_DATA)
                                rowReject(row);
                            else 
                            {
                                console.log('The CSV file contains invalid data:' + validity)
                                reject(validity)
                                break;
                            }
                        }
                        else
                        {
                            // We're good, push
                            rowAccept(row);
                            array.push(row);
                        }
                    }
                    else 
                        rowReject(row);
                }
            });

            parser.on("error", (err: any) => {
                console.error(err);
                reject("Error while parsing the CSV file");
            });

            parser.on("finish", () => {
                if(array.length === 0)
                {
                    console.error("Empty array");
                    reject("No valid row found in the CSV File.");
                    return;
                }
                else
                {
                    CSVRow.checkArrayForDuplicates(array)
                        .then(() => {
                            resolve(array);
                        })
                        .catch((reason: string) => {
                            reject(reason)
                        })
                }
            });

            // Send the data to the parser
            parser.write(str);

            // Close the stream
            parser.end();
        });
    }

    // Creates a CSVRow from a single row of data
    // This will return null if the row doesn't provide enough information to
    // create a valid CSVRow object.
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

    // Checks an array of CSVRows for duplicate redirections
    // The promise is rejected on error, resolved on success
    private static checkArrayForDuplicates(array: CSVRow[]) : Promise<void> {
        return new Promise<void>((resolve,reject) => {
            // Iterate over all elements, and populate an array of strings
            // of the format (document type)/(pid), this array is then checked for duplicates
            let redirs = new Array<string>()

            for(let element of array)
            {
                let tmp: string = element.docType + '/' + element.pid;

                // If the redirections are going to be case insensitive,
                // compare all the redirections in uppercase to avoid
                // having false negatives.
                if(HTAccessConf.caseInsensitiveRedirs)
                    tmp = tmp.toUpperCase();

                redirs.push(tmp);
            }

            // Now, sort the array
            redirs.sort();

            // Check if there's a place where the element before === the element after
            let duplicates = new Array<string>();
            let redirs_length = redirs.length;
            for(let k = 0; k < redirs_length - 1; k++) {
                if(redirs[k] == redirs[k+1]) {
                    duplicates.push(redirs[k]);
                }
            }

            // Check if the duplicates contains anything
            if(duplicates.length !== 0)
            {
                // Create a "diagnostic" string that contains every duplicate
                let diagStr : string = "Duplicate redirections found: "
                for(let duplicate of duplicates)
                {
                    console.error("Duplicate redirection of \"" + duplicate + "\"");
                    diagStr += duplicate + ", ";
                }
                reject(diagStr);
                return;
            }

            // If we passed every check, we are good!
            resolve();
        })
    }

    // Checks the validity of this row
        // The strings for the PID and document type can
        // only contain 'a-z' 'A-Z' '0-9' '-' and '_'
    // Returns null on success, on failure,
    // returns a string containing the error message
    private isValid() : string {
        let fn = (text: string) : boolean => {
            return /^([a-z]|[A-Z]|[0-9]|-|_)+$/.test(text)
        }

        if(this.docType !== "")
        {
            if(!fn(this.docType)) 
                return "The document type \"" + this.docType + "\" contains invalid characters"
        }
        else if(!CSVConf.ALLOW_NO_DOCTYPE) 
            return "No document type in row";
        
        if(!fn(this.pid))
            return "The PID \"" + this.pid + "\" contains invalid characters"
        
        return null
    }


    // This function checks if a row of data satisfies the minimum requirements to be valid.
    // For this function to return true, the row must provide non null/empty
    // values for the following columns:
        // CSVConf.COL_URL
        // CSVConf.COL_PID
        // CSVConf.COL_DOCTYPE
    private static satisfiesMinimumRequirements(row: any): boolean {
        const isValid = (key: string): boolean => {
            const data = row[key];
            return (data != null) && (data !== "");
        };
        return isValid(CSVConf.COL_PID) && isValid(CSVConf.COL_URL) && (isValid(CSVConf.COL_DOCTYPE) || CSVConf.ALLOW_NO_DOCTYPE);
    }

    // Checks if a row should be enabled. Rows are enabled by default.
    // A Row is only disabled if the Conf.COL_ENABLED field is present and set to 0
    private static isEnabled(row: any): boolean {
        const value: string = row[CSVConf.COL_ENABLED];
        if ((value != null) && (value === "0")) {
            return false;
        }
        return true;
    }

    pid: string;
    docType: string;
    url: string;

    private constructor(pid: string, docType: string, url: string) {
        this.pid = pid.trim();
        if(docType != null)
            this.docType = docType.trim();
        else 
            this.docType = ""
        this.url     = url.trim().replace("%", "\\%");
    }
}

// This class manages the HTAccess creation
// process.
export class HTAccessCreator {
    public csvArray: CSVRow[];

    constructor(csvArray: CSVRow[]) {
        this.csvArray = csvArray;
    }

    // Compiles the csvArray, creating the HTAccess file.
    public makeHTAccessFile(): string {
        let data = this.getHeader() + "\n";

        this.csvArray.forEach((row: CSVRow) => {
            // Add a space between rule so they're more spread out/readable
            data += this.getRewriteRule(row) + "\n";
        });

        return data;
    }

    // Gets the header of the .htaccess file
    private getHeader(): string {
        return "Options +FollowSymLinks\nRewriteEngine on";
    }

    // Creates the RewriteRule for a CSVRow
    // Returns "" if the url/pid is empty.
    private getRewriteRule(row: CSVRow, code: number = 302): string {
        if (row.pid === "" || row.url === "") {
            return "";
        }

        // Create options
        let options : string = "R=" + HTAccessConf.redirectionCode;
        if(HTAccessConf.caseInsensitiveRedirs)
            options += ",NC";
        if(HTAccessConf.noEscape)
            options += ",NE";
        options += ",L";
        
        // Create redirection 
        let redir : string = "";
        if(row.docType != "")
            redir = row.docType + '/' + row.pid;
        else 
            redir = row.pid;
        return `RewriteRule ^${redir}$ ${row.url} [${options}]`;
    }
}

// Encapsulates the (positive) result of a HTAccessConversion.
export class HTAccessConversionResult {
    // The file content
    file: string;

    // Stats
    numLinesRejected: number;
    numLinesAccepted: number;

    constructor(file: string, rejected: number, accepted: number) {
        this.file = file;
        this.numLinesAccepted = accepted;
        this.numLinesRejected = rejected;
    }
}
// This function performs all the required steps
// to transform a .csv to a .htaccess file
// It returns the content of the .htaccess file
export function convertCSVtoHTACCESS(filepath: string): Promise<HTAccessConversionResult> {
    return new Promise<HTAccessConversionResult>((resolve, reject) => {
        // Counters
        let numAccepted: number = 0;
        let numRejected: number = 0;
        CSVRow.createArrayFromCSV(filepath, 
        // Acceptation
        () => {
            numAccepted++;
        }, 
        // Rejection
        (row: CSVRow) => {
            numRejected ++;
        }).then((value: CSVRow[]) => {
                const creator = new HTAccessCreator(value);
                resolve(new HTAccessConversionResult(creator.makeHTAccessFile(),numRejected,numAccepted));
            })
            .catch((error: string) => {
                reject(error);
            });
    });
}
