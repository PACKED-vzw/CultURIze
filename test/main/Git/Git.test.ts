import * as octo from "@octokit/rest";
import { expect } from "chai";
import * as path from "path";
import { User } from "../../../src/common/Objects/User";
import { GitRepoManager } from "../../../src/main/Git/Git";

import * as log from "electron-log";
import * as fs from "fs";
// import { Git } from "simple-git/src/git";
import * as sinon from "sinon";


describe("GitRepoManager", () => {
    it("construction", () => {
        const user = new User("token", "user", "URL");
        const fsstub = sinon.stub(fs, "existsSync").returns(true);

        let gitRepoManager: GitRepoManager =
            new GitRepoManager("https://github.com/PACKED-vzw/CultURIze", "master", user, "/test");

        expect(gitRepoManager.repoURL).to.eql("https://github.com/PACKED-vzw/CultURIze");
        expect(gitRepoManager.user.userName).to.eql("user");
        expect(gitRepoManager.branch).to.eql("master");
        expect(gitRepoManager.repoName).to.eql("CultURIze");
        expect(gitRepoManager.ownerName).to.eql("PACKED-vzw");
        expect(gitRepoManager.workingDir).to.eql("/test");
        expect(gitRepoManager.repoDir).to.eql(path.join("/test", "CultURIze"));

        fsstub.returns(false);
        const fsmock = sinon.mock(fs).expects("mkdirSync");
        fsmock.once();

        gitRepoManager = new GitRepoManager("https://github.com/PACKED-vzw/CultURIze", "master", user, "/test");

        fsmock.verify();
        fsstub.restore();
        fsmock.restore();
    });

    xit("updateLocalCopy", async () => {
        const user = new User("token", "user", "URL");
        const fsstub = sinon.stub(fs, "existsSync").returns(true);
        const logStubs = [sinon.stub(log, "error"), sinon.stub(log, "info"), sinon.stub(log, "warn")];
        //sinon.stub(Git.prototype, "_run").callsFake(function(command, cb) {
        //    console.log("called command", command);

        //    // to indicate success
        //    cb.call(this, null, "any message");

        //    return this;
        //});

        const gitRepoManager: GitRepoManager =
            new GitRepoManager("https://github.com/PACKED-vzw/CultURIze", "master", user, "/test");
        // hasRepo
        //  fs existsSync mock
        //  simpleGit isRepo mock
        // updatelocalcopy
        //  simpleGit checkout reset and pull mock
        //  simpleGit clone mock

        fsstub.returns(false);
        await gitRepoManager.updateLocalCopy();

        fsstub.restore();
        for (const lstub of logStubs) {
            lstub.restore();
        }
    });

    xit("saveStringToFile", async () => {
        // fs writeFileSync mock
    });

    xit("pushChanges", async () => {
        // simplegit mock add commit push
    });

});
