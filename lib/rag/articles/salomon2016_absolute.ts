/**
 * Article Extraction: SALOMON, V (2016)
 * "A"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "salomon2016_absolute",
  citation: {
    abnt: "SALOMON, V. A. P. Absolute measurement and ideal synthesis on AHP. International Journal of the Analytic Hierarchy Process, v. 8, n. 3, p. 538-545, 2016.",
    bibtex: "@article{salomon2016absolute,\n  title={Absolute measurement and ideal synthesis on AHP},\n  author={Salomon, Valerio A. P.},\n  journal={International Journal of the Analytic Hierarchy Process},\n  volume={8},\n  number={3},\n  pages={538--545},\n  year={2016},\n  doi={10.13033/ijahp.v8i3.452}\n}"
  },
  doi: "10.13033/ijahp.v8i3.452",
  type: "methodological",
  metadata: { year: 2016, venue: "International Journal of the Analytic Hierarchy Process", domain: "MCDM theory and application" },
  thresholds: [
    {
      metric: "set of alternatives",
      operator: "≤",
      value: 9,
      unit: "count",
      context: "limit for the set of alternatives in relative measurement",
      evidence: {
        page: 1,
        locator_type: "paragraph",
        locator_id: null,
        quote: "In relative measurement, the set of alternatives must be less or equal than nine, or else, 'seven, plus or minus two'"
      }
    }
  ],
  formulas: [
    {
      id: "overall_priority_weighted_sum",
      label: "Decision Vector Calculation",
      latex: "\\text{Overall Priority} = \\sum (\\text{local\\_priority} \\times \\text{criterion\\_weight})",
      description: "Calculation of overall priorities for project selection using a weighted sum of B, O, and R criteria.",
      variables: { B: "Benefits", O: "Opportunities", R: "Risks" },
      conditions: "Used in the example to calculate the weighted sum of local priorities.",
      evidence: {
        page: 3,
        locator_type: "footnote",
        locator_id: "1",
        quote: "the overall priorities can be calculated as a weighted sum."
      }
    },
    {
      id: "ideal_synthesis_normalization",
      label: "Ideal Synthesis",
      latex: "w_{i,ideal} = w_{i} / \\max(w)",
      description: "In ideal synthesis, the highest priority regarding each criterion is set to one.",
      variables: { w_i: "Priority vector component", "max(w)": "Maximum component value in the vector" },
      conditions: "Applied to preserve rank and provide priorities based on a utility-like concept.",
      evidence: {
        page: 2,
        locator_type: "paragraph",
        locator_id: null,
        quote: "In this way of synthesis, the highest priority regarding each criterion will be equal to one."
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "Priorities of benefits, opportunities and risks",
      content: {
        columns: ["Criterion", "B", "O", "R", "Eigenvector", "Priority"],
        rows: [
          ["Benefits (B)", "1", "4", "9", "3.3", "0.74"],
          ["Opportunities (O)", "1/4", "1", "2", "0.79", "0.18"],
          ["Risks (R)", "1/9", "1/2", "1", "0.38", "0.09"]
        ]
      },
      notes: "Shows criteria weights for a partial BOCR structure (missing Costs).",
      evidence: { page: 2, locator_type: "table", locator_id: "Table 1", quote: "Priorities of benefits, opportunities and risks" }
    },
    {
      kind: "table",
      label: "Table 5",
      caption: "Local and overall priorities of Projects X, Y and Z",
      content: {
        columns: ["Project", "B (0.74)", "O (0.18)", "R (0.09)", "Overall"],
        rows: [
          ["X", "0.56", "0.08", "0.14", "0.44"],
          ["Y", "0.33", "0.69", "0.69", "0.43"],
          ["Z", "0.11", "0.23", "0.17", "0.14"]
        ]
      },
      notes: "Decision matrix using relative measurement and normal synthesis.",
      evidence: { page: 3, locator_type: "table", locator_id: "Table 5", quote: "Local and overall priorities of Projects X, Y and Z" }
    },
    {
      kind: "table",
      label: "Table 13",
      caption: "Local and overall priorities with ideal synthesis of Projects X, Y and Z",
      content: {
        columns: ["Project", "B (0.74)", "O (0.18)", "R (0.09)", "Overall"],
        rows: [
          ["X", "1", "0.11", "0.2", "0.77"],
          ["Y", "0.6", "1", "1", "0.71"],
          ["Z", "0.2", "0.33", "0.25", "0.23"]
        ]
      },
      notes: "Shows ideal priorities where the best alternative per criterion equals 1.",
      evidence: { page: 5, locator_type: "table", locator_id: "Table 13", quote: "Local and overall priorities with ideal synthesis" }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: 3,
    n_criteria: { total: 3, B: 1, O: 1, C: 0, R: 1 },
    bocr_weights: null,
    scores_by_method: {
      relative_synthesis: { X: 0.44, Y: 0.43, Z: 0.14 },
      ideal_synthesis: { X: 0.77, Y: 0.71, Z: 0.23 }
    },
    rankings_by_method: null,
    concordance: null,
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "Absolute measurement removes boundaries for the number of alternatives.",
      verbatim_quote: "The first advantage of absolute measurement is that there is no boundary for the set of alternatives.",
      evidence: {
        page: 1,
        locator_type: "paragraph",
        locator_id: null,
        quote: "The first advantage of absolute measurement is that there is no boundary for the set of alternatives."
      },
      usable_as: "recommendation"
    },
    {
      claim: "Combining absolute measurement with ideal synthesis prevents rank reversal.",
      verbatim_quote: "Combining absolute measurement with ideal synthesis will always preserve ranks",
      evidence: {
        page: 2,
        locator_type: "paragraph",
        locator_id: null,
        quote: "Combining absolute measurement with ideal synthesis will always preserve ranks"
      },
      usable_as: "definition"
    },
    {
      claim: "Ideal synthesis scores represent a concept similar to utility.",
      verbatim_quote: "ideal synthesis is the value in the priority. That is the '0.77' for Project X... represent a concept similar to 'utility'",
      evidence: {
        page: 6,
        locator_type: "paragraph",
        locator_id: null,
        quote: "That is the '0.77' for Project X in Tables 13 and 17 represent a concept similar to 'utility'"
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "Relative measurement is constrained by the '7 +/- 2' rule.",
    "Normalized priorities can lead to illegitimate changes in rank (rank reversal) when alternatives are added or deleted."
  ],
  recommendations: [
    "Adopt absolute measurement and ideal synthesis if rank preservation is a primary concern for the decision-maker.",
    "Use ratings (absolute measurement) to provide unbiased measurements by comparing alternatives against standard levels."
  ],
  cites: ["gear1983", "vargas1990"],
  cited_by_context: {
    gear1983: "First authors to associate rank reversal with AHP.",
    vargas1990: "Discusses network structuring and the violation of the axiom of independence."
  },
  notes: [
    "O artigo foca na síntese ideal para evitar Rank Reversal (RR).",
    "Apresenta um caso numérico parcial de BOCR (Benefits, Opportunities, Risks) omitindo Costs.",
    "O autor utiliza o termo 'Ratings' como sinônimo de absolute measurement.",
    "[Sanitized] cr_values (original): consistent (all matrices in the example are stated as consistent)",
    "[Sanitized] rankings_by_method (original): X > Y > Z (both methods in initial state)"
  ]
};

export default article;
