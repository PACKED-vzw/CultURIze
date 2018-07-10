// This is the file charged with converting
// .csv files to .htaccess files

var csv = require('csv-parser')
var fs = require('fs')

import * as Conf from './CSVConfig'

// This class contains the relevant data of a CSV Row.
export class CSVRow
{
    pid : string 
    docType : string 
    url : string

    private constructor(pid: string, docType: string, url: string)
    {
        this.pid     = pid.trim()
        this.docType = docType.trim()
        this.url     = url.trim().replace('%','\\%')
    }

    // Creates a Array of rows from the contents of a CSVFile located at filepath
    public static createArrayFromCSV(filepath: string) : Promise<CSVRow[]>
    {
        let array : CSVRow[] = new Array<CSVRow>()
        return new Promise<CSVRow[]>((resolve,reject) => {
            fs.createReadStream(filepath).pipe(csv())
            .on('data', function(data: any){
                let row : CSVRow = CSVRow.createRow(data)
                if(row != null)
                    array.push(row)
            })
            .on('error', function(error: any){
                reject(error)
            })
            .on('finish', function(row: any){
                resolve(array)
            })
        })
    }

    // Creates a CSVRow from a single row of data
    public static createRow(row: any) : CSVRow
    {
        if(this.satisfiesMinimumRequirements(row) && this.isEnabled(row))
        {
            return new CSVRow(
                row[Conf.COL_PID],
                row[Conf.COL_DOCTYPE],
                row[Conf.COL_URL]
            )
        }
        return null 
    }

    // This function checks if a row of data satisfies the minimum requirements to be valid.
    // For this function to return true, the row must provide non null/empty
    // values for the following columns:
        // Conf.COL_URL
        // Conf.COL_PID
        // Conf.COL_DOCTYPE
    private static satisfiesMinimumRequirements(row: any) : boolean
    {
        let isValid = (key: string) : boolean => {
            var data = row[key] 
            return (data != null) && (data != '')
        }
        return isValid(Conf.COL_PID) && isValid(Conf.COL_URL) && isValid(Conf.COL_DOCTYPE)
    }

    // Checks if a row should be enabled. Rows are enabled by default.
    // A Row is only disabled if the Conf.COL_ENABLED field is present and set to 0
    private static isEnabled(row: any) : boolean
    {
        let value : string = row[Conf.COL_ENABLED]
        if((value != undefined) && (value == '0'))
            return false 
        return true
    }
}

type IgnoredElementCallback = (element:CSVRow) => void

// This class manages the HTAccess creation
// process.
export class HTAccessCreator
{
    csvArray: Array<CSVRow>

    constructor(csvArray: CSVRow[])
    {
        this.csvArray = csvArray
    }

    // Compiles the csvArray, creating the HTAccess file.
    public makeHTAccessFile(onIgnore: IgnoredElementCallback): string 
    {
        let data = this.getHeader() + '\n'

        this.csvArray.forEach((row:CSVRow) => {
            // Add a space between rule so they're more spread out/readable
            data += this.getRewriteRule(row) + '\n'
        })

        return data
    }

    // Gets the header of the .htaccess file
    private getHeader(): string 
    {
        return 'Options +FollowSymLinks\nRewriteEngine on'
    }

    // Creates the RewriteRule for a CSVRow
    // Returns "" if the url/pid is empty.
    private getRewriteRule(row: CSVRow, code : number = 302): string 
    {
        if(row.pid == '' || row.url == '')
            return ''
        
        return `RewriteRule ^${row.docType}/${row.pid}$ ${row.url} [R=${code},L]`
    }
}

type ErrorCallback = (error:any) => void

// This function performs all the required steps
// to transform a .csv to a .htaccess file
// It returns the content of the .htaccess file
export function convertCSVtoHTACCESS(filepath: string, onError: ErrorCallback) : Promise<string> 
{
    return new Promise<string>((resolve,reject) => {
        CSVRow.createArrayFromCSV(filepath)
            .then((value: CSVRow[]) => {
                let creator = new HTAccessCreator(value)
                resolve(creator.makeHTAccessFile((ignored: CSVRow) => {
                    console.warn('Ignored element ' + ignored)
                }))
            })
            .catch((error:any) => {
                reject(error)
            })
    })
}