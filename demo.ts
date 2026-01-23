#!/usr/bin/env ts-node
/**
 * DEMO: AHP-BOCR Peer Review API v6.5.0
 * Examples from analyzed papers
 */

import { BOCRPeerReviewAPI, ManuscriptData } from './bocr-peer-review-api.js';

/**
 * ==========================================================================
 * EXAMPLE 1: Lee et al. (2009) - Wind Farms
 * Perfect example - uses correct methods
 * ==========================================================================
 */
const EXAMPLE_LEE_2009_WIND: ManuscriptData = {
  title: "Multi-criteria decision making on strategic selection of wind farms",
  authors: ["Lee, A.H.I.", "Chen, H.H.", "Kang, H-Y."],
  application_area: "Energy - Wind farm selection in China",
  
  total_criteria: 12,
  bocr_distribution: { B: 3, O: 3, C: 3, R: 3 },
  
  n_experts: 11,
  expert_composition: [
    "3 power entrepreneurs",
    "2 scholars",
    "3 legislative servants",
    "3 government officers"
  ],
  aggregation_method: "Geometric mean",
  
  bocr_weights: { 
    B: 0.3327, 
    O: 0.2168, 
    C: 0.2530, 
    R: 0.1975 
  },
  
  n_alternatives: 5,
  alternative_scores: {
    "Site_A": { B: 0.1753, O: 0.2026, C: 0.1809, R: 0.2049 },
    "Site_B": { B: 0.2246, O: 0.1990, C: 0.1921, R: 0.1970 },
    "Site_C": { B: 0.1809, O: 0.1941, C: 0.2133, R: 0.2022 },
    "Site_D": { B: 0.2191, O: 0.1977, C: 0.2014, R: 0.1992 },
    "Site_E": { B: 0.2001, O: 0.2066, C: 0.2124, R: 0.1967 }
  },
  
  synthesis_method: 'additive_subtraction',  // Used correct method!
  
  // NOTE: Paper doesn't explicitly show these, but uses them implicitly
  rescaling_weights: {
    sb: 0.331,
    so: 0.165,
    sc: 0.496,
    sr: 0.008
  },
  
  final_ranking: ["Site_B", "Site_D", "Site_E", "Site_A", "Site_C"],
  
  consistency_ratios_reported: true,
  max_cr_value: undefined,  // Values not reported in paper
  
  dominant_criteria: [
    {
      merit: 'B',
      criterion_name: 'Mean wind power density',
      global_priority: 0.2637
    },
    {
      merit: 'C',
      criterion_name: 'Wind turbine cost',
      global_priority: 0.5595
    },
    {
      merit: 'R',
      criterion_name: 'Concept conflict (stakeholder alignment)',
      global_priority: 0.5639
    }
  ]
};

/**
 * ==========================================================================
 * EXAMPLE 2: Lee (2009) - TFT-LCD
 * Good example but complex structure
 * ==========================================================================
 */
