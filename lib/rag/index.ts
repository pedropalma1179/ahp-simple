/**
 * RAG Knowledge Base — Central Aggregator
 * 
 * Imports all article extractions and builds thematic indexes
 * consumed by AI Reviewer, Parecer Técnico, and academic text generator.
 * 
 * TO ADD A NEW ARTICLE:
 * 1. Create lib/rag/articles/authorYear.ts (copy from _template.ts)
 * 2. Import it below
 * 3. Add to ARTICLES array
 * 4. Run `npm run build` to verify types
 */

import type {
  ArticleExtraction,
  ThresholdWithSource,
  FormulaWithSource,
  ClaimWithSource,
  BenchmarkEntry
} from './types';

// ============================================================
// ARTICLE IMPORTS (alphabetical order)
// ============================================================
import alizadeh2020_energy from './articles/alizadeh2020_energy';
import aullhyde2006_experiment from './articles/aullhyde2006_experiment';
import ayan2023_weightingMethodsMCDM from './articles/ayan2023_weightingMethodsMCDM';
import demirtas2008_integrated from './articles/demirtas2008_integrated';
import dodevska2023when from './articles/dodevska2023when';
import escobar2004_note from './articles/escobar2004_note';
import forman1998_aggregating from './articles/forman1998_aggregating';
import harker1987_incomplete from './articles/harker1987_incomplete';
import ishizaka2011review from './articles/ishizaka2011review';
import kabak2014_prioritization from './articles/kabak2014_prioritization';
import lee2009_wind from './articles/lee2009_wind';
import lee2024_project from './articles/lee2024_project';
import liang2022_ahp_undesirable from './articles/liang2022_ahp_undesirable';
import mu2016_bocr from './articles/mu2016_bocr';
import neely2020_upperEchelonsMetacritiques from './articles/neely2020_upperEchelonsMetacritiques';
import ossadnik2016_group_aggregation from './articles/ossadnik2016_group_aggregation';
import petrillo2023state from './articles/petrillo2023state';
import saaty1977_scaling from './articles/saaty1977_scaling';
import saaty1986_axiomatic from './articles/saaty1986_axiomatic';
import saaty1987_whatitis from './articles/saaty1987_whatitis';
import saaty1990_howtomake from './articles/saaty1990_howtomake';
import saaty2003_eigenvector from './articles/saaty2003_eigenvector';
import saaty2015_trustworthy from './articles/saaty2015_trustworthy';
import saatyOzdemir2003_negative from './articles/saatyOzdemir2003_negative';
import saatyVargas2012 from './articles/saatyVargas2012';
import saiyed2023_ceoPowerUET from './articles/saiyed2023_ceoPowerUET';
import salomon2016_absolute from './articles/salomon2016_absolute';
import salomon2024_consistency from './articles/salomon2024_consistency';
import schmidt2015_review from './articles/schmidt2015_review';
import schmidt2016_priorities from './articles/schmidt2016_priorities';
// REMOVED: scopusAI2025_cr_group — Scopus AI summaries are not peer-reviewed articles (removed v7.1)
import tavana2023_revolution from './articles/tavana2023_revolution';
import wijnmalen2007_bocr from './articles/wijnmalen2007_bocr';
import xu2000_consistency from './articles/xu2000_consistency';

// ============================================================
// MASTER ARTICLE LIST
// ============================================================
const ARTICLES: ArticleExtraction[] = [
  alizadeh2020_energy,
  aullhyde2006_experiment,
  ayan2023_weightingMethodsMCDM,
  demirtas2008_integrated,
  dodevska2023when,
  escobar2004_note,
  forman1998_aggregating,
  harker1987_incomplete,
  ishizaka2011review,
  kabak2014_prioritization,
  lee2009_wind,
  lee2024_project,
  liang2022_ahp_undesirable,
  mu2016_bocr,
  neely2020_upperEchelonsMetacritiques,
  ossadnik2016_group_aggregation,
  petrillo2023state,
  saaty1977_scaling,
  saaty1986_axiomatic,
  saaty1987_whatitis,
  saaty1990_howtomake,
  saaty2003_eigenvector,
  saaty2015_trustworthy,
  saatyOzdemir2003_negative,
  saatyVargas2012,
  saiyed2023_ceoPowerUET,
  salomon2016_absolute,
  salomon2024_consistency,
  schmidt2015_review,
  schmidt2016_priorities,
  // REMOVED: scopusAI2025_cr_group (v7.1 — not a peer-reviewed article)
  tavana2023_revolution,
  wijnmalen2007_bocr,
  xu2000_consistency,
];

