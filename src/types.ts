import type { Home } from "./home.js";
import type { Launch } from "./launch.js";

/**
 * What a run proves. `verified`: the client started the server and the log shows initialize answered, initialized, and tools/list answered.
 * `started`: initialize was answered but tools/list was not. `failed`: the client ran but the server never completed initialize.
 * `not-installed`: the client is not on this machine, nothing was run. `read` and `documented` are the older labels for recipes that
 * cannot start servers or were not run; this version of mcp-proof does not produce them itself.
 */
export type Label = "verified" | "started" | "failed" | "not-installed" | "read" | "documented";

export interface RunContext {
  home: Home;
  /** A fresh empty folder inside the throwaway home, used as the working directory. */
  workDir: string;
  /** The command a client must run: mcp-proof itself, wrapping the server and logging method names to `logFile`. */
  wrapped: Launch;
  logFile: string;
  /** Names and values of variables the server needs; applied to the client's server entry, never stored in the record. */
  serverEnv: Record<string, string>;
  timeoutMs: number;
}

export interface RunResult {
  /** The client command lines that were run, with the throwaway paths shown as <home> and <log>. For the record. */
  commands: string[];
  exitCode: number | null;
  timedOut: boolean;
  notes: string[];
}

export interface Recipe {
  id: string;
  name: string;
  /** Folders and files in the real home to fingerprint before and after (relative to the home folder). */
  realHomePaths: string[];
  /** Where a person installs this client by hand. mcp-proof never installs. */
  installHint: string;
  /** True for a built-in stand-in, which is not a real client product. */
  standin?: boolean;
  detect(env: Record<string, string>): Promise<{ installed: boolean; version?: string }>;
  run(context: RunContext): Promise<RunResult>;
}
