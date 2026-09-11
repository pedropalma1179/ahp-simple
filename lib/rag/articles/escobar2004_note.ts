/**
 * Article Extraction: ESCOBAR, M (2004)
 * "T.; AGUARÓN, J.; MORENO-JIMÉNEZ, J"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "escobar2004_note",
  citation: {
    abnt: "ESCOBAR, M. T.; AGUARÓN, J.; MORENO-JIMÉNEZ, J. M. A note on AHP group consistency for the row geometric mean priorization procedure. European Journal of Operational Research, v. 153, n. 2, p. 318-322, 2004.",
    bibtex: "@article{escobar2004_note,\n  author = {Escobar, M. T. and Aguarón, J. and Moreno-Jiménez, J. M.},\n  title = {A note on AHP group consistency for the row geometric mean priorization procedure},\n  journal = {European Journal of Operational Research},\n  year = {2004},\n  volume = {153},\n  number = {2},\n  pages = {318-322},\n  publisher = {Elsevier}\n}"
  },
  doi: "10.1016/S0377-2217(03)00154-1",
  type: "methodological",
  metadata: { year: 2004, venue: "European Journal of Operational Research", domain: "Group Decision Making" },
  thresholds: [
    {
      metric: "GCI (n=3)",
      operator: "<",
      value: 0.31,
      unit: "ratio",
      context: "acceptable consistency threshold for GCI (equivalent to 10% CR)",
      evidence: { page: 319, locator_type: "section", locator_id: "2", quote: "GCI = 0.31 for n = 3" }
    },
    {
      metric: "GCI (n=4)",
      operator: "<",
      value: 0.35,
      unit: "ratio",
      context: "acceptable consistency threshold for GCI (equivalent to 10% CR)",
      evidence: { page: 319, locator_type: "section", locator_id: "2", quote: "GCI = 0.35 for n = 4" }
    },
    {
      metric: "GCI (n>4)",
      operator: "<",
      value: 0.37,
      unit: "ratio",
      context: "acceptable consistency threshold for GCI (equivalent to 10% CR)",
      evidence: { page: 319, locator_type: "section", locator_id: "2", quote: "GCI = 0.37 for n > 4" }
    }
  ],
  formulas: [
    {
      id: "gci_formula",
      label: "Eq. (1) / (2)",
      latex: "GCI = \\frac{2}{(n-1)(n-2)}\\sum_{i<j}log^{2}e_{ij}",
      description: "Geometric Consistency Index (GCI) formula associated with RGMM.",
      variables: { GCI: "Geometric Consistency Index", e_ij: "error element a_ij * w_j / w_i", n: "matrix size" },
      conditions: "Used with the Row Geometric Mean Method (RGMM) prioritization.",
      evidence: { page: 319, locator_type: "equation", locator_id: "1", quote: "GCI = 2 / ((n-1)(n-2)) * sum(log^2(e_ij))" }
    },
    {
      id: "aij_aip_equivalence_rgmm",
      label: "Eq. on p. 320",
      latex: "\\omega_{i}^{G}(AIJ) = \\omega_{i}^{G}(AIP)",
      description: "For RGMM, AIJ and AIP produce the same group priorities.",
      variables: { AIJ: "Aggregation of Individual Judgements", AIP: "Aggregation of Individual Priorities" },
      conditions: "Only true for RGMM, not necessarily for EM.",
      evidence: {
        page: 319,
        locator_type: "section",
        locator_id: "2",
        quote: "Barzilai and Golany (1994) proved that both aggregation approaches (AIJ and AIP) provide the same priorities... however, this result is not true for EM"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "Priorities and GCIs for the individual and group judgements matrices",
      content: {
        columns: ["Alternative", "I", "II", "III", "IV", "G1", "G2"],
        rows: [
          ["A", "0.614455", "0.646125", "0.569339", "0.596672", "0.607838", "0.601506"],
          ["B", "0.224617", "0.227012", "0.276410", "0.220793", "0.236901", "0.238691"],
          ["C", "0.098538", "0.079288", "0.096733", "0.108937", "0.095543", "0.097987"],
          ["D", "0.062390", "0.047575", "0.057518", "0.073598", "0.059717", "0.061816"],
          ["GCI", "0.134987", "0.235805", "0.119358", "0.165691", "0.155377", "0.154707"]
        ]
      },
      notes: "GCI values for individual experts and two group weightings (equal vs unequal).",
      evidence: {
        page: 321,
        locator_type: "table",
        locator_id: "1",
        quote: "Priorities and GCIs for the individual and group judgements matrices"
      }
    }
  ],
  empirical_data: {
    n_respondents: 4,
    aggregation: null,
    n_alternatives: 4,
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
      claim: "Group inconsistency is bounded by individual inconsistency.",
      verbatim_quote: "the inconsistency of the group is smaller than the largest individual inconsistency.",
      evidence: {
        page: 318,
        locator_type: "section",
        locator_id: "Abstract",
        quote: "the paper proves that the inconsistency of the group is smaller than the largest individual inconsistency."
      },
      usable_as: "threshold"
    },
    {
      claim: "AIP is more efficient than AIJ for RGMM consistency checks.",
      verbatim_quote: "it is simpler and more efficient to work with the AIP approach (only o(mn) operations) than with the AIJ approach (o(mn^2) operations).",
      evidence: {
        page: 320,
        locator_type: "section",
        locator_id: "2",
        quote: "it is simpler and more efficient to work with the AIP approach (only o(mn) operations) than with the AIJ approach"
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [
    "Equivalence of AIJ and AIP applies only to RGMM prioritization, not the Eigenvector Method (EM)."
  ],
  recommendations: ["Use GCI thresholds (0.31, 0.35, 0.37) when working with RGMM."],
  cites: ["Saaty (1980)", "Xu (2000)", "Barzilai and Golany (1994)", "Aguarón and Moreno-Jiménez (2003)"],
  cited_by_context: {
    "Xu (2000)": "Complements Xu's results for EM by proving them for RGMM/GCI.",
    "Aguarón and Moreno-Jiménez (2003)": "Source for the GCI definition and thresholds."
  },
  notes: [
    "The paper uses the Schwarz inequality to prove Theorem 1.",
    "[Sanitized] aggregation (original): WGMM"
  ]
};

export default article;
