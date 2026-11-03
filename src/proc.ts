import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { platformLaunch, type Launch } from "./launch.js";

const live = new Set<number>();

/** Remember a child so an interrupted run can stop it (children are detached on POSIX, so Ctrl-C does not reach them by itself). */
export function trackChild(child: ChildProcess): void {
  const pid = child.pid;
  if (!pid) return;
  live.add(pid);
  child.once("close", () => live.delete(pid));
}

export function killAllChildren(): void {
  for (const pid of [...live]) killTree(pid);
  live.clear();
}

export interface ProcResult { code: number | null; stdout: string; stderr: string; timedOut: boolean; started: boolean }

const CAP = 1_000_000;

/** Run a command to completion with a timeout. On timeout the whole process tree is stopped. Output is capped. */
export function runProcess(launch: Launch, options: { env: Record<string, string>; cwd: string; timeoutMs: number; input?: string }): Promise<ProcResult> {
  const real = platformLaunch(launch);
  return new Promise(resolve => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const finish = (result: ProcResult) => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
    const child = spawn(real.command, real.args, { cwd: options.cwd, env: options.env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true, windowsVerbatimArguments: real.verbatim === true, detached: process.platform !== "win32" });
    trackChild(child);
    const timer = setTimeout(() => { timedOut = true; killTree(child.pid); }, options.timeoutMs);
    child.stdout.on("data", chunk => { if (stdout.length < CAP) stdout += chunk.toString("utf8"); });
    child.stderr.on("data", chunk => { if (stderr.length < CAP) stderr += chunk.toString("utf8"); });
    child.on("error", () => finish({ code: null, stdout, stderr, timedOut, started: false }));
    child.on("close", code => finish({ code, stdout, stderr, timedOut, started: true }));
    child.stdin.on("error", () => { /* the program closed its input */ });
    child.stdin.end(options.input ?? "");
  });
}

export function killTree(pid: number | undefined): void {
  if (!pid) return;
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    else process.kill(-pid, "SIGKILL");
  } catch { /* already gone */ }
  try { process.kill(pid, "SIGKILL"); } catch { /* already gone */ }
}
