/**
 * Article Extraction: PETRILLO, A.; SALOMON, V (2023)
 * "A"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "petrillo2023state",
  citation: {
    abnt: "PETRILLO, A.; SALOMON, V. A. P.; TRAMARICO, C. L. State-of-the-Art Review on the Analytic Hierarchy Process with Benefits, Opportunities, Costs, and Risks. Journal of Risk and Financial Management, v. 16, n. 8, p. 372, 2023.",
    bibtex: "@article{petrillo2023state,\n  title={State-of-the-Art Review on the Analytic Hierarchy Process with Benefits, Opportunities, Costs, and Risks},\n  author={Petrillo, Antonella and Salomon, Valerio Antonio Pamplona and Tramarico, Claudemir Leif},\n  journal={Journal of Risk and Financial Management},\n  volume={16},\n  number={8},\n  pages={372},\n  year={2023},\n  publisher={MDPI}\n}"
  },
  doi: "10.3390/jrfm16080372",
  type: "review",
  metadata: {
    year: 2023,
    venue: "Journal of Risk and Financial Management",
    domain: "Multi-criteria decision making (MCDM) / BOCR"
  },
  thresholds: [],
  formulas: [
    {
      id: "bocr_additive_positive",
      label: "Eq. (1)",
      latex: "x = Bb + Oo + Cc + Rr",
      description: "Additive synthesis method for BOCR containing only positive priorities.",
      variables: {
        x: "overall priority",
        "B, O, C, R": "weights of each BOCR criterion",
        "b, o, c, r": "priorities of the alternative according to each criterion"
      },
      conditions: "Only in Equation (1) are there positive priorities.",
      evidence: {
        page: 4,
        locator_type: "equation",
        locator_id: "Eq. (1)",
        quote: "Only in Equation (1) are there positive priorities."
      }
    },
    {
      id: "bocr_additive_reciprocal",
      label: "Eq. (2)",
      latex: "x = Bb + Oo + C(1/c) + R(1/r)",
      description: "Additive synthesis method for BOCR using reciprocals for negative priorities (costs and risks).",
      variables: {
        x: "overall priority",
        "B, O, C, R": "weights of each BOCR criterion",
        "b, o, c, r": "priorities of the alternative according to each criterion"
      },
      conditions: "Equation (2) has negative priorities obtained with comparison matrices.",
      evidence: {
        page: 4,
        locator_type: "equation",
        locator_id: "Eq. (2)",
        quote: "Equation (2) has negative priorities obtained with comparison matrices."
      }
    },
    {
      id: "bocr_additive_residual",
      label: "Eq. (3)",
      latex: "x = Bb + Oo + C(1-c) + R(1-r)",
      description: "Additive synthesis method for BOCR using complementary/residual values for negative priorities.",
      variables: {
        x: "overall priority",
        "B, O, C, R": "weights of each BOCR criterion",
        "b, o, c, r": "priorities of the alternative according to each criterion"
      },
      conditions: "Equation (3) deals with the concept of residual or complimentary values.",
      evidence: {
        page: 4,
        locator_type: "equation",
        locator_id: "Eq. (3)",
        quote: "Equation (3) deals with the concept of residual or complimentary values."
      }
    },
    {
      id: "bocr_multiplicative",
      label: "Eq. (4)",
      latex: "x = \\frac{b^{B}o^{O}}{c^{C}r^{R}}",
      description: "Multiplicative synthesis method (tradeoff) for BOCR priorities.",
      variables: {
        x: "overall priority",
        "B, O, C, R": "weights of each BOCR criterion",
        "b, o, c, r": "priorities of the alternative according to each criterion"
      },
      conditions: "Equation (4) highlights a tradeoff between benefits and costs and costs and risks.",
      evidence: {
        page: 4,
        locator_type: "equation",
        locator_id: "Eq. (4)",
        quote: "Equation (4) highlights a tradeoff between benefits and costs and costs and risks."
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 2",
      caption: "Most cited documents on BOCR.",
      content: {
        columns: ["Document", "Citations", "Subject"],
        rows: [
          ["1", "Demirtas and Ustun (2008)", "310", "Supply chain management"],
          ["2", "Lee (2009)", "305", "Supply chain management"],
          ["3", "Lee et al. (2009)", "232", "Energy and supply chain management"],
          ["4", "Ustun and Demirtas (2008)", "159", "Supply chain management"],
          ["5", "Kabak and Dagdeviren (2014)", "156", "Energy management"],
          ["6", "Demirtas and Ustun (2009)", "146", "Supply chain management"],
          ["7", "Alizadeh et al. (2020)", "134", "Energy management"],
          ["8", "Wijnmalen (2007)", "119", "Methodology"],
          ["9", "Yap and Nixon (2015)", "116", "Project management"],
          ["10", "Liang and Li (2008)", "97", "Information technology"]
        ]
      },
      notes: "Transcribed verbatim as it represents the core literature map established by the review.",
      evidence: { page: 7, locator_type: "table", locator_id: "Table 2", quote: "Most cited documents on BOCR." }
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
      claim: "BOCR models ensure a mutually exclusive and collectively exhaustive set of criteria.",
      verbatim_quote: "The use of an MCDM model with these four main criteria aims for a mutually exclusive and collectively exhaustive (MECE) set of criteria.",
      evidence: {
        page: 2,
        locator_type: "paragraph",
        locator_id: "Section 1",
        quote: "The use of an MCDM model with these four main criteria aims for a mutually exclusive and collectively exhaustive (MECE) set of criteria."
      },
      usable_as: "definition"
    },
    {
      claim: "Negative priorities can emerge when comparing costly alternatives directly.",
      verbatim_quote: "if an alternative i is more costly than j, and a_ij > 1, there are negative priorities: the most costly alternative receives the greatest w_i",
      evidence: {
        page: 4,
        locator_type: "paragraph",
        locator_id: "Section 2",
        quote: "if an alternative i is more costly than j, and a_ij > 1, there are negative priorities: the most costly alternative receives the greatest w_i"
      },
      usable_as: "definition"
    }
  ],
  limitations: [],
  recommendations: [
    "Methodological contributions for instance, comparing the BOCR model with other models, such as environmental, social, and corporate governance (ESG); strengths-weaknesses-opportunities-threats (SWOT) analysis; and value, rarity, imitation, and organization (VRIO) questions",
    "Practical contributions applying BOCR in other areas different from the usual fields of business, computer sciences, and engineering."
  ],
  cites: ["", "", "saaty_"],
  cited_by_context: {
    "": "Cited as a methodological cornerstone for BOCR and highlighted as the only document among the top 10 most cited focused strictly on the BOCR methodology.",
    saaty_: "Referenced for the concept of negative priorities occurring when elements are too risky compared to others."
  },
  notes: [
    "This is a state-of-the-art literature review focused strictly on mapping the BOCR paradigm within MCDM/AHP literature.",
    "The paper does not contain a primary empirical dataset; therefore empirical parameters (CR values, empirical sample sizes) are absent.",
    "Section 2 effectively synthesizes the 4 distinct mathematical ways to calculate overall BOCR priorities (additive vs multiplicative frameworks, dealing with negative priorities)."
  ]
};

export default article;
