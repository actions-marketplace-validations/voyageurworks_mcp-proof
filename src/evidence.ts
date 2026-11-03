import type { Handshake } from "./log.js";
import type { Label } from "./types.js";

/** The label for one client run, from what the log proves. A client that is not installed is decided before any run. */
export function labelFor(handshake: Handshake): Label {
  if (handshake.initialize && handshake.initialized && handshake.toolsListAnswered) return "verified";
  if (handshake.initialize) return "started";
  return "failed";
}

export const LABEL_MEANING: Record<Label, string> = {
  verified: "The client started the server; the log shows initialize answered, initialized sent and tools/list answered.",
  started: "The client started the server and initialize was answered, but tools/list was not answered.",
  failed: "The client ran, but the server never completed initialize.",
  "not-installed": "The client is not on this machine, so nothing was run.",
  read: "The client's own command read the configuration back; it does not start servers.",
  documented: "Taken from the client's documentation; not run.",
};
