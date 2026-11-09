import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "./cli.js";
import { SETUP_PROMPT, defaultServer, needsWarmUp, nextHints, setupCommand, setupSteps } from "./setup.js";

const root = path.resolve(import.meta.dirname, "..");
const capture = () => {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (s: string) => void out.push(s), err: (s: string) => void err.push(s) } };
};
const project = (json: string) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mcp-proof setup-"));
  writeFileSync(path.join(dir, "package.json"), json);
  return dir;
};

describe("setup steps", () => {
  it("includes the warm-up only for a server that has to be downloaded", () => {
    expect(needsWarmUp("npx -y my-server")).toBe(true);
    expect(needsWarmUp("uvx my-server")).toBe(true);
    expect(needsWarmUp("pnpm dlx my-server")).toBe(true);
    expect(needsWarmUp("node ./dist/main.js")).toBe(false);
    expect(setupSteps({ server: "npx -y my-server", out: "proof", ci: false })).toContain("Warm up your server once");
    expect(setupSteps({ server: "node ./dist/main.js", out: "proof", ci: false })).not.toContain("Warm up");
  });
  it("prints the run with the server and the folder filled in, the labels and where the evidence goes", () => {
    const text = setupSteps({ server: "node ./dist/main.js --flag", out: "my proof", ci: false });
    expect(text).toContain('run --out "my proof" --server "node ./dist/main.js --flag"');
    for (const label of ["verified", "started", "failed", "not-installed"]) expect(text).toContain(label);
    expect(text).toContain("my proof/table.md");
    expect(text).not.toContain("voyageurworks/mcp-proof@v0");
    expect(setupSteps({ server: "node x.js", out: "proof", ci: true })).toContain("voyageurworks/mcp-proof@v0");
  });
});

describe("the default server", () => {
  it("comes from the package name in ./package.json, and only when that name is a plausible package name", () => {
    expect(defaultServer(project('{"name":"@me/cool-server"}'))).toBe("npx -y @me/cool-server");
    expect(defaultServer(project('{"name":"cool-server"}'))).toBe("npx -y cool-server");
    expect(defaultServer(project('{"name":"x; rm -rf /"}'))).toBeUndefined();
    expect(defaultServer(project("not json"))).toBeUndefined();
    expect(defaultServer(project("{}"))).toBeUndefined();
    expect(defaultServer(path.join(os.tmpdir(), "no-such-folder-for-mcp-proof"))).toBeUndefined();
  });
});

describe("the setup command", () => {
  it("prints the steps from flags", async () => {
    const c = capture();
    expect(await setupCommand(["--server", "node s.js", "--out", "ev"], { ...c.io, cwd: "/x" })).toBe(0);
    expect(c.out.join("")).toContain('--server "node s.js"');
  });
  it("asks when it is interactive, offering the package name as the default", async () => {
    const cwd = project('{"name":"cool-server"}');
    const asked: string[] = [];
    const answers = ["", ""];
    const c = capture();
    expect(await setupCommand([], { ...c.io, cwd, interactive: true, ask: async question => (asked.push(question), answers.shift() ?? "") })).toBe(0);
    expect(asked[0]).toContain("[npx -y cool-server]");
    expect(c.out.join("")).toContain("Server: npx -y cool-server");
    expect(c.out.join("")).toContain("Evidence folder: proof");
  });
  it("says what to do when there is no server to prove, and prints usage and the prompt without doing anything", async () => {
    const none = capture();
    expect(await setupCommand([], { ...none.io, cwd: path.join(os.tmpdir(), "no-such-folder-for-mcp-proof") })).toBe(2);
    expect(none.err.join("")).toMatch(/say which server to prove/);
    const help = capture();
    expect(await main(["setup", "--help"], help.io)).toBe(0);
    expect(help.out.join("")).toMatch(/Usage: mcp-proof setup/);
    const prompt = capture();
    expect(await main(["setup", "--prompt"], prompt.io)).toBe(0);
    expect(prompt.out.join("").trim()).toBe(SETUP_PROMPT);
  });
  it("the missing-server error of run points at setup", async () => {
    const c = capture();
    expect(await main(["run"], c.io)).toBe(2);
    expect(c.err.join("")).toMatch(/mcp-proof setup/);
  });
});

describe("next-step hints", () => {
  it("explain a run with nothing installed, a verified run, a failure and not-installed clients", () => {
    expect(nextHints(["not-installed", "not-installed"], { server: "npx" }).join("\n")).toMatch(/No client was found/);
    expect(nextHints(["verified"], { out: "proof", server: "npx" }).join("\n")).toContain("Paste proof/table.md");
    expect(nextHints(["verified"], { server: "npx" }).join("\n")).toMatch(/--out proof/);
    const failed = nextHints(["failed"], { server: "npx" }).join("\n");
    expect(failed).toMatch(/run it once yourself first/);
    expect(failed).toMatch(/--timeout 180/);
    expect(nextHints(["verified", "not-installed"], { server: "npx" }).join("\n")).toMatch(/not a failure/);
  });
});

describe("the documents carry the same text the command prints", () => {
  it("docs/setup-prompt.md has the paste-in prompt, word for word", () => {
    expect(readFileSync(path.join(root, "docs", "setup-prompt.md"), "utf8").replace(/\r\n/g, "\n")).toContain(SETUP_PROMPT);
  });
});
