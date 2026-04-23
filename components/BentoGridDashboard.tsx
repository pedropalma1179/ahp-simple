// components/BentoGridDashboard.tsx
// Dashboard Executivo AHP-BOCR - Bento Grid Layout
// Design: Apple-inspired, Enterprise-grade, Visual Claro
// VERSÃO CORRIGIDA: Português, NaN fix, Espaçamentos

'use client';

import React, { useState, useEffect } from 'react';

// ============================================================
// TIPOS
// ============================================================

interface Alternative {
  code: string;
  name: string;
  description?: string;
}

interface BentoGridDashboardProps {
  projectName: string;
  bocrWeights: number[];
  finalScores: Array<{
    code: string;
    name: string;
    score?: number;
    scoreAdditive?: number;
    rank?: number;
    B?: number;
    O?: number;
    C?: number;
    R?: number;
  }>;
  bocrConsistency: {
    cr: number;
    lambda?: number;
    ci?: number;
  };
  responseCount: number;
  alternatives?: Alternative[];
}

// ============================================================
// HELPER: Obter score válido
// ============================================================

const getValidScore = (item: BentoGridDashboardProps['finalScores'][0]): number => {
  // Tentar diferentes campos de score - v5.0 usa scoreSubtractive como principal
  const score = (item as any).scoreSubtractive ?? (item as any).scoreSubtractiveNorm ?? item.score ?? item.scoreAdditive ?? 0;
  // Verificar se é um número válido
  if (typeof score === 'number' && !isNaN(score) && isFinite(score)) {
    return score;
  }
  return 0;
};

// ============================================================
// DADOS BOCR - TUDO EM PORTUGUÊS
// ============================================================

const BOCR_CONFIG = {
  B: {
    label: 'Benefícios',
    icon: '↑',
    description: 'Ganhos tangíveis e imediatos',
    color: '#10B981',
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  },
  O: {
    label: 'Oportunidades',
    icon: '◈',
    description: 'Potencial estratégico futuro',
    color: '#3B82F6',
    gradient: 'from-blue-500/20 via-blue-500/5 to-transparent',
  },
  C: {
    label: 'Custos',
    icon: '↓',
    description: 'Investimentos necessários',
    color: '#F59E0B',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
  },
  R: {
    label: 'Riscos',
    icon: '◇',
    description: 'Incertezas identificadas',
    color: '#EF4444',
    gradient: 'from-red-500/20 via-red-500/5 to-transparent',
  },
};

// ============================================================
// COMPONENTE: Animated Number
// ============================================================

