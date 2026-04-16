/**
 * Article Extraction: SAIYED, A. A.; TATOGLU, E.; ALI, S.; DUTTA, D. K. (2023)
 * "Entrepreneurial orientation, CEO power and firm performance: 
 *  An upper echelons theory perspective"
 * 
 * Empirical study of 369 Indian publicly-traded firms demonstrating that CEO power 
 * (an upper echelons variable) acts as a double-edged sword: high CEO power induces 
 * cognitive biases in strategic decision-making, leading CEOs to shut out alternative 
 * views and concentrate on upside potential while ignoring downside consequences. 
 * Provides contemporary empirical evidence of selective perception at the executive 
 * level in volatile emerging market contexts.
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "saiyed2023_ceoPowerUET",
  citation: {
    abnt: "SAIYED, Abrar Ali; TATOGLU, Ekrem; ALI, Shamim; DUTTA, Dev K. Entrepreneurial orientation, CEO power and firm performance: An upper echelons theory perspective. Management Decision, v. 61, n. 6, p. 1773-1797, 2023.",
    bibtex: "@article{saiyed2023entrepreneurial,\n  title={Entrepreneurial orientation, CEO power and firm performance: An upper echelons theory perspective},\n  author={Saiyed, Abrar Ali and Tatoglu, Ekrem and Ali, Shamim and Dutta, Dev K},\n  journal={Management Decision},\n  volume={61},\n  number={6},\n  pages={1773--1797},\n  year={2023},\n  publisher={Emerald Publishing Limited}\n}"
  },
  doi: "10.1108/MD-05-2022-0641",
  type: "application",
  metadata: { year: 2023, venue: "Management Decision", domain: "Strategic Management / Emerging Markets" },
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
      claim: "According to Upper Echelons Theory, the dispositions and actions of a firm's top management matter significantly for strategic outcomes. CEO power, specifically, is an upper echelons variable whose consequences for organizational performance remain an enigma, making it one of the most-studied yet least-resolved variables in strategic management.",
      verbatim_quote: "According to the upper echelons theory (Hambrick, 2007a; Hambrick and Mason, 1984), the dispositions and actions of the firm's top management, i.e. the upper echelons, matter",
      evidence: {
        page: 1778,
        locator_type: "paragraph",
        locator_id: "Section 2.3: Upper Echelons and CEO power",
        quote: "According to the upper echelons theory (Hambrick, 2007a; Hambrick and Mason, 1984), the dispositions and actions of the firm's top management, i.e. the upper echelons, matter"
      },
      usable_as: "definition" as const
    },
    {
      claim: "High CEO power induces systematic cognitive biases in strategic decision-making: it distorts how the CEO frames decision calculus and estimates risks, causing concentration on upside potential while ignoring relevant downside consequences. This is especially pronounced in volatile, high-entrepreneurial-orientation contexts where strategic flexibility is critical.",
      verbatim_quote: "High power leads to cognitive biases creeping in, especially how the CEO frames the decision calculus and estimates risks inherent in decisions, leading them to concentrate on the upside potential of the decisions and ignore relevant downside consequences",
      evidence: {
        page: 1779,
        locator_type: "paragraph",
        locator_id: "Section 2.4: Hypothesis Development",
        quote: "High power leads to cognitive biases creeping in, especially how the CEO frames the decision calculus and estimates risks inherent in decisions, leading them to concentrate on the upside potential of the decisions and ignore relevant downside consequences"
      },
      usable_as: "limitation" as const
    },
    {
      claim: "Individuals operating with high power indulge in more self-serving behaviors and are less accurate in recognizing the interests and opinions of colleagues. In group decision-making contexts (such as AHP/BOCR expert panels), the presence of a highly powerful dominant member can systematically distort the group's weight distribution away from consensus and toward that member's individual preferences.",
      verbatim_quote: "individuals operating with high power have been found to (1) indulge in more self-serving behaviors and (2) be less accurate in recognizing the interests and opinions of the people they work with",
      evidence: {
        page: 1779,
        locator_type: "paragraph",
        locator_id: "Section 2.4",
        quote: "individuals operating with high power have been found to (1) indulge in more self-serving behaviors and (2) be less accurate in recognizing the interests and opinions of the people they work with"
      },
      usable_as: "limitation" as const
    },
    {
      claim: "Long-tenured executives accumulate significant power and tend to become more lethargic and reactive, initiating fewer new strategic initiatives and focusing instead on replicating what has worked in the past. The compound effect of high tenure + high power produces inflexibility in interpreting organizational goals and adjusting to an evolving external environment, leading to suboptimal decisions.",
      verbatim_quote: "the CEO tends to be more lethargic and reactive, tending to initiate fewer new strategic initiatives, instead choosing to focus on and replicate what has worked successfully in the past. Because long-tenured CEOs also tend to accumulate significant power",
      evidence: {
        page: 1780,
        locator_type: "paragraph",
        locator_id: "Section 2.4",
        quote: "the CEO tends to be more lethargic and reactive, tending to initiate fewer new strategic initiatives, instead choosing to focus on and replicate what has worked successfully in the past. Because long-tenured CEOs also tend to accumulate significant power (Liu and Jiraporn, 2010), the problem may be compounded by the interplay between tenure and power, further affecting the EO-performance link"
      },
      usable_as: "benchmark" as const
    },
    {
      claim: "Upper echelons factors are not uniformly beneficial but rather function as a 'double-edged sword' — beneficial to a firm up to a certain threshold, beyond which they become counter-productive. This nonlinear relationship is particularly evident in contexts of high market volatility and emerging economies, where contextual dynamism amplifies the consequences of executive bias.",
      verbatim_quote: "we suggest that upper echelon factors can function as a \"double-edged sword\", benefiting a firm to a certain extent and then becoming counter-productive",
      evidence: {
        page: 1788,
        locator_type: "paragraph",
        locator_id: "Section 5.1: Theoretical implications",
        quote: "we suggest that upper echelon factors can function as a \"double-edged sword\", benefiting a firm to a certain extent and then becoming counter-productive"
      },
      usable_as: "recommendation" as const
    },
    {
      claim: "Under high CEO power combined with uncertain/dynamic situations (common in entrepreneurial contexts), chief executives tend to 'shut out' other views and perspectives, pushing through with their own dominant thinking. This blocks the possibility of building support for alternative projects competing for resources, which harms firm performance. The implication for group decision-making: panels dominated by a single powerful voice systematically produce biased weight distributions.",
      verbatim_quote: "under high CEO power and given the dynamic, uncertain situation that prevails when the firm operates with a high level of EO, chief executives tend to \"shut out\" other views and perspectives instead of pushing through with their own dominant thinking",
      evidence: {
        page: 1787,
        locator_type: "paragraph",
        locator_id: "Section 5",
        quote: "under high CEO power and given the dynamic, uncertain situation that prevails when the firm operates with a high level of EO, chief executives tend to \"shut out\" other views and perspectives instead of pushing through with their own dominant thinking"
      },
      usable_as: "limitation" as const
    }
  ],
  limitations: [
    "Sample consists of 369 Indian publicly-traded firms; generalization to other emerging markets or developed economies requires validation.",
    "Uses archival data to measure CEO power, which may not fully capture the nuances of power in interpersonal group dynamics.",
    "The curvilinear relationship between entrepreneurial orientation and performance may vary by industry and discretion level; not all industries will exhibit the same inflection point."
  ],
  recommendations: [
    "In AHP-BOCR panels, explicitly identify whether any respondent holds disproportionate power (via hierarchical position, tenure, or formal authority) that could dominate the group's weight distribution.",
    "For volatile/dynamic industrial contexts (emerging markets, Industry 4.0, automotive transformation), increase the sensitivity of the panel bias analysis — the double-edged sword effect is amplified in uncertain environments.",
    "When weight dominance of one BOCR merit dimension is observed in a panel with a dominant senior executive, explicitly report this as a potential source of bias rather than treating the dominance as a pure reflection of strategic priorities.",
    "For robustness, consider weight aggregation methods that dampen the influence of high-power/high-tenure respondents, or include multiple panels with different power structures."
  ],
  cites: ["neely2020_upperEchelonsMetacritiques"],
  cited_by_context: {
    neely2020_upperEchelonsMetacritiques: "Cited via the broader Upper Echelons Theory framework. Saiyed et al. extend the UET perspective to CEO power dynamics in emerging economy and entrepreneurial contexts, providing empirical support for the cognitive-bias mechanisms that Neely et al. (2020) identify as underexplored in UET research."
  },
  notes: [
    "Recent (2023) empirical evidence extending Upper Echelons Theory to emerging market contexts. Directly validates the argument that panel composition and power distribution affect strategic weight choices.",
    "The 'double-edged sword' concept is particularly useful for MCDM auditing: it provides a framework to evaluate whether a panel's dominant voice is producing beneficial or counter-productive weight distributions.",
    "Relevant for Brazilian industrial contexts (emerging market) — directly applicable to the AHP-BOCR analysis of Industry 4.0 automotive investments."
  ]
};

export default article;
