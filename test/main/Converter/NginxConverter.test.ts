import { expect } from "chai";
import { CSVRow } from "./../../../src/common/Objects/CSVRow";
import { CSVConf } from "./../../../src/culturize.conf";
import { NginxConverter } from "./../../../src/main/Converter/NginxConverter";

import * as sinon from "sinon";


describe("Nginx converter", () => {
    it("Nginx conversion", async () => {
        const rowData: { [id: string]: string } = {};
        rowData[CSVConf.COL_PID] = "pid";
        rowData[CSVConf.COL_DOCTYPE] = "doctype";
        rowData[CSVConf.COL_URL] = "https://test.test";
        rowData[CSVConf.COL_ENABLED] = "1";

        CSVRow.count = 0;
        const row = CSVRow.createRow(rowData);
        const rows: CSVRow[]  = [row];

        const nginxConverter = new NginxConverter(rows, "sub");
        const nginxConf = nginxConverter.makeNginxConfFile();

        expect(nginxConf).to.eql("rewrite /sub/doctype/pid$ https://test.test redirect ;\n");
    });
});
