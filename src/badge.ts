import type { CompatRecord } from "./compat.js";
import type { Label } from "./types.js";

const COLOR: Record<Label, { name: string; hex: string }> = {
  verified: { name: "brightgreen", hex: "#3fb950" },
  started: { name: "yellow", hex: "#d29922" },
  failed: { name: "red", hex: "#cf222e" },
  "not-installed": { name: "lightgrey", hex: "#8c959f" },
  read: { name: "blue", hex: "#0969da" },
  documented: { name: "lightgrey", hex: "#8c959f" },
};

const escapeXml = (text: string) => text.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch]!);
/** A rough text width in pixels for 11px Verdana-like text; good enough for a static badge. */
const width = (text: string) => Math.round(text.length * 6.4 + 10);

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "client";
}

export function badgeSvg(left: string, right: string, hex: string): string {
  const lw = width(left);
  const rw = width(right);
  const total = lw + rw;
  const label = `${escapeXml(left)}: ${escapeXml(right)}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${label}">`,
    `<title>${label}</title>`,
    `<rect width="${lw}" height="20" fill="#555"/>`,
    `<rect x="${lw}" width="${rw}" height="20" fill="${hex}"/>`,
    `<g fill="#fff" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">`,
    `<text x="${lw / 2}" y="14">${escapeXml(left)}</text>`,
    `<text x="${lw + rw / 2}" y="14">${escapeXml(right)}</text>`,
    "</g>",
    "</svg>",
    "",
  ].join("");
}

export interface BadgeFile { name: string; content: string }

/** One SVG and one Shields endpoint JSON per client. Static files: nothing is hosted and nothing is fetched. */
export function renderBadges(record: CompatRecord): BadgeFile[] {
  const files: BadgeFile[] = [];
  for (const result of record.results) {
    const color = COLOR[result.label];
    const message = result.clientVersion ? `${result.label} ${result.clientVersion}` : result.label;
    const base = slug(result.client);
    files.push({ name: `${base}.svg`, content: badgeSvg(result.clientName, message, color.hex) });
    files.push({ name: `${base}.json`, content: `${JSON.stringify({ schemaVersion: 1, label: result.clientName, message, color: color.name }, null, 2)}\n` });
  }
  return files;
}
