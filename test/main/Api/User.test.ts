import * as octo from "@octokit/rest";
import { expect } from "chai";
import { getUserInfo } from "../../../src/main/Api/User";

import * as sinon from "sinon";


describe("gitlab user", () => {
    it("Authenticate gitlab user", async function() {
        const octokit = new octo.Octokit();

        const rmock = sinon.mock(octokit).expects("request");
        rmock
        .withArgs("HEAD /")
        .returns({ headers: { "x-oauth-scopes": "test, repo, test" }});
        rmock.once();

        const umock = sinon.mock(octokit.users).expects("getAuthenticated");
        umock
        .returns({ data: { login: "testuser", avatar_url: "testURL"}});
        umock.once();

        const user = await getUserInfo("token", octokit);

        rmock.verify();
        umock.verify();
        expect(user.userName).to.eql("testuser");
        expect(user.avatar_url).to.eql("testURL");
    });

});
