import { describe, expect, it } from "vitest";
import { addArguments, claudeEnv } from "./claudeCode.js";
import { RECIPES, recipeById } from "./index.js";

describe("claude mcp add arguments", () => {
  const wrapped = { command: "node", args: ["main.js", "wrap", "--log", "x.log", "--", "npx", "-y", "pkg"] };
  it("puts the server name before any -e option, because -e takes several values", () => {
    const args = addArguments({ serverEnv: { A: "1", B: "two words" }, wrapped });
    expect(args.slice(0, 3)).toEqual(["mcp", "add", "proofsrv"]);
    expect(args.indexOf("proofsrv")).toBeLessThan(args.indexOf("-e"));
    expect(args).toContain("A=1");
    expect(args).toContain("B=two words");
  });
  it("puts the command after a double dash, unchanged", () => {
    const args = addArguments({ serverEnv: {}, wrapped });
    expect(args.slice(args.indexOf("--") + 1)).toEqual(["node", ...wrapped.args]);
  });
});

describe("claudeEnv", () => {
  const home = { root: "/h", env: { HOME: "/h", PATH: "/bin" } };
  it("gives Claude Code a start-up wait that follows mcp-proof's own timeout", () => {
    expect(claudeEnv({ home, timeoutMs: 90_000 }).MCP_TIMEOUT).toBe("80000");
    expect(claudeEnv({ home, timeoutMs: 5_000 }).MCP_TIMEOUT).toBe("10000");
  });
  it("keeps the throwaway home and adds nothing from the caller's environment", () => {
    const env = claudeEnv({ home, timeoutMs: 60_000 });
    expect(env.HOME).toBe("/h");
    expect(env.CLAUDE_CONFIG_DIR).toBe("/h/.claude");
    expect(Object.keys(env).sort()).toEqual(["CLAUDE_CONFIG_DIR", "HOME", "MCP_TIMEOUT", "PATH"]);
  });
});

describe("recipe list", () => {
  it("has unique ids and finds each by id", () => {
    const ids = RECIPES.map(recipe => recipe.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(recipeById(id)?.id).toBe(id);
    expect(recipeById("nope")).toBeUndefined();
  });
  it("every real client tells a person how to install it by hand and never installs itself", () => {
    for (const recipe of RECIPES.filter(r => !r.standin)) expect(recipe.installHint.length).toBeGreaterThan(10);
  });
});
