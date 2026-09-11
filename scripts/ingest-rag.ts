/**
 * scripts/ingest-rag.ts
 *
 * Phase 6.3.2
 *
 * Ingests RAG articles into Upstash Vector via Voyage-3.
 *
 * Strategy:
 * - 1 chunk per structured element.
 * - Types: claim, formula, threshold, table_figure, recommendation.
 * - Stable ID: ${article_id}::${chunk_type}::${index}
 *
 * Usage:
 *   npx tsx scripts/ingest-rag.ts
 *   npx tsx scripts/ingest-rag.ts --dry-run
 *   npx tsx scripts/ingest-rag.ts --article saaty1977_scaling
 *   npx tsx scripts/ingest-rag.ts --article saaty1977_scaling --validate
 *   npx tsx scripts/ingest-rag.ts --verbose
 *   npx tsx scripts/ingest-rag.ts --reset
 */

import { config } from 'dotenv';
import { embed } from '../lib/rag/embed';
import {
  upsertChunk,
  deleteAll,
  querySimilar,
  type ChunkMetadata,
} from '../lib/rag/upstash-client';
import { getAllArticles } from '../lib/rag/index';
import type { ArticleExtraction } from '../lib/rag/types';

config({ path: '.env.local' });
config();

type ChunkType =
  | 'claim'
  | 'formula'
  | 'threshold'
  | 'table_figure'
  | 'recommendation';

interface ChunkInput {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

interface CLIArgs {
  dryRun: boolean;
  reset: boolean;
  verbose: boolean;
  validate: boolean;
  article: string | null;
}

function printUsage(): void {
  console.log(`
AHP-BOCR RAG Ingest

Usage:
  npx tsx scripts/ingest-rag.ts
  npx tsx scripts/ingest-rag.ts --dry-run
  npx tsx scripts/ingest-rag.ts --article saaty1977_scaling
  npx tsx scripts/ingest-rag.ts --article saaty1977_scaling --validate
  npx tsx scripts/ingest-rag.ts --verbose
  npx tsx scripts/ingest-rag.ts --reset

Flags:
  --dry-run       Generate chunks and statistics without writing to Upstash.
  --reset         Delete all vectors before ingesting.
  --article <id>  Process only one article.
  --verbose       Show detailed logs per chunk.
  --validate      Run a smoke-test query after ingest.
  --help          Show this help.
`);
}

function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = {
    dryRun: false,
    reset: false,
    verbose: false,
    validate: false,
    article: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];

    if (flag === '--help' || flag === '-h') {
      printUsage();
      process.exit(0);
    }

    if (flag === '--dry-run') {
      args.dryRun = true;
    } else if (flag === '--reset') {
      args.reset = true;
    } else if (flag === '--verbose') {
      args.verbose = true;
    } else if (flag === '--validate') {
      args.validate = true;
    } else if (flag === '--article') {
      const value = argv[i + 1];

      if (!value || value.startsWith('--')) {
        console.error('ERROR: --article requires an ID. Example: --article saaty1977_scaling');
        process.exit(1);
      }

      args.article = value;
      i += 1;
    } else {
      console.error(`ERROR: unknown flag: ${flag}`);
      printUsage();
      process.exit(1);
    }
  }

  if (args.dryRun && args.reset) {
    console.error('ERROR: do not combine --dry-run with --reset.');
    process.exit(1);
  }

  return args;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getYear(article: ArticleExtraction): number {
  return article.metadata.year ?? 0;
}

function buildBaseMetadata(
  article: ArticleExtraction,
  chunkType: ChunkType,
  chunkIndex: number,
  text: string
): Pick<
  ChunkMetadata,
  'article_id' | 'article_year' | 'article_type' | 'chunk_type' | 'chunk_index' | 'text'
> {
  return {
    article_id: article.id,
    article_year: getYear(article),
    article_type: article.type,
    chunk_type: chunkType,
    chunk_index: chunkIndex,
    text,
  };
}

function buildClaimChunks(article: ArticleExtraction): ChunkInput[] {
  return article.key_claims.map((claim, idx) => {
    const text = [
      `Claim: ${claim.claim}`,
      `Verbatim: ${claim.evidence.quote ?? claim.verbatim_quote}`,
      `Context: ${article.metadata.domain ?? 'N/A'} (${article.type})`,
    ].join('\n');

    return {
      id: `${article.id}::claim::${idx}`,
      text,
      metadata: {
        ...buildBaseMetadata(article, 'claim', idx, text),
        verbatim_quote: claim.evidence.quote ?? claim.verbatim_quote,
        page: claim.evidence.page,
        locator_type: claim.evidence.locator_type,
        locator_id: claim.evidence.locator_id,
        usable_as: claim.usable_as,
      },
    };
  });
}

