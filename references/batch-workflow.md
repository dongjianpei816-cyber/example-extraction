# Batch Workflow

Process papers to completion in small batches (typically 2-4 papers per run), checkpointing every batch.

## 1. Select papers

```bash
npm run queue
npm run pick -- 12
```

`batch_queue.json` is sorted by priority: papers with algorithm blocks first, then by source length.
Useful filters: `--lang en`, `--algo` (only papers with algorithm blocks), or an explicit count.

## 2. Read a paper

Open the paper's Markdown. Inspect:
- headings and `Example N` / `NUMERICAL EXAMPLES` / `Case study` sections;
- the limit-state functions (explicit) or the simulation model (implicit);
- tables with numeric results (they are preserved verbatim in Reported Results);
- algorithm/pseudocode blocks (`Algorithm N`, numbered procedures) for `algorithm_card`s.

Decide: **extract** (concrete example with function/variables/results) or **skip**
(no concrete example: only mentions of "example", pure method papers without numbers, or non-numeric
analyses). Do not fabricate cards for papers without extractable content.

## 3. Write the cards

Append one item to `scripts/corpus_cards.data.mjs`:

```js
  {
    dir: "<paper-dir>",
    title: "...",
    doi: "...",               // null for books
    source_type: "paper",     // or "book"
    authors: "[not stated in source]",
    language: "en",
    input: "<absolute path to the paper .md>",
    cards: [ { kind: "example_card" | "algorithm_card", id: "...", label, title,
               sourceSection, startLine, endLine, tableCaptions, question: {...},
               answer: {...}, algorithm?: {...}, notes: [...] } ]
  },
];
```

Mechanics that commonly bite:
- The data file ends with `];`. To append: remove the trailing newline + `];`, append the new item plus a
  closing `];`, then `node --check`. Do not leave `],;` or a stray `,` at the junction.
- `startLine`/`endLine` are 1-based inclusive source line numbers; the array is 0-based.
- For `tableCaptions`, use the exact caption text (e.g. `"Table 2"`, `"表 3.1"`, `"TABLE I"`). The builder
  matches caption-start lines only, so prose like `Table 2 obviously shows ...` is ignored, and images or
  figure captions placed between a caption and its table are excluded from Reported Results automatically.
- Keep `notes` as an array of English strings; use `[not stated in source]` for missing parameters and flag
  OCR artifacts.

## 4. Build + validate + sync

```bash
npm run build
npm run validate
npm run sync-sl
npm run queue
```

`validate_corpus.mjs` must print `ALL-CHECKS-PASS`; otherwise fix the data before reporting.
`sync_sl.mjs` reports broken image links; they must be 0.

## 5. Skipping a paper

```bash
npm run skip -- <dir> "<reason>"
```

This records `status: skipped` in `progress.json` and regenerates `batch_queue.json`, so the paper is not
re-picked.

## 6. Reporting

Report: papers processed, cards added (per paper, example vs algorithm), validation result, sync status,
and the remaining pending count.
