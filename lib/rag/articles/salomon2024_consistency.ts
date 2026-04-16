/**
 * Article Extraction: SALOMON, V (2024)
 * "A"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "salomon2024_consistency",
  citation: {
    abnt: "SALOMON, V. A. P.; GOMES, L. F. A. M. Consistency Improvement in the Analytic Hierarchy Process. Mathematics, v. 12, n. 6, p. 828, 2024.",
    bibtex: "@article{salomon2024consistency,\n  title={Consistency Improvement in the Analytic Hierarchy Process},\n  author={Salomon, Valerio Antonio Pamplona and Gomes, Luiz Flavio Autran Monteiro},\n  journal={Mathematics},\n  volume={12},\n  number={6},\n  pages={828},\n  year={2024},\n  publisher={MDPI}\n}"
  },
  doi: "10.3390/math12060828",
  type: "methodological",
  metadata: { year: 2024, venue: "Mathematics", domain: "Multiple Criteria Decision-Making (MCDM)" },
  thresholds: [
    {
      metric: "CR",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency threshold for general AHP matrices",
      evidence: {
        page: 5,
        locator_type: "section",
        locator_id: "2.1",
        quote: "Considering the 0.1 threshold, B is not 100% consistent, but it is an acceptable matrix"
      }
    },
    {
      metric: "CR",
      operator: "≤",
      value: 0.5,
      unit: "ratio",
      context: "suggested threshold for matrices of order three",
      evidence: {
        page: 5,
        locator_type: "section",
        locator_id: "2.1",
        quote: "for matrices of orders three and four, the thresholds could be 0.5 and 0.8, respectively"
      }
    },
    {
      metric: "CR",
      operator: "≤",
      value: 0.8,
      unit: "ratio",
      context: "suggested threshold for matrices of order four",
      evidence: {
        page: 5,
        locator_type: "section",
        locator_id: "2.1",
        quote: "for matrices of orders three and four, the thresholds could be 0.5 and 0.8, respectively"
      }
    },
    {
      metric: "CR",
      operator: "≤",
      value: 0.2,
      unit: "ratio",
      context: "tolerated threshold for larger matrices",
      evidence: {
        page: 5,
        locator_type: "section",
        locator_id: "2.1",
        quote: "For larger matrices, even a CR = 0.2 could be tolerated, but no more"
      }
    }
  ],
  formulas: [
    {
      id: "eigenvector_method",
      label: "Eq. (1)",
      latex: "A w = \\lambda_{max} w",
      description: "Fundamental AHP equation to generate the priority vector (weights) from the pairwise comparison matrix.",
      variables: { A: "Pairwise comparison matrix", w: "Right eigenvector", "\\lambda_{max}": "Maximum eigenvalue" },
      conditions: "Used to derive weights from reciprocal pairwise comparisons.",
      evidence: {
        page: 2,
        locator_type: "equation",
        locator_id: "1",
        quote: "Equation (1) presents one way to generate w from A: Aw = lambda_max w"
      }
    },
    {
      id: "consistency_index",
      label: "Eq. (4)",
      latex: "CI = \\frac{\\lambda_{max} - n}{n - 1}",
      description: "Formula for calculating the Consistency Index (CI).",
      variables: { CI: "Consistency Index", "\\lambda_{max}": "Maximum eigenvalue", n: "Matrix order" },
      conditions: "If matrix is 100% consistent, CI = 0.",
      evidence: {
        page: 4,
        locator_type: "equation",
        locator_id: "4",
        quote: "Saaty (1977) introduced the consistency measurement, proposing the consistency index CI as in Equation (4)"
      }
    },
    {
      id: "expected_consistency_value",
      label: "Eq. (7)",
      latex: "\\gamma_{ij} = \\frac{\\sum_{k=1}^{n} a_{ik} a_{jk}}{n - 2}",
      description: "Formula to compute the expected value for consistency in an inconsistent matrix.",
      variables: {
        "\\gamma_{ij}": "Expected value for consistency",
        "a_{ik}": "Matrix element row i column k",
        "a_{jk}": "Matrix element row j column k",
        n: "Matrix order"
      },
      conditions: "Applicable for n > 2 and j > i to identify divergent comparisons.",
      evidence: {
        page: 7,
        locator_type: "equation",
        locator_id: "7",
        quote: "initially computing the expected value gamma_ij as in Equation (7)"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "Saaty Scale",
      content: {
        columns: ["Intensity of Importance", "Definition", "Explanation"],
        rows: [
          ["1", "Equal importance", "Two objects have the same importance"],
          ["3", "Moderate importance", "Experience and judgment slightly favor one object over another"],
          ["5", "Strong importance", "Experience and judgment strongly favor one object over another"],
          [
            "7",
            "Demonstrated importance",
            "One object is very strongly favored and this dominance is demonstrated in practice"
          ],
          [
            "9",
            "Absolute importance",
            "Evidence favoring one object over another is of the highest possible order"
          ],
          ["2, 4, 6, 8", "Intermediate values", "When compromise is needed"],
          [
            "Reciprocals",
            "Reciprocal value",
            "If object i has one of the above numbers when compared to j, then j has the reciprocal value"
          ]
        ]
      },
      notes: "Transcribed from multiple sources cited in article.",
      evidence: { page: 3, locator_type: "table", locator_id: "1", quote: "Table 1. Saaty Scale" }
    },
    {
      kind: "table",
      label: "Table 3",
      caption: "Random consistency indexes",
      content: {
        columns: ["n", "Original", "ORNL-PITT (1982)", "EC-GWU (1990)", "UU (1991)", "Usual"],
        rows: [
          ["3", "0.416", "0.58", "0.52333", "0.4887", "0.52"],
          ["4", "0.851", "0.90", "0.88604", "0.8045", "0.89"],
          ["5", "1.115", "1.12", "1.10983", "1.0591", "1.11"],
          ["6", "1.150", "1.24", "1.25390", "1.1797", "1.25"],
          ["7", "1.345", "1.32", "1.34516", "1.2519", "1.35"],
          ["8", "1.334", "1.41", "null", "1.3171", "1.40"],
          ["9", "1.315", "1.45", "null", "1.3733", "1.45"],
          ["10", "1.420", "1.49", "null", "1.4055", "1.49"],
          ["11", "1.395", "1.51", "null", "1.4213", "1.51"],
          ["12", "1.482", "1.48", "null", "1.4497", "1.54"],
          ["13", "1.491", "1.56", "null", "1.4643", "1.56"],
          ["14", "1.470", "1.57", "null", "1.4822", "1.57"],
          ["15", "1.466", "1.59", "null", "1.4969", "1.58"]
        ]
      },
      notes: "The 'Usual' column is the most commonly used in practice according to the authors.",
      evidence: { page: 4, locator_type: "table", locator_id: "3", quote: "Table 3. Random consistency indexes." }
    }
  ],
  empirical_data: {
    n_respondents: 1,
    aggregation: null,
    n_alternatives: 4,
    n_criteria: { total: 3, B: null, O: null, C: null, R: null },
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
      claim: "Consistency is the primary measure of input data quality in AHP.",
      verbatim_quote: "Consistency is a measure of the quality of data input in the AHP.",
      evidence: {
        page: 1,
        locator_type: "abstract",
        locator_id: null,
        quote: "Consistency is a measure of the quality of data input in the AHP."
      },
      usable_as: "definition"
    },
    {
      claim: "The 0.1 CR threshold is standard for evaluating reliability.",
      verbatim_quote: "the 0.1 threshold have been accepted for the consistency measurements and analyses of pairwise comparison matrices.",
      evidence: {
        page: 7,
        locator_type: "section",
        locator_id: "2.2",
        quote: "the 0.1 threshold have been accepted for the consistency measurements"
      },
      usable_as: "threshold"
    },
    {
      claim: "Moderate inconsistency is necessary for admitting new knowledge.",
      verbatim_quote: "inconsistency itself is important, since 'without it new knowledge that changes preferences cannot be admitted'",
      evidence: {
        page: 5,
        locator_type: "section",
        locator_id: "2.1",
        quote: "inconsistency itself is important, since \"without it new knowledge that changes preferences cannot be admitted\""
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "Proposed technique for consistency improvement requires validation/approval by the decision-maker.",
    "If the decision maker does not agree with changes, they must review comparisons manually."
  ],
  recommendations: [
    "Change only the comparisons that bring significant deviation to improve CR with minimal intervention.",
    "Use a deviation matrix to identify the most inconsistent components for revision."
  ],
  cites: ["saaty1977", "saaty2013"],
  cited_by_context: {
    BOCR: "Referenced in context of AHP state-of-the-art reviews (Petrillo et al. 2023).",
    saaty1977: "Most cited document on MCDM, introduced scaling and consistency index.",
    saaty2013: "Cited regarding AHP with benefits, opportunities, costs, and risks (BOCR)."
  },
  notes: [
    "The article explicitly mentions BOCR in the reference list (Petrillo et al. 2023) but does not provide BOCR specific weights or equations.",
    "The formula for expected value (Eq. 7) uses a summation over n-2, which is a specific procedural characteristic of their improvement method.",
    "[Sanitized] rankings_by_method (original): Supplier 2 > Supplier 4 > Supplier 3 > Supplier 1"
  ]
};

export default article;
