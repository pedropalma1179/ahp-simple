#!/usr/bin/env ts-node
/**
 * AHP-BOCR PEER REVIEW API v6.5.0
 * 
 * Complete manuscript analysis system with benchmarks from 5 peer-reviewed papers
 * Total citations: 961 (Petrillo 2023, Demirtas 2008, Lee 2009, Lee et al. 2009, Wijnmalen 2007)
 * 
 * CRITICAL UPDATE: Implements CORRECT formulas from Wijnmalen (2007)
 */

import { BOCR_KNOWLEDGE_BASE, CORRECT_BOCR_FORMULAS } from './knowledge.js';

/**
 * ==========================================================================
 * TYPE DEFINITIONS
 * ==========================================================================
 */

interface ManuscriptData {
  // Basic info
  title: string;
  authors: string[];
  application_area: string;
  
  // Structure
  total_criteria: number;
  bocr_distribution: {
    B: number;
    O: number;
    C: number;
    R: number;
  };
  
  // Sample
  n_experts: number;
  expert_composition?: string[];
  aggregation_method?: string;
  
  // Weights
  bocr_weights: {
    B: number;
    O: number;
    C: number;
    R: number;
  };
  
  // Alternatives
  n_alternatives: number;
  alternative_scores: {
    [alternative_id: string]: {
      B: number;
      O: number;
      C: number;
      R: number;
    };
  };
  
  // Synthesis method used
  synthesis_method: 'multiplicative_traditional' | 'multiplicative_revised' | 'additive_reciprocal' | 'additive_subtraction' | 'multiplicative_pp' | 'unknown';
  
  // Rescaling weights (if used)
  rescaling_weights?: {
    sb: number;
    so: number;
    sc: number;
    sr: number;
  };
  
  // Results
  final_ranking: string[];
  
  // Consistency
  consistency_ratios_reported: boolean;
  max_cr_value?: number;
  
  // Optional
  dominant_criteria?: Array<{
    merit: 'B' | 'O' | 'C' | 'R';
    criterion_name: string;
    global_priority: number;
  }>;
}

interface ValidationResult {
  overall_quality: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'CRITICAL_FLAWS';
  overall_score: number;  // 0-100
  
  issues: ValidationIssue[];
  recommendations: string[];
  
  detailed_analysis: {
    structure: StructureAnalysis;
    methodology: MethodologyAnalysis;
    robustness: RobustnessAnalysis;
    commensurability: CommensurabilityAnalysis;
  };
  
  benchmark_comparisons: BenchmarkComparison[];
  
  decision_confidence: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
}

interface ValidationIssue {
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  category: 'METHODOLOGY' | 'STRUCTURE' | 'CONSISTENCY' | 'COMMENSURABILITY' | 'ROBUSTNESS';
  message: string;
  evidence?: string;
  recommendation: string;
  source: string;  // Citation to paper that identified this issue
}

interface StructureAnalysis {
  total_criteria_assessment: {
    value: number;
    benchmark_min: number;
    benchmark_max: number;
    benchmark_mean: number;
    status: 'WITHIN_RANGE' | 'TOO_FEW' | 'TOO_MANY';
  };
  
  bocr_balance: {
    B: number;
    O: number;
    C: number;
    R: number;
    balance_score: number;  // 0-100, 100 = perfectly balanced
    assessment: string;
  };
  
  dominant_criteria_analysis: {
    criteria_over_20pct: number;
    criteria_over_50pct: number;
    concerns: string[];
  };
}

interface MethodologyAnalysis {
  synthesis_method_validity: {
    method_used: string;
    is_correct: boolean;
    concerns: string[];
    recommended_method: string;
  };
  
  commensurability_check: {
    rescaling_used: boolean;
    rescaling_type?: 'magnitude_based' | 'personal_values' | 'unknown';
    is_valid: boolean;
    critical_warning?: string;
  };
  
  consistency_check: {
    ratios_reported: boolean;
    all_below_threshold: boolean;
    max_cr?: number;
    threshold: number;
  };
  
  sample_size_assessment: {
    n_experts: number;
    is_adequate: boolean;
    recommendation: string;
  };
}

interface RobustnessAnalysis {
  first_place: string;
  second_place: string;
  score_difference: number;
  percentage_difference: number;
  
  robustness_level: 'VERY_ROBUST' | 'ROBUST' | 'MODERATE' | 'WEAK' | 'VERY_WEAK';
  interpretation: string;
  recommendation: string;
}

interface CommensurabilityAnalysis {
  issue_detected: boolean;
  severity: 'CRITICAL' | 'MAJOR' | 'NONE';
  
  explanation: string;
  evidence: string[];
  
  solution_applied: boolean;
  solution_type?: string;
  
  validation_possible: boolean;
  validation_result?: 'PASS' | 'FAIL';
}

