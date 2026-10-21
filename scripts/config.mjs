// Shared path configuration.
// All paths can be overridden by environment variables so the pipeline works on other machines:
//   PAPERS_ROOT      where the converted-paper Markdown corpus lives (each paper = one folder with one .md)
//   OUTPUT_ROOT      where corpus_index.json / progress.json / raw / processed / jsonl / schema are written
//   SL_ROOT          where per-paper deliverables are mirrored (raw + processed + schema)
export const config = {
  papersRoot: process.env.PAPERS_ROOT || "./papers",
  outputRoot: process.env.OUTPUT_ROOT || "./output/example_extraction",
  slRoot: process.env.SL_ROOT || "./sl",
};

export function absPath(p) {
  return p;
}
