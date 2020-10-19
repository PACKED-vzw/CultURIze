import { expect } from "chai";
import { User } from "../../../src/common/Objects/User";

describe("UserObject", () => {
    it("user construction", () => {
        const user = new User("token", "user", "URL");
        expect(user.userName).to.eql("user");
        expect(user.avatarURL).to.eql("URL");
        expect(user.token).to.eql("token");
    });

    it("user without token", () => {
        const user = new User("token", "user", "URL");
        const nUser = user.withoutToken();
        expect(nUser.userName).to.eql("user");
        expect(nUser.avatarURL).to.eql("URL");
        expect(nUser.token).to.be.null;
    });
});
