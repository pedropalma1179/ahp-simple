/**
 * Article Extraction: HARKER, P (1987)
 * "T"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "harker1987_incomplete",
  citation: {
    abnt: "HARKER, P. T. Incomplete pairwise comparisons in the Analytic Hierarchy Process. Mathematical Modelling, v. 9, n. 11, p. 837-848, 1987.",
    bibtex: "@article{harker1987incomplete,\n  title={Incomplete pairwise comparisons in the Analytic Hierarchy Process},\n  author={Harker, P. T.},\n  journal={Mathematical Modelling},\n  volume={9},\n  number={11},\n  pages={837--848},\n  year={1987},\n  publisher={Pergamon Journals Ltd}\n}"
  },
  doi: null,
  type: "methodological",
  metadata: { year: 1987, venue: "Mathematical Modelling", domain: "decision analysis" },
  thresholds: [
    {
      metric: "C.I.",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency threshold",
      evidence: {
        page: 839,
        locator_type: "paragraph",
        locator_id: null,
        quote: "Typically, if C.I. <= 0.1 the judgments are taken as acceptable"
      }
    },
    {
      metric: "C.I.",
      operator: ">",
      value: 0.1,
      unit: "ratio",
      context: "unacceptable consistency threshold",
      evidence: {
        page: 839,
        locator_type: "paragraph",
        locator_id: null,
        quote: "if C.I. > 0.1, the decision maker is urged to reconsider his or her judgments"
      }
    },
    {
      metric: "Weight Difference",
      operator: "≤",
      value: 0.05,
      unit: "ratio",
      context: "stopping rule (alpha) for incomplete comparisons",
      evidence: {
        page: 843,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "maximum absolute difference in the attribute weights from one question to the next is <= alpha%"
      }
    }
  ],
  formulas: [
    {
      id: "eigenvector_method",
      label: "Eq. (3)",
      latex: "\\mathbb{A}W=\\lambda_{max}w",
      description: "Saaty's Eigenvector Method (EM) setting attribute weights equal to the right principal eigenvector.",
      variables: {
        "\\mathbb{A}": "Pairwise comparison matrix",
        "W/w": "Vector of attribute weights",
        "\\lambda_{max}": "Principal eigenvector or Perron root of A"
      },
      conditions: "Synthesizing the set of pairwise comparisons to obtain a vector of attribute weights.",
      evidence: {
        page: 839,
        locator_type: "equation",
        locator_id: "Eq. (3)",
        quote: "The EM, or Saaty's method, sets the attribute weights equal to the right principal eigenvector"
      }
    },
    {
      id: "consistency_index",
      label: "Eq. (4)",
      latex: "C.I.=(\\hat{i}_{max}-n)/n",
      description: "Measure of inconsistency of the judgments in the matrix.",
      variables: {
        "C.I.": "Consistency Index",
        "\\hat{i}_{max}": "Maximum eigenvalue (OCR notation for \\lambda_{max})",
        n: "Size of the matrix"
      },
      conditions: "Used to check consistency; if perfectly consistent, index is 0.",
      evidence: {
        page: 839,
        locator_type: "equation",
        locator_id: "Eq. (4)",
        quote: "index C.I.=(\\hat{i}_{max}-n)/n has been suggested by Saaty [1] as a measure of the inconsistency"
      }
    },
    {
      id: "next_question_selection",
      label: "Eq. (15)",
      latex: "(i,j)=argmax_{(k,l)\\in Q}(||\\partial x(A)/\\partial_{kl}||_{\\infty})",
      description: "Rule for choosing the next pairwise comparison to elicit in an incomplete matrix.",
      variables: {
        "(i,j)": "Next comparison to elicit",
        Q: "Set of unanswered comparisons",
        "||\\cdot||_{\\infty}": "L_infinity or Tchebyshev norm",
        "\\partial x(A)/\\partial_{kl}": "Gradient of the right Perron vector"
      },
      conditions: "Selects the question with the greatest impact on the attribute weights.",
      evidence: {
        page: 843,
        locator_type: "equation",
        locator_id: "Eq. (15)",
        quote: "where Q is the set of unanswered comparisons and ||\\cdot||_{\\infty} denotes the L_{\\infty} or Tchebyshev norm"
      }
    },
    {
      id: "stopping_rule_alpha",
      label: "Eq. (16, 17)",
      latex: "\\frac{|w_l^{k+1}-w_l^k|}{w_l^k}\\le\\alpha",
      description: "Stopping criterion based on the maximum absolute relative change in weights.",
      variables: {
        "w^k": "Weights after k comparisons",
        "w^{k+1}": "Weights after k+1 comparisons",
        "\\alpha": "Tolerance threshold",
        l: "Index of max change"
      },
      conditions: "Stops the questioning if the new comparison did not have a major influence on the weighting.",
      evidence: {
        page: 843,
        locator_type: "equation",
        locator_id: "Eq. (17)",
        quote: "if w^k and w^{k+1} are, respectively, the attribute weights after k and k+1 comparisons"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "Distance from Philadelphia",
      content: {
        columns: ["City", "1", "2", "3", "4", "5", "6", "w"],
        rows: [
          ["1. Cairo", "1", "1/3", "8", "3", "3", "7", "0.2619"],
          ["2. Tokyo", "", "1", "9", "3", "3", "9", "0.3975"],
          ["3. Chicago", "", "", "1", "1/6", "1/5", "2", "0.0334"],
          ["4. San Francisco", "", "", "", "1", "1/3", "6", "0.1164"],
          ["5. London", "", "", "", "", "1", "6", "0.1642"],
          ["6. Montreal", "", "", "", "", "", "1", "0.0266"]
        ]
      },
      notes: "Lower triangular matrix implied by reciprocals.",
      evidence: { page: 844, locator_type: "table", locator_id: "Table 1", quote: "Distance from Philadelphia" }
    },
    {
      kind: "table",
      label: "Table 2",
      caption: "Results of matrix evolution for City distances",
      content: {
        columns: ["Question", "W1", "W2", "W3", "W4", "W5", "W6"],
        rows: [
          ["6", "0.2339", "0.4612", "0.0382", "0.0659", "0.1734", "0.0273"],
          ["7", "0.2237", "0.4649", "0.0394", "0.0688", "0.1757", "0.0275"],
          ["8", "0.2863", "0.4504", "0.0407", "0.0474", "0.1464", "0.0288"],
          ["9", "0.2769", "0.4435", "0.0321", "0.0785", "0.1433", "0.0257"],
          ["10", "0.2200", "0.4004", "0.0349", "0.1361", "0.1771", "0.0315"],
          ["11", "0.2684", "0.3855", "0.0325", "0.1254", "0.1641", "0.0240"],
          ["12", "0.2694", "0.4003", "0.0338", "0.1071", "0.1622", "0.0273"],
          ["13", "0.2686", "0.3991", "0.0335", "0.1104", "0.1622", "0.0262"],
          ["14", "0.2676", "0.3970", "0.0330", "0.1149", "0.1623", "0.0251"],
          ["15", "0.2619", "0.3975", "0.0334", "0.1164", "0.1642", "0.0266"]
        ]
      },
      notes: "Cleaned headers based on context (W1..W6 corresponds to the cities in Table 1).",
      evidence: { page: 844, locator_type: "table", locator_id: "Table 2", quote: "The following table:" }
    },
    {
      kind: "table",
      label: "Table 3",
      caption: "Average number of questions required under different stopping rules",
      content: {
        columns: [
          "N",
          "5% Rule",
          "Percentage of total No. of questions (5%)",
          "Ordinal ranking rule",
          "Percentage of total No. of questions (Ordinal)"
        ],
        rows: [
          ["6", "10.90", "72.67", "12.60", "84.00"],
          ["7", "12.24", "58.29", "17.18", "81.81"],
          ["8", "13.56", "48.43", "22.78", "81.36"],
          ["9", "14.36", "39.89", "30.68", "85.22"]
        ]
      },
      notes: "N column inferred from row values matching matrix sizes in the text.",
      evidence: { page: 846, locator_type: "table", locator_id: "Table 3", quote: "Percentage of total No. of questions" }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: 9,
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
      claim: "The Eigenvector Method (EM) handles inconsistencies well.",
      verbatim_quote: "The AHP does not force an individual or a group to be perfectly consistent when making pairwise comparisons, but incorporates the inconsistencies",
      evidence: {
        page: 837,
        locator_type: "paragraph",
        locator_id: "Section 1",
        quote: "The AHP does not force an individual or a group to be perfectly consistent when making pairwise comparisons, but incorporates the inconsistencies"
      },
      usable_as: "definition"
    },
    {
      claim: "EM captures inherent rank ordering in inconsistent matrices.",
      verbatim_quote: "the EM is the only method which fully captures the rank ordering inherent in the data",
      evidence: {
        page: 839,
        locator_type: "paragraph",
        locator_id: "Section 2",
        quote: "the EM is the only method which fully captures the rank ordering inherent in the data"
      },
      usable_as: "recommendation"
    },
    {
      claim: "Geometric mean must synthesize path intensities for incomplete matrices.",
      verbatim_quote: "the geometric mean of the path intensities must be used to synthesize this information to yield a_{ij}",
      evidence: {
        page: 840,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "the geometric mean of the path intensities must be used to synthesize this information to yield a_{ij}"
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "As the number of completed comparison grows, the number of elementary paths grows exponentially.",
    "The determination of all elementary paths becomes extremely difficult."
  ],
  recommendations: [
    "Instead of finding all elementary paths, a sample of random spanning trees will be used to calculate missing elements.",
    "Present the decision maker with a ranking of the unanswered comparison in terms of equation (15) and allow him to select the next comparison."
  ],
  cites: ["saaty1980", "saaty_vargas1984", "aczl_saaty1983"],
  cited_by_context: {
    saaty1980: "Developed the Analytic Hierarchy Process and proposed the C.I. index.",
    saaty_vargas1984: "Proved that the EM is the only method with desirable rank preservation properties.",
    aczl_saaty1983: "Proven that the geometric mean must be used to synthesize group judgments to preserve reciprocity."
  },
  notes: [
    "PDF contains slight OCR artifacts (e.g., \\hat{i}_{max} instead of \\lambda_{max} for C.I. formula), strictly transcribed per guidelines.",
    "The term 'BOCR', 'fairness', or 'disparate impact' are entirely absent from the text.",
    "Empirical data primarily refers to computational simulations of N=6, 7, 8, 9 matrices."
  ]
};

export default article;
