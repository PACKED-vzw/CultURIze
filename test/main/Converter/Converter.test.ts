import * as octo from "@octokit/rest";
import { expect } from "chai";
import { Target } from "../../../src/common/Objects/ActionRequest";
import { ConversionResult } from "../../../src/common/Objects/ConversionResult";
import { CSVRow } from "../../../src/common/Objects/CSVRow";
import * as apache from "../../../src/main/Converter/ApacheConverter";
import { convertCSVtoWebConfig } from "../../../src/main/Converter/Converter";
import * as nginx from "../../../src/main/Converter/NginxConverter";
import * as parser from "../../../src/main/Parser/Parser";
import { CSVConf } from "./../../../src/culturize.conf";

import * as log from "electron-log";
import * as fs from "fs";
import * as sinon from "sinon";


describe("Converter", () => {
    it("convertCSVtoWebConfig", async () => {
        let conversionResult: ConversionResult = null;

        const rowData: { [id: string]: string } = {};
        rowData[CSVConf.COL_PID] = "pid";
        rowData[CSVConf.COL_DOCTYPE] = "doctype";
        rowData[CSVConf.COL_URL] = "https://test.test";
        rowData[CSVConf.COL_ENABLED] = "1";

        CSVRow.count = 0;
        const row = CSVRow.createRow(rowData);

        const pmock = sinon.mock(parser).expects("createArrayFromCSV");
        pmock.returns([row]);

        class MockApache {
            private args: CSVRow[];
            constructor(args: CSVRow[]) { this.args = args; }
            public makeHTAccessFile() { return "htaccess mock"; }
        }


        const astub = sinon.stub(apache, "ApacheConverter");
        astub.callsFake((args) => { return new MockApache(args); });
        // valid data, comma separated, 2 enabled
        conversionResult = await convertCSVtoWebConfig("filepath", Target.apache, "sub");

        expect(conversionResult.file).to.eql("htaccess mock");

        pmock.restore();
        astub.restore();

        //conversionResult = await convertCSVtoWebConfig("filepath", Target.nginx, "sub");

        //expect(conversionResult.file).to.eql("rewrite /sub/data/123-E$ http://test.test/123-E redirect ;\nrewrite /sub/representation/124-E$ http://test.test/124-E redirect ;\n");

    });
});
