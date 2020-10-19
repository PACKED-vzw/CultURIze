import { expect } from "chai";
import { Action, ActionRequest, Target } from "../../../src/common/Objects/ActionRequest";
import { CSVRow } from "../../../src/common/Objects/CSVRow";
import { CSVConf } from "./../../../src/culturize.conf";
// import { publish } from "./../../../src/main/Actions/Publishing";

import * as sinon from "sinon";
import { mainWindow } from "./../../../src/main";

describe("Publishing", () => {
    xit("publish", async () => {
        // difficult to handle source files that include functions from main, as this will try to
        // initialize electron functions

        // console.log("TODO");
        // const fake = sinon.fake();
        // const stub = sinon.stub(mainWindow, "webContents").value({ send: fake });

        // const actionRequest = new ActionRequest(Action.publish, "filepath", "subdir", "repoUrl",
        //                                         "branch", "commitMsg", "prTitle", "prBody",
        //                                         Target.apache);
        // await publish(actionRequest, "repoPath");

        // console.log(fake.callCount);


    });
});