function buildFormulaChunks(article: ArticleExtraction): ChunkInput[] {
  return article.formulas.map((formula, idx) => {
    const variablesStr = Object.entries(formula.variables)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');

    const text = [
      `Formula ${formula.id}: ${formula.description}`,
      `LaTeX: ${formula.latex}`,
      `Variables: ${variablesStr || 'N/A'}`,
      `Conditions: ${formula.conditions ?? 'N/A'}`,
    ].join('\n');

    return {
      id: `${article.id}::formula::${idx}`,
      text,
      metadata: {
        ...buildBaseMetadata(article, 'formula', idx, text),
        verbatim_quote: formula.evidence.quote,
        page: formula.evidence.page,
        locator_type: formula.evidence.locator_type,
        locator_id: formula.evidence.locator_id,
        usable_as: null,
      },
    };
  });
}

function buildThresholdChunks(article: ArticleExtraction): ChunkInput[] {
  return article.thresholds.map((threshold, idx) => {
    const text = [
      `Metric: ${threshold.metric} ${threshold.operator} ${threshold.value} ${threshold.unit}`,
      `Context: ${threshold.context}`,
      `Verbatim: ${threshold.evidence.quote ?? 'N/A'}`,
    ].join('\n');

    return {
      id: `${article.id}::threshold::${idx}`,
      text,
      metadata: {
        ...buildBaseMetadata(article, 'threshold', idx, text),
        verbatim_quote: threshold.evidence.quote,
        page: threshold.evidence.page,
        locator_type: threshold.evidence.locator_type,
        locator_id: threshold.evidence.locator_id,
        usable_as: null,
      },
    };
  });
}

function buildTableFigureChunks(article: ArticleExtraction): ChunkInput[] {
  return article.tables_figures.map((tableFigure, idx) => {
    const text = [`${tableFigure.kind} ${tableFigure.label}: ${tableFigure.caption}`, tableFigure.notes ?? '']
      .filter((line) => line.length > 0)
      .join('\n');

    return {
      id: `${article.id}::table_figure::${idx}`,
      text,
      metadata: {
        ...buildBaseMetadata(article, 'table_figure', idx, text),
        verbatim_quote: tableFigure.evidence.quote,
        page: tableFigure.evidence.page,
        locator_type: tableFigure.evidence.locator_type,
        locator_id: tableFigure.evidence.locator_id,
        usable_as: null,
      },
    };
  });
}

function buildRecommendationChunks(article: ArticleExtraction): ChunkInput[] {
  return article.recommendations.map((recommendation, idx) => {
    const text = [
      `Recommendation: ${recommendation}`,
      `Source: ${article.id} (${article.metadata.year ?? 'N/A'}), ${article.metadata.domain ?? 'N/A'}`,
    ].join('\n');

    return {
      id: `${article.id}::recommendation::${idx}`,
      text,
      metadata: {
        ...buildBaseMetadata(article, 'recommendation', idx, text),
        verbatim_quote: recommendation,
        page: null,
        locator_type: null,
        locator_id: null,
        usable_as: null,
      },
    };
  });
}

function buildAllChunks(article: ArticleExtraction): ChunkInput[] {
  return [
    ...buildClaimChunks(article),
    ...buildFormulaChunks(article),
    ...buildThresholdChunks(article),
    ...buildTableFigureChunks(article),
    ...buildRecommendationChunks(article),
  ];
}

function assertUniqueChunkIds(chunks: ChunkInput[]): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const chunk of chunks) {
    if (seen.has(chunk.id)) {
      duplicates.push(chunk.id);
    }

    seen.add(chunk.id);
  }

  if (duplicates.length > 0) {
    console.error('ERROR: duplicate chunk IDs found:');
    duplicates.forEach((id) => console.error(`  - ${id}`));
    process.exit(1);
  }
}

async function embedWithRetry(text: string, maxRetries = 3): Promise<number[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await embed(text, 'document');
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      const backoffMs = 1000 * 2 ** attempt;
      console.warn(`  Retry ${attempt + 1}/${maxRetries} in ${backoffMs}ms: ${String(error)}`);
      await sleep(backoffMs);
    }
  }

  throw lastError;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function printChunkStats(chunks: ChunkInput[]): void {
  const statsByType = chunks.reduce<Record<ChunkType, number>>(
    (acc, chunk) => {
      acc[chunk.metadata.chunk_type] += 1;
      return acc;
    },
    {
      claim: 0,
      formula: 0,
      threshold: 0,
      table_figure: 0,
      recommendation: 0,
    }
  );

  const totalChars = chunks.reduce((acc, chunk) => acc + chunk.text.length, 0);
  const estimatedTokens = estimateTokens(chunks.map((chunk) => chunk.text).join('\n'));

  console.log(`\nChunks generated: ${chunks.length}`);
  console.log('By type:');
  console.log(`  claim           ${statsByType.claim}`);
  console.log(`  formula         ${statsByType.formula}`);
  console.log(`  threshold       ${statsByType.threshold}`);
  console.log(`  table_figure    ${statsByType.table_figure}`);
  console.log(`  recommendation  ${statsByType.recommendation}`);
  console.log(`\nTotal characters: ${totalChars.toLocaleString()}`);
  console.log(`Estimated input tokens: ~${estimatedTokens.toLocaleString()}`);
  console.log(
    `Estimated Voyage-3 free tier usage: ${((estimatedTokens / 50_000_000) * 100).toFixed(3)}%`
  );
}

