/**
 * Article Extraction: DODEVSKA, Z.; RADOVANOVIĆ, S.; PETROVIĆ, A.; DELIBAŠIĆ, B (2023)
 * "When Fairness Meets Consistency in AHP Pairwise Comparisons"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "dodevska2023when",
  citation: {
    abnt: "DODEVSKA, Z.; RADOVANOVIĆ, S.; PETROVIĆ, A.; DELIBAŠIĆ, B. When Fairness Meets Consistency in AHP Pairwise Comparisons. Mathematics, v. 11, n. 3, p. 604, 2023.",
    bibtex: "@article{dodevska2023when,\n  title={When Fairness Meets Consistency in AHP Pairwise Comparisons},\n  author={Dodevska, Zorica and Radovanovi{\\'c}, Sandro and Petrovi{\\'c}, Andrija and Deliba{\\v{s}}i{\\'c}, Boris},\n  journal={Mathematics},\n  volume={11},\n  number={3},\n  pages={604},\n  year={2023},\n  publisher={MDPI}\n}"
  },
  doi: "10.3390/math11030604",
  type: "methodological",
  metadata: { year: 2023, venue: "Mathematics", domain: "Multi-criteria decision making (MCDM) / Algorithmic Fairness" },
  thresholds: [
    {
      metric: "CR",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency level",
      evidence: {
        page: 5,
        locator_type: "paragraph",
        locator_id: null,
        quote: "Only CR-values smaller than or equal to 0.1 (i.e., 10%) indicate an acceptable/tolerable consistency level"
      }
    },
    {
      metric: "DI (Disparate Impact)",
      operator: "≥",
      value: 0.8,
      unit: "ratio",
      context: "lower limit for fairness acceptability (80% rule)",
      evidence: {
        page: 9,
        locator_type: "equation",
        locator_id: "Eq. (10)",
        quote: "takes the inverted value and should be equal to or greater than 0.8 (according to the “80% rule” [73])"
      }
    },
    {
      metric: "DI (Disparate Impact)",
      operator: "≤",
      value: 1.25,
      unit: "ratio",
      context: "upper limit for fairness acceptability to avoid reverse discrimination",
      evidence: {
        page: 10,
        locator_type: "equation",
        locator_id: "Eq. (15)",
        quote: "The upper limit is symmetric to the lower limit. Its purpose is to prevent the opposite effect"
      }
    }
  ],
  formulas: [
    {
      id: "consistency_index_ci",
      label: "Eq. (4)",
      latex: "CI = \\frac{\\lambda_{max} - m}{m - 1}",
      description: "Consistency Index formulation where m is the number of items/alternatives.",
      variables: { CI: "Consistency Index", "\\lambda_{max}": "maximum coordinate value in vector lambda", m: "number of items" },
      conditions: "Standard AHP definition for evaluating logical consistency of a pairwise comparison matrix.",
      evidence: {
        page: 4,
        locator_type: "equation",
        locator_id: "Eq. (4)",
        quote: "The consistency index (CI) can be calculated according to the following formula"
      }
    },
    {
      id: "consistency_ratio_cr",
      label: "Eq. (5)",
      latex: "CR = \\frac{CI}{RCI}",
      description: "Consistency Ratio formulation.",
      variables: { CR: "Consistency Ratio", CI: "Consistency Index", RCI: "Random Consistency Index" },
      conditions: "Evaluates if CR ≤ 0.10 to indicate adequate compliance with the transitivity rule.",
      evidence: {
        page: 5,
        locator_type: "equation",
        locator_id: "Eq. (5)",
        quote: "Consistency ratio (CR) represents the ratio of CI and random consistency index (RCI):"
      }
    },
    {
      id: "disparate_impact_before",
      label: "Eq. (10)",
      latex: "DI_{bef} = \\frac{\\overline{R}_{bef[s=0]}}{\\overline{R}_{bef[s=1]}} \\ge 0.8",
      description: "Disparate impact before optimization, based on the ratio of average rank scores.",
      variables: {
        "DI_{bef}": "Disparate impact before optimization",
        "\\overline{R}_{bef[s=0]}": "average rank score for privileged group",
        "\\overline{R}_{bef[s=1]}": "average rank score for discriminated group",
        s: "sensitive attribute"
      },
      conditions: "Since favored alternatives have lower average rank scores, the ratio uses privileged over discriminated groups to hit ≥0.8.",
      evidence: {
        page: 9,
        locator_type: "equation",
        locator_id: "Eq. (10)",
        quote: "takes the inverted value and should be equal to or greater than 0.8"
      }
    },
    {
      id: "disparate_impact_after_lower",
      label: "Eq. (14)",
      latex: "DI_{aft} = \\frac{\\overline{R}_{aft[s=0]}}{\\overline{R}_{aft[s=1]}} \\ge 0.8",
      description: "Disparate impact lower limit constraint for post-optimization fairness.",
      variables: { "DI_{aft}": "Disparate impact after optimization" },
      conditions: "Used as a constraint in the discrete optimization model to guarantee fair ranking.",
      evidence: {
        page: 10,
        locator_type: "equation",
        locator_id: "Eq. (14)",
        quote: "The MM with f_d objective function should meet the following fairness constraint (i.e., the lower limit):"
      }
    },
    {
      id: "disparate_impact_after_upper",
      label: "Eq. (15)",
      latex: "DI_{aft} \\le \\frac{1}{0.8} = 1.25",
      description: "Disparate impact upper limit constraint for post-optimization fairness.",
      variables: { "DI_{aft}": "Disparate impact after optimization" },
      conditions: "Prevents reverse discrimination where the initially privileged group gets harmed by reranking.",
      evidence: {
        page: 10,
        locator_type: "equation",
        locator_id: "Eq. (15)",
        quote: "In addition to the lower limit, we introduce an upper limit (defined as in [16]):"
      }
    },
    {
      id: "optimization_goal_function",
      label: "Eq. (11)",
      latex: "(min)f_{d} = \\sum_{t} |UT_{bef_{t}} - UT_{aft_{t}}|",
      description: "Objective function for minimal correction of initial preferences in AHP PCMs.",
      variables: {
        "f_{d}": "goal function minimizing deviation",
        "UT_{bef}": "upper triangle values before",
        "UT_{aft}": "upper triangle values after"
      },
      conditions: "Operates using a Genetic Algorithm over the discrete values of Saaty's 9-point scale.",
      evidence: {
        page: 9,
        locator_type: "equation",
        locator_id: "Eq. (11)",
        quote: "the goal function (f_d) is the minimization of the sum of these differences from the first position to the last one"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "RCI-values corresponding to the number of items/alternatives [1].",
      content: {
        columns: ["m", "3", "4", "5", "6", "7", "8", "9", "10"],
        rows: [
          ["RCI", "0.58", "0.9", "1.12", "1.24", "1.32", "1.41", "1.45", "1.49"]
        ]
      },
      notes: "Transcribed fully as it represents foundational parameter RI/RCI mapped against matrix size.",
      evidence: {
        page: 5,
        locator_type: "table",
        locator_id: "Table 1",
        quote: "Table 1 shows RCI-values corresponding to the observed number of items/alternatives"
      }
    },
    {
      kind: "table",
      label: "Table 5",
      caption: "Comparison of two approaches: iterative-eigenvector vs. approximate-RQ.",
      content: {
        columns: ["Approach", "Successful Optimizations (in %)", "f_d_mean", "CR_aft_mean", "DI_aft_mean"],
        rows: [
          ["Iterative-eigenvector", "99.00%", "13.6658", "0.0939", "0.8476"],
          ["Approximate-RQ", "86.00%", "12.4885", "0.0943", "0.8499"]
        ]
      },
      notes: "Shows the experimental superiority of the iterative-eigenvector approach in the context of the proposed fairness optimization.",
      evidence: {
        page: 14,
        locator_type: "table",
        locator_id: "Table 5",
        quote: "Comparison of two approaches: iterative-eigenvector vs. approximate-RQ."
      }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: 10,
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
      claim: "Fair and consistent matrices are mathematically possible without being empty sets.",
      verbatim_quote: "The space of admissible solutions (simultaneously consistent and fair matrix we are looking for) is not empty.",
      evidence: {
        page: 9,
        locator_type: "section",
        locator_id: "2.2.1",
        quote: "The space of admissible solutions (simultaneously consistent and fair matrix we are looking for) is not empty."
      },
      usable_as: "benchmark"
    },
    {
      claim: "Disparate Impact (DI) is calculated using average rank scores of AHP alternatives.",
      verbatim_quote: "DI before optimization... is the ratio of average AHP rank comparison scores... between privileged and discriminated groups.",
      evidence: {
        page: 8,
        locator_type: "section",
        locator_id: "2.2.1",
        quote: "DI before optimization (DI_{bef}) is the ratio of average AHP rank comparison scores before optimization (overline{R}_{bef}) between privileged and discriminated groups."
      },
      usable_as: "definition"
    },
    {
      claim: "Initial high inconsistency makes achieving simultaneous fairness and consistency significantly harder.",
      verbatim_quote: "When the starting point is high inconsistency... it is more challenging to correct the consistency issue.",
      evidence: {
        page: 12,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "When the starting point is high inconsistency, independent of the DI value, the average value of the goal function is more elevated, i.e., the conclusion is that it is more challenging to correct the consistency issue."
      },
      usable_as: "limitation"
    }
  ],
  limitations: [
    "Limitations of the study are primarily related to the boundaries of classical AHP methodology and, therefore, a small number of comparison alternatives",
    "The impossibility of exploring and optimizing fairness metrics in a real data mining context (as the study relied on synthetic matrices)"
  ],
  recommendations: [
    "Expanding and applying the methodology to the whole AHP hierarchy structure",
    "Fixing some judgments that DMs do not want to change",
    "Setting multiobjective discrete optimizations to achieve additional goals regarding AHP hierarchy structure or the used accuracy/fairness metrics"
  ],
  cites: ["", ""],
  cited_by_context: { "": "Cited as the source for the 80% rule defining disparate impact lower boundaries." },
  notes: [
    "The paper uses a synthetic dataset generating 2800 optimization runs varying matrix sizes from 4 to 10 to test the algorithm, so empirical human sample data (n_respondents) is essentially 'null'.",
    "It rigorously bridges Fairness/Disparate Impact (DI) thresholds from ML directly into the mechanics of AHP pairwise comparisons."
  ]
};

export default article;
