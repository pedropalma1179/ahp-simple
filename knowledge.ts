/**
 * AHP-BOCR KNOWLEDGE BASE v2.0
 * Consolidated from 5 peer-reviewed papers (961 total citations)
 * 
 * Sources:
 * - Petrillo et al. (2023) - State-of-the-art review (181 BOCR papers analyzed)
 * - Demirtas & Ustun (2008) - 310 citations (Supply chain, ANP+MOMILP)
 * - Lee (2009) - 305 citations (TFT-LCD, Fuzzy AHP)
 * - Lee et al. (2009) - 232 citations (Wind farms, AHP)
 * - Wijnmalen (2007) - 119 citations ⭐ CRITICAL VALIDATION (Methodology)
 */

export const BOCR_KNOWLEDGE_BASE = {
  
  /**
   * ==========================================================================
   * 1. STRUCTURE BENCHMARKS
   * ==========================================================================
   */
  structure: {
    criteria_distribution: {
      studies_analyzed: 4,
      
      samples: [
        { source: "Demirtas & Ustun (2008)", total: 14, B: 7, O: 3, C: 3, R: 3 },
        { source: "Lee (2009)", total: 37, B: 14, O: 14, C: 5, R: 9 },
        { source: "Lee et al. (2009)", total: 12, B: 3, O: 3, C: 3, R: 3 },
        { source: "Wijnmalen (2007)", total: 4, B: 1, O: 1, C: 1, R: 1, note: "Validation study" }
      ],
      
      statistics: {
        total_criteria: {
          min: 4,
          max: 37,
          mean: 16.75,
          median: 13,
          recommendation: "10-20 criteria for practical applications"
        },
        
        bocr_balance: {
          perfectly_balanced: "Lee et al. (2009) - 3:3:3:3",
          most_detailed_benefits: "Lee (2009) - 14 criteria",
          most_detailed_opportunities: "Lee (2009) - 14 criteria",
          typical_distribution: "Benefits and Opportunities more detailed than Costs/Risks"
        }
      }
    },
    
    subcriteria_depth: {
      lee_2009: {
        total_detailed_criteria: 37,
        max_levels: 3,
        note: "Most comprehensive structure documented"
      },
      
      lee_et_al_2009: {
        costs_treatment: "Subcriteria SUMMED as monetary values (not AHP compared)",
        risks_treatment: "NO subcriteria (experts decided criteria sufficient)",
        insight: "Mixed quantitative/qualitative approach"
      }
    }
  },

  /**
   * ==========================================================================
   * 2. SYNTHESIS METHODS - CRITICAL FINDINGS (Wijnmalen 2007)
   * ==========================================================================
   */
  synthesis_methods: {
    
    // ❌ FLAWED TRADITIONAL METHODS
    incorrect_methods: {
      
      multiplicative_traditional: {
        formula: "(B^wb * O^wo) / (C^wc * R^wr)",
        source: "Saaty (2001, 2004)",
        problem: "INCOMMENSURABILITY - Weights as powers",
        evidence: {
          study: "Wijnmalen (2007)",
          correct_ordering: true,
          correct_profitability: false,
          exception: "Only if B_total * O_total = C_total * R_total (VERY RARE)"
        },
        verdict: "❌ DO NOT USE - Can suggest profitability when unprofitable"
      },
      
      additive_reciprocal: {
        formula: "wb*B + wo*O + wc*(1/C) + wr*(1/R)",
        source: "Saaty (2001)",
        problems: [
          "Reciprocals distort the scale (Millet & Schoner 2005)",
          "Always produces positive values (cannot detect unprofitability)",
          "Does NOT always produce correct ordering (Wijnmalen 2007, Table 5)"
        ],
        evidence: {
          study: "Wijnmalen (2007)",
          correct_ordering: false,
          correct_profitability: false,
          implemented_in: "SuperDecisions v1.6.0"
        },
        verdict: "❌ DO NOT USE"
      }
    },
    
    // ✅ CORRECT METHODS
    correct_methods: {
      
      multiplicative_revised: {
        formula: "(sb*B + so*O) / (sc*C + sr*R)",
        source: "Wijnmalen (2007) - Formula 12",
        weights_definition: {
          sb: "B_total / (B_total + O_total + C_total + R_total)",
          so: "O_total / (B_total + O_total + C_total + R_total)",
          sc: "C_total / (B_total + O_total + C_total + R_total)",
          sr: "R_total / (B_total + O_total + C_total + R_total)",
          note: "Magnitude-based rescaling weights - make priorities COMMENSURATE"
        },
        properties: {
          correct_ordering: true,
          correct_profitability: true,
          break_even: 1.0,
          validation: "100% match with monetary values (Wijnmalen 2007, Table 9)"
        },
        advantages: [
          "Always correct ordering",
          "Always correct profitability indication",
          "Clear break-even point at 1.0",
          "Sum preserves units (not squared dollars)"
        ],
        verdict: "✅ RECOMMENDED - Quotient of sums"
      },
      
      additive_subtraction: {
        formula: "sb*B + so*O - sc*C - sr*R",
        source: "Saaty & Ozdemir (2004), Wijnmalen (2007)",
        weights_definition: "Same magnitude-based weights as multiplicative",
        properties: {
          correct_ordering: true,
          correct_profitability: true,
          break_even: 0.0,
          can_show_negative: true,
          validation: "100% match with monetary values (Wijnmalen 2007, Table 7)"
        },
        advantages: [
          "Always correct ordering",
          "Always correct profitability indication",  
          "Can show negative values (unprofitable alternatives)",
          "Clear break-even point at 0.0",
          "Net value interpretation"
        ],
        verdict: "✅ RECOMMENDED - Net value approach"
      },
      
      with_personal_weights: {
        multiplicative: "(vb*sb*B + vo*so*O) / (vc*sc*C + vr*sr*R)",
        additive: "vb*sb*B + vo*so*O - vc*sc*C - vr*sr*R",
        note: "Personal weights {vb,vo,vc,vr} applied AFTER rescaling, not before",
        source: "Wijnmalen (2007) - Formulas 15, 17",
        warning: "Rescaling weights (s) MUST come first to ensure commensurability"
      }
    },
    
    // 📊 VALIDATION EVIDENCE
    validation: {
      wijnmalen_2007: {
        scenarios_tested: 3,
        alternatives: 3,
        methods_compared: 6,
        
        results_equal_weights: {
          multiplicative_traditional: {
            correct_ordering: true,
            correct_profitability: false
          },
          additive_reciprocal: {
            correct_ordering: false,
            correct_profitability: false
          },
          additive_subtraction: {
            correct_ordering: false,  // With equal weights
            correct_profitability: false
          }
        },
        
        results_rescaled_weights: {
          multiplicative_traditional: {
            correct_ordering: false,  // Still wrong!
            correct_profitability: false
          },
          additive_reciprocal: {
            correct_ordering: false,
            correct_profitability: false
          },
          multiplicative_revised: {
            correct_ordering: true,
            correct_profitability: true,
            match_with_monetary: "100% perfect"
          },
          additive_subtraction: {
            correct_ordering: true,
            correct_profitability: true,
            match_with_monetary: "100% perfect"
          }
        }
      }
    }
  },

  /**
   * ==========================================================================
   * 3. CONCORDANCE BENCHMARKS
   * ==========================================================================
   */
  concordance: {
    
    definition: "Agreement rate across different synthesis methods in ranking alternatives",
    
    empirical_data: [
      {
        study: "Lee (2009) - TFT-LCD",
        methods_tested: 5,
        alternatives: 5,
        agreement_rate: 0.80,  // 4 out of 5 methods agreed
        disagreement: "Multiplicative method produced different ranking",
        final_ranking: "Supplier II > Supplier I > ... (by 4 methods)"
      },
      {
        study: "Lee et al. (2009) - Wind farms",
        methods_tested: 5,
        alternatives: 5,
        agreement_rate: 1.0,  // ALL 5 methods agreed!
        final_ranking: "Site B > Site D > Site E > Site A > Site C",
        note: "Perfect concordance - rare in literature"
      },
      {
        study: "Wijnmalen (2007) - Condominium",
        methods_tested: 3,
        alternatives: 3,
        equal_weights: {
          agreement_rate: 0.33,  // Only 1 of 3 correct
          note: "Traditional methods highly unreliable"
        },
        rescaled_weights: {
          agreement_rate: 0.33,  // Still only 1 of 3 correct
          note: "Only additive subtraction works"
        },
        revised_methods: {
          agreement_rate: 1.0,  // 100% with correct formulas
          note: "Perfect match with monetary validation"
        }
      }
    ],
    
    benchmarks: {
      excellent: { min: 0.8, max: 1.0, interpretation: "High confidence in decision" },
      good: { min: 0.6, max: 0.79, interpretation: "Acceptable confidence" },
      moderate: { min: 0.4, max: 0.59, interpretation: "Review criteria or methods" },
      poor: { min: 0.0, max: 0.39, interpretation: "Unreliable - DO NOT USE" }
    },
    
    recommendations: {
      if_concordance_low: [
        "Check for commensurability issues",
        "Verify rescaling weights are magnitude-based",
        "Use only revised formulas from Wijnmalen (2007)",
        "Consider sensitivity analysis on criteria weights"
      ]
    }
  },

  /**
   * ==========================================================================
   * 4. ROBUSTNESS (Difference between 1st and 2nd place)
   * ==========================================================================
   */
  robustness: {
    
    definition: "Percentage difference in scores between top 2 alternatives",
    
    empirical_data: [
      {
        study: "Lee (2009) - TFT-LCD",
        method: "Additive",
        first_score: 0.2220,
        second_score: 0.2187,
        absolute_diff: 0.0033,
        percentage_diff: 1.49,
        interpretation: "VERY CLOSE - low robustness, marginal decision"
      },
      {
        study: "Lee et al. (2009) - Wind farms",
        method: "Additive",
        first_score: 0.2104,
        second_score: 0.2055,
        absolute_diff: 0.0049,
        percentage_diff: 2.33,
        interpretation: "CLOSE - moderate robustness"
      },
      {
        study: "Lee et al. (2009) - Wind farms",
        method: "Multiplicative",
        first_score: 1.1810,
        second_score: 1.0801,
        absolute_diff: 0.1009,
        percentage_diff: 8.54,
        interpretation: "CLEAR WINNER - good robustness"
      }
    ],
    
    benchmarks: {
      very_robust: { 
        min: 10, 
        interpretation: "Clear winner - high confidence",
        recommendation: "Decision is stable"
      },
      robust: { 
        min: 5, 
        max: 9.99,
        interpretation: "Good separation - acceptable confidence",
        recommendation: "Decision is reasonably stable"
      },
      moderate: { 
        min: 2, 
        max: 4.99,
        interpretation: "Close decision - moderate confidence",
        recommendation: "Consider sensitivity analysis"
      },
      weak: { 
        min: 0.5, 
        max: 1.99,
        interpretation: "Very close - low confidence",
        recommendation: "Review criteria weights, consider alternatives improvement"
      },
      very_weak: { 
        min: 0, 
        max: 0.49,
        interpretation: "Marginal difference - unreliable",
        recommendation: "Decision unstable - may reverse with slight changes"
      }
    },
    
    recommendations: {
      if_robustness_low: [
        "Perform sensitivity analysis on top criteria",
        "Review pairwise comparisons for consistency",
        "Consider collecting more expert opinions",
        "Evaluate if top alternatives can be improved",
        "Check if differences are within measurement error"
      ]
    }
  },

  /**
   * ==========================================================================
   * 5. SAMPLE SIZE (Number of experts)
   * ==========================================================================
   */
  sample_size: {
    
    empirical_data: [
      {
        study: "Demirtas & Ustun (2008)",
        n_experts: "Not specified",
        composition: "Purchasing department personnel + Supplier personnel",
        aggregation: "Geometric mean"
      },
      {
        study: "Lee (2009)",
        n_experts: 5,
        composition: [
          "Senior manager - Purchasing",
          "Senior manager - Finance",
          "Senior manager - Corporate Development"
        ],
        company: "TFT-LCD manufacturer (Taiwan)",
        aggregation: "Geometric mean",
        consistency_check: true
      },
      {
        study: "Lee et al. (2009)",
        n_experts: 11,
        composition: {
          power_entrepreneurs: 3,
          scholars: 2,
          legislative_servants: 3,
          government_officers: 3
        },
        context: "Government wind farm evaluation committee",
        aggregation: "Geometric mean",
        consistency_check: true
      }
    ],
    
    recommendations: {
      minimum: 3,
      optimal: "5-11",
      rationale: [
        "< 3 experts: Too few perspectives, high individual bias",
        "3-5 experts: Acceptable for corporate decisions",
        "5-11 experts: Optimal for complex multi-stakeholder decisions",
        "> 15 experts: Diminishing returns, coordination challenges"
      ],
      
      composition_guidelines: [
        "Include domain experts with technical knowledge",
        "Include decision-makers with strategic perspective",
        "Include stakeholder representatives when appropriate",
        "At least 1/3 external experts for objectivity (government projects)"
      ],
      
      aggregation_methods: {
        recommended: "Geometric mean",
        rationale: "Preserves ratio scale properties in AHP",
        alternative: "Arithmetic mean (simpler but less theoretically sound)"
      }
    }
  },

  /**
   * ==========================================================================
   * 6. CRITERIA DOMINANCE (Criteria with weight > 20%)
   * ==========================================================================
   */
  criteria_dominance: {
    
    definition: "Criteria with global priority > 0.20 (20% of merit weight)",
    threshold: 0.20,
    concern: "Single criterion dominating > 50% indicates potential bias or oversimplification",
    
    empirical_data: {
      
      lee_2009_tft_lcd: {
        dominant_criteria: [
          {
            merit: "Benefits",
            criterion: "On time delivery",
            global_priority: 0.244,
            percentage_of_merit: 69.2,  // 0.244 / 0.353
            interpretation: "Critical success factor"
          },
          {
            merit: "Benefits",
            criterion: "Order lead time",
            global_priority: 0.220,
            percentage_of_merit: 62.3,
            interpretation: "Critical success factor"
          },
          {
            merit: "Opportunities",
            criterion: "Closeness of relationship",
            global_priority: 0.200,
            percentage_of_merit: 113.6,
            interpretation: "Super-dominant - exceeds merit weight!"
          },
          {
            merit: "Costs",
            criterion: "Product price",
            global_priority: 0.421,
            percentage_of_merit: 112.6,
            interpretation: "SUPER-DOMINANT - cost driver"
          },
          {
            merit: "Risks",
            criterion: "Supplier's capability limit",
            global_priority: 0.235,
            percentage_of_merit: 242.3,
            interpretation: "SUPER-DOMINANT"
          }
        ],
        total_dominant: 4,
        note: "Delivery time = 46.4% of Benefits merit"
      },
      
      lee_et_al_2009_wind_farms: {
        dominant_criteria: [
          {
            merit: "Benefits",
            criterion: "Mean wind power density",
            global_priority: 0.2637,
            percentage_of_merit: 79.3,
            interpretation: "SUPER-DOMINANT success factor"
          },
          {
            merit: "Costs",  
            criterion: "Wind turbine",
            global_priority: 0.5595,
            percentage_of_merit: 221.1,
            interpretation: "EXTREME DOMINANCE - 56% of total costs"
          },
          {
            merit: "Risks",
            criterion: "Concept conflict",
            global_priority: 0.5639,
            percentage_of_merit: 285.5,
            interpretation: "EXTREME DOMINANCE - stakeholder alignment critical"
          }
        ],
        total_dominant: 3,
        note: "Clear critical success factors identified"
      }
    },
    
    interpretation_guidelines: {
      single_criterion_20_to_30_pct: "Normal - Important factor",
      single_criterion_30_to_50_pct: "High importance - Dominant factor",
      single_criterion_over_50_pct: "SUPER-DOMINANT - Verify this reflects reality",
      multiple_criteria_over_20_pct: "Distributed importance - Good balance",
      
      warning_signs: [
        "One criterion > 50% of merit: Check for bias or missing criteria",
        "All weight on 1-2 criteria: Model may be oversimplified",
        "No criteria > 20%: May indicate lack of clear priorities"
      ]
    }
  },

  /**
   * ==========================================================================
   * 7. BOCR WEIGHTS DISTRIBUTION
   * ==========================================================================
   */
  bocr_weights: {
    
    empirical_data: [
      {
        study: "Lee (2009) - TFT-LCD Manufacturing",
        B: 0.353,
        O: 0.176,
        C: 0.374,  // Costs dominate!
        R: 0.097,
        dominant_merit: "Costs",
        interpretation: "Manufacturing context - cost minimization critical"
      },
      {
        study: "Lee et al. (2009) - Wind Farms Energy",
        B: 0.333,
        O: 0.217,
        C: 0.253,
        R: 0.198,
        dominant_merit: "Benefits",
        interpretation: "Energy project - benefits (wind availability) dominate"
      },
      {
        study: "Wijnmalen (2007) - Condominium",
        B: 0.333,
        O: 0.217,
        C: 0.253,
        R: 0.198,
        note: "Used in validation scenarios"
      }
    ],
    
    patterns: {
      manufacturing_supply_chain: {
        typical_dominant: "Costs",
        rationale: "Competitive markets, thin margins, cost reduction imperative",
        example: "Lee (2009) - TFT-LCD"
      },
      
      energy_infrastructure: {
        typical_dominant: "Benefits",
        rationale: "Resource availability, technical feasibility drive decisions",
        example: "Lee et al. (2009) - Wind farms"
      },
      
      public_sector: {
        typical_pattern: "More balanced across BOCR",
        rationale: "Multiple stakeholders, diverse objectives",
        risks_weight: "Usually higher than private sector"
      }
    },
    
    recommendations: {
      balanced_bocr: "Each merit 20-30% - Indicates comprehensive evaluation",
      single_dominant_over_40: "Acceptable if justified by context",
      risks_under_10: "May underestimate downside - review risk criteria",
      costs_over_40: "Common in manufacturing - verify completeness of benefits/opportunities"
    }
  },

  /**
   * ==========================================================================
   * 8. CONSISTENCY RATIOS (CI/RI)
   * ==========================================================================
   */
  consistency: {
    
    threshold: {
      standard: 0.10,
      source: "Saaty (1980)",
      interpretation: "CR < 0.10 indicates acceptable consistency"
    },
    
    noted_in_studies: [
      {
        study: "Demirtas & Ustun (2008)",
        reference: "Ozdemir (2005)",
        threshold_used: 0.10,
        note: "Inconsistency ratio should be less than 0.1"
      },
      {
        study: "Lee (2009)",
        consistency_check: true,
        action_if_fail: "Expert asked to revise until consistency met",
        specific_values: "Not reported"
      },
      {
        study: "Lee et al. (2009)",
        consistency_check: true,
        note: "Consistency property examined, no specific CR values reported"
      }
    ],
    
    gap_identified: "None of the empirical studies report actual CI/RI values",
    
    recommendation: {
      always_check: true,
      report_values: true,
      action_plan: [
        "Calculate CR for every pairwise comparison matrix",
        "If CR > 0.10, identify most inconsistent judgments",
        "Ask experts to revise inconsistent comparisons",
        "Recalculate until CR < 0.10",
        "Report final CR values in results"
      ]
    }
  },

  /**
   * ==========================================================================
   * 9. COMMENSURABILITY - CRITICAL CONCEPT (Wijnmalen 2007)
   * ==========================================================================
   */
  commensurability: {
    
    problem: {
      description: "Priorities from separate B, O, C, R hierarchies are NOT commensurate",
      
      explanation: [
        "Each hierarchy normalizes priorities to sum = 1.0",
        "But 1.0 represents DIFFERENT totals for each merit",
        "Example: Total Benefits = $4000, Total Costs = $8000",
        "Both normalized to 1.0, but $1 of benefit ≠ $1 of cost!",
        "Synthesizing incommensurate priorities produces meaningless results"
      ],
      
      analogy: "Like adding apples (Benefits) to oranges (Costs) without unit conversion",
      
      consequences: [
        "Wrong ranking of alternatives",
        "False profitability indications",
        "Unprofitable alternatives appear profitable",
        "Decisions based on misleading metrics"
      ],
      
      evidence: "Wijnmalen (2007) Tables 3-4 show identical priorities producing opposite conclusions"
    },
    
    solution: {
      approach: "Magnitude-based rescaling weights",
      
      formulas: {
        sb: "B_total / (B_total + O_total + C_total + R_total)",
        so: "O_total / (B_total + O_total + C_total + R_total)",
        sc: "C_total / (B_total + O_total + C_total + R_total)",
        sr: "R_total / (B_total + O_total + C_total + R_total)"
      },
      
      example: {
        scenario: "Wijnmalen (2007) Scenario 1",
        B_total: 4000,
        O_total: 2000,
        C_total: 8000,
        R_total: 2000,
        sum: 16000,
        
        rescaling_weights: {
          sb: 0.25,   // 4000 / 16000
          so: 0.125,  // 2000 / 16000
          sc: 0.5,    // 8000 / 16000
          sr: 0.125   // 2000 / 16000
        },
        
        interpretation: "Costs are 2x more important than Benefits in absolute magnitude"
      },
      
      obtaining_magnitudes: {
        method_1: {
          name: "Direct magnitude questions",
          source: "Wedley et al. (2001)",
          questions: [
            "Which is more important: aggregate Benefits or aggregate Costs? By how many times?",
            "Which is more important: average Benefits or average Costs? By how many times?"
          ],
          disadvantage: "Cognitively difficult"
        },
        
        method_2: {
          name: "Linking pins",
          source: "Wedley et al. (2003), Schoner et al. (1993)",
          approach: "Link hierarchies through common nodes or referent alternatives",
          advantage: "Mentally easier than comparing abstract totalities"
        },
        
        method_3: {
          name: "Rating referent alternative",
          source: "Saaty (2005)",
          approach: "Compare ratings of one alternative across 4 factors"
        },
        
        method_4: {
          name: "Use tangible criteria as anchors",
          approach: "When some criteria have monetary values, use those to anchor scales",
          example: "Lee et al. (2009) - Cost subcriteria summed as monetary values"
        }
      }
    },
    
    validation: {
      test: "Synthesized priority results must match monetary calculations",
      wijnmalen_proof: "Table 9 shows 100% match across 3 scenarios with revised formulas",
      acid_test: "If monetary B/C = 2.0, priority-based B/C must also = 2.0"
    },
    
    critical_warning: {
      message: "NEVER use traditional formulas without ensuring commensurability",
      reason: "Results appear meaningful but are actually invalid",
      consequence: "Bad decisions based on false profitability indications",
      solution: "Always use magnitude-based rescaling weights"
    }
  },

  /**
   * ==========================================================================
   * 10. SOFTWARE & IMPLEMENTATION
   * ==========================================================================
   */
  software: {
    
    superdecisions: {
      version_analyzed: "1.6.0 (2005)",
      developer: "Creative Decisions Foundation",
      citation: "Wijnmalen (2007)",
      
      problems_identified: [
        "Implements FLAWED traditional methods",
        "Uses weights as powers in multiplicative formula",
        "Uses reciprocals in additive formula",
        "No commensurability adjustment"
      ],
      
      status_2007: "Produces potentially misleading results",
      recommendation: "Verify formulas used in current version"
    },
    
    implementation_guidelines: {
      
      formula_selection: {
        for_ratio_analysis: "Use multiplicative (quotient of sums)",
        for_net_value_analysis: "Use additive (with subtraction)",
        avoid: "Reciprocals in any form"
      },
      
      weight_application: {
        step_1: "Calculate magnitude-based rescaling weights (s)",
        step_2: "Apply rescaling to raw priorities: s*P",
        step_3: "If using personal weights (v), apply AFTER rescaling: v*s*P",
        critical: "NEVER use personal weights without prior rescaling"
      },
      
      normalization_warning: {
        issue: "Normalization cancels out rescaling weights",
        guideline: "Keep absolute values for break-even analysis",
        only_normalize: "For displaying relative performance within same merit"
      },
      
      profitability_interpretation: {
        multiplicative: {
          break_even: 1.0,
          profitable: "> 1.0",
          unprofitable: "< 1.0"
        },
        additive_subtraction: {
          break_even: 0.0,
          profitable: "> 0.0",
          unprofitable: "< 0.0"
        }
      }
    }
  },

  /**
   * ==========================================================================
   * 11. LITERATURE GAPS & FUTURE RESEARCH
   * ==========================================================================
   */
  gaps: {
    
    identified: [
      {
        gap: "No studies report actual CI/RI values",
        impact: "Cannot establish empirical benchmarks for acceptable consistency",
        recommendation: "Future studies should report all CR values"
      },
      {
        gap: "Limited sensitivity analysis reported",
        impact: "Cannot assess robustness to criteria weight changes",
        recommendation: "Perform sensitivity analysis on top 3-5 criteria"
      },
      {
        gap: "Commensurability rarely addressed in applications",
        impact: "Most published AHP-BOCR studies may have invalid results",
        recommendation: "Mandatory use of rescaling weights in all applications"
      },
      {
        gap: "No comparison of expert vs. group decisions",
        impact: "Unknown if aggregated judgments are more reliable",
        recommendation: "Compare individual expert rankings with aggregated results"
      }
    ],
    
    future_research: {
      methodological: [
        "Develop simpler methods for obtaining magnitude comparisons",
        "Extend linking pin methods to ANP network structures",
        "Investigate fuzzy methods for rescaling weights",
        "Compare different aggregation methods (geometric vs arithmetic mean)"
      ],
      
      practical: [
        "More applications in diverse fields (healthcare, education, government)",
        "Longitudinal studies tracking decision outcomes vs predictions",
        "Integration with other MCDM methods (TOPSIS, PROMETHEE, VIKOR)",
        "Real-time decision support systems with commensurability built-in"
      ]
    }
  },

  /**
   * ==========================================================================
   * 12. CRITICAL DECISION RULES
   * ==========================================================================
   */
  decision_rules: {
    
    when_to_use_ahp_bocr: [
      "Decision involves both positive (B, O) and negative (C, R) factors",
      "Mix of tangible and intangible criteria",
      "Multiple stakeholders with diverse perspectives",
      "Strategic decisions with long-term implications",
      "Need to justify decision with systematic methodology"
    ],
    
    when_not_to_use: [
      "Single criterion dominates (use simple cost-benefit analysis)",
      "All criteria easily monetized (use NPV, IRR, traditional methods)",
      "Time-critical decisions (AHP-BOCR requires significant effort)",
      "Lack of domain experts available",
      "Organizational resistance to structured methods"
    ],
    
    quality_checks: {
      structure: [
        "Are criteria MECE (Mutually Exclusive, Collectively Exhaustive)?",
        "Is each criterion independently measurable?",
        "Are there 3-5 criteria per merit (not too few, not too many)?",
        "Do criteria reflect both current and future concerns?"
      ],
      
      weights: [
        "Is CR < 0.10 for all pairwise comparison matrices?",
        "Are rescaling weights magnitude-based (not personal preference)?",
        "Do BOCR weights reflect organizational/project context?",
        "Is any single criterion > 50% of its merit (red flag)?"
      ],
      
      results: [
        "Is concordance across methods > 60%?",
        "Is robustness (1st-2nd gap) > 2%?",
        "Do results pass common sense test?",
        "Are unprofitable alternatives correctly identified?"
      ]
    },
    
    validation_checklist: {
      required: [
        "☐ Commensurability ensured through magnitude-based rescaling",
        "☐ Correct formulas used (quotient of sums OR subtraction)",
        "☐ Consistency ratios calculated and acceptable",
        "☐ Multiple methods tested for concordance",
        "☐ Robustness assessed (1st vs 2nd place gap)",
        "☐ Results validated with domain experts",
        "☐ Sensitivity analysis performed on key criteria"
      ],
      
      red_flags: [
        "🚩 Using traditional formulas without rescaling",
        "🚩 Reciprocals used for costs/risks",
        "🚩 Normalization applied after rescaling",
        "🚩 No consistency checks performed",
        "🚩 Single expert making all judgments",
        "🚩 Results contradict obvious monetary analysis",
        "🚩 SuperDecisions v1.6.0 or earlier used without verification"
      ]
    }
  }

} as const;

