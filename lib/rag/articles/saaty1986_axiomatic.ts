/**
 * Article Extraction: T.L. Saaty (1986)
 * "Axiomatic Foundation of the Analytic Hierarchy Process"
 *
 * Extracted on: 2026-05-04
 * Extraction prompt version: v4.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saaty1986_axiomatic",
  citation: {
    abnt: "SAATY, Thomas L. Axiomatic foundation of the analytic hierarchy process. Management Science, v. 32, n. 7, p. 841-855, 1986.",
    bibtex: "@article{saaty1986axiomatic,\n  title={Axiomatic foundation of the analytic hierarchy process},\n  author={Saaty, Thomas L},\n  journal={Management Science},\n  volume={32},\n  number={7},\n  pages={841--855},\n  year={1986},\n  publisher={INFORMS}\n}"
  },
  doi: "10.1287/mnsc.32.7.841",
  type: "foundational",
  metadata: {
    year: 1986,
    venue: "Management Science",
    domain: "Decision Theory / AHP Foundations"
  },
  thresholds: [],
  formulas: [
    {
      id: "axiom1_reciprocal",
      label: "Axiom 1 (Reciprocal)",
      latex: "P_C(A_i, A_j) = 1/P_C(A_j, A_i)",
      description: "Reciprocal axiom: paired comparisons must be reciprocal. If element Ai is judged x times Aj, then Aj is automatically 1/x times Ai.",
      variables: {
        "P_C(A_i, A_j)": "Paired comparison value of alternative Ai relative to Aj under criterion C",
        "A_i, A_j": "Alternatives being compared",
        "C": "Criterion under which the comparison is made"
      },
      conditions: "Holds for all pairs (Ai, Aj) and any criterion C. Defines positive reciprocal matrix structure used in AHP.",
      evidence: {
        page: 843,
        locator_type: "section",
        locator_id: "Section 2, Axiom 1",
        quote: "For all A_i, A_j and C, P_C(A_i, A_j) = 1/P_C(A_j, A_i)"
      }
    },
    {
      id: "axiom2_homogeneity",
      label: "Axiom 2 (Homogeneity)",
      latex: "1/\\rho \\leq P_C(y_1, y_2) \\leq \\rho",
      description: "Homogeneity axiom: elements compared must be of comparable magnitude (within factor rho), bounded by the fundamental scale.",
      variables: {
        "\\rho": "Positive real number bounding ratio (typically 9 in the 1-9 fundamental scale)",
        "y_1, y_2": "Elements within a homogeneous comparison set",
        "P_C": "Paired comparison function"
      },
      conditions: "Required for meaningful comparisons. When disparity is large, elements must be placed in separate clusters of comparable size.",
      evidence: {
        page: 843,
        locator_type: "section",
        locator_id: "Section 2, Axiom 2",
        quote: "the mind cannot compare widely disparate elements"
      }
    },
    {
      id: "axiom3_dependence",
      label: "Axiom 3 (Dependence)",
      latex: "L_{k+1} \\text{ outer dependent on } L_k",
      description: "Dependence axiom: each level of the hierarchy depends outer-dependently on the level above. Lower levels are not outer-dependent on higher.",
      variables: {
        "L_k": "Level k of the hierarchy",
        "L_{k+1}": "Level k+1 (immediately below k)"
      },
      conditions: "Defines hierarchic structure. Permits inner dependence within levels (which generalizes to ANP).",
      evidence: {
        page: 845,
        locator_type: "section",
        locator_id: "Section 2, Axiom 3",
        quote: "L_{k+1} is outer dependent on L_k; L_k is not outer dependent on L_{k+1}"
      }
    },
    {
      id: "axiom4_expectations",
      label: "Axiom 4 (Expectations)",
      latex: "\\mathfrak{C} \\subset \\mathfrak{H} - L_h, \\quad \\mathfrak{A} = L_h",
      description: "Expectations axiom: all relevant criteria and alternatives that decision-makers expect to influence the outcome must be represented in the hierarchy.",
      variables: {
        "\\mathfrak{C}": "Set of criteria",
        "\\mathfrak{A}": "Set of alternatives at the bottom level Lh",
        "\\mathfrak{H}": "The hierarchy"
      },
      conditions: "Does not assume rationality. Accommodates irrational expectations as long as they are explicitly represented.",
      evidence: {
        page: 847,
        locator_type: "section",
        locator_id: "Section 2, Axiom 4",
        quote: "thoughtful individuals who have reasons for their beliefs should make sure that their ideas are adequately represented"
      }
    },
    {
      id: "consistency_implies_reciprocal",
      label: "Theorem on consistency",
      latex: "P_C \\text{ consistent} \\Rightarrow \\text{Axiom 1}",
      description: "Consistency implies the reciprocal property. The first theorems treat the more restrictive case of consistent matrices.",
      variables: {
        "P_C": "Paired comparison mapping under criterion C"
      },
      conditions: "If the comparison mapping is consistent (satisfies a_ij * a_jk = a_ik), then it automatically satisfies reciprocity.",
      evidence: {
        page: 847,
        locator_type: "section",
        locator_id: "Section 3",
        quote: "consistency implies the reciprocal property"
      }
    },
    {
      id: "theorem1_consistent_iff_rank1",
      label: "Theorem 1",
      latex: "A \\in R_{C(n)} \\iff \\text{rank}(A) = 1",
      description: "A reciprocal matrix is consistent if and only if its rank is one. All rows of a consistent matrix are scalar multiples of any single row.",
      variables: {
        "R_{C(n)}": "Set of n×n consistent reciprocal matrices",
        "A": "Pairwise comparison matrix"
      },
      conditions: "Applies to positive reciprocal matrices. Enables construction of the entire matrix from a single row.",
      evidence: {
        page: 847,
        locator_type: "section",
        locator_id: "Theorem 1",
        quote: "A is in R_{C(n)} if and only if rank(A) = 1"
      }
    },
    {
      id: "theorem15_eigenvector_dominance",
      label: "Theorem 15",
      latex: "w_i = \\lim_{m \\to \\infty} \\frac{a_i^{(m)}}{\\sum_{j=1}^{n} a_j^{(m)}}",
      description: "The ith component of the principal right eigenvector of the reciprocal pairwise comparison matrix gives the relative dominance of alternative Ai.",
      variables: {
        "w_i": "Priority/dominance weight of alternative Ai",
        "a_i^{(m)}": "i-th row sum of A^m (matrix raised to power m)",
        "n": "Number of alternatives"
      },
      conditions: "Holds for any reciprocal matrix A, even when not consistent. Justifies the eigenvector method for deriving priorities.",
      evidence: {
        page: 853,
        locator_type: "section",
        locator_id: "Theorem 15",
        quote: "the principal right eigenvector of the reciprocal pairwise comparison matrix A gives the relative dominance of A_i"
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
      claim: "AHP rests on four axioms: reciprocity (Axiom 1), homogeneity (Axiom 2), dependence (Axiom 3), and expectations (Axiom 4).",
      verbatim_quote: "The set of axioms corresponding to hierarchic structures are a special case of axioms for priority setting in systems with feedback",
      evidence: {
        page: 841,
        locator_type: "abstract",
        locator_id: "Abstract",
        quote: "axioms corresponding to hierarchic structures are a special case of axioms for priority setting in systems with feedback"
      },
      usable_as: "definition"
    },
    {
      claim: "The reciprocal axiom states that paired comparisons must satisfy P_C(Ai, Aj) = 1/P_C(Aj, Ai), forming a positive reciprocal matrix.",
      verbatim_quote: "Whenever we make paired comparisons we need to consider both members of the pair to judge the relative value",
      evidence: {
        page: 843,
        locator_type: "section",
        locator_id: "Section 2, Axiom 1",
        quote: "Whenever we make paired comparisons we need to consider both members of the pair to judge the relative value"
      },
      usable_as: "definition"
    },
    {
      claim: "The homogeneity axiom requires that elements being compared must be of comparable magnitude, since the mind cannot meaningfully compare widely disparate elements.",
      verbatim_quote: "Homogeneity is essential for meaningful comparisons, as the mind cannot compare widely disparate elements",
      evidence: {
        page: 845,
        locator_type: "section",
        locator_id: "Section 2",
        quote: "Homogeneity is essential for meaningful comparisons, as the mind cannot compare widely disparate elements"
      },
      usable_as: "recommendation"
    },
    {
      claim: "The expectations axiom states that all relevant alternatives, criteria, and beliefs must be adequately represented in the hierarchy.",
      verbatim_quote: "thoughtful individuals who have reasons for their beliefs should make sure that their ideas are adequately represented",
      evidence: {
        page: 847,
        locator_type: "section",
        locator_id: "Section 2, Axiom 4",
        quote: "thoughtful individuals who have reasons for their beliefs should make sure that their ideas are adequately represented"
      },
      usable_as: "recommendation"
    },
    {
      claim: "Theorem 15 establishes that the principal right eigenvector of the reciprocal pairwise comparison matrix gives the relative dominance of alternatives.",
      verbatim_quote: "the principal right eigenvector of the reciprocal pairwise comparison matrix A gives the relative dominance of A_i",
      evidence: {
        page: 853,
        locator_type: "section",
        locator_id: "Theorem 15",
        quote: "the principal right eigenvector of the reciprocal pairwise comparison matrix A gives the relative dominance"
      },
      usable_as: "definition"
    },
    {
      claim: "The principal right eigenvector solution is appropriate for surfacing rank order from inconsistent data, and is stable to small perturbations.",
      verbatim_quote: "the eigenvector is stable to small perturbations in the data",
      evidence: {
        page: 847,
        locator_type: "section",
        locator_id: "Section 3",
        quote: "the eigenvector is stable to small perturbations in the data"
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "Axiom 4 (expectations) does not assume rationality; people may harbor irrational expectations that the model accommodates by representation, not by validation.",
    "When alternatives are scaled through paired comparisons, adding a new alternative can affect the priorities of existing alternatives (rank reversal phenomenon)."
  ],
  recommendations: [
    "Place elements of widely disparate magnitudes in separate clusters or different hierarchic levels to maintain homogeneity.",
    "Use the principal right eigenvector to derive the priority vector from inconsistent reciprocal pairwise comparison matrices.",
    "When using paired comparisons, design the hierarchy to represent all expectations explicitly, since the AHP cannot generate priorities for unrepresented alternatives or criteria."
  ],
  cites: [
    "saaty1977_scaling"
  ],
  cited_by_context: {
    saaty1977_scaling: "Cites Saaty (1977) implicitly as the predecessor introducing the scaling method on which the axioms formalize the foundation."
  },
  notes: [
    "Foundational paper presenting the four AHP axioms in formal mathematical terms. Citation NOT to be confused with R.W. Saaty (1987) 'The AHP: What it is and how it is used' (Math Modelling 9, 161-176), which is an expository paper that cites this 1986 paper as the source of the axioms.",
    "Paper does not contain BOCR framework — BOCR was introduced later (Saaty 1996 ANP book; Saaty & Ozdemir 2003).",
    "Cites Saaty (1980) book 'The Analytic Hierarchy Process' (McGraw-Hill) as primary reference for prior theorems (e.g., Theorem 7.13 referenced in Theorem 14 corollary). Saaty (1980) book is not in the RAG as a separate article.",
    "Theorems 1, 14 and 15 are mathematical proofs, not empirical results.",
    "DOI 10.1287/mnsc.32.7.841 verified via INFORMS Management Science archive."
  ]
};

export default article;
