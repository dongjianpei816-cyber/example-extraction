import fs from "node:fs";
import path from "node:path";
import { items } from "./corpus_cards.data.mjs";
import { config } from "./config.mjs";

const outRoot = config.outputRoot;
const jsonlPath = path.join(outRoot, "jsonl", "qa_cards.jsonl");
const progressPath = path.join(outRoot, "progress.json");

function readLines(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/);
}

function sliceLines(lines, startLine, endLine) {
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine);
  if (start >= end) return "";
  return lines.slice(start, end).join("\n");
}

function findCaptionLine(lines, needle, fromIndex = 0) {
  for (let i = fromIndex; i < lines.length; i++) {
    const t = lines[i].trimStart();
    if (t.startsWith(needle)) {
      const rest = t.slice(needle.length).trimStart();
      const c = rest[0] || "";
      if (!/[a-z\u4e00-\u9fff]/.test(c)) return i;
      if (/^[A-Z0-9(,.\-]/.test(c)) return i;
    }
  }
  return -1;
}

function extractTable(lines, caption, fromIndex = 0) {
  const captionIdx = findCaptionLine(lines, caption, fromIndex);
  if (captionIdx < 0) return { found: false, text: "", index: -1 };
  const rows = [lines[captionIdx]];
  let i = captionIdx + 1;
  while (i < lines.length && lines[i].trim() === "") i++;
  while (i < lines.length && lines[i].trim() !== "") {
    const t0 = lines[i].trimStart();
    if (/^!\[/.test(t0) || /^(Fig|Figure|TABLE|Table)\s*\d/.test(t0)) break;
    rows.push(lines[i]);
    i++;
  }
  while (i < lines.length) {
    if (lines[i].trim() === "") { i++; continue; }
    const t = lines[i].trim();
    if (/^<sup>/.test(t) || /^[†‡*]/.test(t)) { rows.push(lines[i]); i++; continue; }
    break;
  }
  return { found: true, text: rows.join("\n"), index: captionIdx };
}

function collectImages(markdown) {
  const re = /!\[\]\(([^)]+)\)/g;
  const out = [];
  let m;
  while ((m = re.exec(markdown)) !== null) out.push(m[1]);
  return out;
}

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [String(v)];
}

function loadJsonl() {
  if (!fs.existsSync(jsonlPath)) return new Map();
  const map = new Map();
  for (const line of fs.readFileSync(jsonlPath, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      map.set(rec.id, rec);
    } catch {
      // skip malformed lines
    }
  }
  return map;
}

