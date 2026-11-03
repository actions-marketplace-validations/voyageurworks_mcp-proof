import { mkdirSync, mkdtempSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Environment variables a client may keep. Everything else, above all anything that looks like a login, is dropped. */
const KEEP = new Set(["path", "systemroot", "comspec", "pathext", "windir", "temp", "tmp", "tmpdir", "lang", "lc_all", "term", "no_color", "http_proxy", "https_proxy", "no_proxy", "node_extra_ca_certs", "systemdrive", "processor_architecture", "number_of_processors", "os"]);

export type Home = { root: string; env: Record<string, string> };

/**
 * Makes a fresh throwaway home under `scratchRoot` and the environment that points every home-related variable at it.
 * The environment is built from an allow-list, not from the caller's environment minus some names, so a token the owner
 * happens to have exported never reaches a client. `extra` adds variables the caller chooses (name and value).
 */
export function createHome(scratchRoot: string, extra: Record<string, string> = {}, source: NodeJS.ProcessEnv = process.env, platform: string = process.platform): Home {
  mkdirSync(scratchRoot, { recursive: true });
  const root = mkdtempSync(path.join(scratchRoot, "home-"));
  const roaming = path.join(root, "AppData", "Roaming");
  const local = path.join(root, "AppData", "Local");
  const config = path.join(root, ".config");
  for (const dir of [roaming, local, config, path.join(root, ".local", "share"), path.join(root, ".cache"), path.join(root, ".local", "state")]) mkdirSync(dir, { recursive: true });
  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(source)) if (value !== undefined && KEEP.has(name.toLowerCase())) env[name] = value;
  Object.assign(env, {
    HOME: root, USERPROFILE: root, APPDATA: roaming, LOCALAPPDATA: local,
    XDG_CONFIG_HOME: config, XDG_DATA_HOME: path.join(root, ".local", "share"), XDG_CACHE_HOME: path.join(root, ".cache"), XDG_STATE_HOME: path.join(root, ".local", "state"),
  });
  if (platform === "win32") {
    const parsed = path.win32.parse(root);
    env.HOMEDRIVE = parsed.root.replace(/[\/]+$/, "");
    env.HOMEPATH = root.slice(parsed.root.length - 1);
  }
  Object.assign(env, extra);
  return { root, env };
}

export type RealHomeState = "unchanged" | "changed" | "unknown";

/** A cheap fingerprint of some folders and files in the real home: names, sizes and modification times, bounded. */
export function snapshot(realHome: string, relatives: string[], limit = 2000): string {
  const lines: string[] = [];
  const add = (label: string, full: string, depth: number) => {
    if (lines.length >= limit) return;
    let info;
    try { info = statSync(full); } catch { lines.push(`${label}:missing`); return; }
    lines.push(`${label}:${info.isDirectory() ? "dir" : info.size}:${Math.round(info.mtimeMs)}`);
    if (info.isDirectory() && depth > 0) {
      let names: string[] = [];
      try { names = readdirSync(full).sort(); } catch { return; }
      for (const name of names) add(`${label}/${name}`, path.join(full, name), depth - 1);
    }
  };
  for (const relative of relatives) add(relative, path.join(realHome, relative), 1);
  return lines.join("\n");
}

export function compareSnapshots(before: string, after: string): RealHomeState {
  return before === after ? "unchanged" : "changed";
}

export const realHome = (): string => os.homedir();
