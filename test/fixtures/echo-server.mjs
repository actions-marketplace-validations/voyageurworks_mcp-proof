// A tiny MCP server over stdio with no dependencies, used only as a test fixture.
// It answers initialize and tools/list. Set ECHO_SERVER_MODE=no-tools to answer tools/list with an error,
// or =exit-early to exit before answering anything.
import readline from "node:readline";

const mode = process.env.ECHO_SERVER_MODE ?? "ok";
if (mode === "exit-early") process.exit(3);
const send = message => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", line => {
  let request;
  try { request = JSON.parse(line); } catch { return; }
  if (request.method === "initialize") {
    send({ id: request.id, result: { protocolVersion: request.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "echo-fixture", version: "0.0.1" } } });
  } else if (request.method === "tools/list") {
    if (mode === "no-tools") send({ id: request.id, error: { code: -32601, message: "no tools" } });
    else send({ id: request.id, result: { tools: [{ name: "echo", description: "Echo", inputSchema: { type: "object", properties: {} } }] } });
  } else if (request.id !== undefined) {
    send({ id: request.id, error: { code: -32601, message: "unknown" } });
  }
});
rl.on("close", () => process.exit(0));
