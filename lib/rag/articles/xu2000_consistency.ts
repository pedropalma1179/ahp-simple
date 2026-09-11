/**
 * Article Extraction: XU, Z (2000)
 * "On consistency of the weighted geometric mean complex judgement matrix in AHP"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "xu2000_consistency",
  citation: {
    abnt: "XU, Z. On consistency of the weighted geometric mean complex judgement matrix in AHP. European Journal of Operational Research, v. 126, n. 3, p. 683-687, 2000.",
    bibtex: "@article{xu2000consistency,\n  author = {Xu, Z.},\n  title = {On consistency of the weighted geometric mean complex judgement matrix in AHP},\n  journal = {European Journal of Operational Research},\n  year = {2000},\n  volume = {126},\n  issue = {3},\n  pages = {683--687},\n  publisher = {Elsevier Science B.V.},\n  doi = {10.1016/S0377-2217(99)00082-X}\n}"
  },
  doi: "10.1016/S0377-2217(99)00082-X",
  type: "methodological",
  metadata: { year: 2000, venue: "European Journal of Operational Research", domain: "Group Decision Making / AHP Consistency" },
  thresholds: [
    {
      metric: "CR",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency threshold for individual and aggregated matrices",
      evidence: {
        page: 683,
        locator_type: "section",
        locator_id: "Abstract",
        quote: "a consistency ratio (CR) of 0.1 or less is acceptable"
      }
    }
  ],
  formulas: [
    {
      id: "wgmcjm_definition",
      label: "Definition 2.4",
      latex: "\\overline{A} = A_1^{\\lambda_1} \\circ A_2^{\\lambda_2} \\circ \\cdots \\circ A_s^{\\lambda_s}",
      description: "Definition of the Weighted Geometric Mean Complex Judgement Matrix (WGMCJM).",
      variables: {
        "\\overline{A}": "weighted geometric mean complex judgement matrix",
        A_k: "judgement matrix from expert k",
        "\\lambda_k": "weight of expert k",
        "\\circ": "Hadamard product"
      },
      conditions: "Sum of weights must equal 1; all weights must be positive.",
      evidence: {
        page: 684,
        locator_type: "paragraph",
        locator_id: "2.4",
        quote: "Let A1, A2, ..., As be judgement matrices for the same decision problem, then the WGMCJM is A-bar... sum of lambda_k = 1."
      }
    },
    {
      id: "consistency_index_ci",
      label: "CI Formula",
      latex: "CI = \\frac{1}{n(n-1)} \\sum_{1 \\le i < j \\le n} (\\epsilon_{ij} + \\epsilon_{ji} - 2)",
      description: "Consistency index related to the perturbation matrix elements.",
      variables: { CI: "Consistency Index", n: "Matrix size", "\\epsilon_{ij}": "Perturbation element (ratio error)" },
      conditions: "Used to determine acceptable consistency based on perturbation from a perfectly consistent matrix.",
      evidence: { page: 684, locator_type: "section", locator_id: "2", quote: "CI = 1 / (n(n-1)) sum (epsilon_ij + epsilon_ji - 2)" }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "The mean consistency index of randomly generated matrices (RI)",
      content: {
        columns: ["n", "RI"],
        rows: [
          [1, 0],
          [2, 0],
          [3, 0.52],
          [4, 0.89],
          [5, 1.12],
          [6, 1.26],
          [7, 1.36],
          [8, 1.41],
          [9, 1.46],
          [10, 1.49],
          [11, 1.52],
          [12, 1.54],
          [13, 1.56],
          [14, 1.58],
          [15, 1.59]
        ]
      },
      notes: "Standard Saaty Random Index (RI) values up to n=15.",
      evidence: { page: 685, locator_type: "table", locator_id: "1", quote: "The mean consistency index of randomly generated matrices" }
    }
  ],
  empirical_data: {
    n_respondents: 4,
    aggregation: "AIJ",
    n_alternatives: 4,
    n_criteria: { total: 4, B: null, O: null, C: null, R: null },
    bocr_weights: null,
    scores_by_method: null,
    rankings_by_method: null,
    concordance: null,
    sensitivity: null,
    cr_values: { individual_mean: null, individual_range: null, aggregated: null, validity_rate: null },
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "The WGMCJM maintains acceptable consistency if all individual matrices are acceptable.",
      verbatim_quote: "the weighted geometric mean complex judgement matrix (WGMCJM) is of acceptable consistency (i.e., CR <= 0.1) under the condition that each Ak... is of acceptable consistency.",
      evidence: {
        page: 683,
        locator_type: "section",
        locator_id: "Introduction",
        quote: "this paper proves that the WGMCJM is of acceptable consistency (i.e., CR <= 0.1) under the condition that each Ak... is of acceptable consistency."
      },
      usable_as: "threshold"
    },
    {
      claim: "WGMM is the standard for group preference aggregation in AHP.",
      verbatim_quote: "The weighted geometric mean method (WGMM) is the most common group preference aggregation method in the Analytic Hierarchy Process.",
      evidence: {
        page: 683,
        locator_type: "section",
        locator_id: "Abstract",
        quote: "The weighted geometric mean method (WGMM) is the most common group preference aggregation method in the Analytic Hierarchy Process."
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "The proof assumes the existence of an underlying weight vector perturbed by human judgement.",
    "The condition requires all individual expert matrices to meet the acceptable consistency threshold (CR <= 0.1)."
  ],
  recommendations: [
    "Use Weighted Geometric Mean Method (WGMM) for aggregating group opinions in AHP to ensure mathematical consistency preservation.",
    "Check individual consistency ratios before aggregation to guarantee group matrix validity."
  ],
  cites: ["Saaty (1980)", "Aczel and Saaty (1983)", "Vargas (1990)"],
  cited_by_context: {
    "Saaty (1980)": "Basis for AHP, consistency ratio (CR) threshold of 0.1, and the Random Index (RI) table.",
    "Aczel and Saaty (1983)": "Procedures for synthesizing ratio judgements."
  },
  notes: [
    "The paper provides a formal proof using the properties of the Hadamard product and the strict convexity of the exponential function (Lemma 3.1).",
    "Numerical example shows that even with unequal weights (0.1, 0.2, 0.3, 0.4), the resulting CR (0.043) remains well below the 0.1 threshold.",
    "[Sanitized] aggregation (original): WGMM (Weighted Geometric Mean Method)"
  ]
};

export default article;
