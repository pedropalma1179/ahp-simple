/**
 * Article Extraction: AYAN, B.; ABACIOĞLU, S.; BASILIO, M. P. (2023)
 * "A Comprehensive Review of the Novel Weighting Methods for Multi-Criteria Decision-Making"
 * 
 * Systematic review of weighting methods in MCDM. Explicitly discusses subjective vs. 
 * objective vs. combinative weighting approaches, emphasizing that the choice of weighting 
 * method directly influences the accuracy and reliability of decision outcomes. Grounds 
 * decision-making in bounded rationality theory (Simon), highlighting cognitive limitations 
 * of decision-makers as a fundamental constraint.
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "ayan2023_weightingMethodsMCDM",
  citation: {
    abnt: "AYAN, Büşra; ABACIOĞLU, Seda; BASILIO, Marcio Pereira. A Comprehensive Review of the Novel Weighting Methods for Multi-Criteria Decision-Making. Information, v. 14, n. 5, p. 285, 2023.",
    bibtex: "@article{ayan2023comprehensive,\n  title={A Comprehensive Review of the Novel Weighting Methods for Multi-Criteria Decision-Making},\n  author={Ayan, B{\\\"u}{\\c{s}}ra and Abacıo{\\u{g}}lu, Seda and Basilio, Marcio Pereira},\n  journal={Information},\n  volume={14},\n  number={5},\n  pages={285},\n  year={2023},\n  publisher={MDPI}\n}"
  },
  doi: "10.3390/info14050285",
  type: "review",
  metadata: { year: 2023, venue: "Information (MDPI)", domain: "Multi-Criteria Decision-Making" },
  thresholds: [],
  formulas: [],
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
      claim: "In MCDM, the choice of weighting method directly influences the accuracy and reliability of decision outcomes. Decision-makers must consider multiple elements including the nature of the decision problem, the type of data, the measurement scale, the weighting of the criteria, and the interactions between the criteria. Different weighting methods generate different criterion weights, leading to different rankings that impact the entire order, not just the best alternative.",
      verbatim_quote: "any MCDM problem requires the choice of the weighting methods because it directly influences the accuracy and reliability of the decision outcomes",
      evidence: {
        page: 2,
        locator_type: "paragraph",
        locator_id: "Section 1: Introduction",
        quote: "any MCDM problem requires the choice of the weighting methods because it directly influences the accuracy and reliability of the decision outcomes"
      },
      usable_as: "definition" as const
    },
    {
      claim: "The distinct characteristics of each weighting method generate varying weights attributed to the criteria, leading to different rankings that impact the entire order of alternatives, not just the best alternative. This implies that weight distribution is not an absolute truth but a function of the specific method and panel used to elicit it.",
      verbatim_quote: "The distinct characteristics of each weighting method generate varying weights attributed to the criteria, leading to different rankings that impact the entire order, not just the best alternative",
      evidence: {
        page: 2,
        locator_type: "paragraph",
        locator_id: "Section 1: Introduction",
        quote: "The distinct characteristics of each weighting method generate varying weights attributed to the criteria, leading to different rankings that impact the entire order, not just the best alternative"
      },
      usable_as: "recommendation" as const
    },
    {
      claim: "Weighting methods in MCDM are classified into three categories: subjective, objective, and combinative (integrated). Subjective methods (such as AHP, BWM, SWARA) require decision-makers to take responsibility for assigning weights based on their expertise and preferences — thus making them inherently susceptible to cognitive and professional biases. Objective methods use mathematical algorithms without DM input. Combinative approaches blend both.",
      verbatim_quote: "Weighting methods can be classified into three categories: subjective, objective, and combinative (integrated). Subjective methods require DMs to take responsibility for assigning weights to the criteria",
      evidence: {
        page: 2,
        locator_type: "paragraph",
        locator_id: "Section 1: Introduction",
        quote: "Weighting methods can be classified into three categories: subjective, objective, and combinative (integrated). Subjective methods require DMs to take responsibility for assigning weights to the criteria. In contrast, objective methods do not involve DMs in determining the relative importance of the criteria but instead use mathematical algorithms. The combinative approach involves a blend of both subjective and objective methods"
      },
      usable_as: "definition" as const
    },
    {
      claim: "Decision-making is fundamentally constrained by bounded rationality: the rationality of decision-makers is limited by the available knowledge, the cognitive limitations of the individual mind, and the availability of decision-making time. This applies directly to weight elicitation in MCDM, where experts cannot fully integrate all relevant information and rely on cognitive shortcuts that introduce systematic bias into the weight distribution.",
      verbatim_quote: "According to the theory of bounded rationality, the rationality of a researcher is limited by the available knowledge, the cognitive limitations of the individual mind, and the availability of decision-making (DM) time",
      evidence: {
        page: 1,
        locator_type: "paragraph",
        locator_id: "Section 1: Introduction",
        quote: "According to the theory of bounded rationality, the rationality of a researcher is limited by the available knowledge, the cognitive limitations of the individual mind, and the availability of decision-making (DM) time"
      },
      usable_as: "limitation" as const
    },
    {
      claim: "To ensure trust in the decision outcomes, it is recommended to use multiple weighting methods and compare results. A balanced approach combining subjective and objective methods has emerged as a trend, integrating decision-maker preferences with mathematical algorithms. No single method is universally superior; the appropriate method depends on the specific problem context.",
      verbatim_quote: "to ensure trust in the decision outcomes, it is recommended to choose multiple methods in determining the weights",
      evidence: {
        page: 2,
        locator_type: "paragraph",
        locator_id: "Section 1: Introduction",
        quote: "to ensure trust in the decision outcomes, it is recommended to choose multiple methods in determining the weights"
      },
      usable_as: "recommendation" as const
    },
    {
      claim: "Multi-criteria decision methods are tools that support decision-making by organizing complex information and enabling managers to make more rational decisions. However, the ultimate decision is still made by the managers, not the methods themselves. Methods cannot eliminate bias — they can only structure it. Therefore, analysis of panel composition and decision context remains essential even when rigorous MCDM methods are applied.",
      verbatim_quote: "it is important to note that the ultimate decision is still made by the managers, not the methods themselves",
      evidence: {
        page: 19,
        locator_type: "paragraph",
        locator_id: "Section 5: Conclusion",
        quote: "it is important to note that the ultimate decision is still made by the managers, not the methods themselves. A balanced approach that combines subjective and objective methods has emerged as a trend in the development of new methods, as it allows for the integration of manager preferences with mathematical algorithms"
      },
      usable_as: "recommendation" as const
    }
  ],
  limitations: [
    "The review focuses on six novel weighting methods (CILOS, IDOCRIW, FUCOM, LBWA, SAPEVO-M, MEREC); does not exhaustively cover all MCDM weighting approaches.",
    "Bibliometric analysis covers publications in Web of Science and Scopus; regional or national MCDM literature in other databases may be underrepresented.",
    "The review discusses general principles of subjective vs. objective methods but does not provide empirical comparison of how each method is affected by specific panel composition biases."
  ],
  recommendations: [
    "When using subjective weighting methods (like AHP), explicitly acknowledge that the resulting weight distribution reflects the cognitive and professional profile of the expert panel, not an absolute strategic truth.",
    "For robustness in BOCR weight auditing, combine subjective panel-based weights with objective data-driven approaches (e.g., entropy-based, MEREC) and compare distributions to identify panel-composition bias.",
    "When panel-derived weights show strong dominance of one criterion, consider whether the dominance is stable across alternative weighting methods or is artifact of the subjective elicitation procedure.",
    "Document the weighting method used, the panel composition, and the rationale for method choice in all MCDM studies — transparency is essential for reproducibility and for assessing the reliability of weight distributions."
  ],
  cites: [],
  cited_by_context: {},
  notes: [
    "Modern (2023) systematic review establishing the state-of-the-art in MCDM weighting. Provides the theoretical foundation for arguing that weight distributions are method- and panel-dependent, not absolute.",
    "The bounded rationality argument (Simon) explicitly links MCDM weighting to cognitive limitations of decision-makers, grounding the professional bias discussion in foundational decision theory.",
    "Highly relevant for auditing AHP-BOCR distributions: provides authoritative basis for stating that subjective methods inherently carry bias from panel composition, which is not a defect but a characteristic that must be transparently reported."
  ]
};

export default article;
