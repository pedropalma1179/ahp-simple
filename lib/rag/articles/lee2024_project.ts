/**
 * Article Extraction: LEE, H (2024)
 * "Y"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "lee2024_project",
  citation: {
    abnt: "LEE, H. Y. et al. Multi-Criteria Decision-Making Tools for Project Selection by International Conglomerates. Process Integration and Optimization for Sustainability, v. 8, p. 375-393, 2024.",
    bibtex: "@article{lee2024multicriteria,\n  title={Multi-Criteria Decision-Making Tools for Project Selection by International Conglomerates},\n  author={Lee, Ho Yan and Heng, Yi Peng and Selvanathan, Kashwin and Chandrahasan, Prasanth and Chemmangattuvalappil, Nishanth G.},\n  journal={Process Integration and Optimization for Sustainability},\n  volume={8},\n  pages={375--393},\n  year={2024},\n  publisher={Springer}\n}"
  },
  doi: "10.1007/s41660-023-00376-1",
  type: "application",
  metadata: {
    year: 2024,
    venue: "Process Integration and Optimization for Sustainability",
    domain: "Energy Sector / Project Management"
  },
  thresholds: [
    {
      metric: "CR",
      operator: "<",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency of pairwise comparison matrix",
      evidence: {
        page: 380,
        locator_type: "paragraph",
        locator_id: "Section: Methodology",
        quote: "the result is said to be consistent only if the corresponding CR value is lower than 10%"
      }
    }
  ],
  formulas: [
    {
      id: "final_score",
      label: "Eq. 1",
      latex: "FinalScore = \\sum_{i=1}^{n} W_i S_{ik}",
      description: "Final score of the kth alternative evaluated based on weight of objective and score.",
      variables: {
        FinalScore: "Final score of alternative k",
        W_i: "Weight of objective i",
        "S_{ik}": "Score of kth alternative on ith objective"
      },
      conditions: "Used after the weight Wi is generated for the ith objective and score Sik is given.",
      evidence: {
        page: 379,
        locator_type: "equation",
        locator_id: "Eq. 1",
        quote: "the final score of the kth alternative is then evaluated using the Eq. 1 below"
      }
    },
    {
      id: "ci_formula",
      label: "Eq. 11",
      latex: "CI = \\frac{\\lambda_{max} - n}{n - 1}",
      description: "Consistency Index calculation.",
      variables: { CI: "Consistency Index", "\\lambda_{max}": "Maximum eigenvalue", n: "Size of matrix" },
      conditions: "Calculated to check for the consistency of the outcomes from AHP.",
      evidence: {
        page: 380,
        locator_type: "equation",
        locator_id: "Eq. 11",
        quote: "Equation 11 shows the consistency index, which can be further divided into the definition for RI and CR."
      }
    },
    {
      id: "cr_formula",
      label: "Eq. 12",
      latex: "CR = \\frac{CI}{RI}",
      description: "Consistency Ratio calculation to indicate consistency of the matrix.",
      variables: { CR: "Consistency Ratio", CI: "Consistency Index", RI: "Random Index" },
      conditions: "For values higher than 10%, the comparison and ratio matrix will be revised, and re-evaluation will be done.",
      evidence: {
        page: 381,
        locator_type: "equation",
        locator_id: "Eq. 12",
        quote: "It is the ratio of CI (A): RI (A), where RI(A) is the random index for matrices of size n."
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 2",
      caption: "The fundamental scale",
      content: {
        columns: ["Intensity of importance", "Definition", "Explanation"],
        rows: [
          ["1", "Equal importance", "Two activities contribute equally to the objective"],
          ["3", "Moderate importance", "Experience and judgement slightly favour one activity over another"],
          ["5", "Strong importance", "Experience and judgement strongly favour one activity over another"],
          [
            "7",
            "Very strong importance",
            "An activity is favoured very strongly over another, and its dominance demonstrated in practice"
          ],
          [
            "9",
            "Extreme importance",
            "The evidence favouring one activity over another is of the highest possible order of affirmation"
          ],
          [
            "2, 4, 6, 8",
            "Intermediate value between the two adjacent judgements",
            "When compromise is needed"
          ],
          [
            "Reciprocals of above",
            "If activity i has one of the above non-zero numbers assigned to it when compared with activity j, then j has the reciprocal value when compared with i",
            "A reasonable assumption"
          ],
          [
            "1.1 to 1.9",
            "If the activities are very close",
            "May be difficult to assign the best value but when compared with other contrasting activities the size of the small numbers would not be too noticeable, yet they can still indicate the relative importance of the activities"
          ]
        ]
      },
      notes: "Transcribed fully.",
      evidence: { page: 380, locator_type: "table", locator_id: "Table 2", quote: "Table 2 The fundamental scale" }
    },
    {
      kind: "table",
      label: "Table 3",
      caption: "Random consistency table",
      content: {
        columns: ["Size of matrix (n)", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        rows: [
          ["Random index (RI)", "0", "0", "0.52", "0.89", "1.11", "1.25", "1.35", "1.4", "1.45", "1.49"]
        ]
      },
      notes: "Transcribed fully.",
      evidence: { page: 381, locator_type: "table", locator_id: "Table 3", quote: "Table 3 Random consistency table" }
    },
    {
      kind: "table",
      label: "Table 14",
      caption: "Summary of weightages for different projects",
      content: {
        columns: ["", "OPEX", "CAPEX", "ESG", "Ease of business", "Final weightage", "Ranking"],
        rows: [
          ["Project 1", "0.302", "0.244", "0.125", "0.089", "20.8%", "2"],
          ["Project 2", "0.132", "0.085", "0.352", "0.325", "20.2%", "4"],
          ["Project 3", "0.226", "0.226", "0.125", "0.187", "20.3%", "3"],
          ["Project 4", "0.252", "0.340", "0.049", "0.113", "20.9%", "1"],
          ["Project 5", "0.055", "0.042", "0.165", "0.187", "10.2%", "5"],
          ["Project 6", "0.034", "0.063", "0.185", "0.098", "7.7%", "6"]
        ]
      },
      notes: "Transcribed fully.",
      evidence: {
        page: 388,
        locator_type: "table",
        locator_id: "Table 14",
        quote: "Table 14 Summary of weightages for different projects"
      }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: 6,
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
      claim: "Capital cost is the most critical criterion for selecting highly capital-intensive projects in the energy sector.",
      verbatim_quote: "Capital cost contributes the most to this decision because the projects considered in this case are highly capital intensive.",
      evidence: {
        page: 375,
        locator_type: "paragraph",
        locator_id: "Abstract",
        quote: "Capital cost contributes the most to this decision because the projects considered in this case are highly capital intensive."
      },
      usable_as: "benchmark"
    },
    {
      claim: "AHP provides consistent and robust ratings for multifaceted decision-making in project management.",
      verbatim_quote: "the AHP can be considered to be robust as the methods and techniques used to conduct pair-wise comparisons are able to produce consistent, reliable ratings",
      evidence: {
        page: 383,
        locator_type: "paragraph",
        locator_id: "Conclusions",
        quote: "the AHP can be considered to be robust as the methods and techniques used to conduct pair-wise comparisons are able to produce consistent, reliable ratings"
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "Multi-criteria decision-making tools have been extensively employed for project selection, they often lack integration with the key value drivers, especially when dealing with projects of significantly different scopes."
  ],
  recommendations: [
    "Apply the Decision Quality (DQ) framework integrating AHP as a tool to mitigate uncertainties and produce clear-cut answers.",
    "Formulate a team consisting of Subject Matter Experts (SMEs) to define decision parameters and build strategy tables."
  ],
  cites: ["saaty1987", "triantaphyllou_mann1995"],
  cited_by_context: {
    saaty1987: "Foundational citation for AHP design as a decision-making methodology to organize elements hierarchically.",
    triantaphyllou_mann1995: "Citation to support the 10% Consistency Ratio (CR) acceptable limit."
  },
  notes: [
    "The article does not strictly use a BOCR framework, focusing instead on CAPEX, OPEX, ESG, and Ease of Business as the primary decision criteria. Therefore, BOCR weights are logged as null.",
    "The number of respondents (decision makers) is not quantified; the methodology relied on consensus through group brainstorming sessions.",
    "[Sanitized] cr_values (original): Strategy pairwise: 5%; CAPEX: 5%; OPEX: 5%; ESG: 4%; Ease of business: 1%",
    "[Sanitized] rankings_by_method (original): Project 4 > Project 1 > Project 3 > Project 2 > Project 5 > Project 6",
    "[Sanitized] aggregation (original): Consensus through brainstorming sessions for each pair"
  ]
};

export default article;
