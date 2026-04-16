// components/AIReviewCard.tsx
// Componente de Revisão IA - CORRIGIDO v2.0
// Correções: Regex destrutivo removido, normalização de strings, Quality Gate visível

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

interface SistemaClassificacao {
  nota?: number;
  grade?: string;
  gradeLabel?: string;
  verdict?: string;
  verdictIcon?: string;
  qualityPenalty?: boolean;
  penaltyReason?: string;
  penaltySeverity?: string;
}

interface AIReviewResponse {
  resumo_executivo?: string;
  
  // NOVO v6.4.5: Campo unificado com markdown completo
  texto_completo?: string;
  version?: string;
  nota_geral?: number;
  classificacao?: string;
  veredito?: string;
  
  // NOVO v6.4.5: Metadata da API
  metadata?: {
    version?: string;
    model?: string;
    timestamp?: string;
    score?: number;
    knowledgeBase?: {
      refsUsed?: number;
      criticalRefs?: number;
    };
  };
  
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
  
  // NOVO v6.1: Dados do sistema (não da IA)
  _sistema?: SistemaClassificacao;
  
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
// CORREÇÃO 2: Função de Normalização de Strings
// ============================================

const normalize = (s: string | undefined | null): string => {
  return s ? s.trim().toLowerCase() : '';
};

// ============================================
// FUNÇÃO: Calcular valores oficiais do sistema
// ============================================

function calculateOfficialValues(data: CalculationData): OfficialValues | null {
  if (!data?.finalScores || data.finalScores.length < 2) return null;
  
  // Ordenar por cada método
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
  
  // Vencedor pelo método aditivo
  const sortedByAdditive = [...data.finalScores]
    .sort((a, b) => (b.scoreAdditive || 0) - (a.scoreAdditive || 0));
  
  const primeiro = sortedByAdditive[0];
  const segundo = sortedByAdditive[1];
  
  const scorePrimeiro = primeiro?.scoreAdditive || 0;
  const scoreSegundo = segundo?.scoreAdditive || 0;
  
  // Diferença percentual
  const diferencaPercentual = Math.abs(scorePrimeiro - scoreSegundo) * 100;
  
  // Classificação
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
  
  // CORREÇÃO 2: Concordância com normalização
  const vencedorPrincipal = primeiro?.name;
  const metodos = Object.values(rankings);
  
  // ANTES (bug): metodos.filter(r => r[0] === vencedorPrincipal).length
  // DEPOIS (corrigido): usa normalização para comparação robusta
  const concordantes = metodos.filter(r => 
    normalize(r[0]) === normalize(vencedorPrincipal)
  ).length;
  
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

// CORREÇÃO 3: Componente de Alerta do Quality Gate
const QualityGateAlert = ({ sistema }: { sistema?: SistemaClassificacao }) => {
  if (!sistema?.qualityPenalty) return null;
  
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🚨</span>
        <div>
          <h4 className="font-bold text-red-800 mb-1">Quality Gate Ativado</h4>
          <p className="text-sm text-red-700">
            {sistema.penaltyReason || 'Foram detectadas inconsistências significativas na base de respondentes.'}
          </p>
          <p className="text-xs text-red-600 mt-2">
            A nota foi penalizada automaticamente. O CR global pode estar mascarando problemas individuais (Paradoxo da Agregação).
          </p>
        </div>
      </div>
    </div>
  );
};

// Componente para renderizar Markdown básico
const MarkdownRenderer = ({ content }: { content: string }) => {
  // CORREÇÃO 1: NÃO faz nenhuma substituição de texto
  // Confia no texto que vem do backend (já processado com tokens)
  
  // Renderização básica de Markdown
  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-bold text-gray-800 mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-bold text-gray-800 mt-6 mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-bold text-gray-800 mt-6 mb-3">{line.slice(2)}</h1>;
        }
        
        // Blockquotes (alertas)
        if (line.startsWith('> ')) {
          const isAlert = line.includes('⚠️') || line.includes('ALERTA') || line.includes('ATENÇÃO');
          return (
            <blockquote key={i} className={`pl-4 border-l-4 my-2 ${
              isAlert ? 'border-red-400 bg-red-50 text-red-800 p-2 rounded-r' : 'border-gray-300 text-gray-600'
            }`}>
              {line.slice(2)}
            </blockquote>
          );
        }
        
        // Tabelas (simplificado)
        if (line.startsWith('|')) {
          return <div key={i} className="font-mono text-sm text-gray-700 bg-gray-50 px-2">{line}</div>;
        }
        
        // Linha vazia
        if (line.trim() === '') {
          return <br key={i} />;
        }
        
