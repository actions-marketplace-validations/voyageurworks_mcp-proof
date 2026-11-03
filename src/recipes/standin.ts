import { spawn } from "node:child_process";
import readline from "node:readline";
import { killTree, trackChild } from "../proc.js";
import { platformLaunch } from "../launch.js";
import type { Recipe, RunContext, RunResult } from "../types.js";

/**
 * A minimal MCP client built into mcp-proof: initialize, notifications/initialized, tools/list, then close.
 * It is a stand-in, not a real client product, and is labelled that way in every report. It exists so the harness can be
 * tested and so a server can be checked on a machine with no client installed.
 */
export const standin: Recipe = {
  id: "standin",
  name: "mcp-proof stand-in client",
  standin: true,
  realHomePaths: [],
  installHint: "Built in; nothing to install.",
  async detect() { return { installed: true, version: "built-in" }; },
  async run(context: RunContext): Promise<RunResult> {
    const real = platformLaunch(context.wrapped);
    const child = spawn(real.command, real.args, { cwd: context.workDir, env: { ...context.home.env, ...context.serverEnv }, stdio: ["pipe", "pipe", "inherit"], windowsHide: true, windowsVerbatimArguments: real.verbatim === true, detached: process.platform !== "win32" });
    trackChild(child);
    const notes: string[] = [];
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; killTree(child.pid); }, context.timeoutMs);
    const send = (message: object) => { try { child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`); } catch { /* server gone */ } };
    child.stdin.on("error", () => { /* server closed its input */ });
    const waiters = new Map<number, () => void>();
    const answered = new Set<number>();
    const lines = readline.createInterface({ input: child.stdout });
    lines.on("line", line => {
      try {
        const message = JSON.parse(line) as { id?: unknown };
        if (typeof message.id === "number") { answered.add(message.id); waiters.get(message.id)?.(); }
      } catch { /* not a message */ }
    });
    const exited = new Promise<number | null>(resolve => { child.on("error", () => resolve(null)); child.on("close", code => resolve(code)); });
    const waitFor = (id: number) => answered.has(id) ? Promise.resolve() : new Promise<void>(resolve => { waiters.set(id, resolve); void exited.then(() => resolve()); });
    send({ id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "mcp-proof-standin", version: "1" } } });
    await waitFor(0);
    if (answered.has(0)) {
      send({ method: "notifications/initialized" });
      send({ id: 1, method: "tools/list" });
      await waitFor(1);
    } else notes.push("The server exited or timed out before answering initialize.");
    try { child.stdin.end(); } catch { /* already closed */ }
    const grace = setTimeout(() => killTree(child.pid), 2000);
    const exitCode = await exited;
    clearTimeout(grace);
    clearTimeout(timer);
    return { commands: ["(built-in client) initialize, notifications/initialized, tools/list"], exitCode, timedOut, notes };
  },
};
