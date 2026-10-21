import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

const hasExampleRe = /example\s+\d|numerical\s+example|case\s+study|worked\s+example|算例|例题/i;
const hasAlgoRe = /(^\s*algorithm\s*\d)|(pseudocode)|(algorithm\s*[:：])/im;

function detectLanguage(text) {
  const sample = text.slice(0, 4000);
  if (/[\u4e00-\u9fff]/.test(sample)) return "zh";
  if (/[\u0400-\u04FF]/.test(sample)) return "ru";
  return "en";
}

function extractTitle(lines) {
  for (const ln of lines) {
    const m = /^#\s+(.+)$/.exec(ln.trim());
    if (m) return m[1].trim();
  }
  const first = lines.find((l) => {
    const t = l.trim();
    return t !== "" && !t.startsWith("!") && !t.startsWith("|") && !t.startsWith("DOI:");
  });
  return first ? first.trim().slice(0, 200) : "[no title]";
}

function deriveDoi(dir) {
  let name = dir;
  const pm = /^P\d+__(.+)$/.exec(name);
  if (pm) name = pm[1];
  const m = /^10\.(\d{4,5})_(.+)$/.exec(name);
  if (m) return `10.${m[1]}/${m[2]}`;
  return name.includes("__") ? null : name;
}

fs.mkdirSync(config.outputRoot, { recursive: true });
const root = config.papersRoot;
const dirs = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const index = [];
for (const dir of dirs) {
  const dirPath = path.join(root, dir);
  const mds = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));
  if (mds.length !== 1) continue;
  const mdPath = path.join(dirPath, mds[0]);
  let text = "";
  try {
    text = fs.readFileSync(mdPath, "utf8");
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);
  index.push({
    dir,
    file: mds[0],
    title: extractTitle(lines),
    doi: deriveDoi(dir),
    language: detectLanguage(text),
    has_example: hasExampleRe.test(text),
    has_algorithm: hasAlgoRe.test(text),
    status: hasExampleRe.test(text) ? "pending" : "skipped",
  });
}

fs.writeFileSync(path.join(config.outputRoot, "corpus_index.json"), JSON.stringify(index, null, 2), "utf8");

const progress = { schema_version: "1.0.0", stage: 1, updated: new Date().toISOString(), papers: {} };
for (const e of index) progress.papers[e.dir] = { status: e.status, cards: 0, updated: null };
fs.writeFileSync(path.join(config.outputRoot, "progress.json"), JSON.stringify(progress, null, 2), "utf8");

const withEx = index.filter((e) => e.has_example).length;
console.log(`indexed ${index.length} papers; with examples: ${withEx}; with algorithm blocks: ${index.filter((e) => e.has_algorithm).length}`);
