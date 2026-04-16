/**
 * Article Extraction: LIANG, Jie; YANG, Jianhui (2022)
 * "Application of the AHP method on the optimization with undesirable priorities"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "liang2022_ahp_undesirable",
  citation: {
    abnt: "LIANG, Jie; YANG, Jianhui. Application of the AHP method on the optimization with undesirable priorities. Engineering with Computers, v. 38, n. Suppl 3, p. S2137-S2153, 2022.",
    bibtex: "@article{liang2022application,\n  title={Application of the AHP method on the optimization with undesirable priorities},\n  author={Liang, Jie and Yang, Jianhui},\n  journal={Engineering with Computers},\n  volume={38},\n  number={3},\n  pages={S2137--S2153},\n  year={2022},\n  publisher={Springer}\n}"
  },
  doi: "10.1007/s00366-021-01359-x",
  type: "methodological",
  metadata: { year: 2022, venue: "Engineering with Computers", domain: "General Optimization" },
  thresholds: [
    {
      metric: "CR",
      operator: "<",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency threshold",
      evidence: {
        page: null,
        locator_type: "section",
        locator_id: "2.1",
        quote: "If the degree of CR consistency is less than 0.10, the result is sufficiently accurate and there is no need for corrections"
      }
    }
  ],
  formulas: [
    {
      id: "cr_formula",
      label: "Eq. (7)",
      latex: "CR=\\frac{CI}{RI}",
      description: "Consistency Ratio calculation",
      variables: { CR: "Consistency Ratio", CI: "Consistency Index", RI: "Random Index" },
      conditions: "Used to check the consistency of data obtained by the AHP method.",
      evidence: {
        page: null,
        locator_type: "equation",
        locator_id: "Eq. (7)",
        quote: "The consistency of the data obtained by this method is checked based on the degree of consistency CR calculated by formula (7):"
      }
    },
    {
      id: "ci_formula",
      label: "Eq. (8)",
      latex: "CI=\\frac{\\lambda_{max}-n}{n-1}",
      description: "Consistency Index calculation",
      variables: {
        CI: "Consistency Index",
        "\\lambda_{max}": "Maximum eigenvalue of the pairwise comparison matrix",
        n: "Order of the matrix"
      },
      conditions: null,
      evidence: {
        page: null,
        locator_type: "equation",
        locator_id: "Eq. (8)",
        quote: "CI is the consistency index calculated according to formula (8):"
      }
    },
    {
      id: "bocr_subtraction_synthesis",
      label: "Eq. (9)",
      latex: "bB+oO-cC-rR = \\text{value for alternative}",
      description: "Basic BOCR additive formula with negative criteria subtracted.",
      variables: {
        "b, o, c, r": "Weight coefficients of benefit, opportunities, costs, and risks criteria",
        "B, O, C, R": "Values of the alternative for each respective criterion"
      },
      conditions: "Values of criteria for each alternative must be normalized so 1 is best for positive and -1 is worst for negative.",
      evidence: {
        page: null,
        locator_type: "equation",
        locator_id: "Eq. (9)",
        quote: "The basic idea of this method is to take negative from the positive criteria, and in this way determine the values (quality) of each alternative:"
      }
    },
    {
      id: "bocr_multiplicative_synthesis",
      label: "Unnumbered",
      latex: "BO/CR",
      description: "Multiplicative combination of BOCR priorities.",
      variables: { "B, O, C, R": "Synthesized priorities for Benefits, Opportunities, Costs, and Risks" },
      conditions: "One of the four ways to combine the four criteria to yield good results.",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Section 2.2",
        quote: "There are four ways: BO/CR, bB+oO+c(1/C)+r(1/R), bB+oO+c(1-C)+r(1-R), bB+oO-cC-rR."
      }
    },
    {
      id: "bocr_inverse_additive_synthesis",
      label: "Unnumbered",
      latex: "bB+oO+c(1/C)+r(1/R)",
      description: "Additive combination where negative priorities are transformed using reciprocal values.",
      variables: {
        "b, o, c, r": "Weights for B, O, C, R",
        "B, O, C, R": "Synthesized priorities for Benefits, Opportunities, Costs, and Risks"
      },
      conditions: "One of the four ways to combine the four criteria to yield good results.",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Section 2.2",
        quote: "There are four ways: BO/CR, bB+oO+c(1/C)+r(1/R), bB+oO+c(1-C)+r(1-R), bB+oO-cC-rR."
      }
    },
    {
      id: "bocr_complement_additive_synthesis",
      label: "Unnumbered",
      latex: "bB+oO+c(1-C)+r(1-R)",
      description: "Additive combination where negative priorities are transformed using complement (1 - value).",
      variables: {
        "b, o, c, r": "Weights for B, O, C, R",
        "B, O, C, R": "Synthesized priorities for Benefits, Opportunities, Costs, and Risks"
      },
      conditions: "One of the four ways to combine the four criteria to yield good results.",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Section 2.2",
        quote: "There are four ways: BO/CR, bB+oO+c(1/C)+r(1/R), bB+oO+c(1-C)+r(1-R), bB+oO-cC-rR."
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "Value of a random index RI",
      content: {
        columns: ["Order (n)", "RI"],
        rows: [
          ["1", "0"],
          ["2", "0"],
          ["3", "0.58"],
          ["4", "0.9"],
          ["5", "1.12"],
          ["6", "1.24"],
          ["7", "1.32"],
          ["8", "1.41"],
          ["9", "1.45"],
          ["10", "1.49"],
          ["11", "1.51"],
          ["12", "1.48"],
          ["13", "1.56"],
          ["14", "1.57"],
          ["15", "1.59"]
        ]
      },
      notes: "Transcribed fully to preserve foundational parameters.",
      evidence: { page: null, locator_type: "table", locator_id: "Table 1", quote: "Value of a random index RI" }
    },
    {
      kind: "table",
      label: "Table 5",
      caption: "A comparative overview of the obtained results",
      content: {
        columns: [
          "Alternative",
          "AHP for positive priorities / AHP for negative priorities",
          "Transformation: a_ij=1/a_ij",
          "Transformation: a_ij=1-a_ij",
          "AHP for positive priorities - AHP for negative priorities"
        ],
        rows: [
          ["A1", "5", "4", "2", "4"],
          ["A2", "1", "1", "1", "1"],
          ["A3", "2", "2", "3", "2"],
          ["A4", "3", "3", "4", "3"],
          ["A5", "4", "5", "5", "5"],
          ["A6", "6", "6", "6", "6"]
        ]
      },
      notes: "Ranks extracted and cleaned based on the provided text, as the original OCR was heavily grouped/corrupted. Rank 1 is best.",
      evidence: { page: null, locator_type: "table", locator_id: "Table 5", quote: "A comparative overview of the obtained results" }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: 6,
    n_criteria: { total: 7, B: 4, O: 0, C: 3, R: 0 },
    bocr_weights: null,
    scores_by_method: null,
    rankings_by_method: {
      "Quotient (Positive/Negative)": {
        Alt_1: 0,
        Alt_2: 0,
        Alt_3: 0,
        Alt_4: 0,
        Alt_5: 0,
        Alt_6: 0
      },
      "Difference (Positive-Negative)": {
        Alt_1: 0,
        Alt_2: 0,
        Alt_3: 0,
        Alt_4: 0,
        Alt_5: 0,
        Alt_6: 0
      },
      "Transformation 1/a": {
        Alt_1: 0,
        Alt_2: 0,
        Alt_3: 0,
        Alt_4: 0,
        Alt_5: 0,
        Alt_6: 0
      },
      "Transformation 1-a": {
        Alt_1: 0,
        Alt_2: 0,
        Alt_3: 0,
        Alt_4: 0,
        Alt_5: 0,
        Alt_6: 0
      },
      "WASPAS (Benchmark)": {
        Alt_1: 0,
        Alt_2: 0,
        Alt_3: 0,
        Alt_4: 0,
        Alt_5: 0,
        Alt_6: 0
      }
    },
    concordance: null,
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "The main drawback of traditional AHP is its inability to effectively handle undesirable or negative criteria.",
      verbatim_quote: "The biggest drawback of this method is that it does not produce good results if some of the criteria are undesirable.",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Abstract",
        quote: "The biggest drawback of this method is that it does not produce good results if some of the criteria are undesirable."
      },
      usable_as: "limitation"
    },
    {
      claim: "BOCR models require proper normalization of criteria values across alternatives to produce valid results.",
      verbatim_quote: "Without normalization, meaningless solutions are obtained.",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Section 2.2",
        quote: "Without normalization, meaningless solutions are obtained."
      },
      usable_as: "limitation"
    }
  ],
  limitations: [
    "The standard AHP method only deals with positive values and priorities, which represents its greatest drawback.",
    "BOCR method requires normalization for additive subtraction models to avoid meaningless solutions.",
    "The 1-a_ij transformation for negative criteria is not precise enough to strictly match validation methods like WASPAS in ranking the full set of alternatives."
  ],
  recommendations: [
    "Using the reciprocal transformation (1/a_ij) for undesirable priorities provides acceptable solutions and closely matches the ranking outcomes of comparative methods like WASPAS."
  ],
  cites: ["tl2003", "ek2012"],
  cited_by_context: {
    tl2003: "Cited regarding the introduction of the BOCR model and identifying benefits-costs and chances-risks as opposing criteria.",
    ek2012: "Cited as the foundational source for the WASPAS method, which was used in the study to check and validate AHP BOCR results."
  },
  notes: [
    "The paper evaluates four adaptations of the AHP to handle negative criteria: Quotient (Positive/Negative AHP), Reciprocal (1/a_ij), Complement (1-a_ij), and Difference (Positive AHP - Negative AHP).",
    "Positive criteria were classified functionally similarly to Benefits, and negative criteria as Costs.",
    "Table 5 OCR had misalignments in the source text. Ranks were carefully reconstructed based on the discussion section (Section 7), ensuring A2 is consistently first and A6 is worst."
  ]
};

export default article;
