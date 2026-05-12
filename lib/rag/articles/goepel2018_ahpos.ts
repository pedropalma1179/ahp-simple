/**
 * Article Extraction: GOEPEL, K. D. (2018)
 * "Implementation of an Online Software Tool for the Analytic Hierarchy Process (AHP-OS)"
 *
 * Extracted on: 2026-05-12
 * Extraction prompt version: v4.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "goepel2018_ahpos",
  citation: {
    abnt: "GOEPEL, K. D. Implementation of an online software tool for the Analytic Hierarchy Process (AHP-OS). International Journal of the Analytic Hierarchy Process, v. 10, n. 3, p. 469-487, 2018.",
    bibtex: "@article{goepel2018implementation,\n  title={Implementation of an online software tool for the Analytic Hierarchy Process (AHP-OS)},\n  author={Goepel, Klaus D.},\n  journal={International Journal of the Analytic Hierarchy Process},\n  volume={10},\n  number={3},\n  pages={469--487},\n  year={2018},\n  publisher={Creative Decisions Foundation},\n  doi={10.13033/ijahp.v10i3.590}\n}"
  },
  doi: "10.13033/ijahp.v10i3.590",
  type: "methodological",
  metadata: {
    year: 2018,
    venue: "International Journal of the Analytic Hierarchy Process (IJAHP)",
    domain: "AHP Software / Group Decision Making / Validation"
  },
  thresholds: [
    {
      metric: "CR (Consistency Ratio)",
      operator: ">",
      value: 0.10,
      unit: "ratio",
      context: "threshold above which AHP-OS calculates and highlights the top-3 most inconsistent judgments to allow user adjustment",
      evidence: {
        page: 473,
        locator_type: "section",
        locator_id: "2.4",
        quote: "If the consistency ratio CR exceeds 10%, the software calculates the top-3 inconsistent judgments."
      }
    },
    {
      metric: "CR (Consistency Ratio)",
      operator: "<",
      value: 0.25,
      unit: "ratio",
      context: "upper bound for capturing weight variations in Monte Carlo uncertainty estimation",
      evidence: {
        page: 479,
        locator_type: "section",
        locator_id: "5",
        quote: "We then capture the maximum and minimum of the weights for all CR < 0.25."
      }
    },
    {
      metric: "AHP consensus indicator",
      operator: "≤",
      value: 0.50,
      unit: "ratio",
      context: "consensus categorized as 'very low' for S* ≤ 50%",
      evidence: {
        page: 478,
        locator_type: "table",
        locator_id: "Table 2",
        quote: "≤ 50% Very low"
      }
    },
    {
      metric: "AHP consensus indicator",
      operator: "≥",
      value: 0.85,
      unit: "ratio",
      context: "consensus categorized as 'very high' for S* ≥ 85%",
      evidence: {
        page: 478,
        locator_type: "table",
        locator_id: "Table 2",
        quote: "≥85% Very high"
      }
    },
    {
      metric: "Power method iterations",
      operator: "≤",
      value: 20,
      unit: "iterations",
      context: "iteration cap for eigenvector calculation, ensuring approximation error of 1.E-7",
      evidence: {
        page: 472,
        locator_type: "section",
        locator_id: "2.2",
        quote: "The number of iterations is limited to 20, this is sufficient for an accepted approximation error of 1.E-7."
      }
    }
  ],
  formulas: [
    {
      id: "eq_2_npc",
      label: "Eq. (2)",
      latex: "npc = \\frac{n^2 - n}{2}",
      description: "Number of pairwise comparisons required for n criteria.",
      variables: {
        npc: "number of pairwise comparisons",
        n: "number of criteria"
      },
      conditions: "Standard count for a complete pairwise comparison matrix.",
      evidence: {
        page: 472,
        locator_type: "equation",
        locator_id: "Eq. (2)",
        quote: "npc = (n^2 - n)/2"
      }
    },
    {
      id: "eq_4_cr_saaty",
      label: "Eq. (4)",
      latex: "CR = \\frac{\\lambda - n}{(n-1) \\cdot RI_n}",
      description: "Saaty's original Consistency Ratio formula using the average random consistency index RIn.",
      variables: {
        CR: "Consistency Ratio",
        "\\lambda": "dominant eigenvalue of the decision matrix",
        n: "dimension of the matrix",
        "RI_n": "average random consistency index for dimension n"
      },
      conditions: "Reference formula. AHP-OS replaces this with Eq. 5 (Alonso-Lamata) for matrices larger than 10x10.",
      evidence: {
        page: 473,
        locator_type: "equation",
        locator_id: "Eq. (4)",
        quote: "CR = (λ−n)/((n−1)·RIn)"
      }
    },
    {
      id: "eq_5_cr_alonso_lamata",
      label: "Eq. (5)",
      latex: "CR = \\frac{\\lambda - n}{2.7699 \\cdot n - 4.3513 - n}",
      description: "Alonso and Lamata (2006) linear fit for Consistency Ratio, used by AHP-OS for matrices larger than 10x10.",
      variables: {
        CR: "Consistency Ratio",
        "\\lambda": "dominant eigenvalue of the decision matrix",
        n: "dimension of the matrix"
      },
      conditions: "Used by AHP-OS in place of Saaty's RI table. Valid for n > 10 where Saaty's RI table is exhausted.",
      evidence: {
        page: 473,
        locator_type: "equation",
        locator_id: "Eq. (5)",
        quote: "we use the linear fit proposed by Alonso and Lamata (2006) to calculate the consistency ratio CR"
      }
    },
    {
      id: "eq_6_inconsistency_matrix",
      label: "Eq. (6)",
      latex: "e_{ij} = d_{ij} \\cdot \\frac{w_j}{w_i}",
      description: "Inconsistency matrix used to identify the top-3 most inconsistent judgments in a decision matrix.",
      variables: {
        "e_{ij}": "inconsistency element for pair (i,j)",
        "d_{ij}": "original judgment in decision matrix",
        "w_i, w_j": "priorities from eigenvector for criteria i and j"
      },
      conditions: "AHP-OS identifies the three largest e_ij and highlights the corresponding pairwise comparisons for the decision maker to adjust (cf. Saaty, 2003).",
      evidence: {
        page: 473,
        locator_type: "equation",
        locator_id: "Eq. (6)",
        quote: "eij = dij · wj/wi"
      }
    },
    {
      id: "eq_11_wgm_aij",
      label: "Eq. (11)",
      latex: "a_{ij}^{cons} = \\left( \\prod_{k=1}^{K} a_{ij}^{(k)} \\right)^{1/K}",
      description: "Weighted Geometric Mean Aggregation of Individual Judgments (WGM-AIJ): consolidated judgment is the geometric mean of K participant judgments.",
      variables: {
        "a_{ij}^{cons}": "consolidated judgment for the (i,j) pair",
        "a_{ij}^{(k)}": "judgment of participant k for the (i,j) pair",
        K: "number of participants"
      },
      conditions: "AHP-OS uses WGM-AIJ as it is the only aggregation method satisfying the reciprocal property and other required axiomatic conditions.",
      evidence: {
        page: 476,
        locator_type: "equation",
        locator_id: "Eq. (11)",
        quote: "aij^cons = (∏_{k=1}^{K} aij)^{1/K}"
      }
    },
    {
      id: "eq_21_consensus_indicator",
      label: "Eq. (21)",
      latex: "S^* = \\frac{1/D_{\\beta} - cor}{1 - cor}",
      description: "AHP Group Consensus Indicator based on Shannon entropy, ranging from 0% (no consensus) to 100% (full consensus).",
      variables: {
        "S^*": "AHP Group Consensus Indicator",
        "D_{\\beta}": "exponential of Shannon beta-entropy",
        cor: "correction factor based on minimum alpha entropy and maximum gamma entropy"
      },
      conditions: "Aggregation result from WGM-AIJ should always be evaluated against the consensus indicator to validate the meaningfulness of the consolidated group result.",
      evidence: {
        page: 478,
        locator_type: "equation",
        locator_id: "Eq. (21)",
        quote: "The AHP consensus indicator (Equation 21) ranges from 0% (no consensus) to 100% (full consensus)."
      }
    },
    {
      id: "eq_29_wsm",
      label: "Eq. (29)",
      latex: "P_i = \\sum_{j=1}^{n} a_{ij} w_j",
      description: "Weighted Sum Model (WSM) for alternative aggregation.",
      variables: {
        "P_i": "preference score of alternative Ai",
        "w_j": "weight of criterion Cj",
        "a_{ij}": "performance measure of alternative Ai under criterion Cj (normalized)"
      },
      conditions: "Performance values are normalized such that the sum across alternatives equals 1 for each criterion.",
      evidence: {
        page: 480,
        locator_type: "equation",
        locator_id: "Eq. (29)",
        quote: "Pi = ∑ aij·wj"
      }
    },
    {
      id: "eq_31_wpm",
      label: "Eq. (31)",
      latex: "P_i = \\prod_{j=1}^{n} a_{ij}^{w_j}",
      description: "Weighted Product Model (WPM) for alternative aggregation.",
      variables: {
        "P_i": "preference score of alternative Ai",
        "w_j": "weight of criterion Cj",
        "a_{ij}": "performance measure of alternative Ai under criterion Cj"
      },
      conditions: "Alternative to WSM. Some of the first references to this method are due to Bridgman (1922) and Miller and Starr (1969).",
      evidence: {
        page: 480,
        locator_type: "equation",
        locator_id: "Eq. (31)",
        quote: "Pi = ∏ aij^wj"
      }
    },
    {
      id: "eq_41_test_case",
      label: "Eq. (41)",
      latex: "w_{AHP} = \\frac{x}{x + n - 1}",
      description: "Test case for black box validation: weight of a criterion judged x-times more important than all n-1 other criteria.",
      variables: {
        "w_{AHP}": "AHP weight of the dominant criterion",
        x: "intensity factor in pairwise comparison",
        n: "number of criteria"
      },
      conditions: "Reference test for comparing AHP-OS results against analytically known values. For x=9 and n=4: w_AHP = 9/12 = 75%.",
      evidence: {
        page: 482,
        locator_type: "equation",
        locator_id: "Eq. (41)",
        quote: "wAHP = x/(x + n − 1)"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "AHP judgment scales implemented in the software",
      content: {
        columns: ["No", "Name", "Scale function", "Comment"],
        rows: [
          ["0", "AHP scale", "c = x", "Saaty (1980)"],
          ["1", "Logarithmic scale", "c = log_a(x + a − 1), a = 2", "Ishizaka et al. (2010)"],
          ["2", "Root square scale", "c = √x (a-th root, we use a = 2)", "Harker, Vargas (1987)"],
          ["3", "Inverse linear scale", "c = 9 / (10 − x)", "Ma-Zheng (1991)"],
          ["4", "Balanced scale", "c = (9 + x) / (11 − x)", "Salo, Hämäläinen (1997)"],
          ["5", "Generalized balanced scale", "c = (9 + (n − 1)x) / (9 + n − x)", "Goepel (2019)"],
          ["6", "Adaptive-balanced scale", "c = ((9n − 10)(x − 1) + 80) / ((9n − 10)x − 89n + 90 (n − 1))", "Goepel (2019)"],
          ["7", "Adaptive scale", "c = x^(1 + ln(n−1)/ln 9)", "Goepel (2019)"],
          ["8", "Power scale", "c = x^a, a = 2", "Harker, Vargas (1987)"],
          ["9", "Geometric scale", "c = a^(x−1), a = 2", "Lootsma (1994)"]
        ]
      },
      notes: "Ten judgment scales implemented a posteriori in AHP-OS. Pairwise comparisons are stored with original judgment values, allowing scale substitution post-input.",
      evidence: {
        page: 474,
        locator_type: "table",
        locator_id: "Table 1",
        quote: "AHP judgment scales implemented in the software"
      }
    },
    {
      kind: "table",
      label: "Table 2",
      caption: "Interpretation of AHP consensus indicator S*",
      content: {
        columns: ["S*", "Consensus"],
        rows: [
          ["≤ 50%", "Very low"],
          ["50% - 65%", "Low"],
          ["65% - 75%", "Moderate"],
          ["75% - 85%", "High"],
          ["≥ 85%", "Very high"]
        ]
      },
      notes: "Five-category classification of group consensus quality based on Shannon entropy partitioning.",
      evidence: {
        page: 478,
        locator_type: "table",
        locator_id: "Table 2",
        quote: "Interpretation of AHP consensus indicator S*"
      }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: "AIJ",
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
      claim: "AHP-OS is a free, web-based AHP online system intended for educational and research purposes, with documented and validated methods and algorithms.",
      verbatim_quote: "a web-based AHP online system (AHP-OS) was developed and is available in its full functionality to any user for non-commercial purposes",
      evidence: {
        page: 470,
        locator_type: "section",
        locator_id: "Section 1",
        quote: "a web-based AHP online system (AHP-OS) was developed and is available in its full functionality to any user for non-commercial purposes"
      },
      usable_as: "definition"
    },
    {
      claim: "AHP-OS uses Weighted Geometric Mean Aggregation of Individual Judgments (WGM-AIJ) for group decision making because it is the only method satisfying required axiomatic conditions such as the reciprocal property.",
      verbatim_quote: "we use the weighted geometric mean aggregation of individual judgments (WGM-AIJ) as it is the only method that meets several required axiomatic conditions such as the reciprocal property",
      evidence: {
        page: 476,
        locator_type: "section",
        locator_id: "4.1",
        quote: "we use the weighted geometric mean aggregation of individual judgments (WGM-AIJ) as it is the only method that meets several required axiomatic conditions such as the reciprocal property"
      },
      usable_as: "recommendation"
    },
    {
      claim: "AHP-OS calculates the Consistency Ratio using Alonso & Lamata (2006) linear fit instead of Saaty's RI table, enabling validation for matrices larger than 10x10.",
      verbatim_quote: "we use the linear fit proposed by Alonso and Lamata (2006) to calculate the consistency ratio CR... It can be used for matrices larger than 10 x 10",
      evidence: {
        page: 473,
        locator_type: "section",
        locator_id: "2.3",
        quote: "we use the linear fit proposed by Alonso and Lamata (2006) to calculate the consistency ratio CR... It can be used for matrices larger than 10 x 10"
      },
      usable_as: "definition"
    },
    {
      claim: "Software validation in AHP-OS uses black box testing: comparison of program results with manually calculated results and results published in the literature.",
      verbatim_quote: "We compared program results with manually calculated results and results published in the literature.",
      evidence: {
        page: 482,
        locator_type: "section",
        locator_id: "9",
        quote: "We compared program results with manually calculated results and results published in the literature."
      },
      usable_as: "recommendation"
    },
    {
      claim: "A known analytical test case for AHP validation: when one criterion is judged x-times more important than n-1 others, the resulting weight must be w_AHP = x / (x + n - 1).",
      verbatim_quote: "if all criteria are equal (x = 1), it follows that wAHP = 1/n, and for four criteria, with one criterion nine times more important than all others, it follows wAHP = 9/12 or 75%",
      evidence: {
        page: 482,
        locator_type: "section",
        locator_id: "9",
        quote: "if all criteria are equal (x = 1), it follows that wAHP = 1/n, and for four criteria, with one criterion nine times more important than all others, it follows wAHP = 9/12 or 75%"
      },
      usable_as: "benchmark"
    },
    {
      claim: "Weight uncertainties due to rounding of judgments to integers can exceed 10% and must be estimated via Monte Carlo simulation with NVAR randomized variations.",
      verbatim_quote: "weight uncertainties due to rounding of the judgment to integers can exceed 10% and could affect the results of a decision",
      evidence: {
        page: 478,
        locator_type: "section",
        locator_id: "5",
        quote: "weight uncertainties due to rounding of the judgment to integers can exceed 10% and could affect the results of a decision"
      },
      usable_as: "recommendation"
    },
    {
      claim: "When two opposite judgments are aggregated by WGM-AIJ (x and 1/x), the result is equal weights, which may not represent true consensus; thus the consensus indicator must be evaluated separately.",
      verbatim_quote: "if we have two opposite judgments for two criteria (x and 1/x), an aggregation will result in equal weights for both criteria. In fact, there is no consensus, and equal weights may result in a deadlocked situation",
      evidence: {
        page: 477,
        locator_type: "section",
        locator_id: "4.2",
        quote: "if we have two opposite judgments for two criteria (x and 1/x), an aggregation will result in equal weights for both criteria. In fact, there is no consensus, and equal weights may result in a deadlocked situation"
      },
      usable_as: "recommendation"
    },
    {
      claim: "AHP-OS reached over 7,000 registered users by 2018 with at least 500 active users per 3-month period across applications in healthcare, climate, risk assessment, supplier selection, IT, marketing, environment, transport, project management, manufacturing and quality assurance.",
      verbatim_quote: "more than 7000 users have registered for the software, and on average, there are at least 500 active users over a three-month period",
      evidence: {
        page: 483,
        locator_type: "section",
        locator_id: "10",
        quote: "more than 7000 users have registered for the software, and on average, there are at least 500 active users over a three-month period"
      },
      usable_as: "benchmark"
    },
    {
      claim: "When the CR exceeds 10%, AHP-OS identifies and highlights the top-3 most inconsistent judgments via an inconsistency matrix, following the approach of Saaty (2003).",
      verbatim_quote: "If the consistency ratio CR exceeds 10%, the software calculates the top-3 inconsistent judgments",
      evidence: {
        page: 473,
        locator_type: "section",
        locator_id: "2.4",
        quote: "If the consistency ratio CR exceeds 10%, the software calculates the top-3 inconsistent judgments"
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "The software currently supports only the classical Analytic Hierarchy Process (AHP) and does not include the Analytic Network Process (ANP) for problems with dependencies and feedback.",
    "WGM-AIJ is the only group aggregation method implemented; alternative aggregation techniques are under future consideration.",
    "Sensitivity analysis is based on the local approach (one weight at a time), not global sensitivity analysis methods such as Monte Carlo over multiple weights simultaneously.",
    "Maintenance challenges arise from updates to underlying open source dependencies (PHP, MariaDB, SQLite) due to security requirements, requiring extensive re-testing.",
    "The system depends on internet access, limiting use in disconnected environments."
  ],
  recommendations: [
    "Use AHP-OS as a transparent reference tool for educational, research and cross-validation purposes where calculations and algorithms must be fully documented.",
    "Validate any AHP implementation against AHP-OS results via black box testing: compare weights, CR, and aggregated alternative scores.",
    "Apply the test case w_AHP = x/(x + n - 1) for analytical validation of weight calculations in any AHP software.",
    "Always evaluate the AHP Group Consensus Indicator alongside WGM-AIJ aggregation; results with consensus ≤ 50% should be treated with caution and may require additional discussion rounds.",
    "For matrices larger than 10x10, prefer Alonso & Lamata (2006) linear-fit CR formula over Saaty's original RI-table approach."
  ],
  cites: ["saaty1980", "saaty2003", "alonso2006", "harker1987", "ishizaka2009_expertchoice", "siraj2015_priest", "ossadnik2013_evaluation", "groselj2015_aggregation", "wenhsiangwu2008_aggregation"],
  cited_by_context: {
    saaty1980: "Cited as the founder of AHP and source of the original 1-9 fundamental scale.",
    saaty2003: "Cited for the Decision Making with the AHP: principal eigenvector justification and inconsistency identification approach.",
    alonso2006: "Cited as the source of the linear-fit CR formula adopted by AHP-OS in place of Saaty's RI table.",
    harker1987: "Cited as source of root square scale and power scale; also references their ratio scale estimation theory.",
    ishizaka2009_expertchoice: "Cited in the comparison of AHP software packages.",
    siraj2015_priest: "Cited as alternative AHP priority estimation tool.",
    ossadnik2013_evaluation: "Cited as comparative evaluation of AHP software from management accounting perspective."
  },
  notes: [
    "This paper is the canonical reference for the BPMSG AHP Online System (AHP-OS), publicly available at https://bpmsg.com/academic/ahp.php for non-commercial use.",
    "Software validation methodology described here is the foundation for the ahpanplib (Creative Decisions Foundation) cross-validation approach used in many subsequent AHP implementations.",
    "The author Klaus D. Goepel maintains the BPMSG (Business Performance Management Singapore) initiative and is affiliated with email drklaus@bpmsg.com.",
    "The Alonso-Lamata (2006) CR formula adopted here (Eq. 5) is critical: it allows CR calculation for n > 10 where Saaty's original RI table runs out.",
    "Eq. 41 (w_AHP = x/(x+n-1)) is the canonical analytical test case for validating any AHP software implementation. For Pedro's dissertation: comparing implementation weights with Goepel's test case provides analytical validation, complementing the AHP-OS/ahpanplib black box validation.",
    "Consensus indicator categories (Table 2: ≤50% very low ... ≥85% very high) provide a standardized scale for reporting group consensus quality in AHP studies.",
    "DOI 10.13033/ijahp.v10i3.590 verified via IJAHP. ISSN 1936-6744."
  ]
};

export default article;
