import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Integration tests run the compiled program, so build it once before any test file starts.
// All scratch folders the tests make live under one root that is deleted when the run ends.
export default function setup() {
  const root = path.resolve(import.meta.dirname, "..");
  execFileSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", root], { stdio: "inherit" });
  const scratch = mkdtempSync(path.join(os.tmpdir(), "mcp-proof-tests-"));
  process.env.MCP_PROOF_TEST_TMP = scratch;
  return () => rmSync(scratch, { recursive: true, force: true });
}
