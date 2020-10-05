import { expect } from "chai";
import { Version } from "../../../src/common/Objects/VersionObject";

describe("VersionObject", () => {
    it("version construction", () => {
        let version = new Version("1.2.3");
        expect(version.getVersion()).to.eql([1, 2, 3]);

        version = new Version("10.20.30");
        expect(version.getVersion()).to.eql([10, 20, 30]);
    });

    it("version comparison", () => {
        const v1 = new Version("4.5.6");

        let v2 = new Version("5.0.0");
        expect(v1.isNewer(v2)).to.be.true;
        v2 = new Version("3.0.0");
        expect(v1.isNewer(v2)).to.be.false;

        v2 = new Version("4.6.0");
        expect(v1.isNewer(v2)).to.be.true;
        v2 = new Version("4.0.0");
        expect(v1.isNewer(v2)).to.be.false;

        v2 = new Version("4.5.8");
        expect(v1.isNewer(v2)).to.be.true;
        v2 = new Version("4.5.0");
        expect(v1.isNewer(v2)).to.be.false;
    });
});
