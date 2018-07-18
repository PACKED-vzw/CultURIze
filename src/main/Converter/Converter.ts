// This is the file charged with converting
// .csv files to .htaccess files

// Potential Area of Improvements:
    // Make the .htaccess generation more complete by generating multiple files
    // for each document type, and store each of theses files in another folder.
    // This can speed up the redirection time by 2x, at the cost of creating 2 more files.

const csv_parser = require("csv-parse");
const fs = require("fs");

import * as Conf from "./CSVConfig";

// This class contains the relevant data of a CSV Row.
export class CSVRow {

    // Creates a Array of rows from the contents of a CSVFile located at filepath
    public static createArrayFromCSV(filepath: string): Promise<CSVRow[]> {
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
                        array.push(row);
                    }
                }
            });

            parser.on("error", (err: any) => {
                console.log(err);
                reject("Error while parsing the CSV file");
            });

            parser.on("finish", () => {
                console.log(array);
                resolve(array);
            });

            // Send the data to the parser
            parser.write(str);

            // Close the stream
            parser.end();

            /*
            let array : CSVRow[] = new Array<CSVRow>()
            fs.createReadStream(filepath).pipe(csv())
            .on('data', function(data: any){
                let row : CSVRow = CSVRow.createRow(data)
                if(row != null)
                    array.push(row)
            })
            .on('error', function(error: any){
                console.error(error)
                reject('Error while reading "' + filepath + '"')
            })
            .on('finish', function(row: any){
                resolve(array)
            })
            */
        });
    }

    // Creates a CSVRow from a single row of data
    public static createRow(row: any): CSVRow {
        if (this.satisfiesMinimumRequirements(row) && this.isEnabled(row)) {
            return new CSVRow(
                row[Conf.COL_PID],
                row[Conf.COL_DOCTYPE],
                row[Conf.COL_URL],
            );
        }
        return null;
    }

    // This function checks if a row of data satisfies the minimum requirements to be valid.
    // For this function to return true, the row must provide non null/empty
    // values for the following columns:
        // Conf.COL_URL
        // Conf.COL_PID
        // Conf.COL_DOCTYPE
    private static satisfiesMinimumRequirements(row: any): boolean {
        const isValid = (key: string): boolean => {
            const data = row[key];
            return (data != null) && (data !== "");
        };
        return isValid(Conf.COL_PID) && isValid(Conf.COL_URL) && isValid(Conf.COL_DOCTYPE);
    }

    // Checks if a row should be enabled. Rows are enabled by default.
    // A Row is only disabled if the Conf.COL_ENABLED field is present and set to 0
    private static isEnabled(row: any): boolean {
        const value: string = row[Conf.COL_ENABLED];
        if ((value != null) && (value === "0")) {
            return false;
        }
        return true;
    }
    public pid: string;
    public docType: string;
    public url: string;

    private constructor(pid: string, docType: string, url: string) {
        this.pid     = pid.trim();
        this.docType = docType.trim();
        this.url     = url.trim().replace("%", "\\%");
    }
}

type IgnoredElementCallback = (element: CSVRow) => void;

// This class manages the HTAccess creation
// process.
export class HTAccessCreator {
    public csvArray: CSVRow[];

    constructor(csvArray: CSVRow[]) {
        this.csvArray = csvArray;
    }

    // Compiles the csvArray, creating the HTAccess file.
    public makeHTAccessFile(onIgnore: IgnoredElementCallback): string {
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

        return `RewriteRule ^${row.docType}/${row.pid}$ ${row.url} [R=${code},L]`;
    }
}

// This function performs all the required steps
// to transform a .csv to a .htaccess file
// It returns the content of the .htaccess file
export function convertCSVtoHTACCESS(filepath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        CSVRow.createArrayFromCSV(filepath)
            .then((value: CSVRow[]) => {
                const creator = new HTAccessCreator(value);
                resolve(creator.makeHTAccessFile((ignored: CSVRow) => {
                    console.warn("Ignored row: " + ignored);
                }));
            })
            .catch((error: string) => {
                console.error(error);
                reject(error);
            });
    });
}
