/**
 * Article Extraction: T.L. Saaty and M. Ozdemir (2003)
 * "Negative Priorities in the Analytic Hierarchy Process"
 *
 * Extracted on: 2026-05-04
 * Extraction prompt version: v4.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saatyOzdemir2003_negative",
  citation: {
    abnt: "SAATY, Thomas L.; OZDEMIR, Mujgan. Negative priorities in the analytic hierarchy process. Mathematical and Computer Modelling, v. 37, n. 9-10, p. 1063-1075, 2003.",
    bibtex: "@article{saaty2003negative,\n  title={Negative priorities in the analytic hierarchy process},\n  author={Saaty, Thomas L and Ozdemir, Mujgan},\n  journal={Mathematical and Computer Modelling},\n  volume={37},\n  number={9-10},\n  pages={1063--1075},\n  year={2003},\n  publisher={Elsevier}\n}"
  },
  doi: "10.1016/S0895-7177(03)00118-3",
  type: "methodological",
  metadata: {
    year: 2003,
    venue: "Mathematical and Computer Modelling",
    domain: "Decision Theory / BOCR Synthesis"
  },
  thresholds: [],
  formulas: [
    {
      id: "bocr_multiplicative_ratio_so",
      label: "Multiplicative BOCR (BO/CR)",
      latex: "\\frac{B^{w_b} \\cdot O^{w_o}}{C^{w_c} \\cdot R^{w_r}}",
      description: "Multiplicative synthesis of benefits/opportunities over costs/risks (return on investment ratio).",
      variables: {
        "B, O, C, R": "Normalized priorities of an alternative on benefits, opportunities, costs, and risks",
        "w_b, w_o, w_c, w_r": "Strategic weights for the four BOCR factors"
      },
      conditions: "Yields a return-on-investment ratio. Reported alongside three other synthesis methods in Table 5.",
      evidence: {
        page: 1075,
        locator_type: "table",
        locator_id: "Table 5",
        quote: "BO/CR"
      }
    },
    {
      id: "bocr_additive_reciprocals_so",
      label: "Additive with reciprocals",
      latex: "b \\cdot B + o \\cdot O + c/C + r/R",
      description: "Additive synthesis using reciprocals of costs and risks (i.e., 1/C and 1/R) to convert disadvantageous criteria into beneficial.",
      variables: {
        "b, o, c, r": "Normalized weights of the BOCR factors",
        "B, O, C, R": "Normalized priorities of an alternative on each factor",
        "1/C, 1/R": "Reciprocals of cost and risk priorities"
      },
      conditions: "One of four synthesis methods compared. Criticized in Wijnmalen (2007) for distorting the original common scale.",
      evidence: {
        page: 1075,
        locator_type: "table",
        locator_id: "Table 5",
        quote: "bB + oO + c(1/C) + r(1/R)"
      }
    },
    {
      id: "bocr_additive_residual",
      label: "Additive Residual",
      latex: "b \\cdot B + o \\cdot O + c \\cdot (1-C) + r \\cdot (1-R)",
      description: "Additive Residual synthesis: costs and risks are converted to (1-C) and (1-R), so higher cost reduces the score additively.",
      variables: {
        "b, o, c, r": "Normalized weights of BOCR factors",
        "B, O, C, R": "Normalized priorities of alternative on each factor",
        "(1-C), (1-R)": "Residual transformation: complement of normalized cost/risk relative to the largest reciprocal"
      },
      conditions: "One of four synthesis methods presented. The residual form (1-C) yields values between 0 and 1.",
      evidence: {
        page: 1075,
        locator_type: "table",
        locator_id: "Table 5",
        quote: "bB + oO + c(1-C) + r(1-R)"
      }
    },
    {
      id: "bocr_additive_subtractive_negative",
      label: "Additive Subtractive (with negative priorities)",
      latex: "b \\cdot B + o \\cdot O - c \\cdot C - r \\cdot R",
      description: "Additive Subtractive synthesis: costs and risks are subtracted directly, allowing the score to be negative when an alternative is unprofitable.",
      variables: {
        "b, o, c, r": "Normalized weights of BOCR factors",
        "B, O, C, R": "Normalized priorities of alternative on each factor"
      },
      conditions: "Result can be negative, indicating unprofitability. Approximates net monetary value better than reciprocals.",
      evidence: {
        page: 1075,
        locator_type: "table",
        locator_id: "Table 5",
        quote: "bB + oO − cC − rR"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 5",
      caption: "Four methods of synthesizing BOCR using the ideal mode",
      content: {
        columns: [
          "Alternatives",
          "Benefits (0.25)",
          "Opportunities (0.20)",
          "Costs (0.31)",
          "Reciprocals of Costs",
          "Costs (Divided by Largest Reciprocal)",
          "Risks (0.24)",
          "Reciprocals of Risks",
          "Risks (Divided by Largest Reciprocal)",
          "BO/CR",
          "bB + oO + c(1/C) + r(1-R)",
          "bB + oO + c(1-C) + r(1-R)",
          "bB + oO − cC − rR"
        ],
        rows: [
          ["PNTR", 1, 1, 0.31, 3.23, 1, 0.51, 1.96, 1, 0.87, 0.78, 0.23, 0.23],
          ["Amend NTR", 0.48, 0.44, 0.50, 2.00, 0.62, 0.52, 1.92, 0.98, 0.13, 0.52, 0.48, -0.07],
          ["Annual Exten.", 0.21, 0.20, 0.87, 1.15, 0.36, 0.61, 1.64, 0.84, 0.01, 0.31, 0.23, -0.32]
        ]
      },
      notes: "Fully transcribed table comparing four BOCR synthesis methods with three policy alternatives. Negative values in the Subtractive method (Annual Exten. = -0.32; Amend NTR = -0.07) indicate unprofitability.",
      evidence: {
        page: 1075,
        locator_type: "table",
        locator_id: "Table 5",
        quote: "Four methods of synthesizing BOCR using the ideal mode"
      }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: 3,
    n_criteria: { total: 4, B: 1, O: 1, C: 1, R: 1 },
    bocr_weights: { B: 0.25, O: 0.20, C: 0.31, R: 0.24 },
    scores_by_method: {
      "Multiplicative BO/CR": {
        "PNTR": 0.87,
        "Amend NTR": 0.13,
        "Annual Exten.": 0.01
      },
      "Additive with reciprocals": {
        "PNTR": 0.78,
        "Amend NTR": 0.52,
        "Annual Exten.": 0.31
      },
      "Additive Residual": {
        "PNTR": 0.23,
        "Amend NTR": 0.48,
        "Annual Exten.": 0.23
      },
      "Additive Subtractive": {
        "PNTR": 0.23,
        "Amend NTR": -0.07,
        "Annual Exten.": -0.32
      }
    },
    rankings_by_method: {
      "Multiplicative BO/CR": { "PNTR": 1, "Amend NTR": 2, "Annual Exten.": 3 },
      "Additive with reciprocals": { "PNTR": 1, "Amend NTR": 2, "Annual Exten.": 3 },
      "Additive Residual": { "PNTR": 2, "Amend NTR": 1, "Annual Exten.": 3 },
      "Additive Subtractive": { "PNTR": 1, "Amend NTR": 2, "Annual Exten.": 3 }
    },
    concordance: {
      rate: 0.75,
      n_methods: 4,
      description: "PNTR is dominant in 3 of 4 methods; Additive Residual ranks Amend NTR first, indicating the methods are not always concordant."
    },
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "BOCR criteria can be represented with positive AND negative absolute scale priorities, instead of only converting costs/risks to reciprocals.",
      verbatim_quote: "absolute numbers can be both positive and negative, and hence, it is not necessary to confine the BOCR to being positive",
      evidence: {
        page: 1070,
        locator_type: "paragraph",
        locator_id: "Section 4",
        quote: "absolute numbers can be both positive and negative, and hence, it is not necessary to confine the BOCR to being positive"
      },
      usable_as: "definition"
    },
    {
      claim: "Four synthesis methods for BOCR are presented: multiplicative BO/CR, additive with reciprocals, additive residual (1-C/1-R), and additive subtractive.",
      verbatim_quote: "Several different ways are described in the paper for doing this",
      evidence: {
        page: 1063,
        locator_type: "abstract",
        locator_id: "Abstract",
        quote: "Several different ways are described in the paper for doing this"
      },
      usable_as: "definition"
    },
    {
      claim: "The Additive Subtractive synthesis can produce negative scores, indicating unprofitability of an alternative when costs+risks exceed benefits+opportunities.",
      verbatim_quote: "PNTR is the dominant alternative",
      evidence: {
        page: 1075,
        locator_type: "table",
        locator_id: "Table 5 (last column)",
        quote: "Annual Exten. -0.32 ; Amend NTR -0.07 ; PNTR 0.23"
      },
      usable_as: "benchmark"
    },
    {
      claim: "Each positive or negative priority need not have a symmetric opposite value, because the opposite criterion may not exist in practice.",
      verbatim_quote: "each of the positive or negative priorities need not have a symmetric opposite value, because the opposite criterion may not exist",
      evidence: {
        page: 1063,
        locator_type: "abstract",
        locator_id: "Abstract",
        quote: "each of the positive or negative priorities need not have a symmetric opposite value, because the opposite criterion may not exist"
      },
      usable_as: "recommendation"
    },
    {
      claim: "When rankings differ between synthesis methods, this provides additional information that should be considered, not dismissed.",
      verbatim_quote: "If the rankings are different with the methods, there is information that needs to be considered",
      evidence: {
        page: 1075,
        locator_type: "section",
        locator_id: "Section 6 Conclusions",
        quote: "If the rankings are different with the methods, there is information that needs to be considered"
      },
      usable_as: "recommendation"
    },
    {
      claim: "The contribution of the paper is to discuss and illustrate negative priorities and how to synthesize priorities obtained from BOCR hierarchies.",
      verbatim_quote: "main contribution of this paper has been to discuss and illustrate negative priorities and how to synthesize the priorities",
      evidence: {
        page: 1075,
        locator_type: "section",
        locator_id: "Section 6 Conclusions",
        quote: "main contribution of this paper has been to discuss and illustrate negative priorities and how to synthesize the priorities"
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "The authors note that no single synthesis method is universally best — different methods can lead to different rankings, and the choice depends on the decision context.",
    "Paper presents methods on a single illustrative example (China trade status decision); empirical comparison across multiple domains is not provided.",
    "The Additive Residual method (1-C, 1-R) requires costs and risks to be normalized in [0,1] for the residual transformation to be meaningful."
  ],
  recommendations: [
    "Use multiple synthesis methods and compare rankings; differences provide diagnostic information about the decision.",
    "When applicable, prefer the Additive Subtractive method to capture net value (potentially negative) rather than only ratios.",
    "Apply BOCR with negative priorities only when the four merit categories (B, O, C, R) are conceptually appropriate for the decision."
  ],
  cites: [],
  cited_by_context: {},
  notes: [
    "This paper introduces the BOCR synthesis with negative priorities, formalizing what was previously presented in Saaty (1996) ANP book.",
    "Cites Saaty (1996) 'Decision Making with Dependence and Feedback' (RWS Publications, Pittsburgh) and Saaty (2000) 'Fundamentals of Decision Making and Priority Theory'. Neither is in the RAG as a separate article.",
    "Wijnmalen (2007) builds critically on this paper, proposing rescaling weights (s) for commensurability across BOCR sub-hierarchies.",
    "The Additive Residual formula (b·B + o·O + c·(1-C) + r·(1-R)) shown in Table 5 is the canonical reference for that method, NOT Saaty (2005) ANP book.",
    "The Subtractive formula (b·B + o·O − c·C − r·R) shown in Table 5 is the simple form. The full version with rescaling weights v and s is in Wijnmalen (2007) Eq. 17.",
    "DOI 10.1016/S0895-7177(03)00118-3 verified via Elsevier."
  ]
};

export default article;