interface BenchmarkComparison {
  metric: string;
  manuscript_value: number | string;
  benchmark_value: number | string;
  benchmark_range?: { min: number; max: number };
  comparison: 'BETTER' | 'WITHIN' | 'WORSE' | 'N/A';
  interpretation: string;
}

/**
 * ==========================================================================
 * MAIN VALIDATION ENGINE
 * ==========================================================================
 */

class BOCRPeerReviewAPI {
  
  private knowledge = BOCR_KNOWLEDGE_BASE;
  
  /**
   * Main validation method
   */
  async analyzeManuscript(data: ManuscriptData): Promise<ValidationResult> {
    
    console.log('🔍 Starting AHP-BOCR Manuscript Analysis v6.5.0...\n');
    
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    
    // Run all analyses
    const structure = this.analyzeStructure(data, issues);
    const methodology = this.analyzeMethodology(data, issues, recommendations);
    const robustness = this.analyzeRobustness(data, issues);
    const commensurability = this.analyzeCommensurability(data, issues, recommendations);
    
    // Generate benchmark comparisons
    const benchmarks = this.generateBenchmarkComparisons(data);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(issues, structure, methodology, robustness, commensurability);
    
    // Determine quality level
    const qualityLevel = this.determineQualityLevel(overallScore, issues);
    
    // Determine decision confidence
    const decisionConfidence = this.determineDecisionConfidence(robustness, methodology, commensurability);
    
    return {
      overall_quality: qualityLevel,
      overall_score: overallScore,
      issues,
      recommendations,
      detailed_analysis: {
        structure,
        methodology,
        robustness,
        commensurability
      },
      benchmark_comparisons: benchmarks,
      decision_confidence: decisionConfidence
    };
  }
  
  /**
   * Analyze structure against benchmarks
   */
  private analyzeStructure(data: ManuscriptData, issues: ValidationIssue[]): StructureAnalysis {
    
    const stats = this.knowledge.structure.criteria_distribution.statistics.total_criteria;
    
    // Check total criteria
    let criteriaStatus: 'WITHIN_RANGE' | 'TOO_FEW' | 'TOO_MANY' = 'WITHIN_RANGE';
    
    if (data.total_criteria < 4) {
      criteriaStatus = 'TOO_FEW';
      issues.push({
        severity: 'MAJOR',
        category: 'STRUCTURE',
        message: `Total criteria (${data.total_criteria}) is very low`,
        evidence: `Typical range: ${stats.min}-${stats.max}, recommended: 10-20`,
        recommendation: 'Consider expanding the criteria structure to capture more aspects of the decision',
        source: 'Petrillo et al. (2023) - Analysis of 181 BOCR papers'
      });
    } else if (data.total_criteria < 8) {
      criteriaStatus = 'TOO_FEW';
      issues.push({
        severity: 'MINOR',
        category: 'STRUCTURE',
        message: `Total criteria (${data.total_criteria}) is on the lower end`,
        recommendation: 'Consider if all important aspects are captured',
        source: 'Knowledge base statistics'
      });
    } else if (data.total_criteria > 30) {
      criteriaStatus = 'TOO_MANY';
      issues.push({
        severity: 'MINOR',
        category: 'STRUCTURE',
        message: `Total criteria (${data.total_criteria}) is very high`,
        recommendation: 'Consider consolidating criteria to reduce complexity',
        source: 'Lee (2009) used 37 criteria - upper practical limit'
      });
    }
    
    // Calculate BOCR balance
    const total = data.bocr_distribution.B + data.bocr_distribution.O + 
                  data.bocr_distribution.C + data.bocr_distribution.R;
    
    const proportions = {
      B: data.bocr_distribution.B / total,
      O: data.bocr_distribution.O / total,
      C: data.bocr_distribution.C / total,
      R: data.bocr_distribution.R / total
    };
    
    // Calculate balance score (100 = perfectly balanced at 0.25 each)
    const idealProportion = 0.25;
    const deviations = Object.values(proportions).map(p => Math.abs(p - idealProportion));
    const avgDeviation = deviations.reduce((a, b) => a + b) / 4;
    const balanceScore = Math.max(0, 100 - (avgDeviation * 400)); // Scale to 0-100
    
    let balanceAssessment = '';
    if (balanceScore >= 80) {
      balanceAssessment = 'Well-balanced BOCR distribution';
    } else if (balanceScore >= 60) {
      balanceAssessment = 'Moderately balanced - some merits emphasized';
    } else {
      balanceAssessment = 'Unbalanced - significant emphasis on certain merits';
      issues.push({
        severity: 'INFO',
        category: 'STRUCTURE',
        message: 'BOCR distribution is unbalanced',
        evidence: `B:${Math.round(proportions.B*100)}% O:${Math.round(proportions.O*100)}% C:${Math.round(proportions.C*100)}% R:${Math.round(proportions.R*100)}%`,
        recommendation: 'Verify this reflects the actual decision context',
        source: 'Best practice'
      });
    }
    
    // Analyze dominant criteria
    let criteriaOver20 = 0;
    let criteriaOver50 = 0;
    const concerns: string[] = [];
    
    if (data.dominant_criteria) {
      for (const crit of data.dominant_criteria) {
        if (crit.global_priority > 0.20) criteriaOver20++;
        if (crit.global_priority > 0.50) {
          criteriaOver50++;
          concerns.push(`${crit.criterion_name} dominates ${Math.round(crit.global_priority*100)}% of ${crit.merit} merit`);
          issues.push({
            severity: 'MINOR',
            category: 'STRUCTURE',
            message: `Super-dominant criterion detected: ${crit.criterion_name}`,
            evidence: `Global priority: ${Math.round(crit.global_priority*100)}%`,
            recommendation: 'Verify this reflects reality and not bias or missing criteria',
            source: 'Lee (2009), Lee et al. (2009) - Dominant criteria analysis'
          });
        }
      }
    }
    
    return {
      total_criteria_assessment: {
        value: data.total_criteria,
        benchmark_min: stats.min,
        benchmark_max: stats.max,
        benchmark_mean: stats.mean,
        status: criteriaStatus
      },
      bocr_balance: {
        ...proportions,
        balance_score: balanceScore,
        assessment: balanceAssessment
      },
      dominant_criteria_analysis: {
        criteria_over_20pct: criteriaOver20,
        criteria_over_50pct: criteriaOver50,
        concerns
      }
    };
  }
  
