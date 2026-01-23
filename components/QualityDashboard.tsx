// components/QualityDashboard.tsx
// Dashboard de Simulação Interativo para Gestão de Qualidade dos Respondentes
// Design focado em UX com Sticky Header, Agrupamento Inteligente e Feedback Visual

'use client';

import React, { useState, useMemo, useCallback } from 'react';

// ============================================================
// TIPOS
// ============================================================

interface Respondent {
  id: string;
  name?: string;
  cr: number;
  status: 'CONFIÁVEL' | 'REVISAR' | 'SUSPEITO' | 'CRÍTICO';
  overallScore?: number;
  isSimulated?: boolean;
  metrics?: { avgCR: number; [key: string]: any };
  flags?: Array<{ type: string; severity: string; details?: string }>;
}

interface QualityDashboardProps {
  respondents: Respondent[];
  onRecalculate?: (activeIds: string[]) => Promise<void>;
  isRecalculating?: boolean;
  originalCR?: number;
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

// Card de Estatística com Comparação Antes/Depois
const StatCard = ({ 
  label, 
  icon, 
  oldValue, 
  newValue, 
  format = 'number',
  invertColors = false,
  suffix = ''
}: {
  label: string;
  icon: string;
  oldValue: number;
  newValue: number;
  format?: 'number' | 'percent' | 'score';
  invertColors?: boolean;
  suffix?: string;
}) => {
  const formatValue = (val: number) => {
    if (format === 'percent') return `${(val * 100).toFixed(2)}%`;
    if (format === 'score') return val.toFixed(0);
    return val.toString();
  };

  const diff = newValue - oldValue;
  const isImproved = invertColors ? diff > 0 : diff < 0;
  const hasChange = Math.abs(diff) > 0.0001;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 min-w-[160px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        {hasChange && (
          <span className="text-lg text-gray-400 line-through font-mono">
            {formatValue(oldValue)}
          </span>
        )}
        <span className="text-xl font-bold text-gray-400">→</span>
        <span className={`text-2xl font-bold font-mono ${
          !hasChange ? 'text-gray-700' :
          isImproved ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatValue(newValue)}{suffix}
        </span>
      </div>
      {hasChange && (
        <div className={`mt-1 text-xs font-medium ${isImproved ? 'text-green-600' : 'text-red-600'}`}>
          {isImproved ? '↓' : '↑'} {format === 'percent' 
            ? `${Math.abs(diff * 100).toFixed(2)}%` 
            : Math.abs(diff).toFixed(format === 'score' ? 0 : 2)}
        </div>
      )}
    </div>
  );
};

// Barra de Progresso do CR Individual
const CRProgressBar = ({ cr, limit = 0.10 }: { cr: number; limit?: number }) => {
  const percentage = Math.min((cr / (limit * 2)) * 100, 100);
  const isAboveLimit = cr > limit;
  const isCritical = cr > limit * 2;

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden relative">
        {/* Marcador do limite (10%) */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
          style={{ left: '50%' }}
        />
        {/* Barra de progresso */}
        <div 
          className={`h-full rounded-full transition-all duration-300 ${
            isCritical ? 'bg-red-500' :
            isAboveLimit ? 'bg-orange-500' :
            cr > limit * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`font-mono text-sm font-bold min-w-[60px] text-right ${
        isCritical ? 'text-red-600' :
        isAboveLimit ? 'text-orange-600' :
        'text-green-600'
      }`}>
        {(cr * 100).toFixed(2)}%
      </span>
    </div>
  );
};

// Toggle Switch Personalizado
const ToggleSwitch = ({ 
  checked, 
  onChange, 
  disabled = false 
}: { 
  checked: boolean; 
  onChange: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`
      relative w-14 h-7 rounded-full transition-all duration-300 
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${checked ? 'bg-indigo-600' : 'bg-gray-300'}
    `}
  >
    <span className={`
      absolute top-1 w-5 h-5 bg-white rounded-full shadow-md
      transition-all duration-300 ease-in-out
      ${checked ? 'left-8' : 'left-1'}
    `}>
      <span className={`
        absolute inset-0 flex items-center justify-center text-xs
        ${checked ? 'text-indigo-600' : 'text-gray-400'}
      `}>
        {checked ? '✓' : '✕'}
      </span>
    </span>
  </button>
);

// Badge de Status
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    'CRÍTICO': { bg: 'bg-red-100 border-red-300', text: 'text-red-800', icon: '🔴' },
    'SUSPEITO': { bg: 'bg-orange-100 border-orange-300', text: 'text-orange-800', icon: '🟠' },
    'REVISAR': { bg: 'bg-yellow-100 border-yellow-300', text: 'text-yellow-800', icon: '⚠️' },
    'CONFIÁVEL': { bg: 'bg-green-100 border-green-300', text: 'text-green-800', icon: '✅' },
  };
  const c = config[status] || config['REVISAR'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text}`}>
      <span>{c.icon}</span>
      {status}
    </span>
  );
};

// Linha do Respondente
const RespondentRow = ({
  respondent,
  isExcluded,
  onToggle,
  crLimit = 0.10
}: {
  respondent: Respondent;
  isExcluded: boolean;
  onToggle: () => void;
  crLimit?: number;
}) => {
  const cr = respondent.cr || respondent.metrics?.avgCR || 0;
  const isProblematic = respondent.status === 'SUSPEITO' || respondent.status === 'CRÍTICO';

  return (
    <div className={`
      flex items-center gap-4 p-4 rounded-xl transition-all duration-300
      ${isExcluded 
        ? 'opacity-40 bg-gray-50 border border-dashed border-gray-300' 
        : isProblematic
          ? 'bg-red-50/50 border border-red-200 hover:border-red-300'
          : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }
    `}>
      {/* Toggle */}
      <div className="flex-shrink-0">
        <ToggleSwitch checked={!isExcluded} onChange={onToggle} />
      </div>

      {/* Info Principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
            {respondent.id.slice(0, 10)}...
          </span>
          <StatusBadge status={respondent.status} />
          {respondent.isSimulated && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
              SIMULADO
            </span>
          )}
        </div>

        {/* Flags/Problemas */}
        {respondent.flags && respondent.flags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {respondent.flags.slice(0, 4).map((flag, idx) => (
              <span 
                key={idx}
                className={`px-2 py-0.5 rounded text-xs ${
                  flag.severity === 'GRAVE' ? 'bg-red-100 text-red-700' :
                  flag.severity === 'ALERTA' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}
                title={flag.details}
              >
                {flag.type.replace(/_/g, ' ')}
              </span>
            ))}
            {respondent.flags.length > 4 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                +{respondent.flags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-center min-w-[60px]">
        <div className="text-xs text-gray-500 mb-1">Score</div>
        <div className={`text-lg font-bold ${
          (respondent.overallScore || 0) >= 80 ? 'text-green-600' :
          (respondent.overallScore || 0) >= 60 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {respondent.overallScore || '—'}
        </div>
      </div>

      {/* CR com Barra de Progresso */}
      <div className="flex-shrink-0 w-[200px]">
        <div className="text-xs text-gray-500 mb-1">Taxa de Consistência (CR)</div>
        <CRProgressBar cr={cr} limit={crLimit} />
      </div>
    </div>
  );
};

// Seção Colapsável
const CollapsibleSection = ({
  title,
  icon,
  count,
  defaultOpen = true,
  variant = 'default',
  children
}: {
  title: string;
  icon: string;
  count: number;
  defaultOpen?: boolean;
  variant?: 'danger' | 'success' | 'default';
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const bgColors = {
    danger: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
    default: 'bg-gray-50 border-gray-200'
  };

  const textColors = {
    danger: 'text-red-800',
    success: 'text-green-800',
    default: 'text-gray-800'
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${bgColors[variant]}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 ${textColors[variant]} hover:bg-opacity-80 transition-colors`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold">{title}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            variant === 'danger' ? 'bg-red-200 text-red-800' :
            variant === 'success' ? 'bg-green-200 text-green-800' :
            'bg-gray-200 text-gray-700'
          }`}>
            {count}
          </span>
        </div>
        <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      
      <div className={`transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-4 pt-0 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function QualityDashboard({
  respondents,
  onRecalculate,
  isRecalculating = false,
  originalCR = 0
}: QualityDashboardProps) {
  // Estado de exclusão
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Respondentes ativos (não excluídos)
  const activeRespondents = useMemo(() => 
    respondents.filter(r => !excludedIds.has(r.id)),
    [respondents, excludedIds]
  );

  // Cálculos
  const stats = useMemo(() => {
    const calcCR = (list: Respondent[]) => {
      if (list.length === 0) return 0;
      const crs = list.map(r => r.cr || r.metrics?.avgCR || 0).filter(c => c > 0);
      return crs.length > 0 ? crs.reduce((a, b) => a + b, 0) / crs.length : 0;
    };

    const calcScore = (list: Respondent[]) => {
      if (list.length === 0) return 0;
      return list.map(r => r.overallScore || 0).reduce((a, b) => a + b, 0) / list.length;
    };

    const original = {
      total: respondents.length,
      cr: originalCR || calcCR(respondents),
      score: calcScore(respondents)
    };

    const current = {
      total: activeRespondents.length,
      cr: calcCR(activeRespondents),
      score: calcScore(activeRespondents)
    };

    // Contadores por status
    const problematic = respondents.filter(r => 
      r.status === 'SUSPEITO' || r.status === 'CRÍTICO' || r.status === 'REVISAR'
    );
    const reliable = respondents.filter(r => r.status === 'CONFIÁVEL');

    // Quantos problemáticos ainda estão ativos
    const activeProblematic = problematic.filter(r => !excludedIds.has(r.id));

    return { original, current, problematic, reliable, activeProblematic };
  }, [respondents, activeRespondents, excludedIds, originalCR]);

  // Ordenar respondentes por CR (decrescente)
  const sortedProblematic = useMemo(() => 
    [...stats.problematic].sort((a, b) => (b.cr || 0) - (a.cr || 0)),
    [stats.problematic]
  );

  const sortedReliable = useMemo(() => 
    [...stats.reliable].sort((a, b) => (b.cr || 0) - (a.cr || 0)),
    [stats.reliable]
  );

  // Qualidade geral baseada na simulação
  const qualityStatus = useMemo(() => {
    const cr = stats.current.cr;
    const n = stats.current.total;

    if (n < 5) return { label: 'AMOSTRA INSUFICIENTE', color: 'bg-red-500', icon: '⚠️' };
    if (cr <= 0.05) return { label: 'EXCELENTE', color: 'bg-green-500', icon: '🏆' };
    if (cr <= 0.08) return { label: 'BOM', color: 'bg-green-400', icon: '✅' };
    if (cr <= 0.10) return { label: 'ACEITÁVEL', color: 'bg-yellow-500', icon: '👍' };
    if (cr <= 0.15) return { label: 'REVISAR', color: 'bg-orange-500', icon: '⚠️' };
    return { label: 'CRÍTICO', color: 'bg-red-500', icon: '🚨' };
  }, [stats.current]);

  // Handlers
  const toggleRespondent = useCallback((id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const autoExcludeSuspects = useCallback(() => {
    const suspectIds = respondents
      .filter(r => r.status === 'SUSPEITO' || r.status === 'CRÍTICO' || (r.cr || 0) > 0.20)
      .map(r => r.id);
    setExcludedIds(new Set(suspectIds));
  }, [respondents]);

  const excludeAllProblematic = useCallback(() => {
    const ids = stats.problematic.map(r => r.id);
    setExcludedIds(new Set(ids));
  }, [stats.problematic]);

  const clearAllExclusions = useCallback(() => {
    setExcludedIds(new Set());
  }, []);

  const handleRecalculate = useCallback(async () => {
    if (onRecalculate) {
      await onRecalculate(activeRespondents.map(r => r.id));
    }
  }, [onRecalculate, activeRespondents]);

  // Contadores para botões
  const suspectCount = respondents.filter(r => 
    r.status === 'SUSPEITO' || r.status === 'CRÍTICO' || (r.cr || 0) > 0.20
  ).length;

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* ═══════════════════════════════════════════════════════════
          STICKY HEADER - Barra de Impacto Fixa
          ═══════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-50 to-indigo-50 shadow-lg rounded-xl p-5 mb-6 border border-indigo-100">
        {/* Título e Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎛️</span>
            <h2 className="text-xl font-bold text-gray-800">Simulador de Impacto</h2>
            <span className={`${qualityStatus.color} text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1`}>
              {qualityStatus.icon} {qualityStatus.label}
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            <button
              onClick={clearAllExclusions}
              disabled={excludedIds.size === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                excludedIds.size === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 shadow-sm'
              }`}
            >
              🔄 Resetar
            </button>

            <button
              onClick={autoExcludeSuspects}
              disabled={suspectCount === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                suspectCount === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-md'
              }`}
            >
              ✨ Auto-Excluir Suspeitos ({suspectCount})
            </button>

            {onRecalculate && (
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating || excludedIds.size === 0}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isRecalculating || excludedIds.size === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md'
                }`}
              >
                {isRecalculating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Calculando...
                  </span>
                ) : '🚀 Recalcular AHP'}
              </button>
            )}
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Amostra Ativa"
            icon="👥"
            oldValue={stats.original.total}
            newValue={stats.current.total}
            format="number"
            invertColors={true}
          />
          <StatCard
            label="CR Global"
            icon="📊"
            oldValue={stats.original.cr}
            newValue={stats.current.cr}
            format="percent"
            invertColors={false}
          />
          <StatCard
            label="Score Médio"
            icon="⭐"
            oldValue={stats.original.score}
            newValue={stats.current.score}
            format="score"
            invertColors={true}
            suffix="/100"
          />
          
          {/* Card Especial - Resumo de Exclusões */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚫</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Excluídos</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-600">{excludedIds.size}</span>
              <span className="text-gray-400">de {respondents.length}</span>
            </div>
            {excludedIds.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from(excludedIds).slice(0, 3).map(id => (
                  <span key={id} className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                    {id.slice(0, 6)}
                  </span>
                ))}
                {excludedIds.size > 3 && (
                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    +{excludedIds.size - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Alertas Contextuais */}
        {stats.current.total < 5 && stats.current.total > 0 && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="text-sm text-red-800">
              <strong>Amostra insuficiente!</strong> Com apenas {stats.current.total} respondentes, 
              os resultados podem não ser estatisticamente significativos. Mínimo recomendado: 5-7.
            </p>
          </div>
        )}

        {excludedIds.size > 0 && stats.current.cr < stats.original.cr * 0.8 && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <p className="text-sm text-green-800">
              <strong>Melhoria significativa!</strong> A exclusão reduziu o CR em{' '}
              {(((stats.original.cr - stats.current.cr) / stats.original.cr) * 100).toFixed(1)}%, 
              aumentando a consistência dos julgamentos.
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          LISTA DE RESPONDENTES
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-auto space-y-6 pb-6">
        
        {/* Seção: Atenção Requerida */}
        {sortedProblematic.length > 0 && (
          <CollapsibleSection
            title="Atenção Requerida"
            icon="⚠️"
            count={sortedProblematic.length}
            defaultOpen={true}
            variant="danger"
          >
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-red-200">
              <p className="text-sm text-red-700">
                Respondentes com inconsistências ou padrões suspeitos. Revise antes de incluir no cálculo final.
              </p>
              <button
                onClick={excludeAllProblematic}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir Todos ({stats.activeProblematic.length} ativos)
              </button>
            </div>
            
            {sortedProblematic.map(r => (
              <RespondentRow
                key={r.id}
                respondent={r}
                isExcluded={excludedIds.has(r.id)}
                onToggle={() => toggleRespondent(r.id)}
              />
            ))}
          </CollapsibleSection>
        )}

        {/* Seção: Confiáveis */}
        {sortedReliable.length > 0 && (
          <CollapsibleSection
            title="Confiáveis"
            icon="✅"
            count={sortedReliable.length}
            defaultOpen={sortedProblematic.length === 0}
            variant="success"
          >
            <p className="text-sm text-green-700 mb-3 pb-3 border-b border-green-200">
              Respondentes com julgamentos consistentes (CR ≤ 10%). Raramente precisam ser excluídos.
            </p>
            
            {sortedReliable.map(r => (
              <RespondentRow
                key={r.id}
                respondent={r}
                isExcluded={excludedIds.has(r.id)}
                onToggle={() => toggleRespondent(r.id)}
              />
            ))}
          </CollapsibleSection>
        )}

        {/* Estado Vazio */}
        {respondents.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <span className="text-5xl mb-4 block">📭</span>
            <p className="text-gray-600 font-medium">Nenhum respondente para analisar</p>
            <p className="text-sm text-gray-500 mt-1">Execute a análise de qualidade primeiro</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RODAPÉ INFORMATIVO
          ═══════════════════════════════════════════════════════════ */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mt-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">📚</span>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Referência Metodológica</p>
            <p>
              <strong>CR &gt; 10%:</strong> Inconsistente (Saaty, 1980) |{' '}
              <strong>CR &gt; 20%:</strong> Suspeito de resposta aleatória |{' '}
              <strong>Padrões uniformes:</strong> Possível gaming/desatenção (Forman & Peniwati, 1998)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
