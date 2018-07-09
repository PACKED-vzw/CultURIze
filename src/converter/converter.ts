/*
    This file contains the source code of the CSV to .htaccess converter.
    
    To-Do:
        * Add more documentation: Each function/class should be thouroughly commented
        * Add a proper 'convertCSVtoHTACCESS' function
        * Add a way of saving the .htaccess to a file
        * Offer a proper/cleaner interface to access each function from an external source file.
*/

var csv = require('csv-parser')
var fs = require('fs')

// Import the Configuration file
import * as Conf from './CSVConfig';

// Class representing a single entry in the CSV file
class CSVEntry
{
    pid : string 
    docType : string 
    url : string 

    constructor(pid: string, docType: string, url: string)
    {
        this.pid = pid
        this.docType = docType 
        this.url = url
    }

    public static createFromRow(data: any) : CSVEntry 
    {
        return new CSVEntry(
            data[Conf.COL_PID],
            data[Conf.COL_DOCTYPE],
            data[Conf.COL_URL]
        );
    }
}

// Checks if some fields (in a list) are present/not undefined
// in the row;
function checkFields(row : any, keys : string[]) : boolean 
{
    if(row == null)
        return false;

    for(let key of keys)
    {
        if(row[key] == null)
            return false;
    }
    
    return true;
}

// Checks if an entry in the CSV is enabled or not.
// If the enabled field is undefined, returns true by default
// If the data is undefined, returns false
function isEnabled(row : any) : boolean 
{
    if(row == null)
        return false;

    if(row[Conf.COL_ENABLED] == null)
        return true;

    return (row[Conf.COL_ENABLED] == '1');
}

// Returns true if the CSV entry should be pushed for further
// processing.
function shouldPush(row : any) : boolean 
{
    // Check if all required fields are present
    if(!checkFields(row, [ Conf.COL_PID, Conf.COL_DOCTYPE, Conf.COL_URL ]))
        return false; 

    if(row[Conf.COL_URL] == "")
        return false;
    
    // All require fields are present? Check if the entry is enabled
    return isEnabled(row);
}

// This calls the CSV Parser to read the .csv and add all
// relevant data to the array returned by this function.
export function readCSVToArray(filepath : string) : CSVEntry[]
{
    var allData : CSVEntry[] = new Array<CSVEntry>();

    fs.createReadStream(filepath)
        .pipe(csv())
        .on('data', function (row: any) {
                if(shouldPush(row))
                    allData.push(CSVEntry.createFromRow(row))
            })
        // Temp test
        .on('finish', function() {
            let obj = new HTAccessObject(allData)
            console.log(obj.toString())
        })

    return allData;
}


// This class takes a CSVEntry as input and
// creates a in memory representation of the 
// HTAccess file.
// This in-memory representation can then be
// written to a file, which will be the .htaccess
// file!
export class HTAccessObject
{
    // the .htaccess header
    header : string

    // each directive in the .htaccess
    content : string[]

    constructor(csvContent : CSVEntry[])
    {
        this.content = new Array<string>()
        this.setHeader()
        this.compileArray(csvContent)
    }

    public toString() : string 
    {
        let full : string = this.header + '\n'

        this.content.forEach((element : string) => {
            full += element + '\n'
        })

        return full
    }
    // Sets the header variable
    private setHeader() : void
    {
        this.header = 'Options +FollowSymLinks\nRewriteEngine on'
    }

    // Compile the array of CSVEntry to 
    // the redirections array.
    private compileArray(csvContent : CSVEntry[]) : void 
    {
        csvContent.forEach((entry : CSVEntry) => {
            let id = entry.pid
            let url = entry.url
            let accept_header = this.convertDocTypeToAcceptHeader(entry.docType, function(){
                console.log('Unknown document type!')
            })

            this.content.push(this.createRewriteCondRule(accept_header))
            this.content.push(this.createRewriteRule(id,url))
        })
    }

    private convertDocTypeToAcceptHeader(docType: string, onError : () => void) : string
    {
        switch(docType)
        {
            case Conf.ACCEPT_HTML_DOCTYPE:
                return 'text/html'
            case Conf.ACCEPT_IMAGE:
                return 'image/*'
            default:
                onError();
        }
        return ""
    }

    // Creates a "RewriteCond" directive from a AcceptHeader
    private createRewriteCondRule(acceptHeader : string) : string 
    {
        return 'RewriteCond %{HTTP_ACCEPT} ' + acceptHeader
    }

    // Creates a "RewriteRule" directive from a PID and a URL
    private createRewriteRule(from : string, to : string, code : number = 302)
    {
        return 'RewriteRule ^' + from + '$ ' + to + ' [R=' + code + ',L]'
    }
}