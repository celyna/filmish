import { readFile, writeFile } from "node:fs/promises";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/import-open-fuji.mjs path/to/recipes.js");
const source = await readFile(input, "utf8");
const start = source.indexOf("export default ");
if (start < 0) throw new Error("Expected the Open Fuji Recipes data module.");
const payload = source.slice(start + "export default ".length).trim().replace(/;$/, "");
const rows = JSON.parse(payload);
const lines = new Map(source.split("\n").flatMap((line, index) => {
  const match = line.match(/^\s*"id": (\d+),/);
  return match ? [[Number(match[1]), index + 1]] : [];
}));
const ids = new Set();
const records = rows.map(({ id, name, creator, sensor, type, film, grain, ccfx, ccfxb, wb, wbr, wbb,
  dr, "h-tone": highlight, "s-tone": shadow, color, sharp, clarity, nr, ev }) => {
  if (!Number.isInteger(id) || ids.has(id) || !lines.has(id) || !name?.trim() || !creator?.trim() ||
      ![3, 4].includes(sensor) || !["color", "blackWhite"].includes(type) ||
      ![film, grain, ccfx, ccfxb, wb, dr].every(value => typeof value === "string" && value.trim()) ||
      ![wbr, wbb, highlight, shadow, color, sharp, clarity, nr].every(Number.isFinite) ||
      !(typeof ev === "string" || Number.isFinite(ev))) {
    throw new Error(`Invalid or unsupported record: ${id}`);
  }
  ids.add(id);
  return { id, name, creator, sensor, type, film, grain, ccfx, ccfxb, wb, wbr, wbb, dr,
    highlight, shadow, color, sharp, clarity, nr, ev, line: lines.get(id) };
});
await writeFile(new URL("../data/open-fuji-recipes.json", import.meta.url), JSON.stringify(records, null, 2) + "\n");
console.log(`Imported ${records.length} attributed recipe records.`);
