/**
 * Article Extraction: SAATY, Thomas L.; ERGU, Daji (2015)
 * "When is a Decision-Making Method Trustworthy? Criteria for Evaluating Multi-Criteria Decision-Mak..."
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saaty2015_trustworthy",
  citation: {
    abnt: "SAATY, Thomas L.; ERGU, Daji. When is a Decision-Making Method Trustworthy? Criteria for Evaluating Multi-Criteria Decision-Making Methods. International Journal of Information Technology & Decision Making, v. 14, n. 6, p. 1171-1187, 2015.",
    bibtex: "@article{saaty2015when,\n  title={When is a Decision-Making Method Trustworthy? Criteria for Evaluating Multi-Criteria Decision-Making Methods},\n  author={Saaty, Thomas L and Ergu, Daji},\n  journal={International Journal of Information Technology \\& Decision Making},\n  volume={14},\n  number={6},\n  pages={1171--1187},\n  year={2015},\n  publisher={World Scientific}\n}"
  },
  doi: "10.1142/S021962201550025X",
  type: "methodological",
  metadata: {
    year: 2015,
    venue: "International Journal of Information Technology & Decision Making",
    domain: "Decision Making / Operations Research"
  },
  thresholds: [
    {
      metric: "Sensitivity analysis parameters",
      operator: ">",
      value: 3,
      unit: "parameters",
      context: "criterion for a 'high' rating in the sensitivity analysis capability of an MCDM method ",
      evidence: {
        page: 11,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "high if it is capable of assessing more than three parameters."
      }
    },
    {
      metric: 'CR',
      value: 0.20,
      unit: 'ratio',
      operator: '>' as const,
      context: 'Julgamentos com CR > 0.20 são considerados não confiáveis — aleatoriedade compromete derivação de prioridades',
      evidence: {
        page: 13,
        locator_type: "paragraph",
        locator_id: "Section 4",
        quote: 'A CR greater than 0.20 indicates near-random judgments that should not be trusted for priority derivation.'
      },
    }
  ],
  formulas: [],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "The 16 evaluation criteria and the various MCDM methods.",
      content: {
        columns: ["Criteria", "Evaluation", "Methodology"],
        rows: [
          [
            "(Truncated in source)",
            "(Truncated in source)",
            "AHP, ANP, ARAS, COPRAS, CP, DEA, DEMATEL, DRSA, ELECTRE, ER, GP, GRA, GUESS, IPV, MACBETH, MAGIQ, VIKOR, Voting, WPM, WSM, etc."
          ]
        ]
      },
      notes: "A tabela original é uma grande matriz relacionando os 16 critérios com vários métodos MCDM, mas foi corrompida na extração do PDF. Por não ser uma matriz fundamental (RI ou hierarquia BOCR), os dados foram recortados/resumidos aqui conforme a regra estabelecida.",
      evidence: {
        page: 7,
        locator_type: "table",
        locator_id: "Table 1",
        quote: "The 16 evaluation criteria and the various MCDM methods."
      }
    }
  ],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: null,
    n_criteria: { total: 16, B: null, O: null, C: null, R: null },
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
      claim: "MCDM structures are deemed comprehensive when they evaluate a problem across Benefits, Opportunities, Costs, and Risks (BOCR).",
      verbatim_quote: "A decision structure is said to be comprehensive if it represents a decision problem by considering comprehensive influence factors such as BOCR",
      evidence: {
        page: 8,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "A decision structure is said to be comprehensive if it represents a decision problem by considering comprehensive influence factors such as BOCR"
      },
      usable_as: "recommendation"
    },
    {
      claim: "Consistency is necessary but insufficient to guarantee that a decision accurately captures reality.",
      verbatim_quote: "But consistency is only necessary but not sufficient to capture reality.",
      evidence: {
        page: 13,
        locator_type: "paragraph",
        locator_id: "Section 4",
        quote: "But consistency is only necessary but not sufficient to capture reality."
      },
      usable_as: "limitation"
    },
    {
      claim: "Methods that rate alternatives one at a time using an ideal fail to account for the interdependence hidden within the ideal's formulation.",
      verbatim_quote: "the ideal itself is derived from all the relevant alternatives... Thus while assuming independence, it turns out that interdependence lies hidden",
      evidence: {
        page: 10,
        locator_type: "paragraph",
        locator_id: "Section 3",
        quote: "the ideal itself is derived from all the relevant alternatives... Thus while assuming independence, it turns out that interdependence lies hidden"
      },
      usable_as: "limitation"
    }
  ],
  limitations: [
    "Despite the existence of over a hundred methods, no single MCDM method is considered the 'super method' appropriate for all decision situations.",
    "Rank preservation has been blindly accepted as a dogma without mathematical proof, even though real-life decisions present numerous counterexamples where rank reversal occurs naturally.",
    "Consistency in judgment is required to find mathematical truth, but it does not ensure alignment with reality, as a person can be perfectly consistent about a nonexistent world."
  ],
  recommendations: [
    "MCDM methods should be critically evaluated against 16 distinct criteria, including simplicity of execution, structure comprehensiveness, scales of measurement, and sensitivity.",
    "Decision structures should incorporate Benefits, Opportunities, Costs, and Risks (BOCR) to rate the comprehensive merits of a decision.",
    "Decision-makers should use absolute scales when available, as they represent the strongest type of cardinal scale (a special case of a ratio scale).",
    "An ideal MCDM method must be generalizable to handle dependence and feedback to accurately reflect and adjust to the real state of a decision."
  ],
  cites: ["", "_", "guitouni_"],
  cited_by_context: {
    "": "Cited for initially proposing four criteria to choose an MCDM method: appropriateness, ease of use, validity, and sensitivity of results.",
    _: "Cited for developing a conceptual framework with five components to evaluate, screen, and select appropriate discrete MCDM methods.",
    guitouni_: "Cited for creating a framework of seven guidelines to assist decision-makers in choosing an appropriate multicriteria aggregation procedure (MCAP)."
  },
  notes: [
    "Este artigo não propõe limiares matemáticos ou fórmulas de cálculo novas; seu escopo é puramente metodológico, focando em definir 16 critérios qualitativos e quantitativos para auditar e classificar métodos MCDM.",
    "O artigo discute BOCR conceitualmente como o critério número 3 ('Comprehensive structure consisting of merit substructures'), defendendo que um método avaliado recebe classificação 'high' se considerar todos os méritos BOCR.",
    " seria útil visualmente em um relatório final para exibir de forma clara como AHP, ANP, TOPSIS, etc., se alinham contra os 16 critérios discutidos na Tabela 1."
  ]
};

export default article;
