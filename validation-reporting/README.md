# Geographic NER validation and reporting

This directory contains a dependency-free Node.js utility that reports on the
existing geographic NER artifacts and creates fixed-seed manual-validation
samples. It does not run spaCy or modify the extraction, taxonomy, chapter
aggregation, visualization code, or source data.

## Generate reports and blank samples

From the project root:

```powershell
node validation-reporting/geographic-ner-report.mjs generate
```

Generated files are written to `validation-reporting/outputs/`. Generation
refuses to overwrite existing files so completed annotations are protected.
To deliberately reproduce the blank outputs byte-for-byte, use:

```powershell
node validation-reporting/geographic-ner-report.mjs generate --force
```

`--force` overwrites the two annotation CSVs, including completed annotation
columns. Preserve annotated copies before using it.

## Fixed sampling protocol

- NER sample seed: `20260821`
- Canonical-region sample seed: `20260822`
- Sample size: 100 mention instances per file
- Algorithm: records are sorted by `mention_instance_id`, then shuffled using
  Mulberry32 and Fisher-Yates; the first 100 are selected without replacement.
- Context: up to 200 source characters before and after the mention. `[[...]]`
  marks the sampled mention. Whitespace is normalized only in the displayed
  context; offsets continue to address the unchanged source abstract.

The canonical taxonomy lookup reproduces the existing behavior: a complete,
case-insensitive alias match with no fuzzy matching, trimming, geocoding, or
external lookup.

## Complete annotations

Use `yes` or `no` in the required annotation fields. The evaluator also accepts
`y/n`, `true/false`, and `1/0`.

For `ner_validation_sample_100.csv`, complete:

- `is_geographic`
- `error_type` as appropriate
- `notes` as appropriate

For `canonical_validation_sample_100.csv`, complete:

- `is_geographic`
- `canonical_region_correct` for every row where `is_geographic=yes`
- `corrected_region` when the assigned region is incorrect
- `error_type` as appropriate
- `notes` as appropriate

## Calculate validation metrics

After completing both CSVs in place:

```powershell
node validation-reporting/geographic-ner-report.mjs evaluate
```

Or provide preserved/renamed annotation files:

```powershell
node validation-reporting/geographic-ner-report.mjs evaluate `
  --ner-annotations validation-reporting/outputs/ner_validation_sample_100_annotated.csv `
  --canonical-annotations validation-reporting/outputs/canonical_validation_sample_100_annotated.csv
```

The evaluator requires all 100 `is_geographic` annotations in each sample and
all applicable `canonical_region_correct` annotations. It writes
`annotation_results.json` and `annotation_results.md`, reporting numerators and
denominators for:

- NER geographic precision
- NER false-positive proportion
- geographic-reference precision among taxonomy-matched mentions
- canonical-region assignment accuracy among valid geographic mentions

Recall is intentionally not estimated because undetected geographic references
are not exhaustively annotated.

## Outputs

- `corpus_statistics.json`: machine-readable counts, population audit, sampling
  protocol, and SHA-256 hashes of every input.
- `corpus_statistics.md`: reviewer-readable summary.
- `population_id_differences.csv`: all core IDs absent from the metadata JSON,
  exact-title duplicate candidates, and the archived removed record.
- `ner_validation_sample_100.csv`: blank 100-mention NER validation sample.
- `canonical_validation_sample_100.csv`: blank 100-mention canonical-region
  validation sample.
- `annotation_results.json` / `annotation_results.md`: created by `evaluate`
  after annotation.

