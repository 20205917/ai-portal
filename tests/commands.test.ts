import { describe, expect, it } from "vitest";

import { parseAidcArgs } from "../src/shared/commands";

describe("parseAidcArgs", () => {
  it("finds a command inside Electron argv", () => {
    expect(parseAidcArgs(["electron", ".", "--", "toggle"])).toEqual({
      command: "toggle"
    });
  });

  it("requires provider id for open", () => {
    expect(() => parseAidcArgs(["open"])).toThrow(/providerId/i);
  });

  it("supports next and prev commands", () => {
    expect(parseAidcArgs(["next"])).toEqual({ command: "next" });
    expect(parseAidcArgs(["prev"])).toEqual({ command: "prev" });
  });
});
