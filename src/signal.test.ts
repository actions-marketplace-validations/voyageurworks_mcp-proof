import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
const MAIN = path.join(ROOT, "dist", "main.js");
const TMP = process.env.MCP_PROOF_TEST_TMP ?? os.tmpdir();

const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function until(check: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (check()) return true; await new Promise(r => setTimeout(r, 100)); }
  return check();
}

// Windows delivers Ctrl-C to a console group, not to a single child, so this is checked on Linux and macOS (CI runs both).
describe.skipIf(process.platform === "win32")("an interrupted run", () => {
  it("stops the server it started and removes its throwaway folders", async () => {
    const scratch = mkdtempSync(path.join(TMP, "mcp-proof-sig-"));
    const pidFile = path.join(scratch, "server.pid");
    // A server that writes its own process id, then waits forever and never answers.
    const code = `require("fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(function(){}, 1000)`;
    const child = spawn(process.execPath, [MAIN, "run", "--client", "standin", "--scratch", scratch, "--timeout", "60", "--", process.execPath, "-e", code], { stdio: "ignore" });
    const exited = new Promise<number | null>(resolve => child.on("close", resolve));
    expect(await until(() => existsSync(pidFile), 20_000)).toBe(true);
    const serverPid = Number(readFileSync(pidFile, "utf8"));
    expect(alive(serverPid)).toBe(true);
    child.kill("SIGINT");
    expect(await exited).toBe(130);
    expect(await until(() => !alive(serverPid), 10_000)).toBe(true);
    expect(readdirSync(scratch).filter(name => name.startsWith("mcp-proof-run-"))).toEqual([]);
  });
});
