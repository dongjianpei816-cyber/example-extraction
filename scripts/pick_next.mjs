import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

const args = process.argv.slice(2);
const countIdx = args.findIndex((a) => !a.startsWith("--"));
const count = countIdx >= 0 ? parseInt(args[countIdx], 10) : 12;
const lang = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null;
const onlyAlgo = args.includes("--algo");

let queue = JSON.parse(fs.readFileSync(path.join(config.outputRoot, "batch_queue.json"), "utf8"));
if (lang) queue = queue.filter((x) => x.language === lang);
if (onlyAlgo) queue = queue.filter((x) => x.has_algorithm);
queue = queue.slice(0, count);

console.log(`next ${queue.length} papers:`);
for (const item of queue) {
  console.log(String(item.lines).padStart(5), item.has_algorithm ? "ALG" : "   ", item.language, item.dir, "|", item.title.slice(0, 60));
}