  /**
   * Analyze methodology - CRITICAL SECTION
   */
  private analyzeMethodology(data: ManuscriptData, issues: ValidationIssue[], recommendations: string[]): MethodologyAnalysis {
    
    // 1. CRITICAL: Check synthesis method validity
    const methodValidity = this.validateSynthesisMethod(data, issues);
    
    // 2. CRITICAL: Check commensurability
    const commCheck = this.checkCommensurability(data, issues, recommendations);
    
    // 3. Check consistency ratios
    const consistencyCheck = {
      ratios_reported: data.consistency_ratios_reported,
      all_below_threshold: data.max_cr_value ? data.max_cr_value < 0.10 : false,
      max_cr: data.max_cr_value,
      threshold: 0.10
    };
    
    if (!data.consistency_ratios_reported) {
      issues.push({
        severity: 'MAJOR',
        category: 'CONSISTENCY',
        message: 'Consistency ratios (CR) not reported',
        recommendation: 'All pairwise comparison matrices should have CR < 0.10 and values should be reported',
        source: 'Saaty (1980), Demirtas & Ustun (2008)'
      });
    }
    
    if (data.max_cr_value && data.max_cr_value >= 0.10) {
      issues.push({
        severity: 'CRITICAL',
        category: 'CONSISTENCY',
        message: `Maximum CR (${data.max_cr_value.toFixed(3)}) exceeds threshold`,
        recommendation: 'Revise pairwise comparisons until all CR < 0.10',
        source: 'Saaty (1980) - Standard threshold'
      });
    }
    
    // 4. Check sample size
    const sampleAssessment = this.assessSampleSize(data, issues);
    
    return {
      synthesis_method_validity: methodValidity,
      commensurability_check: commCheck,
      consistency_check: consistencyCheck,
      sample_size_assessment: sampleAssessment
    };
  }
  
