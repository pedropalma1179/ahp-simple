/**
 * Article Extraction: SAATY, Thomas L.; VARGAS, Luis G (2012)
 * "Models, Methods, Concepts & Applications of the Analytic Hierarchy Process"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saatyVargas2012",
  citation: {
    abnt: "SAATY, Thomas L.; VARGAS, Luis G. Models, Methods, Concepts & Applications of the Analytic Hierarchy Process. 2. ed. New York: Springer, 2012. (International Series in Operations Research & Management Science, v. 175). ISBN 978-1-4614-3596-9.",
    bibtex: "@book{saatyVargas2012,\n  title={Models, Methods, Concepts \\& Applications of the Analytic Hierarchy Process},\n  author={Saaty, Thomas L. and Vargas, Luis G.},\n  year={2012},\n  edition={2},\n  series={International Series in Operations Research \\& Management Science},\n  volume={175},\n  publisher={Springer},\n  address={New York},\n  isbn={978-1-4614-3596-9},\n  doi={10.1007/978-1-4614-3597-6}\n}"
  },
  doi: "10.1007/978-1-4614-3597-6",
  type: "foundational",
  metadata: {
    year: 2012,
    venue: "Springer — International Series in Operations Research & Management Science",
    domain: "Decision Theory / Multi-Criteria Decision Making"
  },
  thresholds: [
    {
      metric: "CR",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency; if not less than 0.10, revise judgments",
      evidence: {
        page: 9,
        locator_type: "paragraph",
        locator_id: "Section 1.7",
        quote: "If it is not less than 0.10, study the problem and revise the judgments."
      }
    },
    {
      metric: "CR_hierarchy",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable overall hierarchy inconsistency; 10% or less means adjustment is small",
      evidence: {
        page: 9,
        locator_type: "paragraph",
        locator_id: "Section 1.7",
        quote: "An inconsistency of 10 percent or less implies that the adjustment is small compared to the actual values of the eigenvector entries."
      }
    }
  ],
  formulas: [
    {
      id: "ci_formula",
      label: null,
      latex: "\\text{C.I.} = \\frac{\\lambda_{\\max} - n}{n - 1}",
      description: "Consistency Index of a pairwise comparison matrix.",
      variables: {
        "C.I.": "consistency index",
        "\\lambda_{\\max}": "largest eigenvalue of the comparison matrix",
        n: "order (size) of the matrix"
      },
      conditions: "Applicable to positive reciprocal matrices. Lambda_max >= n always holds; equality iff matrix is perfectly consistent.",
      evidence: {
        page: 9,
        locator_type: "paragraph",
        locator_id: "Section 1.7",
        quote: "The consistency index of a matrix of comparisons is given by C.I. = (kmax - n)/(n - 1)."
      }
    },
    {
      id: "cr_formula",
      label: null,
      latex: "\\text{C.R.} = \\frac{\\text{C.I.}}{\\text{R.I.}}",
      description: "Consistency Ratio obtained by comparing CI with the average Random Index for the given matrix size.",
      variables: {
        "C.R.": "consistency ratio",
        "C.I.": "consistency index of the judgment matrix",
        "R.I.": "average random consistency index from Table 1.2"
      },
      conditions: "R.I. values are derived from a sample of randomly generated reciprocal matrices using the scale 1/9 to 9.",
      evidence: {
        page: 9,
        locator_type: "paragraph",
        locator_id: "Section 1.7",
        quote: "The consistency ratio (C.R.) is obtained by comparing the C.I. with the appropriate one of the following set of numbers each of which is an average random consistency index derived from a sample of randomly generated reciprocal matrices using the scale 1/9, 1/8,…, 1,…, 8, 9."
      }
    },
    {
      id: "eigenvalue_problem",
      label: "Eq. (2.1)",
      latex: "\\sum_{j=1}^{n} a_{ij} w_j = \\lambda_{\\max} w_i",
      description: "Principal eigenvalue equation for deriving the priority vector from a pairwise comparison matrix.",
      variables: {
        "a_{ij}": "pairwise comparison entry (row i, column j)",
        w_j: "priority weight of element j",
        "\\lambda_{\\max}": "principal (largest) eigenvalue"
      },
      conditions: "Matrix must be positive and reciprocal (a_ji = 1/a_ij). Normalized so that sum of w_i = 1.",
      evidence: {
        page: 26,
        locator_type: "equation",
        locator_id: "Eq. (2.1)",
        quote: "The relative ratio scale derived from a pairwise comparison reciprocal matrix of judgments is derived by solving (2.1)."
      }
    },
    {
      id: "hierarchical_composition",
      label: null,
      latex: "W = B_h B_{h-1} \\cdots B_2 W_0",
      description: "Global priority vector of the lowest level with respect to the goal, obtained by multiplying priority matrices across all hierarchy levels.",
      variables: {
        W: "global priority vector of the bottom level",
        B_k: "priority matrix of the kth level",
        W_0: "priority vector of the top level (usually 1)",
        h: "number of hierarchy levels"
      },
      conditions: "Requires a complete hierarchy. In general W_0 = 1. Sensitivity of bottom-level alternatives can be studied via this multilinear form.",
      evidence: {
        page: 33,
        locator_type: "section",
        locator_id: "Section 2.6",
        quote: "The global priority vector of the lowest level with respect to the goal is given by W = Bh Bh-1 ... B2 W0. In general, W0 = 1."
      }
    },
    {
      id: "geometric_mean_aij",
      label: null,
      latex: "f(x_1, x_2, \\ldots, x_n) = \\left( \\prod_{k=1}^{n} x_k \\right)^{1/n}",
      description: "Geometric mean as the unique valid aggregation function for individual judgments (AIJ) satisfying separability, unanimity, homogeneity, and reciprocal conditions.",
      variables: { x_k: "judgment of the kth individual", n: "number of individuals (judges)", f: "synthesizing function" },
      conditions: "Requires conditions S (separability), U (unanimity), H (homogeneity), and R (reciprocal). Under these four conditions, ONLY the geometric mean is valid. Proved by Aczel and Saaty.",
      evidence: {
        page: 38,
        locator_type: "paragraph",
        locator_id: "Section 2.8.1 — Theorem (Aczel and Saaty)",
        quote: "If moreover the reciprocal property (R) is assumed even for a single n-tuple of the judgments of n individuals, where not all xk are equal, then only the geometric mean satisfies all the above conditions."
      }
    },
    {
      id: "weighted_geometric_mean_aij",
      label: null,
      latex: "f(x_1, x_2, \\ldots, x_n) = x_1^{q_1} x_2^{q_2} \\cdots x_n^{q_n}",
      description: "Weighted geometric mean for synthesizing judgments from individuals with different importance (power/expertise), where weights sum to 1.",
      variables: {
        x_k: "judgment of the kth individual",
        q_k: "weight (importance) of the kth individual, with sum q_k = 1",
        n: "number of individuals"
      },
      conditions: "Requires weighted separability (WS), unanimity (U), homogeneity (H), and reciprocal (R) conditions. q_k > 0, sum = 1. Proved by Aczel and Alsina.",
      evidence: {
        page: 39,
        locator_type: "paragraph",
        locator_id: "Section 2.8.1 — Theorem (Aczel and Alsina)",
        quote: "If f also has the reciprocal property (R) and for a single set of entries of judgments of n individuals, where not all xk are equal, then only the weighted geometric mean applies."
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1.1",
      caption: "The fundamental scale",
      content: {
        columns: ["Intensity of importance", "Definition", "Explanation"],
        rows: [
          [1, "Equal importance", "Two activities contribute equally to the objective"],
          [2, "Weak", ""],
          [3, "Moderate importance", "Experience and judgment slightly favor one activity over another"],
          [4, "Moderate plus", ""],
          [5, "Strong importance", "Experience and judgment strongly favor one activity over another"],
          [6, "Strong plus", ""],
          [
            7,
            "Very strong or demonstrated importance",
            "An activity is favored very strongly over another; its dominance demonstrated in practice"
          ],
          [8, "Very, very strong", ""],
          [
            9,
            "Extreme importance",
            "The evidence favoring one activity over another is of the highest possible order of affirmation"
          ],
          [
            "Reciprocals of above",
            "If activity i has one of the above nonzero numbers assigned to it when compared with activity j, then j has the reciprocal value when compared with i",
            "A reasonable assumption"
          ],
          [
            "Rationals",
            "Ratios arising from the scale",
            "If consistency were to be forced by obtaining n numerical values to span the matrix"
          ]
        ]
      },
      notes: "Updated 1-9 scale with intermediate values (2,4,6,8) explicitly labeled. This is the definitive version of the fundamental scale as published by Saaty.",
      evidence: { page: 6, locator_type: "table", locator_id: "Table 1.1", quote: "The fundamental scale" }
    },
    {
      kind: "table",
      label: "Table 1.2",
      caption: "Average random consistency index (R.I.)",
      content: {
        columns: ["n", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        rows: [
          ["R.I.", 0, 0, 0.52, 0.89, 1.11, 1.25, 1.35, 1.4, 1.45, 1.49]
        ]
      },
      notes: "Complete RI table for n=1 to n=10 as published by Saaty. These are the canonical RI values widely used in AHP literature. Values derived from randomly generated reciprocal matrices using the 1/9 to 9 scale. No values provided for n > 10.",
      evidence: { page: 9, locator_type: "table", locator_id: "Table 1.2", quote: "Average random consistency index (R.I.)" }
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
      claim: "CR must be less than 0.10; otherwise revise judgments.",
      verbatim_quote: "If it is not less than 0.10, study the problem and revise the judgments.",
      evidence: {
        page: 9,
        locator_type: "paragraph",
        locator_id: "Section 1.7",
        quote: "If it is not less than 0.10, study the problem and revise the judgments."
      },
      usable_as: "threshold"
    },
    {
      claim: "10% hierarchy inconsistency is small relative to eigenvector values.",
      verbatim_quote: "An inconsistency of 10 percent or less implies that the adjustment is small compared to the actual values of the eigenvector entries.",
      evidence: {
        page: 9,
        locator_type: "paragraph",
        locator_id: "Section 1.7",
        quote: "An inconsistency of 10 percent or less implies that the adjustment is small compared to the actual values of the eigenvector entries."
      },
      usable_as: "threshold"
    },
    {
      claim: "The geometric mean is the only valid function for aggregating individual judgments (AIJ) under reciprocal, separability, unanimity, and homogeneity conditions.",
      verbatim_quote: "then only the geometric mean satisfies all the above conditions.",
      evidence: {
        page: 38,
        locator_type: "paragraph",
        locator_id: "Section 2.8.1",
        quote: "then only the geometric mean satisfies all the above conditions."
      },
      usable_as: "definition"
    },
    {
      claim: "For judges with different expertise weights, only the weighted geometric mean is valid under the reciprocal property.",
      verbatim_quote: "then only the weighted geometric mean applies.",
      evidence: {
        page: 39,
        locator_type: "paragraph",
        locator_id: "Section 2.8.1",
        quote: "then only the weighted geometric mean applies."
      },
      usable_as: "definition"
    },
    {
      claim: "AHP has four axioms: reciprocal relation, homogeneous comparison, hierarchic dependence, and expectations about rank/value validity.",
      verbatim_quote: "there are four axioms in the AHP... concerned with the reciprocal relation, comparison of homogeneous elements, hierarchic and systems dependence",
      evidence: {
        page: 4,
        locator_type: "paragraph",
        locator_id: "Section 1.3",
        quote: "there are four axioms in the AHP... concerned with the reciprocal relation, comparison of homogeneous elements, hierarchic and systems dependence"
      },
      usable_as: "definition"
    },
    {
      claim: "Arrow's Impossibility Theorem does not apply to AHP because cardinal ratio scale preferences allow construction of a rational social choice function.",
      verbatim_quote: "because now the individual preferences are cardinal rather than ordinal, it is possible to derive a rational group choice satisfying the above four conditions.",
      evidence: {
        page: 40,
        locator_type: "paragraph",
        locator_id: "Section 2.8.2",
        quote: "because now the individual preferences are cardinal rather than ordinal, it is possible to derive a rational group choice satisfying the above four conditions."
      },
      usable_as: "definition"
    },
    {
      claim: "Additive synthesis (not multiplicative) is recommended; multiplicative synthesis does not generalize to dependence and feedback.",
      verbatim_quote: "I do not recommend ever using multiplicative synthesis. It can lead to an undesirable ranking of the alternatives.",
      evidence: {
        page: 35,
        locator_type: "paragraph",
        locator_id: "Section 2.6",
        quote: "I do not recommend ever using multiplicative synthesis. It can lead to an undesirable ranking of the alternatives."
      },
      usable_as: "recommendation"
    },
    {
      claim: "CI equals the variance of the error incurred in estimating pairwise comparison entries.",
      verbatim_quote: "(kmax - n)/(n - 1) is the variance of the error incurred in estimating aij.",
      evidence: {
        page: 8,
        locator_type: "paragraph",
        locator_id: "Section 1.6",
        quote: "(kmax - n)/(n - 1) is the variance of the error incurred in estimating aij."
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "BOCR (Benefits, Opportunities, Costs, Risks) framework is NOT covered in this book.",
    "RI table provided only for n=1 to n=10; no values for n > 10.",
    "Four axioms of AHP are mentioned informally (p.4) but not formally defined in this text; full treatment referenced to other works.",
    "Sensitivity analysis is mentioned conceptually (multilinear form allows studying it) but no specific OAT/Monte Carlo methodology is provided.",
    "No discussion of Incomplete Pairwise Comparisons (IPC)."
  ],
  recommendations: [
    "Use the fundamental 1-9 scale for pairwise comparisons (Table 1.1).",
    "If CR is not less than 0.10, study the problem and revise the judgments.",
    "Use geometric mean to aggregate individual judgments (AIJ) — it is the only mathematically valid method.",
    "Use weighted geometric mean when judges have different expertise levels.",
    "Use Distributive mode when dominance among alternatives matters; use Ideal mode when performance against a fixed benchmark matters.",
    "Rank can always be preserved using the Ideal mode in both absolute and relative measurement.",
    "Number of elements should be small to preserve consistency."
  ],
  cites: [
    "aczelSaaty1983",
    "aczelAlsina1986",
    "milletSaaty1999",
    "saatyHu1998",
    "saatyVargas1993",
    "buede1995",
    "arrow1951"
  ],
  cited_by_context: {
    aczelSaaty1983: "Cited for the theorem proving that the geometric mean is the unique valid aggregation function under S, U, H, R conditions (p.38).",
    aczelAlsina1986: "Cited for the theorem proving that the weighted geometric mean is the unique valid aggregation under weighted separability (p.39).",
    milletSaaty1999: "Cited for developing guidelines on when to use Distributive vs Ideal synthesis mode (p.37).",
    saatyHu1998: "Cited for showing that additive and multiplicative syntheses lead to different rankings despite closeness (p.35).",
    saatyVargas1993: "Cited for simulation showing only minor differences between the two synthesis modes (p.37).",
    buede1995: "Cited for rank disagreement comparison of multi-criteria methodologies (bibliography p.40).",
    arrow1951: "Arrow's Impossibility Theorem discussed as not applicable to AHP due to cardinal ratio scales (p.40)."
  },
  notes: [
    "This book is Saaty & Vargas (2012), NOT Saaty (1980). The PDF title page reads: 'Models, Methods, Concepts & Applications of the Analytic Hierarchy Process, Second Edition, Springer 2012'.",
    "Often cited in literature as a proxy for Saaty (1980) since it contains the same canonical RI table and CR threshold, but in updated form.",
    "Chapters 1-2 contain the theoretical foundation (scale, eigenvector, consistency, group decision). Chapters 3-24 are application case studies.",
    "The geometric mean theorems (Aczel & Saaty; Aczel & Alsina) are the definitive source for justifying AIJ aggregation in group AHP.",
    "The RI table (Table 1.2) shows n=1..10 only. The value '1.7' appearing after 1.49 in raw text extraction is the next section number (Section 1.7), NOT an RI value for n=11.",
    "Page numbers in this extraction refer to the book's internal page numbering, not PDF page numbers. PDF page ≈ book page + 13.",
    "cites references use estimated IDs; actual article IDs in RAG may differ."
  ]
};

export default article;
