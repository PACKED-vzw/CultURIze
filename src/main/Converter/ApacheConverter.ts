import { CSVRow } from "./../../common/Objects/CSVRow";
import { HTAccessConf } from "./../../culturize.conf";

/**
 * This class manages the HTAccess file creation
 * process from a CSVRow[]
 */
export class ApacheConverter {
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
            if (row.isValidAndEnabled()) {
                data += this.getRewriteRule(row) + "\n";
            }
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
        // Replace "%" with "\%" to prohibit apache from
        // recognizing it as a regex substitution argument.
        const url = row.url.replace("%", "\\%");
        return `RewriteRule ${redir}$ ${url} [${options}]`;
    }
}
