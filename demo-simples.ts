/**
 * DEMO SIMPLIFICADO - AHP-BOCR Peer Review API v6.5.0
 * Executa automaticamente sem verificação de main module
 */

import { BOCRPeerReviewAPI, ManuscriptData } from './bocr-peer-review-api.js';

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  AHP-BOCR PEER REVIEW API v6.5.1 (Bug Fixed!)                 ║');
console.log('║  Based on 5 papers, 961 citations                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('\n');

// ========================================================================
// EXEMPLO 1: Lee et al. (2009) - Wind Farms ✅ BOAS PRÁTICAS
// ========================================================================
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
  
  synthesis_method: 'additive_subtraction',
  
  rescaling_weights: {
    sb: 0.331,
    so: 0.165,
    sc: 0.496,
    sr: 0.008
  },
  
  final_ranking: ["Site_B", "Site_D", "Site_E", "Site_A", "Site_C"],
  
  consistency_ratios_reported: true,
  max_cr_value: 0.08,
  
  dominant_criteria: [
    {
      merit: 'B',
      criterion_name: 'Mean wind power density',
      global_priority: 0.2637
    }
  ]
};

// ========================================================================
// EXEMPLO 2: Manuscrito RUIM com método tradicional ❌
// ========================================================================
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
  
  synthesis_method: 'multiplicative_traditional',
  
  rescaling_weights: undefined,
  
  final_ranking: ["Alt_C", "Alt_A", "Alt_B"],
  
  consistency_ratios_reported: false,
  
  dominant_criteria: []
};

// ========================================================================
// EXECUTAR ANÁLISES
// ========================================================================

async function main() {
  const api = new BOCRPeerReviewAPI();
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('📄 EXEMPLO 1: Lee et al. (2009) - Wind Farms\n');
  console.log('   Expected: EXCELLENT/GOOD (correct methods)\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const result1 = await api.analyzeManuscript(EXAMPLE_LEE_2009_WIND);
  console.log(api.generateReport(result1));
  
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('📄 EXEMPLO 2: Hypothetical BAD Manuscript\n');
  console.log('   Expected: CRITICAL FLAWS (traditional multiplicative method)\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const result2 = await api.analyzeManuscript(EXAMPLE_BAD_TRADITIONAL);
  console.log(api.generateReport(result2));
  
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY COMPARISON                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const examples = [
    { name: 'Lee et al. (2009) Wind', result: result1 },
    { name: 'Bad Traditional', result: result2 }
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
  console.log('   3. Commensurability is NON-NEGOTIABLE for valid results\n');
  
  console.log('📚 SOURCES:\n');
  console.log('   • Wijnmalen (2007) - Critical validation (119 citations)');
  console.log('   • Lee et al. (2009) - Wind farms application (232 citations)');
  console.log('   • Lee (2009) - TFT-LCD application (305 citations)');
  console.log('   • Demirtas & Ustun (2008) - Supply chain (310 citations)');
  console.log('   • Petrillo et al. (2023) - State-of-the-art review (181 papers)\n');
  
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

// EXECUTAR DIRETAMENTE
console.log('🚀 Iniciando análises...\n');
main().catch((error) => {
  console.error('❌ Erro durante execução:');
  console.error(error);
  process.exit(1);
});
