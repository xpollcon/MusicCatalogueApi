import { lambdaHandler } from "../../app";
import { expect } from "chai";
import event from "../events/appsync.json";

const context = {};

describe("Tests Lambda handler", function () {
  it("verifies successful response", async () => {
    const result = await lambdaHandler(event, context);

    expect(result).to.be.an("string");
    expect(result).to.be.equal("Hello, User");
  });
});
