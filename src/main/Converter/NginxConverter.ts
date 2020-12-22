import { CSVRow } from "./../../common/Objects/CSVRow";

/**
 * This class manages the nginx configuration file creation
 * process from a CSVRow[]
 */
export class NginxConverter {
    private csvArray: CSVRow[];
    private subdir: string;

    /**
     * @constructor
     * @param {CSVRow[]} csvArray The array that will be converted to nginx config
     * @param {string} subdir sub directory to be used in nginx rewrite rule
     */
    constructor(csvArray: CSVRow[], subdir: string) {
        this.csvArray = csvArray;
        this.subdir = subdir;
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
            if (row.isValidAndEnabled()) {
                data += this.getRewriteRule(row) + "\n";
            }
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
        if (this.subdir !== "") {
            redir = `${this.subdir}/`;
        }
        if (row.docType !== "") {
            redir = `${redir}${row.docType}/`;
        }
        redir = `${redir}${row.pid}`;
        return `rewrite /${redir}$ ${row.url} redirect ;`;
    }
}
