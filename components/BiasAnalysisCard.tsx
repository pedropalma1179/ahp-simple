// components/BiasAnalysisCard.tsx
// Card de Análise de Viés e Fairness v2.0
// Compatível com bias-detection.ts v2.0
// Cada indicador exibe: referência, limiar publicado, valor observado
'use client';

import React, { useState } from 'react';

interface BiasIndicator {
  type: string;
  severity: 'INFO' | 'CRITICAL';
  source: string;
  threshold: string;
  observedValue: string;
  respondentId?: string;
  respondentName?: string;
  description: string;
  evidence: string;
  recommendation: string;
}

interface BiasAnalysisResult {
  overallRiskLevel: 'LOW' | 'MODERATE' | 'CRITICAL';
  crComplianceRate: number;
  disparateImpact: number | null;
  overallScore: number;
  totalIndicators: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  indicators: BiasIndicator[];
  summary: string;
  academicNote: string;
}

const RISK_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  LOW: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-600' },
  MODERATE: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-500' },
  CRITICAL: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-600' },
};

const TYPE_LABELS: Record<string, string> = {
  CR_INDIVIDUAL_VIOLATION: 'Violação CR Individual',
  CR_COLLECTIVE_PATTERN: 'Padrão Coletivo de CR',
  DISPARATE_IMPACT_BELOW: 'Impacto Díspar (DI < 0.80)',
  DISPARATE_IMPACT_ABOVE: 'Discriminação Reversa (DI > 1.25)',
  DI_COMPLIANT: 'DI Conforme',
  DI_NOT_CONFIGURED: 'DI Não Configurado',
};

