# example-extraction

Batch-extract worked computational examples (and the algorithms that accompany them) from
converted-paper Markdown into unified, English QA cards. Each worked example produces:

- `raw/<paper-dir>/<card-id>.md` — a verbatim slice of the original Markdown, with copied figures;
- `processed/<paper-dir>/qa-cards.json` + `qa-cards.md` — structured records and a human-readable view;
- `jsonl/qa_cards.jsonl` — all records, one JSON object per line;
- `schema/` — JSON Schema templates for the unified record format;
- an optional mirrored per-paper folder (e.g. `sl/<paper-dir>/`) with everything self-contained.

This project also ships as a Codex skill so an agent can run the batches for you.

> 中文简介：把 PDF 转出的论文 Markdown 逐篇拆成“英文题目+答案”结构化卡片（算例卡 + 算法卡），
> 保留原文切片与图片，输出 JSON / JSONL / Markdown，带显式/隐式性能函数标注和 Schema 校验。

## Features

- Unified record schema (`example_card`, `algorithm_card`) with field-level validation.
- Explicit vs implicit performance-function labelling rules (documented in the skill references).
- Verbatim raw slices: formulas, tables, numbers and OCR quirks preserved; nothing is translated or patched.
- Deterministic pipeline: corpus index, batch queue, card builder, validator, D:\SL-style mirror sync.
- Checkpointing via `progress.json`; idempotent JSONL (deduplicated by record id).

## Repo layout

```text
SKILL.md                          Codex skill entrypoint (can be installed as a skill)
references/                       Batch workflow + extraction rules
scripts/                          Pipeline scripts (Node >= 18, ESM)
schema/                           record / example_card / algorithm_card JSON Schema
examples/                         Generic record example
papers/                           (not committed) put your converted-paper Markdown corpus here
output/                           (not committed) pipeline artifacts
sl/                               (not committed) mirrored per-paper deliverables
```

## Quick start

1. Put your converted Markdown corpus under `papers/` (one folder per paper, one `.md` per folder).
2. Index the corpus and build the queue:

```bash
npm run index
npm run queue
npm run pick -- 6
```

3. Define the cards for a paper in `scripts/corpus_cards.data.mjs` (see `references/` for the item/card
   shape and the raw-slice line numbers), then render and validate:

```bash
npm run build
npm run validate   # must print ALL-CHECKS-PASS
```

4. Mirror per-paper deliverables:

```bash
npm run sync-sl
```

## Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PAPERS_ROOT` | `./papers` | root of the converted-paper Markdown corpus |
| `OUTPUT_ROOT` | `./output/example_extraction` | where `corpus_index.json`, `progress.json`, `raw/`, `processed/`, `jsonl/`, `schema/` are written |
| `SL_ROOT` | `./sl` | where the self-contained per-paper mirror is written |

Example:

```bash
export PAPERS_ROOT=/data/papers OUTPUT_ROOT=/data/out SL_ROOT=/data/sl
npm run index && npm run queue
```

## As a Codex skill

The `SKILL.md` at the repo root is a self-contained Codex skill. Point it at this repo (or install it
with `$skill-installer` from the repo path) and instruct Codex to follow the batch workflow in
`references/batch-workflow.md`.

## Scope and license

The repository contains only tooling, schemas and generic documentation. It does **not** include any
paper text, paper-derived cards or extracted corpora, so you can safely use it on your own (licensed)
documents. Released under the MIT License.
