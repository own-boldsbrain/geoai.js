import { describe } from "vitest";
import { queryAgent } from "../src/geobase-agent";
import { it } from "vitest";
import { mapboxParams } from "./constants";

describe("queryAgent", () => {
  it("should select the correct task and return formatted response", async () => {
    const queries = [
      "Can you find just the trees in this area?",
      "Can you identify only the buildings here?",
      "Can you show me just the roads in this place?",
      "Can you tell me what this area is used for?",
      "Can you mask  this area into different types of land use?",
    ];

    await Promise.all(
      queries.map(async userQuery => {
        const response = await queryAgent(userQuery, mapboxParams);
        console.log({ response: response.task, userQuery });
      })
    );
  });
});
