import { expect } from "chai";
import { PublishRequest, PublishRequestResult } from "../../../src/common/Objects/PublishObjects";
import { User } from "../../../src/common/Objects/UserObject";

describe("PublishRequest", () => {
    it("PublishRequest construction", () => {
        const pr = new PublishRequest("csv", "dir", "url", "branch", "commitmsg", "prtitle", "prbody", true, true);
        expect(pr.csvPath).to.eql("csv");
        expect(pr.subdir).to.eql("dir");
        expect(pr.repoUrl).to.eql("url");
        expect(pr.branch).to.eql("branch");
        expect(pr.commitMsg).to.eql("commitmsg");
        expect(pr.prTitle).to.eql("prtitle");
        expect(pr.prBody).to.eql("prbody");
        expect(pr.user).to.be.undefined;
        expect(pr.forApache).to.be.true;
    });

    it("PublishRequest functions", () => {
        const pr = new PublishRequest("csv", "dir", "url", "branch", "commitmsg", "prtitle", "prbody", true, true);
        expect(pr.hasUser()).to.be.false;
        pr.user = new User("token", "user", "URL");
        expect(pr.hasUser()).to.be.true;
        expect(pr.hasSelectedFile()).to.be.true;
        pr.csvPath = "";
        expect(pr.hasSelectedFile()).to.be.false;
    });
});

describe("PublishRequestResult", () => {
    it("PublishRequestResult construction", () => {
        const prr = new PublishRequestResult(true);
        expect(prr.successful).to.be.true;
        expect(prr.error).to.be.null;
        expect(prr.numLinesAccepted).to.eql(0);
        expect(prr.numLinesRejected).to.eql(0);
    });
});
