/**
 * Article Extraction: AULL-HYDE, R.; ERDOGAN, S.; DUKE, J (2006)
 * "M"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "aullhyde2006_experiment",
  citation: {
    abnt: "AULL-HYDE, R.; ERDOGAN, S.; DUKE, J. M. An experiment on the consistency of aggregated comparison matrices in AHP. European Journal of Operational Research, v. 171, n. 1, p. 290-295, 2006.",
    bibtex: "@article{aullhyde2006experiment,\n  author = {Aull-Hyde, Rhonda and Erdogan, Sevgi and Duke, Joshua M.},\n  title = {An experiment on the consistency of aggregated comparison matrices in AHP},\n  journal = {European Journal of Operational Research},\n  year = {2006},\n  volume = {171},\n  issue = {1},\n  pages = {290--295},\n  publisher = {Elsevier B.V.},\n  doi = {10.1016/j.ejor.2004.06.037}\n}"
  },
  doi: "10.1016/j.ejor.2004.06.037",
  type: "methodological",
  metadata: {
    year: 2006,
    venue: "European Journal of Operational Research",
    domain: "Group Decision Making / Aggregation Consistency"
  },
  thresholds: [
    {
      metric: "Group Size Threshold (n=3)",
      operator: "≥",
      value: 90,
      unit: "count",
      context: "minimum group size to guarantee 100% acceptable inconsistency in 3x3 matrices using GMM",
      evidence: {
        page: 293,
        locator_type: "section",
        locator_id: "4",
        quote: "Achieving a 100% acceptable inconsistency level in aggregated matrices required a relatively large group size of 90 for 3x3 comparison matrices."
      }
    },
    {
      metric: "Group Size Threshold (n=4)",
      operator: "≥",
      value: 40,
      unit: "count",
      context: "minimum group size to guarantee 100% acceptable inconsistency in 4x4 matrices using GMM",
      evidence: {
        page: 293,
        locator_type: "section",
        locator_id: "4",
        quote: "In Fig. 2, we see that for a 4x4 comparison matrix, the group size threshold is 40."
      }
    },
    {
      metric: "Group Size Threshold (n=5)",
      operator: "≥",
      value: 25,
      unit: "count",
      context: "minimum group size to guarantee 100% acceptable inconsistency in 5x5 matrices using GMM",
      evidence: {
        page: 293,
        locator_type: "section",
        locator_id: "4",
        quote: "For a 5x5 comparison matrix, the corresponding group size threshold is 25 (Fig. 3)"
      }
    },
    {
      metric: "Group Size Threshold (n=6)",
      operator: "≥",
      value: 20,
      unit: "count",
      context: "minimum group size to guarantee 100% acceptable inconsistency in 6x6 matrices using GMM",
      evidence: {
        page: 293,
        locator_type: "section",
        locator_id: "4",
        quote: "for a 6x6 matrix, the corresponding group size threshold is 20 (Fig. 4)."
      }
    }
  ],
  formulas: [
    {
      id: "gmm_aggregation",
      label: "Geometric Mean",
      latex: "[X_{1}X_{2}X_{3},...,X_{n}]^{1/n}",
      description: "Formula for the geometric mean used to aggregate individual judgments or priorities.",
      variables: { X_i: "individual values/judgments", n: "group size" },
      conditions: "Useful when the measurement scale is not linear and to dampen the effect of extreme values.",
      evidence: {
        page: 292,
        locator_type: "section",
        locator_id: "3",
        quote: "Given values X1, X2, X3, . . . , Xn, the geometric mean of these n values is given by [X1X2X3, . . . ,Xn]^1/n"
      }
    },
    {
      id: "consistency_convergence",
      label: "Limit Claim",
      latex: "\\lim_{n\\rightarrow\\infty}[\\prod_{k=1}^{n}a_{ijk}]^{1/n}=1",
      description: "As group size approaches infinity, elements of the GMM aggregated matrix converge to 1, ensuring zero inconsistency.",
      variables: { "a_{ijk}": "pairwise comparison rating between i and j for member k", n: "group size" },
      conditions: "Assumes positive ratings (0 < a_ijk ≤ 9).",
      evidence: {
        page: 295,
        locator_type: "section",
        locator_id: "A",
        quote: "as group size n approaches infinity, each element of the aggregated comparison matrix converges to 1, thereby producing a consistency measure of zero."
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 2",
      caption: "Group size thresholds and individual consistency percentages",
      content: {
        columns: ["n", "Group size threshold", "Individual consistency rate (%)"],
        rows: [
          ["3", "90", "21.60"],
          ["4", "40", "2.97"],
          ["5", "25", "<0.001"],
          ["6", "20", "<0.001"]
        ]
      },
      notes: "Based on 10,000 randomly generated matrices. Shows that larger matrices require fewer respondents to reach aggregate consistency.",
      evidence: {
        page: 293,
        locator_type: "table",
        locator_id: "2",
        quote: "Group size thresholds and individual consistency percentages"
      }
    }
  ],
  empirical_data: {
    n_respondents: 1000,
    aggregation: "AIJ",
    n_alternatives: 6,
    n_criteria: { total: null, B: null, O: null, C: null, R: null },
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
      claim: "GMM aggregation guarantees aggregate consistency with a sufficiently large group regardless of individual consistency.",
      verbatim_quote: "given a sufficiently large group size, consistency of the aggregate comparison matrix is guaranteed, regardless of the consistency measures of the individual comparison matrices",
      evidence: {
        page: 290,
        locator_type: "section",
        locator_id: "Abstract",
        quote: "given a sufficiently large group size, consistency of the aggregate comparison matrix is guaranteed, regardless of the consistency measures of the individual comparison matrices"
      },
      usable_as: "threshold"
    },
    {
      claim: "Higher matrix dimensions reach aggregate consistency with fewer group members.",
      verbatim_quote: "as the number of comparisons increase, the number of group members needed to generate a 100% acceptable inconsistency measure decreases.",
      evidence: {
        page: 294,
        locator_type: "section",
        locator_id: "6",
        quote: "as the number of comparisons increase, the number of group members needed to generate a 100% acceptable inconsistency measure decreases."
      },
      usable_as: "benchmark"
    }
  ],
  limitations: [
    "Simulation assigned individual preferences randomly, implying alternative comparisons are mutually independent.",
    "Consistency loss in group preference orderings when an alternative is removed may be due to fewer comparisons rather than IIA violation."
  ],
  recommendations: [
    "Use GMM for aggregation in groups to satisfy the reciprocity requirement.",
    "For small groups (below thresholds), individual consistency should still be monitored as aggregate consistency is not guaranteed."
  ],
  cites: ["Saaty (1980)", "Xu (2000)", "Aczel and Saaty (1983)", "Forman and Peniwati (1998)"],
  cited_by_context: {
    "Xu (2000)": "Proved aggregate consistency if all individuals are consistent; current paper expands to inconsistent individuals.",
    "Forman and Peniwati (1998)": "Distinguishes between AIJ (group as individual) and AIP (group as separate individuals)."
  },
  notes: [
    "The 3x3 matrices are described as the 'most unstable' regarding aggregate consistency convergence.",
    "Reference to Duke and Aull-Hyde (2002) provided the empirical motivation: 129 respondents showed consistent aggregate results despite individual inconsistency.",
    "[Sanitized] sensitivity (original): Sensitivity to the number of alternatives; fewer alternatives require larger groups for consistency.",
    "[Sanitized] aggregation (original): AIJ (Aggregation of Individual Judgments) using GMM"
  ]
};

export default article;
