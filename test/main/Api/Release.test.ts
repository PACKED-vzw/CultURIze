import * as octo from "@octokit/rest";
import { expect } from "chai";
import { getLatestRelease } from "../../../src/main/Api/Release";

import * as sinon from "sinon";


describe("Release", () => {
    it("retrieve version info", async function() {
        const octokit = new octo.Octokit();

        const mock = sinon.mock(octokit.repos).expects("getLatestRelease");
        mock
        .withArgs({ owner: "PACKED-vzw", repo: "CultURIze"})
        .returns({ data: { tag_name: "v1.2.3" } });
        mock.once();

        const version = await getLatestRelease(octokit);

        mock.verify();
        expect(version.getVersion()).to.eql([1, 2, 3]);
        mock.restore();
    });

});
