/**
 * Article Extraction: KABAK, M.; DAĞDEVİREN, M (2014)
 * "Prioritization of renewable energy sources for Turkey by using a hybrid MCDM methodology"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "kabak2014_prioritization",
  citation: {
    abnt: "KABAK, M.; DAĞDEVİREN, M. Prioritization of renewable energy sources for Turkey by using a hybrid MCDM methodology. Energy Conversion and Management, v. 79, p. 25-33, 2014.",
    bibtex: "@article{kabak2014prioritization,\n  author = {Kabak, Mehmet and Dağdeviren, Metin},\n  title = {Prioritization of renewable energy sources for Turkey by using a hybrid MCDM methodology},\n  journal = {Energy Conversion and Management},\n  volume = {79},\n  pages = {25--33},\n  year = {2014},\n  publisher = {Elsevier}\n}"
  },
  doi: "10.1016/j.enconman.2013.11.036",
  type: "application",
  metadata: { year: 2014, venue: "Energy Conversion and Management", domain: "Renewable Energy / Strategic Planning" },
  thresholds: [
    {
      metric: "IR",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable inconsistency ratio",
      evidence: {
        page: 27,
        locator_type: "section",
        locator_id: "Step 4",
        quote: "If the value of IR is smaller or equal to 10%, the inconsistency is acceptable."
      }
    },
    {
      metric: "IR",
      operator: ">",
      value: 0.1,
      unit: "ratio",
      context: "unacceptable inconsistency requiring revision",
      evidence: {
        page: 27,
        locator_type: "section",
        locator_id: "Step 4",
        quote: "If the IR is greater than 10%, we need to revise the subjective judgment."
      }
    }
  ],
  formulas: [
    {
      id: "bocr_additive",
      label: "Eq. (1)",
      latex: "P_{i} = bB_{i} + oO_{i} + c(1/C_{i})_{\\text{Normalized}} + r(1/R_{i})_{\\text{Normalized}}",
      description: "Additive method to combine the scores of each alternative under BOCR.",
      variables: {
        P_i: "priority score of alternative i",
        "B_i, O_i, C_i, R_i": "synthesized results of alternative i under merit B, O, C, and R",
        "b, o, c, r": "normalized weights of merit B, O, C, and R"
      },
      conditions: "Used to combine the scores of each alternative under B, O, C and R.",
      evidence: {
        page: 27,
        locator_type: "equation",
        locator_id: "Eq. (1)",
        quote: "There are five methods to combine the scores of each alternative under B, O, C and R"
      }
    },
    {
      id: "bocr_probabilistic_additive",
      label: "Eq. (2)",
      latex: "P_{i} = bB_{i} + oO_{i} + c(1-C_{i}) + r(1-R_{i})",
      description: "Probabilistic additive method to combine the scores of each alternative under BOCR.",
      variables: {
        P_i: "priority score of alternative i",
        "B_i, O_i, C_i, R_i": "synthesized results of alternative i under merit B, O, C, and R",
        "b, o, c, r": "normalized weights of merit B, O, C, and R"
      },
      conditions: "Used to combine the scores of each alternative under B, O, C and R.",
      evidence: {
        page: 27,
        locator_type: "equation",
        locator_id: "Eq. (2)",
        quote: "There are five methods to combine the scores of each alternative under B, O, C and R"
      }
    },
    {
      id: "bocr_subtractive",
      label: "Eq. (3)",
      latex: "P_{i} = bB_{i} + oO_{i} + cC_{i} - rR_{i}",
      description: "Subtractive method to combine the scores of each alternative under BOCR.",
      variables: {
        P_i: "priority score of alternative i",
        "B_i, O_i, C_i, R_i": "synthesized results of alternative i under merit B, O, C, and R",
        "b, o, c, r": "normalized weights of merit B, O, C, and R"
      },
      conditions: "Used to combine the scores of each alternative under B, O, C and R.",
      evidence: {
        page: 27,
        locator_type: "equation",
        locator_id: "Eq. (3)",
        quote: "There are five methods to combine the scores of each alternative under B, O, C and R"
      }
    },
    {
      id: "bocr_multiplicative_priority_powers",
      label: "Eq. (4)",
      latex: "P_{i} = B_{i}^{b}O_{i}^{o}[(1/C_{i})_{\\text{Normalized}}]^{c}[(1/R_{i})_{\\text{Normalized}}]^{r}",
      description: "Multiplicative priority powers method to combine the scores of each alternative under BOCR.",
      variables: {
        P_i: "priority score of alternative i",
        "B_i, O_i, C_i, R_i": "synthesized results of alternative i under merit B, O, C, and R",
        "b, o, c, r": "normalized weights of merit B, O, C, and R"
      },
      conditions: "Used to combine the scores of each alternative under B, O, C and R.",
      evidence: {
        page: 27,
        locator_type: "equation",
        locator_id: "Eq. (4)",
        quote: "There are five methods to combine the scores of each alternative under B, O, C and R"
      }
    },
    {
      id: "bocr_multiplicative",
      label: "Eq. (5)",
      latex: "P_{i} = BO / CR",
      description: "Multiplicative method to combine the scores of each alternative under BOCR.",
      variables: {
        P_i: "priority score of alternative i",
        "B, O, C, R": "synthesized results of alternatives under merit B, O, C, and R"
      },
      conditions: "Used to combine the scores of each alternative under B, O, C and R.",
      evidence: {
        page: 27,
        locator_type: "equation",
        locator_id: "Eq. (5)",
        quote: "There are five methods to combine the scores of each alternative under B, O, C and R"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "Saaty's 1–9 scale.",
      content: {
        columns: ["Intensity of importance", "Definition", "Explanation"],
        rows: [
          ["1", "Equal importance", "Two activities contribute equally to the objective"],
          ["3", "Moderate importance", "Experience and judgment slightly favor one over another"],
          ["5", "Strong importance", "Experience and judgment strongly favor one over another"],
          [
            "7",
            "Very strong importance",
            "Activity is strongly favored and its dominance is demonstrated in practice"
          ],
          [
            "9",
            "Absolute importance",
            "Importance of one over another affirmed on the highest possible order"
          ],
          [
            "2,4,6,8",
            "Intermediate values",
            "Used to represent compromise between the priorities listed above"
          ],
          [
            "Reciprocal of above non-zero numbers",
            "",
            "If activity i has one of the above non-zero numbers assigned to it when compared with activity j, then j has the reciprocal value when compared with i"
          ]
        ]
      },
      notes: "Transcribed verbatim as presented in the article.",
      evidence: { page: 28, locator_type: "table", locator_id: "Table 1", quote: "Saaty's 1-9 scale." }
    },
    {
      kind: "table",
      label: "Table 2",
      caption: "Linguistic values and average numbers.",
      content: {
        columns: ["Linguistic values", "Average numbers"],
        rows: [
          ["Very high (VH)", "1"],
          ["High (H)", "0.75"],
          ["Medium (M)", "0.5"],
          ["Low (L)", "0.25"],
          ["Very low (VL)", "0"]
        ]
      },
      notes: "Used for determining the weights of BOCR based on strategic criteria.",
      evidence: { page: 28, locator_type: "table", locator_id: "Table 2", quote: "Linguistic values and average numbers." }
    },
    {
      kind: "table",
      label: "Table 4",
      caption: "BOCR weights.",
      content: {
        columns: ["", "T (0.097)", "E (0.485)", "S (0.235)", "GE (0.053)", "HW (0.130)", "Weights"],
        rows: [
          ["Benefits", "1", "1", "0.75", "1", "1", "0.374"],
          ["Opportunities", "0.85", "0.9", "0.8", "0.9", "0.9", "0.347"],
          ["Costs", "0.4", "0.6", "0.5", "0.2", "0.4", "0.203"],
          ["Risks", "0.1", "0.25", "0.1", "0.2", "0.2", "0.076"]
        ]
      },
      notes: "Weights of BOCR derived from strategic criteria T (Technology), E (Economy), S (Security), GE (Global Effects), HW (Human Wellbeing).",
      evidence: { page: 30, locator_type: "table", locator_id: "Table 4", quote: "BOCR weights." }
    },
    {
      kind: "table",
      label: "Table 5",
      caption: "Final relative weights of criteria in BOCR subnetworks.",
      content: {
        columns: ["BOCR", "Criteria", "Final relative weights"],
        rows: [
          ["Benefits (B)", "B1 Evaluation of native resources", "0.1626"],
          ["", "B2 Preservation of the environment", "0.3656"],
          ["", "B3 Development of related industry", "0.3912"],
          ["", "B4 Orientation to international regulations", "0.0805"],
          ["Opportunities (O)", "O1 Decreasing dependency of importation of fuel", "0.3619"],
          ["", "O2 Developing new energy resources", "0.2993"],
          ["", "O3 Job creation", "0.1222"],
          ["", "O4 Decrease in energy prices", "0.2166"],
          ["Costs (C)", "C1 Investment cost", "0.1485"],
          ["", "C2 Operation cost", "0.2000"],
          ["", "C3 Maintenance cost", "0.1296"],
          ["", "C4 Land use", "0.4180"],
          ["", "C5 Ecological damage", "0.1038"],
          ["Risks (R)", "R1 Dependency on foreign technology", "0.1737"],
          ["", "R2 Challenges regarding investments", "0.0464"],
          ["", "R3 Technological immaturity", "0.2169"],
          ["", "R4 Unsuitability of potential site", "0.2901"],
          ["", "R5 Instability of energy resource", "0.2045"],
          ["", "R6 Social resistance", "0.0684"]
        ]
      },
      notes: "Transcribed all rows fully without omission.",
      evidence: {
        page: 31,
        locator_type: "table",
        locator_id: "Table 5",
        quote: "Final relative weights of criteria in BOCR subnetworks."
      }
    },
    {
      kind: "table",
      label: "Table 6",
      caption: "Alternative sources' ranks according to the standard formulas.",
      content: {
        columns: [
          "Policy",
          "B (0.374)",
          "O (0.347)",
          "C (0.203)",
          "R (0.076)",
          "Rank Additive (probabilistic)",
          "Rank Additive (negative)",
          "Rank Multiplicative"
        ],
        rows: [
          ["E1 Hydro", "0.3059", "0.4184", "0.0445", "0.2434", "1", "1", "1"],
          ["E2 Geothermal", "0.1599", "0.0803", "0.0620", "0.0790", "4", "4", "2"],
          ["E3 Solar", "0.2506", "0.2559", "0.1738", "0.2529", "2", "2", "3"],
          ["E4 Wind", "0.2172", "0.1862", "0.2798", "0.3132", "3", "3", "4"],
          ["E5 Biomass", "0.0664", "0.0592", "0.4399", "0.1115", "5", "5", "5"]
        ]
      },
      notes: "Shows BOCR scores for alternatives and their final ranks using different synthesis formulas.",
      evidence: {
        page: 31,
        locator_type: "table",
        locator_id: "Table 6",
        quote: "Alternative sources' ranks according to the standard formulas."
      }
    }
  ],
  empirical_data: {
    n_respondents: 8,
    aggregation: "AIJ",
    n_alternatives: 5,
    n_criteria: { total: 19, B: 4, O: 4, C: 5, R: 6 },
    bocr_weights: { B: 0.374, O: 0.347, C: 0.203, R: 0.076 },
    scores_by_method: {
      Benefits: { E1: 0.3059, E2: 0.1599, E3: 0.2506, E4: 0.2172, E5: 0.0664 },
      Opportunities: { E1: 0.4184, E2: 0.0803, E3: 0.2559, E4: 0.1862, E5: 0.0592 },
      Costs: { E1: 0.0445, E2: 0.062, E3: 0.1738, E4: 0.2798, E5: 0.4399 },
      Risks: { E1: 0.2434, E2: 0.079, E3: 0.2529, E4: 0.3132, E5: 0.1115 }
    },
    rankings_by_method: {
      "Additive (probabilistic)": { E1: 0, E2: 0, E3: 0, E4: 0, E5: 0 },
      "Additive (negative)": { E1: 0, E2: 0, E3: 0, E4: 0, E5: 0 },
      Multiplicative: { E1: 0, E2: 0, E3: 0, E4: 0, E5: 0 }
    },
    concordance: null,
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "ANP transforms qualitative evaluations into quantitative numerical metrics, facilitating comparative analysis.",
      verbatim_quote: "ANP can transform qualitative values into numerical values for comparative analysis",
      evidence: {
        page: 27,
        locator_type: "section",
        locator_id: "3.1. The ANP method",
        quote: "ANP can transform qualitative values into numerical values for comparative analysis"
      },
      usable_as: "definition"
    },
    {
      claim: "Multiple decision makers are preferable to avoid bias and maintain impartiality in the decision process.",
      verbatim_quote: "Multiple decision makers are often preferred rather than a single decision maker, to avoid bias and minimize partiality in the decision process.",
      evidence: {
        page: 32,
        locator_type: "section",
        locator_id: "6. Conclusion",
        quote: "Multiple decision makers are often preferred rather than a single decision maker, to avoid bias and minimize partiality in the decision process."
      },
      usable_as: "recommendation"
    },
    {
      claim: "ANP enables the combined evaluation of both qualitative and quantitative criteria during decision-making.",
      verbatim_quote: "ANP allows the simultaneous evaluation of qualitative and quantitative criteria in the decision making process.",
      evidence: {
        page: 32,
        locator_type: "section",
        locator_id: "6. Conclusion",
        quote: "ANP allows the simultaneous evaluation of qualitative and quantitative criteria in the decision making process."
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "The model's application is country-specific, as strategic and BOCR criteria depend on the country's specific energy characteristics, development needs, and perspectives."
  ],
  recommendations: [
    "Taking the comments of experts from different sectors that are related to the problem improves the effectiveness and correctness of the decision.",
    "Evaluating and prioritizing strategic energy policies based on BOCR criteria is important to estimate probable risks of the future so precautions could be taken."
  ],
  cites: ["saaty1996", "wijnmalen2007", "ozdemir2003"],
  cited_by_context: {
    saaty1996: "Cited as the founder of the Analytic Network Process (ANP) and for decision making with dependence and feedback.",
    wijnmalen2007: "Cited regarding the analysis and critical validation of Benefits, Opportunities, Costs, and Risks (BOCR) with AHP-ANP.",
    ozdemir2003: "Cited for negative priorities and standard formulas used in synthesizing BOCR networks."
  },
  notes: [
    "Aggregation method is indicated as AIJ (Aggregation of Individual Judgments) since the authors clearly state: 'pairwise comparisons... are performed by the expert team and the comparison results are combined by geometric mean' (page 27).",
    "In Formula 1 and Formula 4, the original text contains 'Narmalized' due to OCR/typographical errors in the published version. It has been corrected to 'Normalized' in the LaTeX transcription for exact mathematical integrity.",
    "Equation 5 states 'P_i = BO / CR', transcribed exactly as requested despite normally expecting subscripts for B, O, C, and R as seen in equations 1-4.",
    "[Sanitized] cr_values (original): IR values reported for specific matrices: 8.2% (strategic criteria), 7.4% (alternatives depending on R2).",
    "[Sanitized] aggregation (original): geometric mean"
  ]
};

export default article;