/**
 * ==========================================================================
 * QUICK REFERENCE - CORRECT FORMULAS
 * ==========================================================================
 */
export const CORRECT_BOCR_FORMULAS = {
  
  // Step 1: Calculate magnitude-based rescaling weights
  rescaling_weights: {
    sb: "B_total / (B_total + O_total + C_total + R_total)",
    so: "O_total / (B_total + O_total + C_total + R_total)",
    sc: "C_total / (B_total + O_total + C_total + R_total)",
    sr: "R_total / (B_total + O_total + C_total + R_total)",
  },
  
  // Step 2: Rescale priorities
  rescaled_priorities: {
    B_rescaled: "sb * B_priority",
    O_rescaled: "so * O_priority",
    C_rescaled: "sc * C_priority",
    R_rescaled: "sr * R_priority"
  },
  
  // Step 3: Synthesize (choose ONE)
  synthesis_multiplicative: "(B_rescaled + O_rescaled) / (C_rescaled + R_rescaled)",
  synthesis_additive: "B_rescaled + O_rescaled - C_rescaled - R_rescaled",
  
  // Optional Step 4: Apply personal weights (if desired)
  with_personal_weights_mult: "(vb*B_rescaled + vo*O_rescaled) / (vc*C_rescaled + vr*R_rescaled)",
  with_personal_weights_add: "vb*B_rescaled + vo*O_rescaled - vc*C_rescaled - vr*R_rescaled",
  
  // Profitability interpretation
  break_even: {
    multiplicative: 1.0,
    additive: 0.0
  }
  
} as const;

export type BOCRKnowledgeBase = typeof BOCR_KNOWLEDGE_BASE;
export type CorrectFormulas = typeof CORRECT_BOCR_FORMULAS;
