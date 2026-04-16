/**
 * RAG Knowledge Base — Type Definitions
 * Shared types for all article extractions
 * 
 * IMPORTANT: These types mirror the extraction prompt structure.
 * Do NOT modify without updating the extraction prompt accordingly.
 */

// ============================================================
// Evidence (traceability for every data point)
// ============================================================
export interface Evidence {
  /** Page number in the original PDF. null if not determinable. */
  page: number | null;
  /** Type of locator: section, equation, table, figure, paragraph, footnote */
  locator_type: 'section' | 'equation' | 'table' | 'figure' | 'paragraph' | 'footnote' | 'abstract' | null;
  /** Locator ID within the article (e.g., "3.2", "Eq. 12", "Table 7") */
  locator_id: string | null;
  /** Verbatim quote from the article (English). Max ~25 words for claims/thresholds, ~50 for formulas/conditions. */
  quote: string | null;
}

// ============================================================
// Threshold (numeric criterion with source)
// ============================================================
export interface Threshold {
  /** What is being measured (e.g., "CR", "DI", "sample_size", "sensitivity") */
  metric: string;
  /** Comparison operator */
  operator: '≤' | '≥' | '<' | '>' | '=' | '≈';
  /** Numeric value */
  value: number;
  /** Unit of measurement */
  unit: 'ratio' | 'percent' | 'count' | 'index' | 'years' | string;
  /** Context in English (e.g., "acceptable consistency", "reject respondent") */
  context: string;
  /** Traceability */
  evidence: Evidence;
}

// ============================================================
// Formula / Equation
// ============================================================
export interface Formula {
  /** Stable slug (e.g., "cr_formula", "bocr_subtractive") */
  id: string;
  /** Original label in the article (e.g., "Eq. (12)") */
  label: string | null;
  /** LaTeX representation */
  latex: string;
  /** Short description in English */
  description: string;
  /** Variable dictionary: symbol → meaning */
  variables: Record<string, string>;
  /** Conditions/assumptions for use (English). null if not stated. */
  conditions: string | null;
  /** Traceability */
  evidence: Evidence;
}

// ============================================================
// Table / Figure
// ============================================================
export interface TableFigure {
  /** "table" or "figure" */
  kind: 'table' | 'figure';
  /** Original label (e.g., "Table 7", "Fig. 3") */
  label: string;
  /** Original caption in English */
  caption: string;
  /** Structured content for tables */
  content: {
    columns: string[];
    rows: (string | number | null)[][];
  } | null;
  /** Notes about transcription (e.g., "Rows 1-5 of 20 shown") */
  notes: string | null;
  /** Traceability */
  evidence: Evidence;
}

// ============================================================
// Empirical Data
// ============================================================
export interface EmpiricalData {
  n_respondents: number | null;
  /** Aggregation method: AIJ (individual judgments) or AIP (individual priorities) */
  aggregation: 'AIJ' | 'AIP' | null;
  n_alternatives: number | null;
  n_criteria: {
    total: number | null;
    B: number | null;
    O: number | null;
    C: number | null;
    R: number | null;
  };
  bocr_weights: { B: number; O: number; C: number; R: number } | null;
  /** Scores indexed by method name, then by alternative */
  scores_by_method: Record<string, Record<string, number>> | null;
  /** Rankings indexed by method name, then by alternative */
  rankings_by_method: Record<string, Record<string, number>> | null;
  /** Concordance between methods */
  concordance: {
    rate: number | null;
    n_methods: number | null;
    description: string | null;
  } | null;
  /** Sensitivity analysis results */
  sensitivity: {
    method: 'OAT' | 'Monte Carlo' | 'other' | null;
    inflection_points: Array<{
      dimension: string;
      point_percent: number;
      event: string;
    }>;
  } | null;
  /** CR values */
  cr_values: {
    individual_mean: number | null;
    individual_range: [number, number] | null;
    aggregated: number | null;
    validity_rate: number | null;
  } | null;
  /** Max/min weight ratio (only if published, not computed) */
  weight_ratio_max_min: number | null;
}

// ============================================================
// Key Claim (citable by AI Reviewer)
// ============================================================
export interface KeyClaim {
  /** Short paraphrase in English */
  claim: string;
  /** Verbatim quote from article (English, ≤25 words) */
  verbatim_quote: string;
  /** Traceability */
  evidence: Evidence;
  /** How the AI Reviewer can use this */
  usable_as: 'threshold' | 'benchmark' | 'recommendation' | 'limitation' | 'definition';
}

// ============================================================
// Citation Relation
// ============================================================
export interface CitationRelation {
  /** Article ID being cited (e.g., "saaty1980") */
  article_id: string;
  /** Context of the citation (1-2 lines English) */
  context: string;
  /** Traceability */
  evidence: Evidence;
}

// ============================================================
// Article Extraction (main type)
// ============================================================
export interface ArticleExtraction {
  /** Unique slug: "authorYear" or "authorYear_topic" */
  id: string;
  
  citation: {
    abnt: string | null;
    bibtex: string | null;
  };
  
  doi: string | null;
  
  /** Article classification */
  type: 'foundational' | 'methodological' | 'application' | 'review';
  
  metadata: {
    year: number | null;
    /** Journal or conference name */
    venue: string | null;
    /** Application domain (e.g., "energy policy", "supply chain") */
    domain: string | null;
  };
  
  thresholds: Threshold[];
  formulas: Formula[];
  tables_figures: TableFigure[];
  empirical_data: EmpiricalData;
  key_claims: KeyClaim[];
  limitations: string[];
  recommendations: string[];
  
  /** IDs of articles this one cites */
  cites: string[];
  /** Detailed citation contexts */
  cited_by_context: Record<string, string>;
  
  /** Misc notes (e.g., extraction caveats) */
  notes: string[];
}

// ============================================================
// Aggregated Indexes (built by index.ts)
// ============================================================
export interface ThresholdWithSource extends Threshold {
  source_article: string;
  source_year: number | null;
}

export interface FormulaWithSource extends Formula {
  source_article: string;
  source_year: number | null;
}

export interface ClaimWithSource extends KeyClaim {
  source_article: string;
  source_year: number | null;
}

export interface BenchmarkEntry {
  source_article: string;
  source_year: number | null;
  domain: string | null;
  n_respondents: number | null;
  n_alternatives: number | null;
  n_criteria_total: number | null;
  bocr_weights: { B: number; O: number; C: number; R: number } | null;
  concordance_rate: number | null;
  cr_aggregated: number | null;
  weight_ratio: number | null;
}
