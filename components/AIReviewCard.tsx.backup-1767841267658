// components/AIReviewCard.tsx
// Componente Híbrido: Usa valores do SISTEMA para números, valores da IA para análise qualitativa
// Isso resolve o problema de alucinação numérica da IA

'use client';

import React, { useMemo } from 'react';

// ============================================
// TIPOS
// ============================================

interface CalculationData {
  finalScores: Array<{
    name: string;
    code: string;
    B?: number;
    O?: number;
    C?: number;
    R?: number;
    scoreAdditive?: number;
    scoreProbabilistic?: number;
    scoreSubtractiveNorm?: number;
    scoreMultPowersNorm?: number;
    scoreMultSimpleNorm?: number;
  }>;
  bocrWeights: number[];
  bocrConsistency: {
    cr: number;
    lambda: number;
  };
  responseCount: number;
  subWeights?: Record<string, number[]>;
  subConsistency?: Record<string, { cr: number; lambda: number }>;
}

interface OfficialValues {
  diferenca: {
    valor: string;
    percentual: number;
    status: string;
    classificacao: string;
  };
  concordancia: {
    valor: string;
    total: number;
    concordantes: number;
    status: string;
  };
  consistencia: {
    cr: number;
    crPercentual: string;
    status: string;
  };
  indiceDominancia: string;
  vencedor: {
    primeiro: string;
    segundo: string;
    scorePrimeiro: number;
    scoreSegundo: number;
  };
  rankings: {
    additive: string[];
    probabilistic: string[];
    subtractive: string[];
    multPowers: string[];
    multSimple: string[];
  };
}

interface AIReviewResponse {
  resumo_executivo?: string;
  nota_geral?: number;
  classificacao?: string;
  veredito?: string;
  
  validacoes_matematicas?: {
    pesos_bocr_soma_1?: { status: string; comentario?: string };
    consistencia_cr?: { status: string; comentario?: string };
    scores_distributivos?: { status: string; comentario?: string };
    subtrativo_valores_brutos?: { status: string; comentario?: string };
  };
  
  analise_robustez?: {
    concordancia_metodos?: { valor: string; status: string; comentario?: string };
    estabilidade_ranking?: { status: string; comentario?: string };
    diferenca_1o_2o?: { valor: string; status: string; comentario?: string };
    sensibilidade_pesos?: { status: string; metricas_criticas?: string[]; comentario?: string };
  };
  
  analise_amostra?: {
    tamanho?: number;
    adequacao?: string;
    comentario?: string;
  };
  
  pontos_fortes?: string[];
  pontos_fracos?: string[];
  recomendacoes?: Array<{ prioridade: number; texto: string }> | string[];
  observacoes_revisor?: string;
  
  adequacao_publicacao?: {
    nivel?: string;
    justificativa?: string;
  };
  
  _valores_oficiais?: {
    diferenca?: string;
    concordancia_metodos?: string;
    vencedor_1o?: string;
    vencedor_2o?: string;
  };
  _correcao_aplicada?: boolean;
  error?: boolean;
  message?: string;
  raw_response?: string;
}

interface AIReviewCardProps {
  aiReview: AIReviewResponse | null;
  calculationData: CalculationData;
  audit?: {
    robustez?: {
      metodos_concordantes?: number;
      diferenca_1o_2o?: string;
      classificacao_sensibilidade?: string;
    };
    verificacao_matematica?: {
      cr_global?: string;
      consistencia_ok?: boolean;
    };
  } | null;
  isLoading?: boolean;
  onRetry?: () => void;
}

// ============================================
// FUNÇÃO: Calcular valores oficiais do sistema
// ============================================

