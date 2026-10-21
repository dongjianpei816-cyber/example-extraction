import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

const recs = fs
  .readFileSync(path.join(config.outputRoot, "jsonl", "qa_cards.jsonl"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));
const dirs = [...new Set(recs.map((r) => r.id.split("/")[0]))].filter((d) => d !== "textbook");

for (const d of dirs) {
  const dst = path.join(config.slRoot, d);
  fs.mkdirSync(dst, { recursive: true });
  fs.mkdirSync(path.join(dst, "raw", "figures"), { recursive: true });
  fs.mkdirSync(path.join(dst, "figures"), { recursive: true });
  fs.copyFileSync(path.join(config.outputRoot, "processed", d, "qa-cards.md"), path.join(dst, "qa-cards.md"));
  fs.copyFileSync(path.join(config.outputRoot, "processed", d, "qa-cards.json"), path.join(dst, "qa-cards.json"));
  const subset = recs.filter((r) => r.id.startsWith(d + "/"));
  fs.writeFileSync(path.join(dst, "qa_cards.jsonl"), subset.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  for (const f of fs.readdirSync(path.join(config.outputRoot, "raw", d)).filter((f) => f.endsWith(".md"))) {
    fs.copyFileSync(path.join(config.outputRoot, "raw", d, f), path.join(dst, "raw", f));
  }
  const figSrc = path.join(config.outputRoot, "raw", d, "figures");
  if (fs.existsSync(figSrc)) {
    for (const f of fs.readdirSync(figSrc)) {
      fs.copyFileSync(path.join(figSrc, f), path.join(dst, "raw", "figures", f));
      fs.copyFileSync(path.join(figSrc, f), path.join(dst, "figures", f));
    }
  }
  fs.mkdirSync(path.join(dst, "schema"), { recursive: true });
  const schemaSrc = fs.existsSync(path.join(config.outputRoot, "schema"))
    ? path.join(config.outputRoot, "schema")
    : path.join(import.meta.dirname, "..", "schema");
  if (fs.existsSync(schemaSrc)) {
    for (const f of fs.readdirSync(schemaSrc)) {
      fs.copyFileSync(path.join(schemaSrc, f), path.join(dst, "schema", f));
    }
  }
  const readme =
    "# " + d + "\n\n- Title: " + subset[0].paper.title + "\n- DOI: " + subset[0].paper.doi +
    "\n- Cards: " + subset.length + " (" + subset.filter((r) => r.kind === "example_card").length +
    " example, " + subset.filter((r) => r.kind === "algorithm_card").length + " algorithm)\n" +
    "- qa-cards.md / qa-cards.json / qa_cards.jsonl / raw / figures / schema\n";
  fs.writeFileSync(path.join(dst, "README.md"), readme, "utf8");
}

let broken = 0;
let refsTotal = 0;
for (const d of dirs) {
  const md = fs.readFileSync(path.join(config.slRoot, d, "qa-cards.md"), "utf8");
  const refs = [...new Set([...md.matchAll(/!\[\]\(([^)]+)\)/g)].map((m) => m[1]))];
  refsTotal += refs.length;
  for (const r of refs) {
    if (!fs.existsSync(path.join(config.slRoot, d, r))) {
      broken++;
      console.log("BROKEN", d, r);
    }
  }
}
console.log(`sl papers: ${dirs.length} | image refs: ${refsTotal} | broken: ${broken}`);
if (broken > 0) process.exit(1);
