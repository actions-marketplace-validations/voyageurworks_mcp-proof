import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
const MAIN = path.join(ROOT, "dist", "main.js");
const TMP = process.env.MCP_PROOF_TEST_TMP ?? os.tmpdir();

/**
 * True while the process is really running. `kill(pid, 0)` also succeeds for a zombie (killed, but its parent or init has not
 * collected it yet), which on a busy CI machine can take a while and is not a leaked server, so a zombie counts as gone.
 */
const alive = (pid: number) => {
  try { process.kill(pid, 0); } catch { return false; }
  try { return !execFileSync("ps", ["-o", "stat=", "-p", String(pid)], { encoding: "utf8" }).trim().startsWith("Z"); } catch { return false; }
};
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
    const gone = await until(() => !alive(serverPid), 10_000);
    if (!gone) {
      // Show what the server process really is, so a failure on a machine we cannot reach explains itself.
      let table = "";
      try { table = execFileSync("ps", ["-axo", "pid,ppid,pgid,stat,etime,command"], { encoding: "utf8" }); } catch { /* none */ }
      const lines = table.split("\n").filter(line => line.includes("PID") || line.includes(String(serverPid)) || line.includes("mcp-proof") || line.includes("setInterval"));
      console.log("signal test: server pid " + serverPid + " is still running 10 s after exit 130:\n" + lines.join("\n"));
    }
    expect(gone).toBe(true);
    expect(readdirSync(scratch).filter(name => name.startsWith("mcp-proof-run-"))).toEqual([]);
  });
});