const EXAMPLE_LEE_2009_TFT: ManuscriptData = {
  title: "A fuzzy supplier selection model with the consideration of BOCR",
  authors: ["Lee, A.H.I."],
  application_area: "Manufacturing - TFT-LCD backlight unit supplier selection",
  
  total_criteria: 37,  // Very detailed!
  bocr_distribution: { B: 14, O: 14, C: 5, R: 9 },
  
  n_experts: 5,
  expert_composition: [
    "Senior manager - Purchasing",
    "Senior manager - Finance",
    "Senior manager - Corporate Development"
  ],
  aggregation_method: "Geometric mean (fuzzy)",
  
  bocr_weights: { 
    B: 0.353, 
    O: 0.176, 
    C: 0.374,  // Costs dominate in manufacturing!
    R: 0.097 
  },
  
  n_alternatives: 5,
  alternative_scores: {
    "Supplier_I": { B: 0.241, O: 0.213, C: 0.212, R: 0.141 },
    "Supplier_II": { B: 0.245, O: 0.212, C: 0.193, R: 0.171 },
    "Supplier_III": { B: 0.176, O: 0.192, C: 0.223, R: 0.222 },
    "Supplier_IV": { B: 0.139, O: 0.185, C: 0.162, R: 0.246 },
    "Supplier_V": { B: 0.199, O: 0.197, C: 0.211, R: 0.219 }
  },
  
  synthesis_method: 'additive_subtraction',
  
  rescaling_weights: undefined,  // ⚠️ Not explicitly shown in paper
  
  final_ranking: ["Supplier_II", "Supplier_I", "Supplier_V", "Supplier_IV", "Supplier_III"],
  
  consistency_ratios_reported: true,
  max_cr_value: undefined,
  
  dominant_criteria: [
    {
      merit: 'B',
      criterion_name: 'On time delivery',
      global_priority: 0.244
    },
    {
      merit: 'B',
      criterion_name: 'Order lead time',
      global_priority: 0.220
    },
    {
      merit: 'O',
      criterion_name: 'Closeness of relationship',
      global_priority: 0.200
    },
    {
      merit: 'C',
      criterion_name: 'Product price',
      global_priority: 0.421
    },
    {
      merit: 'R',
      criterion_name: "Supplier's capability limit",
      global_priority: 0.235
    }
  ]
};

/**
 * ==========================================================================
 * EXAMPLE 3: Hypothetical BAD manuscript
 * Shows what happens with traditional methods
 * ==========================================================================
 */
const EXAMPLE_BAD_TRADITIONAL: ManuscriptData = {
  title: "Supplier Selection Using Traditional AHP-BOCR (FLAWED)",
  authors: ["Hypothetical Authors"],
  application_area: "Supply chain",
  
  total_criteria: 8,
  bocr_distribution: { B: 2, O: 2, C: 2, R: 2 },
  
  n_experts: 3,
  aggregation_method: "Arithmetic mean",
  
  bocr_weights: { B: 0.3, O: 0.3, C: 0.2, R: 0.2 },
  
  n_alternatives: 3,
  alternative_scores: {
    "Alt_A": { B: 0.33, O: 0.33, C: 0.33, R: 0.33 },
    "Alt_B": { B: 0.33, O: 0.33, C: 0.33, R: 0.33 },
    "Alt_C": { B: 0.34, O: 0.34, C: 0.34, R: 0.34 }
  },
  
  // 🚨 USING FLAWED METHOD!
  synthesis_method: 'multiplicative_traditional',
  
  // 🚨 NO RESCALING WEIGHTS!
  rescaling_weights: undefined,
  
  final_ranking: ["Alt_C", "Alt_A", "Alt_B"],
  
  consistency_ratios_reported: false,  // ⚠️ Not reported
  
  dominant_criteria: []
};

/**
 * ==========================================================================
 * EXAMPLE 4: Hypothetical manuscript with reciprocals (FLAWED)
 * ==========================================================================
 */
const EXAMPLE_RECIPROCALS: ManuscriptData = {
  title: "Project Selection Using Reciprocals Method (FLAWED)",
  authors: ["Hypothetical Authors"],
  application_area: "Project management",
  
  total_criteria: 10,
  bocr_distribution: { B: 3, O: 3, C: 2, R: 2 },
  
  n_experts: 7,
  aggregation_method: "Geometric mean",
  
  bocr_weights: { B: 0.35, O: 0.25, C: 0.25, R: 0.15 },
  
  n_alternatives: 4,
  alternative_scores: {
    "Project_A": { B: 0.28, O: 0.26, C: 0.24, R: 0.22 },
    "Project_B": { B: 0.26, O: 0.28, C: 0.26, R: 0.28 },
    "Project_C": { B: 0.24, O: 0.24, C: 0.28, R: 0.26 },
    "Project_D": { B: 0.22, O: 0.22, C: 0.22, R: 0.24 }
  },
  
  // 🚨 USING RECIPROCALS METHOD!
  synthesis_method: 'additive_reciprocal',
  
  rescaling_weights: undefined,
  
  final_ranking: ["Project_A", "Project_B", "Project_C", "Project_D"],
  
  consistency_ratios_reported: true,
  max_cr_value: 0.09,
  
  dominant_criteria: []
};

