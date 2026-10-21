---
name: example-extraction
description: Batch-extract worked computational examples and their accompanying algorithms from converted-paper Markdown into unified English QA cards (raw slices + processed JSON/JSONL/MD). Use when running or continuing a batch extraction pipeline, adding or skipping a paper, validating cards, or syncing per-paper deliverables.
---

# Example Extraction Pipeline

Extract worked computational examples (and algorithm blocks that accompany them) from converted paper
Markdown into the unified corpus layout (see `README.md`), with optional per-paper mirror sync under
`SL_ROOT`.

## Invariants (do not break)

- Treat the source paper Markdown as read-only. Never modify it.
- Structured fields (question/answer/notes/etc.) are written in **English**. `original_section` keeps the
  source text verbatim (formulas, tables, numbers, OCR artifacts); never translate it or invent numbers.
- Every performance function is labelled `explicit` (closed-form g(X) in the source) or `implicit`
  (evaluated via FE/CFD/dynamics/black-box simulation).
- All deterministic pipeline steps go through the scripts under `scripts/`; do not hand-edit
  `jsonl/`, `raw/` or `processed/`.
- `validate_corpus.mjs` must pass before a batch is reported complete.
- If a paper has no concrete worked example (no limit-state function + variables + numeric results),
  mark it `skipped` with a reason instead of fabricating cards.

## Pipeline commands (run from the repo root)

```bash
npm run index        # or: node scripts/build_corpus_index.mjs
npm run queue        # or: node scripts/refresh_queue.mjs
npm run pick -- 6    # or: node scripts/pick_next.mjs 6 [--algo] [--lang en]
npm run build        # or: node scripts/build_corpus_cards.mjs
npm run validate     # or: node scripts/validate_corpus.mjs
npm run sync-sl      # or: node scripts/sync_sl.mjs
npm run skip -- <dir> "<reason>"   # or: node scripts/mark_skipped.mjs <dir> "<reason>"
```

Paths are configurable via `PAPERS_ROOT`, `OUTPUT_ROOT`, `SL_ROOT` (see `scripts/config.mjs`).

The hand-curated card entries live in `scripts/corpus_cards.data.mjs` (append one item per paper,
following the shape documented in `references/extraction-rules.md`).

## Per-paper batch loop

1. Run `pick_next.mjs` and choose 2-4 papers (prefer English, short, `has_algorithm` for algorithm cards).
2. Read the paper's Markdown fully (headings, example sections, tables, figures).
3. Write one card per worked example (and one per explicit algorithm/pseudocode block that accompanies
   examples) into `corpus_cards.data.mjs`, then verify its syntax with `node --check`.
4. Run `build_corpus_cards.mjs` and `validate_corpus.mjs`.
5. If a paper turns out to lack a concrete example, run `mark_skipped.mjs` instead.
6. Run `sync_sl.mjs`, refresh the queue, and report the batch (which papers, card counts, validation).

## References

- `references/batch-workflow.md` — full step-by-step batch procedure, data-file append mechanics and gotchas.
- `references/extraction-rules.md` — record schema dictionary, explicit/implicit rules, card-writing and
  fidelity conventions, and skip criteria.
