import { describe, expect, it } from "vitest";
import { entryFromLine, LineLogger, parseLog, summarize, type LogEntry } from "./log.js";

describe("entryFromLine keeps method names only", () => {
  it("drops params and results entirely", () => {
    const secret = "sk-FAKE-" + "x".repeat(20);
    const request = entryFromLine("client-to-server", JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { arguments: { key: secret } } }));
    const response = entryFromLine("server-to-client", JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ text: secret }] } }));
    expect(request).toEqual({ direction: "client-to-server", kind: "request", method: "tools/call", id: 1 });
    expect(response).toEqual({ direction: "server-to-client", kind: "response", id: 1 });
    expect(JSON.stringify([request, response])).not.toContain(secret);
  });
  it("ignores non-JSON, non-RPC and odd method names", () => {
    expect(entryFromLine("client-to-server", "hello")).toBeUndefined();
    expect(entryFromLine("client-to-server", "[1,2]")).toBeUndefined();
    expect(entryFromLine("client-to-server", '{"foo":1}')).toBeUndefined();
    expect(entryFromLine("client-to-server", JSON.stringify({ id: 1, method: "has space and a secret" }))).toBeUndefined();
    expect(entryFromLine("client-to-server", JSON.stringify({ id: 1, method: "x".repeat(80) }))).toBeUndefined();
  });
  it("keeps only integer ids", () => {
    expect(entryFromLine("client-to-server", JSON.stringify({ id: "token-abc", method: "ping" }))).toEqual({ direction: "client-to-server", kind: "request", method: "ping" });
  });
  it("tells notifications from requests and errors from responses", () => {
    expect(entryFromLine("client-to-server", '{"method":"notifications/initialized"}')?.kind).toBe("notification");
    expect(entryFromLine("server-to-client", '{"id":3,"error":{"code":1,"message":"secret text"}}')).toEqual({ direction: "server-to-client", kind: "error", id: 3 });
  });
});

describe("LineLogger", () => {
  it("handles split chunks and CRLF", () => {
    const out: LogEntry[] = [];
    const logger = new LineLogger("client-to-server", entry => out.push(entry));
    logger.push('{"id":1,"meth');
    logger.push('od":"initialize"}\r\n{"method":"notifications/initialized"}');
    logger.end();
    expect(out.map(entry => entry.method)).toEqual(["initialize", "notifications/initialized"]);
  });
});

describe("summarize", () => {
  const log = (lines: object[]) => parseLog(lines.map(line => JSON.stringify(line)).join("\n"));
  const full = [
    { direction: "client-to-server", kind: "request", method: "initialize", id: 0 },
    { direction: "server-to-client", kind: "response", id: 0 },
    { direction: "client-to-server", kind: "notification", method: "notifications/initialized" },
    { direction: "client-to-server", kind: "request", method: "tools/list", id: 1 },
    { direction: "server-to-client", kind: "response", id: 1 },
  ];
  it("proves a full handshake", () => {
    expect(summarize(log(full))).toMatchObject({ initialize: true, initialized: true, toolsList: true, toolsListAnswered: true });
  });
  it("does not count an unanswered or errored request", () => {
    const errored = full.map(line => (line.id === 1 && line.kind === "response" ? { ...line, kind: "error" } : line));
    expect(summarize(log(errored))).toMatchObject({ initialize: true, toolsList: true, toolsListAnswered: false });
    expect(summarize(log(full.slice(0, 1)))).toMatchObject({ initialize: false });
  });
  it("skips damaged lines", () => {
    expect(parseLog("not json\n" + JSON.stringify(full[0]))).toHaveLength(1);
  });
});
