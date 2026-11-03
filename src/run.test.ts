import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validate } from "./compat.js";
import { standin } from "./recipes/standin.js";
import { runAll } from "./run.js";
import type { Recipe } from "./types.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const SELF = path.join(ROOT, "dist", "main.js");
const FIXTURE = path.join(ROOT, "test", "fixtures", "echo-server.mjs");
const scratch = () => mkdtempSync(path.join(process.env.MCP_PROOF_TEST_TMP ?? os.tmpdir(), "mcp-proof-run-"));
const server = { command: process.execPath, args: [FIXTURE] };

describe("runAll with the stand-in client", () => {
  it("labels a working server verified and records only method names", async () => {
    const root = scratch();
    const record = await runAll({ server, recipes: [standin], serverEnv: {}, timeoutMs: 30_000, scratchRoot: root, self: SELF });
    expect(validate(record)).toEqual([]);
    const result = record.results[0]!;
    expect(result.label).toBe("verified");
    expect(result.standin).toBe(true);
    expect(result.methods).toEqual(["initialize", "notifications/initialized", "tools/list"]);
    expect(result.realHome).toBe("unknown");
    // The throwaway homes are removed, and no private path reaches the record.
    expect(readdirSync(root).filter(name => name.startsWith("home-"))).toEqual([]);
    expect(JSON.stringify(record)).not.toContain(root);
  });

  it("labels a server whose tools/list fails as started", async () => {
    const record = await runAll({ server, recipes: [standin], serverEnv: { ECHO_SERVER_MODE: "no-tools" }, timeoutMs: 30_000, scratchRoot: scratch(), self: SELF });
    expect(record.results[0]!.label).toBe("started");
  });

  it("labels a server that exits at once as failed, with a note", async () => {
    const record = await runAll({ server, recipes: [standin], serverEnv: { ECHO_SERVER_MODE: "exit-early" }, timeoutMs: 30_000, scratchRoot: scratch(), self: SELF });
    expect(record.results[0]!.label).toBe("failed");
    expect(record.results[0]!.notes.join(" ")).toMatch(/exited or timed out/);
  });

  it("labels a server that does not exist as failed", async () => {
    const record = await runAll({ server: { command: path.join(ROOT, "no-such-server.exe"), args: [] }, recipes: [standin], serverEnv: {}, timeoutMs: 30_000, scratchRoot: scratch(), self: SELF });
    expect(record.results[0]!.label).toBe("failed");
  });

  it("times out a server that never answers", async () => {
    const silent = { command: process.execPath, args: ["-e", "setInterval(() => {}, 1000)"] };
    const started = Date.now();
    const record = await runAll({ server: silent, recipes: [standin], serverEnv: {}, timeoutMs: 5_000, scratchRoot: scratch(), self: SELF });
    expect(record.results[0]!.label).toBe("failed");
    expect(Date.now() - started).toBeLessThan(30_000);
  });

  it("records the names of server variables but never their values, and hides login-looking arguments", async () => {
    const value = "FAKE-value-" + "q".repeat(20);
    const record = await runAll({ server: { command: process.execPath, args: [FIXTURE, "--api-key", value] }, recipes: [standin], serverEnv: { MY_SERVER_VAR: value }, timeoutMs: 30_000, scratchRoot: scratch(), self: SELF });
    const text = JSON.stringify(record);
    expect(text).not.toContain(value);
    expect(record.server.envNames).toEqual(["MY_SERVER_VAR"]);
    expect(record.server.args[1]).toBe("--api-key");
    expect(record.server.args[2]).toBe("<redacted>");
  });
});

describe("runAll with a missing client", () => {
  it("reports not-installed with the install hint and runs nothing", async () => {
    const missing: Recipe = { id: "ghost", name: "Ghost Client", realHomePaths: [], installHint: "Install Ghost by hand.", detect: async () => ({ installed: false }), run: async () => { throw new Error("must not run"); } };
    const record = await runAll({ server, recipes: [missing], serverEnv: {}, timeoutMs: 5_000, scratchRoot: scratch(), self: SELF });
    expect(record.results[0]).toMatchObject({ label: "not-installed", commands: [], installHint: "Install Ghost by hand." });
    expect(existsSync(SELF)).toBe(true);
  });

  it("reports a recipe that throws as failed instead of crashing", async () => {
    const broken: Recipe = { id: "broken", name: "Broken", realHomePaths: [], installHint: "", detect: async () => ({ installed: true, version: "1.0.0" }), run: async () => { throw Object.assign(new Error("boom"), { code: "EBOOM" }); } };
    const record = await runAll({ server, recipes: [broken], serverEnv: {}, timeoutMs: 5_000, scratchRoot: scratch(), self: SELF });
    expect(record.results[0]!.label).toBe("failed");
    expect(record.results[0]!.notes[0]).toContain("EBOOM");
  });
});
