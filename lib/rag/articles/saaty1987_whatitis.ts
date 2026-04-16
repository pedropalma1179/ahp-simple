/**
 * Article Extraction: SAATY, Rozann W (1987)
 * "The analytic hierarchy process—what it is and how it is used"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saaty1987_whatitis",
  citation: {
    abnt: "SAATY, Rozann W. The analytic hierarchy process—what it is and how it is used. Mathematical Modelling, v. 9, n. 3-5, p. 161-176, 1987.",
    bibtex: "@article{saaty1987whatitis,\n  title={The analytic hierarchy process—what it is and how it is used},\n  author={Saaty, Rozann W},\n  journal={Mathematical Modelling},\n  volume={9},\n  number={3-5},\n  pages={161--176},\n  year={1987},\n  publisher={Elsevier}\n}"
  },
  doi: "10.1016/0270-0255(87)90473-8",
  type: "methodological",
  metadata: { year: 1987, venue: "Mathematical Modelling", domain: "Decision Theory / Operations Research" },
  thresholds: [
    {
      metric: "Consistency Ratio (C.R.)",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable threshold for matrix consistency",
      evidence: {
        page: 171,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "If it is not less than 0.10, study the problem and revise the judgments:"
      }
    }
  ],
  formulas: [
    {
      id: "consistency_index",
      label: "Consistency Index (C.I.)",
      latex: "\\text{C.I.} = \\frac{\\lambda_{\\max}-n}{n-1}",
      description: "Calculates the consistency index of a matrix of pairwise comparisons.",
      variables: { "\\lambda_{\\max}": "Principal eigenvalue", n: "Order of the matrix" },
      conditions: "Used as the numerator to determine the overall consistency ratio (C.R.).",
      evidence: {
        page: 171,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "The C.I. of a matrix of comparisons is given by C.I. = (\\lambda_{max} - n)/(n - 1)."
      }
    },
    {
      id: "row_geometric_mean",
      label: "Geometric Mean Approximation",
      latex: "w_i \\approx \\sqrt[n]{\\prod_{j=1}^n a_{ij}}",
      description: "Approximation of the principal eigenvector obtained by normalizing the geometric means of the rows.",
      variables: { "a_{ij}": "Comparison value at row i and column j", n: "Order of the matrix" },
      conditions: "Can lead to rank reversal; recommended only for matrices n < 3 or non-important applications.",
      evidence: {
        page: 170,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "An easy way to get an approximation to the priorities is to normalize the geometric means of the rows."
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "The fundamental scale",
      content: {
        columns: ["Intensity of importance on an absolute scale", "Definition", "Explanation"],
        rows: [
          ["1", "Equal importance", "Two activities contribute equally to the objective"],
          [
            "3",
            "Moderate importance of one over another",
            "Experience and judgment slightly favor one activity over another"
          ],
          [
            "5",
            "Essential or strong importance",
            "Experience and judgment strongly favor one activity over another"
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
      notes: "Transcrição fiel. Pequenos erros de OCR da digitalização original foram corrigidos para coerência (ex: a nota 3 continha a palavra 'strongly' repetida da 5 na digitalização).",
      evidence: { page: 163, locator_type: "table", locator_id: "Table 1", quote: "The fundamental scale" }
    },
    {
      kind: "table",
      label: "Unnumbered Table",
      caption: "Random consistency index (R.I.)",
      content: {
        columns: ["n", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        rows: [
          [
            "Random consistency index (R.I.)",
            "0",
            "0",
            "0.58",
            "0.90",
            "1.12",
            "1.24",
            "1.32",
            "1.41",
            "1.45",
            "1.49"
          ]
        ]
      },
      notes: "Tabela de R.I. baseada em uma amostra aleatória de tamanho 500. Os valores exibem leves diferenças em relação a tabelas de publicações posteriores (ex: n=3 é 0.58 aqui, enquanto em outros textos costuma ser 0.52).",
      evidence: {
        page: 171,
        locator_type: "table",
        locator_id: "Section 3",
        quote: "Random consistency index (R.I.) 1 2 3 4 5 6 7 8 9 10"
      }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: 5,
    n_criteria: { total: 4, B: null, O: null, C: null, R: null },
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
      claim: "Approximating the principal eigenvector using geometric means can cause rank reversal and should be avoided.",
      verbatim_quote: "one should only use the eigenvector derivation procedure because approximations can lead to rank reversal in spite of the closeness",
      evidence: {
        page: 170,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "one should only use the eigenvector derivation procedure because approximations can lead to rank reversal in spite of the closeness"
      },
      usable_as: "recommendation"
    },
    {
      claim: "The geometric mean is mathematically required when aggregating group judgments because it satisfies the reciprocal property.",
      verbatim_quote: "any rule to combine the judgments of several individuals should also satisfy the reciprocal property. A proof that the geometric mean... satisfies this condition",
      evidence: {
        page: 174,
        locator_type: "paragraph",
        locator_id: "Section 5",
        quote: "any rule to combine the judgments of several individuals should also satisfy the reciprocal property. A proof that the geometric mean... satisfies this condition"
      },
      usable_as: "recommendation"
    },
    {
      claim: "The 10% inconsistency threshold is logically sound because consistency measurement errors should be an order of magnitude smaller than priority scales.",
      verbatim_quote: "The priority of consistency to obtain a coherent explanation of a set of facts must differ by an order of magnitude from the priority of inconsistency",
      evidence: {
        page: 172,
        locator_type: "paragraph",
        locator_id: "Section 4",
        quote: "The priority of consistency to obtain a coherent explanation of a set of facts must differ by an order of magnitude from the priority of inconsistency"
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "Perfect consistency is undesirable because it prevents the inclusion of new knowledge that requires continuous adjustment in understanding.",
    "Eigenvector approximations, such as normalizing row geometric means or column averaging, can lead to rank reversals even when the approximation values appear close."
  ],
  recommendations: [
    "Limit acceptable inconsistency to about 10% (0.10); if it is not less than 0.10, the problem should be studied and judgments revised.",
    "Only use the exact principal eigenvector derivation procedure for important applications, avoiding simple row or column approximations.",
    "Group judgments should be synthesized using the geometric mean, as it uniquely maintains the reciprocal property necessary for mathematical coherence without forcing consensus."
  ],
  cites: ["aczl_", ""],
  cited_by_context: {
    aczl_: "Cited to mathematically prove that the geometric mean is the unique synthesis method for combining group judgments that satisfies the reciprocal condition.",
    "": "Cited for providing the mathematical conditions under which accurate AHP results can be obtained using fewer judgments (Incomplete Pairwise Comparisons)."
  },
  notes: [
    "Artigo tutorial escrito por Rozann W. Saaty, altamente citado como introdução ao AHP.",
    "A tabela de Random Index possui uma variante de cálculo inicial na qual a amostra foi de 500, divergindo levemente dos valores clássicos conhecidos (ex: 0.58 para matrizes de ordem 3).",
    "[Sanitized] cr_values (original): 0.02 (para a matriz principal de critérios)"
  ]
};

export default article;