// ============================================================
// INDEX BUILDERS
// ============================================================

export function getAllThresholds(): ThresholdWithSource[] {
  return ARTICLES.flatMap(article =>
    article.thresholds.map(t => ({
      ...t,
      source_article: article.id,
      source_year: article.metadata.year
    }))
  );
}

export function getThresholdsByMetric(metric: string): ThresholdWithSource[] {
  return getAllThresholds().filter(t =>
    t.metric.toLowerCase() === metric.toLowerCase()
  );
}

export function getAllFormulas(): FormulaWithSource[] {
  return ARTICLES.flatMap(article =>
    article.formulas.map(f => ({
      ...f,
      source_article: article.id,
      source_year: article.metadata.year
    }))
  );
}

export function getFormulasByKeyword(keyword: string): FormulaWithSource[] {
  const kw = keyword.toLowerCase();
  return getAllFormulas().filter(f =>
    f.id.toLowerCase().includes(kw) ||
    f.description.toLowerCase().includes(kw)
  );
}

export function getAllClaims(): ClaimWithSource[] {
  return ARTICLES.flatMap(article =>
    article.key_claims.map(c => ({
      ...c,
      source_article: article.id,
      source_year: article.metadata.year
    }))
  );
}

export function getClaimsByUsage(
  usable_as: 'threshold' | 'benchmark' | 'recommendation' | 'limitation' | 'definition'
): ClaimWithSource[] {
  return getAllClaims().filter(c => c.usable_as === usable_as);
}

export function getAllBenchmarks(): BenchmarkEntry[] {
  return ARTICLES
    .filter(a => a.type === 'application' || a.empirical_data.n_respondents !== null)
    .map(a => ({
      source_article: a.id,
      source_year: a.metadata.year,
      domain: a.metadata.domain,
      n_respondents: a.empirical_data.n_respondents,
      n_alternatives: a.empirical_data.n_alternatives,
      n_criteria_total: a.empirical_data.n_criteria.total,
      bocr_weights: a.empirical_data.bocr_weights,
      concordance_rate: a.empirical_data.concordance?.rate ?? null,
      cr_aggregated: a.empirical_data.cr_values?.aggregated ?? null,
      weight_ratio: a.empirical_data.weight_ratio_max_min
    }));
}

export function getArticle(id: string): ArticleExtraction | undefined {
  return ARTICLES.find(a => a.id === id);
}

export function getAllArticles(): ArticleExtraction[] {
  return [...ARTICLES];
}

export function getArticleIds(): string[] {
  return ARTICLES.map(a => a.id);
}

export function searchClaims(keyword: string): ClaimWithSource[] {
  const kw = keyword.toLowerCase();
  return getAllClaims().filter(c =>
    c.claim.toLowerCase().includes(kw) ||
    c.verbatim_quote.toLowerCase().includes(kw)
  );
}

// ============================================================
// CONVENIENCE: Pre-built grouped indexes
// ============================================================

export function getCRThresholds(): ThresholdWithSource[] {
  return getThresholdsByMetric('CR');
}

export function getSensitivityThresholds(): ThresholdWithSource[] {
  return getThresholdsByMetric('sensitivity');
}

export function getBOCRFormulas(): FormulaWithSource[] {
  return getAllFormulas().filter(f =>
    f.id.includes('bocr') ||
    f.id.includes('subtractive') ||
    f.id.includes('multiplicative') ||
    f.id.includes('additive') ||
    f.id.includes('quotient')
  );
}

// ============================================================
// STATS (for debugging / dashboard)
// ============================================================
export function getRAGStats() {
  return {
    total_articles: ARTICLES.length,
    total_thresholds: getAllThresholds().length,
    total_formulas: getAllFormulas().length,
    total_claims: getAllClaims().length,
    total_benchmarks: getAllBenchmarks().length,
    articles_by_type: {
      foundational: ARTICLES.filter(a => a.type === 'foundational').length,
      methodological: ARTICLES.filter(a => a.type === 'methodological').length,
      application: ARTICLES.filter(a => a.type === 'application').length,
      review: ARTICLES.filter(a => a.type === 'review').length,
    }
  };
}
