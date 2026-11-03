import { describe, expect, it } from "vitest";
import { redactArgs, scrubPaths } from "./redact.js";

describe("redactArgs", () => {
  it("hides values that follow a sensitive flag, in either form", () => {
    expect(redactArgs(["-y", "pkg", "--api-key", "FAKEVALUE", "--name", "ok"])).toEqual(["-y", "pkg", "--api-key", "<redacted>", "--name", "ok"]);
    expect(redactArgs(["--token=abc123", "TOKEN_X=1"])).toEqual(["--token=<redacted>", "TOKEN_X=<redacted>"]);
  });
  it("hides long random-looking words and URL passwords but keeps normal arguments", () => {
    const longWord = "Ab3" + "x9Z".repeat(12);
    expect(redactArgs([longWord, "postgres://user:pw@host/db", "@scope/package", "--port", "8080"])).toEqual(["<redacted>", "postgres://<redacted>@host/db", "@scope/package", "--port", "8080"]);
  });
});

describe("scrubPaths", () => {
  it("replaces a path in both slash styles", () => {
    const b = String.fromCharCode(92);
    const win = ["C:", "a", "b", "home-1"].join(b);
    const slash = "C:/a/b/home-1";
    expect(scrubPaths(`${win}${b}x and ${slash}/y`, [[win, "<home>"]])).toBe(`<home>${b}x and <home>/y`);
  });
});
