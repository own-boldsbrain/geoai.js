import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";

describe("geobase-ai", () => {
  it("should be an object", () => {
    expect(geobaseAi).toBeInstanceOf(Object);
  });

  it("should have a function called tasks", () => {
    expect(geobaseAi.tasks).toBeInstanceOf(Function);
  });

  it("should have a function called models", () => {
    expect(geobaseAi.models).toBeInstanceOf(Function);
  });

  it("calling the models function should return an array of model metadata", () => {
    expect(geobaseAi.models()).toBeInstanceOf(Array);
  });
});
