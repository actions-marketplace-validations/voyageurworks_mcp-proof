import os from "node:os";
import type { Label } from "./types.js";

export const SCHEMA = 1;
export const LABELS: Label[] = ["verified", "started", "failed", "not-installed", "read", "documented"];

export interface ClientResult {
  client: string;
  clientName: string;
  /** True for the built-in stand-in, which is not a real client product. */
  standin: boolean;
  clientVersion: string | null;
  label: Label;
  /** Client command lines that were run (throwaway paths shown as placeholders). Empty when nothing ran. */
  commands: string[];
  startedAt: string;
  durationMs: number;
  /** Method names seen in the log, in first-seen order. Never parameters or results. */
  methods: string[];
  /** Did the real home folder change while this ran? A running client of the same kind can change it for unrelated reasons. */
  realHome: "unchanged" | "changed" | "unknown";
  notes: string[];
  /** For not-installed: where a person installs the client by hand. */
  installHint?: string;
}

export interface CompatRecord {
  schema: typeof SCHEMA;
  tool: "mcp-proof";
  version: string;
  generatedAt: string;
  system: { os: string; arch: string; release: string; node: string };
  server: { command: string; args: string[]; envNames: string[] };
  results: ClientResult[];
}

export function systemInfo() {
  return { os: process.platform, arch: process.arch, release: os.release(), node: process.version };
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Checks the shape of a compat.json document. Returns a list of problems; empty means valid. */
export function validate(value: unknown): string[] {
  const problems: string[] = [];
  if (!isObject(value)) return ["the document is not an object"];
  if (value.schema !== SCHEMA) problems.push(`schema must be ${SCHEMA}`);
  if (value.tool !== "mcp-proof") problems.push("tool must be mcp-proof");
  for (const key of ["version", "generatedAt"]) if (typeof value[key] !== "string") problems.push(`${key} must be a string`);
  if (!isObject(value.system)) problems.push("system must be an object");
  if (!isObject(value.server) || typeof value.server.command !== "string" || !Array.isArray(value.server.args) || !Array.isArray(value.server.envNames)) problems.push("server needs command, args and envNames");
  if (!Array.isArray(value.results)) { problems.push("results must be an array"); return problems; }
  value.results.forEach((result: unknown, index: number) => {
    const at = `results[${index}]`;
    if (!isObject(result)) { problems.push(`${at} is not an object`); return; }
    if (typeof result.client !== "string" || typeof result.clientName !== "string") problems.push(`${at} needs client and clientName`);
    if (!LABELS.includes(result.label as Label)) problems.push(`${at}.label is not a known label`);
    if (typeof result.standin !== "boolean") problems.push(`${at}.standin must be a boolean`);
    if (!Array.isArray(result.commands) || !Array.isArray(result.methods) || !Array.isArray(result.notes)) problems.push(`${at} needs commands, methods and notes arrays`);
    if (typeof result.startedAt !== "string" || typeof result.durationMs !== "number") problems.push(`${at} needs startedAt and durationMs`);
    if (!["unchanged", "changed", "unknown"].includes(result.realHome as string)) problems.push(`${at}.realHome is invalid`);
    if (result.clientVersion !== null && typeof result.clientVersion !== "string") problems.push(`${at}.clientVersion must be a string or null`);
  });
  return problems;
}

export function parseCompat(text: string): CompatRecord {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("The file is not valid JSON."); }
  const problems = validate(value);
  if (problems.length > 0) throw new Error(`Not a valid compat.json: ${problems.slice(0, 5).join("; ")}`);
  return value as CompatRecord;
}
