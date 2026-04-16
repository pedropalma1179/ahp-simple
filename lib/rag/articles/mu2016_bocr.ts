/**
 * Article Extraction: MU, E (2016)
 * "Using AHP BOCR analysis for experiential business education and prioritisation of international o..."
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "mu2016_bocr",
  citation: {
    abnt: "MU, E. Using AHP BOCR analysis for experiential business education and prioritisation of international opportunities. International Journal of Business and Systems Research, v. 10, n. 2/3/4, p. 364-393, 2016.",
    bibtex: "@article{mu2016bocr,\n  title={Using AHP BOCR analysis for experiential business education and prioritisation of international opportunities},\n  author={Mu, Enrique},\n  journal={International Journal of Business and Systems Research},\n  volume={10},\n  number={2/3/4},\n  pages={364--393},\n  year={2016},\n  publisher={Inderscience Enterprises Ltd.}\n}"
  },
  doi: null,
  type: "application",
  metadata: {
    year: 2016,
    venue: "International Journal of Business and Systems Research",
    domain: "Management Education / International Cooperation"
  },
  thresholds: [
    {
      metric: "CR",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency",
      evidence: {
        page: 371,
        locator_type: "paragraph",
        locator_id: "3.1.3",
        quote: "CR values of 0.1 or below constitute acceptable consistency."
      }
    }
  ],
  formulas: [
    {
      id: "consistency_index",
      label: "CI Formula",
      latex: "CI = (\\lambda_{max} - N)/(N-1)",
      description: "Consistency index proposed to assess matrix consistency.",
      variables: { CI: "Consistency Index", "\\lambda_{max}": "Matrix maximal eigenvalue", N: "Matrix dimension" },
      conditions: "Used to calculate the consistency ratio.",
      evidence: {
        page: 371,
        locator_type: "paragraph",
        locator_id: "3.1.3",
        quote: "Saaty (1980) has proposed a consistency index (CI) as follows. CI = (max - N)/(N-1)"
      }
    },
    {
      id: "bocr_multiplicative",
      label: "Eq. (1)",
      latex: "(B \\times O) / (C \\times R)",
      description: "Standard multiplicative BOCR ratio analysis.",
      variables: { B: "Benefits", O: "Opportunities", C: "Costs", R: "Risks" },
      conditions: "Intuitive simplicity; used when factors are mostly intangible rather than monetary.",
      evidence: {
        page: 373,
        locator_type: "equation",
        locator_id: "(1)",
        quote: "Multiplicative ratio: (B*O)/(C*R) ... alternatives with larger nominators and/or smaller denominators will be the most attractive"
      }
    },
    {
      id: "bocr_additive_subtraction",
      label: "Eq. (2)",
      latex: "B + O - C - R",
      description: "Additive with subtraction formula for BOCR.",
      variables: { B: "Benefits", O: "Opportunities", C: "Costs", R: "Risks" },
      conditions: "Extension of the original net value approach (B-C).",
      evidence: {
        page: 373,
        locator_type: "equation",
        locator_id: "(2)",
        quote: "Additive with subtraction: B+O-C-R ... the opportunities add to the benefits and the risks subtract from them (as do the costs)."
      }
    },
    {
      id: "perspective_integration",
      label: "Priority Aggregation",
      latex: "P_{integrated} = \\prod_{i=1}^{n} P_i",
      description: "Aggregation of priorities obtained from different perspectives.",
      variables: { "P_{integrated}": "Integrated priority", P_i: "Priority from perspective i" },
      conditions: "Used for negotiation and conflict resolution by multiplying priorities from different perspectives.",
      evidence: {
        page: 378,
        locator_type: "paragraph",
        locator_id: "5",
        quote: "The approach consists of multiplying the priorities obtained under each perspective for each of the alternatives. This product constitutes the priority aggregation"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Figure 2",
      caption: "Intensity scale for criteria pairwise comparison",
      content: {
        columns: ["Relative intensity / Importance", "Explanation"],
        rows: [
          ["1", "Equal: Both criteria are equally important"],
          ["3", "Moderately: One criterion is moderately more important than the other"],
          ["5", "Strong: One criterion is strongly more important than the other"],
          ["7", "Very strong: One criterion is very strongly more important than the other"],
          ["9", "Extreme: One criterion is extremely more important than the other"],
          ["2,4,6,8", "Intermediate values: Compromise is needed"]
        ]
      },
      notes: "Standard Saaty fundamental scale.",
      evidence: { page: 370, locator_type: "figure", locator_id: "2", quote: "Intensity scale for criteria pairwise comparison" }
    },
    {
      kind: "table",
      label: "Table 4",
      caption: "BOCR analysis of integrated perspectives",
      content: {
        columns: ["Alternative", "B", "O", "C", "R", "B*O/C*R", "BOCR normal", "Rank"],
        rows: [
          ["Bright Kids", "0.169", "0.345", "0.453", "0.406", "0.317", "0.010", "3"],
          ["Entebbe School", "0.723", "0.351", "0.503", "0.026", "19.159", "0.588", "1"],
          ["Children's Rights", "0.012", "0.072", "0.032", "0.425", "0.063", "0.002", "4"],
          ["Human Trafficking", "0.096", "0.232", "0.012", "0.143", "13.061", "0.401", "2"]
        ]
      },
      notes: "Shows the multiplicative synthesis results for integrated school perspectives.",
      evidence: { page: 380, locator_type: "table", locator_id: "4", quote: "BOCR analysis of integrated perspectives" }
    },
    {
      kind: "table",
      label: "Table 5 (Part 2)",
      caption: "BOCR weights based on strategic criteria",
      content: {
        columns: ["Metric", "Weight"],
        rows: [
          ["Benefits weight (b)", "0.456"],
          ["Opportunities weight (o)", "0.202"],
          ["Costs weight (c)", "0.245"],
          ["Risks weight (r)", "0.098"]
        ]
      },
      notes: "Weights derived from strategic criteria prioritization.",
      evidence: {
        page: 382,
        locator_type: "table",
        locator_id: "5",
        quote: "Weighted benefits ... weighted costs ... weighted opportunities ... weighted risks"
      }
    }
  ],
  empirical_data: {
    n_respondents: 54,
    aggregation: "AIJ",
    n_alternatives: 4,
    n_criteria: { total: null, B: 3, O: 3, C: 3, R: 3 },
    bocr_weights: { B: 0.456, O: 0.202, C: 0.245, R: 0.098 },
    scores_by_method: {
      multiplicative: { Entebbe: 0.588, Trafficking: 0.401, BrightKids: 0.01, Rights: 0.002 }
    },
    rankings_by_method: null,
    concordance: null,
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "The multiplicative BOCR ratio may not always identify correct profitability.",
      verbatim_quote: "multiplicative formula may always give the correct ordering for alternatives, it may not always provide a correct indication of profitability",
      evidence: {
        page: 373,
        locator_type: "paragraph",
        locator_id: "3.2.2",
        quote: "multiplicative formula may always give the correct ordering for alternatives, it may not always provide a correct indication of profitability"
      },
      usable_as: "limitation"
    },
    {
      claim: "BOCR distinguishes benefits/costs from opportunities/risks by certainty.",
      verbatim_quote: "Can we reasonably be sure this benefit will occur?'; If the answer is 'Yes' it is a benefit, if the answer is 'No' it is an opportunity.",
      evidence: {
        page: 373,
        locator_type: "paragraph",
        locator_id: "3.2.1",
        quote: "Can we reasonably be sure this benefit will occur?'; If the answer is 'Yes' it is a benefit, if the answer is 'No' it is an opportunity."
      },
      usable_as: "definition"
    },
    {
      claim: "AHP handles both tangible and intangible factors.",
      verbatim_quote: "consider both tangible and intangible factors for the assessment process; this is also one of the strengths of the AHP",
      evidence: {
        page: 369,
        locator_type: "paragraph",
        locator_id: "3",
        quote: "consider both tangible and intangible factors for the assessment process; this is also one of the strengths of the AHP"
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "Does not consider higher-level feasibility (e.g. Uganda vs. domestic projects).",
    "Analysis is based only on specific school perspectives.",
    "Multiplicative formula identified as potentially problematic for profitability identification (citing Wijnmalen)."
  ],
  recommendations: [
    "Use multiplicative BOCR analysis for students due to intuitive simplicity.",
    "Use a 'train the trainer' model for international expertise sharing.",
    "Integrate multiple perspectives by multiplying priorities.",
    "Perform sensitivity analysis by varying B, O, C, R weights."
  ],
  cites: ["saaty1980", "wijnmalen2007", "millet_schoner2005"],
  cited_by_context: {
    saaty1980: "Foundational AHP and consistency index.",
    wijnmalen2007: "Validation of BOCR and suggestion for re-scaling priorities.",
    millet_schoner2005: "Criticism of additive/reciprocal BOCR formula."
  },
  notes: [
    "O artigo descreve detalhadamente 4 fórmulas de síntese BOCR (Multiplicativa simples, Aditiva com subtração, Razão de somas e Aditiva ponderada).",
    "A técnica de integração de grupos usada é a multiplicação das prioridades das alternativas (equivalente à média geométrica das prioridades finais).",
    "A análise de sensibilidade é realizada variando os pesos b, o, c, r no modelo aditivo (p. 382).",
    "[Sanitized] cr_values (original): ≤ 0.1 (enforced by teams)",
    "[Sanitized] sensitivity (original): Results are robust; Entebbe remains best unless Costs weight > 0.5.",
    "[Sanitized] rankings_by_method (original): Entebbe School > End Human Trafficking > Bright Kids > Children's Rights",
    "[Sanitized] aggregation (original): AIJ-like (multiplication of priorities)"
  ]
};

export default article;
