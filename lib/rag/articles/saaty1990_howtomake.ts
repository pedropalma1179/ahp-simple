/**
 * Article Extraction: SAATY, Thomas L (1990)
 * "How to make a decision: The Analytic Hierarchy Process"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saaty1990_howtomake",
  citation: {
    abnt: "SAATY, Thomas L. How to make a decision: The Analytic Hierarchy Process. European Journal of Operational Research, v. 48, n. 1, p. 9-26, 1990.",
    bibtex: "@article{saaty1990how,\n  title={How to make a decision: The Analytic Hierarchy Process},\n  author={Saaty, Thomas L},\n  journal={European Journal of Operational Research},\n  volume={48},\n  number={1},\n  pages={9--26},\n  year={1990},\n  publisher={Elsevier}\n}"
  },
  doi: "10.1016/0377-2217(90)90057-I",
  type: "methodological",
  metadata: { year: 1990, venue: "European Journal of Operational Research", domain: "Operations Research / Decision Making" },
  thresholds: [
    {
      metric: "Consistency Ratio (CR)",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency threshold to accept the estimate of the principal eigenvector ",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "carefully specified to be about 10% or less), we accept the estimate of w."
      }
    },
    {
      metric: "Matrix size (n)",
      operator: "≤",
      value: 9,
      unit: "elements",
      context: "maximum recommended number of elements to be compared simultaneously to ensure consistency ",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Section 7",
        quote: "number of elements being compared must be small (not more than 9) to improve consistency"
      }
    }
  ],
  formulas: [
    {
      id: "consistency_index",
      label: "Consistency Index (CI)",
      latex: "\\text{CI} = \\frac{\\lambda_{\\max}-n}{n-1}",
      description: "Calculates the consistency index of a reciprocal matrix as the negative average of its non-principal eigenvalues.",
      variables: { "\\lambda_{\\max}": "Principal eigenvalue", n: "Order of the matrix" },
      conditions: "Used to assess the internal consistency of paired comparisons before calculating the final priority vector.",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "For the consistency index (CI), we adopt the value (λ_{max}-n)/(n-1)"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "The fundamental scale",
      content: {
        columns: ["Intensity of importance", "Definition", "Explanation"],
        rows: [
          ["1", "Equal importance", "Two activities contribute equally to the objective"],
          [
            "3",
            "Moderate importance of one over another",
            "Experience and judgment strongly favor one activity over another"
          ],
          [
            "5",
            "Essential or strong importance",
            "Experience and judgement strongly favor one activity over another"
          ],
          [
            "7",
            "Very strong importance",
            "An activity is strongly favored and its dominance demonstrated in practice"
          ],
          [
            "9",
            "Extreme importance",
            "The evidence favoring one activity over another is of the highest possible order of affirmation"
          ],
          [
            "2, 4, 6, 8",
            "Intermediate values between the two adjacent judgments",
            "When compromise is needed"
          ],
          [
            "Reciprocals",
            "If activity i has one of the above numbers assigned to it when compared with activity j, then j has the reciprocal value when compared with i",
            ""
          ],
          [
            "Rationals",
            "Ratios arising from the scale",
            "If consistency were to be forced by obtaining n numerical values to span the matrix"
          ]
        ]
      },
      notes: "Fully transcribed fundamental 1-9 AHP scale definition.",
      evidence: { page: null, locator_type: "table", locator_id: "Table 1", quote: "The fundamental scale" }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: 3,
    n_criteria: { total: 8, B: null, O: null, C: null, R: null },
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
      claim: "Rank reversal within utility theory, even under a single criterion, is a counterintuitive flaw that lacks a rigorous mathematical solution.",
      verbatim_quote: "This is a phenomenon that is strongly counterintuitive and can never be made mathematically right.",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Section 11",
        quote: "This is a phenomenon that is strongly counterintuitive and can never be made mathematically right."
      },
      usable_as: "limitation"
    },
    {
      claim: "Normalizing variables from a standard scale separately across multiple criteria distorts their linear relationships and invalidates the results.",
      verbatim_quote: "normalizing separate sets of numbers destroys the linear relation among them.",
      evidence: {
        page: null,
        locator_type: "paragraph",
        locator_id: "Section 12",
        quote: "normalizing separate sets of numbers destroys the linear relation among them."
      },
      usable_as: "limitation"
    }
  ],
  limitations: [
    "The normalization and composition of weights of alternatives with respect to more than a single criterion measured on the same standard scale leads to nonsensical numbers.",
    "Absolute measurement is strongly subjective as it relies on standards stored in memory, unlike relative measurement which is based on direct observation of relative intensity."
  ],
  recommendations: [
    "When constructing hierarchies, include enough detail to represent the problem thoroughly, but avoid excessive detail that could cause a loss of sensitivity to changes in the elements.",
    "Limit the number of elements compared simultaneously in a cluster to no more than nine to preserve cognitive capability and matrix consistency.",
    "To appropriately maximize the Benefit/Cost ratio when outcomes are close, it is equivalent to maximize log(B/C) or to use the Return on Investment (ROI) approximation: (B-C)/C."
  ],
  cites: ["", ""],
  cited_by_context: {
    "": "Cited for the mathematical proof that a positive matrix has a simple positive principal eigenvalue, establishing the core mathematical validity of the AHP derivation method."
  },
  notes: [
    "Este artigo fornece uma defesa robusta da medição relativa versus medição absoluta, elucidando o raciocínio epistemológico por trás do AHP.",
    "Aborda brevemente a síntese de Benefícios e Custos (B/C), apontando os perigos de utilizar diferenças simples (B-C) e sugerindo o uso de divisões (B/C) ou ROI para preservar a escalabilidade proporcional.",
    "[Sanitized] cr_values (original): Ranges from 0.000 to 0.213 across different sub-matrices "
  ]
};

export default article;