async function runValidation(): Promise<{ top5Ids: string[]; hasSaaty: boolean }> {
  console.log('\n=== VALIDATE: querySimilar smoke test ===');

  const query = 'consistency ratio Saaty AHP threshold acceptable';
  console.log(`Query: "${query}"`);

  const queryVector = await embed(query, 'query');
  const results = await querySimilar(queryVector, 5);

  console.log('\nTop-5 results:');

  results.forEach((result, index) => {
    console.log(`\n  ${index + 1}. ${result.id} (score ${result.score.toFixed(4)})`);

    const preview = result.metadata.text.substring(0, 150).replace(/\n/g, ' ');
    console.log(`     ${preview}${result.metadata.text.length > 150 ? '...' : ''}`);
  });

  const hasSaaty = results.some((result) => result.metadata.article_id.startsWith('saaty1977'));

  if (hasSaaty) {
    console.log('\nValidation OK: top-5 contains a saaty1977 chunk.');
  } else {
    console.warn('\nValidation inconclusive: no saaty1977 chunk in top-5.');
  }

  return {
    top5Ids: results.map((result) => result.id),
    hasSaaty,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== AHP-BOCR RAG Ingest: Phase 6.3.2 ===');
  console.log(
    `Flags: dryRun=${args.dryRun}, reset=${args.reset}, verbose=${args.verbose}, validate=${args.validate}, article=${args.article ?? '(all)'}`
  );

  const allArticles = getAllArticles();

  console.log(`\nArticles found in RAG: ${allArticles.length}`);

  if (allArticles.length !== 35) {
    console.warn(`WARNING: expected 35 articles, found ${allArticles.length}.`);
  }

  const targetArticles = args.article
    ? allArticles.filter((article) => article.id === args.article)
    : allArticles;

  if (targetArticles.length === 0) {
    console.error(`ERROR: no article matches "${args.article}".`);
    console.error('\nAvailable IDs:');
    allArticles.forEach((article) => console.error(`  - ${article.id}`));
    process.exit(1);
  }

  console.log(`Articles selected: ${targetArticles.length}`);

  const chunks = targetArticles.flatMap((article) => buildAllChunks(article));

  if (chunks.length === 0) {
    console.error('ERROR: no chunks generated.');
    process.exit(1);
  }

  assertUniqueChunkIds(chunks);
  printChunkStats(chunks);

  if (args.dryRun) {
    console.log('\n=== DRY-RUN: nothing will be written to Upstash ===');
    console.log('\nSample chunks:');

    chunks.slice(0, 3).forEach((chunk, index) => {
      console.log(`\n[${index + 1}] ${chunk.id}`);
      console.log(`  ${chunk.text.split('\n').join('\n  ')}`);
    });

    if (chunks.length > 3) {
      console.log(`\n... and ${chunks.length - 3} more chunks.`);
    }

    if (args.verbose) {
      console.log('\n=== ALL IDS ===');
      chunks.forEach((chunk) => console.log(`  ${chunk.id}`));
    }

    console.log('\nDry-run completed. No vectors were written.');
    return;
  }

  if (args.reset) {
    console.log('\nWARNING: --reset detected. ALL vectors in the index will be deleted.');
    console.log('Press Ctrl+C within 3 seconds to abort.');
    await sleep(3000);

    console.log('Calling deleteAll()...');
    await deleteAll();
    console.log('Reset completed.\n');
  }

  console.log('\n=== Embed + Upsert sequential with 100ms throttle ===');

  const startTime = Date.now();
  let okCount = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];

    try {
      const vector = await embedWithRetry(chunk.text, 3);
      await upsertChunk(chunk.id, vector, chunk.metadata);

      okCount += 1;

      if (args.verbose) {
        console.log(`[${i + 1}/${chunks.length}] OK ${chunk.id}`);
      } else if ((i + 1) % 50 === 0 || i + 1 === chunks.length) {
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Progress: ${i + 1}/${chunks.length} (${elapsedSeconds}s)`);
      }

      await sleep(100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({ id: chunk.id, error: errorMessage });
      console.error(`FAIL ${chunk.id}: ${errorMessage}`);
    }
  }

  const elapsedMs = Date.now() - startTime;

  console.log('\n=== SUMMARY ===');
  console.log(`OK: ${okCount}/${chunks.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Total time: ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`Average latency: ${(elapsedMs / chunks.length).toFixed(0)} ms/chunk`);

  if (errors.length > 0) {
    console.log('\nDetailed errors:');
    errors.forEach((error) => console.log(`  ${error.id}: ${error.error}`));
    process.exitCode = 1;
  }

  if (args.validate) {
    await runValidation();
  }
}

main().catch((error) => {
  console.error('\nFATAL:', error);
  process.exit(1);
});
