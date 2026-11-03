import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseLaunch, platformLaunch, quoteForCmd, splitCommand } from "./launch.js";
import { runProcess } from "./proc.js";

describe("splitCommand", () => {
  it("splits on spaces and honours quotes", () => {
    expect(splitCommand('npx -y "@scope/pkg name" --flag=\'a b\'')).toEqual(["npx", "-y", "@scope/pkg name", "--flag=a b"]);
  });
  it("keeps an empty quoted argument", () => {
    expect(splitCommand('cmd "" x')).toEqual(["cmd", "", "x"]);
  });
  it("handles an escaped quote inside double quotes", () => {
    expect(splitCommand('say "he said \\"hi\\""')).toEqual(["say", 'he said "hi"']);
  });
  it("rejects an unclosed quote", () => {
    expect(() => splitCommand('a "b')).toThrow(/quote/i);
  });
});

describe("parseLaunch", () => {
  it("returns the command and its arguments", () => {
    expect(parseLaunch("node server.js --port 1")).toEqual({ command: "node", args: ["server.js", "--port", "1"] });
  });
  it("rejects an empty command", () => {
    expect(() => parseLaunch("   ")).toThrow(/empty/);
  });
});

describe("platformLaunch", () => {
  it("leaves everything alone off Windows", () => {
    expect(platformLaunch({ command: "npx", args: ["-y", "x"] }, "linux")).toEqual({ command: "npx", args: ["-y", "x"] });
  });
  it("runs npm-style shims and bare commands through cmd.exe on Windows, as one verbatim command line", () => {
    expect(platformLaunch({ command: "npx", args: ["-y", "x"] }, "win32")).toEqual({ command: "cmd", args: ["/d", "/s", "/c", '"npx -y x"'], verbatim: true });
    expect(platformLaunch({ command: "claude", args: ["--version"] }, "win32")).toEqual({ command: "cmd", args: ["/d", "/s", "/c", '"claude --version"'], verbatim: true });
    expect(platformLaunch({ command: "tool.cmd", args: [] }, "win32").command).toBe("cmd");
  });
  it("quotes arguments so cmd.exe cannot read them as a second command", () => {
    const launched = platformLaunch({ command: "npx", args: ["--url", "http://h/p?a=1&b=2", "x&echo>owned.txt", "has space", "q\"uote"] }, "win32");
    expect(launched.args[3]).toBe('"npx --url "http://h/p?a=1&b=2" "x&echo>owned.txt" "has space" "q""uote""');
    expect(launched.verbatim).toBe(true);
  });
  it("does not wrap node or an explicit path to an executable", () => {
    expect(platformLaunch({ command: "node", args: ["a.js"] }, "win32")).toEqual({ command: "node", args: ["a.js"] });
    expect(platformLaunch({ command: "C:\\tools\\thing.exe", args: [] }, "win32").command).toBe("C:\\tools\\thing.exe");
  });
});

describe("quoteForCmd", () => {
  it("leaves plain words alone and quotes anything cmd.exe treats specially", () => {
    expect(quoteForCmd("plain-word_1.2")).toBe("plain-word_1.2");
    expect(quoteForCmd("")).toBe('""');
    for (const word of ["a&b", "a|b", "a<b", "a>b", "a^b", "a(b", "a)b", "a b", "a!b", "a%b%"]) expect(quoteForCmd(word)).toBe(`"${word}"`);
    expect(quoteForCmd('say "hi"')).toBe('"say ""hi"""');
  });
});

// Real cmd.exe, so only on Windows: a payload made of metacharacters must run nothing, and a URL with & must arrive whole.
describe.skipIf(process.platform !== "win32")("on a real Windows cmd.exe", () => {
  it("passes & through to the program and runs no second command", async () => {
    const dir = mkdtempSync(path.join(process.env.MCP_PROOF_TEST_TMP ?? os.tmpdir(), "mcp-proof-cmd-"));
    const shim = path.join(dir, "seen.cmd");
    // Delayed expansion prints the received argument without cmd.exe parsing it a second time.
    writeFileSync(shim, '@echo off\r\nsetlocal EnableDelayedExpansion\r\nset "A=%~1"\r\nset "B=%~2"\r\n>"%~dp0one.txt" echo(!A!\r\n>"%~dp0two.txt" echo(!B!\r\n');
    const result = await runProcess({ command: shim, args: ["http://h/p?a=1&b=2", "x&echo>owned.txt"] }, { env: process.env as Record<string, string>, cwd: dir, timeoutMs: 20_000 });
    expect(result.code).toBe(0);
    expect(readFileSync(path.join(dir, "one.txt"), "utf8").trim()).toBe("http://h/p?a=1&b=2");
    expect(readFileSync(path.join(dir, "two.txt"), "utf8").trim()).toBe("x&echo>owned.txt");
    expect(existsSync(path.join(dir, "owned.txt"))).toBe(false);
  });
});
