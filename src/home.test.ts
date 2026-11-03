import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compareSnapshots, createHome, snapshot } from "./home.js";

const scratch = () => mkdtempSync(path.join(process.env.MCP_PROOF_TEST_TMP ?? os.tmpdir(), "mcp-proof-test-"));

describe("createHome", () => {
  it("points every home variable at a new folder and drops anything that looks like a login", () => {
    const source = { PATH: "/bin", SystemRoot: "C:\Windows", ANTHROPIC_API_KEY: "FAKE-key-value", GITHUB_TOKEN: "FAKE-token", HOME: "/real", USERPROFILE: "C:\real", MY_SECRET: "x", TEMP: "/tmp" };
    const home = createHome(scratch(), {}, source, "linux");
    for (const name of ["HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "XDG_CONFIG_HOME", "XDG_DATA_HOME"]) expect(home.env[name]!.startsWith(home.root)).toBe(true);
    expect(home.env.PATH).toBe("/bin");
    expect(home.env.TEMP).toBe("/tmp");
    expect(Object.keys(home.env).join(" ")).not.toMatch(/KEY|TOKEN|SECRET/);
    expect(JSON.stringify(home.env)).not.toContain("FAKE-");
  });
  it("keeps a variable the caller asks for by name", () => {
    expect(createHome(scratch(), { CHOSEN: "yes" }, {}, "linux").env.CHOSEN).toBe("yes");
  });
  it("sets the drive variables on Windows", () => {
    const home = createHome(scratch(), {}, {}, "win32");
    expect(home.env.HOMEPATH).toBeDefined();
  });
  it("makes a different folder every time", () => {
    const root = scratch();
    expect(createHome(root, {}, {}).root).not.toBe(createHome(root, {}, {}).root);
  });
});

describe("snapshot", () => {
  it("notices a new file, a changed file and a missing folder", () => {
    const home = scratch();
    mkdirSync(path.join(home, ".client"));
    writeFileSync(path.join(home, ".client", "a.json"), "{}");
    const before = snapshot(home, [".client", ".other"]);
    expect(compareSnapshots(before, snapshot(home, [".client", ".other"]))).toBe("unchanged");
    writeFileSync(path.join(home, ".client", "b.json"), "{}");
    expect(compareSnapshots(before, snapshot(home, [".client", ".other"]))).toBe("changed");
    const mid = snapshot(home, [".client"]);
    utimesSync(path.join(home, ".client", "a.json"), new Date(2020, 1, 1), new Date(2020, 1, 1));
    expect(compareSnapshots(mid, snapshot(home, [".client"]))).toBe("changed");
    mkdirSync(path.join(home, ".other"));
    expect(snapshot(home, [".other"])).not.toContain("missing");
  });
});
