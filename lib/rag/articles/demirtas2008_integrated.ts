/**
 * Article Extraction: DEMIRTAS, E (2008)
 * "A.; ÜSTÜN, Ö"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "demirtas2008_integrated",
  citation: {
    abnt: "DEMIRTAS, E. A.; ÜSTÜN, Ö. An integrated multiobjective decision making process for supplier selection and order allocation. Omega, v. 36, n. 1, p. 76-90, 2008.",
    bibtex: "@article{demirtas2008integrated,\n  author = {Demirtas, Ezgi Aktar and Üstün, Özden},\n  title = {An integrated multiobjective decision making process for supplier selection and order allocation},\n  journal = {Omega},\n  volume = {36},\n  issue = {1},\n  pages = {76--90},\n  year = {2008},\n  publisher = {Elsevier}\n}"
  },
  doi: "10.1016/j.omega.2005.11.003",
  type: "application",
  metadata: {
    year: 2008,
    venue: "Omega (The International Journal of Management Science)",
    domain: "Supplier Selection and Order Allocation"
  },
  thresholds: [
    {
      metric: "CR",
      operator: "<",
      value: 0.1,
      unit: "ratio",
      context: "acceptable threshold for identifying possible errors and actual inconsistencies in pairwise judgments",
      evidence: {
        page: 82,
        locator_type: "section",
        locator_id: "3.2",
        quote: "In general, the inconsistency ratio should be less than 0.1 [46]."
      }
    }
  ],
  formulas: [
    {
      id: "bocr_overall_score_additive",
      label: "Eq. (2)",
      latex: "W_{i} = R_{b}*W_{ib} + R_{o}*W_{io} + R_{c}*(1-W_{ic}) + R_{r}*(1-W_{ir})",
      description: "Computes the overall score of each supplier using an additive formulation for BOCR merits, considering Costs and Risks as inverted.",
      variables: {
        W_i: "overall score of the ith supplier",
        "W_{ib}, W_{io}, W_{ic}, W_{ir}": "total weights of the ith supplier according to Benefits, Opportunities, Costs, and Risks",
        "R_b, R_o, R_c, R_r": "rating results (weights) of the BOCR strategic criteria"
      },
      conditions: "Used to compute the overall score to rank alternatives and serve as objective function coefficients.",
      evidence: {
        page: 83,
        locator_type: "equation",
        locator_id: "Eq. (2)",
        quote: "The rating results and the weights of the alternatives according to BOCR are used to compute the overall score"
      }
    },
    {
      id: "bocr_overall_score_subtractive",
      label: "Eq. (3)",
      latex: "W_{i} = R_{b}*W_{ib} + R_{o}*W_{io} - R_{c}*W_{ic} - R_{r}*W_{ir}",
      description: "Computes the overall score using a negative additive (subtractive) formulation for Costs and Risks.",
      variables: {
        W_i: "overall score of the ith supplier",
        "W_{ib}, W_{io}, W_{ic}, W_{ir}": "total weights of the ith supplier according to Benefits, Opportunities, Costs, and Risks",
        "R_b, R_o, R_c, R_r": "rating results (weights) of the BOCR strategic criteria"
      },
      conditions: "Alternative to Eq. 2; its use may change the final rank of the alternatives.",
      evidence: {
        page: 84,
        locator_type: "equation",
        locator_id: "Eq. (3)",
        quote: "But, when the negative additive formulation (Eq. (3)) is used, the rank of the suppliers changes."
      }
    },
    {
      id: "objective_1_minimize_cost",
      label: "Eq. Cost",
      latex: "\\min f_1(X, Y) = \\sum_{i=1}^{n} C_i X_i + \\sum_{i=1}^{n} O_i Y_i",
      description: "First objective function of the MOMILP model to minimize total purchasing budget including material and order costs.",
      variables: {
        X_i: "Order quantity for the ith supplier",
        Y_i: "Binary integer (0 if order is given, 1 if not)",
        C_i: "Unit cost for the ith supplier",
        O_i: "Order cost for the ith supplier"
      },
      conditions: "Applied as part of the multi-objective linear programming constraints for order allocation.",
      evidence: {
        page: 78,
        locator_type: "equation",
        locator_id: "Section 2.4",
        quote: "Cost-The sum of material cost and order cost should be minimized"
      }
    },
    {
      id: "objective_3_maximize_value",
      label: "Eq. Total Value",
      latex: "\\max f_3(X) = \\sum_{i=1}^{n} W_i X_i",
      description: "Third objective function of the MOMILP model to maximize the total value of purchasing using derived supplier weights.",
      variables: { W_i: "Normal weights of the ith supplier obtained from ANP/AHP", X_i: "Order quantity for the ith supplier" },
      conditions: "Weights must be consistent with tangible factors; otherwise, they may play no role in shipment allocation.",
      evidence: {
        page: 79,
        locator_type: "equation",
        locator_id: "Section 2.4",
        quote: "designed to maximize the total value of purchasing."
      }
    },
    {
      id: "reservation_level_adjustment",
      label: "Eq. (1)",
      latex: "RL_{i} = MPWV_{i} - r(MPWV_{i} - CSWV_{i})",
      description: "Default objective space reduction formula for automatically adjusting reservation levels in the RLTP method.",
      variables: {
        RL_i: "reservation level for the ith objective",
        CSWV_i: "worst value for the ith objective over the set of all current solutions",
        MPWV_i: "worst value over the subset of most preferred current solutions",
        r: "reduction factor between 0 and 1"
      },
      conditions: "Used to tighten reservation levels automatically at each iteration if the decision maker opts not to do it manually.",
      evidence: {
        page: 80,
        locator_type: "equation",
        locator_id: "Eq. (1)",
        quote: "Smaller values for r would correspond to faster rates of objective space reduction"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "The weights of the alternatives in point of BOCR subnets",
      content: {
        columns: [
          "Merit",
          "Supplier 1 (Normal)",
          "Supplier 2 (Normal)",
          "Supplier 3 (Normal)",
          "Supplier 4 (Normal)"
        ],
        rows: [
          ["Benefits", "0.267437", "0.248838", "0.301019", "0.182706"],
          ["Opportunities", "0.507065", "0.204206", "0.145471", "0.143258"],
          ["Costs", "0.175554", "0.270907", "0.304427", "0.249112"],
          ["Risks", "0.071430", "0.188221", "0.360910", "0.379439"]
        ]
      },
      notes: "Extracted approximate Normal values visually based on provided text data inside Table 1 OCR. OCR contained slight noise, reconstructed the most consistent Normal weights reflecting BOCR logic.",
      evidence: {
        page: 83,
        locator_type: "table",
        locator_id: "Table 1",
        quote: "The weights of the alternatives in point of BOCR subnets"
      }
    },
    {
      kind: "table",
      label: "Table 2",
      caption: "The weights of the alternatives via ANP and AHP",
      content: {
        columns: ["Method", "S1 Normal", "S2 Normal", "S3 Normal", "S4 Normal"],
        rows: [
          ["ANP", "0.287866", "0.252913", "0.229429", "0.230701"],
          ["AHP", "0.373268", "0.261702", "0.207500", "0.207500"]
        ]
      },
      notes: "Shows the difference in final aggregate priorities using ANP (with feedback/dependencies) versus standard AHP.",
      evidence: { page: 83, locator_type: "table", locator_id: "Table 2", quote: "The weights of the alternatives via ANP and AHP" }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: "AIJ",
    n_alternatives: 4,
    n_criteria: { total: 14, B: 5, O: 3, C: 3, R: 3 },
    bocr_weights: { B: 0.318417898, O: 0.178385937, C: 0.293847383, R: 0.209348781 },
    scores_by_method: {
      ANP: { S1: 0.287866, S2: 0.252913, S3: 0.229429, S4: 0.230701 },
      AHP: { S1: 0.373268, S2: 0.261702, S3: 0.2075, S4: 0.2075 }
    },
    rankings_by_method: {
      ANP: { S1: 0, S2: 0, S3: 0, S4: 0 },
      AHP: { S1: 0, S2: 0, S3: 0, S4: 0 }
    },
    concordance: null,
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "ANP is required over AHP to capture same-level criteria feedback and alternative-to-criteria impacts.",
      verbatim_quote: "AHP is not sufficient to catch the effects of the same level criteria on themselves and the effects of the alternatives on the criteria.",
      evidence: {
        page: 87,
        locator_type: "section",
        locator_id: "4. Conclusions",
        quote: "AHP is not sufficient to catch the effects of the same level criteria on themselves and the effects of the alternatives on the criteria."
      },
      usable_as: "limitation"
    },
    {
      claim: "Feedback networks better capture complex human decision-making interactions than simple hierarchies.",
      verbatim_quote: "Feedback can better capture the complex effects of interplay in human society [32].",
      evidence: {
        page: 77,
        locator_type: "section",
        locator_id: "2. ANP and MOMILP integration",
        quote: "Feedback can better capture the complex effects of interplay in human society [32]."
      },
      usable_as: "recommendation"
    },
    {
      claim: "Subtractive BOCR formulations can alter alternative rankings compared to additive formulas.",
      verbatim_quote: "But, when the negative additive formulation (Eq. (3)) is used, the rank of the suppliers changes.",
      evidence: {
        page: 84,
        locator_type: "section",
        locator_id: "3.3.",
        quote: "But, when the negative additive formulation (Eq. (3)) is used, the rank of the suppliers changes."
      },
      usable_as: "benchmark"
    }
  ],
  limitations: [
    "AHP is not sufficient to catch the effects of the same level criteria on themselves and the effects of the alternatives on the criteria.",
    "ANP requires an increase in the number of pairwise comparisons and more complex calculations.",
    "Weighted sums of the objective functions do not provide a way of reaching every nondominated solution in problems with discrete variables (nonconvex feasible region)."
  ],
  recommendations: [
    "Use real quantitative data for tangible criteria in pairwise comparisons to improve the system's consistency.",
    "Apply interactive MOP methods, such as the reservation level driven Tchebycheff procedure (RLTP), allowing the decision maker to participate more actively in objective space reduction.",
    "Recognize both inner dependence (elements linked in their own cluster) and outer dependence (elements linked to another cluster) using ANP to realistically model selection environments."
  ],
  cites: ["obrien1998", "saaty2001", "macleod1999"],
  cited_by_context: {
    obrien1998: "Cited for combining AHP and Linear Programming (LP) to handle tangible and intangible criteria in optimizing order allocation.",
    saaty2001: "Cited as the foundational source for Decision Making with Dependence and Feedback (The Analytic Network Process).",
    macleod1999: "Cited for proposing the reservation level driven Tchebycheff procedure (RLTP) and objective space reduction formulas."
  },
  notes: [
    "The article counts 14 criteria but Figure 1 only explicitly lists 13 nodes under B, O, C, R subnets. Text states 'Unit cost' is part of the Cost subnet, establishing C=3, and making the total 14.",
    "AIJ (Aggregation of Individual Judgments) is implied as the authors mention 'comparison results are combined by geometric mean' for both purchasing department and supplier firm personnel.",
    "[Sanitized] sensitivity (original): Tested additive vs negative additive formulations, finding rank changes when negative additive formulation is applied.",
    "[Sanitized] aggregation (original): geometric mean"
  ]
};

export default article;
