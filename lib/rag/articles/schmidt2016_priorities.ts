/**
 * Article Extraction: SCHMIDT, K (2016)
 * "et al"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "schmidt2016_priorities",
  citation: {
    abnt: "SCHMIDT, K. et al. Measuring patients' priorities using the Analytic Hierarchy Process in comparison with Best-Worst-Scaling and rating cards: methodological aspects and ranking tasks. Health Economics Review, v. 6, n. 50, 2016.",
    bibtex: "@article{schmidt2016priorities,\n  author = {Schmidt, Katharina and Babac, Ana and Pauer, Frédéric and Damm, Kathrin and von der Schulenburg, J-Matthias},\n  title = {Measuring patients' priorities using the Analytic Hierarchy Process in comparison with Best-Worst-Scaling and rating cards: methodological aspects and ranking tasks},\n  journal = {Health Economics Review},\n  year = {2016},\n  volume = {6},\n  number = {50},\n  doi = {10.1186/s13561-016-0130-6},\n  publisher = {Springer Open}\n}"
  },
  doi: "10.1186/s13561-016-0130-6",
  type: "methodological",
  metadata: { year: 2016, venue: "Health Economics Review", domain: "Healthcare / Rare Diseases" },
  thresholds: [
    {
      metric: "CR",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "Standard consistency threshold suggested by Saaty",
      evidence: {
        page: 3,
        locator_type: "section",
        locator_id: "AHP method and application",
        quote: "Following Saaty, the CR has to be ≤ 0.1."
      }
    },
    {
      metric: "CR",
      operator: "≤",
      value: 0.2,
      unit: "ratio",
      context: "Extended consistency threshold suggested by other authors",
      evidence: {
        page: 3,
        locator_type: "section",
        locator_id: "AHP method and application",
        quote: "Other authors suggested a CR ≤ 0.2, but the threshold value is not defined consistently."
      }
    }
  ],
  formulas: [
    {
      id: "geometric_mean_aggregation",
      label: "Geometric Mean Aggregation",
      latex: "\\bar{x}_{geom} = \\left( \\prod_{i=1}^n x_i \\right)^{1/n}",
      description: "Aggregating individual judgments or priorities to satisfy the reciprocal property and social choice axioms.",
      variables: { x_i: "individual judgment or priority", n: "number of respondents" },
      conditions: "Mandatory for AIJ to satisfy Pareto optimality and homogeneity axioms.",
      evidence: {
        page: 9,
        locator_type: "section",
        locator_id: "Discussion",
        quote: "Forman et al. (1998) argued that for AIJ the geometric mean must be used because otherwise two social choice theory axioms (Pareto optimality and homogeneity) are not satisfied."
      }
    }
  ],
  tables_figures: [
    {
      kind: "figure",
      label: "Fig. 1",
      caption: "Hierarchy of rare diseases information categories",
      content: {
        columns: [],
        rows: []
      },
      notes: "Hierarchy used for prioritizing information categories for a patient portal.",
      evidence: { page: 4, locator_type: "figure", locator_id: "Fig. 1", quote: "Figure 1 shows the final hierarchy for the AHP." }
    },
    {
      kind: "table",
      label: "Table 1",
      caption: "Comparison of aggregation methods and weights",
      content: {
        columns: [
          "Criterion",
          "Geometric AIJ Rank",
          "Geometric AIP Rank",
          "Median AIJ Rank",
          "Median AIP Rank",
          "Mean AIJ Rank",
          "Mean AIP Rank"
        ],
        rows: [
          ["Med. issues", 1, 1, 1, 1, 1, 1],
          ["Research", 3, 3, 5, 5, 3, 3],
          ["Current events", 6, 6, 9, 6, 6, 5],
          ["Social support", 2, 2, 4, 3, 7, 2],
          ["Diagnosis", 5, 4, 2, 2, 2, 4],
          ["Treatment", 5, 4, 3, 4, 4, 6],
          ["Disease patterns", 8, 7, 6, 8, 9, 11],
          ["Current studies", 10, 11, 7, 11, 5, 10],
          ["Study results", 9, 9, 8, 9, 8, 8],
          ["Registry", 13, 13, 13, 12, 11, 13],
          ["Law counseling", 12, 10, 10, 13, 10, 12],
          ["Psychosocial counseling", 12, 11, 11, 10, 12, 9],
          ["Self-help", 8, 7, 12, 7, 13, 7]
        ]
      },
      notes: "Shows rank sensitivity to different aggregation methods (AIJ vs AIP) and statistical measures (Mean, Median, Geometric Mean).",
      evidence: {
        page: 7,
        locator_type: "table",
        locator_id: "Table 1",
        quote: "Table 1 answers this question... whether the ranking position changed through the different aggregation methods."
      }
    },
    {
      kind: "table",
      label: "Table 3",
      caption: "Correlation between AHP ranking and BWS ranking for each level",
      content: {
        columns: ["Level", "Kendall's tau", "p-value"],
        rows: [
          ["Level two", 0.585, "<0.001"],
          ["Level three a", 0.543, "<0.001"],
          ["Level three b", 0.613, "<0.001"],
          ["Level three c", 0.668, "<0.001"]
        ]
      },
      notes: "Indicates convergence validity between AHP and BWS Case 1.",
      evidence: {
        page: 9,
        locator_type: "table",
        locator_id: "Table 3",
        quote: "We found significant moderate to strong correlation between the two methods in the rankings."
      }
    }
  ],
  empirical_data: {
    n_respondents: 39,
    aggregation: "AIJ",
    n_alternatives: null,
    n_criteria: { total: 13, B: null, O: null, C: null, R: null },
    bocr_weights: null,
    scores_by_method: null,
    rankings_by_method: null,
    concordance: {
      rate: null,
      n_methods: null,
      description: "Significant moderate to strong correlation (Kendall's tau 0.543 to 0.668)"
    },
    sensitivity: null,
    cr_values: { individual_mean: null, individual_range: null, aggregated: null, validity_rate: null },
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "Weight difference between CR 0.1 and 0.2 is negligible.",
      verbatim_quote: "The mean weights of the two groups of CR ≤ 0.1 and CR ≤ 0.2 did not differ significantly.",
      evidence: {
        page: 1,
        locator_type: "section",
        locator_id: "Abstract",
        quote: "The mean weights of the two groups of CR ≤ 0.1 and CR ≤ 0.2 did not differ significantly."
      },
      usable_as: "benchmark"
    },
    {
      claim: "AIJ produces lower CR than AIP.",
      verbatim_quote: "The CR in the scenario of aggregation by geometric mean was markedly lower for AIJ than for AIP.",
      evidence: {
        page: 7,
        locator_type: "section",
        locator_id: "Comparison of aggregation methods",
        quote: "The CR in the scenario of aggregation by geometric mean was markedly lower for AIJ than for AIP."
      },
      usable_as: "recommendation"
    },
    {
      claim: "AHP and BWS results are comparable at group level.",
      verbatim_quote: "The comparison between the different methods (AHP, BWS, ranking tasks) resulted in similar outcomes.",
      evidence: {
        page: 10,
        locator_type: "section",
        locator_id: "Conclusion",
        quote: "The comparison between the different methods (AHP, BWS, ranking tasks) resulted in similar outcomes."
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "Small sample size (n=39).",
    "Heterogeneity of patients with different rare diseases.",
    "Inequitable distribution of gender (31 women, 8 men).",
    "High cognitive burden of AHP for some participants compared to BWS."
  ],
  recommendations: [
    "Implement standards for AHP method aggregation and CR thresholds.",
    "Use geometric mean for AIJ to satisfy social choice theory axioms.",
    "Use ranking cards as a warm-up task to support consistency during AHP.",
    "Calculate sensitivity using Confidence Intervals for criteria stability."
  ],
  cites: ["saaty", "", "al"],
  cited_by_context: {
    Forman_1998: "Cited regarding the geometric mean satisfying Pareto optimality and homogeneity in AIJ.",
    saaty: "AHP origin and 0.1 CR threshold",
    "": "Aggregation methods (AIJ vs AIP) and axioms",
    al: "Comparison between AHP and BWS"
  },
  notes: [
    "O estudo destaca que a escolha entre AIJ e AIP depende se o grupo é visto como uma unidade única ou indivíduos independentes.",
    "Rank reversal is discussed both as a sensitivity issue (close weights) and as the traditional AHP phenomenon (adding/deleting alternatives).",
    "[Sanitized] sensitivity (original): Bootstrap 95% CI used; medical issues rank 1 was robust (CI: 0.34-0.49).",
    "[Sanitized] concordance (original): Significant moderate to strong correlation (Kendall's tau 0.543 to 0.668)",
    "[Sanitized] aggregation (original): AIJ and AIP compared"
  ]
};

export default article;
