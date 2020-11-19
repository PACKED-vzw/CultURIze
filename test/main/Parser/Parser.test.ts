import { expect } from "chai";
import { CSVRow } from "./../../../src/common/Objects/CSVRow";
import { createArrayFromCSV } from "./../../../src/main/Parser/Parser";

import * as fs from "fs";
import * as sinon from "sinon";

describe("Parser", () => {
    it("row creation from csv", async () => {
        let numAccepted: number = 0;
        let numRejected: number = 0;

        let csvContent: string = "";
        const stub = sinon.stub(fs, "readFileSync").returns(csvContent);
        let result: CSVRow[]  = null;
        console.log("here");
        try {
            result = await createArrayFromCSV("filepath",
                                              (row: CSVRow) => { numAccepted++; },
                                              (row: CSVRow) => { numRejected++; });
        } catch (error) {
            expect(error).to.eql("The file is empty");
        }

        expect(numAccepted).to.eql(0);
        expect(numRejected).to.eql(0);

        // Valid data, comma separated, 4 enabled, 1 disabled
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n124-E,representation,http://test.test/124-E,1\n125-A,data,http://test.test/125-A,0\n126-A,representation,http://test.test/126-A,1\n127-B,data,http://test.test/127-B,1\n";
        stub.returns(csvContent);
        try {
            result = await createArrayFromCSV("filepath",
                                              (row: CSVRow) => { numAccepted++; },
                                              (row: CSVRow) => { numRejected++; });
        } catch (error) {
            throw error;
        }

        expect(numAccepted).to.eql(4);
        expect(numRejected).to.eql(1);

        numAccepted = 0;
        numRejected = 0;

        // Valid data, semicolon separated, 1 enabled
        csvContent = "PID;document type;URL;enabled\n123-E;data;http://test.test/123-E;1\n";
        stub.returns(csvContent);
        try {
            result = await createArrayFromCSV("filepath",
                                              (row: CSVRow) => { numAccepted++; },
                                              (row: CSVRow) => { numRejected++; });
        } catch (error) {
            throw error;
        }

        expect(numAccepted).to.eql(1);
        expect(numRejected).to.eql(0);

        numAccepted = 0;

        // invalid data, semicolon separated, 1 enabled
        csvContent = "PID;document type;URL;enabled\n123-Edata;http://test.test/123-E;1\n";
        stub.returns(csvContent);
        try {
            result = await createArrayFromCSV("filepath",
                                              (row: CSVRow) => { numAccepted++; },
                                              (row: CSVRow) => { numRejected++; });
        } catch (error) {
            expect(error).to.eql("No valid row found in the CSV File.");
        }

        expect(numAccepted).to.eql(0);
        expect(numRejected).to.eql(1);

        numRejected = 0;

        // invalid data, semicolon separated
        csvContent = "PID;document type;URL;enabled\n123-Edatahttp://test.test/123-E1\n";
        stub.returns(csvContent);
        try {
            result = await createArrayFromCSV("filepath",
                                                     (row: CSVRow) => { numAccepted++; },
                                                     (row: CSVRow) => { numRejected++; });
        } catch (error) {
            expect(error).to.eql("No valid row found in the CSV File.");
        }

        expect(numAccepted).to.eql(0);
        expect(numRejected).to.eql(1);

        numRejected = 0;

        // invalid header, semicolon separated
        csvContent = "POD;doctype;URL;enabled\n123-Edatahttp://test.test/123-E1\n";
        stub.returns(csvContent);
        try {
            result = await createArrayFromCSV("filepath",
                                                     (row: CSVRow) => { numAccepted++; },
                                                     (row: CSVRow) => { numRejected++; });
        } catch (error) {
            expect(error).to.eql("No valid row found in the CSV File.");
        }

        expect(numAccepted).to.eql(0);
        expect(numRejected).to.eql(1);

        stub.restore();
    });

    it("duplicate rows", async () => {
        let numAccepted: number = 0;
        let numRejected: number = 0;

        let csvContent: string = "";
        const stub = sinon.stub(fs, "readFileSync").returns(csvContent);
        let result: CSVRow[]  = null;

        // duplicate data, comma separated
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n123-E,data,http://test.test/124-E,1\n";
        stub.returns(csvContent);
        try {
            result = await createArrayFromCSV("filepath",
                                                     (row: CSVRow) => { numAccepted++; },
                                                     (row: CSVRow) => { numRejected++; });
        } catch (error) {
            expect(error).to.include("Duplicates found, validate CSV first!");
        }

        expect(numAccepted).to.eql(2);
        expect(numRejected).to.eql(0);

        numAccepted = 0;
        numRejected = 0;

        stub.restore();
    });
});
