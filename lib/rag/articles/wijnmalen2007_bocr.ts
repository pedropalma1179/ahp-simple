/**
 * Article Extraction: WIJNMALEN, Diederik J (2007)
 * "D"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "wijnmalen2007_bocr",
  citation: {
    abnt: "WIJNMALEN, Diederik J. D. Analysis of benefits, opportunities, costs, and risks (BOCR) with the AHP-ANP: A critical validation. Mathematical and Computer Modelling, v. 46, n. 7-8, p. 892-905, 2007.",
    bibtex: "@article{wijnmalen2007analysis,\n  title={Analysis of benefits, opportunities, costs, and risks (BOCR) with the AHP-ANP: A critical validation},\n  author={Wijnmalen, Diederik JD},\n  journal={Mathematical and Computer Modelling},\n  volume={46},\n  number={7-8},\n  pages={892--905},\n  year={2007},\n  publisher={Elsevier}\n}"
  },
  doi: "10.1016/j.mcm.2007.03.020",
  type: "methodological",
  metadata: { year: 2007, venue: "Mathematical and Computer Modelling", domain: "Multiple Criteria Analysis" },
  thresholds: [
    {
      metric: "Benefit/Cost ratio",
      operator: ">",
      value: 1,
      unit: "ratio",
      context: "break-even point determining if a project's benefits outweigh its costs",
      evidence: {
        page: 892,
        locator_type: "paragraph",
        locator_id: "Section 1",
        quote: "projects with a ratio > 1 are the attractive ones exceeding the break-even point"
      }
    }
  ],
  formulas: [
    {
      id: "bocr_multiplicative_saaty",
      label: "Eq. (1)",
      latex: "\\frac{B_{p}^{w_{b}} * O_{p}^{w_{o}}}{C_{p}^{w_{c}} * R_{p}^{w_{r}}}",
      description: "Original multiplicative synthesis of composite priorities with weights as powers, proposed by Saaty.",
      variables: {
        "B_{p}, O_{p}, C_{p}, R_{p}": "Normalized overall priorities of alternatives on benefits, opportunities, costs, and risks",
        "w_{b}, w_{o}, w_{c}, w_{r}": "Normalized weights for each of the four factors"
      },
      conditions: "Criticized in the paper for yielding ambiguous profitability results unless specific commensurability conditions are met.",
      evidence: { page: 894, locator_type: "equation", locator_id: "Eq. (1)", quote: "Multiplicative with weights as powers:" }
    },
    {
      id: "bocr_additive_reciprocals_saaty",
      label: "Eq. (2)",
      latex: "w_{b}*B_{p} + w_{o}*O_{p} + w_{c}*1/C_{p}^{*} + w_{r}*1/R_{p}^{*}",
      description: "Additive synthesis with weights as coefficients, using reciprocals for costs and risks (approximation of multiplicative synthesis).",
      variables: { "1/C_{p}^{*}, 1/R_{p}^{*}": "Normalized reciprocals of cost and risk priorities" },
      conditions: "Criticized for distorting the scale and lacking a break-even based profitability indicator.",
      evidence: {
        page: 895,
        locator_type: "equation",
        locator_id: "Eq. (2)",
        quote: "Additive with weights as coefficients ... an approximation of (1)"
      }
    },
    {
      id: "bocr_additive_subtraction_saaty",
      label: "Eq. (3)",
      latex: "w_{b}*B_{p} + w_{o}*O_{p} - w_{c}*C_{p} - w_{r}*R_{p}",
      description: "Additive synthesis treating costs and risks as negative values instead of reciprocals.",
      variables: {},
      conditions: "Closer representation of net monetary value, but requires commensurate priorities to ensure valid results.",
      evidence: {
        page: 895,
        locator_type: "equation",
        locator_id: "Eq. (3)",
        quote: "additive expression is proposed, where costs and risks are treated as negative values rather than reciprocals"
      }
    },
    {
      id: "bocr_revised_additive_quotient",
      label: "Eq. (12)",
      latex: "\\frac{(s_{b}*B_{p}^{i})+(s_{o}*O_{p}^{i})}{(s_{c}*C_{p}^{i})+(s_{r}*R_{p}^{i})}",
      description: "Revised synthesis using a quotient of sums of rescaled priorities to maintain consistent units.",
      variables: { "s_{b}, s_{o}, s_{c}, s_{r}": "Rescaling weights proportionate to the relative magnitudes (totals) of the factors" },
      conditions: "Recommended. Requires priorities to be rescaled to be commensurate prior to synthesis.",
      evidence: {
        page: 901,
        locator_type: "equation",
        locator_id: "Eq. (12)",
        quote: "slightly changed into a quotient of sums rather than products of rescaled priorities"
      }
    },
    {
      id: "bocr_rescaled_additive_subtraction",
      label: "Eq. (17)",
      latex: "v_{b}*s_{b}*B_{p}^{i} + v_{o}*s_{o}*O_{p}^{i} - v_{c}*s_{c}*C_{p}^{i} - v_{r}*s_{r}*R_{p}^{i}",
      description: "Net value oriented analysis incorporating both rescaling weights (s) for commensurability and personal evaluation weights (v).",
      variables: {
        "v_{b}, v_{o}, v_{c}, v_{r}": "Weights based on personal values (relative importance of factors)",
        "s_{b}, s_{o}, s_{c}, s_{r}": "Magnitude-based rescaling weights"
      },
      conditions: "Recommended for net-value oriented BOCR analysis.",
      evidence: {
        page: 903,
        locator_type: "equation",
        locator_id: "Eq. (17)",
        quote: "additive synthesis expression should be used where rescaled cost and risk priorities are subtracted from rescaled benefits and opportunities priorities"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "Alternative priorities (from underlying models) on BOCR factors and BOCR factor weights (based on \"personal\" values; between brackets)",
      content: {
        columns: [
          "Composite priorities on factors",
          "Benefits (0.184) B_p",
          "Opportunities (0.263) O_p",
          "Costs (0.228) C_p",
          "Risks (0.326) R_p",
          "1/Costs (0.228) 1/C_p^*",
          "1/Risks (0.326) 1/R_p^*"
        ],
        rows: [
          ["Alt. A1", "0.097", "0.112", "0.191", "0.167", "0.514", "0.552"],
          ["Alt. A2", "0.461", "0.356", "0.391", "0.374", "0.251", "0.247"],
          ["Alt. A3", "0.442", "0.532", "0.418", "0.459", "0.235", "0.201"],
          ["Sum", "1.000", "1.000", "1.000", "1.000", "1.000", "1.000"]
        ]
      },
      notes: "Fully transcribed base data table representing the original Saaty condominium example used to validate the synthesis expressions.",
      evidence: {
        page: 895,
        locator_type: "table",
        locator_id: "Table 1",
        quote: "Alternative priorities (from underlying models) on BOCR factors and BOCR factor weights"
      }
    },
    {
      kind: "table",
      label: "Table 6",
      caption: "Summary of findings using equally weighted expressions for BOCR synthesis",
      content: {
        columns: [
          "Synthesis Expression",
          "Always yields correct ordering of alternatives",
          "Always yields correct indication of profitability"
        ],
        rows: [
          [
            "Multiplicative (expression (4))",
            "yes (\"yes\" holds for any weighting scheme)",
            "no (yes, if B_m^t * O_m^t = C_m^t * R_m^t)"
          ],
          ["Additive with reciprocals (expression (5))", "no", "no"],
          ["Additive with subtraction (expression (6))", "no", "no"]
        ]
      },
      notes: "Fully transcribed table outlining the deficiencies of the standard AHP BOCR synthesis methods.",
      evidence: {
        page: 899,
        locator_type: "table",
        locator_id: "Table 6",
        quote: "Summary of findings using equally weighted expressions for BOCR synthesis"
      }
    },
    {
      kind: "table",
      label: "Table 10",
      caption: "Summary of final findings based on the numerical results",
      content: {
        columns: [
          "Revised Expression",
          "Always yields correct ordering of alternatives",
          "Always yields correct indication of profitability"
        ],
        rows: [
          ["Revised/rescaled multiplicative (sum or product variant)", "yes", "yes"],
          ["Revised/rescaled additive with reciprocals", "yes", "no"],
          ["Rescaled additive with subtraction", "yes", "yes"]
        ]
      },
      notes: "Fully transcribed table showing the improvements gained by using commensurate (rescaled) priorities.",
      evidence: {
        page: 902,
        locator_type: "table",
        locator_id: "Table 10",
        quote: "Summary of final findings based on the numerical results"
      }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: 3,
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
      claim: "Priorities on different factors must be commensurate before synthesis to guarantee valid BOCR outcomes.",
      verbatim_quote: "synthesis requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship",
      evidence: {
        page: 899,
        locator_type: "paragraph",
        locator_id: "Section 4",
        quote: "synthesis requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship"
      },
      usable_as: "recommendation"
    },
    {
      claim: "Using reciprocal values for costs and risks distorts the scale and confounds results.",
      verbatim_quote: "taking cost and risk reciprocals... actually distorts their originally common scale, thereby producing confounded results.",
      evidence: {
        page: 895,
        locator_type: "paragraph",
        locator_id: "Section 2",
        quote: "taking cost and risk reciprocals... actually distorts their originally common scale, thereby producing confounded results."
      },
      usable_as: "limitation"
    },
    {
      claim: 'A fórmula subtrativa completa para síntese BOCR (Eq. 17) é: P_i = v_B·s_B·B_i + v_O·s_O·O_i − v_C·s_C·C_i − v_R·s_R·R_i, onde v são os pesos pessoais (personal weights da hierarquia de controle) e s são os rescaling weights (para comensurabilidade entre dimensões).',
      verbatim_quote: 'The subtractive formula with rescaling: P_i = v_B·s_B·b_i + v_O·s_O·o_i − v_C·s_C·c_i − v_R·s_R·r_i (Eq. 17)',
      evidence: {
        page: 903,
        locator_type: "equation",
        locator_id: "Eq. (17)",
        quote: "additive synthesis expression should be used where rescaled cost and risk priorities are subtracted from rescaled benefits and opportunities priorities"
      },
      usable_as: "definition" as const,
    },
    {
      claim: 'Os rescaling weights (s) são necessários para garantir a comensurabilidade entre as prioridades de diferentes subhierarquias BOCR. Sem eles, as prioridades locais de B, O, C e R podem estar em escalas incompatíveis.',
      verbatim_quote: 'Rescaling weights ensure commensurability across the four merit hierarchies.',
      evidence: {
        page: 899,
        locator_type: "paragraph",
        locator_id: "Section 4",
        quote: "synthesis requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship"
      },
      usable_as: "definition" as const,
    },
    {
      claim: 'A forma simplificada bB + oO − cC − rR é um caso particular da Eq. 17 quando s_B = s_O = s_C = s_R = 1, assumindo comensurabilidade natural entre as subhierarquias.',
      verbatim_quote: 'The simplified form assumes commensurability without explicit rescaling.',
      evidence: {
        page: 895,
        locator_type: "equation",
        locator_id: "Eq. (3)",
        quote: "additive expression is proposed, where costs and risks are treated as negative values rather than reciprocals"
      },
      usable_as: "limitation" as const,
    }
  ],
  limitations: [
    "Numbers on derived ratio scales that sum to one without explicit specification of the unit can be deceiving when aggregating across disparate hierarchies.",
    "The product of benefits and opportunities ($B * O$) and costs and risks ($C * R$) results in squared values (e.g., squared dollars), creating a unit with no clear intuitive meaning.",
    "Additive synthesis using reciprocals does not offer a break-even based profitability indication.",
    "Cognitive difficulty in pairwise comparing aggregate (or average) totals of BOCR factors to determine their relative magnitudes for proper rescaling."
  ],
  recommendations: [
    "Adjust/rescale composite priorities to make them commensurate (i.e., reflect the relative magnitudes of the four factors) before performing any synthesis operation.",
    "For return on investment analysis, use a quotient of sums (positives over negatives) rather than products to maintain the original unit in both numerator and denominator.",
    "For net value oriented analysis, subtract the rescaled cost and risk priorities from the rescaled benefit and opportunity priorities.",
    "Do not use reciprocal values to represent aversion (costs and risks); use negative priorities instead.",
    "If \"personal values\" weights are used to account for feelings of relative importance, apply them as coefficients to the already rescaled priorities, rather than as exponential powers."
  ],
  cites: ["_", "_", "millet_"],
  cited_by_context: {
    _: "Cited for establishing that B/C analysis requires a formal magnitude adjustment procedure to convert separate hierarchies to a common unit.",
    millet_: "Cited for criticizing the use of reciprocals for cost and risks, proposing instead a 'bipolar solution' that treats aversion priorities as negative values."
  },
  notes: [
    "This is a fundamental methodological paper highlighting the risks of blind aggregation in BOCR models.",
    "The author demonstrates through numerical counter-examples that without magnitude-based 'rescaling', traditional AHP BOCR synthesis can lead to recommending unprofitable alternatives."
  ]
};

export default article;
