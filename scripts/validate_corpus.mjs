import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

const outRoot = config.outputRoot;
const jsonlPath = path.join(outRoot, "jsonl", "qa_cards.jsonl");
const kinds = ["example_card", "algorithm_card"];
const forms = ["explicit", "implicit"];
const evaluators = ["closed-form", "FE", "CFD", "dynamics solver", "surrogate", "multi-disciplinary simulation", "not stated", "other"];
const cjk = /[\u4e00-\u9fff]/;

const errors = [];
let total = 0;

function err(rec, msg) {
  errors.push(`${rec ? rec.id : "?"}: ${msg}`);
}

function nonEmpty(v, rec, field) {
  if (typeof v !== "string" || v.trim() === "") err(rec, `missing ${field}`);
}

function checkStructured(rec, obj, prefix) {
  if (!obj || typeof obj !== "object") {
    err(rec, `missing ${prefix}`);
    return;
  }
  nonEmpty(obj.objective, rec, `${prefix}.objective`);
  nonEmpty(obj.scenario, rec, `${prefix}.scenario`);
  if (cjk.test(obj.objective) || cjk.test(obj.scenario)) err(rec, `${prefix} contains CJK`);
  if (obj.performance_function) {
    if (!forms.includes(obj.performance_function.form)) err(rec, `bad performance_function.form`);
    if (obj.performance_function.evaluator && !evaluators.includes(obj.performance_function.evaluator)) err(rec, `bad evaluator`);
  }
}

if (!fs.existsSync(jsonlPath)) {
  console.log("FAIL: no jsonl file");
  process.exit(1);
}

const lines = fs.readFileSync(jsonlPath, "utf8").split(/\r?\n/).filter((l) => l.trim());
for (const line of lines) {
  let rec;
  try {
    rec = JSON.parse(line);
  } catch {
    errors.push(`jsonl parse error: ${line.slice(0, 80)}`);
    continue;
  }
  total++;
  if (rec.schema_version !== "1.0.0") err(rec, "schema_version");
  if (!kinds.includes(rec.kind)) err(rec, "kind");
  if (typeof rec.id !== "string" || !rec.id.includes("/")) err(rec, "id");
  nonEmpty(rec.original_section, rec, "original_section");
  if (rec.paper) {
    nonEmpty(rec.paper.title, rec, "paper.title");
    nonEmpty(rec.paper.language, rec, "paper.language");
    if (rec.paper.source_lines && !(rec.paper.source_lines.start >= 1 && rec.paper.source_lines.end >= rec.paper.source_lines.start)) err(rec, "source_lines");
  } else {
    err(rec, "paper");
  }
  checkStructured(rec, rec.question, "question");
  if (rec.answer) {
    nonEmpty(rec.answer.method, rec, "answer.method");
    if (!Array.isArray(rec.answer.steps) || rec.answer.steps.length === 0) err(rec, "answer.steps");
    if (rec.answer.steps && rec.answer.steps.some((s) => cjk.test(s))) err(rec, "answer.steps contains CJK");
    nonEmpty(rec.answer.conclusions, rec, "answer.conclusions");
    if (cjk.test(rec.answer.conclusions)) err(rec, "answer.conclusions contains CJK");
  } else {
    err(rec, "answer");
  }
  if (rec.kind === "algorithm_card" && (!rec.algorithm || !rec.algorithm.name || !rec.algorithm.steps)) err(rec, "algorithm card missing algorithm");
  if (rec.notes && !Array.isArray(rec.notes)) err(rec, "notes must be array");

  const dir = rec.id.split("/")[0];
  for (const img of rec.images || []) {
    const p = path.join(outRoot, "raw", dir, img.split("/").join(path.sep));
    if (!fs.existsSync(p)) err(rec, `missing image ${img}`);
  }
}

const progress = JSON.parse(fs.readFileSync(path.join(outRoot, "progress.json"), "utf8"));
const processedDirs = fs.readdirSync(path.join(outRoot, "processed")).filter((d) => fs.existsSync(path.join(outRoot, "processed", d, "qa-cards.json")));
let processedCount = 0;
for (const d of processedDirs) {
  const arr = JSON.parse(fs.readFileSync(path.join(outRoot, "processed", d, "qa-cards.json"), "utf8"));
  processedCount += arr.length;
}

if (processedCount !== total) errors.push(`processed count ${processedCount} != jsonl count ${total}`);

if (errors.length) {
  console.log(`FAIL: ${errors.length} issues`);
  for (const e of errors.slice(0, 40)) console.log(" -", e);
  process.exit(1);
}
console.log(`ALL-CHECKS-PASS: ${total} records, ${processedDirs.length} papers processed`);
