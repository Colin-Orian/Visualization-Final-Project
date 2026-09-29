#!/usr/bin/env node

/**
 * Reproducible corpus reporting and manual-validation sampling for the existing
 * geographic NER artifacts.
 *
 * This utility deliberately does not run spaCy or alter extraction, taxonomy,
 * chapter aggregation, or visualization files. It only reads existing inputs
 * and writes reports/samples under validation-reporting/outputs.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.dirname(SCRIPT_DIR);
const DEFAULT_OUTPUT_DIR = path.join(SCRIPT_DIR, "outputs");

const NER_SAMPLE_SEED = 20260821;
const CANONICAL_SAMPLE_SEED = 20260822;
const SAMPLE_SIZE = 100;
const CONTEXT_CHARACTERS_PER_SIDE = 200;
const MANUSCRIPT_STATED_WORK_COUNT = 3532;

const INPUTS = {
  works: path.join(PROJECT_ROOT, "data", "openalexworks.json"),
  entities: path.join(PROJECT_ROOT, "data", "all_entities.json"),
  taxonomy: path.join(PROJECT_ROOT, "data", "location_taxonomy.json"),
  coreWorks: path.join(PROJECT_ROOT, "data", "core_works.csv"),
  chapterLocations: path.join(PROJECT_ROOT, "data", "chapterLocations.json"),
  archivedCoreWorks: path.join(PROJECT_ROOT, "ArchivedCode", "core_works_two.csv"),
  removedRow: path.join(PROJECT_ROOT, "data", "removedRow.txt"),
};

const OUTPUT_NAMES = {
  reportJson: "corpus_statistics.json",
  reportMarkdown: "corpus_statistics.md",
  differencesCsv: "population_id_differences.csv",
  nerSampleCsv: "ner_validation_sample_100.csv",
  canonicalSampleCsv: "canonical_validation_sample_100.csv",
  evaluationJson: "annotation_results.json",
  evaluationMarkdown: "annotation_results.md",
};

function usage() {
  return `Usage:
  node validation-reporting/geographic-ner-report.mjs generate [--force] [--output-dir PATH]
  node validation-reporting/geographic-ner-report.mjs evaluate [--ner-annotations PATH] [--canonical-annotations PATH] [--output-dir PATH]

Commands:
  generate   Create corpus reports, ID-difference audit CSV, and two fixed-seed samples.
  evaluate   Score completed annotation columns. Recall is never estimated.

Defaults:
  output directory: validation-reporting/outputs
  NER sample seed: ${NER_SAMPLE_SEED}
  canonical sample seed: ${CANONICAL_SAMPLE_SEED}
  sample size: ${SAMPLE_SIZE}
`;
}

function parseArguments(argv) {
  const command = argv[0];
  if (!command || !["generate", "evaluate"].includes(command)) {
    throw new Error(usage());
  }

  const options = { command, force: false, outputDir: DEFAULT_OUTPUT_DIR };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--force") {
      options.force = true;
    } else if (["--output-dir", "--ner-annotations", "--canonical-annotations"].includes(argument)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value after ${argument}`);
      index += 1;
      const resolved = path.resolve(PROJECT_ROOT, value);
      if (argument === "--output-dir") options.outputDir = resolved;
      if (argument === "--ner-annotations") options.nerAnnotations = resolved;
      if (argument === "--canonical-annotations") options.canonicalAnnotations = resolved;
    } else {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`);
    }
  }

  options.nerAnnotations ??= path.join(options.outputDir, OUTPUT_NAMES.nerSampleCsv);
  options.canonicalAnnotations ??= path.join(options.outputDir, OUTPUT_NAMES.canonicalSampleCsv);
  return options;
}

async function readUtf8(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readUtf8(filePath));
}

function parseDelimited(text, delimiter = ",") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      // The archived core file uses backslash-escaped quotes inside quoted
      // abstracts, while current CSV outputs use standard doubled quotes.
      if (character === "\\" && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("Malformed delimited data: unclosed quoted field");
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).filter((row) => row.some((value) => value !== "")).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
  );
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(headers, rows) {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function lowerExact(value) {
  // Canonicalization preserves the existing methodology: complete alias match,
  // case-insensitive, with no fuzzy matching, trimming, or geographic lookup.
  return value.toLowerCase();
}

function makeTaxonomyLookup(taxonomy) {
  const lookup = new Map();
  let aliasCount = 0;
  for (const [canonicalRegion, aliases] of Object.entries(taxonomy)) {
    for (const alias of aliases) {
      const key = lowerExact(alias);
      if (lookup.has(key) && lookup.get(key) !== canonicalRegion) {
        throw new Error(`Taxonomy alias collision: ${alias}`);
      }
      lookup.set(key, canonicalRegion);
      aliasCount += 1;
    }
  }
  return { lookup, aliasCount };
}

function canonicalForMention(mentionText, taxonomyLookup) {
  return taxonomyLookup.get(lowerExact(mentionText)) ?? "";
}

function mulberry32(seed) {
  // Small deterministic 32-bit PRNG. The documented seed plus sorted input
  // order makes sample membership stable across Node versions and platforms.
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleWithoutReplacement(records, size, seed) {
  if (size > records.length) {
    throw new Error(`Cannot sample ${size} records from a population of ${records.length}`);
  }
  const shuffled = [...records].sort((left, right) =>
    left.mention_instance_id.localeCompare(right.mention_instance_id, "en"),
  );
  const random = mulberry32(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  const sample = shuffled.slice(0, size);
  if (new Set(sample.map((row) => row.mention_instance_id)).size !== sample.length) {
    throw new Error("Sampling invariant failed: duplicate mention instance selected");
  }
  return sample;
}

function contextForMention(abstract, start, end) {
  const leftStart = Math.max(0, start - CONTEXT_CHARACTERS_PER_SIDE);
  const rightEnd = Math.min(abstract.length, end + CONTEXT_CHARACTERS_PER_SIDE);
  const left = abstract.slice(leftStart, start).replace(/\s+/g, " ");
  const mention = abstract.slice(start, end).replace(/\s+/g, " ");
  const right = abstract.slice(end, rightEnd).replace(/\s+/g, " ");
  return `${leftStart > 0 ? "…" : ""}${left}[[${mention}]]${right}${rightEnd < abstract.length ? "…" : ""}`;
}

function compareChapterLocations(reconstructed, stored) {
  const differences = [];
  const chapters = new Set([...Object.keys(reconstructed), ...Object.keys(stored)]);
  for (const chapter of [...chapters].sort()) {
    const locations = new Set([
      ...Object.keys(reconstructed[chapter] ?? {}),
      ...Object.keys(stored[chapter] ?? {}),
    ]);
    for (const location of [...locations].sort()) {
      const reconstructedCount = reconstructed[chapter]?.[location] ?? 0;
      const storedCount = Number(stored[chapter]?.[location] ?? 0);
      if (reconstructedCount !== storedCount) {
        differences.push({ chapter, location, reconstructedCount, storedCount });
      }
    }
  }
  return differences;
}

async function loadData() {
  const raw = Object.fromEntries(
    await Promise.all(Object.entries(INPUTS).map(async ([name, filePath]) => [name, await readUtf8(filePath)])),
  );
  const works = JSON.parse(raw.works);
  const entities = JSON.parse(raw.entities);
  const taxonomy = JSON.parse(raw.taxonomy);
  const coreRows = rowsToObjects(parseDelimited(raw.coreWorks, "|"));
  const storedChapterLocations = JSON.parse(raw.chapterLocations);
  const archivedCoreRows = rowsToObjects(parseDelimited(raw.archivedCoreWorks, "|"));
  const removedRow = parseDelimited(raw.removedRow, "|")[0] ?? [];

  return {
    raw,
    works,
    entities,
    taxonomy,
    coreRows,
    storedChapterLocations,
    archivedCoreRows,
    removedRow,
  };
}

function analyze(data) {
  const {
    works,
    entities,
    taxonomy,
    coreRows,
    storedChapterLocations,
    archivedCoreRows,
    removedRow,
  } = data;
  const { lookup: taxonomyLookup, aliasCount } = makeTaxonomyLookup(taxonomy);

  const worksById = new Map();
  for (const work of works) {
    if (worksById.has(work.id)) throw new Error(`Duplicate work ID in openalexworks.json: ${work.id}`);
    worksById.set(work.id, work);
  }

  const worksWithAbstract = works.filter((work) => Boolean(work.ab));
  const worksWithoutAbstract = works.length - worksWithAbstract.length;
  const mentionRecords = [];
  let locMentions = 0;
  let gpeMentions = 0;
  let abstractsWithMentions = 0;
  let abstractsWithTaxonomyMatches = 0;
  const surfaces = new Set();

  for (const [workId, workMentions] of Object.entries(entities)) {
    const work = worksById.get(workId);
    if (!work) throw new Error(`Entity output references unknown work ID: ${workId}`);
    if (!work.ab) throw new Error(`Entity output references a work without an abstract: ${workId}`);
    if (workMentions.length > 0) abstractsWithMentions += 1;
    let workHasTaxonomyMatch = false;

    workMentions.forEach((mention, mentionIndex) => {
      if (!['LOC', 'GPE'].includes(mention.label)) {
        throw new Error(`Unexpected entity label ${mention.label} for ${workId}`);
      }
      if (work.ab.slice(mention.start, mention.end) !== mention.text) {
        throw new Error(`Offset mismatch for ${workId} at ${mention.start}:${mention.end}`);
      }
      if (mention.label === "LOC") locMentions += 1;
      if (mention.label === "GPE") gpeMentions += 1;
      surfaces.add(mention.text);
      const canonicalRegion = canonicalForMention(mention.text, taxonomyLookup);
      if (canonicalRegion) workHasTaxonomyMatch = true;
      mentionRecords.push({
        mention_instance_id: `${workId}|${mention.start}|${mention.end}|${mention.label}|${mentionIndex}`,
        work_id: workId,
        mention_text: mention.text,
        predicted_label: mention.label,
        start_offset: mention.start,
        end_offset: mention.end,
        context: contextForMention(work.ab, mention.start, mention.end),
        taxonomy_alias_match: canonicalRegion ? "yes" : "no",
        matched_canonical_region: canonicalRegion,
      });
    });
    if (workHasTaxonomyMatch) abstractsWithTaxonomyMatches += 1;
  }

  if (Object.keys(entities).length !== worksWithAbstract.length) {
    throw new Error(
      `Processed-work mismatch: ${Object.keys(entities).length} entity keys versus ${worksWithAbstract.length} abstracts`,
    );
  }

  const taxonomyMatchedMentions = mentionRecords.filter((row) => row.taxonomy_alias_match === "yes");
  const coreById = new Map();
  for (const row of coreRows) {
    const existing = coreById.get(row.openalex_work_id) ?? {
      workId: row.openalex_work_id,
      title: row.title,
      chapters: new Set(),
    };
    existing.chapters.add(row.woaii_chapter);
    coreById.set(row.openalex_work_id, existing);
  }

  const openAlexIds = new Set(worksById.keys());
  const coreIds = new Set(coreById.keys());
  const coreNotInOpenAlex = [...coreIds].filter((workId) => !openAlexIds.has(workId)).sort();
  const openAlexNotInCore = [...openAlexIds].filter((workId) => !coreIds.has(workId)).sort();

  const titleGroups = new Map();
  const missingTitleRecords = [];
  for (const record of coreById.values()) {
    if (!record.title || record.title === "NA") {
      missingTitleRecords.push(record);
      continue;
    }
    const group = titleGroups.get(record.title) ?? [];
    group.push(record);
    titleGroups.set(record.title, group);
  }
  const duplicateTitleGroups = [...titleGroups.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([title, records]) => ({ title, records }))
    .sort((left, right) => left.title.localeCompare(right.title, "en"));
  const duplicateTitleExcess = duplicateTitleGroups.reduce(
    (total, group) => total + group.records.length - 1,
    0,
  );
  const titleDeduplicatedRecordCount = titleGroups.size + missingTitleRecords.length;

  const reconstructedChapterLocations = {};
  for (const row of coreRows) {
    const canonicalRegionsInWork = new Set(
      (entities[row.openalex_work_id] ?? [])
        .map((mention) => canonicalForMention(mention.text, taxonomyLookup))
        .filter(Boolean),
    );
    if (canonicalRegionsInWork.size === 0) continue;
    reconstructedChapterLocations[row.woaii_chapter] ??= {};
    for (const canonicalRegion of canonicalRegionsInWork) {
      reconstructedChapterLocations[row.woaii_chapter][canonicalRegion] ??= 0;
      reconstructedChapterLocations[row.woaii_chapter][canonicalRegion] += 1;
    }
  }
  const chapterDifferences = compareChapterLocations(
    reconstructedChapterLocations,
    storedChapterLocations,
  );
  if (chapterDifferences.length > 0) {
    throw new Error(`Stored chapterLocations.json differs from reconstruction: ${JSON.stringify(chapterDifferences.slice(0, 5))}`);
  }
  const canonicalDocumentChapterIncidences = Object.values(reconstructedChapterLocations)
    .flatMap((locations) => Object.values(locations))
    .reduce((sum, count) => sum + count, 0);

  const archivedIds = new Set(archivedCoreRows.map((row) => row.openalex_work_id));
  const archivedNotCurrent = [...archivedIds].filter((workId) => !coreIds.has(workId)).sort();
  const currentNotArchived = [...coreIds].filter((workId) => !archivedIds.has(workId)).sort();
  const removedRowId = removedRow[1] ?? "";

  const differenceRows = [];
  for (const workId of coreNotInOpenAlex) {
    const record = coreById.get(workId);
    differenceRows.push({
      comparison: "core_works.csv vs openalexworks.json",
      category: "core_id_absent_from_openalexworks",
      work_id: workId,
      title: record.title,
      chapters: [...record.chapters].sort().join(";"),
      related_work_ids: "",
      details: "Present in core_works.csv but absent from openalexworks.json",
    });
  }
  for (const group of duplicateTitleGroups) {
    const ids = group.records.map((record) => record.workId).sort();
    for (const record of group.records) {
      differenceRows.push({
        comparison: "3541 unique core IDs vs manuscript-stated 3532 works",
        category: "exact_nonmissing_title_duplicate_candidate",
        work_id: record.workId,
        title: group.title,
        chapters: [...record.chapters].sort().join(";"),
        related_work_ids: ids.filter((workId) => workId !== record.workId).join(";"),
        details: "Distinct OpenAlex IDs share an exact non-missing title; title-level deduplication removes nine excess records across these groups",
      });
    }
  }
  for (const workId of archivedNotCurrent) {
    const archivedRow = archivedCoreRows.find((row) => row.openalex_work_id === workId);
    differenceRows.push({
      comparison: "ArchivedCode/core_works_two.csv vs data/core_works.csv",
      category: "archived_id_removed_from_current_core",
      work_id: workId,
      title: archivedRow?.title ?? "",
      chapters: archivedRow?.woaii_chapter ?? "",
      related_work_ids: "",
      details: workId === removedRowId
        ? "Exactly matches the ID recorded in data/removedRow.txt"
        : "Archived ID is absent from current core file",
    });
  }

  const statistics = {
    unique_works_in_openalexworks: worksById.size,
    works_with_abstracts: worksWithAbstract.length,
    works_without_abstracts: worksWithoutAbstract,
    total_loc_gpe_mention_instances: mentionRecords.length,
    loc_mention_instances: locMentions,
    gpe_mention_instances: gpeMentions,
    abstracts_with_at_least_one_loc_gpe_mention: abstractsWithMentions,
    abstracts_without_loc_gpe_mentions_among_abstracts: worksWithAbstract.length - abstractsWithMentions,
    distinct_case_sensitive_surface_forms: surfaces.size,
    taxonomy_matched_mention_instances: taxonomyMatchedMentions.length,
    unmatched_mention_instances: mentionRecords.length - taxonomyMatchedMentions.length,
    abstracts_with_at_least_one_taxonomy_match: abstractsWithTaxonomyMatches,
    canonical_categories: Object.keys(taxonomy).length,
    taxonomy_aliases: aliasCount,
    chapter_work_associations: coreRows.length,
    unique_work_ids_in_core_works: coreIds.size,
    canonical_document_chapter_incidences: canonicalDocumentChapterIncidences,
    represented_chapters_with_canonical_incidences: Object.keys(reconstructedChapterLocations).length,
  };

  const populationInvestigation = {
    manuscript_stated_work_count: MANUSCRIPT_STATED_WORK_COUNT,
    openalexworks_unique_ids: openAlexIds.size,
    core_works_unique_ids: coreIds.size,
    core_ids_absent_from_openalexworks: coreNotInOpenAlex.length,
    openalexworks_ids_absent_from_core: openAlexNotInCore.length,
    openalexworks_is_strict_subset_of_core_ids:
      coreNotInOpenAlex.length > 0 && openAlexNotInCore.length === 0,
    exact_nonmissing_duplicate_title_groups: duplicateTitleGroups.length,
    duplicate_record_excess_across_those_groups: duplicateTitleExcess,
    core_record_count_after_exact_nonmissing_title_deduplication: titleDeduplicatedRecordCount,
    missing_title_records_kept_separate: missingTitleRecords.length,
    title_deduplication_matches_manuscript_count:
      titleDeduplicatedRecordCount === MANUSCRIPT_STATED_WORK_COUNT,
    archived_core_rows: archivedCoreRows.length,
    archived_core_unique_ids: archivedIds.size,
    current_core_rows: coreRows.length,
    current_core_unique_ids: coreIds.size,
    archived_ids_absent_from_current: archivedNotCurrent,
    current_ids_absent_from_archive: currentNotArchived,
    removed_row_recorded_id: removedRowId,
    interpretation:
      "The 3,532 manuscript count is numerically consistent with exact-title deduplication of non-missing titles in the current 3,541-ID core file, while treating six NA-title IDs as separate records. This is evidence, not proof of the manuscript's original counting procedure, because no manuscript-level ID list is present locally.",
  };

  return {
    statistics,
    populationInvestigation,
    mentionRecords,
    taxonomyMatchedMentions,
    differenceRows,
    inputHashes: Object.fromEntries(Object.entries(data.raw).map(([name, text]) => [name, sha256(text)])),
  };
}

function makeReportPayload(analysis) {
  return {
    generated_by: "validation-reporting/geographic-ner-report.mjs",
    methodology_note:
      "Read-only reporting over existing extraction artifacts. NER extraction, taxonomy aliases, case-insensitive exact alias matching, document-chapter deduplication, and visualization code are unchanged.",
    recall_note:
      "Recall is not estimated because undetected geographic references are not exhaustively annotated.",
    sampling: {
      algorithm: "Sort by mention_instance_id, then Mulberry32-seeded Fisher-Yates without replacement",
      sample_size_each: SAMPLE_SIZE,
      ner_sample_seed: NER_SAMPLE_SEED,
      canonical_sample_seed: CANONICAL_SAMPLE_SEED,
      context_characters_per_side: CONTEXT_CHARACTERS_PER_SIDE,
    },
    statistics: analysis.statistics,
    population_investigation: analysis.populationInvestigation,
    input_sha256: analysis.inputHashes,
  };
}

function reportMarkdown(payload) {
  const s = payload.statistics;
  const p = payload.population_investigation;
  return `# Geographic NER corpus statistics and population audit

Generated by \`${payload.generated_by}\`. This report is read-only with respect to the existing pipeline and artifacts.

## Corpus statistics

| Measure | Count |
|---|---:|
| Unique works in \`openalexworks.json\` | ${s.unique_works_in_openalexworks.toLocaleString("en-US")} |
| Works with abstracts | ${s.works_with_abstracts.toLocaleString("en-US")} |
| Works without abstracts | ${s.works_without_abstracts.toLocaleString("en-US")} |
| Total LOC/GPE mention instances | ${s.total_loc_gpe_mention_instances.toLocaleString("en-US")} |
| LOC mention instances | ${s.loc_mention_instances.toLocaleString("en-US")} |
| GPE mention instances | ${s.gpe_mention_instances.toLocaleString("en-US")} |
| Abstracts with at least one LOC/GPE mention | ${s.abstracts_with_at_least_one_loc_gpe_mention.toLocaleString("en-US")} |
| Abstracts without LOC/GPE mentions, among works with abstracts | ${s.abstracts_without_loc_gpe_mentions_among_abstracts.toLocaleString("en-US")} |
| Distinct case-sensitive surface forms | ${s.distinct_case_sensitive_surface_forms.toLocaleString("en-US")} |
| Taxonomy-matched mention instances | ${s.taxonomy_matched_mention_instances.toLocaleString("en-US")} |
| Unmatched mention instances | ${s.unmatched_mention_instances.toLocaleString("en-US")} |
| Abstracts with at least one taxonomy match | ${s.abstracts_with_at_least_one_taxonomy_match.toLocaleString("en-US")} |
| Canonical categories | ${s.canonical_categories.toLocaleString("en-US")} |
| Taxonomy aliases | ${s.taxonomy_aliases.toLocaleString("en-US")} |
| Chapter-work associations | ${s.chapter_work_associations.toLocaleString("en-US")} |
| Unique work IDs in \`core_works.csv\` | ${s.unique_work_ids_in_core_works.toLocaleString("en-US")} |
| Canonical document-chapter incidences | ${s.canonical_document_chapter_incidences.toLocaleString("en-US")} |
| Represented chapters with canonical incidences | ${s.represented_chapters_with_canonical_incidences.toLocaleString("en-US")} |

Canonical document-chapter incidences count a canonical region at most once per chapter-work association. They are not raw mention frequencies.

## Why the work populations differ

- **Manuscript/Toupin count: ${p.manuscript_stated_work_count.toLocaleString("en-US")} works.** The current core file has ${p.core_works_unique_ids.toLocaleString("en-US")} unique OpenAlex IDs. Across its non-missing titles, ${p.exact_nonmissing_duplicate_title_groups} exact-title groups contain multiple IDs and contribute ${p.duplicate_record_excess_across_those_groups} excess ID-level records. Deduplicating those exact non-missing titles, while retaining the ${p.missing_title_records_kept_separate} records whose title is \`NA\` separately, yields exactly ${p.core_record_count_after_exact_nonmissing_title_deduplication.toLocaleString("en-US")} records. This is concrete evidence consistent with title-level counting, but it is not proof of the manuscript's original procedure because no manuscript-level ID list is available locally.
- **\`openalexworks.json\`: ${p.openalexworks_unique_ids.toLocaleString("en-US")} unique IDs.** Its ID set is a strict subset of the current core ID set: ${p.core_ids_absent_from_openalexworks} core IDs are absent from the metadata JSON, while ${p.openalexworks_ids_absent_from_core} JSON IDs are absent from the core file.
- **\`core_works.csv\`: ${p.core_works_unique_ids.toLocaleString("en-US")} unique IDs.** The archived pipe-delimited core file has ${p.archived_core_unique_ids.toLocaleString("en-US")} unique IDs. The current file removes exactly ${p.archived_ids_absent_from_current.length} archived ID (${p.archived_ids_absent_from_current.join(", ")}), matching \`data/removedRow.txt\`.

The complete 95-ID set difference, repeated-title groups, and archived removal are in \`population_id_differences.csv\`.

## Sampling protocol

- Sample size: ${payload.sampling.sample_size_each} mention instances per CSV.
- NER validation seed: ${payload.sampling.ner_sample_seed}.
- Canonical-region validation seed: ${payload.sampling.canonical_sample_seed}.
- Algorithm: ${payload.sampling.algorithm}.
- Context: up to ${payload.sampling.context_characters_per_side} source characters on each side; \`[[...]]\` marks the sampled mention.
- Sampling is without replacement within each sample, enforced using \`mention_instance_id\` uniqueness.

## Evaluation scope

${payload.recall_note} The evaluation utility reports counts and denominators for every percentage.
`;
}

async function writeGeneratedFile(filePath, contents, force) {
  if (!force) {
    try {
      await readFile(filePath);
      throw new Error(`Refusing to overwrite existing output: ${filePath}\nUse --force only if annotations do not need preservation.`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  await writeFile(filePath, contents, "utf8");
}

async function generate(options) {
  const data = await loadData();
  const analysis = analyze(data);
  const reportPayload = makeReportPayload(analysis);
  const nerSample = sampleWithoutReplacement(analysis.mentionRecords, SAMPLE_SIZE, NER_SAMPLE_SEED)
    .map((row) => ({ ...row, is_geographic: "", error_type: "", notes: "" }));
  const canonicalSample = sampleWithoutReplacement(
    analysis.taxonomyMatchedMentions,
    SAMPLE_SIZE,
    CANONICAL_SAMPLE_SEED,
  ).map((row) => ({
    ...row,
    is_geographic: "",
    canonical_region_correct: "",
    corrected_region: "",
    error_type: "",
    notes: "",
  }));

  const sourceHeaders = [
    "mention_instance_id",
    "work_id",
    "mention_text",
    "predicted_label",
    "start_offset",
    "end_offset",
    "context",
    "taxonomy_alias_match",
    "matched_canonical_region",
  ];
  const differenceHeaders = [
    "comparison",
    "category",
    "work_id",
    "title",
    "chapters",
    "related_work_ids",
    "details",
  ];

  await mkdir(options.outputDir, { recursive: true });
  const outputs = [
    [OUTPUT_NAMES.reportJson, `${JSON.stringify(reportPayload, null, 2)}\n`],
    [OUTPUT_NAMES.reportMarkdown, reportMarkdown(reportPayload)],
    [OUTPUT_NAMES.differencesCsv, toCsv(differenceHeaders, analysis.differenceRows)],
    [OUTPUT_NAMES.nerSampleCsv, toCsv([...sourceHeaders, "is_geographic", "error_type", "notes"], nerSample)],
    [
      OUTPUT_NAMES.canonicalSampleCsv,
      toCsv(
        [
          ...sourceHeaders,
          "is_geographic",
          "canonical_region_correct",
          "corrected_region",
          "error_type",
          "notes",
        ],
        canonicalSample,
      ),
    ],
  ];
  for (const [name, contents] of outputs) {
    await writeGeneratedFile(path.join(options.outputDir, name), contents, options.force);
  }

  console.log(`Generated ${outputs.length} files in ${options.outputDir}`);
  console.log(`NER sample seed: ${NER_SAMPLE_SEED}; canonical sample seed: ${CANONICAL_SAMPLE_SEED}`);
}

function parseBoolean(value, fieldName, rowNumber) {
  const normalized = value.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(normalized)) return true;
  if (["no", "n", "false", "0"].includes(normalized)) return false;
  throw new Error(`${fieldName} must be yes/no at CSV row ${rowNumber}; received ${JSON.stringify(value)}`);
}

async function readAnnotationCsv(filePath) {
  return rowsToObjects(parseDelimited(await readUtf8(filePath), ","));
}

function assertUniqueInstances(rows, sampleName) {
  const ids = rows.map((row) => row.mention_instance_id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${sampleName} contains duplicate mention_instance_id values`);
  }
}

function percent(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function metric(label, numerator, denominator) {
  return {
    label,
    numerator,
    denominator,
    proportion: percent(numerator, denominator),
    percentage: denominator === 0 ? null : Number(((numerator / denominator) * 100).toFixed(2)),
  };
}

function evaluateRows(nerRows, canonicalRows) {
  if (nerRows.length !== SAMPLE_SIZE) {
    throw new Error(`NER annotation file must contain ${SAMPLE_SIZE} rows; found ${nerRows.length}`);
  }
  if (canonicalRows.length !== SAMPLE_SIZE) {
    throw new Error(`Canonical annotation file must contain ${SAMPLE_SIZE} rows; found ${canonicalRows.length}`);
  }
  assertUniqueInstances(nerRows, "NER sample");
  assertUniqueInstances(canonicalRows, "Canonical sample");

  let nerGeographic = 0;
  let nerFalsePositive = 0;
  nerRows.forEach((row, index) => {
    const isGeographic = parseBoolean(row.is_geographic ?? "", "is_geographic", index + 2);
    if (isGeographic) nerGeographic += 1;
    else nerFalsePositive += 1;
  });

  let canonicalGeographic = 0;
  let canonicalNonGeographic = 0;
  let canonicalCorrect = 0;
  let canonicalIncorrect = 0;
  canonicalRows.forEach((row, index) => {
    const isGeographic = parseBoolean(row.is_geographic ?? "", "is_geographic", index + 2);
    if (!isGeographic) {
      canonicalNonGeographic += 1;
      return;
    }
    canonicalGeographic += 1;
    const isCorrect = parseBoolean(
      row.canonical_region_correct ?? "",
      "canonical_region_correct",
      index + 2,
    );
    if (isCorrect) canonicalCorrect += 1;
    else canonicalIncorrect += 1;
  });

  return {
    generated_by: "validation-reporting/geographic-ner-report.mjs evaluate",
    recall_note:
      "Recall is not estimated because undetected geographic references are not exhaustively annotated.",
    ner_sample: {
      rows: nerRows.length,
      geographic_mentions: nerGeographic,
      false_positive_mentions: nerFalsePositive,
      geographic_precision: metric("NER geographic precision", nerGeographic, nerRows.length),
      false_positive_proportion: metric("NER false-positive proportion", nerFalsePositive, nerRows.length),
    },
    canonical_sample: {
      rows: canonicalRows.length,
      valid_geographic_references: canonicalGeographic,
      non_geographic_references: canonicalNonGeographic,
      correct_canonical_assignments: canonicalCorrect,
      incorrect_canonical_assignments: canonicalIncorrect,
      geographic_reference_precision: metric(
        "Geographic-reference precision",
        canonicalGeographic,
        canonicalRows.length,
      ),
      canonical_region_assignment_accuracy: metric(
        "Canonical-region assignment accuracy among valid geographic mentions",
        canonicalCorrect,
        canonicalGeographic,
      ),
    },
  };
}

function formatMetric(metricResult) {
  if (metricResult.percentage === null) {
    return `${metricResult.label}: not calculable (denominator ${metricResult.denominator})`;
  }
  return `${metricResult.label}: ${metricResult.numerator}/${metricResult.denominator} = ${metricResult.percentage.toFixed(2)}%`;
}

function evaluationMarkdown(results, options) {
  return `# Geographic NER annotation results

## Sample 1: predicted LOC/GPE mentions

- ${formatMetric(results.ner_sample.geographic_precision)}
- ${formatMetric(results.ner_sample.false_positive_proportion)}

## Sample 2: taxonomy-matched mentions

- ${formatMetric(results.canonical_sample.geographic_reference_precision)}
- ${formatMetric(results.canonical_sample.canonical_region_assignment_accuracy)}
- Correct canonical assignments: ${results.canonical_sample.correct_canonical_assignments}
- Incorrect canonical assignments: ${results.canonical_sample.incorrect_canonical_assignments}

## Scope

${results.recall_note}

Annotation inputs:

- NER: \`${options.nerAnnotations}\`
- Canonical: \`${options.canonicalAnnotations}\`
`;
}

async function evaluate(options) {
  const [nerRows, canonicalRows] = await Promise.all([
    readAnnotationCsv(options.nerAnnotations),
    readAnnotationCsv(options.canonicalAnnotations),
  ]);
  const results = evaluateRows(nerRows, canonicalRows);
  results.annotation_inputs = {
    ner: options.nerAnnotations,
    canonical: options.canonicalAnnotations,
  };
  await mkdir(options.outputDir, { recursive: true });
  await writeFile(
    path.join(options.outputDir, OUTPUT_NAMES.evaluationJson),
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(options.outputDir, OUTPUT_NAMES.evaluationMarkdown),
    evaluationMarkdown(results, options),
    "utf8",
  );
  console.log(formatMetric(results.ner_sample.geographic_precision));
  console.log(formatMetric(results.ner_sample.false_positive_proportion));
  console.log(formatMetric(results.canonical_sample.geographic_reference_precision));
  console.log(formatMetric(results.canonical_sample.canonical_region_assignment_accuracy));
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.command === "generate") await generate(options);
  if (options.command === "evaluate") await evaluate(options);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