function humanMarkdown(item, record) {
  const q = record.question;
  const a = record.answer;
  const lines = [];
  lines.push(`## ${record.label}: ${record.title}`);
  lines.push("");
  lines.push(`- **Kind**: ${record.kind}`);
  lines.push(`- **Paper**: ${record.paper.title}`);
  lines.push(`- **DOI**: ${record.paper.doi ?? "N/A"}`);
  lines.push(`- **Source section**: ${record.source_section ?? ""}`);
  lines.push(`- **Source lines**: ${record.paper.source_lines.start}-${record.paper.source_lines.end}`);
  lines.push("");
  lines.push("### Question");
  lines.push("");
  lines.push(`**Objective**: ${q.objective}`);
  lines.push("");
  lines.push(q.scenario);
  if (q.performance_function) {
    const pf = q.performance_function;
    lines.push("");
    lines.push(`**Performance function**: ${pf.form}`);
    if (pf.expression) {
      lines.push("");
      lines.push(`$${pf.expression}$`);
    }
    if (pf.evaluator) lines.push(`_Evaluator_: ${pf.evaluator}`);
  }
  if (q.variables && q.variables.length) {
    lines.push("");
    lines.push("| Symbol | Description | Distribution | Mean | Std | Unit |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const v of q.variables) {
      lines.push(`| ${v.symbol} | ${v.description ?? ""} | ${v.distribution ?? ""} | ${v.mean ?? ""} | ${v.std ?? ""} | ${v.unit ?? ""} |`);
    }
  }
  if (q.targets && q.targets.length) {
    lines.push("");
    lines.push(`**Targets**: ${q.targets.join(", ")}`);
  }
  lines.push("");
  lines.push("### Answer");
  lines.push("");
  lines.push(`**Method**: ${a.method}`);
  lines.push("");
  for (const step of a.steps) lines.push(`- ${step}`);
  if (a.reported_results) {
    lines.push("");
    lines.push("**Reported results**:");
    lines.push("");
    lines.push(Array.isArray(a.reported_results) ? a.reported_results.join("\n\n") : a.reported_results);
  }
  if (a.conclusions) {
    lines.push("");
    lines.push(`**Conclusions**: ${a.conclusions}`);
  }
  lines.push("");
  lines.push("### Original Section");
  lines.push("");
  lines.push(record.original_section);
  lines.push("");
  lines.push("### Notes");
  lines.push("");
  lines.push(record.notes.length ? record.notes.map((n) => `- ${n}`).join("\n") : "- None.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  fs.mkdirSync(jsonlPath.replace(/[^/\\]+$/, ""), { recursive: true });
  const jsonlMap = loadJsonl();
  const progress = JSON.parse(fs.readFileSync(progressPath, "utf8"));

  for (const item of items) {
    const lines = readLines(item.input);
    const inputDir = path.dirname(item.input);
    const rawPaperDir = path.join(outRoot, "raw", item.dir);
    const figuresDir = path.join(rawPaperDir, "figures");
    const processedDir = path.join(outRoot, "processed", item.dir);
    fs.mkdirSync(figuresDir, { recursive: true });
    fs.mkdirSync(processedDir, { recursive: true });

    const records = [];
    const mdBlocks = [];

    for (const card of item.cards) {
      const original = sliceLines(lines, card.startLine, card.endLine);

      const tableParts = [];
      let searchFrom = 0;
      for (const cap of card.tableCaptions || []) {
        const res = extractTable(lines, cap, searchFrom);
        if (res.found) {
          tableParts.push(res.text);
          searchFrom = res.index + 1;
        }
      }
      const tableText = tableParts.join("\n\n");

      const imageRefs = collectImages(original);
      const copied = [];
      let rewritten = original;
      for (const ref of imageRefs) {
        const src = path.join(inputDir, ref.split("/").join(path.sep));
        const base = path.basename(ref);
        const dst = path.join(figuresDir, base);
        if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
        if (fs.existsSync(src) || fs.existsSync(dst)) copied.push(`figures/${base}`);
        rewritten = rewritten.split(ref).join(`figures/${base}`);
      }

      const record = {
        schema_version: "1.0.0",
        kind: card.kind || "example_card",
        id: `${item.dir}/${card.id}`,
        label: card.label,
        title: card.title,
        source_section: card.sourceSection,
        paper: {
          title: item.title,
          doi: item.doi ?? null,
          source_type: item.source_type || "paper",
          authors: item.authors ?? null,
          language: item.language || "en",
          source_file: item.input,
          source_lines: { start: card.startLine, end: card.endLine },
        },
        question: card.question,
        answer: {
          method: card.answer.method,
          steps: card.answer.steps,
          reported_results: tableText || (card.answer.reported_results ?? null),
          conclusions: card.answer.conclusions,
        },
        algorithm: card.algorithm ?? undefined,
        original_section: rewritten,
        images: copied,
        notes: asArray(card.notes),
      };

      records.push(record);
      jsonlMap.set(record.id, record);
      fs.writeFileSync(path.join(rawPaperDir, `${card.id}.md`), rewritten, "utf8");
      mdBlocks.push(humanMarkdown(item, record));
      mdBlocks.push("");
    }

    fs.writeFileSync(path.join(processedDir, "qa-cards.json"), JSON.stringify(records, null, 2), "utf8");
    fs.writeFileSync(path.join(processedDir, "qa-cards.md"), mdBlocks.join("\n"), "utf8");

    const entry = progress.papers[item.dir];
    if (entry) {
      entry.status = "done";
      entry.cards = records.length;
      entry.updated = new Date().toISOString();
    } else {
      progress.papers[item.dir] = { status: "done", cards: records.length, updated: new Date().toISOString() };
    }
    console.log(`[${item.dir}] ${records.length} cards -> raw/${item.dir}, processed/${item.dir}`);
  }

  progress.updated = new Date().toISOString();
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), "utf8");

  const sorted = [...jsonlMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(jsonlPath, sorted.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  console.log(`jsonl: ${sorted.length} records`);
}

main();
