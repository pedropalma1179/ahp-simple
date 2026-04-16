/**
 * Article Extraction: NEELY JR., B. H.; LOVELACE, J. B.; COWEN, A. P.; HILLER, N. J. (2020)
 * "Metacritiques of Upper Echelons Theory: Verdicts and Recommendations for Future Research"
 * 
 * Meta-review of 35+ years of Upper Echelons Theory, synthesizing five metacritiques 
 * (cognitive black box, relational black box, contingencies, construct/measure incongruence, 
 * endogeneity). Provides modern foundation for interpreting executive-level bias in 
 * strategic decision-making, including how cognitive processes filter information 
 * (field of vision, selective perception, interpretation) into strategic choices.
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "neely2020_upperEchelonsMetacritiques",
  citation: {
    abnt: "NEELY JR., Brett H.; LOVELACE, Jeffrey B.; COWEN, Amanda P.; HILLER, Nathan J. Metacritiques of Upper Echelons Theory: Verdicts and Recommendations for Future Research. Journal of Management, v. 46, n. 6, p. 1029-1062, 2020.",
    bibtex: "@article{neely2020metacritiques,\n  title={Metacritiques of upper echelons theory: Verdicts and recommendations for future research},\n  author={Neely Jr, Brett H and Lovelace, Jeffrey B and Cowen, Amanda P and Hiller, Nathan J},\n  journal={Journal of Management},\n  volume={46},\n  number={6},\n  pages={1029--1062},\n  year={2020},\n  publisher={SAGE Publications}\n}"
  },
  doi: "10.1177/0149206320908640",
  type: "review",
  metadata: { year: 2020, venue: "Journal of Management", domain: "Strategic Management / Executive Cognition" },
  thresholds: [],
  formulas: [],
  tables_figures: [
    {
      kind: "table",
      label: "Table 1",
      caption: "Summary of Upper Echelons Theory (UET) Research Response to Metacritiques",
      content: {
        columns: ["Critique Category", "Verdict on Progress of Recent Research", "Future Recommendations"],
        rows: [
          ["Inadequate exploration of the cognitive black box", "Limited progress: Limited attention to the specific aspects of the information filtering process; Advanced understanding of the cognitive processes of TMTs", "More specific focus needed: Conceptual integrations with other established lines of research; Leverage new methodological and technological tools"],
          ["Inadequate exploration of the relational black box", "Significant progress in TMT-CEO relational research", "More systematic focus on specific leader interfaces"],
          ["More systematic evaluation of contingencies", "Significant progress made: Greater use of global samples, institutional context, TMT and diversity characteristics; Discretion remains a key variable", "Broaden the narrative: Shift focus to understanding where and how key contingency factors influence the UET process"],
          ["(In)congruence of constructs and measures", "Significant progress: Decline in the use of demographic proxies; Greater use of conceptual and empirical justification for proxy variables", "Establish new expectations and standards for measurement"],
          ["Need for increased attention to endogeneity", "Progress made, but variability in treatment", "More consistency in addressing endogeneity needed"]
        ]
      },
      notes: "Synthesis of five metacritiques of UET research identified through systematic analysis of 35 review articles and 217 primary research articles published between 1984-2019.",
      evidence: {
        page: 1034,
        locator_type: "table",
        locator_id: "Table 1",
        quote: "Summary of Upper Echelons Theory (UET) Research Response to Metacritiques"
      }
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
      claim: "Executive cognition is a key mediating mechanism in Upper Echelons Theory: executive characteristics influence firm outcomes through what information executives look for (limited field of vision), what they attend to (selective perception), and what they deem important (interpretation). Research on this 'cognitive black box' remains limited, requiring integration with sensemaking and leadership literatures.",
      verbatim_quote: "previous reviews advocated for investigation of the influence of executive characteristics and experiences on specific aspects of executives' cognitive processes, including what information executives look for (i.e., limited field of vision), attend to (i.e., selective perception), and deem important (i.e., interpretation)",
      evidence: {
        page: 1035,
        locator_type: "paragraph",
        locator_id: "Conceptual Critique 1: Inadequate Exploration of the Cognitive Black Box",
        quote: "previous reviews advocated for investigation of the influence of executive characteristics and experiences on specific aspects of executives' cognitive processes, including what information executives look for (i.e., limited field of vision), attend to (i.e., selective perception), and deem important (i.e., interpretation)"
      },
      usable_as: "definition" as const
    },
    {
      claim: "Contextual conditions (environmental continuity vs. change, crisis, industry dynamism, national setting) significantly moderate how executive characteristics translate into strategic decisions. UET research of the past decade has repeatedly demonstrated that results vary depending on individual, group, organizational, and environmental conditions — findings cannot be interpreted without accounting for these contingency factors.",
      verbatim_quote: "Our review of the recent UET literature revealed a great deal of progress in understanding how UET results vary depending on a variety of individual, group, organizational, and environmental conditions",
      evidence: {
        page: 1042,
        locator_type: "paragraph",
        locator_id: "The verdict: Where do we go from here? (Conceptual Critique 3)",
        quote: "Our review of the recent UET literature revealed a great deal of progress in understanding how UET results vary depending on a variety of individual, group, organizational, and environmental conditions"
      },
      usable_as: "recommendation" as const
    },
    {
      claim: "Managerial discretion is a key moderating variable in Upper Echelons Theory: the magnitude of CEO/executive effects on firm outcomes is highly dependent on the level of discretion within the industry. In low-discretion industries (e.g., heavy manufacturing), executive idiosyncrasies matter less; in high-discretion industries (e.g., technology), they matter much more. This has direct implications for weight dominance interpretation in MCDM.",
      verbatim_quote: "CEOs have a significant effect on firm outcomes, that the effect appears to be increasing over time, and that the size of the effect is highly dependent upon the level of discretion within an industry",
      evidence: {
        page: 1042,
        locator_type: "paragraph",
        locator_id: "Review of recent progress (Conceptual Critique 3)",
        quote: "CEOs have a significant effect on firm outcomes, that the effect appears to be increasing over time, and that the size of the effect is highly dependent upon the level of discretion within an industry"
      },
      usable_as: "benchmark" as const
    },
    {
      claim: "Demographic proxies (age, tenure, functional background) have been widely used in UET research as indirect indicators of underlying psychological and cognitive characteristics, but have been heavily criticized as unreliable. Recent UET research has shifted toward direct measurement approaches (surveys, psychometric assessments) and more rigorously validated unobtrusive measures. Any inference from demographic profile to cognitive bias must be conceptually justified.",
      verbatim_quote: "the reliance on demographic proxies has declined as researchers have begun to use other unobtrusive measures of executive traits",
      evidence: {
        page: 1044,
        locator_type: "paragraph",
        locator_id: "Methodological Critique 1",
        quote: "the reliance on demographic proxies has declined as researchers have begun to use other unobtrusive measures of executive traits"
      },
      usable_as: "limitation" as const
    },
    {
      claim: "Executive impact on firm actions and performance has increased over time — executives today have even greater influence than in prior decades. This increased impact, combined with rapid environmental change (technological, political, economic, social), means that the cognitive and behavioral tendencies of senior leaders are increasingly consequential for organizational outcomes. This is especially relevant in volatile markets and dynamic industries.",
      verbatim_quote: "considerable evidence suggests that executives today have even greater impact on firm actions and performance than they did in the past",
      evidence: {
        page: 1033,
        locator_type: "paragraph",
        locator_id: "Introduction",
        quote: "Considerable evidence suggests that executives today have even greater impact on firm actions and performance than they did in the past"
      },
      usable_as: "recommendation" as const
    },
    {
      claim: "In MCDM panel-based weight elicitation, the dominant weight given to a BOCR merit dimension may reflect the cognitive field of vision and selective perception of the panel composition (functional background, tenure, hierarchical level), rather than an objective strategic priority. Modern UET research recommends triangulating weight distributions against panel demographic profile and industry discretion level before concluding that the weight distribution reflects unbiased strategic preference.",
      verbatim_quote: "scholars must provide evidence for the appropriateness of whatever measure they use, defend their approach to the aggregation of variables at the group level, understand that every measure has limitations, and acknowledge that multiple methods for measuring underlying constructs (both within and across studies) engender greater confidence in research findings",
      evidence: {
        page: 1047,
        locator_type: "paragraph",
        locator_id: "The verdict: Where do we go from here? (Methodological Critique 1)",
        quote: "UET scholars must provide evidence for the appropriateness of whatever measure they use, defend their approach to the aggregation of variables at the group level, understand that every measure has limitations, and acknowledge that multiple methods for measuring underlying constructs (both within and across studies) engender greater confidence in research findings"
      },
      usable_as: "recommendation" as const
    }
  ],
  limitations: [
    "The review synthesizes critiques of UET research but does not itself provide new empirical data on executive cognition.",
    "Recommendations focus on methodological rigor; they do not operationalize the mapping between demographic composition and expected cognitive bias in specific industrial contexts.",
    "UET literature originates primarily from US/European corporate settings; emerging economy and non-corporate applications (e.g., industrial panels in SMEs) require adaptation."
  ],
  recommendations: [
    "When interpreting AHP/BOCR weight distributions derived from an expert panel, explicitly document the functional composition, tenure distribution, and hierarchical level of respondents.",
    "Where one merit dimension shows strong dominance, use Upper Echelons Theory to evaluate whether the composition of the panel predicts this dominance before attributing it to objective strategic priority.",
    "Account for industry-level managerial discretion when interpreting the magnitude of weight dominance: high-discretion industries are more sensitive to executive bias; low-discretion industries are more constrained by external factors.",
    "For reliability, combine demographic (unobtrusive) indicators with direct measures of preferences (e.g., validation interviews, cross-functional review) to triangulate the validity of the weight distribution."
  ],
  cites: [],
  cited_by_context: {},
  notes: [
    "Modern (2020) meta-review of Upper Echelons Theory covering 36 years of research. Resolves the datation problem of Hambrick & Mason (1984) by showing which aspects of UET remain valid and which require updating.",
    "Directly cited in Saiyed et al. (2023) as foundation for CEO power / cognitive bias interaction.",
    "Provides the strongest modern basis for the argument that panel composition predicts strategic weight preferences — directly applicable to auditing BOCR weight distributions in industrial decision contexts."
  ]
};

export default article;
