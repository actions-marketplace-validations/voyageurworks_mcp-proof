import path from "node:path";

export type Launch = { command: string; args: string[] };

/** Split a command line into words. Understands single and double quotes; no variables, no pipes, no escapes beyond \" inside double quotes. */
export function splitCommand(text: string): string[] {
  const words: string[] = [];
  let current = "";
  let quote: '"' | "'" | undefined;
  let started = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === quote) quote = undefined;
      else if (ch === "\\" && quote === '"' && text[i + 1] === '"') { current += '"'; i++; }
      else current += ch;
    } else if (ch === '"' || ch === "'") { quote = ch; started = true; }
    else if (/\s/.test(ch)) { if (started || current) words.push(current); current = ""; started = false; }
    else { current += ch; started = true; }
  }
  if (quote) throw new Error("Unclosed quote in the server command.");
  if (started || current) words.push(current);
  return words;
}

const SHIMS = new Set(["npx", "npm", "pnpm", "yarn", "bunx", "uvx"]);

/** On Windows, npm-style commands are .cmd shims that Node cannot start directly; run them through cmd /c as MCP clients must. */
export function platformLaunch(launch: Launch, platform: string = process.platform): Launch {
  if (platform !== "win32") return launch;
  const base = path.basename(launch.command).toLowerCase().replace(/\.(cmd|bat|exe)$/, "");
  const bare = !/[\\/]/.test(launch.command) && !/\.[A-Za-z0-9]+$/.test(launch.command) && base !== "node";
  if (/\.(cmd|bat)$/i.test(launch.command) || bare || SHIMS.has(base) && !/\.exe$/i.test(launch.command)) {
    return { command: "cmd", args: ["/c", launch.command, ...launch.args] };
  }
  return launch;
}

export function parseLaunch(text: string): Launch {
  const [command, ...args] = splitCommand(text);
  if (!command) throw new Error("The server command is empty.");
  return { command, args };
}
