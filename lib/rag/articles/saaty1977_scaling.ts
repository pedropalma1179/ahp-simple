/**
 * Article Extraction: SAATY, Thomas L (1977)
 * "A scaling method for priorities in hierarchical structures"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saaty1977_scaling",
  citation: {
    abnt: "SAATY, Thomas L. A scaling method for priorities in hierarchical structures. Journal of Mathematical Psychology, v. 15, n. 3, p. 234-281, 1977.",
    bibtex: "@article{saaty1977scaling,\n  title={A scaling method for priorities in hierarchical structures},\n  author={Saaty, Thomas L},\n  journal={Journal of Mathematical Psychology},\n  volume={15},\n  number={3},\n  pages={234--281},\n  year={1977},\n  publisher={Elsevier}\n}"
  },
  doi: null,
  type: "foundational",
  metadata: { year: 1977, venue: "Journal of Mathematical Psychology", domain: "Mathematical Psychology / Decision Theory" },
  thresholds: [
    {
      metric: "Consistency Ratio (CR)",
      operator: "≤",
      value: 0.1,
      unit: "ratio",
      context: "acceptable consistency threshold when comparing calculated inconsistency to the average value for randomly filled matrices",
      evidence: {
        page: 248,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "require the ratio to be very small; e.g., of the order of 0.1."
      }
    },
    {
      metric: "Matrix size (n)",
      operator: "≤",
      value: 9,
      unit: "elements",
      context: "maximum number of objects compared simultaneously to maintain acceptable consistency (derived from 7 ± 2 limit)",
      evidence: {
        page: 251,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "when the number of objects being compared exceeds 7 ± 2, the consistency can be expected to be very poor"
      }
    }
  ],
  formulas: [
    {
      id: "consistency_measure_mu",
      label: "Consistency Measure (μ)",
      latex: "\\mu = \\frac{\\lambda_{\\max}-n}{n-1}",
      description: "Defines the consistency measure (which later became known as the Consistency Index, CI) as the average of the nonprincipal eigenvalues.",
      variables: { "\\mu": "Consistency measure (CI)", "\\lambda_{\\max}": "Maximum/principal eigenvalue", n: "Order of the matrix" },
      conditions: "Applicable to evaluate the consistency of a reciprocal matrix with positive entries.",
      evidence: {
        page: 237,
        locator_type: "equation",
        locator_id: "Section 2",
        quote: "we consider the two real-valued parameters \\lambda_{max} and \\mu ... \\mu = (\\lambda_{max} - n)/(n - 1) \\ge 0"
      }
    },
    {
      id: "hierarchical_composition",
      label: "Hierarchical Composition Principle",
      latex: "W = B W'",
      description: "Calculates the composite priority vector W of a lower level by multiplying its priority matrix B by the priority vector W' of the adjacent higher level.",
      variables: {
        W: "Priority vector of the target lower level",
        B: "Priority matrix of the lower level (columns are eigenvectors with respect to elements of the higher level)",
        "W'": "Priority vector of the next higher level"
      },
      conditions: "Used to synthesize priorities from the top to the bottom of a complete hierarchy.",
      evidence: { page: 263, locator_type: "equation", locator_id: "Section 5", quote: "this gives the final formulation W = B W'" }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "The Scale and Its Description",
      content: {
        columns: ["Intensity of importance", "Definition", "Explanation"],
        rows: [
          ["1", "Equal importance", "Two activities contribute equally to the objective"],
          [
            "3",
            "Weak importance of one over another",
            "Experience and judgment slightly favor one activity over another"
          ],
          [
            "5",
            "Essential or strong importance",
            "Experience and judgment strongly favor one activity over another"
          ],
          [
            "7",
            "Demonstrated importance",
            "An activity is strongly favored and its dominance is demonstrated in practice"
          ],
          [
            "9",
            "Absolute importance",
            "The evidence favoring one activity over another is of the highest possible order of affirmation"
          ],
          [
            "2, 4, 6, 8",
            "Intermediate values between the two adjacent judgments",
            "When compromise is needed"
          ],
          [
            "Reciprocals of above nonzero",
            "If activity i has one of the above nonzero numbers assigned to it when compared with activity j, then j has the reciprocal value when compared with i",
            ""
          ],
          [
            "Rationals",
            "Ratios arising from the scale",
            "If consistency were to be forced by obtaining n numerical values to span the matrix"
          ]
        ]
      },
      notes: "Fully transcribed fundamental 1-9 AHP scale definition. Note that the original text has a typo 'Desceiption' in the caption which was corrected here.",
      evidence: { page: 246, locator_type: "table", locator_id: "Table 1", quote: "The Scale and Its Description" }
    },
    {
      kind: "table",
      label: "Table 2",
      caption: "Measure of Inconsistency μ",
      content: {
        columns: ["Scale", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        rows: [
          [
            "1-5",
            "0.000",
            "0.244",
            "0.335",
            "0.472",
            "0.479",
            "0.527",
            "0.580",
            "0.577",
            "0.611",
            "0.591",
            "0.623",
            "0.632",
            "0.641",
            "0.629"
          ],
          [
            "1-7",
            "0.000",
            "0.515",
            "0.504",
            "0.708",
            "0.798",
            "0.827",
            "0.922",
            "0.961",
            "0.968",
            "1.012",
            "1.019",
            "1.054",
            "1.052",
            "1.052"
          ],
          [
            "1-9",
            "0.000",
            "0.416",
            "0.851",
            "1.115",
            "1.150",
            "1.345",
            "1.334",
            "1.315",
            "1.420",
            "1.395",
            "1.482",
            "1.491",
            "1.470",
            "1.466"
          ],
          [
            "1-15",
            "0.000",
            "0.705",
            "1.733",
            "2.024",
            "2.416",
            "2.349",
            "2.351",
            "2.525",
            "2.674",
            "2.749",
            "2.693",
            "2.804",
            "2.827",
            "2.806"
          ],
          [
            "1-20",
            "0.000",
            "1.326",
            "2.044",
            "2.948",
            "3.354",
            "3.428",
            "3.598",
            "3.709",
            "3.807",
            "3.719",
            "3.899",
            "3.888",
            "3.895",
            "3.971"
          ],
          [
            "1-90",
            "0.000",
            "3.206",
            "10.411",
            "15.452",
            "16.096",
            "17.603",
            "17.454",
            "18.580",
            "19.110",
            "18.747",
            "19.695",
            "19.857",
            "19.990",
            "20.052"
          ]
        ]
      },
      notes: "This is the original Random Index (RI) table based on a sample size of 50 randomly filled matrices for each order n. Fully transcribed.",
      evidence: { page: 249, locator_type: "table", locator_id: "Table 2", quote: "Measure of Inconsistency μ" }
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
      claim: "Perfect consistency occurs if and only if the principal eigenvalue equals the order of the matrix.",
      verbatim_quote: "A reciprocal matrix A with positive entries is consistent if and only if \\lambda_{max} = n",
      evidence: {
        page: 237,
        locator_type: "paragraph",
        locator_id: "Section 2",
        quote: "A reciprocal matrix A with positive entries is consistent if and only if \\lambda_{max} = n"
      },
      usable_as: "definition"
    },
    {
      claim: "Consistency validates the logical relation of estimates but does not guarantee correspondence to real-life accuracy.",
      verbatim_quote: "consistency is a necessary but not a sufficient condition for judging how good a set of observational data is.",
      evidence: {
        page: 247,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "consistency is a necessary but not a sufficient condition for judging how good a set of observational data is."
      },
      usable_as: "limitation"
    }
  ],
  limitations: [
    "Consistency is a necessary but not sufficient condition for judging how well observational data corresponds to reality.",
    "The mind's capacity limits simultaneous pairwise comparisons to 7 ± 2 items without severe loss of consistency."
  ],
  recommendations: [
    "Use a numerical scale from 1 to 9 for evaluating pairwise comparisons, as it appropriately maps human cognitive limits to distinguish gradations.",
    "When a value is assigned comparing activity i to j, the exact reciprocal value must be assigned to j compared to i to force algebraic properties.",
    "Group elements into hierarchical clusters containing a maximum of 7 elements each to prevent inconsistency when dealing with larger sets of objects."
  ],
  cites: ["", "_", "", ""],
  cited_by_context: {
    "": "Cited to contrast his law of comparative judgment (which relies on normal distribution assumptions) with the eigenvalue methodology.",
    _: "Cited to discuss psychophysical power laws and alternative direct-intensity psychophysical scaling methods."
  },
  notes: [
    "This is the foundational paper for the Analytic Hierarchy Process (AHP), introducing the eigenvalue method, the 1-9 scale, and the Consistency Index (μ).",
    "It contains the very first articulation of the CR ≤ 0.10 rule (page 248).",
    "It establishes the original Random Index (RI) table (Table 2) based on an early simulation of 50 matrices.",
    "Contains multiple small case examples (distance between cities, light intensity, wealth of nations, weight estimation, school selection, vacation sites) to validate the scale against known metrics."
  ]
};

export default article;
