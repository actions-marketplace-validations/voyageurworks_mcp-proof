import path from "node:path";

/** `verbatim` is set only by platformLaunch: the arguments are already a finished Windows command line, so spawn must not re-quote them. */
export type Launch = { command: string; args: string[]; verbatim?: boolean };

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

const CMD_SPECIAL = /[\s&|<>^%()!"]/;

/**
 * Quote one word for cmd.exe. A word with a space or one of & | < > ^ % ( ) ! " is wrapped in double quotes (inner quotes
 * doubled), which makes every one of those literal except %NAME%, which cmd still expands. Without this an argument such as
 * `a&b` would be read by cmd.exe as two commands.
 */
export function quoteForCmd(word: string): string {
  if (word === "") return '""';
  return CMD_SPECIAL.test(word) ? `"${word.replace(/"/g, '""')}"` : word;
}

/**
 * On Windows, npm-style commands are .cmd shims that Node cannot start directly; run them through cmd.exe as MCP clients must.
 * The command line is built here, quoted word by word, and handed over verbatim, so Node's own quoting (which cmd.exe does not
 * understand) is not applied and no argument can be read as a second command.
 */
export function platformLaunch(launch: Launch, platform: string = process.platform): Launch {
  if (platform !== "win32") return launch;
  const base = path.basename(launch.command).toLowerCase().replace(/\.(cmd|bat|exe)$/, "");
  const bare = !/[\\/]/.test(launch.command) && !/\.[A-Za-z0-9]+$/.test(launch.command) && base !== "node";
  if (/\.(cmd|bat)$/i.test(launch.command) || bare || SHIMS.has(base) && !/\.exe$/i.test(launch.command)) {
    const line = [launch.command, ...launch.args].map(quoteForCmd).join(" ");
    return { command: "cmd", args: ["/d", "/s", "/c", `"${line}"`], verbatim: true };
  }
  return launch;
}

export function parseLaunch(text: string): Launch {
  const [command, ...args] = splitCommand(text);
  if (!command) throw new Error("The server command is empty.");
  return { command, args };
}
