import { Target } from "./../../common/Objects/ActionRequest";
import { ConversionResult } from "./../../common/Objects/ConversionResult";
import { CSVRow } from "./../../common/Objects/CSVRow";
import { CSVConf, HTAccessConf } from "./../../culturize.conf";
import { ApacheConverter } from "./../Converter/ApacheConverter";
import { NginxConverter } from "./../Converter/NginxConverter";
import { createArrayFromCSV } from "./../Parser/Parser";


/**
 * This function orchestrates the conversion process. You give it
 * a path to a .csv file as input ("filepath"), and if everything
 * goes right it'll return back a response object (ConversionResult)
 * containing the .htaccess file content.
 * @param {string} filepath The path to the .csv rile
 * @param {Target} target webserver target
 * @param {string} subdir subdir to be used in nginx rewrite rules
 * @returns a Promise of a ConversionResult, resolved on success, rejected with an error message
 * on error.
 */
export async function convertCSVtoWebConfig(filepath: string,
                                            target: Target,
                                            subdir: string): Promise<ConversionResult> {
    // Counters
    let numAccepted: number = 0;
    let numRejected: number = 0;

    // Create the array
    try {
        const rows = await createArrayFromCSV(filepath,
                                              (row: CSVRow) => { numAccepted++; },
                                              (row: CSVRow) => { numRejected++; });

        if (target === Target.apache) {
            const creator = new ApacheConverter(rows);
            return new ConversionResult(creator.makeHTAccessFile(), numRejected, numAccepted, rows);
        } else {
            const creator = new NginxConverter(rows, subdir);
            return new ConversionResult(creator.makeNginxConfFile(), numRejected, numAccepted, rows);
        }
    } catch (error) {
        throw error;
    }

}
