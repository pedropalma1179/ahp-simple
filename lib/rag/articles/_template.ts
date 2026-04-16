/**
 * RAG Extraction: [ARTICLE TITLE]
 * Source: [AUTHOR (YEAR)]
 * Extracted: [DATE]
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
    id: 'authorYear_slug',
    citation: { abnt: null, bibtex: null },
    doi: null,
    type: 'foundational',
    metadata: { year: null, venue: null, domain: null },
    thresholds: [],
    formulas: [],
    tables_figures: [],
    empirical_data: {
        n_respondents: null,
        aggregation: null,
        n_alternatives: null,
        n_criteria: { total: null, B: null, O: null, C: null, R: null },
        bocr_weights: null,
        scores_by_method: null,
        rankings_by_method: null,
        concordance: null,
        sensitivity: null,
        cr_values: null,
        weight_ratio_max_min: null,
    },
    key_claims: [],
    limitations: [],
    recommendations: [],
    cites: [],
    cited_by_context: {},
    notes: [],
};

export default article;