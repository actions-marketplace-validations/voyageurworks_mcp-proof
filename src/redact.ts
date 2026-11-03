const SENSITIVE_NAME = /(token|key|secret|passw|auth|credential|bearer|cookie)/i;

/** A conservative scrub of a server command for the record: values that look like logins are replaced, the shape is kept. */
export function redactArgs(args: string[]): string[] {
  const out: string[] = [];
  let hideNext = false;
  for (const arg of args) {
    if (hideNext) { out.push("<redacted>"); hideNext = false; continue; }
    const assignment = /^(-{0,2}[A-Za-z0-9_.-]+)=(.*)$/.exec(arg);
    if (assignment && SENSITIVE_NAME.test(assignment[1]!)) { out.push(`${assignment[1]}=<redacted>`); continue; }
    if (/^-{1,2}[A-Za-z0-9_-]+$/.test(arg) && SENSITIVE_NAME.test(arg)) { out.push(arg); hideNext = true; continue; }
    if (/^[A-Za-z0-9+/_=-]{32,}$/.test(arg) && /[0-9]/.test(arg) && /[A-Za-z]/.test(arg)) { out.push("<redacted>"); continue; }
    if (/^[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i.test(arg)) { out.push(arg.replace(/\/\/[^/\s:@]+:[^/\s@]+@/, "//<redacted>@")); continue; }
    out.push(arg);
  }
  return out;
}

/** Replace every occurrence of any given private path with a placeholder, in either slash style. */
export function scrubPaths(text: string, replacements: Array<[string, string]>): string {
  let out = text;
  for (const [from, to] of replacements) {
    if (!from) continue;
    for (const variant of new Set([from, from.replaceAll("\\", "/"), from.replaceAll("/", "\\")])) out = out.split(variant).join(to);
  }
  return out;
}
