/**
 * Article Extraction: TAVANA, Madjid; SOLTANIFAR, Mehdi; SANTOS-ARTEAGA, Francisco J (2023)
 * "Analytical hierarchy process: revolution and evolution"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "tavana2023_revolution",
  citation: {
    abnt: "TAVANA, Madjid; SOLTANIFAR, Mehdi; SANTOS-ARTEAGA, Francisco J. Analytical hierarchy process: revolution and evolution. Annals of Operations Research, v. 326, p. 879-907, 2023.",
    bibtex: "@article{tavana2023analytical,\n  title={Analytical hierarchy process: revolution and evolution},\n  author={Tavana, Madjid and Soltanifar, Mehdi and Santos-Arteaga, Francisco J},\n  journal={Annals of Operations Research},\n  volume={326},\n  pages={879--907},\n  year={2023},\n  publisher={Springer}\n}"
  },
  doi: "10.1007/s10479-021-04432-2",
  type: "methodological",
  metadata: { year: 2023, venue: "Annals of Operations Research", domain: "Multi-Criteria Decision-Making (MCDM)" },
  thresholds: [
    {
      metric: "inconsistency ratio",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency of pairwise comparisons",
      evidence: {
        page: 883,
        locator_type: "section",
        locator_id: "Step 3",
        quote: "Saaty (1980) suggested that if the inconsistency ratio is less than or equal to 0.1, the results of the pairwise comparisons are acceptable."
      }
    }
  ],
  formulas: [
    {
      id: "ahp_inconsistency_index",
      label: "II",
      latex: "II = \\frac{\\lambda_{max}-m}{m-1}",
      description: "Calculates the inconsistency index for a pairwise comparison matrix of size m.",
      variables: { II: "inconsistency index", "\\lambda_{max}": "largest Eigenvalue", m: "matrix size" },
      conditions: "Applied to evaluate the consistency of an m x m pairwise comparison matrix.",
      evidence: {
        page: 883,
        locator_type: "section",
        locator_id: "Step 3.d",
        quote: "Assuming that the pairwise comparison matrix (D) is an m×m matrix, the inconsistency index equals $\\frac{\\lambda_{max}-m}{m-1}$."
      }
    },
    {
      id: "swara_weight",
      label: "Eq. (6)",
      latex: "w_{j}=\\frac{q_{j}}{\\sum_{k=1}^{m}q_{k}}",
      description: "Calculates the local priority of a criterion in the SWARA method.",
      variables: { w_j: "local priority", q_j: "relative weight", m: "number of criteria" },
      conditions: "Used after calculating relative weights (q_j) through interactions with decision-makers.",
      evidence: {
        page: 887,
        locator_type: "equation",
        locator_id: "Eq. (6)",
        quote: "Calculate the local priority of criterion $w_{j}$, $(j=1,2,...,m)$ using Eq. (6)."
      }
    },
    {
      id: "bwm_ahp_cr",
      label: "Eq. (12)",
      latex: "C.R=\\frac{\\xi^{*}}{C.I}",
      description: "Inconsistency ratio of judgments per hierarchical level in BWM-AHP.",
      variables: { "C.R": "consistency ratio", "\\xi^{*}": "optimal objective value", "C.I": "consistency index" },
      conditions: "Used to accept some degree of inconsistency in experts' judgments; C.I is extracted from predefined tables.",
      evidence: {
        page: 891,
        locator_type: "equation",
        locator_id: "Eq. (12)",
        quote: "the inconsistency ratio of the judgments per hierarchical level is defined by Eq. (12)"
      }
    },
    {
      id: "ahp_express_priority",
      label: "Eq. (11)",
      latex: "w_{j}=\\frac{1/a_{Bj}}{\\sum_{k=1}^{m}1/a_{Bk}}",
      description: "Calculates local priorities in the AHP-express (BM-AHP) method.",
      variables: { w_j: "local priority", "a_{Bj}": "preference of the best element to element j", m: "total elements" },
      conditions: "Requires only m-1 comparisons between the best element per level and the other elements.",
      evidence: {
        page: 891,
        locator_type: "equation",
        locator_id: "Eq. (11)",
        quote: "The local priorities of the criteria and alternatives per criterion are obtained by applying Eq. (11)."
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "Inconsistency Index of Random Matrix (I.I.R.)",
      content: {
        columns: ["m", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        rows: [
          [
            "I.I.R",
            "0",
            "0",
            "0.58",
            "0.90",
            "1.12",
            "1.24",
            "1.32",
            "1.41",
            "1.45",
            "1.45",
            "1.51",
            "1.52",
            "1.56",
            "1.57",
            "1.59"
          ]
        ]
      },
      notes: "Extracted completely as it represents the standard Random Index (RI) table.",
      evidence: { page: 883, locator_type: "table", locator_id: "Table 1", quote: "Inconsistency Index of Random Matrix (I.I.R.)" }
    },
    {
      kind: "table",
      label: "Table 2",
      caption: "Consistency Index (C.I.)",
      content: {
        columns: ["m", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
        rows: [
          ["(C.I.)", "0", "0.44", "1.00", "1.63", "2.30", "3.00", "3.73", "4.47", "5.23"]
        ]
      },
      notes: "Consistency Index specifically for the Best-Worst Method (BWM).",
      evidence: { page: 887, locator_type: "table", locator_id: "Table 2", quote: "Consistency Index (C.I.)" }
    }
  ],
  empirical_data: {
    n_respondents: 5,
    aggregation: "AIJ",
    n_alternatives: 3,
    n_criteria: { total: 4, B: null, O: null, C: null, R: null },
    bocr_weights: null,
    scores_by_method: {
      AHP: { "Acura TL": 0.342, "Toyota Camry": 0.204, "Honda Civic": 0.454 },
      "SWARA-VAHP": { "Acura TL": 0.4121, "Toyota Camry": 0.1779, "Honda Civic": 0.41 }
    },
    rankings_by_method: {
      AHP: { "Acura TL": 0, "Toyota Camry": 0, "Honda Civic": 0 },
      "SWARA-VAHP": { "Acura TL": 0, "Toyota Camry": 0, "Honda Civic": 0 }
    },
    concordance: null,
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "Experts are more motivated and provide better results with methods requiring fewer pairwise comparisons.",
      verbatim_quote: "experts are more motivated and attentive in methods requiring fewer pairwise comparisons and less interaction",
      evidence: {
        page: 879,
        locator_type: "section",
        locator_id: "Abstract",
        quote: "experts are more motivated and attentive in methods requiring fewer pairwise comparisons and less interaction"
      },
      usable_as: "recommendation"
    },
    {
      claim: "AHP requires a burdensome number of pairwise comparisons as elements increase.",
      verbatim_quote: "AHP requires \\frac{m^{2}-m}{2} pairwise comparisons per level with m elements, reducing the willingness of the expert(s) to provide information",
      evidence: {
        page: 894,
        locator_type: "section",
        locator_id: "4",
        quote: "AHP requires \\frac{m^{2}-m}{2} pairwise comparisons per level with m elements, reducing the willingness of the expert(s) to provide information"
      },
      usable_as: "limitation"
    },
    {
      claim: "AHP-express significantly reduces evaluation effort compared to traditional AHP.",
      verbatim_quote: "AHP-express is a special case of BWM-AHP that reduces the amount of information retrieved from experts.",
      evidence: {
        page: 894,
        locator_type: "section",
        locator_id: "4",
        quote: "AHP-express is a special case of BWM-AHP that reduces the amount of information retrieved from experts."
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "Rank reversals may arise when a copy or a close copy of one of the alternatives being ranked is added",
    "Complete additive aggregation allows for compensation between good and bad scores across criteria",
    "Pairwise comparisons equal (m^2-m)/2, becoming an arduous task as m increases",
    "Limitations imposed on decision-makers through the 9-point scale"
  ],
  recommendations: [
    "Use BWM-AHP or AHP-express to drastically reduce the number of required pairwise comparisons.",
    "Implement preferential voting models (VAHP, SWARA-VAHP) when pairwise comparison inconsistency limits reliability.",
    "Geometric mean should be used to combine judgments from multiple experts in group decision-making."
  ],
  cites: ["", "", "", ""],
  cited_by_context: { "": "Presented the AHP-express method to simplify AHP by comparing only the best element." },
  notes: [
    "The article evaluates 5 new hybrid methods combining AHP with preferential voting, SWARA, and BWM.",
    "BOCR (Benefits, Opportunities, Costs, Risks) modeling is not present in this text; metrics for it return null.",
    "[Sanitized] aggregation (original): geometric mean"
  ]
};

export default article;