/**
 * ==========================================================================
 * RUN ALL EXAMPLES
 * ==========================================================================
 */

async function runAllExamples() {
  
  const api = new BOCRPeerReviewAPI();
  
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  AHP-BOCR PEER REVIEW API v6.5.0 - DEMONSTRATION              ║');
  console.log('║  Based on 5 papers, 961 citations                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  // Example 1: GOOD manuscript
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('📄 EXAMPLE 1: Lee et al. (2009) - Wind Farms\n');
  console.log('   Expected: EXCELLENT/GOOD (correct methods)\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const result1 = await api.analyzeManuscript(EXAMPLE_LEE_2009_WIND);
  console.log(api.generateReport(result1));
  
  // Example 2: Complex but good
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('📄 EXAMPLE 2: Lee (2009) - TFT-LCD Suppliers\n');
  console.log('   Expected: GOOD (correct method but missing rescaling weights)\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const result2 = await api.analyzeManuscript(EXAMPLE_LEE_2009_TFT);
  console.log(api.generateReport(result2));
  
  // Example 3: BAD manuscript with traditional method
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('📄 EXAMPLE 3: Hypothetical BAD Manuscript\n');
  console.log('   Expected: CRITICAL FLAWS (traditional multiplicative method)\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const result3 = await api.analyzeManuscript(EXAMPLE_BAD_TRADITIONAL);
  console.log(api.generateReport(result3));
  
  // Example 4: BAD manuscript with reciprocals
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('📄 EXAMPLE 4: Hypothetical with Reciprocals Method\n');
  console.log('   Expected: CRITICAL FLAWS (reciprocals method)\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const result4 = await api.analyzeManuscript(EXAMPLE_RECIPROCALS);
  console.log(api.generateReport(result4));
  
  // Summary comparison
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY COMPARISON                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const examples = [
    { name: 'Lee et al. (2009) Wind', result: result1 },
    { name: 'Lee (2009) TFT-LCD', result: result2 },
    { name: 'Bad Traditional', result: result3 },
    { name: 'Bad Reciprocals', result: result4 }
  ];
  
  console.log('Manuscript                   | Quality      | Score | Confidence | Critical Issues');
  console.log('─────────────────────────────┼──────────────┼───────┼────────────┼────────────────');
  
  for (const ex of examples) {
    const quality = ex.result.overall_quality.padEnd(12);
    const score = `${ex.result.overall_score}/100`.padEnd(5);
    const confidence = ex.result.decision_confidence.padEnd(10);
    const critical = ex.result.issues.filter(i => i.severity === 'CRITICAL').length;
    
    console.log(`${ex.name.padEnd(28)} | ${quality} | ${score} | ${confidence} | ${critical}`);
  }
  
  console.log('\n');
  console.log('🎯 KEY TAKEAWAYS:\n');
  console.log('   1. Lee et al. (2009) shows BEST PRACTICE: correct method + rescaling');
  console.log('   2. Traditional methods produce CRITICAL FLAWS even with good structure');
  console.log('   3. Reciprocals method is UNRELIABLE - always avoid');
  console.log('   4. Commensurability is NON-NEGOTIABLE for valid results\n');
  
  console.log('📚 SOURCES:\n');
  console.log('   • Wijnmalen (2007) - Critical validation (119 citations)');
  console.log('   • Lee et al. (2009) - Wind farms application (232 citations)');
  console.log('   • Lee (2009) - TFT-LCD application (305 citations)');
  console.log('   • Demirtas & Ustun (2008) - Supply chain (310 citations)');
  console.log('   • Petrillo et al. (2023) - State-of-the-art review (181 papers)\n');
  
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

// Run
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  runAllExamples().catch(console.error);
}

export { 
  EXAMPLE_LEE_2009_WIND, 
  EXAMPLE_LEE_2009_TFT, 
  EXAMPLE_BAD_TRADITIONAL,
  EXAMPLE_RECIPROCALS 
};
