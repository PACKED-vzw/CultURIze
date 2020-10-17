import { expect } from "chai";
import { ConversionResult } from "../../../src/common/Objects/ConversionResult";
import { User } from "../../../src/common/Objects/User";

describe("ConversionResult", () => {
    it("ConversionResult construction", () => {
        const cr = new ConversionResult("test content", 66, 1337, []);
        expect(cr.file).to.eql("test content");
        expect(cr.numLinesRejected).to.eql(66);
        expect(cr.numLinesAccepted).to.eql(1337);
        expect(cr.rows.length).to.eql(0);
    });

});
