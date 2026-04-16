/**
 * Article Extraction: OSSADNIK, W.; SCHINKE, S.; KASPAR, R (2016)
 * "H"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "ossadnik2016_group_aggregation",
  citation: {
    abnt: "OSSADNIK, W.; SCHINKE, S.; KASPAR, R. H. Group Aggregation Techniques for Analytic Hierarchy Process and Analytic Network Process: A Comparative Analysis. Group Decision and Negotiation, v. 25, n. 2, p. 421-457, 2016.",
    bibtex: "@article{ossadnik2016group,\n  title={Group Aggregation Techniques for Analytic Hierarchy Process and Analytic Network Process: A Comparative Analysis},\n  author={Ossadnik, Wolfgang and Schinke, Stefanie and Kaspar, Ralf H},\n  journal={Group Decision and Negotiation},\n  volume={25},\n  pages={421--457},\n  year={2016},\n  publisher={Springer}\n}"
  },
  doi: "10.1007/s10726-015-9448-4",
  type: "methodological",
  metadata: { year: 2016, venue: "Group Decision and Negotiation", domain: "Strategic Management / Group Decision Making" },
  thresholds: [
    {
      metric: "Expected Loss (X) LFA 3x3",
      operator: "<",
      value: 0.0049,
      unit: "score",
      context: "tolerance limit for evaluation reliability function in 3x3 matrix",
      evidence: {
        page: 435,
        locator_type: "table",
        locator_id: "Table 3",
        quote: "Tolerance limit in dependency of the matrix dimension: (3x3: 0 < X < 0.0049;"
      }
    },
    {
      metric: "Expected Loss (X) LFA 4x4",
      operator: "<",
      value: 0.0529,
      unit: "score",
      context: "tolerance limit for evaluation reliability function in 4x4 matrix",
      evidence: { page: 435, locator_type: "table", locator_id: "Table 3", quote: "4x4: 0 < X < 0.0529" }
    },
    {
      metric: "Expected Loss (X) LFA 5x5",
      operator: "<",
      value: 0.1369,
      unit: "score",
      context: "tolerance limit for evaluation reliability function in 5x5 matrix",
      evidence: { page: 435, locator_type: "table", locator_id: "Table 3", quote: "5x5: 0 < X < 0.1369)" }
    }
  ],
  formulas: [
    {
      id: "aij_wamm",
      label: "AIJ (WAMM)",
      latex: "A_{WAMM}(i, j) = \\sum_{r=1}^{R} w^r \\cdot a_{i,j}^r",
      description: "Aggregated pairwise comparison judgment using the weighted arithmetic mean method.",
      variables: {
        "A_{WAMM}(i, j)": "aggregated group judgment",
        "w^r": "weight of group member r",
        "a_{i,j}^r": "individual judgment of member r"
      },
      conditions: "Violates reciprocity property and generates inconsistent collective matrices; generally excluded for AHP/ANP group preference building.",
      evidence: {
        page: 434,
        locator_type: "paragraph",
        locator_id: "Section 4.3.1",
        quote: "aggregated pairwise comparison judgment A (i, j) is computed by the weighted arithmetic mean method (WAMM): AWAMM (i,j) = \\sum_{r=1}^{R}w^{r}\\cdot a_{i.j}^{r}"
      }
    },
    {
      id: "aip_wamm",
      label: "AIP (WAMM)",
      latex: "P_{WAMM}(A_i) = \\sum_{r=1}^{R} w^r \\cdot p^r(A_i)",
      description: "Synthesized group priority for an alternative using weighted arithmetic mean of individual priorities.",
      variables: {
        "P_{WAMM}(A_i)": "group priority for alternative i",
        "w^r": "weight of group member r",
        "p^r(A_i)": "individual priority of alternative i"
      },
      conditions: "Cannot guarantee the fulfillment of the power conditions (reciprocal property).",
      evidence: {
        page: 435,
        locator_type: "paragraph",
        locator_id: "Section 4.3.1",
        quote: "synthesized group priorities P(A_{i}) for an alternative A_{j} can be obtained by \\overline{AMM}(A_{i})=\\sum_{r=1}^{\\hat{R}}w^{r}\\cdot p^{r}(A_{i})"
      }
    },
    {
      id: "aip_wgmm",
      label: "AIP (WGMM)",
      latex: "P_{WGMM}(A_i) = \\prod_{r=1}^{R} (p^r(A_i))^{w^r}",
      description: "Synthesized group priority for an alternative using weighted geometric mean of individual priorities.",
      variables: {
        "P_{WGMM}(A_i)": "group priority for alternative i",
        "w^r": "weight of group member r",
        "p^r(A_i)": "individual priority of alternative i"
      },
      conditions: "Highly recommended as it satisfies the reciprocal property as a special case of the power conditions.",
      evidence: {
        page: 435,
        locator_type: "paragraph",
        locator_id: "Section 4.3.1",
        quote: "or PWGMM (A_{i})=\\prod_{r=1}^{R}(p^{r}(A_{i}))^{w^{r}}"
      }
    },
    {
      id: "lfa_expected_loss",
      label: "LFA Step 2",
      latex: "X = VAR_{CR} + (\\overline{CR})^2",
      description: "Expected loss calculation in the Loss Function Approach, combining variance of inconsistency and mean inconsistency.",
      variables: {
        X: "expected loss",
        "VAR_{CR}": "variance of the inconsistency ratio",
        "\\overline{CR}": "mean of the inconsistency ratio"
      },
      conditions: "Used to determine collective weight; smaller X implies higher consistency of judgments.",
      evidence: {
        page: 435,
        locator_type: "table",
        locator_id: "Table 3",
        quote: "Calculation of the expected loss X: X = VAR_{CR} + (\\overline{CR})^2"
      }
    },
    {
      id: "lfa_group_priority",
      label: "LFA Step 4",
      latex: "P^{LFA}(A_i) = \\sum_{k=1}^{K} F(X_j) \\cdot P(A_{i,j}) \\cdot P(C_j)",
      description: "Aggregation of group priorities using the evaluation reliability function F(X_j).",
      variables: {
        "P^{LFA}(A_i)": "LFA group priority for alternative i",
        "F(X_j)": "reliability function weight",
        "P(A_{i,j})": "priority of alternative i w.r.t criterion j",
        "P(C_j)": "priority of criterion j"
      },
      conditions: "Implementation is complex and time consuming; explicitly considers consistency of individual judgments.",
      evidence: {
        page: 435,
        locator_type: "table",
        locator_id: "Table 3",
        quote: "Aggregation of group priorities P^{LFA}(A_{i})=\\sum_{k=1}^{K}F(X_{j})\\cdot P(A_{i,j})\\cdot P(C_{j})"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 9",
      caption: "Results of comparative evaluation",
      content: {
        columns: [
          "Evaluation criteria/aggregation techniques",
          "AIJ (WAMM)",
          "AIJ (WGMM)",
          "AIP (WAMM)",
          "AIP (WGMM)",
          "LFA (WAMM)",
          "LFA (WGMM)",
          "Group AHP model"
        ],
        rows: [
          ["Decision contexts: Group size: small (~2-5 Persons)", "-", "+", "+", "+", "+", "+", "+"],
          ["Decision contexts: Group size: large (>5 Persons)", "-", "-", "+", "+", "+", "+", "-"],
          ["Decision contexts: Situation: common objectives", "-", "+", "+", "+", "+", "+", "+"],
          ["Decision contexts: Situation: divergent objectives", "-", "-", "+", "+", "+", "+", "+"],
          ["Decision contexts: Situation: conflicting objectives", "-", "-", "+", "+", "+", "+", "-"],
          ["Consistency: Improvement", "-", "+", "-", "-", "-", "-", "-"],
          ["Consistency: Consideration", "-", "-", "-", "-", "+", "+", "-"],
          ["Social choice axioms: Universal domain", "+", "+", "+", "+", "+", "+", "+"],
          ["Social choice axioms: Pareto Optimality", "-", "-", "+", "+", "+", "-", "+"],
          [
            "Social choice axioms: Independence of irrelevant alternatives",
            "-",
            "-",
            "-",
            "-",
            "-",
            "-",
            "-"
          ],
          ["Social choice axioms: Nondictatorship", "+", "+", "+", "+", "+", "+", "+"],
          ["Social choice axioms: Separability condition", "+", "+", "+", "+", "+", "+", "+"],
          ["Social choice axioms: Unanimity condition", "-", "-", "+", "+", "+", "-", "+"],
          ["Social choice axioms: Homogeneity condition", "-", "-", "+", "+", "-", "-", "-"],
          ["Social choice axioms: Power conditions (reciprocal property)", "-", "+", "-", "+", "-", "-", "-"]
        ]
      },
      notes: "Transcribed fully. Symbols defined in source: (+) Satisfied; (.) Partially satisfied/satisfied with restrictions; (-) Not satisfied.",
      evidence: { page: 445, locator_type: "table", locator_id: "Table 9", quote: "Table 9 Results of comparative evaluation" }
    },
    {
      kind: "table",
      label: "Table 10",
      caption: "Case example: group priorities and resulting rankings of the alternatives",
      content: {
        columns: ["Aggregation Method", "A1", "A2", "A3", "A4", "Ranking", "Best alternative"],
        rows: [
          ["AIJ (WAMM)", "0.291", "0.322", "0.133", "0.254", "A2 > A1 > A4 > A3", "A2"],
          ["AIJ (WGMM)", "0.280", "0.344", "0.130", "0.246", "A2 > A1 > A4 > A3", "A2"],
          ["AIP (WAMM)", "0.313", "0.300", "0.146", "0.241", "A1 > A2 > A4 > A3", "A1"],
          ["AIP (WGMM)", "0.319", "0.288", "0.149", "0.244", "A1 > A2 > A4 > A3", "A1"],
          ["LFA (WAMM)", "0.254", "0.343", "0.128", "0.275", "A2 > A1 > A4 > A3", "A2"],
          ["LFA (WGMM)", "0.289", "0.343", "0.133", "0.234", "A2 > A1 > A4 > A3", "A2"],
          ["Group AHP model", "0.370", "0.264", "0.041", "0.325", "A1 > A2 > A4 > A3", "A1"]
        ]
      },
      notes: "Extracted for 'Test scenario 1'.",
      evidence: {
        page: 446,
        locator_type: "table",
        locator_id: "Table 10",
        quote: "Table 10 Case example: group priorities and resulting rankings of the alternatives"
      }
    }
  ],
  empirical_data: {
    n_respondents: 3,
    aggregation: "AIJ",
    n_alternatives: 4,
    n_criteria: { total: 6, B: null, O: null, C: null, R: null },
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
      claim: "AIJ using the arithmetic mean violates reciprocity and creates inconsistent matrices.",
      verbatim_quote: "the arithmetic form of AIJ (AIJ (WAMM)) generates inconsistent collective pairwise comparison matrices, even if all individual judgments were consistent.",
      evidence: {
        page: 439,
        locator_type: "paragraph",
        locator_id: "Section 4.3.2.2",
        quote: "the arithmetic form of AIJ (AIJ (WAMM)) generates inconsistent collective pairwise comparison matrices, even if all individual judgments were consistent."
      },
      usable_as: "recommendation"
    },
    {
      claim: "AIJ-WAMM must be excluded from group preference aggregation applications.",
      verbatim_quote: "the AIJ (WAMM) has to be excluded from any application.",
      evidence: {
        page: 444,
        locator_type: "paragraph",
        locator_id: "Section 5",
        quote: "the AIJ (WAMM) has to be excluded from any application."
      },
      usable_as: "limitation"
    },
    {
      claim: "Geometric aggregation (AIJ-WGMM) improves group consistency levels.",
      verbatim_quote: "Geometric aggregation leads to a compensation of single inconsistent matrices to consistent group judgments",
      evidence: {
        page: 439,
        locator_type: "paragraph",
        locator_id: "Section 4.3.2.2",
        quote: "Geometric aggregation leads to a compensation of single inconsistent matrices to consistent group judgments"
      },
      usable_as: "benchmark"
    },
    {
      claim: "Only AIP using the geometric mean fully satisfies the reciprocal property.",
      verbatim_quote: "Only the procedure of AIP using the geometric mean is able to satisfy the reciprocal property as special case of the power conditions.",
      evidence: {
        page: 443,
        locator_type: "paragraph",
        locator_id: "Section 4.3.2.3",
        quote: "Only the procedure of AIP using the geometric mean is able to satisfy the reciprocal property as special case of the power conditions."
      },
      usable_as: "recommendation"
    },
    {
      claim: "AIP is the most recommendable method for small expert groups facing complex strategic decisions.",
      verbatim_quote: "AIP remains as the most recommendable aggregation technique within the AHP and ANP to support highly complex decision problems in a small expert group.",
      evidence: {
        page: 449,
        locator_type: "paragraph",
        locator_id: "Section 6",
        quote: "AIP remains as the most recommendable aggregation technique within the AHP and ANP to support highly complex decision problems in a small expert group."
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "AIJ (WAMM) violates reciprocity and should not be used.",
    "LFA and Group AHP models are complex, time-consuming, and lack standard software support.",
    "Group AHP applicability is rather limited to small groups and simply structured decision problems."
  ],
  recommendations: [
    "Exclude arithmetic aggregation of individual judgments (AIJ-WAMM).",
    "Use AIP (WGMM) to satisfy rationality axioms like reciprocity and homogeneity.",
    "Use AIJ (WGMM) only if the group is small, homogeneous, and willing to act as a synergistic unit."
  ],
  cites: ["saaty1983", "arrow1978", "cho2008", "peniwati1998"],
  cited_by_context: {
    saaty1983: "Adaptation of Arrow's social choice axioms to cardinal scales (separability, unanimity, homogeneity, power conditions).",
    arrow1978: "Fundamental social choice axioms for evaluating aggregation methods.",
    cho2008: "Proposal of the Loss Function Approach (LFA) using inconsistency ratio to determine group weights.",
    peniwati1998: "Postulation that AIJ should strictly use the geometric mean rather than the arithmetic mean due to reciprocity."
  },
  notes: [
    "The article heavily focuses on the axioms of Arrow and Aczél/Saaty applied to AHP group decisions.",
    "BOCR, sensitivity methods (MC vs OAT), and disparate impact are out of scope for this specific paper.",
    "[Sanitized] cr_values (original): Individual CRs: DM1=0.0889, DM2=0.0786, DM3=0.0563. Aggregated CRs: AIJ(WAMM)=0.7778, AIJ(WGMM)=0.0005.",
    "[Sanitized] sensitivity (original): Tested via 4 distinct test scenarios altering rank order, preference ratio constancy, and value distances.",
    "[Sanitized] rankings_by_method (original): AIP/Group AHP yielded A1 > A2 > A4 > A3; AIJ/LFA yielded A2 > A1 > A4 > A3.",
    "[Sanitized] aggregation (original): AIJ (WAMM/WGMM), AIP (WAMM/WGMM), LFA, Group AHP"
  ]
};

export default article;
