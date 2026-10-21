# Extraction Rules

## Record schema (schema_version 1.0.0)

Every record has `kind` = `example_card` or `algorithm_card`, plus:

- `paper`: title, doi (null for books), source_type, authors (else `[not stated in source]`),
  language, source_file, source_lines {start, end}.
- `question`: objective (English), scenario (English), variables
  (symbol/description/distribution/mean/std/unit), performance_function, targets
  (Pf / beta / moments / MPP / design optimum / response statistics / approximation error / other).
- `answer`: method, steps (English array), reported_results (original table blocks verbatim),
  conclusions (English).
- `original_section`: verbatim source slice; image paths rewritten to `figures/<base>` relative to
  `raw/<paper-dir>/`.
- `images`: relative paths of the copied figures.
- `notes`: English array; OCR artifacts, missing parameters `[not stated in source]`, table placement issues.
- `algorithm` (algorithm_card only): name, purpose, inputs, outputs, steps, pseudocode, cost_if_stated.

Schema templates: `schema/record.schema.json`, `schema/example_card.schema.json`,
`schema/algorithm_card.schema.json`.

## Explicit / implicit rule

- `explicit`: the source gives a closed-form g(X) (e.g. `g = R - S`, `g = exp(0.2 x1 + 1.4) - x2`).
- `implicit`: the performance function can only be evaluated by a numerical model
  (FE, CFD, dynamics solver, multi-disciplinary simulation, surrogate/black box); e.g. ADINA trusses,
  the rocket range R, `g = 0.06 - Delta(x)` with FE displacement.
- If the source gives both a formula and an FE verification, mark `explicit` and add a note about the FE
  verification.

## Card-writing conventions

- Question: state what must be computed, the system/scenario, every variable with its distribution and
  parameters, the performance function, and the target quantities. Preserve the source's printed values
  even when they look wrong.
- Answer: name the method; list the solution steps (English); include the reported numeric results
  exactly as printed; state the source's conclusions.
- Reported results: the builder extracts the tables listed in `tableCaptions` from the source verbatim;
  do not retype tables into the data file.
- Algorithm cards: only when the source has an explicit algorithm/pseudocode block accompanying worked
  examples (`Algorithm N`, numbered procedure steps, pseudo-code boxes).

## Fidelity

- No translation of `original_section`; no rounding, no reconstruction of missing numbers.
- OCR garbage stays in the raw slice; mention the artifact in `notes` (e.g. `Weilbull`, `sondermal`,
  garbled table cells).
- A source block may contain more than one example (e.g. Examples 7.4-7.5 sharing one block): create
  separate cards, each with the same `startLine`/`endLine` where the content is shared, and note it.

## Skip criteria (mark `skipped` with a reason)

- No numerical examples: papers that only mention "example"/"test cases" without limit-state functions,
  variables and reported results.
- Non-computational analyses without reliability numbers.
- Non-English papers may still be extracted (structured fields in English, raw slice in the source
  language), but handle them with extra care.
