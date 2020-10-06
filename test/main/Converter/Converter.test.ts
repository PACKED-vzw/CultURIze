import * as octo from "@octokit/rest";
import { expect } from "chai";
import { ConversionResult, convertCSVtoWebConfig,
    CSVRow, HTAccessCreator, NginxConfCreator } from "../../../src/main/Converter/Converter";
import { CSVConf } from "./../../../src/culturize.conf";

import * as log from "electron-log";
import * as fs from "fs";
import * as sinon from "sinon";


describe("CSVRow", () => {
    it("row creation", () => {
        const rowData: { [id: string]: string } = {"test ": "test"};
        rowData[CSVConf.COL_PID] = "pid";
        rowData[CSVConf.COL_DOCTYPE] = "doctype";
        rowData[CSVConf.COL_URL] = "https://test.test";
        rowData[CSVConf.COL_ENABLED] = "0";

        let row = CSVRow.createRow(rowData);
        expect(row).to.be.not.null;
        expect(row.isValidAndEnabled()).to.be.false;

        rowData[CSVConf.COL_ENABLED] = "1";
        rowData[CSVConf.COL_PID] = "";
        row = CSVRow.createRow(rowData);
        expect(row).to.be.not.null;
        expect(row.isValidAndEnabled()).to.be.false;

        rowData[CSVConf.COL_PID] = "pid";
        rowData[CSVConf.COL_URL] = "";
        row = CSVRow.createRow(rowData);
        expect(row).to.be.not.null;
        expect(row.isValidAndEnabled()).to.be.false;

        rowData[CSVConf.COL_URL] = "blabla";
        row = CSVRow.createRow(rowData);
        expect(row).to.be.not.null;
        expect(row.isValidAndEnabled()).to.be.false;

        rowData[CSVConf.COL_URL] = "https://test.test";
        row = CSVRow.createRow(rowData);
        expect(row).to.be.not.null;
        expect(row.isValidAndEnabled()).to.be.true;
        expect(row.pid).to.eql("pid");
        expect(row.docType).to.eql("doctype");
        expect(row.url).to.eql("https://test.test");

        rowData[CSVConf.COL_DOCTYPE] = null;
        row = CSVRow.createRow(rowData);
        expect(row).to.be.not.null;
        expect(row.isValidAndEnabled()).to.be.true;
        expect(row.pid).to.eql("pid");
        expect(row.docType).to.eql("");
        expect(row.url).to.eql("https://test.test");
    });

    it("row creation from csv", async function() {
        let numAccepted: number = 0;
        let numRejected: number = 0;

        // electron-log can give errors if run outside electron scope, so stubbing
        const logStubs = [sinon.stub(log, "error"), sinon.stub(log, "info"), sinon.stub(log, "warn")];

        let csvContent: string = "";
        const stub = sinon.stub(fs, "readFileSync").returns(csvContent);
        let result: CSVRow[]  = null;
        try {
            result = await CSVRow.createArrayFromCSV("filepath",
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
            result = await CSVRow.createArrayFromCSV("filepath",
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
            result = await CSVRow.createArrayFromCSV("filepath",
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
            result = await CSVRow.createArrayFromCSV("filepath",
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
            result = await CSVRow.createArrayFromCSV("filepath",
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
            result = await CSVRow.createArrayFromCSV("filepath",
                                                     (row: CSVRow) => { numAccepted++; },
                                                     (row: CSVRow) => { numRejected++; });
        } catch (error) {
            expect(error).to.eql("No valid row found in the CSV File.");
        }

        expect(numAccepted).to.eql(0);
        expect(numRejected).to.eql(1);

        stub.restore();
        for (const lstub of logStubs) {
            lstub.restore();
        }
    });

    it("duplicate rows", async function() {
        let numAccepted: number = 0;
        let numRejected: number = 0;

        // electron-log can give errors if run outside electron scope, so stubbing
        const logStubs = [sinon.stub(log, "error"), sinon.stub(log, "info"), sinon.stub(log, "warn")];

        let csvContent: string = "";
        const stub = sinon.stub(fs, "readFileSync").returns(csvContent);
        let result: CSVRow[]  = null;

        // duplicate data, comma separated
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n123-E,data,http://test.test/124-E,1\n";
        stub.returns(csvContent);
        try {
            result = await CSVRow.createArrayFromCSV("filepath",
                                                     (row: CSVRow) => { numAccepted++; },
                                                     (row: CSVRow) => { numRejected++; });
        } catch (error) {
            expect(error).to.include("Duplicate redirections found");
        }

        expect(numAccepted).to.eql(2);
        expect(numRejected).to.eql(0);

        numAccepted = 0;
        numRejected = 0;

        stub.restore();
        for (const lstub of logStubs) {
            lstub.restore();
        }
    });

    it("Nginx conversion", async function() {
        let numAccepted: number = 0;
        let numRejected: number = 0;

        // electron-log can give errors if run outside electron scope, so stubbing
        const logStubs = [sinon.stub(log, "error"), sinon.stub(log, "info"), sinon.stub(log, "warn")];

        let csvContent: string = "";
        const stub = sinon.stub(fs, "readFileSync").returns(csvContent);
        let rows: CSVRow[]  = null;

        // valid data, comma separated, 2 enabled
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n124-E,representation,http://test.test/124-E,1\n";
        stub.returns(csvContent);
        rows = await CSVRow.createArrayFromCSV("filepath",
                                               (row: CSVRow) => { numAccepted++; },
                                               (row: CSVRow) => { numRejected++; });

        let nginxConfCreator: NginxConfCreator = new NginxConfCreator(rows, "sub");
        let nginxConf = nginxConfCreator.makeNginxConfFile();

        expect(nginxConf).to.eql("rewrite /sub/data/123-E$ http://test.test/123-E redirect ;\nrewrite /sub/representation/124-E$ http://test.test/124-E redirect ;\n");

        // valid data, comma separated, 1 enabled, 1 disabled
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n124-E,representation,http://test.test/124-E,0\n";
        stub.returns(csvContent);
        rows = await CSVRow.createArrayFromCSV("filepath",
                                               (row: CSVRow) => { numAccepted++; },
                                               (row: CSVRow) => { numRejected++; });

        nginxConfCreator = new NginxConfCreator(rows, "sub");
        nginxConf = nginxConfCreator.makeNginxConfFile();

        expect(nginxConf).to.eql("rewrite /sub/data/123-E$ http://test.test/123-E redirect ;\n");

        // partially invalid data, comma separated, 1 enabled, 1 invalid
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n124-E,representation,hqdslfttp://test.test/124-E,1\n";
        stub.returns(csvContent);
        rows = await CSVRow.createArrayFromCSV("filepath",
                                               (row: CSVRow) => { numAccepted++; },
                                               (row: CSVRow) => { numRejected++; });

        nginxConfCreator = new NginxConfCreator(rows, "sub");
        nginxConf = nginxConfCreator.makeNginxConfFile();

        expect(nginxConf).to.eql("rewrite /sub/data/123-E$ http://test.test/123-E redirect ;\n");

        stub.restore();
        for (const lstub of logStubs) {
            lstub.restore();
        }
    });

    it("Apache conversion", async function() {
        let numAccepted: number = 0;
        let numRejected: number = 0;

        // electron-log can give errors if run outside electron scope, so stubbing
        const logStubs = [sinon.stub(log, "error"), sinon.stub(log, "info"), sinon.stub(log, "warn")];

        let csvContent: string = "";
        const stub = sinon.stub(fs, "readFileSync").returns(csvContent);
        let rows: CSVRow[]  = null;

        // valid data, comma separated, 2 enabled
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n124-E,representation,http://test.test/124-E,1\n";
        stub.returns(csvContent);
        rows = await CSVRow.createArrayFromCSV("filepath",
                                               (row: CSVRow) => { numAccepted++; },
                                               (row: CSVRow) => { numRejected++; });

        let htAccessCreator: HTAccessCreator = new HTAccessCreator(rows);
        let apacheConf = htAccessCreator.makeHTAccessFile();

        expect(apacheConf).to.eql("Options +FollowSymLinks\nRewriteEngine on\n\nRewriteRule data/123-E$ http://test.test/123-E [R=302,NC,NE,L]\nRewriteRule representation/124-E$ http://test.test/124-E [R=302,NC,NE,L]\n");

        // valid data, comma separated, 1 enabled, 1 disabled
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n124-E,representation,http://test.test/124-E,0\n";
        stub.returns(csvContent);
        rows = await CSVRow.createArrayFromCSV("filepath",
                                               (row: CSVRow) => { numAccepted++; },
                                               (row: CSVRow) => { numRejected++; });

        htAccessCreator = new HTAccessCreator(rows);
        apacheConf = htAccessCreator.makeHTAccessFile();

        expect(apacheConf).to.eql("Options +FollowSymLinks\nRewriteEngine on\n\nRewriteRule data/123-E$ http://test.test/123-E [R=302,NC,NE,L]\n");

        // partially invalid data, comma separated, 1 enabled, 1 invalid
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n124-E,representation,httqldflp://test.test/124-E,1\n";
        stub.returns(csvContent);
        rows = await CSVRow.createArrayFromCSV("filepath",
                                               (row: CSVRow) => { numAccepted++; },
                                               (row: CSVRow) => { numRejected++; });

        htAccessCreator = new HTAccessCreator(rows);
        apacheConf = htAccessCreator.makeHTAccessFile();

        expect(apacheConf).to.eql("Options +FollowSymLinks\nRewriteEngine on\n\nRewriteRule data/123-E$ http://test.test/123-E [R=302,NC,NE,L]\n");

        stub.restore();
        for (const lstub of logStubs) {
            lstub.restore();
        }
    });

    it("convertCSVtoWebConfig", async function() {

        // electron-log can give errors if run outside electron scope, so stubbing
        const logStubs = [sinon.stub(log, "error"), sinon.stub(log, "info"), sinon.stub(log, "warn")];

        let csvContent: string = "";
        const stub = sinon.stub(fs, "readFileSync").returns(csvContent);
        let conversionResult: ConversionResult = null;

        // valid data, comma separated, 2 enabled
        csvContent = "PID,document type,URL,enabled\n123-E,data,http://test.test/123-E,1\n124-E,representation,http://test.test/124-E,1\n";
        stub.returns(csvContent);
        conversionResult = await convertCSVtoWebConfig("filepath", true, "sub");

        expect(conversionResult.file).to.eql("Options +FollowSymLinks\nRewriteEngine on\n\nRewriteRule data/123-E$ http://test.test/123-E [R=302,NC,NE,L]\nRewriteRule representation/124-E$ http://test.test/124-E [R=302,NC,NE,L]\n");

        conversionResult = await convertCSVtoWebConfig("filepath", false, "sub");

        expect(conversionResult.file).to.eql("rewrite /sub/data/123-E$ http://test.test/123-E redirect ;\nrewrite /sub/representation/124-E$ http://test.test/124-E redirect ;\n");

        stub.restore();
        for (const lstub of logStubs) {
            lstub.restore();
        }
    });
});
