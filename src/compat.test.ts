import { describe, expect, it } from "vitest";
import { parseCompat, validate, type CompatRecord } from "./compat.js";

export const sample = (overrides: Partial<CompatRecord> = {}): CompatRecord => ({
  schema: 1, tool: "mcp-proof", version: "0.1.0", generatedAt: "2026-11-03T10:00:00.000Z",
  system: { os: "linux", arch: "x64", release: "6.0", node: "v22.0.0" },
  server: { command: "npx", args: ["-y", "pkg"], envNames: [] },
  results: [
    { client: "claude-code", clientName: "Claude Code", standin: false, clientVersion: "2.1.317", label: "verified", commands: ["claude mcp list"], startedAt: "2026-11-03T10:00:01.000Z", durationMs: 3000, methods: ["initialize", "tools/list"], realHome: "unchanged", notes: [] },
    { client: "codex", clientName: "Codex", standin: false, clientVersion: null, label: "not-installed", commands: [], startedAt: "2026-11-03T10:00:04.000Z", durationMs: 5, methods: [], realHome: "unknown", notes: [], installHint: "Install Codex by hand." },
  ],
  ...overrides,
});

describe("validate", () => {
  it("accepts a good record", () => {
    expect(validate(sample())).toEqual([]);
  });
  it("names what is wrong", () => {
    expect(validate(null)).toEqual(["the document is not an object"]);
    expect(validate({ ...sample(), schema: 2 })).toContain("schema must be 1");
    const bad = sample();
    (bad.results[0] as unknown as { label: string }).label = "great";
    expect(validate(bad).join(" ")).toContain("results[0].label");
    expect(validate({ ...sample(), results: "x" })).toContain("results must be an array");
  });
});

describe("parseCompat", () => {
  it("round-trips JSON text", () => {
    expect(parseCompat(JSON.stringify(sample())).results).toHaveLength(2);
  });
  it("throws a plain message for broken input", () => {
    expect(() => parseCompat("{")).toThrow(/not valid JSON/);
    expect(() => parseCompat("{}")).toThrow(/Not a valid compat.json/);
  });
});
