import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

const idx = JSON.parse(fs.readFileSync(path.join(config.outputRoot, "corpus_index.json"), "utf8"));
const prog = JSON.parse(fs.readFileSync(path.join(config.outputRoot, "progress.json"), "utf8"));
const inactive = new Set(
  Object.entries(prog.papers).filter(([, v]) => v.status === "done" || v.status === "skipped").map(([k]) => k)
);

const queue = [];
for (const e of idx) {
  if (!e.has_example || inactive.has(e.dir)) continue;
  let text = "";
  try { text = fs.readFileSync(path.join(config.papersRoot, e.dir, e.file), "utf8"); } catch { continue; }
  const lines = text.split(/\r?\n/).length;
  queue.push({ dir: e.dir, title: e.title, language: e.language, has_algorithm: e.has_algorithm, lines });
}
queue.sort((a, b) => (b.has_algorithm - a.has_algorithm) || (a.lines - b.lines));
fs.writeFileSync(path.join(config.outputRoot, "batch_queue.json"), JSON.stringify(queue, null, 2), "utf8");

const doneCount = Object.values(prog.papers).filter((v) => v.status === "done").length;
const skipCount = Object.values(prog.papers).filter((v) => v.status === "skipped").length;
console.log(`queue refreshed: ${queue.length} pending | done ${doneCount} | skipped ${skipCount}`);