  /**
   * CRITICAL: Validate synthesis method
   */
  private validateSynthesisMethod(data: ManuscriptData, issues: ValidationIssue[]) {
    
    let isCorrect = false;
    const concerns: string[] = [];
    let recommendedMethod = '';
    
    switch (data.synthesis_method) {
      
      case 'multiplicative_traditional':
        isCorrect = false;
        concerns.push('Uses FLAWED formula: (B^wb * O^wo) / (C^wc * R^wr)');
        concerns.push('Weights as POWERS - causes incommensurability');
        concerns.push('Can suggest profitability when unprofitable');
        recommendedMethod = 'Use revised multiplicative: (sb*B + so*O) / (sc*C + sr*R)';
        
        issues.push({
          severity: 'CRITICAL',
          category: 'METHODOLOGY',
          message: '🚨 CRITICAL: Using INCORRECT multiplicative formula',
          evidence: 'Formula: (B^wb * O^wo) / (C^wc * R^wr) - weights as powers',
          recommendation: 'MUST use revised formula: (sb*B + so*O) / (sc*C + sr*R) with magnitude-based weights',
          source: 'Wijnmalen (2007) - Table 8: Multiplicative traditional shows correct_ordering=false, correct_profitability=false'
        });
        break;
      
      case 'additive_reciprocal':
        isCorrect = false;
        concerns.push('Uses reciprocals: wb*B + wo*O + wc*(1/C) + wr*(1/R)');
        concerns.push('Distorts scale (Millet & Schoner 2005)');
        concerns.push('Always positive - cannot detect unprofitability');
        concerns.push('Does NOT always produce correct ordering');
        recommendedMethod = 'Use additive subtraction: sb*B + so*O - sc*C - sr*R';
        
        issues.push({
          severity: 'CRITICAL',
          category: 'METHODOLOGY',
          message: '🚨 CRITICAL: Using reciprocals in additive formula',
          evidence: 'Formula includes (1/C) and (1/R) terms',
          recommendation: 'MUST use subtraction: sb*B + so*O - sc*C - sr*R',
          source: 'Wijnmalen (2007) - Table 8: Additive reciprocal shows correct_ordering=false, correct_profitability=false'
        });
        break;
      
      case 'multiplicative_revised':
        if (data.rescaling_weights) {
          isCorrect = true;
          recommendedMethod = 'Current method is correct';
        } else {
          isCorrect = false;
          concerns.push('Missing rescaling weights for commensurability');
          recommendedMethod = 'Add magnitude-based rescaling weights';
          
          issues.push({
            severity: 'CRITICAL',
            category: 'COMMENSURABILITY',
            message: 'Revised formula used but without rescaling weights',
            recommendation: 'Must include magnitude-based rescaling weights {sb, so, sc, sr}',
            source: 'Wijnmalen (2007) - Section 5'
          });
        }
        break;
      
      case 'additive_subtraction':
        if (data.rescaling_weights) {
          isCorrect = true;
          recommendedMethod = 'Current method is correct';
        } else {
          isCorrect = false;
          concerns.push('Missing rescaling weights for commensurability');
          recommendedMethod = 'Add magnitude-based rescaling weights';
          
          issues.push({
            severity: 'CRITICAL',
            category: 'COMMENSURABILITY',
            message: 'Subtraction formula used but without rescaling weights',
            recommendation: 'Must include magnitude-based rescaling weights {sb, so, sc, sr}',
            source: 'Wijnmalen (2007) - Section 5'
          });
        }
        break;
      
      case 'unknown':
        isCorrect = false;
        concerns.push('Synthesis method not clearly specified');
        recommendedMethod = 'Use (sb*B + so*O) / (sc*C + sr*R) OR sb*B + so*O - sc*C - sr*R';
        
        issues.push({
          severity: 'MAJOR',
          category: 'METHODOLOGY',
          message: 'Synthesis method not specified in manuscript',
          recommendation: 'Clearly state which formula is used for BOCR synthesis',
          source: 'Best practice'
        });
        break;
    }
    
    return {
      method_used: data.synthesis_method,
      is_correct: isCorrect,
      concerns,
      recommended_method: recommendedMethod
    };
  }
  
  /**
   * CRITICAL: Check commensurability
   */
  private checkCommensurability(data: ManuscriptData, issues: ValidationIssue[], recommendations: string[]) {
    
    let rescalingUsed = false;
    let rescalingType: 'magnitude_based' | 'personal_values' | 'unknown' | undefined;
    let isValid = false;
    let criticalWarning: string | undefined;
    
    if (data.rescaling_weights) {
      rescalingUsed = true;
      
      // Check if weights sum to 1.0 (magnitude-based)
      const sum = data.rescaling_weights.sb + data.rescaling_weights.so + 
                  data.rescaling_weights.sc + data.rescaling_weights.sr;
      
      if (Math.abs(sum - 1.0) < 0.01) {
        rescalingType = 'magnitude_based';
        isValid = true;
      } else {
        rescalingType = 'unknown';
        isValid = false;
        
        issues.push({
          severity: 'MAJOR',
          category: 'COMMENSURABILITY',
          message: 'Rescaling weights do not sum to 1.0',
          evidence: `Sum = ${sum.toFixed(3)}`,
          recommendation: 'Verify weights are calculated as: s_i = Factor_total / (B_total + O_total + C_total + R_total)',
          source: 'Wijnmalen (2007) - Formula 10'
        });
      }
    } else {
      rescalingUsed = false;
      isValid = false;
      
      criticalWarning = '🚨 COMMENSURABILITY NOT ENSURED - Results may be meaningless or deceiving';
      
      issues.push({
        severity: 'CRITICAL',
        category: 'COMMENSURABILITY',
        message: '🚨 CRITICAL: No rescaling weights used',
        evidence: 'Priorities from separate B, O, C, R hierarchies are NOT commensurate',
        recommendation: 'MUST use magnitude-based rescaling weights to make priorities commensurate',
        source: 'Wijnmalen (2007) - Section 4: "Synthesis requires commensurate priorities. The four factors must be somehow linked."'
      });
      
      recommendations.push(
        '🔴 CRITICAL FIX REQUIRED: Implement magnitude-based rescaling weights',
        '   Formula: sb = B_total / (B_total + O_total + C_total + R_total)',
        '   Similar for so, sc, sr',
        '   See: Wijnmalen (2007) Section 5, Wedley et al. (2001, 2003)'
      );
    }
    
    return {
      rescaling_used: rescalingUsed,
      rescaling_type: rescalingType,
      is_valid: isValid,
      critical_warning: criticalWarning
    };
  }
  
