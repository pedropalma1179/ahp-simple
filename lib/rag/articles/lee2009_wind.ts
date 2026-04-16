/**
 * Article Extraction: LEE, A (2009)
 * "H"
 * 
 * Extracted on: 2026-02-11
 * Extraction prompt version: v3.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "lee2009_wind",
  citation: {
    abnt: "LEE, A. H. I.; CHEN, H. H.; KANG, H.-Y. Multi-criteria decision making on strategic selection of wind farms. Renewable Energy, v. 34, n. 1, p. 120-126, 2009.",
    bibtex: "@article{lee2009multi,\n  title={Multi-criteria decision making on strategic selection of wind farms},\n  author={Lee, Amy HI and Chen, Hsing Hung and Kang, He-Yau},\n  journal={Renewable Energy},\n  volume={34},\n  number={1},\n  pages={120--126},\n  year={2009},\n  publisher={Elsevier}\n}"
  },
  doi: "10.1016/j.renene.2008.04.013",
  type: "application",
  metadata: { year: 2009, venue: "Renewable Energy", domain: "Energy / Wind Farms" },
  thresholds: [
    {
      metric: "importance scale",
      operator: "=",
      value: 0.42,
      unit: "score",
      context: "very high importance rating in the five-step scale for merits BOCR",
      evidence: {
        page: 122,
        locator_type: "paragraph",
        locator_id: "Step 4",
        quote: "the values of each scale is assigned to be very high, 0.42"
      }
    },
    {
      metric: "importance scale",
      operator: "=",
      value: 0.26,
      unit: "score",
      context: "high importance rating in the five-step scale for merits BOCR",
      evidence: { page: 123, locator_type: "paragraph", locator_id: "Step 4", quote: "high, 0.26" }
    },
    {
      metric: "importance scale",
      operator: "=",
      value: 0.16,
      unit: "score",
      context: "medium importance rating in the five-step scale for merits BOCR",
      evidence: { page: 123, locator_type: "paragraph", locator_id: "Step 4", quote: "medium, 0.16" }
    },
    {
      metric: "importance scale",
      operator: "=",
      value: 0.1,
      unit: "score",
      context: "low importance rating in the five-step scale for merits BOCR",
      evidence: { page: 123, locator_type: "paragraph", locator_id: "Step 4", quote: "low, 0.10" }
    },
    {
      metric: "importance scale",
      operator: "=",
      value: 0.06,
      unit: "score",
      context: "very low importance rating in the five-step scale for merits BOCR",
      evidence: { page: 123, locator_type: "paragraph", locator_id: "Step 4", quote: "very low, 0.06" }
    }
  ],
  formulas: [
    {
      id: "bocr_additive",
      label: "Additive",
      latex: "P_i = bB_i + oO_i + c(1/C_i)_{Normalized} + r(1/R_i)_{Normalized}",
      description: "Additive method to combine scores of each alternative under B, O, C, and R.",
      variables: {
        P_i: "overall priority of alternative i",
        B_i: "synthesized result of alternative i under merit B",
        b: "normalized weight of merit B"
      },
      conditions: "Synthesizing normalized values where costs and risks are inverted and normalized before addition.",
      evidence: {
        page: 123,
        locator_type: "equation",
        locator_id: "Step 10, Eq 1",
        quote: "Additive PibB +00 +c(1/Ci) Normalized+r(1/Ri)Normalized where Bi, Oi, Ci and Ri represent the synthesized results... and b, o, c and r are normalized weights"
      }
    },
    {
      id: "bocr_probabilistic_additive",
      label: "Probabilistic additive",
      latex: "P_i = bB_i + oO_i + c(1-C_i) + r(1-R_i)",
      description: "Probabilistic additive method to combine scores of each alternative under B, O, C, and R.",
      variables: { P_i: "overall priority of alternative i", C_i: "synthesized result of alternative i under merit C" },
      conditions: "Used when costs and risks are subtracted from 1 (representing their complements) before weighting and adding.",
      evidence: {
        page: 123,
        locator_type: "equation",
        locator_id: "Step 10, Eq 2",
        quote: "Probabilistic additive P_{i}=bB_{i}+oO_{i}+c(1-C_{i})+r(1-R_{i})"
      }
    },
    {
      id: "bocr_subtractive",
      label: "Subtractive",
      latex: "P_i = bB_i + oO_i - cC_i - rR_i",
      description: "Subtractive method to combine scores of each alternative under B, O, C, and R.",
      variables: { P_i: "overall priority of alternative i" },
      conditions: "Direct subtraction of weighted costs and risks from weighted benefits and opportunities.",
      evidence: {
        page: 123,
        locator_type: "equation",
        locator_id: "Step 10, Eq 3",
        quote: "Subtractive P_{i}=bB_{i}+oO_{i}-cC_{i}-rR_{i}"
      }
    },
    {
      id: "bocr_multiplicative_powers",
      label: "Multiplicative priority powers",
      latex: "P_i = B_i^b O_i^o [(1/C_i)_{Normalized}]^c [(1/R_i)_{Normalized}]^r",
      description: "Multiplicative priority powers method to combine scores of each alternative.",
      variables: { P_i: "overall priority of alternative i" },
      conditions: "Merits are multiplied, with their respective priorities acting as exponents.",
      evidence: {
        page: 123,
        locator_type: "equation",
        locator_id: "Step 10, Eq 4",
        quote: "Multiplicative priority powers P₁=BO [(1/Ci) Normalized] [(1/Ri) Normalized"
      }
    },
    {
      id: "bocr_multiplicative",
      label: "Multiplicative",
      latex: "P_i = B_i O_i / (C_i R_i)",
      description: "Multiplicative method to combine scores of each alternative under B, O, C, and R.",
      variables: { P_i: "overall priority of alternative i" },
      conditions: "Ratio of the product of positive merits to the product of negative merits. Does not explicitly use merit weights b, o, c, r in the final formula shown.",
      evidence: {
        page: 123,
        locator_type: "equation",
        locator_id: "Step 10, Eq 5",
        quote: "Multiplicative P_{i}=B_{i}O_{i}/C_{i}R_{i}"
      }
    }
  ],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "The criteria and sub-criteria for wind farm project",
      content: {
        columns: ["Merits", "Criteria", "Sub-criteria"],
        rows: [
          [
            "Benefits",
            "(a) Wind availability",
            "(a1) Geographical distribution of wind speed frequency, (a2) Mean wind power density, (a3) Annual mean wind speed"
          ],
          [
            "Benefits",
            "(b) Site advantage",
            "(b1) Influence of selected height of installation, (b2) Effect of wind gusting, (b3) Micro-siting of WEGS"
          ],
          [
            "Benefits",
            "(c) WEG functions",
            "(c1) Real and technical availability, (c2) Affordable, reliable and maintenance free, (c3) Power factor, capacity factor"
          ],
          [
            "Opportunities",
            "(d) Financial schemes",
            "(d1) Switchable tariff, (d2) Discount of tax rate and duty rate, (d3) Other investment and production incentives"
          ],
          [
            "Opportunities",
            "(e) Policy support",
            "(e1) Wind power concession program, (e2) Clean development mechanisms program, (e3) Other policy supports"
          ],
          [
            "Opportunities",
            "(f) Advanced technologies",
            "(f1) Computerized supervisory, (f2) Variable speed wind power generation, (f3) Swept area of a turbine rotor, (f4) Static reactive power compensator, etc."
          ],
          [
            "Costs",
            "(g) Wind turbine",
            "(g1) Design and development, (g2) Manufacturing, (g3) Installation, maintenance"
          ],
          ["Costs", "(h) Connection", "(h1) Electric connection, (h2) Grid connection"],
          ["Costs", "(i) Foundation", "(i1) Main construction, (i2) Peripheral construction"],
          ["Risks", "(j) Concept conflict", "Entrepreneurs, policy makers, residents"],
          ["Risks", "(k) Technical risks", "Technical complexity and difficulties"],
          ["Risks", "(l) Uncertainty of land", "Loyalty or lease agreement, geology suitability, etc."]
        ]
      },
      notes: "Fully transcribed mapping of the hierarchical structure based on Table 1. Note that Risk sub-criteria text are actual definitions, as Risks do not have a lower-level sub-criterion in the model.",
      evidence: {
        page: 122,
        locator_type: "table",
        locator_id: "Table 1",
        quote: "The criteria and sub-criteria for wind farm project"
      }
    },
    {
      kind: "table",
      label: "Table 2",
      caption: "Priorities of benefits, opportunities, costs and risks",
      content: {
        columns: [
          "Merit",
          "Performance (0.592)",
          "Business drivers (0.111)",
          "Socio-economic needs (0.297)",
          "Priorities",
          "Normalized priorities"
        ],
        rows: [
          ["Benefits", "0.3760", "0.1549", "0.1661", "0.2891", "0.3327"],
          ["Opportunities", "0.1547", "0.2502", "0.2323", "0.1884", "0.2168"],
          ["Costs", "0.2501", "0.1663", "0.1794", "0.2198", "0.2530"],
          ["Risks", "0.1386", "0.2504", "0.2080", "0.1716", "0.1975"]
        ]
      },
      notes: "Fully transcribed.",
      evidence: {
        page: 123,
        locator_type: "table",
        locator_id: "Table 2",
        quote: "Priorities of benefits, opportunities, costs and risks"
      }
    },
    {
      kind: "table",
      label: "Table 6",
      caption: "Final synthesis of priorities of alternatives",
      content: {
        columns: [
          "Alternatives",
          "Additive Priority",
          "Additive Rank",
          "Probabilistic additive Priority",
          "Probabilistic additive Rank",
          "Subtractive Priority",
          "Subtractive Rank",
          "Multiplicative priority powers Priority",
          "Multiplicative priority powers Rank",
          "Multiplicative Priority",
          "Multiplicative Rank"
        ],
        rows: [
          ["Site A", "0.1965", "4", "0.4665", "4", "0.0160", "4", "0.1957", "4", "0.9581", "4"],
          ["Site B", "0.2104", "1", "0.4809", "1", "0.0304", "1", "0.2102", "1", "1.1810", "1"],
          ["Site C", "0.1886", "5", "0.4589", "5", "0.0084", "5", "0.1885", "5", "0.8143", "5"],
          ["Site D", "0.2055", "2", "0.4760", "2", "0.0255", "2", "0.2052", "2", "1.0801", "2"],
          ["Site E", "0.1990", "3", "0.4693", "3", "0.0188", "3", "0.1989", "3", "0.9896", "3"]
        ]
      },
      notes: "Fully transcribed showing the final outcomes and ranks of the 5 combination methods.",
      evidence: { page: 125, locator_type: "table", locator_id: "Table 6", quote: "Final synthesis of priorities of alternatives" }
    }
  ],
  empirical_data: {
    n_respondents: 11,
    aggregation: "AIJ",
    n_alternatives: 5,
    n_criteria: { total: 12, B: 3, O: 3, C: 3, R: 3 },
    bocr_weights: { B: 0.3327, O: 0.2168, C: 0.253, R: 0.1975 },
    scores_by_method: {
      additive: { Alt_1: 0.1965, Alt_2: 0.2104, Alt_3: 0.1886, Alt_4: 0.2055, Alt_5: 0.199 },
      probabilistic_additive: { Alt_1: 0.4665, Alt_2: 0.4809, Alt_3: 0.4589, Alt_4: 0.476, Alt_5: 0.4693 },
      subtractive: { Alt_1: 0.016, Alt_2: 0.0304, Alt_3: 0.0084, Alt_4: 0.0255, Alt_5: 0.0188 },
      multiplicative_priority_powers: { Alt_1: 0.1957, Alt_2: 0.2102, Alt_3: 0.1885, Alt_4: 0.2052, Alt_5: 0.1989 },
      multiplicative: { Alt_1: 0.9581, Alt_2: 1.181, Alt_3: 0.8143, Alt_4: 1.0801, Alt_5: 0.9896 }
    },
    rankings_by_method: {
      all_five_methods: { Alt_1: 0, Alt_2: 0, Alt_3: 0, Alt_4: 0, Alt_5: 0 }
    },
    concordance: {
      rate: null,
      n_methods: null,
      description: "100% sequence agreement across all 5 synthesis methods in this specific case."
    },
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: 1.68
  },
  key_claims: [
    {
      claim: "Using BOCR with AHP comprehensively handles complex decisions with both positive and negative criteria.",
      verbatim_quote: "considering the benefits... opportunities... costs... and risks... is a more comprehensive way to deal with a much more complicated problem.",
      evidence: {
        page: 120,
        locator_type: "paragraph",
        locator_id: "Section 1",
        quote: "considering the benefits (B), opportunities (O), costs (C) and risks (R) of an alternative... is a more comprehensive way"
      },
      usable_as: "recommendation"
    },
    {
      claim: "Sub-criteria for costs can simply be monetary sums rather than pairwise compared.",
      verbatim_quote: "no pairwise comparison of the importance of these sub-criteria is necessary since the values... can simply be summed up into a single value.",
      evidence: {
        page: 125,
        locator_type: "paragraph",
        locator_id: "Section 4",
        quote: "no pairwise comparison of the importance of these sub-criteria is necessary since the values... can simply be summed up into a single value."
      },
      usable_as: "definition"
    },
    {
      claim: "Risks may not require sub-criteria if the criteria level is sufficiently descriptive.",
      verbatim_quote: "there is no need for sub-criteria under the risks merit because criteria themselves can clearly express the risks",
      evidence: {
        page: 125,
        locator_type: "paragraph",
        locator_id: "Section 4",
        quote: "there is no need for sub-criteria under the risks merit because criteria themselves can clearly express the risks"
      },
      usable_as: "definition"
    },
    {
      claim: "Geometric average should be used to combine the judgments of multiple experts.",
      verbatim_quote: "Geometric average method is applied to generalize the opinions among the members.",
      evidence: {
        page: 124,
        locator_type: "paragraph",
        locator_id: "Section 4",
        quote: "Geometric average method is applied to generalize the opinions among the members."
      },
      usable_as: "recommendation"
    }
  ],
  limitations: [],
  recommendations: [
    "Form an evaluation committee of 7-13 members, with at least one third being outside experts or scholars for public-oriented projects.",
    "Collect performance results of projects under various criteria individually from experts to limit the number of pairwise comparisons."
  ],
  cites: ["saaty1996", "saaty2004"],
  cited_by_context: {
    saaty1996: "Decision making with dependence and feedback: the analytic network process. Cited to introduce BOCR merits handling.",
    saaty2004: "Fundamentals of the analytic network process-multiple networks with benefits, opportunities, costs and risks. Cited for the 5 ways to combine BOCR scores."
  },
  notes: [
    "The article calculates criteria counts dynamically. 12 main BOCR criteria were used, supported by 26 sub-criteria (since Risks did not have sub-criteria). Overall lowest level metrics evaluated was 29.",
    "The Multiplicative Priority Powers formula contained OCR errors in the original PDF ('P₁=BO [(1/Ci) Normalized] [(1/Ri) Normalized'). This was converted to the equivalent standard LaTeX representation representing what the text implies.",
    "CR values are mentioned in passing ('examine the consistency property') but no actual CR thresholds or empirical results for the case study are given.",
    "[Sanitized] concordance (original): 100% sequence agreement across all 5 synthesis methods in this specific case.",
    "[Sanitized] aggregation (original): AIJ (Geometric average method)"
  ]
};

export default article;
