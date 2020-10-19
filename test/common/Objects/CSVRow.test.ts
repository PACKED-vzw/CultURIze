import { expect } from "chai";
import { CSVRow } from "../../../src/common/Objects/CSVRow";
import { CSVConf } from "./../../../src/culturize.conf";

import * as got from "got";
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

    it("row HTML string", () => {
        const rowData: { [id: string]: string } = {};
        rowData[CSVConf.COL_PID] = "pid";
        rowData[CSVConf.COL_DOCTYPE] = "doctype";
        rowData[CSVConf.COL_URL] = "https://test.test";
        rowData[CSVConf.COL_ENABLED] = "1";

        CSVRow.count = 0;
        let row = CSVRow.createRow(rowData);
        expect(row.isValidAndEnabled()).to.be.true;
        let html = row.createHTMLRow();
        expect(html).to.eql(`<tr class="valid"><td>0</td><td>1</td><td>doctype</td><td>pid</td><td title="https://test.test">valid URL</td><td></td><td class="check" title="URL not tested">?</td></tr>\n`);

        rowData[CSVConf.COL_ENABLED] = "x";

        CSVRow.count = 0;
        row = CSVRow.createRow(rowData);
        expect(row.isValidAndEnabled()).to.be.false;
        html = row.createHTMLRow();
        expect(html).to.eql(`<tr class="invalid"><td>0</td><td class="error" title="not 0 or 1">x</td><td>doctype</td><td>pid</td><td title="https://test.test">valid URL</td><td>D0</td><td class="check" title="URL not tested">?</td></tr>\n`);

        rowData[CSVConf.COL_ENABLED] = "1";
        rowData[CSVConf.COL_DOCTYPE] = "..invalid";

        CSVRow.count = 0;
        row = CSVRow.createRow(rowData);
        expect(row.isValidAndEnabled()).to.be.false;
        html = row.createHTMLRow();
        expect(html).to.eql(`<tr class="invalid"><td>0</td><td>1</td><td class="error" title="Invalid characters">..invalid</td><td>pid</td><td title="https://test.test">valid URL</td><td>B0</td><td class="check" title="URL not tested">?</td></tr>\n`);

        rowData[CSVConf.COL_DOCTYPE] = "doctype";
        rowData[CSVConf.COL_PID] = "..invalid";

        CSVRow.count = 0;
        row = CSVRow.createRow(rowData);
        expect(row.isValidAndEnabled()).to.be.false;
        html = row.createHTMLRow();
        expect(html).to.eql(`<tr class="invalid"><td>0</td><td>1</td><td>doctype</td><td class="error" title="Invalid characters">..invalid</td><td title="https://test.test">valid URL</td><td>A0</td><td class="check" title="URL not tested">?</td></tr>\n`);

        rowData[CSVConf.COL_PID] = "pid";
        rowData[CSVConf.COL_URL] = "..invalid";

        CSVRow.count = 0;
        row = CSVRow.createRow(rowData);
        expect(row.isValidAndEnabled()).to.be.false;
        html = row.createHTMLRow();
        expect(html).to.eql(`<tr class="invalid"><td>0</td><td>1</td><td>doctype</td><td>pid</td><td class="error" title="..invalid">invalid URL</td><td>C0</td><td class="check" title="URL not tested">?</td></tr>\n`);
        console.log(html);
    });

    xit("check URL", () => {
        // Mocking problems
        expect(true).to.be.true;
        // const stub = sinon.stub(got).returns(csvContent);
    });
});
