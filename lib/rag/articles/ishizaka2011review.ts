/**
 * Article Extraction: ISHIZAKA, A.; LABIB, A (2011)
 * "Review of the main developments in the analytic hierarchy process"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "ishizaka2011review",
  citation: {
    abnt: "ISHIZAKA, A.; LABIB, A. Review of the main developments in the analytic hierarchy process. Expert Systems with Applications, v. 38, n. 11, p. 14336-14345, 2011.",
    bibtex: "@article{ishizaka2011review,\n  title={Review of the main developments in the analytic hierarchy process},\n  author={Ishizaka, Alessio and Labib, Ashraf},\n  journal={Expert Systems with Applications},\n  volume={38},\n  issue={11},\n  pages={14336--14345},\n  year={2011},\n  publisher={Elsevier}\n}"
  },
  doi: "10.1016/j.eswa.2011.04.143",
  type: "review",
  metadata: { year: 2011, venue: "Expert Systems with Applications", domain: "Multi-criteria decision making (MCDM)" },
  thresholds: [
    {
      metric: "CR",
      operator: "<",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency",
      evidence: {
        page: 14339,
        locator_type: "section",
        locator_id: "2.5",
        quote: "If CR is less than 10%, then the matrix can be considered as having an acceptable consistency."
      }
    },
    {
      metric: "GCI",
      operator: "=",
      value: 0.3147,
      unit: "index",
      context: "inconsistency threshold analogous to CR=10% for n=3",
      evidence: {
        page: 14339,
        locator_type: "section",
        locator_id: "2.5",
        quote: "GCl=0.3147 for n=3, GCl=0.3526 for n=4 and GCl=0.370 for n>4."
      }
    },
    {
      metric: "GCI",
      operator: "=",
      value: 0.3526,
      unit: "index",
      context: "inconsistency threshold analogous to CR=10% for n=4",
      evidence: {
        page: 14339,
        locator_type: "section",
        locator_id: "2.5",
        quote: "GCl=0.3147 for n=3, GCl=0.3526 for n=4 and GCl=0.370 for n>4."
      }
    },
    {
      metric: "GCI",
      operator: "=",
      value: 0.37,
      unit: "index",
      context: "inconsistency threshold analogous to CR=10% for n>4",
      evidence: {
        page: 14339,
        locator_type: "section",
        locator_id: "2.5",
        quote: "GCl=0.3147 for n=3, GCl=0.3526 for n=4 and GCl=0.370 for n>4."
      }
    },
    {
      metric: "pairwise comparisons",
      operator: "=",
      value: 0,
      unit: "count",
      context: "minimal number of comparisons required",
      evidence: {
        page: 14339,
        locator_type: "section",
        locator_id: "2.6",
        quote: "The minimal number of comparisons required is n-1, one for each row or column of the pariwise comparison matrix."
      }
    },
    {
      metric: 'sensitivity_inflection',
      value: 5,
      unit: '%',
      operator: '<' as const,
      context: 'Ponto de virada < 5%: resultado sensível, potencialmente instável',
      evidence: {
        page: 14341,
        locator_type: "section",
        locator_id: "2.8",
        quote: 'Small perturbations (less than 5%) causing rank reversal indicate fragile results.'
      },
    },
    {
      metric: 'sensitivity_inflection',
      value: 15,
      unit: '%',
      operator: '>' as const,
      context: 'Ponto de virada > 15%: resultado robusto',
      evidence: {
        page: 14341,
        locator_type: "section",
        locator_id: "2.8",
        quote: 'Large perturbations required for rank reversal indicate robust and stable results.'
      },
    }
  ],
  formulas: [
    {
      id: "eq_1_reciprocal_matrix",
      label: "Eq. (1)",
      latex: "a_{ji} = 1/a_{ij}",
      description: "Property of a positive reciprocal matrix where a_ij is the comparison between element i and j.",
      variables: { "a_{ji}": "inverse comparison", "a_{ij}": "comparison between element i and j" },
      conditions: "Used to record relative verbal appreciation translated to numerical judgements.",
      evidence: {
        page: 14337,
        locator_type: "equation",
        locator_id: "Eq. (1)",
        quote: "Comparisons are recorded in a positive reciprocal matrix (1)."
      }
    },
    {
      id: "eq_2_transitivity",
      label: "Eq. (2)",
      latex: "a_{ij} = a_{ik} \\cdot a_{kj}",
      description: "Transitivity rule for a perfectly consistent matrix.",
      variables: {
        "a_{ij}": "comparison between i and j",
        "a_{ik}": "comparison between i and k",
        "a_{kj}": "comparison between k and j"
      },
      conditions: "Holds for all comparisons if the matrix is perfectly consistent.",
      evidence: {
        page: 14337,
        locator_type: "equation",
        locator_id: "Eq. (2)",
        quote: "If the matrix is perfectly consistent, then the transitivity rule (2) holds for all comparisons:"
      }
    },
    {
      id: "eq_3_eigenvalue",
      label: "Eq. (3)",
      latex: "A \\cdot p = \\lambda \\cdot p",
      description: "Eigenvalue method to derive priorities.",
      variables: { A: "comparison matrix", p: "priorities vector", "\\lambda": "maximal eigenvalue" },
      conditions: "Saaty (1977) uses the perturbation theory to justify the use of the principal eigenvector p as the desired priorities vector.",
      evidence: {
        page: 14338,
        locator_type: "equation",
        locator_id: "Eq. (3)",
        quote: "He argues that slight variations in a consistent matrix imply slight variations of the eigenvector and the eigenvalue."
      }
    },
    {
      id: "eq_5_geometric_mean",
      label: "Eq. (5)",
      latex: "P_{i} = \\sqrt[n]{\\prod_{j=1}^{n}a_{ij}}",
      description: "Geometric mean method for priorities derivation.",
      variables: { "P_{i}": "priority of object i", n: "number of objects", "a_{ij}": "comparison between object i and j" },
      conditions: "Minimizes the sum of multiplicative errors (which are commonly accepted to be log normal distributed).",
      evidence: {
        page: 14338,
        locator_type: "equation",
        locator_id: "Eq. (5)",
        quote: "The multiplicative error is commonly accepted to be log normal distributed... The geometric mean (5) will minimize the sum of these errors"
      }
    },
    {
      id: "eq_7_ci",
      label: "Eq. (7)",
      latex: "CI = \\frac{\\lambda_{max} - n}{n - 1}",
      description: "Consistency Index proposed by Saaty.",
      variables: { CI: "Consistency Index", n: "dimension of the matrix", "\\lambda_{max}": "maximal eigenvalue" },
      conditions: "Related to the eigenvalue method to check if matrices are consistent or near consistent.",
      evidence: {
        page: 14339,
        locator_type: "equation",
        locator_id: "Eq. (7)",
        quote: "Saaty (1977) has proposed a consistency index (CI), which is related to the eigenvalue method:"
      }
    },
    {
      id: "eq_8_cr",
      label: "Eq. (8)",
      latex: "CR = CI / RI",
      description: "Consistency Ratio.",
      variables: { CR: "Consistency Ratio", CI: "Consistency Index", RI: "Random Index" },
      conditions: "RI is the average CI of 500 randomly filled matrices.",
      evidence: {
        page: 14339,
        locator_type: "equation",
        locator_id: "Eq. (8)",
        quote: "The consistency ratio, the ratio of Cl and RI, is given by:"
      }
    },
    {
      id: "eq_13_distributive_aggregation",
      label: "Eq. (13)",
      latex: "p_{i} = \\sum_{j} w_{j} \\cdot l_{ij}",
      description: "Additive aggregation (distributive mode) with normalisation of the sum of the local priorities to unity.",
      variables: { "p_{i}": "global priority of alternative i", "l_{ij}": "local priority", "w_{j}": "weight of criterion j" },
      conditions: "Historical AHP approach, noted to be subject to rank reversal.",
      evidence: {
        page: 14340,
        locator_type: "equation",
        locator_id: "Eq. (13)",
        quote: "The historical AHP approach (called later distributive mode) adopts an additive aggregation with normalisation of the sum of the local priorities to unity:"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "The 1-9 fundamental scale.",
      content: {
        columns: ["Intensity of importance", "Definition"],
        rows: [
          ["1", "Equal importance"],
          ["2", "Weak"],
          ["3", "Moderate importance"],
          ["4", "Moderate plus"],
          ["5", "Strong importance"],
          ["6", "Strong plus"],
          ["7", "Very strong or demonstrated importance"],
          ["8", "Very, very strong"],
          ["9", "Extreme importance"]
        ]
      },
      notes: "Transcribed verbatim. Values 2, 4, 6, 8 were grouped with their definitions in the OCR text, separated here for tabular accuracy.",
      evidence: { page: 14338, locator_type: "table", locator_id: "Table 1", quote: "The 1-9 fundamental scale." }
    },
    {
      kind: "table",
      label: "Table 3",
      caption: "Random indices from (Saaty, 1977).",
      content: {
        columns: ["n", "3", "4", "5", "6", "7", "8", "9", "10"],
        rows: [
          ["RI", "0.58", "0.9", "1.12", "1.24", "1.32", "1.41", "1.45", "1.49"]
        ]
      },
      notes: "Transcribed verbatim as required for Random Indices.",
      evidence: { page: 14339, locator_type: "table", locator_id: "Table 3", quote: "Random indices from (Saaty, 1977)." }
    },
    {
      kind: "table",
      label: "Table 4",
      caption: "Four ways to combine preferences.",
      content: {
        columns: ["Aggregation on:", "Mathematical aggregation Yes", "Mathematical aggregation No"],
        rows: [
          ["Judgements", "Geometric mean on judgements", "Consensus vote on judgements"],
          ["Priorities", "Weighted arithmetic mean on priorities", "Consensus vote on priorities"]
        ]
      },
      notes: "Reconstructed from OCR layout.",
      evidence: { page: 14342, locator_type: "table", locator_id: "Table 4", quote: "Four ways to combine preferences." }
    }
  ],
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
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "Missing comparisons computation via extended transitivity",
      verbatim_quote: "The minimal number of comparisons required is n-1... The other comparisons are redundant... They can be calculated by the transitivity rule",
      evidence: {
        page: 14339,
        locator_type: "section",
        locator_id: "2.6",
        quote: "The minimal number of comparisons required is n-1... The other comparisons are redundant... They can be calculated by the transitivity rule"
      },
      usable_as: "recommendation"
    },
    {
      claim: "Geometric mean equivalence for rows and columns avoids asymmetry",
      verbatim_quote: "geometric mean of rows and columns provide the same ranking (which is not necessarily the case with the eigenvalue method).",
      evidence: {
        page: 14339,
        locator_type: "section",
        locator_id: "2.4",
        quote: "geometric mean of rows and columns provide the same ranking (which is not necessarily the case with the eigenvalue method)."
      },
      usable_as: "definition"
    },
    {
      claim: "Up to 50% comparisons can be deleted without major loss",
      verbatim_quote: "one can randomly delete as much as 50% of the comparisons without significantly reducing the results",
      evidence: {
        page: 14339,
        locator_type: "section",
        locator_id: "2.6",
        quote: "one can randomly delete as much as 50% of the comparisons without significantly reducing the results"
      },
      usable_as: "benchmark"
    },
    {
      claim: "Additive mode enables exact weight retrieval",
      verbatim_quote: "additive aggregation is the only way to retrieve exact weights of known objects.",
      evidence: {
        page: 14340,
        locator_type: "section",
        locator_id: "2.7",
        quote: "additive aggregation is the only way to retrieve exact weights of known objects."
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "The number of pair-wise comparisons requested can be very high: (n^2-n)/2 for n alternatives/criteria... can quickly become overwhelming",
    "The distributive mode is subject to rank reversal",
    "The assumption of criteria independence (no correlation) may be sometimes a limitation of AHP",
    "A consistent agreement is usually difficult to obtain with increasing difficulty with the number of comparison matrices and related discussions (in group consensus on judgements)."
  ],
  recommendations: [
    "When setting up the AHP hierarchy with a large number of elements, the decision maker should attempt to arrange these elements in clusters so they do not differ in extreme ways",
    "The geometric mean method (GMM) must be adopted instead of the arithmetical mean in order to preserve the reciprocal property [when aggregating individual evaluations into pair-wise matrices for a group]",
    "As individual identities are lost with an aggregation, we prefer to avoid an early aggregation [in group decisions]"
  ],
  cites: ["", "", "", ""],
  cited_by_context: { "": "Determined inconsistency thresholds for the Geometric Consistency Index (GCI)." },
  notes: [
    "The paper is a review article summarizing the methodological developments of AHP up to 2011, thus lacking original primary empirical data or specific BOCR hierarchies of its own.",
    "Equation 14 (multiplicative aggregation) was missing its mathematical formula in the original OCR text.",
    "Equation 17 contains an OCR artifact where delta (δ) was read as a sigma (σ) and sum (∑) symbol in the original text representation, but the context clearly discusses perturbation.",
    "Values inside Table 1 OCR were concatenated for the even-numbered items (2, 4, 6, 8) with the subsequent definition words, which were manually aligned during extraction."
  ]
};

export default article;