const AnimatedNumber: React.FC<{
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
  delay?: number;
}> = ({ value, decimals = 1, suffix = '%', className = '', delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Garantir que value é um número válido
  const safeValue = (typeof value === 'number' && !isNaN(value) && isFinite(value)) ? value : 0;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1000;
    const steps = 60;
    const increment = safeValue / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= safeValue) {
        setDisplayValue(safeValue);
        clearInterval(interval);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [safeValue, isVisible]);

  return (
    <span
      className={`transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      {displayValue.toFixed(decimals)}{suffix}
    </span>
  );
};

// ============================================================
// COMPONENTE: Consistency Gauge - LAYOUT COMPACTO
// ============================================================

const ConsistencyGauge: React.FC<{ cr: number }> = ({ cr }) => {
  const safeCR = (typeof cr === 'number' && !isNaN(cr)) ? cr : 0;
  const isConsistent = safeCR <= 0.10;
  const isWarning = safeCR > 0.10 && safeCR <= 0.15;

  const getColor = () => {
    if (isConsistent) return '#10B981';
    if (isWarning) return '#F59E0B';
    return '#EF4444';
  };

  const getStatus = () => {
    if (isConsistent) return { label: 'Consistente', icon: '✓', desc: '≤ 10%' };
    if (isWarning) return { label: 'Atenção', icon: '!', desc: '10-15%' };
    return { label: 'Revisar', icon: '✕', desc: '> 15%' };
  };

  const status = getStatus();
  const circumference = 2 * Math.PI * 42;
  const percentage = Math.min(safeCR * 100, 20);
  const strokeDashoffset = circumference - (percentage / 20) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Gauge */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={getColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Valor central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-mono font-bold"
            style={{ color: getColor() }}
          >
            {(safeCR * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Status badge */}
      <div
        className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
        style={{
          backgroundColor: `${getColor()}15`,
          color: getColor()
        }}
      >
        <span>{status.icon}</span>
        <span>{status.label}</span>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: Winner Card
// ============================================================

const WinnerCard: React.FC<{
  winner: BentoGridDashboardProps['finalScores'][0];
  totalAlternatives: number;
}> = ({ winner, totalAlternatives }) => {
  const score = getValidScore(winner);

  return (
    <div className="relative h-full flex flex-col justify-between overflow-hidden p-2">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-cyan-500/5" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Recomendação
            </span>
            <h3 className="text-sm font-medium text-slate-600 mt-0.5">
              Análise de {totalAlternatives} alternativas
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <span className="text-white text-lg">★</span>
          </div>
        </div>

        {/* Winner name - Typography as Hero */}
        <div className="mb-4">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            {winner.name}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Código: {winner.code}
          </p>
        </div>
      </div>

      {/* Score - Big number */}
      <div className="relative z-10 mt-auto">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Score Final
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl font-mono font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {score > 0 ? (
                  <AnimatedNumber value={score} decimals={4} suffix="" delay={200} />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </span>
            </div>
          </div>

          {/* Rank badge */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <span className="text-2xl font-bold text-white">1º</span>
            </div>
            <span className="text-xs text-slate-500 mt-1">Ranking</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: BOCR Weight Card - PORTUGUÊS
// ============================================================

const BOCRWeightCard: React.FC<{
  type: 'B' | 'O' | 'C' | 'R';
  weight: number;
  index: number;
}> = ({ type, weight, index }) => {
  const config = BOCR_CONFIG[type];
  const [isHovered, setIsHovered] = useState(false);
  const safeWeight = (typeof weight === 'number' && !isNaN(weight)) ? weight : 0;

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-4 
        bg-white border border-slate-200/80
        transition-all duration-300 ease-out cursor-pointer
        hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300
        hover:-translate-y-1
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient overlay on hover */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-br ${config.gradient}
          transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
      />

      <div className="relative z-10">
        {/* Icon and label - PORTUGUÊS */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-lg"
            style={{ color: config.color }}
          >
            {config.icon}
          </span>
          <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            {config.label}
          </span>
        </div>

        {/* Weight value - Hero number */}
        <div className="flex items-baseline gap-1">
          <span
            className="text-2xl font-mono font-bold tracking-tight"
            style={{ color: config.color }}
          >
            <AnimatedNumber value={safeWeight * 100} delay={100 + index * 100} />
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          {config.description}
        </p>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 transition-transform duration-300 origin-left"
        style={{
          backgroundColor: config.color,
          transform: isHovered ? 'scaleX(1)' : 'scaleX(0)'
        }}
      />
    </div>
  );
};

// ============================================================
// COMPONENTE: Ranking List
// ============================================================

const RankingList: React.FC<{
  scores: BentoGridDashboardProps['finalScores'];
}> = ({ scores }) => {
  const sortedScores = [...scores].sort((a, b) => getValidScore(b) - getValidScore(a));
  const maxScore = getValidScore(sortedScores[0]) || 1;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
          Ranking Completo
        </h3>
        <span className="text-xs text-slate-400">
          {scores.length} alternativas
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {sortedScores.map((item, index) => {
          const score = getValidScore(item);
          const relativeScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
          const isWinner = index === 0;

          return (
            <div
              key={item.code}
              className={`
                group relative p-4 rounded-xl border transition-all duration-300
                ${isWinner
                  ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-center gap-4">
                {/* Rank number */}
                <div
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                    ${isWinner
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600'
                    }
                  `}
                >
                  {index + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium truncate ${isWinner ? 'text-blue-900' : 'text-slate-800'}`}>
                    {item.name}
                  </h4>
                  <p className="text-xs text-slate-500">{item.code}</p>
                </div>

                {/* Score */}
                <div className="text-right">
                  {score > 0 ? (
                    <>
                      <span className={`text-lg font-mono font-bold ${isWinner ? 'text-blue-600' : 'text-slate-700'}`}>
                        {score.toFixed(4)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-mono text-slate-400">—</span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isWinner
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    : 'bg-slate-300'
                    }`}
                  style={{
                    width: `${relativeScore}%`,
                    transitionDelay: `${index * 100}ms`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: Stats Card - VISUAL CLARO (não mais preto)
// ============================================================

const StatsCard: React.FC<{
  responseCount: number;
  alternativesCount: number;
  cr: number;
}> = ({ responseCount, alternativesCount, cr }) => {
  const safeCR = (typeof cr === 'number' && !isNaN(cr)) ? cr : 0;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-full">
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-6">
        Métricas do Estudo
      </h3>

      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
            <span className="text-xl">👥</span>
          </div>
          <div>
            <span className="text-3xl font-mono font-bold text-slate-800">{responseCount}</span>
            <p className="text-xs text-slate-500">Respondentes</p>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <div>
            <span className="text-3xl font-mono font-bold text-slate-800">{alternativesCount}</span>
            <p className="text-xs text-slate-500">Alternativas</p>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <span className="text-3xl font-mono font-bold text-slate-800">20</span>
            <p className="text-xs text-slate-500">Subcritérios BOCR</p>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <span className="text-xl">✓</span>
          </div>
          <div>
            <span className={`text-3xl font-mono font-bold ${safeCR <= 0.10 ? 'text-emerald-600' : safeCR <= 0.15 ? 'text-amber-600' : 'text-red-600'}`}>
              {(safeCR * 100).toFixed(1)}%
            </span>
            <p className="text-xs text-slate-500">CR Global</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL: Bento Grid Dashboard
// ============================================================

export default function BentoGridDashboard({
  projectName,
  bocrWeights,
  finalScores,
  bocrConsistency,
  responseCount,
}: BentoGridDashboardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ordenar por score válido
  const sortedScores = [...finalScores].sort((a, b) => getValidScore(b) - getValidScore(a));
  const winner = sortedScores[0];
  const bocrTypes: ('B' | 'O' | 'C' | 'R')[] = ['B', 'O', 'C', 'R'];

  if (!mounted) {
    return <div className="animate-pulse bg-slate-100 rounded-3xl h-96" />;
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {projectName}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Análise AHP-BOCR • Dashboard Executivo
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-5 auto-rows-[minmax(100px,auto)]">

        {/* Card 1: Winner - Large (8 cols, 2 rows) */}
        <div
          className="col-span-12 lg:col-span-8 row-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ minHeight: '280px' }}
        >
          {winner && (
            <WinnerCard winner={winner} totalAlternatives={finalScores.length} />
          )}
        </div>

        {/* Card 2: Consistency Gauge (4 cols, 2 rows) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 row-span-2 bg-white rounded-3xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Consistência
            </span>
            <span className="text-xs text-slate-400">Saaty CR</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <ConsistencyGauge cr={bocrConsistency.cr} />
          </div>
        </div>

        {/* Cards 3-6: BOCR Weights (3 cols each) */}
        {bocrTypes.map((type, index) => (
          <div
            key={type}
            className="col-span-6 sm:col-span-6 lg:col-span-3"
          >
            <BOCRWeightCard
              type={type}
              weight={bocrWeights[index] || 0}
              index={index}
            />
          </div>
        ))}

        {/* Nota M11 — Personal vs Effective weights */}
        <div className="col-span-12">
          <p className="text-xs text-gray-500 italic">
            ℹ️ Os percentuais exibidos representam os pesos pessoais (v) derivados da hierarquia de controle. Na Equação 17 de Wijnmalen (2007), são multiplicados pelos rescaling weights (s) para compor os pesos efetivos (v·s) usados na síntese subtrativa.
          </p>
        </div>

        {/* Card 7: Ranking List (8 cols, 3 rows) */}
        <div
          className="col-span-12 lg:col-span-8 row-span-3 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ minHeight: '340px' }}
        >
          <RankingList scores={finalScores} />
        </div>

        {/* Card 8: Project Stats - VISUAL CLARO (4 cols, 3 rows) */}
        <div className="col-span-12 lg:col-span-4 row-span-3">
          <StatsCard
            responseCount={responseCount}
            alternativesCount={finalScores.length}
            cr={bocrConsistency.cr}
          />
        </div>

      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Sistema AHP-BOCR v5.0 • Saaty (1980), Wijnmalen (2007), Petrillo et al. (2023)</span>
          <span>Dashboard gerado em {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
}
