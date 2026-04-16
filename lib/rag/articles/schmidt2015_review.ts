/**
 * Article Extraction: SCHMIDT, K (2015)
 * "et al"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "schmidt2015_review",
  citation: {
    abnt: "SCHMIDT, K. et al. Applying the Analytic Hierarchy Process in healthcare research: A systematic literature review and evaluation of reporting. BMC Medical Informatics and Decision Making, v. 15, n. 112, 2015.",
    bibtex: "@article{schmidt2015review,\n  author = {Schmidt, Katharina and Aumann, Ines and Hollander, Ines and Damm, Kathrin and von der Schulenburg, J-Matthias Graf},\n  title = {Applying the Analytic Hierarchy Process in healthcare research: A systematic literature review and evaluation of reporting},\n  journal = {BMC Medical Informatics and Decision Making},\n  year = {2015},\n  volume = {15},\n  number = {112},\n  doi = {10.1186/s12911-015-0234-7},\n  publisher = {BioMed Central}\n}"
  },
  doi: "10.1186/s12911-015-0234-7",
  type: "review",
  metadata: { year: 2015, venue: "BMC Medical Informatics and Decision Making", domain: "Healthcare / Methodology Review" },
  thresholds: [
    {
      metric: "CR",
      operator: "=",
      value: 0.1,
      unit: "ratio",
      context: "most common accepted threshold in reviewed studies",
      evidence: {
        page: 7,
        locator_type: "section",
        locator_id: "Analysis and validation of results",
        quote: "31 studies used a CR of 0.1"
      }
    },
    {
      metric: "CR",
      operator: "≤",
      value: 0.15,
      unit: "ratio",
      context: "widened consistency range accepted by some studies",
      evidence: {
        page: 7,
        locator_type: "section",
        locator_id: "Analysis and validation of results",
        quote: "five studies widened the range to a CR of 0.15"
      }
    },
    {
      metric: "CR",
      operator: "≤",
      value: 0.2,
      unit: "ratio",
      context: "highest accepted consistency threshold in healthcare reviews",
      evidence: {
        page: 7,
        locator_type: "section",
        locator_id: "Analysis and validation of results",
        quote: "three studies accepted a CR of 0.2 or less"
      }
    }
  ],
  formulas: [],
  tables_figures: [
    {
      kind: "figure",
      label: "Fig. 1",
      caption: "Steps of the AHP",
      content: {
        columns: [],
        rows: []
      },
      notes: "Modeled after Dolan et al. and Dolan.",
      evidence: { page: 3, locator_type: "figure", locator_id: "Fig. 1", quote: "Figure 1 shows the steps of the AHP." }
    }
  ],
  empirical_data: {
    n_respondents: 109,
    aggregation: "AIJ",
    n_alternatives: null,
    n_criteria: { total: 19.64, B: null, O: null, C: null, R: null },
    bocr_weights: null,
    scores_by_method: null,
    rankings_by_method: null,
    concordance: null,
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "Reciprocal property aggregation requires geometric mean.",
      verbatim_quote: "The reciprocal of the aggregated values must correspond to the individual reciprocal values; this can be achieved only by taking the geometric mean.",
      evidence: {
        page: 10,
        locator_type: "section",
        locator_id: "Discussion",
        quote: "This can be achieved only by taking the geometric mean [113]."
      },
      usable_as: "recommendation"
    },
    {
      claim: "Sensitivity analysis is essential for rank reversal assessment.",
      verbatim_quote: "Sensitivity analysis for AHP is relevant only when alternatives are included in the hierarchy.",
      evidence: {
        page: 10,
        locator_type: "section",
        locator_id: "Discussion",
        quote: "Sensitivity analysis for AHP is relevant only when alternatives are included in the hierarchy."
      },
      usable_as: "limitation"
    }
  ],
  limitations: [
    "AHP is applied inconsistently in healthcare research.",
    "Lack of methodological standards for aggregation (AIJ vs AIP).",
    "Underreporting of software, CR thresholds, and sensitivity analysis."
  ],
  recommendations: [
    "Establish standards for aggregating individual data (geometric vs arithmetic mean).",
    "Report consistency ratios and procedures for handling inconsistent answers.",
    "Combination of sources (literature + experts) is recommended for hierarchy design."
  ],
  cites: ["saaty", "dolan", "erkut_"],
  cited_by_context: {
    Dolan_1989: "First application of AHP in health economics.",
    saaty: "AHP origin and principle eigenvalue method.",
    dolan: "Healthcare AHP steps and decision support.",
    erkut_: "Sensitivity analysis in AHP."
  },
  notes: [
    "O artigo fornece uma média do estado da arte: a maioria das hierarquias tem entre 1 e 5 critérios no segundo nível, aumentando nos níveis inferiores.",
    "[Sanitized] sensitivity (original): Reported in only 14 out of 69 studies (approx. 20%).",
    "[Sanitized] aggregation (original): 29 studies described weight calculations; geometric mean and median common."
  ]
};

export default article;
