/**
 * Article Extraction: T.L. Saaty and L.G. Vargas (1984)
 * "Inconsistency and Rank Preservation"
 *
 * Extracted on: 2026-05-05
 * Extraction prompt version: v4.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saatyVargas1984_rankpreservation",
  citation: {
    abnt: "SAATY, Thomas L.; VARGAS, Luis G. Inconsistency and rank preservation. Journal of Mathematical Psychology, v. 28, n. 2, p. 205-214, 1984.",
    bibtex: "@article{saaty1984inconsistency,\n  title={Inconsistency and rank preservation},\n  author={Saaty, Thomas L and Vargas, Luis G},\n  journal={Journal of Mathematical Psychology},\n  volume={28},\n  number={2},\n  pages={205--214},\n  year={1984},\n  publisher={Academic Press}\n}"
  },
  doi: "10.1016/0022-2496(84)90027-0",
  type: "foundational",
  metadata: {
    year: 1984,
    venue: "Journal of Mathematical Psychology",
    domain: "Decision Theory / AHP Foundations"
  },
  thresholds: [],
  formulas: [
    {
      id: "lsm_method",
      label: "Least Squares Method (LSM)",
      latex: "\\min \\sum_{i,j=1}^{n} (a_{ij} - x_i/x_j)^2",
      description: "Least Squares Method: finds priority vector x minimizing Euclidean distance between observed ratios and theoretical ratios.",
      variables: {
        "a_{ij}": "Observed pairwise comparison value",
        "x_i, x_j": "Priority components for alternatives i and j",
        "n": "Order of the reciprocal matrix"
      },
      conditions: "May yield non-unique solutions and reverse rank in cases where row dominance does not hold.",
      evidence: {
        page: 205,
        locator_type: "equation",
        locator_id: "Section 1",
        quote: "the method of least squares (LSM) which finds x by minimizing the Euclidean metric"
      }
    },
    {
      id: "llsm_method",
      label: "Logarithmic Least Squares Method (LLSM)",
      latex: "\\min \\sum_{i,j=1}^{n} (\\log a_{ij} - \\log x_i/x_j)^2",
      description: "Logarithmic Least Squares Method: finds priority vector x minimizing squared logarithmic differences. Coincides with geometric mean of rows for complete matrices.",
      variables: {
        "a_{ij}": "Observed pairwise comparison value",
        "x_i, x_j": "Priority components for alternatives i and j",
        "n": "Order of the reciprocal matrix"
      },
      conditions: "For n>4, LLSM does not use cross-row coefficients, leading to insensitivity to inconsistencies.",
      evidence: {
        page: 205,
        locator_type: "equation",
        locator_id: "Section 1",
        quote: "the method of logarithmic least squares (LLSM) which minimizes"
      }
    },
    {
      id: "em_method",
      label: "Eigenvector Method (EM)",
      latex: "Aw = \\lambda_{max} w",
      description: "Eigenvector Method: priority vector w is the principal right eigenvector of A corresponding to the maximum eigenvalue.",
      variables: {
        "A": "Positive reciprocal pairwise comparison matrix",
        "w": "Principal right eigenvector (priority vector)",
        "\\lambda_{max}": "Principal (largest) eigenvalue of A"
      },
      conditions: "Only method that directly captures inconsistency and preserves rank order from inconsistent data along chains of any length.",
      evidence: {
        page: 205,
        locator_type: "equation",
        locator_id: "Section 1",
        quote: "the eigenvector method (EM) which solves the problem Ax = lambda_max x"
      }
    },
    {
      id: "theorem1_row_dominance",
      label: "Theorem 1 (Row Dominance)",
      latex: "a_{ik} \\geq a_{jk} \\forall k \\Rightarrow x_i \\geq x_j",
      description: "If row i dominates row j entry-wise, then EM, LLSM, and LSM all preserve rank strongly: x_i \\geq x_j.",
      variables: {
        "a_{ik}, a_{jk}": "Entries in rows i and j of matrix A",
        "x_i, x_j": "Priority components for rows i and j",
        "k": "Column index"
      },
      conditions: "Row dominance is sufficient (but not necessary) for rank preservation across all three methods, regardless of consistency.",
      evidence: {
        page: 207,
        locator_type: "section",
        locator_id: "Theorem 1",
        quote: "EM, LLSM, and LSM preserve rank strongly"
      }
    },
    {
      id: "theorem4_ordinal_transitivity",
      label: "Theorem 4 (Ordinal Transitivity)",
      latex: "\\text{ordinally transitive} \\Rightarrow \\text{either } a_{ik} \\geq a_{i'k} \\forall k \\text{ or } a_{ik} \\leq a_{i'k} \\forall k",
      description: "In an ordinally transitive reciprocal matrix, given two rows i and i', one row entirely dominates the other across all columns.",
      variables: {
        "a_{ik}": "Entry in row i, column k",
        "a_{i'k}": "Entry in row i', column k"
      },
      conditions: "Holds for ordinally transitive reciprocal matrices. Connects ordinal transitivity to row dominance condition of Theorem 1.",
      evidence: {
        page: 209,
        locator_type: "section",
        locator_id: "Theorem 4",
        quote: "given i and i', either a_{ik} >= a_{i'k} for all k, or a_{ik} <= a_{i'k} for all k"
      }
    },
    {
      id: "theorem5_asymptotic_rows",
      label: "Theorem 5 (Asymptotic Convergence)",
      latex: "\\lim_{m \\to \\infty} \\frac{a_{ik}^{(m)}}{\\sum_{i=1}^{n} a_{ik}^{(m)}} = \\lim_{m \\to \\infty} \\frac{a_{is}^{(m)}}{\\sum_{i=1}^{n} a_{is}^{(m)}}",
      description: "For a positive reciprocal matrix, the normalized columns of A^m converge to the same vector as m grows, namely the principal eigenvector.",
      variables: {
        "a_{ik}^{(m)}": "Entry (i,k) of the matrix A raised to power m",
        "n": "Order of the matrix"
      },
      conditions: "Holds for any positive reciprocal matrix, even if inconsistent. Foundation for the asymptotic dominance argument.",
      evidence: {
        page: 209,
        locator_type: "section",
        locator_id: "Theorem 5",
        quote: "the normalized columns of A^m are the same in the limit"
      }
    },
    {
      id: "theorem6_eigenvector_dominance",
      label: "Theorem 6 (Limit yields Eigenvector)",
      latex: "\\lim_{m \\to \\infty} \\frac{a_{ik}^{(m)}}{\\sum_{i=1}^{n} a_{ik}^{(m)}} = w_i",
      description: "The limit of normalized row sums of A^m equals the i-th component of the principal right eigenvector w. The eigenvector emerges as the asymptotic dominance vector.",
      variables: {
        "a_{ik}^{(m)}": "Entry (i,k) of A^m",
        "w_i": "i-th component of the principal right eigenvector"
      },
      conditions: "Holds for any positive reciprocal matrix. Justifies EM as the method that captures cumulative dominance along all chain lengths.",
      evidence: {
        page: 211,
        locator_type: "section",
        locator_id: "Theorem 6",
        quote: "the powers of the above matrix eventually reveal the strict dominance"
      }
    }
  ],
  tables_figures: [],
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
      claim: "Only the principal eigenvector method directly addresses inconsistency and captures rank order inherent in inconsistent pairwise comparison data.",
      verbatim_quote: "only the principal eigenvector directly deals with the question of inconsistency and captures the rank order",
      evidence: {
        page: 205,
        locator_type: "abstract",
        locator_id: "Abstract",
        quote: "only the principal eigenvector directly deals with the question of inconsistency and captures the rank order"
      },
      usable_as: "definition"
    },
    {
      claim: "Row dominance (Theorem 1) is a sufficient condition for rank preservation by EM, LLSM, and LSM, regardless of matrix consistency.",
      verbatim_quote: "EM, LLSM, and LSM preserve rank strongly",
      evidence: {
        page: 207,
        locator_type: "section",
        locator_id: "Theorem 1",
        quote: "EM, LLSM, and LSM preserve rank strongly"
      },
      usable_as: "definition"
    },
    {
      claim: "LSM can yield non-unique solutions and reverse rank even when intuitively rank reversal should not occur.",
      verbatim_quote: "LSM yields A < B > C, even though in the pairwise comparisons A is preferred to B",
      evidence: {
        page: 213,
        locator_type: "section",
        locator_id: "Section 3 Counterexamples",
        quote: "LSM yields A < B > C, even though in the pairwise comparisons A is preferred to B"
      },
      usable_as: "limitation"
    },
    {
      claim: "For n greater than 4, LLSM tends to produce rankings insensitive to matrix inconsistencies because it does not use cross-row coefficients.",
      verbatim_quote: "LLSM would tend to produce a ranking that is insensitive to inconsistencies in the matrix",
      evidence: {
        page: 213,
        locator_type: "section",
        locator_id: "Section 3 Rank Reversal by LLSM",
        quote: "LLSM would tend to produce a ranking that is insensitive to inconsistencies in the matrix"
      },
      usable_as: "limitation"
    },
    {
      claim: "Inconsistency in pairwise comparisons is unavoidable in real decision contexts and cannot be dismissed as an aberration.",
      verbatim_quote: "inconsistency cannot be dismissed as an aberration. We have experienced many situations",
      evidence: {
        page: 214,
        locator_type: "section",
        locator_id: "Section 3 Conclusion",
        quote: "inconsistency cannot be dismissed as an aberration. We have experienced many situations"
      },
      usable_as: "recommendation"
    },
    {
      claim: "The principal eigenvector emerges as the limit of normalized row sums of matrix powers, capturing cumulative dominance along all chain lengths.",
      verbatim_quote: "the powers of the above matrix eventually reveal the strict dominance of row D over row B",
      evidence: {
        page: 211,
        locator_type: "section",
        locator_id: "Theorem 6",
        quote: "the powers of the above matrix eventually reveal the strict dominance"
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "LSM may yield non-unique solutions for the priority vector, undermining the goal of producing a single ranking from a comparison matrix.",
    "LLSM is insensitive to inconsistencies for matrix orders n>4 because it does not utilize coefficients from rows other than the rows being compared.",
    "Rank preservation cannot be guaranteed when row dominance does not hold and the matrix is inconsistent."
  ],
  recommendations: [
    "Use the eigenvector method (EM) for deriving priorities from inconsistent pairwise comparison matrices, as it captures rank order through asymptotic cumulative dominance.",
    "When rank order is critical, test the row dominance condition (Theorem 1) before applying any method.",
    "Accept inconsistency as inherent to decision-making with intangibles; prefer methods that quantify and capture inconsistency over methods that only minimize a metric criterion."
  ],
  cites: [
    "saaty1977_scaling"
  ],
  cited_by_context: {
    saaty1977_scaling: "Cites Saaty (1977) as the original source of the eigenvector method (EM) and the foundational scaling approach."
  },
  notes: [
    "Foundational paper establishing rank preservation theorems for AHP. Often cited alongside Saaty & Vargas (1984b) 'Comparison of eigenvalue, logarithmic least squares and least squares methods in estimating ratios' (Mathematical Modelling 5, 309-324) — same authors, same year, complementary topic.",
    "Theorem 1 (row dominance) is the foundational sufficient condition for rank preservation. Theorems 4-6 extend the result to ordinal transitivity and asymptotic eigenvector dominance.",
    "Cites Saaty (1980) book 'The Analytic Hierarchy Process' (McGraw-Hill) and Saaty (1982) 'Decision Making for Leaders' as primary references — neither is in the RAG as a separate article.",
    "References Cogger & Yu (1983), Jensen (1983), McMeekin (1979) for LSM; de Graan (1980), Fichtner (1983), Williams & Crawford (1980) for LLSM. None of these are in the RAG.",
    "The companion paper Saaty & Vargas (1984c) on Math Modelling 5 provides numerical comparisons; this paper provides the theoretical foundations for rank preservation conditions.",
    "DOI 10.1016/0022-2496(84)90027-0 verified via Elsevier."
  ]
};

export default article;
