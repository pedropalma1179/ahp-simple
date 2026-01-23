// ============================================================
// COMPONENTE: QUALIDADE DA DECISÃO (ALTA PRIORIDADE A1/Q1)
// ============================================================
// 
// Este componente adiciona análises críticas baseadas em:
// - Wijnmalen (2007) - Robustez e BOCR ratios
// - Triantaphyllou & Sánchez (1997) - Diferença entre alternativas
// - Lee (2009) - Análise de subcritérios
// - Petrillo et al. (2023) - Benchmarks para MCDM
//
// Integração: Adicionar como nova TAB na página de resultados
// ============================================================

import React from 'react';

interface QualityAnalysisProps {
  results: any; // Mesmo objeto que já vem do cálculo AHP
  responseCount: number;
}

export default function QualityAnalysis({ results, responseCount }: QualityAnalysisProps) {
  
  // ============================================================
  // 1️⃣ ROBUSTEZ DA DECISÃO
  // ============================================================
  
  const calculateRobustness = () => {
    const rankings = results.finalScores
      .map((alt: any) => ({
        code: alt.code,
        name: alt.name,
        score: alt.scoreAdditive || alt.scoreProbabilistic || 0
      }))
      .sort((a: any, b: any) => b.score - a.score);
    
    const winner = rankings[0];
    const second = rankings[1];
    
    if (!winner || !second) return null;
    
    const diff = winner.score - second.score;
    const diffPercent = (diff / winner.score) * 100;
    
    let classification = '';
    let color = '';
    let icon = '';
    
    if (diffPercent < 2) {
      classification = 'Empate Técnico';
      color = 'red';
      icon = '⚠️';
    } else if (diffPercent < 5) {
      classification = 'Vantagem Marginal';
      color = 'orange';
      icon = '⚠️';
    } else if (diffPercent < 10) {
      classification = 'Vantagem Moderada';
      color = 'yellow';
      icon = '✓';
    } else if (diffPercent < 20) {
      classification = 'Vantagem Expressiva';
      color = 'green';
      icon = '✓';
    } else {
      classification = 'Dominância Clara';
      color = 'darkgreen';
      icon = '✓✓';
    }
    
    return {
      winner,
      second,
      diff: diff.toFixed(4),
      diffPercent: diffPercent.toFixed(2),
      classification,
      color,
      icon
    };
  };
  
  const calculateStabilityZone = () => {
    const inflections = results.sensitivityInflections || {};
    const merits = ['B', 'O', 'C', 'R'];
    const meritNames = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
    
    const zones = merits.map((merit, idx) => {
      const inflection = inflections[merit];
      
      let classification = '';
      let color = '';
      let status = '';
      
      if (inflection === null || inflection === undefined) {
        classification = 'Muito Robusto';
        color = 'darkgreen';
        status = '✓✓';
      } else if (inflection < 10) {
        classification = 'Sensível';
        color = 'red';
        status = '⚠️';
      } else if (inflection < 20) {
        classification = 'Moderadamente Robusto';
        color = 'yellow';
        status = '✓';
      } else {
        classification = 'Robusto';
        color = 'green';
        status = '✓';
      }
      
      return {
        merit: meritNames[idx],
        code: merit,
        inflection: inflection !== null && inflection !== undefined ? `±${inflection.toFixed(1)}%` : '> ±20%',
        classification,
        color,
        status
      };
    });
    
    // Classificação geral
    const criticalCount = zones.filter(z => z.classification === 'Sensível').length;
    const moderateCount = zones.filter(z => z.classification === 'Moderadamente Robusto').length;
    
    let overallClassification = '';
    if (criticalCount >= 2) {
      overallClassification = 'Sensível - Requer atenção';
    } else if (criticalCount === 1) {
      overallClassification = 'Moderadamente Robusto';
    } else if (moderateCount >= 2) {
      overallClassification = 'Robusto';
    } else {
      overallClassification = 'Muito Robusto';
    }
    
    return { zones, overallClassification };
  };
  
  // ============================================================
  // 2️⃣ ANÁLISE DE SUBCRITÉRIOS
  // ============================================================
  
  const analyzeSubcriteria = () => {
    const subWeights = results.subWeights || {};
    const merits = ['B', 'O', 'C', 'R'];
    const meritNames = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
    
    const analysis = merits.map((merit, idx) => {
      const weights = subWeights[merit] || [];
      if (weights.length === 0) return null;
      
      const max = Math.max(...weights);
      const min = Math.min(...weights);
      const ratio = max / min;
      
      // Dominância (subcritério com peso > 40%)
      const dominant = weights.findIndex((w: number) => w > 0.40);
      const hasDominance = dominant !== -1;
      
      // Subcritério irrelevante (peso < 5%)
      const irrelevant = weights.findIndex((w: number) => w < 0.05);
      const hasIrrelevant = irrelevant !== -1;
      
      // Classificação de distribuição
      let distribution = '';
      let distColor = '';
      
      if (ratio < 3) {
        distribution = 'Muito Equilibrada';
        distColor = 'darkgreen';
      } else if (ratio < 5) {
        distribution = 'Equilibrada';
        distColor = 'green';
      } else if (ratio < 9) {
        distribution = 'Moderadamente Desigual';
        distColor = 'yellow';
      } else if (ratio < 20) {
        distribution = 'Desigual';
        distColor = 'orange';
      } else {
        distribution = 'Muito Desigual';
        distColor = 'red';
      }
      
      return {
        merit: meritNames[idx],
        code: merit,
        weights,
        max: (max * 100).toFixed(1),
        min: (min * 100).toFixed(1),
        ratio: ratio.toFixed(2),
        distribution,
        distColor,
        hasDominance,
        dominantIndex: dominant,
        hasIrrelevant,
        irrelevantIndex: irrelevant
      };
    }).filter(Boolean);
    
    return analysis;
  };
  
  // ============================================================
  // 3️⃣ RATIOS BOCR (Perfil de Decisão)
  // ============================================================
  
  const calculateBOCRRatios = () => {
    const weights = results.bocrWeights || [0.25, 0.25, 0.25, 0.25];
    const [B, O, C, R] = weights;
    
    const positive = B + O;
    const negative = C + R;
    const ratio = positive / negative;
    
    let profile = '';
    let profileColor = '';
    let icon = '';
    
    if (ratio < 0.8) {
      profile = 'Muito Conservador';
      profileColor = 'blue';
      icon = '🛡️';
    } else if (ratio < 1.0) {
      profile = 'Conservador';
      profileColor = 'lightblue';
      icon = '🛡️';
    } else if (ratio >= 1.0 && ratio < 1.5) {
      profile = 'Equilibrado';
      profileColor = 'green';
      icon = '⚖️';
    } else if (ratio >= 1.5 && ratio < 2.0) {
      profile = 'Inovador';
      profileColor = 'orange';
      icon = '🚀';
    } else {
      profile = 'Muito Agressivo';
      profileColor = 'red';
      icon = '🚀';
    }
    
    // Trade-offs principais
    const tradeoffs = [
      { name: 'B vs C', value: B - C, label: 'Benefícios vs Custos' },
      { name: 'B vs R', value: B - R, label: 'Benefícios vs Riscos' },
      { name: 'O vs C', value: O - C, label: 'Oportunidades vs Custos' },
      { name: 'O vs R', value: O - R, label: 'Oportunidades vs Riscos' }
    ];
    
    const dominantTradeoff = tradeoffs.reduce((max, t) => 
      Math.abs(t.value) > Math.abs(max.value) ? t : max
    );
    
    return {
      B: (B * 100).toFixed(1),
      O: (O * 100).toFixed(1),
      C: (C * 100).toFixed(1),
      R: (R * 100).toFixed(1),
      positive: (positive * 100).toFixed(1),
      negative: (negative * 100).toFixed(1),
      ratio: ratio.toFixed(2),
      profile,
      profileColor,
      icon,
      dominantTradeoff
    };
  };
  
  // ============================================================
  // 4️⃣ CONVERGÊNCIA ENTRE MÉTODOS
  // Baseado em: Petrillo et al. (2023), Wijnmalen (2007)
  // ============================================================
  
  const analyzeMethodConvergence = () => {
    if (!results.finalScores || results.finalScores.length === 0) {
      return { error: true, message: 'Scores não disponíveis' };
    }
    
    // Métodos disponíveis
    const methods = [
      { name: 'Aditivo', field: 'scoreAdditive' },
      { name: 'Probabilístico', field: 'scoreProbabilistic' },
      { name: 'Subtrativo', field: 'scoreSubtractive' },
      { name: 'Multiplicativo', field: 'scoreMultiplicative' },
      { name: 'Multiplicativo de Potências', field: 'scoreMultiplicativePower' }
    ];
    
    // Identificar vencedor de cada método
    const winners = methods.map(method => {
      const scores = results.finalScores.map((alt: any) => ({
        name: alt.name,
        code: alt.code,
        score: alt[method.field] || 0
      })).sort((a: any, b: any) => b.score - a.score);
      
      return {
        method: method.name,
        winner: scores[0]?.name || 'N/A',
        winnerScore: scores[0]?.score || 0,
        available: scores[0]?.score > 0
      };
    });
    
    // Filtrar apenas métodos disponíveis
    const availableWinners = winners.filter(w => w.available);
    
    if (availableWinners.length === 0) {
      return { error: true, message: 'Nenhum método calculado' };
    }
    
    // Contar concordância
    const winnerCounts: Record<string, number> = {};
    availableWinners.forEach(w => {
      winnerCounts[w.winner] = (winnerCounts[w.winner] || 0) + 1;
    });
    
    const mostCommon = Object.entries(winnerCounts).reduce((max, curr) => 
      curr[1] > max[1] ? curr : max
    );
    
    const consensusWinner = mostCommon[0];
    const concordanceCount = mostCommon[1];
    const totalMethods = availableWinners.length;
    const concordancePercent = (concordanceCount / totalMethods) * 100;
    
    // Classificar convergência
    let convergenceStatus = '';
    let convergenceColor = '';
    let convergenceIcon = '';
    
    if (concordanceCount === totalMethods) {
      convergenceStatus = 'Convergência Perfeita';
      convergenceColor = '#10B981'; // green
      convergenceIcon = '🏆';
    } else if (concordanceCount >= totalMethods * 0.8) {
      convergenceStatus = 'Convergência Alta';
      convergenceColor = '#3B82F6'; // blue
      convergenceIcon = '✅';
    } else if (concordanceCount >= totalMethods * 0.6) {
      convergenceStatus = 'Convergência Parcial';
      convergenceColor = '#F59E0B'; // orange
      convergenceIcon = '⚠️';
    } else {
      convergenceStatus = 'Divergência Metodológica';
      convergenceColor = '#EF4444'; // red
      convergenceIcon = '❌';
    }
    
    // Identificar métodos divergentes
    const divergentMethods = availableWinners.filter(w => w.winner !== consensusWinner);
    
    return {
      consensusWinner,
      concordanceCount,
      totalMethods,
      concordancePercent: concordancePercent.toFixed(1),
      convergenceStatus,
      convergenceColor,
      convergenceIcon,
      winners: availableWinners,
      divergentMethods,
      winnerCounts
    };
  };
  
  // ============================================================
  // 5️⃣ VALIDAÇÃO DO TAMANHO DA AMOSTRA
  // Baseado em: Forman & Peniwati (1998), literatura MCDM
  // ============================================================
  
  const validateSampleSize = () => {
    const n = responseCount;
    
    // Classificação por tamanho
    let sizeStatus = '';
    let sizeColor = '';
    let sizeIcon = '';
    let sizeDesc = '';
    
    if (n < 7) {
      sizeStatus = 'Insuficiente';
      sizeColor = '#EF4444'; // red
      sizeIcon = '❌';
      sizeDesc = 'Amostra abaixo do mínimo recomendado. Resultados podem não ser confiáveis.';
    } else if (n < 15) {
      sizeStatus = 'Mínimo Aceitável';
      sizeColor = '#F59E0B'; // orange
      sizeIcon = '⚠️';
      sizeDesc = 'Amostra atende ao mínimo, mas considere expandir para maior robustez.';
    } else if (n < 30) {
      sizeStatus = 'Adequado';
      sizeColor = '#3B82F6'; // blue
      sizeIcon = '✓';
      sizeDesc = 'Amostra adequada para análise AHP-BOCR. Resultados confiáveis.';
    } else {
      sizeStatus = 'Robusto';
      sizeColor = '#10B981'; // green
      sizeIcon = '✅';
      sizeDesc = 'Amostra robusta. Alta confiabilidade estatística dos resultados.';
    }
    
    // Calcular poder estatístico aproximado
    // Baseado em regra geral: poder ≈ 1 - (1/√n)
    const statisticalPower = n >= 7 ? (1 - (1 / Math.sqrt(n))) * 100 : 0;
    
    return {
      n,
      sizeStatus,
      sizeColor,
      sizeIcon,
      sizeDesc,
      statisticalPower: statisticalPower.toFixed(1),
      benchmarks: {
        minimum: 7,
        adequate: 15,
        robust: 30
      }
    };
  };
  
  // ============================================================
  // 6️⃣ CONSISTÊNCIA DETALHADA (CI por Subcritério)
  // Baseado em: Saaty (1980, 2008), Alonso & Lamata (2006)
  // ============================================================
  
  const analyzeDetailedConsistency = () => {
    const subConsistency = results.subConsistency || {};
    const bocrConsistency = results.bocrConsistency || {};
    
    const merits = ['B', 'O', 'C', 'R'];
    const meritNames = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
    
    // Analisar BOCR
    const bocrCI = bocrConsistency.ci || 0;
    const bocrCR = bocrConsistency.cr || 0;
    
    let bocrMagnitude = '';
    let bocrColor = '';
    
    if (bocrCR < 0.03) {
      bocrMagnitude = 'Excelente';
      bocrColor = '#10B981';
    } else if (bocrCR < 0.07) {
      bocrMagnitude = 'Boa';
      bocrColor = '#3B82F6';
    } else if (bocrCR < 0.10) {
      bocrMagnitude = 'Aceitável';
      bocrColor = '#F59E0B';
    } else {
      bocrMagnitude = 'Inconsistente';
      bocrColor = '#EF4444';
    }
    
    // Analisar Subcritérios
    const subAnalysis = merits.map((merit, idx) => {
      const cons = subConsistency[merit];
      
      if (!cons) {
        return {
          merit: meritNames[idx],
          code: merit,
          error: true
        };
      }
      
      const ci = cons.ci || 0;
      const cr = cons.cr || 0;
      const lambda = cons.lambda || 0;
      
      let magnitude = '';
      let color = '';
      let status = '';
      
      if (cr < 0.03) {
        magnitude = 'Excelente';
        color = '#10B981';
        status = '✅';
      } else if (cr < 0.07) {
        magnitude = 'Boa';
        color = '#3B82F6';
        status = '✓';
      } else if (cr < 0.10) {
        magnitude = 'Aceitável';
        color = '#F59E0B';
        status = '⚠️';
      } else {
        magnitude = 'Inconsistente';
        color = '#EF4444';
        status = '❌';
      }
      
      return {
        merit: meritNames[idx],
        code: merit,
        ci: (ci * 100).toFixed(2),
        cr: (cr * 100).toFixed(2),
        lambda: lambda.toFixed(4),
        magnitude,
        color,
        status,
        error: false
      };
    }).filter(item => !item.error);
    
    // Estatísticas gerais
    const validSubCRs = subAnalysis.map(s => parseFloat(s.cr)).filter(cr => !isNaN(cr));
    const avgCR = validSubCRs.length > 0 
      ? (validSubCRs.reduce((sum, cr) => sum + cr, 0) / validSubCRs.length).toFixed(2)
      : '0.00';
    
    const inconsistentCount = subAnalysis.filter(s => parseFloat(s.cr) > 10).length;
    const excellentCount = subAnalysis.filter(s => parseFloat(s.cr) < 3).length;
    
    return {
      bocr: {
        ci: (bocrCI * 100).toFixed(2),
        cr: (bocrCR * 100).toFixed(2),
        lambda: bocrConsistency.lambda?.toFixed(4) || '0',
        magnitude: bocrMagnitude,
        color: bocrColor
      },
      subcriteria: subAnalysis,
      summary: {
        avgCR,
        inconsistentCount,
        excellentCount,
        totalAnalyzed: subAnalysis.length
      }
    };
  };
  
  // Calcular análises
  const robustness = calculateRobustness();
  const stabilityZone = calculateStabilityZone();
  const subcriteria = analyzeSubcriteria();
  const bocrRatios = calculateBOCRRatios();
  const methodConvergence = analyzeMethodConvergence();  // ← NOVO
  const sampleValidation = validateSampleSize();         // ← NOVO
  const detailedConsistency = analyzeDetailedConsistency(); // ← NOVO
  
  if (!robustness || !bocrRatios) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          ⚠️ Dados insuficientes para análise de qualidade. 
          Certifique-se de que há pelo menos 2 alternativas e cálculos completos.
        </p>
      </div>
    );
  }
  
  // ============================================================
  // RENDERIZAÇÃO
  // ============================================================
  
  return (
    <div className="space-y-6">
      
      {/* TÍTULO DA SEÇÃO */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-2">🎯 Qualidade da Decisão</h2>
        <p className="text-indigo-100">
          Análises críticas baseadas em benchmarks da literatura científica 
          (Wijnmalen 2007, Triantaphyllou & Sánchez 1997, Lee 2009, Petrillo et al. 2023)
        </p>
      </div>
      
      {/* ============================================================
          1️⃣ ROBUSTEZ DA DECISÃO
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🎯</span>
          <span>Robustez da Decisão</span>
        </h3>
        
        {/* Diferença 1º vs 2º */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🥇</span>
              <div>
                <p className="text-sm text-gray-600">1º Lugar</p>
                <p className="text-lg font-bold text-green-700">{robustness.winner.name}</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {robustness.winner.score.toFixed(4)}
            </p>
          </div>
          
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🥈</span>
              <div>
                <p className="text-sm text-gray-600">2º Lugar</p>
                <p className="text-lg font-bold text-gray-700">{robustness.second.name}</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-600">
              {robustness.second.score.toFixed(4)}
            </p>
          </div>
        </div>
        
        {/* Classificação da Diferença */}
        <div 
          className={`rounded-lg p-6 border-2`}
          style={{ 
            backgroundColor: `${robustness.color}15`,
            borderColor: robustness.color
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Diferença entre 1º e 2º lugar</p>
              <p className="text-4xl font-bold" style={{ color: robustness.color }}>
                {robustness.diffPercent}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-6xl mb-2">{robustness.icon}</p>
              <p className="text-lg font-bold" style={{ color: robustness.color }}>
                {robustness.classification}
              </p>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-50 rounded p-3 text-sm">
            <p className="font-semibold mb-2">📊 Interpretação (Triantaphyllou & Sánchez 1997):</p>
            <ul className="space-y-1 text-gray-700">
              <li>• &lt; 2%: Empate técnico - decisão muito sensível</li>
              <li>• 2-5%: Vantagem marginal - requer análise qualitativa</li>
              <li>• 5-10%: Vantagem moderada - decisão razoavelmente clara</li>
              <li>• 10-20%: Vantagem expressiva - decisão clara</li>
              <li>• &gt; 20%: Dominância - decisão muito clara</li>
            </ul>
          </div>
        </div>
        
        {/* Zona de Estabilidade */}
        <div className="mt-6">
          <h4 className="font-bold text-lg mb-3">📈 Zona de Estabilidade (Sensibilidade dos Pesos BOCR)</h4>
          <p className="text-sm text-gray-600 mb-4">
            Quanto cada peso BOCR pode variar antes de inverter o ranking:
          </p>
          
          <div className="space-y-3">
            {stabilityZone.zones.map((zone: any) => (
              <div key={zone.code} className="flex items-center gap-3">
                <div className="w-32 font-semibold">{zone.merit}</div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ 
                        width: zone.inflection === '> ±20%' ? '100%' : `${parseFloat(zone.inflection) * 5}%`,
                        backgroundColor: zone.color 
                      }}
                    >
                      {zone.inflection}
                    </div>
                  </div>
                </div>
                <div className="w-40 text-right">
                  <span className="text-lg mr-2">{zone.status}</span>
                  <span style={{ color: zone.color }} className="font-semibold">
                    {zone.classification}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-bold text-blue-900">
              Conclusão Geral: {stabilityZone.overallClassification}
            </p>
          </div>
        </div>
      </div>
      
      {/* ============================================================
          2️⃣ ANÁLISE DE SUBCRITÉRIOS
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Análise de Subcritérios</span>
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Avaliação da distribuição de pesos dentro de cada mérito BOCR 
          (Lee 2009, Petrillo et al. 2023)
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subcriteria.map((sub: any) => (
            <div key={sub.code} className="border rounded-lg p-4">
              <h4 className="font-bold text-lg mb-3">{sub.merit}</h4>
              
              {/* Pesos dos subcritérios */}
              <div className="space-y-2 mb-4">
                {sub.weights.map((w: number, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-8 text-sm text-gray-600">{sub.code}{idx + 1}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full flex items-center justify-end pr-2 text-xs font-bold text-white ${
                          idx === sub.dominantIndex ? 'bg-red-500' :
                          idx === sub.irrelevantIndex ? 'bg-yellow-500' :
                          'bg-indigo-500'
                        }`}
                        style={{ width: `${w * 100}%` }}
                      >
                        {(w * 100).toFixed(1)}%
                      </div>
                    </div>
                    {idx === sub.dominantIndex && (
                      <span className="text-red-500 text-xs font-bold">⚠️ Dominante</span>
                    )}
                    {idx === sub.irrelevantIndex && (
                      <span className="text-yellow-600 text-xs font-bold">⚠️ Baixo</span>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Máximo</p>
                  <p className="text-lg font-bold">{sub.max}%</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Mínimo</p>
                  <p className="text-lg font-bold">{sub.min}%</p>
                </div>
              </div>
              
              {/* Ratio e Distribuição */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ratio Máx/Mín:</span>
                  <span className="font-bold">{sub.ratio}:1</span>
                </div>
                <div 
                  className="p-2 rounded text-center font-bold text-sm"
                  style={{ 
                    backgroundColor: `${sub.distColor}20`,
                    color: sub.distColor 
                  }}
                >
                  {sub.distribution}
                </div>
              </div>
              
              {/* Alertas */}
              {(sub.hasDominance || sub.hasIrrelevant) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  {sub.hasDominance && (
                    <p className="text-yellow-800">
                      ⚠️ Subcritério {sub.code}{sub.dominantIndex + 1} domina com {sub.max}% 
                      (Benchmark: &lt; 40%)
                    </p>
                  )}
                  {sub.hasIrrelevant && (
                    <p className="text-yellow-800">
                      ⚠️ Subcritério {sub.code}{sub.irrelevantIndex + 1} tem peso muito baixo ({sub.min}%)
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-bold text-blue-900 mb-2">📚 Benchmarks (Saaty 1980, Lee 2009):</p>
          <ul className="space-y-1 text-blue-800">
            <li>• <strong>Ratio &lt; 5:1:</strong> Distribuição equilibrada (ideal)</li>
            <li>• <strong>Ratio 5-9:1:</strong> Distribuição aceitável</li>
            <li>• <strong>Ratio &gt; 20:1:</strong> Possível subcritério irrelevante</li>
            <li>• <strong>Dominância &gt; 40%:</strong> Risco de viés (considere subdividir)</li>
          </ul>
        </div>
      </div>
      
      {/* ============================================================
          3️⃣ RATIOS BOCR (Perfil de Decisão)
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>⚖️</span>
          <span>Perfil de Decisão (Ratios BOCR)</span>
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Análise do perfil estratégico baseado nos pesos BOCR (Wijnmalen 2007, Alizadeh et al. 2020)
        </p>
        
        {/* Pesos BOCR */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-700 mb-1">Benefícios (B)</p>
            <p className="text-3xl font-bold text-green-600">{bocrRatios.B}%</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-700 mb-1">Oportunidades (O)</p>
            <p className="text-3xl font-bold text-blue-600">{bocrRatios.O}%</p>
          </div>
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">
            <p className="text-sm text-orange-700 mb-1">Custos (C)</p>
            <p className="text-3xl font-bold text-orange-600">{bocrRatios.C}%</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
            <p className="text-sm text-red-700 mb-1">Riscos (R)</p>
            <p className="text-3xl font-bold text-red-600">{bocrRatios.R}%</p>
          </div>
        </div>
        
        {/* Fatores Positivos vs Negativos */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border-2 border-green-300 rounded-lg p-6 bg-green-50">
            <p className="text-sm text-green-700 mb-2">Fatores Positivos (B + O)</p>
            <p className="text-4xl font-bold text-green-600">{bocrRatios.positive}%</p>
          </div>
          <div className="border-2 border-red-300 rounded-lg p-6 bg-red-50">
            <p className="text-sm text-red-700 mb-2">Fatores Negativos (C + R)</p>
            <p className="text-4xl font-bold text-red-600">{bocrRatios.negative}%</p>
          </div>
        </div>
        
        {/* Perfil de Decisão */}
        <div 
          className="rounded-lg p-6 border-2 text-center"
          style={{ 
            backgroundColor: `${bocrRatios.profileColor}15`,
            borderColor: bocrRatios.profileColor
          }}
        >
          <p className="text-6xl mb-3">{bocrRatios.icon}</p>
          <p className="text-sm text-gray-600 mb-2">Ratio (B+O)/(C+R)</p>
          <p className="text-5xl font-bold mb-3" style={{ color: bocrRatios.profileColor }}>
            {bocrRatios.ratio}
          </p>
          <p className="text-2xl font-bold" style={{ color: bocrRatios.profileColor }}>
            Perfil {bocrRatios.profile}
          </p>
        </div>
        
        {/* Trade-off Dominante */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="font-bold text-purple-900 mb-2">
            🎯 Trade-off Dominante: {bocrRatios.dominantTradeoff.label}
          </p>
          <p className="text-sm text-purple-800">
            Este é o dilema central da decisão, representando o principal conflito 
            entre aspectos positivos e negativos do investimento.
          </p>
        </div>
        
        {/* Interpretação */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-bold text-blue-900 mb-2">📚 Interpretação (Wijnmalen 2007):</p>
          <ul className="space-y-1 text-blue-800">
            <li>• <strong>Ratio &lt; 0.8:</strong> Muito conservador - prioriza mitigação de riscos</li>
            <li>• <strong>Ratio 0.8-1.0:</strong> Conservador - balanceado com viés cauteloso</li>
            <li>• <strong>Ratio 1.0-1.5:</strong> Equilibrado - ponderação neutra</li>
            <li>• <strong>Ratio 1.5-2.0:</strong> Inovador - prioriza ganhos e oportunidades</li>
            <li>• <strong>Ratio &gt; 2.0:</strong> Muito agressivo - foco em crescimento e inovação</li>
          </ul>
        </div>
      </div>
      
      
      {/* ============================================================
          4️⃣ CONVERGÊNCIA ENTRE MÉTODOS DE SÍNTESE
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🔄</span>
          <span>Convergência entre Métodos de Síntese</span>
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Verifica se diferentes métodos de agregação BOCR concordam sobre o vencedor 
          (Petrillo et al. 2023, Wijnmalen 2007)
        </p>
        
        {methodConvergence.error ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">⚠️ {methodConvergence.message}</p>
          </div>
        ) : (
          <>
            {/* Status de Convergência */}
            <div 
              className="rounded-lg p-6 border-2 mb-6"
              style={{ 
                backgroundColor: `${methodConvergence.convergenceColor}15`,
                borderColor: methodConvergence.convergenceColor
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Taxa de Concordância</p>
                  <p className="text-5xl font-bold" style={{ color: methodConvergence.convergenceColor }}>
                    {methodConvergence.concordanceCount}/{methodConvergence.totalMethods}
                  </p>
                  <p className="text-lg text-gray-600 mt-2">
                    {methodConvergence.concordancePercent}% dos métodos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-6xl mb-3">{methodConvergence.convergenceIcon}</p>
                  <p className="text-xl font-bold" style={{ color: methodConvergence.convergenceColor }}>
                    {methodConvergence.convergenceStatus}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Vencedor Consensual */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 mb-6 border-2 border-green-300">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🏆</span>
                <div>
                  <p className="text-sm text-green-700">Vencedor Consensual</p>
                  <p className="text-2xl font-bold text-green-900">{methodConvergence.consensusWinner}</p>
                  <p className="text-sm text-green-600">
                    Eleito por {methodConvergence.concordanceCount} de {methodConvergence.totalMethods} métodos
                  </p>
                </div>
              </div>
            </div>
            
            {/* Detalhamento por Método */}
            <div className="mb-6">
              <h4 className="font-bold text-lg mb-3">Vencedor por Método</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {methodConvergence.winners.map((w: any) => (
                  <div 
                    key={w.method}
                    className={`p-4 rounded-lg border-2 ${
                      w.winner === methodConvergence.consensusWinner
                        ? 'bg-green-50 border-green-300'
                        : 'bg-orange-50 border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-700">{w.method}</span>
                      <span className={`text-xl ${
                        w.winner === methodConvergence.consensusWinner ? '✅' : '⚠️'
                      }`}>
                        {w.winner === methodConvergence.consensusWinner ? '✅' : '⚠️'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-lg ${
                        w.winner === methodConvergence.consensusWinner
                          ? 'text-green-700'
                          : 'text-orange-700'
                      }`}>
                        {w.winner}
                      </span>
                      <span className="text-sm text-gray-600">
                        {w.winnerScore.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Métodos Divergentes */}
            {methodConvergence.divergentMethods.length > 0 && (
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-6">
                <p className="font-semibold text-orange-900 mb-2">
                  ⚠️ Métodos Divergentes: {methodConvergence.divergentMethods.length}
                </p>
                <div className="space-y-2">
                  {methodConvergence.divergentMethods.map((div: any) => (
                    <div key={div.method} className="flex items-center justify-between text-sm">
                      <span className="text-orange-800">{div.method}</span>
                      <span className="font-semibold text-orange-900">
                        elege {div.winner}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Interpretação */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="font-bold text-blue-900 mb-2">📊 Interpretação (Petrillo et al. 2023):</p>
              <ul className="space-y-1 text-blue-800">
                <li>• <strong>5/5:</strong> Convergência perfeita - resultado altamente robusto</li>
                <li>• <strong>4/5 ou 3/5:</strong> Convergência parcial - resultado confiável mas sensível ao método</li>
                <li>• <strong>2/5 ou menos:</strong> Divergência metodológica - cautela na interpretação</li>
              </ul>
              
              {methodConvergence.concordanceCount === methodConvergence.totalMethods && (
                <p className="mt-3 text-blue-900 font-semibold">
                  ✅ Todos os métodos concordam: resultado metodologicamente robusto!
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ============================================================
          5️⃣ VALIDAÇÃO DO TAMANHO DA AMOSTRA
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>👥</span>
          <span>Validação do Tamanho da Amostra</span>
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Avalia a adequação estatística do número de especialistas 
          (Forman & Peniwati 1998, Saaty 1980)
        </p>
        
        {/* Status da Amostra */}
        <div 
          className="rounded-lg p-6 border-2 mb-6"
          style={{ 
            backgroundColor: `${sampleValidation.sizeColor}15`,
            borderColor: sampleValidation.sizeColor
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Número de Especialistas</p>
              <p className="text-6xl font-bold" style={{ color: sampleValidation.sizeColor }}>
                n = {sampleValidation.n}
              </p>
            </div>
            <div className="text-right">
              <p className="text-6xl mb-3">{sampleValidation.sizeIcon}</p>
              <p className="text-2xl font-bold" style={{ color: sampleValidation.sizeColor }}>
                {sampleValidation.sizeStatus}
              </p>
            </div>
          </div>
          
          <p className="text-sm text-gray-700 mt-4">
            {sampleValidation.sizeDesc}
          </p>
        </div>
        
        {/* Poder Estatístico */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-5 mb-6 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-purple-700">Poder Estatístico Estimado</p>
              <p className="text-4xl font-bold text-purple-900">
                {sampleValidation.statisticalPower}%
              </p>
            </div>
            <div className="text-5xl">📊</div>
          </div>
          <div className="h-3 bg-purple-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-600 rounded-full" 
              style={{ width: `${sampleValidation.statisticalPower}%` }}
            />
          </div>
        </div>
        
        {/* Benchmarks da Literatura */}
        <div className="mb-6">
          <h4 className="font-bold text-lg mb-3">📏 Benchmarks da Literatura</h4>
          <div className="space-y-3">
            {/* Robusto: n ≥ 30 */}
            <div className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
              sampleValidation.n >= sampleValidation.benchmarks.robust
                ? 'bg-green-50 border-green-400'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <span className="text-3xl">
                {sampleValidation.n >= sampleValidation.benchmarks.robust ? '✅' : '○'}
              </span>
              <div className="flex-1">
                <p className="font-bold text-lg">
                  Robusto: n ≥ {sampleValidation.benchmarks.robust}
                </p>
                <p className="text-sm text-gray-600">
                  Alta confiabilidade estatística, resultados generalizáveis
                </p>
              </div>
              {sampleValidation.n >= sampleValidation.benchmarks.robust && (
                <div className="bg-green-600 text-white px-4 py-2 rounded-full font-bold text-sm">
                  ATINGIDO
                </div>
              )}
            </div>
            
            {/* Adequado: n ≥ 15 */}
            <div className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
              sampleValidation.n >= sampleValidation.benchmarks.adequate && sampleValidation.n < sampleValidation.benchmarks.robust
                ? 'bg-blue-50 border-blue-400'
                : sampleValidation.n >= sampleValidation.benchmarks.adequate
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <span className="text-3xl">
                {sampleValidation.n >= sampleValidation.benchmarks.adequate ? '✓' : '○'}
              </span>
              <div className="flex-1">
                <p className="font-bold text-lg">
                  Adequado: n ≥ {sampleValidation.benchmarks.adequate}
                </p>
                <p className="text-sm text-gray-600">
                  Suficiente para decisões organizacionais
                </p>
              </div>
              {sampleValidation.n >= sampleValidation.benchmarks.adequate && sampleValidation.n < sampleValidation.benchmarks.robust && (
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-sm">
                  ATINGIDO
                </div>
              )}
            </div>
            
            {/* Mínimo: n ≥ 7 */}
            <div className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
              sampleValidation.n >= sampleValidation.benchmarks.minimum && sampleValidation.n < sampleValidation.benchmarks.adequate
                ? 'bg-orange-50 border-orange-400'
                : sampleValidation.n >= sampleValidation.benchmarks.minimum
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <span className="text-3xl">
                {sampleValidation.n >= sampleValidation.benchmarks.minimum ? '⚠️' : '❌'}
              </span>
              <div className="flex-1">
                <p className="font-bold text-lg">
                  Mínimo: n ≥ {sampleValidation.benchmarks.minimum}
                </p>
                <p className="text-sm text-gray-600">
                  Limite inferior aceitável (com ressalvas)
                </p>
              </div>
              {sampleValidation.n >= sampleValidation.benchmarks.minimum && sampleValidation.n < sampleValidation.benchmarks.adequate && (
                <div className="bg-orange-600 text-white px-4 py-2 rounded-full font-bold text-sm">
                  ATINGIDO
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Interpretação */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-bold text-blue-900 mb-2">📚 Referências:</p>
          <p className="text-blue-800">
            <strong>Forman & Peniwati (1998):</strong> n ≥ 15 recomendado para decisões de grupo em AHP.<br />
            <strong>Saaty (1980):</strong> n ≥ 7 como mínimo absoluto para validade estatística.<br />
            <strong>Literatura MCDM:</strong> n ≥ 30 proporciona robustez comparável a métodos estatísticos tradicionais.
          </p>
        </div>
      </div>

      {/* ============================================================
          6️⃣ ANÁLISE DETALHADA DE CONSISTÊNCIA
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>✓</span>
          <span>Análise Detalhada de Consistência</span>
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Consistency Ratio (CR) e Consistency Index (CI) de cada matriz de comparação 
          (Saaty 1980, 2008; Alonso & Lamata 2006)
        </p>
        
        {/* Consistência BOCR Global */}
        <div className="mb-6">
          <h4 className="font-bold text-lg mb-3">Consistência BOCR (Méritos Principais)</h4>
          <div 
            className="rounded-lg p-5 border-2"
            style={{ 
              backgroundColor: `${detailedConsistency.bocr.color}15`,
              borderColor: detailedConsistency.bocr.color
            }}
          >
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <p className="text-sm text-gray-600">CI (Consistency Index)</p>
                <p className="text-2xl font-bold" style={{ color: detailedConsistency.bocr.color }}>
                  {detailedConsistency.bocr.ci}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">CR (Consistency Ratio)</p>
                <p className="text-2xl font-bold" style={{ color: detailedConsistency.bocr.color }}>
                  {detailedConsistency.bocr.cr}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">λmax (Eigenvalue)</p>
                <p className="text-2xl font-bold" style={{ color: detailedConsistency.bocr.color }}>
                  {detailedConsistency.bocr.lambda}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t">
              <p className="text-lg font-bold" style={{ color: detailedConsistency.bocr.color }}>
                Magnitude: {detailedConsistency.bocr.magnitude}
              </p>
            </div>
          </div>
        </div>
        
        {/* Consistência dos Subcritérios */}
        <div className="mb-6">
          <h4 className="font-bold text-lg mb-3">Consistência por Mérito BOCR (Subcritérios)</h4>
          
          {/* Resumo Estatístico */}
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700">CR Médio</p>
              <p className="text-3xl font-bold text-blue-900">
                {detailedConsistency.summary.avgCR}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-700">Excelentes (CR &lt; 3%)</p>
              <p className="text-3xl font-bold text-green-900">
                {detailedConsistency.summary.excellentCount}/{detailedConsistency.summary.totalAnalyzed}
              </p>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-700">Inconsistentes (CR &gt; 10%)</p>
              <p className="text-3xl font-bold text-red-900">
                {detailedConsistency.summary.inconsistentCount}/{detailedConsistency.summary.totalAnalyzed}
              </p>
            </div>
          </div>
          
          {/* Tabela Detalhada */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-left">Mérito</th>
                  <th className="border border-gray-300 px-4 py-3 text-center">CI (%)</th>
                  <th className="border border-gray-300 px-4 py-3 text-center">CR (%)</th>
                  <th className="border border-gray-300 px-4 py-3 text-center">λmax</th>
                  <th className="border border-gray-300 px-4 py-3 text-center">Magnitude</th>
                </tr>
              </thead>
              <tbody>
                {detailedConsistency.subcriteria.map((sub: any) => {
                  const crValue = parseFloat(sub.cr);
                  return (
                    <tr 
                      key={sub.code}
                      className={crValue > 10 ? 'bg-red-50' : crValue < 3 ? 'bg-green-50' : ''}
                    >
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded text-xs font-bold text-white bg-indigo-600">
                            {sub.code}
                          </span>
                          <span className="font-semibold">{sub.merit}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-mono">
                        {sub.ci}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span 
                          className="font-bold text-xl"
                          style={{ color: sub.color }}
                        >
                          {sub.cr}%
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-mono text-sm">
                        {sub.lambda}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xl">{sub.status}</span>
                          <span 
                            className="font-semibold"
                            style={{ color: sub.color }}
                          >
                            {sub.magnitude}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Visualização Gráfica */}
        <div className="mb-6">
          <h4 className="font-bold text-lg mb-3">📊 Visualização dos CR</h4>
          <div className="space-y-3">
            {detailedConsistency.subcriteria.map((sub: any) => {
              const crValue = parseFloat(sub.cr);
              return (
                <div key={sub.code} className="flex items-center gap-3">
                  <div className="w-32 flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-bold text-white bg-indigo-600">
                      {sub.code}
                    </span>
                    <span className="text-sm font-semibold">{sub.merit}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-gray-100 rounded-full overflow-hidden relative">
                      {/* Zona verde (0-3%) */}
                      <div className="absolute top-0 left-0 h-full bg-green-100 w-[30%]" />
                      {/* Zona azul (3-7%) */}
                      <div className="absolute top-0 h-full bg-blue-100" style={{ left: '30%', width: '40%' }} />
                      {/* Zona amarela (7-10%) */}
                      <div className="absolute top-0 h-full bg-yellow-100" style={{ left: '70%', width: '30%' }} />
                      {/* Linha vermelha em 10% */}
                      <div className="absolute top-0 h-full w-1 bg-red-500" style={{ left: '100%' }} />
                      
                      {/* Barra do CR */}
                      <div 
                        className="absolute top-0 h-full flex items-center justify-end pr-2 rounded-full"
                        style={{ 
                          width: `${Math.min(crValue * 10, 120)}%`,
                          backgroundColor: sub.color
                        }}
                      >
                        <span className="text-sm font-bold text-white">{sub.cr}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-28 text-right">
                    <span className="text-lg mr-1">{sub.status}</span>
                    <span className="text-sm font-semibold" style={{ color: sub.color }}>
                      {sub.magnitude}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Interpretação */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-bold text-blue-900 mb-2">📚 Escalas de Magnitude (Saaty 1980, Alonso & Lamata 2006):</p>
          <ul className="space-y-1 text-blue-800">
            <li>• <strong>CR &lt; 3%:</strong> Excelente - julgamentos quase determinísticos</li>
            <li>• <strong>CR 3-7%:</strong> Boa - alta coerência nas comparações</li>
            <li>• <strong>CR 7-10%:</strong> Aceitável - complexidade justifica variações</li>
            <li>• <strong>CR &gt; 10%:</strong> Inconsistente - revisão recomendada</li>
          </ul>
          
          {detailedConsistency.summary.inconsistentCount > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
              <p className="text-yellow-900 font-semibold">
                ⚠️ Atenção: {detailedConsistency.summary.inconsistentCount} mérito(s) apresentam CR &gt; 10%
              </p>
              <p className="text-yellow-800 text-xs mt-1">
                Embora acima do ideal, CR até 15% pode ser aceitável em decisões complexas. 
                Considere revisar julgamentos ou justificar metodologicamente.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* RESUMO EXECUTIVO EXPANDIDO */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">📋 Resumo Executivo - Qualidade da Decisão</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Robustez */}
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-sm text-purple-100 mb-1">Robustez da Decisão</p>
            <p className="text-2xl font-bold">{robustness.classification}</p>
            <p className="text-sm text-purple-100 mt-2">Diferença: {robustness.diffPercent}%</p>
          </div>
          
          {/* Card 2: Estabilidade */}
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-sm text-purple-100 mb-1">Estabilidade</p>
            <p className="text-2xl font-bold">{stabilityZone.overallClassification}</p>
          </div>
          
          {/* Card 3: Perfil */}
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-sm text-purple-100 mb-1">Perfil Estratégico</p>
            <p className="text-2xl font-bold">{bocrRatios.icon} {bocrRatios.profile}</p>
            <p className="text-sm text-purple-100 mt-2">Ratio: {bocrRatios.ratio}</p>
          </div>
        </div>
        
        {/* Segunda linha de cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 4: Convergência */}
          {!methodConvergence.error && (
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm text-purple-100 mb-1">Convergência Metodológica</p>
              <p className="text-2xl font-bold">
                {methodConvergence.convergenceIcon} {methodConvergence.concordanceCount}/{methodConvergence.totalMethods}
              </p>
              <p className="text-sm text-purple-100 mt-2">{methodConvergence.convergenceStatus}</p>
            </div>
          )}
          
          {/* Card 5: Amostra */}
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-sm text-purple-100 mb-1">Tamanho da Amostra</p>
            <p className="text-2xl font-bold">
              {sampleValidation.sizeIcon} n = {sampleValidation.n}
            </p>
            <p className="text-sm text-purple-100 mt-2">{sampleValidation.sizeStatus}</p>
          </div>
          
          {/* Card 6: Consistência */}
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-sm text-purple-100 mb-1">Consistência Média</p>
            <p className="text-2xl font-bold">CR = {detailedConsistency.summary.avgCR}%</p>
            <p className="text-sm text-purple-100 mt-2">
              {detailedConsistency.summary.inconsistentCount === 0 ? '✅ Todas OK' : `⚠️ ${detailedConsistency.summary.inconsistentCount} inconsistente(s)`}
            </p>
          </div>
        </div>
        
        {/* Linha de conclusão geral */}
        <div className="mt-6 p-4 bg-white bg-opacity-10 rounded-lg border-2 border-white border-opacity-30">
          <p className="font-bold text-lg mb-2">🎯 Conclusão Geral</p>
          <p className="text-purple-50 text-sm leading-relaxed">
            Decisão <strong>{robustness.classification.toLowerCase()}</strong> ({robustness.diffPercent}% de diferença) 
            com perfil <strong>{bocrRatios.profile.toLowerCase()}</strong> (ratio {bocrRatios.ratio}). 
            {!methodConvergence.error && (
              <>
                {' '}Convergência <strong>{methodConvergence.convergenceStatus.toLowerCase()}</strong> 
                ({methodConvergence.concordanceCount}/{methodConvergence.totalMethods} métodos).
              </>
            )}
            {' '}Amostra <strong>{sampleValidation.sizeStatus.toLowerCase()}</strong> (n={sampleValidation.n}). 
            Consistência <strong>{detailedConsistency.summary.inconsistentCount === 0 ? 'excelente' : 'adequada'}</strong> 
            (CR médio {detailedConsistency.summary.avgCR}%).
          </p>
        </div>
      </div>
      
    </div>
  );
}
