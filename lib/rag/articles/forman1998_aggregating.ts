/**
 * Article Extraction: FORMAN, Ernest; PENIWATI, Kirti (1998)
 * "Aggregating individual judgments and priorities with the Analytic Hierarchy Process"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "forman1998_aggregating",
  citation: {
    abnt: "FORMAN, Ernest; PENIWATI, Kirti. Aggregating individual judgments and priorities with the Analytic Hierarchy Process. European Journal of Operational Research, v. 108, n. 1, p. 165-169, 1998.",
    bibtex: "@article{forman1998aggregating,\n  title={Aggregating individual judgments and priorities with the Analytic Hierarchy Process},\n  author={Forman, Ernest and Peniwati, Kirti},\n  journal={European Journal of Operational Research},\n  volume={108},\n  number={1},\n  pages={165--169},\n  year={1998},\n  publisher={Elsevier}\n}"
  },
  doi: null,
  type: "methodological",
  metadata: { year: 1998, venue: "European Journal of Operational Research", domain: "Group Decision Making" },
  thresholds: [],
  formulas: [
    {
      id: "aij_weighted_geometric_mean",
      label: "Unnumbered Eq. (Section 7)",
      latex: "J_{g}(k,l)=\\prod_{i=1}^{n}J_{i}(k,l)^{w_{i}}",
      description: "Calculates the weighted geometric mean of individual judgments for AIJ.",
      variables: {
        "J_{g}(k,l)": "group judgement of the relative importance of factors k and l",
        "J_{i}(k,l)": "individual i's judgment of the relative importance of factors k and l",
        "w_{i}": "weight of individual i",
        n: "number of decision-makers"
      },
      conditions: "Used when the group acts as a synergistic unit (AIJ) and decision-makers are not equally important.",
      evidence: {
        page: 168,
        locator_type: "section",
        locator_id: "7",
        quote: "Weighted geometric mean of judgments (AIJ): J_{g}(k,l)=\\prod_{i=1}^{n}J_{i}(k,l)^{w_{i}}"
      }
    },
    {
      id: "aip_weighted_arithmetic_mean",
      label: "Unnumbered Eq. (Section 7)",
      latex: "P_{g}(A_{j})=\\sum_{i=1}^{n}w_{i}P_{i}(A_{j})",
      description: "Calculates the weighted arithmetic mean of individual priorities for AIP.",
      variables: {
        "P_{g}(A_{j})": "group priority of alternative j",
        "P_{i}(A_{j})": "individual i's priority of alternative j",
        "w_{i}": "weight of individual i",
        n: "number of decision-makers"
      },
      conditions: "Used when aggregating individual priorities (AIP) and individuals are not equally important.",
      evidence: {
        page: 168,
        locator_type: "section",
        locator_id: "7",
        quote: "Weighted arithmetic mean of priorities (AIP): P_{g}(A_{j})=\\sum_{i=1}^{n}w_{i}P_{i}(A_{j})"
      }
    },
    {
      id: "pareto_geometric_mean",
      label: "Unnumbered Eq. (Section 6)",
      latex: "\\sqrt[n]{\\prod_{i=1}^{n}a_{i}}\\ge\\sqrt[n]{\\prod_{i=1}^{n}b_{i}}",
      description: "Demonstrates that the geometric average of priorities satisfies the Pareto principle.",
      variables: {
        "a_{i}": "priority of alternative A for individual i",
        "b_{i}": "priority of alternative B for individual i",
        n: "number of individuals"
      },
      conditions: "Valid provided a_i >= 0 and b_i >= 0 for i=1,2,...,n.",
      evidence: {
        page: 167,
        locator_type: "section",
        locator_id: "6",
        quote: "for a geometric mean provided a_{i}\\ge0 and b_{i}\\ge0, i=1,2,...,n."
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
      claim: "AIJ requires treating the group as a single synergistic unit.",
      verbatim_quote: "the group becomes a new 'individual' and behaves like one. There is a synergistic aggregation of individual judgments.",
      evidence: {
        page: 166,
        locator_type: "section",
        locator_id: "3",
        quote: "the group becomes a new 'individual' and behaves like one. There is a synergistic aggregation of individual judgments."
      },
      usable_as: "definition"
    },
    {
      claim: "The Pareto principle does not apply when using AIJ.",
      verbatim_quote: "Because we are not concerned with individual priorities... individual priorities are irrelevant or non-existent. Thus, the Pareto principle... is irrelevant.",
      evidence: {
        page: 166,
        locator_type: "section",
        locator_id: "3",
        quote: "Because we are not concerned with individual priorities... individual priorities are irrelevant or non-existent. Thus, the Pareto principle... is irrelevant."
      },
      usable_as: "limitation"
    },
    {
      claim: "AIJ strictly requires the use of the geometric mean.",
      verbatim_quote: "Treating the group as a new 'individual' with AIJ requires satisfaction of the reciprocity condition... Thus, for AIJ, the geometric mean must be used.",
      evidence: {
        page: 167,
        locator_type: "section",
        locator_id: "6",
        quote: "Treating the group as a new 'individual' with AIJ requires satisfaction of the reciprocity condition... Thus, for AIJ, the geometric mean must be used."
      },
      usable_as: "recommendation"
    },
    {
      claim: "AIP is used when individuals maintain separate value systems.",
      verbatim_quote: "When individuals are each acting in his or her own right, with different value systems, we are concerned about each individual's resulting alternative priorities.",
      evidence: {
        page: 167,
        locator_type: "section",
        locator_id: "4",
        quote: "When individuals are each acting in his or her own right, with different value systems, we are concerned about each individual's resulting alternative priorities."
      },
      usable_as: "definition"
    },
    {
      claim: "While both means work for AIP, geometric mean fits AHP's ratio scale better.",
      verbatim_quote: "While either an arithmetic or geometric mean can be used for AIP, the geometric mean is more consistent with the meaning of both judgments and priorities",
      evidence: {
        page: 168,
        locator_type: "section",
        locator_id: "6",
        quote: "While either an arithmetic or geometric mean can be used for AIP, the geometric mean is more consistent with the meaning of both judgments and priorities"
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "Using AIJ means individual identities and individual priorities are lost with every stage of aggregation.",
    "Ramanathan and Ganesh's eigenvector method to weight decision-makers is only valid if the weight priorities for individual weight derivation mirror those of the actual problem."
  ],
  recommendations: [
    "Choose AIJ if the group is assumed to act together as a synergistic unit.",
    "Choose AIP if the group is a collection of independent individuals with different value systems.",
    "Use the geometric mean rather than the arithmetic mean when aggregating individual judgments (AIJ) to satisfy the reciprocity condition.",
    "Prefer the geometric mean over the arithmetic mean for AIP because it is more consistent with the ratio scale meaning of AHP priorities."
  ],
  cites: ["aczel_", "ramanathan_"],
  cited_by_context: {
    aczel_: "Proved that only the geometric mean satisfies Pareto and homogeneity conditions when reciprocity is assumed in AIJ.",
    ramanathan_: "Proposed an eigenvector method for deriving decision-maker weights and argued against AIJ regarding the Pareto principle."
  },
  notes: [
    "The OCR of the original PDF contained a corrupted mathematical formula for the weighted (un-normalized) geometric mean of priorities (AIP) on page 168. To adhere to the zero hallucination rule, the corrupted LaTeX was omitted from the formulas array.",
    "The text addresses group decision-making (AIJ vs AIP) exclusively. It does not contain BOCR, IPC, fairness, or sensitivity analysis topics."
  ]
};

export default article;
