import { describe, expect, it } from "vitest";
import { parseLaunch, platformLaunch, splitCommand } from "./launch.js";

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
  it("runs npm-style shims and bare commands through cmd /c on Windows", () => {
    expect(platformLaunch({ command: "npx", args: ["-y", "x"] }, "win32")).toEqual({ command: "cmd", args: ["/c", "npx", "-y", "x"] });
    expect(platformLaunch({ command: "claude", args: ["--version"] }, "win32")).toEqual({ command: "cmd", args: ["/c", "claude", "--version"] });
    expect(platformLaunch({ command: "tool.cmd", args: [] }, "win32").command).toBe("cmd");
  });
  it("does not wrap node or an explicit path to an executable", () => {
    expect(platformLaunch({ command: "node", args: ["a.js"] }, "win32")).toEqual({ command: "node", args: ["a.js"] });
    expect(platformLaunch({ command: "C:\\tools\\thing.exe", args: [] }, "win32").command).toBe("C:\\tools\\thing.exe");
  });
});
