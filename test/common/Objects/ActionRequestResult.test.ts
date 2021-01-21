import { expect } from "chai";
import { Action } from "../../../src/common/Objects/ActionRequest";
import { ActionRequestResult } from "../../../src/common/Objects/ActionRequestResult";

describe("PublishRequestResult", () => {
    it("PublishRequestResult construction", () => {
        const arr = new ActionRequestResult(Action.publish, true, false);
        expect(arr.successful).to.be.true;
        expect(arr.aborted).to.be.false;
        expect(arr.error).to.be.null;
        expect(arr.numLinesAccepted).to.eql(0);
        expect(arr.numLinesRejected).to.eql(0);
    });
});