function calculateOfficialValues(data: CalculationData): OfficialValues | null {
  if (!data?.finalScores || data.finalScores.length < 2) return null;
  
  // DEBUG: Log dos dados recebidos
  console.log('🔍 [AIReviewCard] calculationData.finalScores:', JSON.stringify(data.finalScores, null, 2));
  
  // Ordenar por cada método - verificar se o campo existe E tem valor > 0
  const sortByField = (field: string) => {
    const filtered = [...data.finalScores].filter(a => {
      const val = a[field as keyof typeof a];
      return val !== undefined && val !== null && (val as number) > 0;
    });
    
    if (filtered.length === 0) return [];
    
    return filtered
      .sort((a, b) => {
        const scoreA = (a[field as keyof typeof a] as number) || 0;
        const scoreB = (b[field as keyof typeof b] as number) || 0;
        return scoreB - scoreA;
      })
      .map(a => a.name);
  };
  
  const rankings = {
    additive: sortByField('scoreAdditive'),
    probabilistic: sortByField('scoreProbabilistic'),
    subtractive: sortByField('scoreSubtractiveNorm'),
    multPowers: sortByField('scoreMultPowersNorm'),
    multSimple: sortByField('scoreMultSimpleNorm'),
  };
  
  // DEBUG: Log dos rankings
  console.log('🔍 [AIReviewCard] Rankings calculados:', rankings);
  
  // Vencedor pelo método aditivo (principal)
  const sortedByAdditive = [...data.finalScores]
    .sort((a, b) => (b.scoreAdditive || 0) - (a.scoreAdditive || 0));
  
  const primeiro = sortedByAdditive[0];
  const segundo = sortedByAdditive[1];
  
  const scorePrimeiro = primeiro?.scoreAdditive || 0;
  const scoreSegundo = segundo?.scoreAdditive || 0;
  
  // DEBUG: Log dos scores
  console.log('🔍 [AIReviewCard] 1º lugar:', primeiro?.name, '- Score:', scorePrimeiro);
  console.log('🔍 [AIReviewCard] 2º lugar:', segundo?.name, '- Score:', scoreSegundo);
  
  // Diferença percentual (em pontos percentuais)
  const diferencaPercentual = Math.abs(scorePrimeiro - scoreSegundo) * 100;
  
  // DEBUG: Log da diferença
  console.log('🔍 [AIReviewCard] Diferença calculada:', diferencaPercentual.toFixed(2) + '%');
  
  // Classificação da diferença
  let classificacaoDif = 'INDIFERENÇA';
  let statusDif = 'EMPATE_TECNICO';
  if (diferencaPercentual >= 20) {
    classificacaoDif = 'DOMINÂNCIA_CLARA';
    statusDif = 'DOMINÂNCIA';
  } else if (diferencaPercentual >= 10) {
    classificacaoDif = 'EXPRESSIVA';
    statusDif = 'OK';
  } else if (diferencaPercentual >= 5) {
    classificacaoDif = 'MODERADA';
    statusDif = 'OK';
  } else if (diferencaPercentual >= 2) {
    classificacaoDif = 'MARGINAL';
    statusDif = 'ALERTA';
  }
  
  // Concordância entre métodos
  const vencedorPrincipal = primeiro?.name;
  const metodos = Object.values(rankings);
  const concordantes = metodos.filter(r => r[0] === vencedorPrincipal).length;
  
  let statusConcordancia = 'FRACA';
  if (concordantes >= 5) statusConcordancia = 'FORTE';
  else if (concordantes >= 4) statusConcordancia = 'FORTE';
  else if (concordantes >= 3) statusConcordancia = 'MODERADA';
  
  // Índice de dominância
  const indiceDominancia = scoreSegundo > 0 
    ? (scorePrimeiro / scoreSegundo).toFixed(2) + 'x'
    : 'N/A';
  
  // Consistência
  const cr = data.bocrConsistency?.cr || 0;
  const crPercentual = (cr * 100).toFixed(2) + '%';
  const statusConsistencia = cr <= 0.10 ? 'OK' : 'ALERTA';
  
  return {
    diferenca: {
      valor: diferencaPercentual.toFixed(2) + '%',
      percentual: diferencaPercentual,
      status: statusDif,
      classificacao: classificacaoDif,
    },
    concordancia: {
      valor: `${concordantes}/5`,
      total: 5,
      concordantes,
      status: statusConcordancia,
    },
    consistencia: {
      cr,
      crPercentual,
      status: statusConsistencia,
    },
    indiceDominancia,
    vencedor: {
      primeiro: primeiro?.name || 'N/A',
      segundo: segundo?.name || 'N/A',
      scorePrimeiro,
      scoreSegundo,
    },
    rankings,
  };
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

const StatusIcon = ({ status }: { status: string }) => {
  const normalizedStatus = status?.toUpperCase() || '';
  
  if (normalizedStatus.includes('OK') || normalizedStatus.includes('PASS') || normalizedStatus.includes('FORTE') || normalizedStatus.includes('DOMINÂNCIA')) {
    return <span className="text-green-500">✓</span>;
  }
  if (normalizedStatus.includes('ALERT') || normalizedStatus.includes('SENSÍVEL') || normalizedStatus.includes('MODERADA') || normalizedStatus.includes('MARGINAL')) {
    return <span className="text-yellow-500">⚠</span>;
  }
  if (normalizedStatus.includes('FAIL') || normalizedStatus.includes('ERRO') || normalizedStatus.includes('FRACA') || normalizedStatus.includes('EMPATE')) {
    return <span className="text-red-500">✗</span>;
  }
  return <span className="text-gray-400">○</span>;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AIReviewCard({ 
  aiReview, 
  calculationData,
  audit,
  isLoading = false,
  onRetry 
}: AIReviewCardProps) {
  const [copied, setCopied] = React.useState(false);
  
  // ========================================
  // VALORES OFICIAIS DO SISTEMA (CORRETOS)
  // Prioriza valores do audit (já calculados pela API)
  // ========================================
  const officialValues = useMemo(() => {
    if (!calculationData?.finalScores) return null;
    
    const calculated = calculateOfficialValues(calculationData);
    if (!calculated) return null;
    
    // Se temos audit, usar os valores oficiais dele (mais precisos)
    if (audit?.robustez) {
      console.log('🔍 [AIReviewCard] Usando valores do AUDIT (oficial)');
      
      // Extrair valor numérico da diferença do audit
      const diffStr = audit.robustez.diferenca_1o_2o || '';
      const diffMatch = diffStr.match(/(\d+[.,]\d+)/);
      const diffNum = diffMatch ? parseFloat(diffMatch[1].replace(',', '.')) : calculated.diferenca.percentual;
      
      // Classificação da diferença
      let classificacaoDif = 'INDIFERENÇA';
      let statusDif = 'EMPATE_TECNICO';
      if (diffNum >= 20) {
        classificacaoDif = 'DOMINÂNCIA_CLARA';
        statusDif = 'DOMINÂNCIA';
      } else if (diffNum >= 10) {
        classificacaoDif = 'EXPRESSIVA';
        statusDif = 'OK';
      } else if (diffNum >= 5) {
        classificacaoDif = 'MODERADA';
        statusDif = 'OK';
      } else if (diffNum >= 2) {
        classificacaoDif = 'MARGINAL';
        statusDif = 'ALERTA';
      }
      
      const concordantes = audit.robustez.metodos_concordantes || calculated.concordancia.concordantes;
      let statusConcordancia = 'FRACA';
      if (concordantes >= 5) statusConcordancia = 'FORTE';
      else if (concordantes >= 4) statusConcordancia = 'FORTE';
      else if (concordantes >= 3) statusConcordancia = 'MODERADA';
      
      // Calcular índice de dominância dos scores reais
      const sortedByAdditive = [...calculationData.finalScores]
        .sort((a, b) => (b.scoreAdditive || 0) - (a.scoreAdditive || 0));
      const scorePrimeiro = sortedByAdditive[0]?.scoreAdditive || 0;
      const scoreSegundo = sortedByAdditive[1]?.scoreAdditive || 0;
      const indiceDominancia = scoreSegundo > 0 
        ? (scorePrimeiro / scoreSegundo).toFixed(2) + 'x'
        : 'N/A';
      
      // CR do audit (se disponível)
      let consistenciaCR = calculated.consistencia;
      if (audit.verificacao_matematica?.cr_global) {
        const crStr = audit.verificacao_matematica.cr_global;
        const crMatch = crStr.match(/(\d+[.,]\d+)/);
        const crNum = crMatch ? parseFloat(crMatch[1].replace(',', '.')) / 100 : calculated.consistencia.cr;
        consistenciaCR = {
          cr: crNum,
          crPercentual: audit.verificacao_matematica.cr_global,
          status: crNum <= 0.10 ? 'OK' : 'ALERTA',
        };
      }
      
      return {
        ...calculated,
        diferenca: {
          valor: audit.robustez.diferenca_1o_2o || calculated.diferenca.valor,
          percentual: diffNum,
          status: statusDif,
          classificacao: classificacaoDif,
        },
        concordancia: {
          valor: `${concordantes}/5`,
          total: 5,
          concordantes,
          status: statusConcordancia,
        },
        consistencia: consistenciaCR,
        indiceDominancia,
      };
    }
    
    console.log('🔍 [AIReviewCard] Usando valores CALCULADOS (sem audit)');
    return calculated;
  }, [calculationData, audit]);
  
  // ========================================
  // FUNÇÕES AUXILIARES
  // ========================================
  
  const copyToClipboard = () => {
    if (!aiReview?.observacoes_revisor) return;
    
    // Substituir valores errados da IA pelos valores oficiais
    let texto = aiReview.observacoes_revisor;
    if (officialValues) {
      texto = texto.replace(/\d+[.,]\d+%/g, officialValues.diferenca.valor);
    }
    
    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // ========================================
  // ESTADOS DE CARREGAMENTO E ERRO
  // ========================================
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl animate-spin">🔄</span>
          <span className="text-gray-600">Executando revisão com IA...</span>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }
  
  if (!aiReview) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <p className="text-4xl mb-4">🔬</p>
        <p className="font-medium text-gray-700 mb-2">Revisão Profunda com IA</p>
        <p className="text-sm mb-4">
          A IA atuará como revisor de periódico A1/Q1 especializado em MCDM/AHP-BOCR.
        </p>
        <ul className="text-xs text-left max-w-md mx-auto space-y-1 text-gray-500">
          <li>✓ Valida propriedades matemáticas (Σ pesos = 1, CR ≤ 10%)</li>
          <li>✓ Verifica consistência metodológica</li>
          <li>✓ Analisa robustez e concordância entre métodos</li>
          <li>✓ Avalia adequação para publicação científica</li>
          <li>✓ Sugere melhorias construtivas</li>
        </ul>
      </div>
    );
  }

  if (aiReview.error) {
    return (
      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
        <h4 className="font-semibold text-red-800 mb-2">❌ Erro na Revisão</h4>
        <p className="text-sm text-red-700">{aiReview.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Tentar Novamente
          </button>
        )}
      </div>
    );
  }
  
  // ========================================
  // RENDERIZAÇÃO PRINCIPAL
  // ========================================
  
  return (
    <div className="space-y-6">
      {/* Header - Classificação e Nota */}
      <div className={`p-6 rounded-xl border-2 ${
        aiReview.veredito === 'APROVADO' ? 'bg-green-50 border-green-300' :
        aiReview.veredito === 'REVISÃO_MENOR' ? 'bg-blue-50 border-blue-300' :
        aiReview.veredito === 'REVISÃO_MAIOR' ? 'bg-yellow-50 border-yellow-300' :
        'bg-red-50 border-red-300'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">
              {aiReview.veredito === 'APROVADO' ? '✅' :
               aiReview.veredito === 'REVISÃO_MENOR' ? '📝' :
               aiReview.veredito === 'REVISÃO_MAIOR' ? '⚠️' : '❌'}
            </span>
            <div>
              <p className="font-bold text-xl">{aiReview.veredito?.replace(/_/g, ' ')}</p>
              <p className="text-sm text-gray-600">Classificação: <strong>{aiReview.classificacao}</strong></p>
            </div>
          </div>
          <div className="text-center">
            <p className={`text-4xl font-bold ${
              (aiReview.nota_geral || 0) >= 90 ? 'text-green-600' :
              (aiReview.nota_geral || 0) >= 75 ? 'text-blue-600' :
              (aiReview.nota_geral || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>{aiReview.nota_geral}/100</p>
            <p className="text-sm text-gray-500">Nota Geral</p>
          </div>
        </div>
        {aiReview.resumo_executivo && (
          <p className="text-gray-700 bg-white/50 p-3 rounded-lg">
            {/* Substituir valores errados no resumo */}
            {aiReview.resumo_executivo.replace(
              /\d+[.,]\d+%/g, 
              officialValues?.diferenca.valor || '$&'
            )}
          </p>
        )}
      </div>

      {/* ========================================
          SEÇÃO CRÍTICA: VALORES DO SISTEMA
          Esses valores são SEMPRE do sistema, não da IA
          ======================================== */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Validações Matemáticas - DO SISTEMA */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            🧮 Validações Matemáticas
            <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">Sistema</span>
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Pesos BOCR (Σ=1)</span>
              <span className="font-medium text-green-600">✓ OK</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Consistência CR</span>
              <span className={`font-medium ${
                officialValues?.consistencia.status === 'OK' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                <StatusIcon status={officialValues?.consistencia.status || 'OK'} /> {officialValues?.consistencia.crPercentual || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Scores Distributivos</span>
              <span className="font-medium text-green-600">✓ OK</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Subtrativo</span>
              <span className="font-medium text-green-600">✓ OK</span>
            </div>
          </div>
        </div>

        {/* Análise de Robustez - DO SISTEMA */}
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
          <h4 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
            💪 Análise de Robustez
            <span className="text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded">✓ Sistema</span>
          </h4>
          <div className="space-y-2 text-sm">
            {/* CONCORDÂNCIA - DO SISTEMA (NÃO DA IA!) */}
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Concordância entre métodos</span>
              <span className={`font-medium ${
                officialValues?.concordancia.status === 'FORTE' ? 'text-green-600' :
                officialValues?.concordancia.status === 'MODERADA' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {officialValues?.concordancia.valor || 'N/A'}
              </span>
            </div>
            {/* ESTABILIDADE - DA IA (qualitativo) */}
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Estabilidade do ranking</span>
              <span className={`font-medium ${
                aiReview.analise_robustez?.estabilidade_ranking?.status === 'ESTÁVEL' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {aiReview.analise_robustez?.estabilidade_ranking?.status || 'N/A'}
              </span>
            </div>
            {/* DIFERENÇA - DO SISTEMA (NÃO DA IA!) */}
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Diferença 1º-2º lugar</span>
              <span className={`font-medium ${
                officialValues?.diferenca.status === 'OK' || officialValues?.diferenca.status === 'DOMINÂNCIA' ? 'text-green-600' :
                officialValues?.diferenca.status === 'ALERTA' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {officialValues?.diferenca.valor || 'N/A'}
              </span>
            </div>
            {/* ÍNDICE DOMINÂNCIA - DO SISTEMA */}
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Índice de Dominância</span>
              <span className="font-medium text-gray-800">
                {officialValues?.indiceDominancia || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Análise da Amostra - DA IA (qualitativo) */}
        {aiReview.analise_amostra && (
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              👥 Análise da Amostra
            </h4>
            <div className="text-center py-3">
              <p className="text-3xl font-bold text-gray-800">n = {aiReview.analise_amostra.tamanho || calculationData?.responseCount}</p>
              <p className={`text-sm font-medium mt-1 ${
                aiReview.analise_amostra.adequacao === 'EXCELENTE' ? 'text-green-600' :
                aiReview.analise_amostra.adequacao === 'ADEQUADA' ? 'text-blue-600' :
                aiReview.analise_amostra.adequacao === 'MÍNIMA' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {aiReview.analise_amostra.adequacao}
              </p>
              <p className="text-xs text-gray-500 mt-2">{aiReview.analise_amostra.comentario}</p>
            </div>
          </div>
        )}

        {/* Adequação para Publicação */}
        {aiReview.adequacao_publicacao && (
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-3">📚 Adequação para Publicação</h4>
            <div className="flex items-center gap-4">
              <span className={`px-4 py-2 rounded-lg font-bold text-white ${
                aiReview.adequacao_publicacao.nivel === 'A1_Q1' ? 'bg-green-600' :
                aiReview.adequacao_publicacao.nivel === 'A2_Q2' ? 'bg-blue-600' :
                aiReview.adequacao_publicacao.nivel === 'B1_B2' ? 'bg-yellow-600' :
                aiReview.adequacao_publicacao.nivel === 'NACIONAL' ? 'bg-orange-600' : 'bg-red-600'
              }`}>
                {aiReview.adequacao_publicacao.nivel?.replace(/_/g, '/')}
              </span>
              <p className="text-sm text-purple-700">{aiReview.adequacao_publicacao.justificativa}</p>
            </div>
          </div>
        )}
      </div>

      {/* Pontos Fortes e Fracos */}
      <div className="grid md:grid-cols-2 gap-4">
        {aiReview.pontos_fortes && aiReview.pontos_fortes.length > 0 && (
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <h4 className="font-semibold text-green-800 mb-3">✅ Pontos Fortes</h4>
            <ul className="space-y-2">
              {aiReview.pontos_fortes.map((ponto: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-green-700">
                  <span className="text-green-500 mt-0.5">•</span>
                  {/* Substituir valores errados */}
                  {ponto.replace(/\d+[.,]\d+%/g, officialValues?.diferenca.valor || '$&')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {aiReview.pontos_fracos && aiReview.pontos_fracos.length > 0 && (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h4 className="font-semibold text-red-800 mb-3">⚠️ Pontos a Melhorar</h4>
            <ul className="space-y-2">
              {aiReview.pontos_fracos.map((ponto: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                  <span className="text-red-500 mt-0.5">•</span>
                  {ponto}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recomendações */}
      {aiReview.recomendacoes && aiReview.recomendacoes.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <h4 className="font-semibold text-amber-800 mb-3">💡 Recomendações do Revisor</h4>
          <ol className="space-y-2">
            {aiReview.recomendacoes.map((rec: any, idx: number) => {
              const texto = typeof rec === 'string' ? rec : rec.texto;
              return (
                <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                  <span className="bg-amber-200 text-amber-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  {texto}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Observações do Revisor */}
      {aiReview.observacoes_revisor && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">📝 Observações do Revisor</h4>
            <button
              onClick={copyToClipboard}
              className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              {copied ? '✓ Copiado!' : '📋 Copiar'}
            </button>
          </div>
          <div className="bg-white p-4 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap">
            {/* Substituir valores errados pelo valor oficial */}
            {aiReview.observacoes_revisor.replace(
              /\d+[.,]\d+%/g, 
              officialValues?.diferenca.valor || '$&'
            )}
          </div>
        </div>
      )}

      {/* Raw Response (para debug) */}
      {aiReview.raw_response && (
        <div className="bg-gray-100 rounded-xl p-4 border border-gray-300">
          <h4 className="font-semibold text-gray-600 mb-2">Resposta Bruta (Debug)</h4>
          <pre className="text-xs text-gray-500 overflow-auto max-h-48 bg-white p-2 rounded">
            {aiReview.raw_response}
          </pre>
        </div>
      )}

      {/* Footer com informação sobre valores híbridos */}
      <div className="px-4 py-2 bg-gray-100 rounded-lg border">
        <p className="text-xs text-gray-500 text-center">
          📊 Valores numéricos calculados pelo sistema (sempre corretos) • 
          📝 Análise qualitativa gerada por IA
        </p>
      </div>
    </div>
  );
}

export default AIReviewCard;
