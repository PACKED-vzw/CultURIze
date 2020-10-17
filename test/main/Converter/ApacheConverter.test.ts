import { expect } from "chai";
import { CSVRow } from "./../../../src/common/Objects/CSVRow";
import { CSVConf } from "./../../../src/culturize.conf";
import { ApacheConverter } from "./../../../src/main/Converter/ApacheConverter";

import * as sinon from "sinon";


describe("Apache converter", () => {
    it("Apache conversion", async () => {
        const rowData: { [id: string]: string } = {};
        rowData[CSVConf.COL_PID] = "pid";
        rowData[CSVConf.COL_DOCTYPE] = "doctype";
        rowData[CSVConf.COL_URL] = "https://test.test";
        rowData[CSVConf.COL_ENABLED] = "1";

        CSVRow.count = 0;
        const row = CSVRow.createRow(rowData);
        const rows: CSVRow[]  = [row];

        const apacheConverter = new ApacheConverter(rows);
        const apacheConf = apacheConverter.makeHTAccessFile();

        expect(apacheConf).to.eql("Options +FollowSymLinks\nRewriteEngine on\n\nRewriteRule doctype/pid$ https://test.test [R=302,NC,NE,L]\n");


    });
});
