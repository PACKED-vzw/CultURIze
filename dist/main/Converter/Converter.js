"use strict";
// This is the file charged with converting
// .csv files to .htaccess files
Object.defineProperty(exports, "__esModule", { value: true });
var csv = require('csv-parser');
var fs = require('fs');
const Conf = require("./CSVConfig");
// This class contains the relevant data of a CSV Row.
class CSVRow {
    constructor(pid, docType, url) {
        this.pid = pid.trim();
        this.docType = docType.trim();
        this.url = url.trim().replace('%', '\\%');
    }
    // Creates a Array of rows from the contents of a CSVFile located at filepath
    static createArrayFromCSV(filepath) {
        let array = new Array();
        return new Promise((resolve, reject) => {
            fs.createReadStream(filepath).pipe(csv())
                .on('data', function (data) {
                let row = CSVRow.createRow(data);
                if (row != null)
                    array.push(row);
            })
                .on('error', function (error) {
                reject(error);
            })
                .on('finish', function (row) {
                resolve(array);
            });
        });
    }
    // Creates a CSVRow from a single row of data
    static createRow(row) {
        if (this.satisfiesMinimumRequirements(row) && this.isEnabled(row)) {
            return new CSVRow(row[Conf.COL_PID], row[Conf.COL_DOCTYPE], row[Conf.COL_URL]);
        }
        return null;
    }
    // This function checks if a row of data satisfies the minimum requirements to be valid.
    // For this function to return true, the row must provide non null/empty
    // values for the following columns:
    // Conf.COL_URL
    // Conf.COL_PID
    // Conf.COL_DOCTYPE
    static satisfiesMinimumRequirements(row) {
        let isValid = (key) => {
            var data = row[key];
            return (data != null) && (data != '');
        };
        return isValid(Conf.COL_PID) && isValid(Conf.COL_URL) && isValid(Conf.COL_DOCTYPE);
    }
    // Checks if a row should be enabled. Rows are enabled by default.
    // A Row is only disabled if the Conf.COL_ENABLED field is present and set to 0
    static isEnabled(row) {
        let value = row[Conf.COL_ENABLED];
        if ((value != undefined) && (value == '0'))
            return false;
        return true;
    }
}
exports.CSVRow = CSVRow;
// This class manages the HTAccess creation
// process.
class HTAccessCreator {
    constructor(csvArray) {
        this.csvArray = csvArray;
    }
    // Compiles the csvArray, creating the HTAccess file.
    makeHTAccessFile(onIgnore) {
        let data = this.getHeader() + '\n';
        this.csvArray.forEach((row) => {
            // Add a space between rule so they're more spread out/readable
            data += this.getRewriteRule(row) + '\n';
        });
        return data;
    }
    // Gets the header of the .htaccess file
    getHeader() {
        return 'Options +FollowSymLinks\nRewriteEngine on';
    }
    // Creates the RewriteRule for a CSVRow
    // Returns "" if the url/pid is empty.
    getRewriteRule(row, code = 302) {
        if (row.pid == '' || row.url == '')
            return '';
        return `RewriteRule ^${row.docType}/${row.pid}$ ${row.url} [R=${code},L]`;
    }
}
exports.HTAccessCreator = HTAccessCreator;
// This function performs all the required steps
// to transform a .csv to a .htaccess file
// It returns the content of the .htaccess file
function convertCSVtoHTACCESS(filepath, onError) {
    return new Promise((resolve, reject) => {
        CSVRow.createArrayFromCSV(filepath)
            .then((value) => {
            let creator = new HTAccessCreator(value);
            resolve(creator.makeHTAccessFile((ignored) => {
                console.warn('Ignored element ' + ignored);
            }));
        })
            .catch((error) => {
            reject(error);
        });
    });
}
exports.convertCSVtoHTACCESS = convertCSVtoHTACCESS;
