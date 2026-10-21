import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { config } from "./config.mjs";

const args = process.argv.slice(2);
const dir = args[0];
const reason = args.slice(1).join(" ") || "no concrete worked example";
if (!dir) {
  console.error('usage: mark_skipped.mjs <paper-dir> "<reason>"');
  process.exit(1);
}

const progressPath = path.join(config.outputRoot, "progress.json");
const progress = JSON.parse(fs.readFileSync(progressPath, "utf8"));
if (!progress.papers[dir]) {
  console.error(`unknown paper dir: ${dir}`);
  process.exit(1);
}
progress.papers[dir].status = "skipped";
progress.papers[dir].reason = reason;
progress.papers[dir].cards = 0;
progress.papers[dir].updated = new Date().toISOString();
progress.updated = new Date().toISOString();
fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), "utf8");
console.log(`marked skipped: ${dir} (${reason})`);

execFileSync(process.execPath, [path.join(import.meta.dirname, "refresh_queue.mjs")], { stdio: "inherit" });