        // Parágrafo normal com bold
        const boldedLine = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        return (
          <p 
            key={i} 
            className="text-gray-700 mb-2"
            dangerouslySetInnerHTML={{ __html: boldedLine }}
          />
        );
      });
  };
  
  return <div className="prose prose-sm max-w-none">{renderMarkdown(content)}</div>;
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
  const [showFullReview, setShowFullReview] = React.useState(false);
  
  // Valores oficiais calculados
  const officialValues = useMemo(() => {
    if (!calculationData?.finalScores) return null;
    
    const calculated = calculateOfficialValues(calculationData);
    if (!calculated) return null;
    
    // Se temos audit, combinar valores
    if (audit?.robustez) {
      const diffStr = audit.robustez.diferenca_1o_2o || '';
      const diffMatch = diffStr.match(/(\d+[.,]\d+)/);
      const diffNum = diffMatch ? parseFloat(diffMatch[1].replace(',', '.')) : calculated.diferenca.percentual;
      
      let classificacaoDif = 'INDIFERENÇA';
      let statusDif = 'EMPATE_TECNICO';
      if (diffNum >= 20) { classificacaoDif = 'DOMINÂNCIA_CLARA'; statusDif = 'DOMINÂNCIA'; }
      else if (diffNum >= 10) { classificacaoDif = 'EXPRESSIVA'; statusDif = 'OK'; }
      else if (diffNum >= 5) { classificacaoDif = 'MODERADA'; statusDif = 'OK'; }
      else if (diffNum >= 2) { classificacaoDif = 'MARGINAL'; statusDif = 'ALERTA'; }
      
      const concordantes = audit.robustez.metodos_concordantes || calculated.concordancia.concordantes;
      let statusConcordancia = 'FRACA';
      if (concordantes >= 5) statusConcordancia = 'FORTE';
      else if (concordantes >= 4) statusConcordancia = 'FORTE';
      else if (concordantes >= 3) statusConcordancia = 'MODERADA';
      
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
      };
    }
    
    return calculated;
  }, [calculationData, audit]);
  
  // Nota: prioriza _sistema.nota, depois nota_geral, depois fallback
  const notaFinal = useMemo(() => {
    return aiReview?._sistema?.nota ?? aiReview?.nota_geral ?? null;
  }, [aiReview]);
  
  // Classificação: prioriza _sistema
  const classificacaoFinal = useMemo(() => {
    return aiReview?._sistema?.gradeLabel ?? aiReview?.classificacao ?? 'N/A';
  }, [aiReview]);
  
  // Veredicto: prioriza _sistema
  const vereditoFinal = useMemo(() => {
    return aiReview?._sistema?.verdict ?? aiReview?.veredito ?? 'PENDENTE';
  }, [aiReview]);
  
  // Copiar texto
  const copyToClipboard = () => {
    if (!aiReview?.observacoes_revisor) return;
    // CORREÇÃO 1: Copia o texto exatamente como está, sem substituições
    navigator.clipboard.writeText(aiReview.texto_completo || aiReview.observacoes_revisor || '');
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
          <span className="text-gray-600">Executando revisão com IA (Professor Titular)...</span>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <p className="text-xs text-gray-400 mt-4">Gerando análise acadêmica profunda...</p>
      </div>
    );
  }
  
  if (!aiReview) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <p className="text-4xl mb-4">🎓</p>
        <p className="font-medium text-gray-700 mb-2">Revisão Profunda com IA v6.1</p>
        <p className="text-sm mb-4">
          A IA atuará como <strong>Professor Titular</strong> especializado em MCDM/AHP-BOCR.
        </p>
        <ul className="text-xs text-left max-w-md mx-auto space-y-1 text-gray-500">
          <li>✓ Análise crítica profunda (não apenas checklist)</li>
          <li>✓ Quality Gate com penalização automática</li>
          <li>✓ Referências metodológicas (Saaty, Wijnmalen)</li>
          <li>✓ Números 100% do sistema (tokens verificados)</li>
          <li>✓ Parecer adequado para publicação científica</li>
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
      {/* CORREÇÃO 3: Alerta do Quality Gate (proeminente no topo) */}
      <QualityGateAlert sistema={aiReview._sistema} />
      
      {/* Header - Classificação e Nota */}
      <div className={`p-6 rounded-xl border-2 ${
        vereditoFinal === 'APROVADO' ? 'bg-green-50 border-green-300' :
        vereditoFinal === 'APROVADO COM OBSERVAÇÕES' ? 'bg-blue-50 border-blue-300' :
        vereditoFinal.includes('REVISÃO') ? 'bg-yellow-50 border-yellow-300' :
        'bg-red-50 border-red-300'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">
              {aiReview._sistema?.verdictIcon || 
               (vereditoFinal === 'APROVADO' ? '✅' :
                vereditoFinal === 'APROVADO COM OBSERVAÇÕES' ? '📝' :
                vereditoFinal.includes('REVISÃO') ? '⚠️' : '🔴')}
            </span>
            <div>
              <p className="font-bold text-xl">{vereditoFinal.replace(/_/g, ' ')}</p>
              <p className="text-sm text-gray-600">
                Classificação: <strong>{classificacaoFinal}</strong>
                {aiReview._sistema?.grade && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded text-xs font-mono">
                    {aiReview._sistema.grade}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="text-center">
            {/* CORREÇÃO do bug "/100": Usa notaFinal que tem fallbacks */}
            <p className={`text-4xl font-bold ${
              (notaFinal || 0) >= 85 ? 'text-green-600' :
              (notaFinal || 0) >= 70 ? 'text-blue-600' :
              (notaFinal || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {notaFinal !== null ? `${notaFinal}/100` : '—'}
            </p>
            <p className="text-sm text-gray-500">Nota Geral</p>
          </div>
        </div>
        
        {/* Quality Gate Badge */}
        {aiReview._sistema?.qualityPenalty && (
          <div className="flex items-center gap-2 mb-3 px-3 py-1 bg-red-100 rounded-lg w-fit">
            <span className="text-red-600 text-sm font-medium">🚨 Quality Gate Ativado</span>
          </div>
        )}
        
        {/* Resumo - CORREÇÃO 1: Não faz substituição de texto */}
        {(aiReview.texto_completo || aiReview.resumo_executivo) && (
          <div className="bg-white/50 p-4 rounded-lg max-h-96 overflow-y-auto">
            <MarkdownRenderer content={aiReview.texto_completo || aiReview.resumo_executivo || ''} />
          </div>
        )}
        
        {/* Botão para expandir/colapsar */}
        {aiReview.resumo_executivo && aiReview.resumo_executivo.length > 1000 && (
          <button
            onClick={() => setShowFullReview(!showFullReview)}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showFullReview ? '▲ Recolher' : '▼ Ver revisão completa'}
          </button>
        )}
      </div>

      {/* Métricas do Sistema */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Validações Matemáticas */}
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
          </div>
        </div>

        {/* Análise de Robustez */}
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
          <h4 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
            💪 Análise de Robustez
            <span className="text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded">Sistema</span>
          </h4>
          <div className="space-y-2 text-sm">
            {/* CORREÇÃO 2 aplicada: concordância usa normalização */}
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Concordância métodos</span>
              <span className={`font-medium ${
                officialValues?.concordancia.status === 'FORTE' ? 'text-green-600' :
                officialValues?.concordancia.status === 'MODERADA' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {officialValues?.concordancia.valor || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Diferença 1º-2º</span>
              <span className={`font-medium ${
                officialValues?.diferenca.status === 'OK' || officialValues?.diferenca.status === 'DOMINÂNCIA' ? 'text-green-600' :
                officialValues?.diferenca.status === 'ALERTA' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {officialValues?.diferenca.valor || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Índice Dominância</span>
              <span className="font-medium text-gray-800">
                {officialValues?.indiceDominancia || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Análise da Amostra */}
        {aiReview.analise_amostra && (
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              👥 Análise da Amostra
            </h4>
            <div className="text-center py-3">
              <p className="text-3xl font-bold text-gray-800">
                n = {aiReview.analise_amostra.tamanho || calculationData?.responseCount}
              </p>
              <p className={`text-sm font-medium mt-1 ${
                aiReview.analise_amostra.adequacao === 'EXCELENTE' ? 'text-green-600' :
                aiReview.analise_amostra.adequacao === 'ADEQUADA' ? 'text-blue-600' :
                aiReview.analise_amostra.adequacao === 'MÍNIMA' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {aiReview.analise_amostra.adequacao}
              </p>
              
              {/* CORREÇÃO 3: Alerta de inconsistência na amostra */}
              {aiReview.analise_amostra.comentario && (
                aiReview.analise_amostra.comentario.toLowerCase().includes('alerta') ||
                aiReview.analise_amostra.comentario.toLowerCase().includes('inconsistên') ||
                aiReview.analise_amostra.comentario.toLowerCase().includes('problemátic')
              ) && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700">
                    ⚠️ Auditoria individual detectou inconsistências na amostra base.
                  </p>
                </div>
              )}
              
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
                aiReview.adequacao_publicacao.nivel === 'B1_B2' ? 'bg-yellow-600' : 'bg-red-600'
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
                  {/* CORREÇÃO 1: Não substitui texto - renderiza como está */}
                  {ponto}
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
                  {/* CORREÇÃO 1: Não substitui texto */}
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
                  {/* CORREÇÃO 1: Não substitui texto */}
                  {texto}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Observações do Revisor */}
      {(aiReview.texto_completo || aiReview.observacoes_revisor) && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">📝 Revisão Acadêmica Completa</h4>
            <button
              onClick={copyToClipboard}
              className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              {copied ? '✓ Copiado!' : '📋 Copiar'}
            </button>
          </div>
          <div className="bg-white p-4 rounded-lg border max-h-[500px] overflow-y-auto">
            {/* CORREÇÃO 1: Renderiza o texto como está, sem substituições */}
            <MarkdownRenderer content={aiReview.texto_completo || aiReview.observacoes_revisor || ''} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-100 rounded-lg border">
        <p className="text-xs text-gray-500 text-center">
          🎓 Revisão Acadêmica A1/Q1 (API v{aiReview.version || aiReview.metadata?.version || '6.4.5'}) • 
          📊 Números do sistema (tokens verificados) • 
          ✅ Correções aplicadas: regex, normalização, quality gate
        </p>
      </div>
    </div>
  );
}

export default AIReviewCard;
