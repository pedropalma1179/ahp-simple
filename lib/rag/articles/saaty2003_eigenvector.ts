/**
 * Article Extraction: SAATY, Thomas L (2003)
 * "Decision-making with the AHP: Why is the principal eigenvector necessary"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saaty2003_eigenvector",
  citation: {
    abnt: "SAATY, Thomas L. Decision-making with the AHP: Why is the principal eigenvector necessary. European Journal of Operational Research, v. 145, n. 1, p. 85-91, 2003.",
    bibtex: "@article{saaty2003decision,\n  title={Decision-making with the AHP: Why is the principal eigenvector necessary},\n  author={Saaty, Thomas L},\n  journal={European Journal of Operational Research},\n  volume={145},\n  number={1},\n  pages={85--91},\n  year={2003},\n  publisher={Elsevier}\n}"
  },
  doi: null,
  type: "methodological",
  metadata: { year: 2003, venue: "European Journal of Operational Research", domain: "Decision Aiding / Operational Research" },
  thresholds: [],
  formulas: [
    {
      id: "priority_eigenvector",
      label: "Priority Vector Invariance",
      latex: "Ax = cx",
      description: "A priority vector must satisfy this relation to remain invariant under hierarchic composition on a ratio scale.",
      variables: { A: "Positive reciprocal matrix", x: "Priority vector (principal eigenvector)", c: "Principal eigenvalue (c > 0)" },
      conditions: "Necessary condition for a priority vector to reproduce itself on a ratio scale and preserve the strength of preferences.",
      evidence: {
        page: 86,
        locator_type: "equation",
        locator_id: "Section 2",
        quote: "A priority vector x must satisfy the relation Ax=cx., c>0"
      }
    },
    {
      id: "hadamard_perturbation",
      label: "Reciprocal Perturbation",
      latex: "A = W \\circ E",
      description: "Defines a near consistent matrix as a small reciprocal (multiplicative) perturbation of a consistent matrix using the Hadamard product.",
      variables: { A: "Near consistent matrix", W: "Consistent matrix where w_i/w_j", E: "Perturbation matrix (\\epsilon_{ij})" },
      conditions: "Used to model human judgment matrices where inconsistency causes small deviations from perfect consistency.",
      evidence: {
        page: 87,
        locator_type: "equation",
        locator_id: "Section 3",
        quote: "It is given by the Hadamard product: A=W \\circ E. where W=(w_i/w_j) and E\\equiv(\\epsilon_{ij})"
      }
    },
    {
      id: "perron_root_derivative",
      label: "Derivative of Principal Eigenvalue",
      latex: "\\frac{\\partial \\lambda_{max}}{\\partial a_{ij}} = v_i w_j - a_{ji}^2 v_j w_i",
      description: "Calculates the rate of change in the principal eigenvalue with respect to an entry adjustment to identify which judgment most improves consistency.",
      variables: {
        "\\lambda_{max}": "Principal eigenvalue (Perron root)",
        "a_{ij}": "Matrix entry being evaluated",
        v: "Unique positive left eigenvector",
        w: "Right eigenvector (priority vector)"
      },
      conditions: "Applied to a positive reciprocal matrix to find the specific entry whose modification most efficiently reduces inconsistency.",
      evidence: {
        page: 88,
        locator_type: "equation",
        locator_id: "Section 4",
        quote: "c\\lambda_{max} / \\hat{c}a_{ij} = v_i w_j - a_{ji}^2 v_j w_i for all i, j=1,...,n"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "A family's house buying pairwise comparison matrix for the criteria",
      content: {
        columns: ["Criteria", "Size", "Trans.", "Nbrhd.", "Age", "Yard", "Modern", "Cond.", "Finance", "W", "D"],
        rows: [
          ["Size", "1", "5", "3", "7", "6", "6", "1/3", "1/4", "0.173", "0.047"],
          ["Trans.", "1/5", "1", "1/3", "3", "1/3", "1", "5", "6", "0.054", "0.188"],
          ["Nbrhd.", "1/3", "3", "1", "6", "3", "4", "1/5", "1/5", "0.117", "0.052"],
          ["Age", "1/7", "1/3", "1/6", "1", "1/3", "1/4", "1/7", "1/8", "0.018", "0.349"],
          ["Yard", "1/6", "3", "1/3", "3", "1", "1/2", "1/5", "1/6", "0.031", "0.190"],
          ["Modern", "1/6", "1", "1/4", "4", "2", "1", "1/5", "1/6", "0.036", "0.166"],
          ["Cond.", "3", "1/5", "5", "7", "5", "5", "1", "1/2", "0.167", "0.059"],
          ["Finance", "4", "1/6", "5", "8", "6", "6", "2", "1", "0.333", "0.020"],
          ["Metrics", "λ_max=9.669", "", "", "", "", "", "C.R.=0.17", "", "", ""]
        ]
      },
      notes: "Fully transcribed base matrix demonstrating a real-world inconsistent judgment matrix before applying the consistency improvement algorithm.",
      evidence: {
        page: 88,
        locator_type: "table",
        locator_id: "Table 1",
        quote: "A family's house buying pairwise comparison matrix for the criteria"
      }
    },
    {
      kind: "table",
      label: "Table 5",
      caption: "Modified matrix in the a37 and a73 positions",
      content: {
        columns: ["Criteria", "Size", "Trans.", "Nbrhd.", "Age", "Yard", "Modern", "Cond.", "Finance", "W", "D"],
        rows: [
          ["Size", "1", "5", "3", "7", "6", "6", "1/3", "1/4", "0.175", "0.042"],
          ["Trans.", "1/5", "1", "1/3", "5", "3", "3", "1/5", "1/7", "0.062", "0.114"],
          ["Nbrhd.", "1/3", "3", "1", "6", "3", "4", "1/2", "1/5", "0.103", "0.063"],
          ["Age", "1/7", "1/5", "1/6", "1", "1/3", "1/4", "1/7", "1/8", "0.019", "0.368"],
          ["Yard", "1/6", "1/3", "1/3", "3", "1", "1/2", "1/5", "1/6", "0.034", "0.194"],
          ["Modern", "1/6", "1/3", "1/4", "4", "2", "1", "1/5", "1/6", "0.041", "0.168"],
          ["Cond.", "3", "5", "2", "7", "5", "5", "1", "1/2", "0.221", "0.030"],
          ["Finance", "4", "7", "5", "8", "6", "6", "2", "1", "0.345", "0.021"],
          ["Metrics", "λ_max=8.811", "", "", "", "", "", "C.R.=0.083", "", "", ""]
        ]
      },
      notes: "Fully transcribed result matrix showing the C.R. improvement (from 0.17 to 0.083) after changing the (3,7) position judgment.",
      evidence: { page: 90, locator_type: "table", locator_id: "Table 5", quote: "Modified matrix in the a37 and a73 positions" }
    }
  ],
  empirical_data: {
    n_respondents: 1,
    aggregation: null,
    n_alternatives: null,
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
      claim: "The principal eigenvector is the mathematically mandatory method to represent priorities derived from a near-consistent positive reciprocal matrix.",
      verbatim_quote: "the principal eigenvector is necessary for representing the priorities associated with that matrix",
      evidence: {
        page: 90,
        locator_type: "paragraph",
        locator_id: "Section 5",
        quote: "the principal eigenvector is necessary for representing the priorities associated with that matrix"
      },
      usable_as: "definition"
    },
    {
      claim: "A certain degree of inconsistency in human judgment is both inevitable and desirable when evaluating intangibles.",
      verbatim_quote: "a modicum of inconsistency may be considered as a good thing and forced consistency... as an undesirable compulsion.",
      evidence: {
        page: 86,
        locator_type: "paragraph",
        locator_id: "Section 1",
        quote: "a modicum of inconsistency may be considered as a good thing and forced consistency... as an undesirable compulsion."
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "Perfect mathematical consistency (a completely consistent matrix) does not guarantee validity; when dealing with tangibles, a perfectly consistent matrix can still be completely disconnected from true, real-world values.",
    "Forcing decision-makers to be perfectly consistent treats them like robots, removing their ability to genuinely reflect their true feelings, thoughts, and complex preferences regarding intangibles."
  ],
  recommendations: [
    "Accept that human judgment regarding intangibles will naturally be inconsistent, and focus on achieving 'near consistency' rather than perfect consistency.",
    "To improve the consistency of a matrix, compute the partial derivatives of the principal eigenvalue to identify which specific judgment (entry) is causing the largest rate of change in inconsistency.",
    "Alternatively, evaluate the Hadamard perturbation matrix and target the entry where the product of the judgment and the priority ratio is furthest from one."
  ],
  cites: ["", "saaty_"],
  cited_by_context: {
    "": "Cited for developing the method that uses the derivatives of the Perron root to efficiently identify which matrix entries to adjust in order to improve consistency.",
    saaty_: "Cited regarding the relationship between matrix inconsistency and rank preservation."
  },
  notes: [
    "Este artigo é uma defesa matemática fundamental de por que o autovetor principal (Perron vector) é a única solução válida para extrair prioridades no AHP quando há quase-consistência (near consistency).",
    "O documento também descreve os algoritmos subjacentes usados em softwares como Expert Choice e Superdecisions para sugerir correções de julgamento aos usuários, baseados na derivada do autovalor principal.",
    "Para ajudar na compreensão visual da otimização de matrizes, pode ser útil consultar um  que ilustre a convergência interativa demonstrada nas Tabelas 1 a 5.",
    "[Sanitized] cr_values (original): Improved from 0.17 to 0.083 through perturbation analysis"
  ]
};

export default article;