export default function BiasAnalysisCard({
  biasAnalysis,
  alternatives = [],
  sensitiveGroups,
  onSaveSensitiveGroups,
}: {
  biasAnalysis: BiasAnalysisResult;
  alternatives?: Array<{ code: string; name: string; description?: string }>;
  sensitiveGroups?: {
    attribute: string;
    discriminated: string[];
    privileged: string[];
  } | null;
  onSaveSensitiveGroups?: (config: {
    attribute: string;
    discriminated: string[];
    privileged: string[];
  } | null) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAcademic, setShowAcademic] = useState(false);
  const style = RISK_STYLES[biasAnalysis.overallRiskLevel] || RISK_STYLES.LOW;

  // Estado local para o formulário de configuração
  const [showDIConfig, setShowDIConfig] = useState(false);
  const [diAttribute, setDiAttribute] = useState(sensitiveGroups?.attribute || '');
  const [diGroups, setDiGroups] = useState<Record<string, 'privileged' | 'discriminated'>>(
    () => {
      const groups: Record<string, 'privileged' | 'discriminated'> = {};
      if (sensitiveGroups) {
        sensitiveGroups.privileged.forEach(code => { groups[code] = 'privileged'; });
        sensitiveGroups.discriminated.forEach(code => { groups[code] = 'discriminated'; });
      }
      return groups;
    }
  );

  // Sincronizar estado local quando sensitiveGroups mudar externamente
  React.useEffect(() => {
    if (sensitiveGroups) {
      setDiAttribute(sensitiveGroups.attribute);
      const groups: Record<string, 'privileged' | 'discriminated'> = {};
      sensitiveGroups.privileged.forEach(code => { groups[code] = 'privileged'; });
      sensitiveGroups.discriminated.forEach(code => { groups[code] = 'discriminated'; });
      setDiGroups(groups);
    } else {
      // Se for removido externamente, limpar local (opcional, mas bom pra consistência)
      // Não limpamos inputs para não perder trabalho em andamento se o user só fechou e abriu
    }
  }, [sensitiveGroups]);

  // Atributos sugeridos (baseados em Dodevska et al., 2023)
  const suggestedAttributes = [
    'Maturidade Tecnológica',
    'Intensidade de Capital (CAPEX)',
    'Complexidade de Implementação',
    'Risco de Disrupção',
    'Outro (personalizado)',
  ];

  const handleSaveDI = () => {
    const privileged = Object.entries(diGroups)
      .filter(([, g]) => g === 'privileged')
      .map(([code]) => code);
    const discriminated = Object.entries(diGroups)
      .filter(([, g]) => g === 'discriminated')
      .map(([code]) => code);

    if (!diAttribute.trim()) {
      alert('Defina o atributo sensível.');
      return;
    }
    if (privileged.length === 0 || discriminated.length === 0) {
      alert('Classifique pelo menos uma alternativa como Privilegiada e uma como Discriminada.');
      return;
    }

    onSaveSensitiveGroups?.({
      attribute: diAttribute.trim(),
      privileged,
      discriminated,
    });
    setShowDIConfig(false);
  };

  const handleRemoveDI = () => {
    if (confirm('Tem certeza que deseja remover a configuração de Disparate Impact?')) {
      onSaveSensitiveGroups?.(null);
      setDiAttribute('');
      setDiGroups({});
      setShowDIConfig(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`${style.bg} ${style.border} border-b px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <h3 className="font-semibold text-gray-800">Análise de Viés e Fairness</h3>
              <p className="text-xs text-gray-500">
                Saaty (1977) · Dodevska et al. (2023) · Feldman et al. (2015)
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${style.badge}`}>
            {biasAnalysis.overallRiskLevel}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Resumo */}
        <p className="text-sm text-gray-700 leading-relaxed">{biasAnalysis.summary}</p>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-lg border ${biasAnalysis.crComplianceRate >= 1.0 ? 'bg-green-50 border-green-200' :
              biasAnalysis.crComplianceRate === 0 ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
            }`}>
            <div className="text-2xl font-bold text-gray-800">
              {(biasAnalysis.crComplianceRate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">Conformidade CR ≤ 0.10</div>
            <div className="text-xs text-gray-400">Saaty (1977)</div>
          </div>

          <div className={`p-4 rounded-lg border ${biasAnalysis.disparateImpact === null ? 'bg-gray-50 border-gray-200' :
              biasAnalysis.disparateImpact >= 0.80 && biasAnalysis.disparateImpact <= 1.25
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
            <div className="text-2xl font-bold text-gray-800">
              {biasAnalysis.disparateImpact !== null
                ? biasAnalysis.disparateImpact.toFixed(3)
                : '—'}
            </div>
            <div className="text-xs text-gray-600 mt-1">Disparate Impact</div>
            <div className="text-xs text-gray-400">
              {biasAnalysis.disparateImpact !== null ? 'Faixa: [0.80, 1.25]' : 'Não configurado'}
            </div>
          </div>
        </div>

        {/* Botão + Painel de Configuração DI */}
        {alternatives.length > 0 && onSaveSensitiveGroups && (
          <div className="w-full">
            {!showDIConfig ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDIConfig(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  ⚙️ {sensitiveGroups ? 'Editar' : 'Configurar'} Disparate Impact
                </button>
                {sensitiveGroups && (
                  <button
                    onClick={handleRemoveDI}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    🗑️ Remover
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-indigo-800">
                    ⚙️ Configurar Disparate Impact
                  </h5>
                  <button
                    onClick={() => setShowDIConfig(false)}
                    className="text-gray-400 hover:text-gray-600 text-lg"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-indigo-600">
                  Defina um atributo sensível e classifique cada alternativa como <strong>privilegiada (s=0)</strong> ou <strong>discriminada (s=1)</strong>, conforme Dodevska et al. (2023).
                </p>

                {/* Atributo sensível */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Atributo Sensível
                  </label>
                  <select
                    value={suggestedAttributes.includes(diAttribute) ? diAttribute : 'Outro (personalizado)'}
                    onChange={(e) => {
                      if (e.target.value === 'Outro (personalizado)') {
                        setDiAttribute('');
                      } else {
                        setDiAttribute(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Selecione...</option>
                    {suggestedAttributes.map(attr => (
                      <option key={attr} value={attr}>{attr}</option>
                    ))}
                  </select>
                  {(!suggestedAttributes.includes(diAttribute) || diAttribute === '') && (
                    <input
                      type="text"
                      value={diAttribute}
                      onChange={(e) => setDiAttribute(e.target.value)}
                      placeholder="Digite o nome do atributo sensível..."
                      className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  )}
                </div>

                {/* Classificação das alternativas */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Classificação das Alternativas
                  </label>
                  <div className="space-y-2">
                    {alternatives.map((alt) => (
                      <div
                        key={alt.code}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-800">{alt.code}</span>
                          <span className="text-sm text-gray-500 ml-2">{alt.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setDiGroups(prev => ({ ...prev, [alt.code]: 'privileged' }))}
                            className={`px-3 py-1 text-xs font-medium rounded-l-lg border transition-colors ${diGroups[alt.code] === 'privileged'
                                ? 'bg-green-100 border-green-400 text-green-800'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                          >
                            s=0 Privilegiada
                          </button>
                          <button
                            onClick={() => setDiGroups(prev => ({ ...prev, [alt.code]: 'discriminated' }))}
                            className={`px-3 py-1 text-xs font-medium rounded-r-lg border transition-colors ${diGroups[alt.code] === 'discriminated'
                                ? 'bg-red-100 border-red-400 text-red-800'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                          >
                            s=1 Discriminada
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Referência acadêmica */}
                <div className="p-2 bg-white border border-indigo-100 rounded text-xs text-gray-500">
                  📚 <strong>Ref:</strong> Dodevska et al. (2023, Eq. 14-15). DI = avg(s=1) / avg(s=0).
                  Limites: 0.80 ≤ DI ≤ 1.25 (Dodevska et al., 2023, Eq. 14-15).
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowDIConfig(false)}
                    className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDI}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    💾 Salvar e Recalcular
                  </button>
                </div>
              </div>
            )}

            {/* Resumo da configuração ativa */}
            {sensitiveGroups && !showDIConfig && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                ✅ DI configurado: <strong>{sensitiveGroups.attribute}</strong>
                {' | '}Privilegiada: {sensitiveGroups.privileged.join(', ')}
                {' | '}Discriminada: {sensitiveGroups.discriminated.join(', ')}
                <span className="text-green-500 ml-1">
                  (Execute a Revisão IA para calcular)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Contadores */}
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
            <span className="text-sm">🔴</span>
            <span className="text-sm font-medium text-red-700">{biasAnalysis.criticalCount}</span>
            <span className="text-xs text-red-600">violações</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
            <span className="text-sm">ℹ️</span>
            <span className="text-sm font-medium text-blue-700">{biasAnalysis.infoCount}</span>
            <span className="text-xs text-blue-600">informativos</span>
          </div>
        </div>

        {/* Indicadores (expandível) */}
        {biasAnalysis.indicators.length > 0 && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              <span>{showDetails ? '▼' : '▶'}</span>
              {showDetails ? 'Ocultar' : 'Ver'} {biasAnalysis.indicators.length} indicadores
            </button>

            {showDetails && (
              <div className="mt-3 space-y-3">
                {Object.entries(
                  biasAnalysis.indicators.reduce<Record<string, BiasIndicator[]>>((acc, ind) => {
                    (acc[ind.type] = acc[ind.type] || []).push(ind);
                    return acc;
                  }, {})
                ).map(([type, inds]) => (
                  <div key={type} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <span className="text-sm font-semibold text-gray-700">
                        {TYPE_LABELS[type] || type}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">({inds.length})</span>
                    </div>
                    <div className="divide-y">
                      {inds.slice(0, type === 'CR_INDIVIDUAL_VIOLATION' ? 5 : inds.length).map((ind, i) => (
                        <div key={i} className={`p-3 text-sm ${ind.severity === 'CRITICAL' ? 'bg-red-50/50' : 'bg-white'
                          }`}>
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5">{ind.severity === 'CRITICAL' ? '🔴' : 'ℹ️'}</span>
                            <div className="flex-1 space-y-1">
                              <p className="text-gray-800">{ind.description}</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                  📏 {ind.threshold}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                  📊 {ind.observedValue}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                <strong>Ref:</strong> {ind.source}
                              </p>
                              <p className="text-xs text-gray-600">
                                <strong>Recomendação:</strong> {ind.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {type === 'CR_INDIVIDUAL_VIOLATION' && inds.length > 5 && (
                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                          ... e mais {inds.length - 5} respondentes com CR {'>'} 0.10
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nota acadêmica (expandível) */}
        {biasAnalysis.academicNote && (
          <div>
            <button
              onClick={() => setShowAcademic(!showAcademic)}
              className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-800"
            >
              <span>{showAcademic ? '▼' : '▶'}</span>
              {showAcademic ? 'Ocultar' : 'Ver'} nota para dissertação
            </button>

            {showAcademic && (
              <div className="mt-3 p-4 bg-violet-50 border border-violet-200 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {biasAnalysis.academicNote}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
