/**
 * Article Extraction: ALIZADEH, R (2020)
 * "et al"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "alizadeh2020_energy",
  citation: {
    abnt: "ALIZADEH, R. et al. Improving renewable energy policy planning and decision-making through a hybrid MCDM method. Energy Policy, v. 137, p. 111174, 2020.",
    bibtex: "@article{alizadeh2020improving,\n  title={Improving renewable energy policy planning and decision-making through a hybrid MCDM method},\n  author={Alizadeh, Reza and Soltanisehat, Leili and Lund, Peter D and Zamanisabzi, Hamed},\n  journal={Energy Policy},\n  volume={137},\n  pages={111174},\n  year={2020},\n  publisher={Elsevier}\n}"
  },
  doi: "10.1016/j.enpol.2019.111174",
  type: "application",
  metadata: { year: 2020, venue: "Energy Policy", domain: "Renewable Energy / Public Policy" },
  thresholds: [
    {
      metric: "Inconsistency Rate (IR / CR)",
      operator: "≤",
      value: 0.15,
      unit: "ratio",
      context: "acceptable inconsistency limit for pairwise comparisons due to complex political/economic context",
      evidence: {
        page: 8,
        locator_type: "section",
        locator_id: "5.3",
        quote: "we accept here a 15% inconsistency in the judgments during the pairwise comparison."
      }
    },
    {
      metric: "Consistency Ratio (CR)",
      operator: "≤",
      value: 0,
      unit: "threshold",
      context: "allowable threshold depends on the size of the comparison matrix",
      evidence: {
        page: 9,
        locator_type: "section",
        locator_id: "5.6",
        quote: "allowable CR should be less than or equal to a threshold, that depends on the size"
      }
    },
    {
      metric: "CR adjustment limit",
      operator: "<",
      value: 0.1,
      unit: "ratio",
      context: "maximum recommended adjustment to improve consistency level in comparison",
      evidence: {
        page: 9,
        locator_type: "section",
        locator_id: "5.6",
        quote: "This adjustment should not be too large (<10%), and it should not be too low (1%)"
      }
    }
  ],
  formulas: [
    {
      id: "bocr_additive",
      label: "Additive formula",
      latex: "P_i = bB_i + oO_i + c(1/C_i)_{\\text{Normalized}} + r(1/R_i)_{\\text{Normalized}}",
      description: "Additive method to synthesize BOCR priorities.",
      variables: {
        B_i: "Benefits score",
        O_i: "Opportunities score",
        C_i: "Costs score",
        R_i: "Risks score",
        b: "Benefit weight",
        o: "Opportunity weight",
        c: "Cost weight",
        r: "Risk weight"
      },
      conditions: "The additive formula is the best for long-term results.",
      evidence: {
        page: 6,
        locator_type: "table",
        locator_id: "Table 5",
        quote: "The additive formula is the best for long-term results"
      }
    },
    {
      id: "bocr_probabilistic_additive",
      label: "Probabilistic additive formula",
      latex: "P_i = bB_i + oO_i + c(1-C_i) + r(1-R_i)",
      description: "Probabilistic additive method to synthesize BOCR priorities.",
      variables: {
        B_i: "Benefits",
        O_i: "Opportunities",
        C_i: "Costs",
        R_i: "Risks",
        b: "Benefit weight",
        o: "Opportunity weight",
        c: "Cost weight",
        r: "Risk weight"
      },
      conditions: null,
      evidence: { page: 6, locator_type: "table", locator_id: "Table 5", quote: "Probabilistic additive bB_i+oO_i+c(1-C_i)+r(1-R_i)" }
    },
    {
      id: "bocr_subtractive",
      label: "Subtractive formula",
      latex: "P_i = bB_i + oO_i - cC_i - rR_i",
      description: "Subtractive method to synthesize BOCR priorities.",
      variables: {
        B_i: "Benefits",
        O_i: "Opportunities",
        C_i: "Costs",
        R_i: "Risks",
        b: "Benefit weight",
        o: "Opportunity weight",
        c: "Cost weight",
        r: "Risk weight"
      },
      conditions: null,
      evidence: { page: 6, locator_type: "table", locator_id: "Table 5", quote: "Subtractive bB_i+oO_i-cC_i-rR_i" }
    },
    {
      id: "bocr_multiplicative_powers",
      label: "Multiplicative priority powers formula",
      latex: "P_i = B_i^b O_i^o [(1/C_i)_{\\text{Normalized}}]^c [(1/R_i)_{\\text{Normalized}}]^r",
      description: "Multiplicative priority powers method to synthesize BOCR priorities.",
      variables: {
        B_i: "Benefits",
        O_i: "Opportunities",
        C_i: "Costs",
        R_i: "Risks",
        b: "Benefit weight",
        o: "Opportunity weight",
        c: "Cost weight",
        r: "Risk weight"
      },
      conditions: null,
      evidence: {
        page: 6,
        locator_type: "table",
        locator_id: "Table 5",
        quote: "Multiplicative priority powers B_i^b O_i^o [1/C_{iNormalized}]^c [1/R_{iNormalized}]^r"
      }
    },
    {
      id: "bocr_multiplicative",
      label: "Multiplicative formula",
      latex: "P_i = \\frac{B_i O_i}{C_i R_i}",
      description: "Multiplicative ratio method to synthesize BOCR priorities.",
      variables: { B_i: "Benefits", O_i: "Opportunities", C_i: "Costs", R_i: "Risks" },
      conditions: "multiplicative formula is equivalent to the marginal cost/benefit and the best for short-term results (BO/CR).",
      evidence: {
        page: 6,
        locator_type: "paragraph",
        locator_id: "Section 4.2",
        quote: "multiplicative formula is equivalent to the marginal cost/benefit and the best for short-term results (BO/CR)."
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 4",
      caption: "Saaty's numerical scales (Saaty, 2004).",
      content: {
        columns: ["Intensity of importance", "Definition", "Explanation"],
        rows: [
          ["1", "Equal importance", "Two activities contribute equally to the objective"],
          ["3", "Moderate importance", "Experience and judgment slightly favor one over another"],
          ["5", "Strong importance", "Experience and judgment strongly favor one over another"],
          [
            "7",
            "Very strong importance",
            "Activity is strongly favored, and its dominance is demonstrated in practice"
          ],
          [
            "9",
            "Absolute importance",
            "Importance of one over another affirmed on the highest possible order"
          ],
          [
            "2,4,6,8",
            "Intermediate values",
            "Used to represent a compromise between the priorities listed above"
          ],
          [
            "Reciprocal of above non-zero numbers",
            "Intermediate values",
            "If activity i has one of the above non-zero numbers assigned to it when compared with activity j, then j has the reciprocal value compared with activity i"
          ]
        ]
      },
      notes: "Fully transcribed fundamental scale.",
      evidence: { page: 6, locator_type: "table", locator_id: "Table 4", quote: "Saaty's numerical scales" }
    },
    {
      kind: "table",
      label: "Table 9 / Figure 3",
      caption: "BOCR sub-network weights (and hierarchy mapping)",
      content: {
        columns: ["BOCR", "Sub-criteria ID", "Sub-criteria Description", "Final relative weights"],
        rows: [
          ["Benefit", "B1", "Utilization of native resources", "0.24"],
          ["Benefit", "B2", "Protection of the environment", "0.13"],
          ["Benefit", "B3", "Development of allied industries", "0.60"],
          ["Benefit", "B4", "Pursuing international commitments such as UNFCCC and Kyoto Protocol", "0.04"],
          ["Opportunity", "O1", "Developing alternative environmentally - friendly resources", "0.17"],
          ["Opportunity", "O2", "Job creation", "0.58"],
          ["Opportunity", "O3", "Reduction in energy prices", "0.25"],
          ["Cost", "C1", "Investment costs", "0.20"],
          ["Cost", "C2", "Operation costs", "0.25"],
          ["Cost", "C3", "Maintenance costs", "0.16"],
          ["Cost", "C4", "Land use", "0.28"],
          ["Cost", "C5", "Ecological damage", "0.11"],
          ["Risk", "R1", "Dependency on foreign technology", "0.08"],
          [
            "Risk",
            "R2",
            "Lack of a financial mechanism to endeavor RE development (e.g., governmental funds, foreign and domestic investments)",
            "0.30"
          ],
          ["Risk", "R3", "Insufficient technological infrastructures", "0.25"],
          ["Risk", "R4", "Instability of energy resource", "0.11"],
          ["Risk", "R5", "Lack of public awareness about RE", "0.13"],
          [
            "Risk",
            "R6",
            "Business failure due to technological obsolescence, insufficient access to capital, the high price of generated",
            "0.14"
          ]
        ]
      },
      notes: "Fully transcribed BOCR hierarchy and sub-network weights merging information from Table 9 and Figure 3.",
      evidence: { page: 9, locator_type: "table", locator_id: "Table 9", quote: "BOCR sub-network weights." }
    },
    {
      kind: "table",
      label: "Table 10",
      caption: "Prioritization of alternatives.",
      content: {
        columns: [
          "Energy Source",
          "Additive Score",
          "Additive Rank",
          "Probabilistic additive Score",
          "Probabilistic additive Rank",
          "Subtractive Score",
          "Subtractive Rank",
          "Multiplicative priority powers Score",
          "Multiplicative priority powers Rank",
          "Multiplicative Score",
          "Multiplicative Rank"
        ],
        rows: [
          ["Biomass", "3.54", "3", "0.44", "3", "0.08", "5", "0.32", "4", "0.08", "3"],
          ["Geothermal", "2.55", "5", "0.38", "5", "0.02", "4", "0.34", "3", "0.02", "5"],
          ["Hydro", "2.90", "4", "0.41", "4", "0.08", "6", "0.25", "5", "0.03", "4"],
          ["Nuclear", "2.29", "6", "0.38", "6", "0.11", "3", "0.22", "6", "0.02", "6"],
          ["Solar", "3.58", "1", "0.53", "1", "0.17", "1", "0.50", "1", "0.33", "1"],
          ["Wind", "2.65", "2", "0.48", "2", "0.14", "2", "0.41", "2", "0.12", "2"]
        ]
      },
      notes: "Fully transcribed outcomes of the five BOCR synthesis formulas.",
      evidence: { page: 10, locator_type: "table", locator_id: "Table 10", quote: "Prioritization of alternatives." }
    }
  ],
  empirical_data: {
    n_respondents: 12,
    aggregation: null,
    n_alternatives: 6,
    n_criteria: { total: 24, B: 4, O: 3, C: 5, R: 6 },
    bocr_weights: null,
    scores_by_method: {
      additive: {
        Alt_1: 3.54,
        Alt_2: 2.55,
        Alt_3: 2.9,
        Alt_4: 2.29,
        Alt_5: 3.58,
        Alt_6: 2.65
      },
      probabilistic_additive: {
        Alt_1: 0.44,
        Alt_2: 0.38,
        Alt_3: 0.41,
        Alt_4: 0.38,
        Alt_5: 0.53,
        Alt_6: 0.48
      },
      subtractive: {
        Alt_1: 0.08,
        Alt_2: 0.02,
        Alt_3: 0.08,
        Alt_4: 0.11,
        Alt_5: 0.17,
        Alt_6: 0.14
      },
      multiplicative_priority_powers: {
        Alt_1: 0.32,
        Alt_2: 0.34,
        Alt_3: 0.25,
        Alt_4: 0.22,
        Alt_5: 0.5,
        Alt_6: 0.41
      },
      multiplicative: {
        Alt_1: 0.08,
        Alt_2: 0.02,
        Alt_3: 0.03,
        Alt_4: 0.02,
        Alt_5: 0.33,
        Alt_6: 0.12
      }
    },
    rankings_by_method: null,
    concordance: null,
    sensitivity: {
      method: "OAT",
      inflection_points: []
    },
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "For long-term evaluation, the additive BOCR formula is recommended.",
      verbatim_quote: "The additive formula is the best for long-term results",
      evidence: {
        page: 6,
        locator_type: "paragraph",
        locator_id: "4.2",
        quote: "The additive formula is the best for long-term results"
      },
      usable_as: "recommendation"
    },
    {
      claim: "For short-term evaluation, the multiplicative BOCR formula provides the best marginal cost/benefit equivalent.",
      verbatim_quote: "multiplicative formula is equivalent to the marginal cost/benefit and the best for short-term results",
      evidence: {
        page: 6,
        locator_type: "paragraph",
        locator_id: "4.2",
        quote: "multiplicative formula is equivalent to the marginal cost/benefit and the best for short-term results"
      },
      usable_as: "recommendation"
    },
    {
      claim: "In highly complex political/economic environments, relaxing the inconsistency threshold to 15% may be justifiable.",
      verbatim_quote: "Because of the complex political and economic situations... we accept here a 15% inconsistency",
      evidence: {
        page: 8,
        locator_type: "section",
        locator_id: "5.3",
        quote: "Because of the complex political and economic situations... we accept here a 15% inconsistency"
      },
      usable_as: "threshold"
    }
  ],
  limitations: [],
  recommendations: [
    "Use the BOCR-ANP framework to avoid biases in traditional survey-type SWOT analyses where stakeholders disagree on driving forces.",
    "Adjust consistency ratio (CR) by checking if inconsistency is neither too large (<10%) nor too low (1%).",
    "Employ additive synthesis for long-term policy strategies, and multiplicative for short-term cost-benefit scenarios."
  ],
  cites: ["saaty2003", "wijnmalen2007"],
  cited_by_context: {
    saaty2003: "Used to define the BOCR strategic management framework.",
    wijnmalen2007: "Provides the five synthesis methods for prioritizing alternatives under BOCR factors."
  },
  notes: [
    "The authors explicitly adopted a relaxed CR threshold (≤ 0.15) for strategic pairwise comparisons to accommodate 'complex political and economic situations' typical in national-level energy decisions.",
    "Table 5 contains a typographical error in the subtractive formula ('bBi + oOi + cCi - rR$'), which has been corrected to the standard '- rRi'. There are also minor OCR issues in the priority powers formula which were transcribed into correct standard LaTeX representation.",
    "Overall specific numeric values for normalized b, o, c, r were not distinctly stated in a single table, but noted textually as 'fall between 0.2 and 0.3' on page 8.",
    "[Sanitized] cr_values (original): < 0.05 mostly, with a max accepted threshold of 0.15 for the overall project due to political complexity",
    "[Sanitized] aggregation (original): Geometric average"
  ]
};

export default article;
