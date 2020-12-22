import { expect } from "chai";
import { Action, ActionRequest, Target } from "../../../src/common/Objects/ActionRequest";
import { User } from "../../../src/common/Objects/User";

describe("ActionRequest", () => {
    it("ActionRequest construction", () => {
        const ar = new ActionRequest(Action.publish, "csv", "dir", "url", "branch", "commitmsg", Target.apache);
        expect(ar.action).to.eql(Action.publish);
        expect(ar.csvPath).to.eql("csv");
        expect(ar.subdir).to.eql("dir");
        expect(ar.repoUrl).to.eql("url");
        expect(ar.branch).to.eql("branch");
        expect(ar.commitMsg).to.eql("commitmsg");
        expect(ar.user).to.be.undefined;
        expect(ar.target).to.eql(Target.apache);
    });

    it("PublishRequest functions", () => {
        const ar = new ActionRequest(Action.validate, "csv", "dir", "url", "branch", "commitmsg", Target.nginx);
        expect(ar.hasUser()).to.be.false;
        ar.user = new User("token", "user", "URL");
        expect(ar.hasUser()).to.be.true;
        expect(ar.hasSelectedFile()).to.be.true;
        ar.csvPath = "";
        expect(ar.hasSelectedFile()).to.be.false;
    });
});