  /**
   * Assess sample size
   */
  private assessSampleSize(data: ManuscriptData, issues: ValidationIssue[]) {
    
    let isAdequate = true;
    let recommendation = '';
    
    if (data.n_experts < 3) {
      isAdequate = false;
      recommendation = 'Minimum 3 experts recommended';
      issues.push({
        severity: 'MAJOR',
        category: 'METHODOLOGY',
        message: `Sample size (${data.n_experts}) is too small`,
        recommendation: 'Use at least 3 experts for reliability',
        source: 'Best practice from literature review'
      });
    } else if (data.n_experts >= 3 && data.n_experts < 5) {
      recommendation = 'Acceptable, but 5-11 experts is optimal';
    } else if (data.n_experts >= 5 && data.n_experts <= 11) {
      recommendation = 'Optimal sample size';
    } else {
      recommendation = 'Large sample - ensure effective coordination';
    }
    
    return {
      n_experts: data.n_experts,
      is_adequate: isAdequate,
      recommendation
    };
  }
  
  /**
   * Analyze robustness
   */
  private analyzeRobustness(data: ManuscriptData, issues: ValidationIssue[]): RobustnessAnalysis {
    
    // Need scores of top 2 alternatives
    const rankings = data.final_ranking;
    
    if (rankings.length < 2) {
      return {
        first_place: rankings[0] || 'Unknown',
        second_place: 'N/A',
        score_difference: 0,
        percentage_difference: 0,
        robustness_level: 'VERY_WEAK',
        interpretation: 'Insufficient alternatives to assess robustness',
        recommendation: 'N/A'
      };
    }
    
    const first = rankings[0];
    const second = rankings[1];
    
    // Get scores
    const firstScores = data.alternative_scores[first];
    const secondScores = data.alternative_scores[second];
    
    if (!firstScores || !secondScores) {
      return {
        first_place: first,
        second_place: second,
        score_difference: 0,
        percentage_difference: 0,
        robustness_level: 'VERY_WEAK',
        interpretation: 'Score data not available',
        recommendation: 'Provide complete score data for robustness analysis'
      };
    }
    
    // Calculate overall scores using BOCR weights
    const firstScore = 
      data.bocr_weights.B * firstScores.B +
      data.bocr_weights.O * firstScores.O +
      data.bocr_weights.C * firstScores.C +
      data.bocr_weights.R * firstScores.R;
    
    const secondScore =
      data.bocr_weights.B * secondScores.B +
      data.bocr_weights.O * secondScores.O +
      data.bocr_weights.C * secondScores.C +
      data.bocr_weights.R * secondScores.R;
    
    const absDiff = Math.abs(firstScore - secondScore);
    const pctDiff = (absDiff / firstScore) * 100;
    
    // Determine robustness level
    let level: RobustnessAnalysis['robustness_level'];
    let interpretation: string;
    let recommendation: string;
    
    if (pctDiff >= 10) {
      level = 'VERY_ROBUST';
      interpretation = 'Clear winner - high confidence in decision';
      recommendation = 'Decision is stable and reliable';
    } else if (pctDiff >= 5) {
      level = 'ROBUST';
      interpretation = 'Good separation - acceptable confidence';
      recommendation = 'Decision is reasonably stable';
    } else if (pctDiff >= 2) {
      level = 'MODERATE';
      interpretation = 'Close decision - moderate confidence';
      recommendation = 'Consider sensitivity analysis on top criteria';
      issues.push({
        severity: 'MINOR',
        category: 'ROBUSTNESS',
        message: `Moderate robustness (${pctDiff.toFixed(2)}% difference)`,
        recommendation: 'Perform sensitivity analysis on critical criteria',
        source: 'Lee (2009) - 1.5%, Lee et al. (2009) - 2.3%'
      });
    } else if (pctDiff >= 0.5) {
      level = 'WEAK';
      interpretation = 'Very close - low confidence';
      recommendation = 'Review criteria weights, consider alternatives improvement';
      issues.push({
        severity: 'MAJOR',
        category: 'ROBUSTNESS',
        message: `Weak robustness (${pctDiff.toFixed(2)}% difference)`,
        recommendation: 'Decision may be unstable - extensive sensitivity analysis needed',
        source: 'Empirical benchmarks'
      });
    } else {
      level = 'VERY_WEAK';
      interpretation = 'Marginal difference - unreliable';
      recommendation = 'Decision unstable - may reverse with slight changes';
      issues.push({
        severity: 'MAJOR',
        category: 'ROBUSTNESS',
        message: `Very weak robustness (${pctDiff.toFixed(2)}% difference)`,
        recommendation: 'Decision is unreliable - reconsider criteria, weights, or collect more data',
        source: 'Empirical benchmarks'
      });
    }
    
    return {
      first_place: first,
      second_place: second,
      score_difference: absDiff,
      percentage_difference: pctDiff,
      robustness_level: level,
      interpretation,
      recommendation
    };
  }
  
  /**
   * Comprehensive commensurability analysis
   */
  private analyzeCommensurability(data: ManuscriptData, issues: ValidationIssue[], recommendations: string[]): CommensurabilityAnalysis {
    
    let issueDetected = false;
    let severity: 'CRITICAL' | 'MAJOR' | 'NONE' = 'NONE';
    let explanation = '';
    const evidence: string[] = [];
    let solutionApplied = false;
    let solutionType: string | undefined;
    
    // Check if rescaling is used
    if (!data.rescaling_weights) {
      issueDetected = true;
      severity = 'CRITICAL';
      
      explanation = `Priorities from separate B, O, C, R hierarchies are NOT commensurate. ` +
                    `Each hierarchy normalizes to sum=1.0, but represents DIFFERENT absolute magnitudes. ` +
                    `Synthesizing incommensurate priorities produces meaningless results.`;
      
      evidence.push(
        'Example: If Total Benefits = $4000 and Total Costs = $8000',
        'Both normalize to 1.0, but $1 of benefit ≠ $1 of cost!',
        'Synthesis without rescaling is like adding apples to oranges',
        'Results may suggest profitability when actually unprofitable'
      );
      
      solutionApplied = false;
      
    } else {
      // Rescaling weights provided
      solutionApplied = true;
      solutionType = 'Magnitude-based rescaling weights';
      
      // Verify they sum to 1.0
      const sum = data.rescaling_weights.sb + data.rescaling_weights.so +
                  data.rescaling_weights.sc + data.rescaling_weights.sr;
      
      if (Math.abs(sum - 1.0) > 0.01) {
        issueDetected = true;
        severity = 'MAJOR';
        explanation = 'Rescaling weights provided but do not sum to 1.0 - may not be magnitude-based';
        evidence.push(`Sum of weights = ${sum.toFixed(3)} (should be 1.0)`);
      } else {
        explanation = 'Commensurability ensured through magnitude-based rescaling weights';
        evidence.push('Weights sum to 1.0 - likely magnitude-based');
        evidence.push('Priorities are now on common scale');
      }
    }
    
    return {
      issue_detected: issueDetected,
      severity,
      explanation,
      evidence,
      solution_applied: solutionApplied,
      solution_type: solutionType,
      validation_possible: false  // Would need monetary values
    };
  }
  
  /**
   * Generate benchmark comparisons
   */
  private generateBenchmarkComparisons(data: ManuscriptData): BenchmarkComparison[] {
    
    const comparisons: BenchmarkComparison[] = [];
    
    // 1. Total criteria
    comparisons.push({
      metric: 'Total Criteria',
      manuscript_value: data.total_criteria,
      benchmark_value: `Mean: 16.75`,
      benchmark_range: { min: 4, max: 37 },
      comparison: data.total_criteria >= 10 && data.total_criteria <= 20 ? 'WITHIN' : 'N/A',
      interpretation: data.total_criteria >= 10 && data.total_criteria <= 20 
        ? 'Within recommended range'
        : data.total_criteria < 10 
          ? 'Below typical range'
          : 'Above typical range'
    });
    
    // 2. Sample size
    comparisons.push({
      metric: 'Number of Experts',
      manuscript_value: data.n_experts,
      benchmark_value: 'Optimal: 5-11',
      benchmark_range: { min: 5, max: 11 },
      comparison: data.n_experts >= 5 && data.n_experts <= 11 ? 'WITHIN' : 'N/A',
      interpretation: data.n_experts >= 5 && data.n_experts <= 11
        ? 'Optimal sample size'
        : data.n_experts < 5
          ? 'Small sample - acceptable but not optimal'
          : 'Large sample'
    });
    
    // 3. Consistency ratio (if available)
    if (data.max_cr_value !== undefined) {
      comparisons.push({
        metric: 'Maximum CR',
        manuscript_value: data.max_cr_value,
        benchmark_value: '< 0.10',
        comparison: data.max_cr_value < 0.10 ? 'BETTER' : 'WORSE',
        interpretation: data.max_cr_value < 0.10
          ? 'Acceptable consistency'
          : 'Exceeds threshold - revisions needed'
      });
    }
    
    return comparisons;
  }
  
  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(
    issues: ValidationIssue[],
    structure: StructureAnalysis,
    methodology: MethodologyAnalysis,
    robustness: RobustnessAnalysis,
    commensurability: CommensurabilityAnalysis
  ): number {
    
    let score = 100;
    
    // Deduct for issues - but differentiate by category
    for (const issue of issues) {
      if (issue.severity === 'CRITICAL') {
        // Critical methodological issues are worse than critical robustness
        if (issue.category === 'METHODOLOGY' || issue.category === 'COMMENSURABILITY') {
          score -= 30;
        } else if (issue.category === 'ROBUSTNESS') {
          score -= 10;  // Robustness issues less severe
        } else {
          score -= 25;
        }
      }
      else if (issue.severity === 'MAJOR') {
        if (issue.category === 'ROBUSTNESS') {
          score -= 5;  // Minor penalty for robustness
        } else {
          score -= 10;
        }
      }
      else if (issue.severity === 'MINOR') score -= 3;
    }
    
    // Bonus for good structure
    if (structure.bocr_balance.balance_score >= 80) score += 5;
    
    // Bonus for correct methodology (IMPORTANT!)
    if (methodology.synthesis_method_validity.is_correct && 
        methodology.commensurability_check.is_valid) {
      score += 15;
    }
    
    // Bonus for high robustness
    if (robustness.robustness_level === 'VERY_ROBUST') score += 10;
    else if (robustness.robustness_level === 'ROBUST') score += 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Determine quality level
   */
  private determineQualityLevel(score: number, issues: ValidationIssue[]): ValidationResult['overall_quality'] {
    
    // Count issues by severity
    const hasCritical = issues.some(i => i.severity === 'CRITICAL' && i.category !== 'ROBUSTNESS');
    const hasMajor = issues.some(i => i.severity === 'MAJOR');
    
    // CRITICAL_FLAWS only for methodological problems, not robustness
    if (hasCritical) return 'CRITICAL_FLAWS';
    
    // Score-based quality
    if (score >= 85 && !hasMajor) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'ACCEPTABLE';
    return 'POOR';
  }
  
  /**
   * Determine decision confidence
   */
  private determineDecisionConfidence(
    robustness: RobustnessAnalysis,
    methodology: MethodologyAnalysis,
    commensurability: CommensurabilityAnalysis
  ): ValidationResult['decision_confidence'] {
    
    // Critical methodological flaws = very low confidence
    if (!methodology.synthesis_method_validity.is_correct ||
        commensurability.severity === 'CRITICAL') {
      return 'VERY_LOW';
    }
    
    // Good methodology but check robustness
    if (methodology.synthesis_method_validity.is_correct && 
        methodology.commensurability_check.is_valid) {
      
      // Based on robustness with good methodology
      if (robustness.robustness_level === 'VERY_ROBUST') return 'VERY_HIGH';
      if (robustness.robustness_level === 'ROBUST') return 'HIGH';
      if (robustness.robustness_level === 'MODERATE') return 'MODERATE';
      if (robustness.robustness_level === 'WEAK') return 'MODERATE';  // Still moderate with good method
      return 'LOW';  // Very weak robustness even with good method
    }
    
    // Has issues but not critical
    if (robustness.robustness_level === 'VERY_ROBUST' || 
        robustness.robustness_level === 'ROBUST') return 'MODERATE';
    
    return 'LOW';
  }
  
  /**
   * Generate formatted report
   */
  generateReport(result: ValidationResult): string {
    
    let report = '';
    
    report += '═══════════════════════════════════════════════════════════════\n';
    report += '  AHP-BOCR MANUSCRIPT PEER REVIEW REPORT v6.5.0\n';
    report += '═══════════════════════════════════════════════════════════════\n\n';
    
    // Overall assessment
    report += `📊 OVERALL QUALITY: ${result.overall_quality}\n`;
    report += `🎯 OVERALL SCORE: ${result.overall_score}/100\n`;
    report += `🔒 DECISION CONFIDENCE: ${result.decision_confidence}\n\n`;
    
    // Critical issues first
    const critical = result.issues.filter(i => i.severity === 'CRITICAL');
    if (critical.length > 0) {
      report += '🚨 CRITICAL ISSUES (Must be addressed):\n';
      report += '─────────────────────────────────────────────────────────────\n';
      for (const issue of critical) {
        report += `\n❌ ${issue.message}\n`;
        if (issue.evidence) report += `   Evidence: ${issue.evidence}\n`;
        report += `   ✅ Recommendation: ${issue.recommendation}\n`;
        report += `   📚 Source: ${issue.source}\n`;
      }
      report += '\n';
    }
    
    // Major issues
    const major = result.issues.filter(i => i.severity === 'MAJOR');
    if (major.length > 0) {
      report += '⚠️  MAJOR ISSUES (Should be addressed):\n';
      report += '─────────────────────────────────────────────────────────────\n';
      for (const issue of major) {
        report += `\n• ${issue.message}\n`;
        report += `  Recommendation: ${issue.recommendation}\n`;
      }
      report += '\n';
    }
    
    // Minor issues
    const minor = result.issues.filter(i => i.severity === 'MINOR');
    if (minor.length > 0) {
      report += 'ℹ️  MINOR ISSUES (Consider addressing):\n';
      report += '─────────────────────────────────────────────────────────────\n';
      for (const issue of minor) {
        report += `• ${issue.message}\n`;
      }
      report += '\n';
    }
    
    // Detailed analysis
    report += '📈 DETAILED ANALYSIS:\n';
    report += '─────────────────────────────────────────────────────────────\n\n';
    
    // Structure
    report += `Structure:\n`;
    report += `  • Total Criteria: ${result.detailed_analysis.structure.total_criteria_assessment.value} `;
    report += `(Benchmark: ${result.detailed_analysis.structure.total_criteria_assessment.benchmark_min}-${result.detailed_analysis.structure.total_criteria_assessment.benchmark_max})\n`;
    report += `  • BOCR Balance Score: ${result.detailed_analysis.structure.bocr_balance.balance_score.toFixed(1)}/100\n`;
    report += `  • Assessment: ${result.detailed_analysis.structure.bocr_balance.assessment}\n\n`;
    
    // Methodology
    report += `Methodology:\n`;
    report += `  • Synthesis Method: ${result.detailed_analysis.methodology.synthesis_method_validity.method_used}\n`;
    report += `  • Method Valid: ${result.detailed_analysis.methodology.synthesis_method_validity.is_correct ? '✅ YES' : '❌ NO'}\n`;
    report += `  • Commensurability: ${result.detailed_analysis.methodology.commensurability_check.is_valid ? '✅ Ensured' : '❌ NOT ensured'}\n`;
    report += `  • Consistency Reported: ${result.detailed_analysis.methodology.consistency_check.ratios_reported ? '✅ YES' : '❌ NO'}\n\n`;
    
    // Robustness
    report += `Robustness:\n`;
    report += `  • Winner: ${result.detailed_analysis.robustness.first_place}\n`;
    report += `  • Gap to 2nd place: ${result.detailed_analysis.robustness.percentage_difference.toFixed(2)}%\n`;
    report += `  • Level: ${result.detailed_analysis.robustness.robustness_level}\n`;
    report += `  • ${result.detailed_analysis.robustness.interpretation}\n\n`;
    
    // Commensurability
    if (result.detailed_analysis.commensurability.issue_detected) {
      report += `Commensurability:\n`;
      report += `  • Issue: ${result.detailed_analysis.commensurability.severity}\n`;
      report += `  • ${result.detailed_analysis.commensurability.explanation}\n\n`;
    }
    
    // Recommendations
    if (result.recommendations.length > 0) {
      report += '💡 KEY RECOMMENDATIONS:\n';
      report += '─────────────────────────────────────────────────────────────\n';
      for (const rec of result.recommendations) {
        report += `${rec}\n`;
      }
      report += '\n';
    }
    
    // Benchmark comparisons
    report += '📊 BENCHMARK COMPARISONS:\n';
    report += '─────────────────────────────────────────────────────────────\n';
    for (const bm of result.benchmark_comparisons) {
      report += `${bm.metric}: ${bm.manuscript_value} `;
      if (bm.benchmark_range) {
        report += `(Benchmark: ${bm.benchmark_range.min}-${bm.benchmark_range.max}) `;
      } else {
        report += `(Benchmark: ${bm.benchmark_value}) `;
      }
      report += `- ${bm.interpretation}\n`;
    }
    
    report += '\n═══════════════════════════════════════════════════════════════\n';
    report += `Generated by AHP-BOCR Peer Review API v6.5.0\n`;
    report += `Based on 5 papers, 961 citations\n`;
    report += `Key source: Wijnmalen (2007) - Critical validation study\n`;
    report += '═══════════════════════════════════════════════════════════════\n';
    
    return report;
  }
}

/**
 * ==========================================================================
 * EXAMPLE USAGE
 * ==========================================================================
 */

async function main() {
  
  const api = new BOCRPeerReviewAPI();
  
  // Example manuscript data
  const manuscriptData: ManuscriptData = {
    title: "Wind Farm Selection Using AHP-BOCR",
    authors: ["Lee et al."],
    application_area: "Energy - Wind farms",
    
    total_criteria: 12,
    bocr_distribution: { B: 3, O: 3, C: 3, R: 3 },
    
    n_experts: 11,
    expert_composition: ["Power entrepreneurs", "Scholars", "Government officers"],
    aggregation_method: "Geometric mean",
    
    bocr_weights: { B: 0.333, O: 0.217, C: 0.253, R: 0.198 },
    
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
  
  console.log('Analyzing manuscript...\n');
  
  const result = await api.analyzeManuscript(manuscriptData);
  
  const report = api.generateReport(result);
  console.log(report);
  
  // Also output JSON for programmatic use
  console.log('\n\n📄 JSON OUTPUT:\n');
  console.log(JSON.stringify(result, null, 2));
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch(console.error);
}

export { BOCRPeerReviewAPI };
export type { ManuscriptData, ValidationResult };
