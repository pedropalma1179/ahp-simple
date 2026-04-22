// app/avaliacao/[projectId]/page.tsx
// Versão com coleta de dados demográficos
// Fluxo: Login → Dados Demográficos → Pesquisa AHP
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { BOCR_CRITERIA, SUBCRITERIA, generateAllComparisons, Project, Alternative, Respondent, groupComparisonsByBlock, ComparisonBlock } from '@/lib/data';
import type { ComparisonItem, JudgmentItem } from '@/lib/types';
import { calculateAllWeights } from '@/lib/ahp-ipc';
import type { Judgment } from '@/lib/ahp-ipc';

// ============================================================
// DADOS DEMOGRÁFICOS - OPÇÕES
// ============================================================

/**
 * Extrai texto de impacto de forma segura.
 * Suporta tanto o formato string quanto o formato objeto { description, value }.
 */
function getImpactText(impact: any): string {
  if (!impact) return '';
  if (typeof impact === 'string') return impact.trim();
  if (typeof impact === 'object') {
    if (typeof impact.description === 'string') return impact.description.trim();
    if (typeof impact.value === 'string') return impact.value.trim();
    return '';
  }
  return String(impact).trim();
}

const DEMOGRAPHIC_OPTIONS = {
  idade: {
    label: 'Faixa Etária',
    options: [
      { value: 'menos_30', label: 'Menos de 30 anos' },
      { value: '31_40', label: '31 a 40 anos' },
      { value: '41_50', label: '41 a 50 anos' },
      { value: 'mais_50', label: 'Mais de 50 anos' }
    ]
  },
  genero: {
    label: 'Gênero',
    required: false,
    options: [
      { value: 'masculino', label: 'Masculino' },
      { value: 'feminino', label: 'Feminino' },
      { value: 'outro', label: 'Outro / Prefiro não informar' }
    ]
  },
  formacao: {
    label: 'Nível de Formação',
    options: [
      { value: 'superior', label: 'Superior (Graduação)' },
      { value: 'especializacao', label: 'Especialização / MBA' },
      { value: 'mestrado', label: 'Mestrado' },
      { value: 'doutorado', label: 'Doutorado ou Acima' }
    ]
  },
  areaFormacao: {
    label: 'Área de Formação',
    options: [
      { value: 'administracao', label: 'Administração' },
      { value: 'ciencias_contabeis', label: 'Ciências Contábeis' },
      { value: 'ciencias_computacao', label: 'Ciências da Computação' },
      { value: 'economia', label: 'Economia' },
      { value: 'engenharia', label: 'Engenharia' },
      { value: 'outra', label: 'Outra' }
    ]
  },
  tempoTrabalho: {
    label: 'Tempo de Trabalho na Área',
    options: [
      { value: 'menos_10', label: 'Até 10 anos' },
      { value: '11_20', label: '11 a 20 anos' },
      { value: '21_30', label: '21 a 30 anos' },
      { value: 'mais_30', label: 'Mais de 30 anos' }
    ]
  },
  tempoGestor: {
    label: 'Tempo como Gestor',
    required: false,
    options: [
      { value: 'nao_atua', label: 'Não atuo como gestor' },
      { value: 'menos_10', label: 'Até 10 anos' },
      { value: '11_20', label: '11 a 20 anos' },
      { value: '21_30', label: '21 a 30 anos' },
      { value: 'mais_30', label: 'Mais de 30 anos' }
    ]
  },
  areaAtuacao: {
    label: 'Área de Atuação',
    hint: 'Caso se identifique com mais de uma opção, marque apenas a que considera mais representativa.',
    options: [
      { value: 'operacoes', label: 'Operações' },
      { value: 'manufatura', label: 'Manufatura' },
      { value: 'qualidade', label: 'Qualidade' },
      { value: 'financeiro', label: 'Financeiro' },
      { value: 'otimizacao_custos', label: 'Otimização e Custos' },
      { value: 'p_and_d', label: 'P&D / Inovação' },
      { value: 'outro', label: 'Outro' }
    ]
  },
  funcao: {
    label: 'Função / Cargo',
    hint: 'Caso se identifique com mais de uma opção, marque apenas a que considera mais representativa.',
    options: [
      { value: 'c_level', label: 'C-Level' },
      { value: 'diretor', label: 'Diretor' },
      { value: 'gerente', label: 'Gerente' },
      { value: 'supervisor', label: 'Supervisor' },
      { value: 'outro', label: 'Outro' }
    ]
  }
};

// Interface para dados demográficos (local, para o formulário)
interface DemographicData {
  idade: string;
  genero: string;
  formacao: string;
  areaFormacao: string;
  tempoTrabalho: string;
  tempoGestor: string;
  areaAtuacao: string;
  funcao: string;
  submittedAt?: string;
}

// ============================================================

// ============================================================
// COMPONENTE: Sidebar de Progresso Hierárquico
// ============================================================

function HierarchyTreeSidebar({
  currentGroupIndex,
  totalGroups,
  groups,
  completedGroups,
  onNavigate
}: {
  currentGroupIndex: number;
  totalGroups: number;
  groups: Array<{ id: string; label: string; type: string; parentMerit?: string }>;
  completedGroups: Set<string>;
  onNavigate: (groupIndex: number) => void;
}) {

  const meritColors: Record<string, { bg: string; text: string; border: string }> = {
    'B': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
    'O': { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
    'C': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
    'R': { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
  };

  const meritLabels: Record<string, string> = {
    'B': 'Benefícios',
    'O': 'Oportunidades',
    'C': 'Custos',
    'R': 'Riscos',
  };

  // Agrupar groups por mérito pai
  const groupedByMerit: Record<string, typeof groups> = {};
  const bocrLevelGroups: typeof groups = [];

  groups.forEach((g) => {
    // Grupos de nível BOCR: ponderação dos méritos E magnitude de impacto
    const isBOCRLevel =
      g.type === 'bocr' ||
      g.type === 'merits' ||
      g.type === 'magnitude' ||
      g.type === 'rescaling' ||
      g.label.toLowerCase().includes('magnitude') ||
      g.label.toLowerCase().includes('rescaling') ||
      g.id?.toLowerCase().includes('magnitude') ||
      g.id?.toLowerCase().includes('rescaling');

    if (isBOCRLevel) {
      bocrLevelGroups.push(g);
    } else {
      const merit = g.parentMerit || 'B';
      if (!groupedByMerit[merit]) groupedByMerit[merit] = [];
      groupedByMerit[merit].push(g);
    }
  });

  const getStatus = (groupId: string, groupIdx: number): 'completed' | 'current' | 'pending' => {
    if (completedGroups.has(groupId)) return 'completed';
    // Nota: currentGroupIndex aqui se refere ao índice no array de blocos
    // Precisamos encontrar o índice real deste grupo no array original
    const realIdx = groups.findIndex(grp => grp.id === groupId);
    if (realIdx === currentGroupIndex) return 'current';
    return 'pending';
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return '✓';
    if (status === 'current') return '●';
    return '○';
  };

  const statusClasses = (status: string) => {
    if (status === 'completed') return 'text-emerald-400';
    if (status === 'current') return 'text-indigo-400 animate-pulse';
    return 'text-white/60';
  };

  // Progresso geral
  const completedCount = completedGroups.size;
  const progressPercent = totalGroups > 0 ? Math.round((completedCount / totalGroups) * 100) : 0;

  return (
    <div className="w-72 flex-shrink-0 bg-slate-900/80 backdrop-blur-sm border-r border-white/10 overflow-y-auto hidden md:block" // Hidden on mobile as per prompt constraint (focus desktop) but good practice to hide
      style={{ maxHeight: 'calc(100vh)', position: 'sticky', top: 0, height: '100vh' }}>

      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-base font-semibold text-white/90 mb-2">Progresso da Avaliação</h3>
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-1">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-base text-white/70">{completedCount} de {totalGroups} etapas · {progressPercent}%</p>
      </div>

      {/* Árvore hierárquica */}
      <div className="p-3 space-y-1">

        {/* Nível 0: Meta */}
        <div className="mb-3">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
            <span className="text-sm">🎯</span>
            <span className="text-sm font-medium text-white/80 truncate">Decisão de Investimento I4.0</span>
          </div>
        </div>

        {/* Nível 1: BOCR (ponderação dos méritos) e Magnitude */}
        {bocrLevelGroups.length > 0 && (
          <div className="mb-2 space-y-1">
            {bocrLevelGroups.map((bg) => {
              const idx = groups.indexOf(bg);
              const status = getStatus(bg.id, idx);
              // Lógica de clique: permite se completo, atual, ou o próximo imediato (desbloqueado)
              const isClickable = status === 'completed' || status === 'current' || idx === currentGroupIndex + 1;

              return (
                <div key={bg.id}
                  onClick={() => isClickable && onNavigate(idx)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${status === 'current' ? 'bg-indigo-500/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/10' :
                    status === 'completed' ? 'bg-white/5' : 'bg-transparent'
                    } ${isClickable ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed opacity-60'}`}>
                  <span className={`text-xs font-bold ${statusClasses(status)}`}>
                    {status === 'pending' ? '🔒' : statusIcon(status)}
                  </span>
                  <span className={`text-sm ${status === 'current' ? 'text-white font-medium' : 'text-white/60'}`}>
                    {bg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Nível 2: Por cada mérito */}
        {['B', 'O', 'C', 'R'].map(merit => {
          const meritGroups = groupedByMerit[merit] || [];
          if (meritGroups.length === 0) return null;

          const colors = meritColors[merit];
          const allCompleted = meritGroups.every((g) => completedGroups.has(g.id));
          const hasCurrent = meritGroups.some((g) => groups.indexOf(g) === currentGroupIndex);

          return (
            <div key={merit} className="mb-1">
              {/* Header do mérito */}
              <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${hasCurrent ? colors.bg : ''}`}>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                  {merit}
                </span>
                <span className={`text-sm font-medium ${hasCurrent ? 'text-white' : 'text-white/60'}`}>
                  {meritLabels[merit]}
                </span>
                {allCompleted && <span className="text-emerald-400 text-[10px] ml-auto">✓</span>}
              </div>

              {/* Sub-itens */}
              <div className="ml-4 pl-3 border-l border-white/10 space-y-0.5 mt-0.5">
                {meritGroups.map((g) => {
                  const idx = groups.indexOf(g);
                  const status = getStatus(g.id, idx);
                  const isClickable = status === 'completed' || status === 'current' || idx === currentGroupIndex + 1;

                  return (
                    <div
                      key={g.id}
                      onClick={() => isClickable && onNavigate(idx)}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-all ${status === 'current' ? 'bg-indigo-500/15 text-white font-medium' :
                        status === 'completed' ? 'text-white/70' : 'text-white/60'
                        } ${isClickable ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed opacity-60'}`}
                    >
                      <span className={`text-[10px] ${statusClasses(status)}`}>
                        {status === 'pending' ? '🔒' : statusIcon(status)}
                      </span>
                      <span className="truncate">{g.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================

// ============================================================
// COMPONENTE: Card de Contexto Inline por Bloco
// ============================================================

function BlockContextCard({
  block,
  alternatives,
  projectName,
  project
}: {
  block: ComparisonBlock;
  alternatives: Alternative[];
  projectName: string;
  project: Project | null;
}) {
  const [expanded, setExpanded] = useState(false);

  // Gerar texto contextual baseado no tipo do bloco
  const getContextText = (): { main: string; detail: string } => {
    const altNames = alternatives.map(a => a.name).join(', ');

    if (block.type === 'bocr' || block.type === 'merits') {
      return {
        main: 'Nesta fase, defina suas prioridades gerais para investimentos em tecnologia. Não tente antecipar qual alternativa é a "vencedora" — a priorização deve refletir sua visão estratégica sobre o peso de Benefícios, Oportunidades, Custos e Riscos.',
        detail: 'Os dados técnicos das alternativas servem para contextualizar o problema, mas nesta etapa a priorização deve refletir seus princípios gerais de decisão. Por exemplo: ao decidir sobre qualquer investimento em tecnologia, o que pesa mais para você — os benefícios esperados ou os riscos envolvidos? Os custos de implementação ou as oportunidades de longo prazo? Na próxima etapa, você contextualizará esses critérios para o caso específico das estufas.',
      };
    }

    if (block.type === 'magnitude' || block.type === 'rescaling') {
      return {
        main: 'Agora, traga sua visão para o cenário das estufas de cura. Não tente antecipar qual alternativa é a "vencedora" — avalie a relevância de cada critério especificamente para este projeto.',
        detail: 'Um critério pode ser importante em tese, mas pouco decisivo neste caso concreto. Por exemplo: de modo geral, Riscos podem ser críticos, mas se as tecnologias forem maduras e seguras, o impacto dos Custos pode ser o real diferencial estratégico deste projeto. Ajuste os pesos conforme a realidade deste investimento.\n\nCaso precise relembrar os detalhes das alternativas, clique no ícone "contexto" no alto da página.',
      };
    }

    if (block.type === 'subcriteria') {
      const meritMap: Record<string, string> = { 'B': 'Benefícios', 'O': 'Oportunidades', 'C': 'Custos', 'R': 'Riscos' };
      const meritMains: Record<string, string> = {
        'B': 'Nesta fase, avalie apenas quais Benefícios são mais críticos para o negócio. Não tente antecipar qual alternativa é a "vencedora". Qual destes fatores é mais impactante — ganhos de produtividade ou ganhos de qualidade?',
        'O': 'Prosseguindo, avalie quais Oportunidades são mais relevantes para o negócio. Não tente antecipar qual alternativa é a "vencedora". Qual destes fatores é mais relevante estrategicamente — transformação digital ou maturidade tecnológica?',
        'C': 'Olhando para o lado financeiro, avalie quais Custos são mais sensíveis para a viabilidade. Não tente antecipar qual alternativa é a "vencedora". Qual destes fatores tem maior impacto — o investimento inicial (CAPEX) ou o custo de operação contínua (OPEX)?',
        'R': 'Por fim, identifique quais Riscos representam a maior ameaça estratégica. Não tente antecipar qual alternativa é a "vencedora". O que mais preocupa sua gestão — a vulnerabilidade cibernética ou a complexidade de integração com a linha atual?',
      };
      const meritCode = block.id?.charAt(0) || block.nodes?.[0]?.charAt(0) || '?';
      const meritName = meritMap[meritCode] || block.title;
      const mainText = meritMains[meritCode] || `Avalie quais ${meritName} são mais críticos para o negócio. Não tente antecipar qual alternativa é a "vencedora".`;

      return {
        main: mainText,
        detail: `Os dados técnicos exibidos servem para contextualizar o problema, mas a priorização deve refletir sua visão estratégica sobre cada tipo de ${meritName.toLowerCase().replace(/s$/, '')}. Na próxima etapa, você comparará as alternativas diretamente sob cada subcritério.\n\nAs informações sobre o impacto de cada alternativa nos subcritérios são apenas de referência e não devem influenciar esta comparação.`,
      };
    }

    if (block.type === 'alternatives') {
      const meritChar = block.comparisons?.[0]?.group?.charAt(0) || '';
      const meritMap: Record<string, string> = { 'B': 'Benefícios', 'O': 'Oportunidades', 'C': 'Custos', 'R': 'Riscos' };
      const meritName = meritMap[meritChar] || 'este mérito';
      const isCR = ['C', 'R'].includes(meritChar);

      return {
        main: isCR
          ? `Agora sim — compare as alternativas diretamente: para cada subcritério de ${meritName} abaixo, qual delas apresenta maior impacto?`
          : `Agora sim — compare as alternativas diretamente: para cada subcritério de ${meritName} abaixo, qual delas é mais favorável?`,
        detail: isCR
          ? `Com base nos dados técnicos e na sua experiência, avalie qual alternativa apresenta maior ônus ou exposição em cada subcritério. Utilize o ícone "contexto" no alto da página para consultar as especificações técnicas se necessário.`
          : `Com base nos dados técnicos e na sua experiência, avalie qual alternativa entrega o resultado mais favorável em cada subcritério. Utilize o ícone "contexto" no alto da página para consultar as especificações técnicas se necessário.`,
      };
    }

    return {
      main: 'Compare os itens conforme sua experiência profissional.',
      detail: `As alternativas em avaliação são: ${altNames}.`,
    };
  };

  const ctx = getContextText();

  return (
    <div className="mb-4 rounded-xl border transition-all"
      style={{
        background: expanded ? 'rgba(6, 182, 212, 0.04)' : 'transparent',
        borderColor: expanded ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.08)'
      }}>
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-base font-medium text-gray-500 flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {expanded ? 'Contexto desta etapa' : ctx.main}
        </span>
        <svg className="w-4 h-4 text-gray-400 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t pt-3 space-y-2" style={{ borderColor: 'rgba(6, 182, 212, 0.1)' }}>
          <p className="text-base text-gray-700 leading-relaxed">{ctx.main}</p>
          <p className="text-sm text-gray-500 leading-relaxed">{ctx.detail}</p>

          {/* Alternativas em badges (para blocos de alternativas) */}
          {block.type === 'alternatives' && alternatives.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-400 mb-1.5">Alternativas em avaliação:</p>
              <div className="flex flex-wrap gap-1.5">
                {alternatives.map((alt, i) => (
                  <span key={alt.code || i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm"
                    style={{ background: '#8b5cf610', color: '#7c3aed', border: '1px solid #8b5cf620' }}>
                    <strong>{alt.code}</strong> {alt.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Impactos das alternativas nos subcritérios comparados (para blocos de subcritérios) */}
          {block.type === 'subcriteria' && (() => {
            const subCodes = block.nodes || [];
            if (subCodes.length === 0) return null;

            const alts = project?.alternatives || [];
            const hasAnyImpact = subCodes.some(code =>
              alts.some((alt: any) => getImpactText(alt.impacts?.[code]))
            );
            if (!hasAnyImpact) return null;

            const meritCode = subCodes[0]?.charAt(0) || 'B';
            const meritColors: Record<string, string> = {
              'B': '#10b981', 'O': '#3b82f6', 'C': '#f59e0b', 'R': '#ef4444'
            };
            const color = meritColors[meritCode] || '#6b7280';

            return (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3 font-medium">
                  Impacto das alternativas em cada subcritério:
                </p>
                <div className="space-y-3">
                  {subCodes.map(code => {
                    const sub = SUBCRITERIA.find(s => s.code === code);
                    if (!sub) return null;

                    const altsWithImpact = alts.filter((alt: any) => getImpactText(alt.impacts?.[code]));
                    if (altsWithImpact.length === 0) return null;

                    return (
                      <div key={code} className="rounded-lg p-3 bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ background: color }}>{code}</span>
                          <span className="text-sm font-semibold text-gray-700">{sub.name}</span>
                        </div>
                        <div className="space-y-1.5">
                          {alts.map((alt: any) => {
                            const text = getImpactText(alt.impacts?.[code]);
                            if (!text) return null;
                            return (
                              <div key={alt.code} className="flex items-start gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                                  style={{ background: '#8b5cf6' }}>{alt.code}</span>
                                <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE: Card de Ajuda (Legend)
// ============================================================

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

// ============================================================
// ERROR BOUNDARY — Proteção contra erros de render
// ============================================================

import React from 'react';
import { VideoBackground } from '@/components/VideoBackground';

// ================================================================
// VALIDAÇÃO IPC — Conectividade do Grafo via Union-Find
// Bozóki et al. (2009), Teorema 1: solução única ↔ grafo conectado
// ================================================================

interface GraphConnectivityResult {
  connected: boolean;
  components: number;
  answeredCount: number;
  minRequired: number;
  totalPossible: number;
}

function checkGraphConnectivity(
  nodes: string[],
  comparisons: { itemA: string; itemB: string }[],
  allJudgments: any[],
  blockStartIndex: number
): GraphConnectivityResult {
  const n = nodes.length;
  const minRequired = n - 1;
  const totalPossible = comparisons.length;

  if (n <= 1) return { connected: true, components: 1, answeredCount: 0, minRequired: 0, totalPossible };

  const answeredEdges: [string, string][] = [];
  let answeredCount = 0;

  comparisons.forEach((comp, i) => {
    const j = allJudgments[blockStartIndex + i];
    if (j && !j.skipped) {
      answeredEdges.push([comp.itemA, comp.itemB]);
      answeredCount++;
    }
  });

  if (answeredEdges.length === 0) {
    return { connected: false, components: n, answeredCount: 0, minRequired, totalPossible };
  }

  // Union-Find com path compression + union by rank
  const parent: Record<string, string> = {};
  const rank: Record<string, number> = {};
  nodes.forEach(nd => { parent[nd] = nd; rank[nd] = 0; });

  function find(x: string): string {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a: string, b: string) {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    if (rank[ra] < rank[rb]) parent[ra] = rb;
    else if (rank[ra] > rank[rb]) parent[rb] = ra;
    else { parent[rb] = ra; rank[ra]++; }
  }

  answeredEdges.forEach(([a, b]) => union(a, b));
  const roots = new Set(nodes.map(nd => find(nd)));

  return { connected: roots.size === 1, components: roots.size, answeredCount, minRequired, totalPossible };
}

/**
 * Identifica comparações obrigatórias para conectar o grafo.
 * - Grafo conectado → todas false (nada mais obrigatório)
 * - Nenhuma resposta → primeiras n-1 como guia visual
 * - Caso contrário → comparações envolvendo ≥1 nó ainda isolado
 */
function ipcGetRequiredComparisons(
  nodes: string[],
  comparisons: { itemA: string; itemB: string }[],
  allJudgments: any[],
  blockStartIndex: number
): boolean[] {
  const n = nodes.length;
  if (n <= 2) return comparisons.map(() => true);

  const connectedNodes = new Set<string>();
  const answeredSet = new Set<number>();

  comparisons.forEach((comp, i) => {
    const j = allJudgments[blockStartIndex + i];
    if (j && !j.skipped) {
      connectedNodes.add(comp.itemA);
      connectedNodes.add(comp.itemB);
      answeredSet.add(i);
    }
  });

  const { connected } = checkGraphConnectivity(nodes, comparisons, allJudgments, blockStartIndex);
  if (connected) return comparisons.map(() => false);

  if (connectedNodes.size === 0) return comparisons.map((_, i) => i < n - 1);

  return comparisons.map((comp, i) => {
    if (answeredSet.has(i)) return false;
    return !connectedNodes.has(comp.itemA) || !connectedNodes.has(comp.itemB);
  });
}

/**
 * Partículas flutuantes estilo "network" sobre o vídeo.
 * Reforça tema tecnológico sem competir com o formulário.
 */
const ParticlesBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    // Tipagem explícita para o array de partículas
    const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const PARTICLE_COUNT = 40;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
      });
    }

    const CONNECTION_DIST = 120;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const opacity = 0.06 * (1 - dist / CONNECTION_DIST);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }} />;
};

class SurveyErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SURVEY ERROR BOUNDARY]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              Erro Inesperado
            </h1>
            <p className="text-gray-600 mb-4">
              Ocorreu um problema ao carregar a pesquisa. Seu progresso foi salvo automaticamente.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Se o erro persistir, entre em contato com o pesquisador.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Recarregar Página
              </button>
              <a
                href="mailto:pedro.palma@unesp.br"
                className="block w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Contatar Pesquisador
              </a>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer">
                  Detalhes técnicos (dev only)
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs text-red-600 overflow-auto max-h-32">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AvaliacaoProjectPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const tokenFromUrl = searchParams.get('token');

  // Estados gerais
  const [project, setProject] = useState<Project | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [judgments, setJudgments] = useState<JudgmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondentId, setRespondentId] = useState<string | null>(null);
  const [respondentData, setRespondentData] = useState<Respondent | null>(null);
  const [error, setError] = useState('');
  const [alreadyResponded, setAlreadyResponded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);



  // === NAVEGAÇÃO POR BLOCOS (Etapa 1/4 — infraestrutura) ===
  const [blocks, setBlocks] = useState<ComparisonBlock[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [completedGroups, setCompletedGroups] = useState<Set<string>>(new Set());

  const [submitError, setSubmitError] = useState(false);
  const blockContentRef = useRef<HTMLDivElement>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [modalInstructionStep, setModalInstructionStep] = useState(0);

  // ================================================================
  // STUBS — Substituídos nas Etapas 3/4. NÃO editar nesta etapa.
  // ================================================================

  /** Badge interativo: hover (desktop) ou tap (mobile) mostra tooltip com definição. */
  function CriterionBadge({ code, side, color, subcode }: { code: string; side: 'left' | 'right'; color: string; subcode?: string }) {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState<'above' | 'below'>('above');
    const badgeRef = useRef<HTMLSpanElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const allCriteria = [...BOCR_CRITERIA, ...SUBCRITERIA];
    const def = allCriteria.find(c => c.code === code);
    const altDef = alternatives.find(a => a.code === code);
    const name = def?.name || altDef?.name || code;
    const altImpact = altDef && subcode ? altDef.impacts?.[subcode] : undefined;
    const description = def?.description || altImpact || altDef?.description || '';
    const badgeColor = def?.color || (altDef ? '#8b5cf6' : color);

    // Posicionamento dinâmico
    useEffect(() => {
      if (show && badgeRef.current) {
        const rect = badgeRef.current.getBoundingClientRect();
        setPos(rect.top < 140 ? 'below' : 'above');
      }
    }, [show]);

    // Click-outside (mobile)
    useEffect(() => {
      if (!show) return;
      const handle = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node;
        if (badgeRef.current && !badgeRef.current.contains(target) &&
          tipRef.current && !tipRef.current.contains(target)) {
          setShow(false);
        }
      };
      document.addEventListener('mousedown', handle);
      document.addEventListener('touchstart', handle);
      return () => {
        document.removeEventListener('mousedown', handle);
        document.removeEventListener('touchstart', handle);
      };
    }, [show]);

    useEffect(() => {
      return () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); };
    }, []);

    return (
      <span className="relative inline-flex" ref={badgeRef}>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(prev => !prev); }}
          onMouseEnter={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setShow(true); }}
          onMouseLeave={() => { hoverTimer.current = setTimeout(() => setShow(false), 200); }}
          className="inline-flex items-center gap-0.5 rounded text-xs font-bold text-white transition-all focus:outline-none"
          style={{
            background: badgeColor, padding: '2px 4px', height: '22px', minWidth: '28px', justifyContent: 'center', cursor: 'help',
            boxShadow: show ? `0 0 0 2px ${badgeColor}40` : 'none',
          }}
          aria-label={`${code}: ${name}`}
        >
          {code}
          <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
          </svg>
        </button>

        {show && (
          <div ref={tipRef} role="tooltip"
            onMouseEnter={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setShow(true); }}
            onMouseLeave={() => { hoverTimer.current = setTimeout(() => setShow(false), 200); }}
            className="absolute z-50 animate-tooltip-in"
            style={{
              [pos === 'above' ? 'bottom' : 'top']: 'calc(100% + 8px)',
              [side === 'left' ? 'right' : 'left']: '-8px',
              width: 'min(280px, 80vw)',
            }}>
            <div className="rounded-xl p-3 shadow-xl border text-left" style={{ background: '#1e293b', borderColor: `${badgeColor}30` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center justify-center h-6 rounded text-xs font-bold text-white flex-shrink-0"
                  style={{ background: badgeColor, minWidth: '28px', paddingLeft: '4px', paddingRight: '4px' }}>{code}</span>
                <span className="text-sm font-semibold text-white">{name}</span>
              </div>
              {description && <p className="text-sm text-gray-300 leading-relaxed">{description}</p>}
              <div className="absolute w-2.5 h-2.5 rotate-45"
                style={{ [pos === 'above' ? 'bottom' : 'top']: '-5px', [side === 'left' ? 'right' : 'left']: '16px', background: '#1e293b' }} />
            </div>
          </div>
        )}
      </span>
    );
  }

  /** Glossário colapsável: lista todos os critérios/alternativas do bloco com definições. */
  function BlockLegend({ block }: { block: ComparisonBlock }) {
    const [expanded, setExpanded] = useState(false);

    const uniqueCodes: string[] = [];
    const seen = new Set<string>();
    block.comparisons.forEach(c => {
      [c.itemA, c.itemB].forEach(code => {
        if (!seen.has(code)) { seen.add(code); uniqueCodes.push(code); }
      });
    });

    return (
      <div className="mb-4 rounded-xl border transition-all"
        style={{ background: expanded ? `${block.color}08` : `${block.color}04`, borderColor: expanded ? `${block.color}25` : `${block.color}12` }}>
        <button type="button" onClick={() => setExpanded(prev => !prev)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left">
          <span className="text-sm font-medium text-gray-600">
            📖 Glossário — {uniqueCodes.length} {block.type === 'alternatives' ? 'itens' : 'critérios'}
          </span>
          <svg className="w-4 h-4 text-gray-400 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-3 space-y-2 border-t pt-2" style={{ borderColor: `${block.color}15` }}>
            {uniqueCodes.map(code => {
              const def = [...BOCR_CRITERIA, ...SUBCRITERIA].find(c => c.code === code);
              const altDef = alternatives.find(a => a.code === code);
              const name = def?.name || altDef?.name || code;
              const desc = def?.description || altDef?.description || '';
              const badgeColor = def?.color || (altDef ? '#8b5cf6' : block.color);
              return (
                <div key={code} className="flex items-start gap-2.5">
                  <span className="inline-flex items-center justify-center h-6 rounded text-xs font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ background: badgeColor, minWidth: '28px', paddingLeft: '4px', paddingRight: '4px' }}>{code}</span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-800">{name}</span>
                    {desc && <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{desc}</p>}
                  </div>
                </div>
              );
            })}
            <p className="text-sm text-gray-400 italic pt-1">💡 Toque nos badges coloridos nas comparações para ver definições rápidas.</p>
          </div>
        )}
      </div>
    );
  }

  // === VALIDAÇÃO IPC REAL — Union-Find (Bozóki et al., 2009) ===
  const blockValidation = useMemo(() => {
    return blocks.map(block => {
      const result = checkGraphConnectivity(block.nodes, block.comparisons, judgments, block.startIndex);
      const answeredTotal = block.comparisons.filter((_, i) => {
        return judgments[block.startIndex + i] != null;
      }).length;
      return { ...result, answeredTotal, isComplete: answeredTotal === block.comparisons.length };
    });
  }, [blocks, judgments]);

  const allBlocksValid = blockValidation.every(v => v.connected);
  const currentBlockValid = blockValidation[currentBlockIndex]?.connected ?? false;
  const currentBlockComplete = blockValidation[currentBlockIndex]?.isComplete ?? false;

  /** Wrapper que chama a função global ipcGetRequiredComparisons */
  function getRequiredComparisons(
    nodes: string[], comparisons: any[], jdg: any[], startIndex: number
  ): boolean[] {
    return ipcGetRequiredComparisons(nodes, comparisons, jdg, startIndex);
  }

  // ================================================================
  // HANDLER DE RESPOSTA POR BLOCO
  // ================================================================

  const handleBlockAnswer = (globalIndex: number, value: number) => {
    const comp = comparisons[globalIndex];
    if (!comp) return;

    // Toggle: clicar no mesmo botão limpa a resposta
    const existing = judgments[globalIndex];
    if (existing && !existing.skipped && existing.rawSlider === value) {
      setJudgments(prev => {
        const next = [...prev];
        next[globalIndex] = null as any;
        return next;
      });
      return;
    }

    const { saatyValue, favors } = sliderToSaaty(value);
    const judgment = { ...comp, saatyValue, favors, rawSlider: value };

    setJudgments(prev => {
      const next = [...prev];
      // Expandir array se necessário (primeira resposta antes de qualquer restore)
      while (next.length <= globalIndex) next.push(null as any);
      next[globalIndex] = judgment;
      return next;
    });

    setSubmitError(false);
  };

  /** Stub de finalização. Etapa 4/4 substituirá por validação IPC completa. */
  const handleFinalizeSurvey = async () => {
    // Validar TODOS os blocos: grafo conectado é obrigatório (Bozóki et al., 2009)
    const invalidBlockIndices = blockValidation
      .map((v, i) => (!v.connected ? i : -1))
      .filter(i => i >= 0);

    if (invalidBlockIndices.length > 0) {
      setSubmitError(true);
      goToBlock(invalidBlockIndices[0]);
      return;
    }

    const validJudgments = judgments.filter(j => j != null);

    setSaving(true);
    try {
      // Calcular pesos individuais e CR a partir dos judgments (Saaty, 1980)
      const altCodes = alternatives.map(a => a.code);
      const ipcResult = calculateAllWeights(validJudgments as Judgment[], altCodes);

      // Montar campo responses no formato esperado pelo /api/response-quality e /api/calculate
      const responsesCalc = {
        avgCR: ipcResult.avgCR,
        bocrWeights: ipcResult.bocrWeights.weights,
        bocrConsistency: {
          cr: ipcResult.bocrWeights.cr,
          lambda: ipcResult.bocrWeights.lambdaMax,
          ci: ipcResult.bocrWeights.lambdaMax > 0
            ? (ipcResult.bocrWeights.lambdaMax - ipcResult.bocrWeights.items.length) / (ipcResult.bocrWeights.items.length - 1)
            : 0
        },
        magnitudeWeights: ipcResult.magnitudeWeights.weights,
        magnitudeConsistency: {
          cr: ipcResult.magnitudeWeights.cr,
          lambda: ipcResult.magnitudeWeights.lambdaMax
        },
        subWeights: Object.fromEntries(
          Object.entries(ipcResult.subWeights).map(([k, v]) => [k, v.weights])
        ),
        subConsistency: Object.fromEntries(
          Object.entries(ipcResult.subWeights).map(([k, v]) => [k, { cr: v.cr, lambda: v.lambdaMax }])
        ),
      };

      const responsesQuery = query(
        collection(db, 'responses'),
        where('projectId', '==', projectId),
        where('respondentId', '==', respondentId)
      );
      const existingResponses = await getDocs(responsesQuery);
      const finalData = {
        projectId,
        respondentId,
        judgments: validJudgments,
        responses: responsesCalc,
        isSimulated: false,
        currentIndex: comparisons.length,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingResponses.empty) {
        // Se for revisão, tenta atualizar o ID conhecido, senão cria novo
        if (isRevisiting && existingResponseId) {
          await updateDoc(doc(db, 'responses', existingResponseId), finalData);
        } else {
          await addDoc(collection(db, 'responses'), finalData);
        }
      } else {
        await updateDoc(existingResponses.docs[0].ref, finalData);
      }

      if (respondentId) {
        await updateDoc(doc(db, 'respondents', respondentId), {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
      }

      setSaving(false);
      setAuthStep('thankyou');
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };



  // Estados para autenticação
  const [authStep, setAuthStep] = useState<'loading' | 'email_validation' | 'consent' | 'demographics' | 'instructions' | 'authenticated' | 'thankyou' | 'error' | 'closed'>('loading');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [instructionStep, setInstructionStep] = useState(0);
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [authError, setAuthError] = useState('');

  // Estados para dados demográficos
  const [demographics, setDemographics] = useState<DemographicData>({
    idade: '',
    genero: '',
    formacao: '',
    areaFormacao: '',
    tempoTrabalho: '',
    tempoGestor: '',
    areaAtuacao: '',
    funcao: ''
  });
  const [demographicsError, setDemographicsError] = useState('');
  const [savingDemographics, setSavingDemographics] = useState(false);

  // Estados para campos "Outro"
  const [areaOutro, setAreaOutro] = useState('');
  const [funcaoOutro, setFuncaoOutro] = useState('');

  // Estados de Transição
  const [stepTransition, setStepTransition] = useState(false); // Transição entre telas de login/demographics
  const [pillTooltip, setPillTooltip] = useState<{ index: number; rect: DOMRect } | null>(null);
  const pillTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResponseIdRef = useRef<string | null>(null);

  // Novos estados para fluxo de revisão
  const [isRevisiting, setIsRevisiting] = useState(false);
  const [existingResponseId, setExistingResponseId] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ============================================================
  // CARREGAR PROJETO
  // ============================================================

  useEffect(() => {
    const loadProject = async () => {
      try {
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (!projectDoc.exists()) {
          setError('Projeto não encontrado');
          setAuthStep('error');
          setLoading(false);
          return;
        }

        const projectData = projectDoc.data() as Project;

        // [NOVO] Verificar se o projeto está "Aberto" (toggle independente do status)
        if (projectData.isOpen === false) {
          // Apenas bloqueia se explicitamente false. Undefined/null = aberto (retrocompatibilidade)
          setProject(projectData); // Carrega dados básicos para mostrar título na tela de fechamento
          setAuthStep('closed');
          setLoading(false);
          return;
        }

        // Verifica status do ciclo de vida
        if (projectData.status !== 'active') {
          // Se não for active (draft ou closed) e não tiver sido barrado pelo isOpen...
          // Mantemos o bloqueio original para garantir que rascunhos não vazem
          setError('Este projeto não está aberto para avaliações');
          setAuthStep('error');
          setLoading(false);
          return;
        }

        setProject(projectData);
        setAlternatives(projectData.alternatives || []);
        const allComparisons = generateAllComparisons(projectData.alternatives);
        setComparisons(allComparisons);
        setBlocks(groupComparisonsByBlock(allComparisons, projectData.alternatives));

        if (tokenFromUrl) {
          localStorage.setItem(`pendingToken_${projectId}`, tokenFromUrl);
        }

        // Verificar sessão existente
        const validatedEmail = sessionStorage.getItem(`validatedEmail_${projectId}`);
        const savedRespondentId = sessionStorage.getItem(`validatedRespondentId_${projectId}`);

        if (validatedEmail && savedRespondentId) {
          const isStillValid = await validateToken(savedRespondentId, projectId);
          if (isStillValid) {
            setRespondentId(savedRespondentId);

            // Verificar se já preencheu dados demográficos
            const respondentDoc = await getDoc(doc(db, 'respondents', savedRespondentId));
            const respData = respondentDoc.data() as Respondent;

            if (respData?.consentAcceptedAt) {
              // Verificar se já finalizou → thankyou
              if (respData?.status === 'completed' || respData?.completedAt) {
                setAuthStep('thankyou');
              } else if (respData?.demographics) {
                // Já tem dados demográficos, ir direto para pesquisa
                await loadExistingProgress(savedRespondentId, projectId, allComparisons, projectData.alternatives || []);
                setAuthStep('authenticated');
              } else {
                // Precisa preencher dados demográficos
                setAuthStep('demographics');
              }
            } else {
              setAuthStep('consent');
            }
          } else {
            sessionStorage.removeItem(`validatedEmail_${projectId}`);
            sessionStorage.removeItem(`validatedRespondentId_${projectId}`);
            setAuthStep('email_validation');
          }
        } else {
          setAuthStep('email_validation');
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro:', err);
        setError('Erro ao carregar projeto');
        setAuthStep('error');
        setLoading(false);
      }
    };

    if (projectId) loadProject();
  }, [projectId, tokenFromUrl]);

  // ============================================================
  // VALIDAÇÃO DE TOKEN
  // ============================================================

  const validateToken = async (token: string, projId: string): Promise<boolean> => {
    try {
      const respondentDoc = await getDoc(doc(db, 'respondents', token));
      if (!respondentDoc.exists()) return false;

      const data = respondentDoc.data() as Respondent;
      if (data.projectId !== projId) return false;

      setRespondentData(data);
      return true;
    } catch (e) {
      return false;
    }
  };

  // ============================================================
  // VALIDAÇÃO DE EMAIL E CÓDIGO
  // ============================================================

  const handleEmailValidation = async () => {
    const email = emailInput.trim().toLowerCase();
    const code = codeInput.trim();

    if (!email) {
      setAuthError('Digite seu email');
      return;
    }
    if (!code) {
      setAuthError('Digite o código de acesso');
      return;
    }

    setValidating(true);
    setAuthError('');

    try {
      const respondentsQuery = query(
        collection(db, 'respondents'),
        where('projectId', '==', projectId),
        where('email', '==', email)
      );
      const snapshot = await getDocs(respondentsQuery);

      if (snapshot.empty) {
        setAuthError('Este email não está autorizado a participar desta pesquisa.');
        setValidating(false);
        return;
      }

      const respondentDoc = snapshot.docs[0];
      const data = respondentDoc.data() as Respondent;

      if (data.accessCode && data.accessCode !== code) {
        setAuthError('Código de acesso incorreto. Verifique o código recebido.');
        setValidating(false);
        return;
      }

      const respondentId = respondentDoc.id;

      setRespondentId(respondentId);
      setRespondentData(data);

      const responsesQuery = query(
        collection(db, 'responses'),
        where('projectId', '==', projectId),
        where('respondentId', '==', respondentId)
      );
      const existingResponses = await getDocs(responsesQuery);

      const hasPreviousResponse = !existingResponses.empty;

      if (hasPreviousResponse) {
        // [RE-LOGIN] Especialista retornando para um projeto ABERTO
        sessionStorage.setItem(`validatedEmail_${projectId}`, email);
        sessionStorage.setItem(`validatedRespondentId_${projectId}`, respondentId);

        const responseDoc = existingResponses.docs[0];
        const responseData = responseDoc.data();
        setExistingResponseId(responseDoc.id);
        setIsRevisiting(true);

        // Se já finalizou, redireciona direto para tela de agradecimento
        if (responseData.completedAt) {
          setStepTransition(true);
          setTimeout(() => {
            setAuthStep('thankyou');
            setStepTransition(false);
          }, 400);
          return;
        }

        // Carregar respostas anteriores
        await loadExistingProgress(respondentId, projectId, comparisons, project?.alternatives || []);

        setStepTransition(true);
        setTimeout(() => {
          // [CRÍTICO] Pula demografia e instruções, vai direto para a pesquisa
          setAuthStep('authenticated');
          setStepTransition(false);
          showToast('Bem-vindo de volta! Você pode revisar suas respostas.', 'success');
        }, 400);

      } else {
        sessionStorage.setItem(`validatedEmail_${projectId}`, email);
        sessionStorage.setItem(`validatedRespondentId_${projectId}`, respondentId);

        // Fluxo normal de primeiro acesso
        if (data.demographics) {
          await loadExistingProgress(respondentId, projectId, comparisons, project?.alternatives || []);

          if (data.status === 'pending') {
            await updateDoc(doc(db, 'respondents', respondentId), {
              status: 'in_progress',
              startedAt: new Date().toISOString()
            });
          }

          // Se já tem status avançado mas não tem resposta salva (ex: dropou no meio), mostra instruções
          const hasStarted = data.status === 'in_progress';

          setStepTransition(true);
          setTimeout(() => {
            setAuthStep(hasStarted ? 'instructions' : 'instructions'); // Sempre instruções se não finalizou
            setStepTransition(false);
          }, 400);
        } else {
          setStepTransition(true);
          setTimeout(() => {
            // Verificar se já aceitou o TCLE
            if (data.consentAcceptedAt) {
              setAuthStep('demographics');
            } else {
              setAuthStep('consent');
            }
            setStepTransition(false);
          }, 400);
        }
      }
    } catch (error) {
      console.error('Erro na validação:', error);
      setAuthError('Erro ao validar. Tente novamente.');
    } finally {
      setValidating(false);
    }
  };

  // ============================================================
  // SALVAR DADOS DEMOGRÁFICOS
  // ============================================================

  const handleSaveDemographics = async () => {
    // Validar campos obrigatórios (exclui campos com required: false)
    const requiredFields = (Object.keys(DEMOGRAPHIC_OPTIONS) as Array<keyof typeof DEMOGRAPHIC_OPTIONS>)
      .filter(key => (DEMOGRAPHIC_OPTIONS[key] as any).required !== false);
    const emptyFields = requiredFields.filter(field => !demographics[field as keyof DemographicData]);

    if (emptyFields.length > 0) {
      setDemographicsError('Por favor, preencha todos os campos antes de continuar.');
      return;
    }

    // Validação específica para campos "Outro"
    if (demographics.areaAtuacao === 'outro' && !areaOutro.trim()) {
      setDemographicsError('Por favor, especifique sua área de atuação.');
      return;
    }
    if (demographics.funcao === 'outro' && !funcaoOutro.trim()) {
      setDemographicsError('Por favor, especifique seu cargo/função.');
      return;
    }

    setSavingDemographics(true);
    setDemographicsError('');

    try {
      if (!respondentId) throw new Error('Respondente não identificado');

      // Preparar dados para salvar (tratando campos "Outro")
      const demographicsToSave = {
        ...demographics,
        areaAtuacao: demographics.areaAtuacao === 'outro'
          ? `outro: ${areaOutro}`
          : demographics.areaAtuacao,
        funcao: demographics.funcao === 'outro'
          ? `outro: ${funcaoOutro}`
          : demographics.funcao,
        submittedAt: new Date().toISOString()
      };

      // Salvar dados demográficos no respondente
      await updateDoc(doc(db, 'respondents', respondentId), {
        demographics: demographicsToSave,
        status: 'in_progress',
        startedAt: new Date().toISOString()
      });

      // Carregar progresso existente (se houver)
      await loadExistingProgress(respondentId, projectId, comparisons, project?.alternatives || []);

      // Ir para as instruções
      setStepTransition(true);
      setTimeout(() => {
        setAuthStep('instructions');
        setStepTransition(false);
      }, 400);
    } catch (error) {
      console.error('Erro ao salvar dados demográficos:', error);
      setDemographicsError('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingDemographics(false);
    }
  };

  // ============================================================
  // CARREGAR PROGRESSO EXISTENTE
  // ============================================================

  const loadExistingProgress = async (respId: string, projId: string, allComparisons: ComparisonItem[], alts: Alternative[]) => {
    const responsesQuery = query(
      collection(db, 'responses'),
      where('projectId', '==', projId),
      where('respondentId', '==', respId)
    );
    const existingResponses = await getDocs(responsesQuery);

    if (!existingResponses.empty) {
      const response = existingResponses.docs[0].data();
      if (response.completedAt) {
        setAlreadyResponded(true);
        return;
      }
      if (response.judgments && response.currentIndex !== undefined) {
        // Reconstruir judgments como array esparso (indexado por posição global)
        // Os judgments salvos no Firebase são densos — reindexamos para o formato esparso
        if (response.judgments && Array.isArray(response.judgments)) {
          const sparseJudgments: any[] = new Array(allComparisons.length).fill(null);
          response.judgments.forEach((j: any) => {
            const idx = allComparisons.findIndex(
              c => c.type === j.type && c.group === j.group && c.itemA === j.itemA && c.itemB === j.itemB
            );
            if (idx >= 0) sparseJudgments[idx] = j;
          });
          setJudgments(sparseJudgments);
        }
        setCurrentIndex(response.currentIndex);

        // Restaurar bloco correto (project state já populado antes desta chamada)
        // Restaurar blocos e estado
        const restoredBlocks = groupComparisonsByBlock(allComparisons, alts);
        setBlocks(restoredBlocks);

        let blockIdx = 0;
        if (response.currentBlockIndex !== undefined) {
          blockIdx = response.currentBlockIndex;
        } else if (response.currentIndex !== undefined && allComparisons.length > 0) {
          let accumulator = 0;
          for (let b = 0; b < restoredBlocks.length; b++) {
            accumulator += restoredBlocks[b].comparisons.length;
            if (response.currentIndex < accumulator) { blockIdx = b; break; }
            if (b === restoredBlocks.length - 1) blockIdx = b;
          }
        }

        setCurrentBlockIndex(blockIdx);

        // Restaurar grupos completados
        const completed = new Set<string>();
        for (let i = 0; i < blockIdx; i++) {
          if (restoredBlocks[i]) completed.add(restoredBlocks[i].id);
        }
        setCompletedGroups(completed);
      }
    }

    try {
      const respondentRef = doc(db, 'respondents', respId);
      const respondentDoc = await getDoc(respondentRef);
      if (respondentDoc.exists() && respondentDoc.data().status === 'pending') {
        await updateDoc(respondentRef, {
          status: 'in_progress',
          startedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.log('Erro ao atualizar status');
    }
  };

  // ============================================================
  // AUTO-SAVE
  // ============================================================

  useEffect(() => {
    return () => { if (pillTooltipTimer.current) clearTimeout(pillTooltipTimer.current); };
  }, []);

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (judgments.some(j => j != null) && respondentId && !alreadyResponded && authStep === 'authenticated') {
        saveProgress();
      }
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [judgments, respondentId, alreadyResponded, authStep]);

  const saveProgress = async () => {
    if (!respondentId || !projectId) return;
    setSaving(true);
    try {
      const progressData = {
        projectId,
        respondentId,
        judgments: judgments.filter(j => j != null), // Filtrar slots vazios do array esparso
        currentIndex,
        currentBlockIndex, // Salvar bloco atual para restauração
        updatedAt: new Date().toISOString()
      };

      if (savedResponseIdRef.current) {
        // Já temos o ID — sempre updateDoc (evita query + race condition)
        await updateDoc(doc(db, 'responses', savedResponseIdRef.current), progressData);
      } else {
        const responsesQuery = query(
          collection(db, 'responses'),
          where('projectId', '==', projectId),
          where('respondentId', '==', respondentId)
        );
        const existingResponses = await getDocs(responsesQuery);
        if (existingResponses.empty) {
          const docRef = await addDoc(collection(db, 'responses'), progressData);
          savedResponseIdRef.current = docRef.id;
        } else {
          savedResponseIdRef.current = existingResponses.docs[0].id;
          await updateDoc(existingResponses.docs[0].ref, progressData);
        }
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };



  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================

  const getItemName = (code: string): string => {
    // 🆕 MAGNITUDE: usar nomes específicos
    // if (current && current.type === 'magnitude' && code in MAGNITUDE_NAMES) {
    //   return MAGNITUDE_NAMES[code as keyof typeof MAGNITUDE_NAMES];
    // }

    const bocr = BOCR_CRITERIA.find(b => b.code === code);
    if (bocr) return bocr.name;
    const sub = SUBCRITERIA.find(s => s.code === code);
    if (sub) return sub.name;
    const alt = alternatives.find(a => a.code === code);
    if (alt) return alt.name;
    return code;
  };

  const getItemDescription = (code: string): string => {
    // 🆕 MAGNITUDE: usar descrições específicas
    // if (current && current.type === 'magnitude' && code in MAGNITUDE_DESCRIPTIONS) {
    //   return MAGNITUDE_DESCRIPTIONS[code as keyof typeof MAGNITUDE_DESCRIPTIONS];
    // }

    const bocr = BOCR_CRITERIA.find(b => b.code === code);
    if (bocr) return bocr.description;
    const sub = SUBCRITERIA.find(s => s.code === code);
    if (sub) return sub.description;
    const alt = alternatives.find(a => a.code === code);
    if (alt) return alt.description;
    return '';
  };

  const getItemColor = (code: string): string => {
    const bocr = BOCR_CRITERIA.find(b => b.code === code);
    if (bocr) return bocr.color;
    const sub = SUBCRITERIA.find(s => s.code === code);
    if (sub) return sub.color;
    return '#6B7280';
  };



  /**
   * Retorna a descrição verbal da intensidade conforme a escala fundamental de Saaty (1977).
   * Valores ímpares: definições originais. Pares: interpolação entre adjacentes.
   */
  const getSaatyVerbalLabel = (saatyValue: number): string => {
    const labels: Record<number, string> = {
      1: 'igualmente importantes',
      2: 'entre igual e moderadamente mais importante',
      3: 'moderadamente mais importante',
      4: 'entre moderadamente e fortemente mais importante',
      5: 'fortemente mais importante',
      6: 'entre fortemente e muito fortemente mais importante',
      7: 'muito fortemente mais importante',
      8: 'entre muito fortemente e extremamente mais importante',
      9: 'extremamente mais importante',
    };
    return labels[saatyValue] || `intensidade ${saatyValue}`;
  };

  function sliderToSaaty(value: number): { saatyValue: number; favors: 'A' | 'B' | 'equal' } {
    if (value === 0) return { saatyValue: 1, favors: 'equal' };
    if (value < 0) return { saatyValue: Math.abs(value) + 1, favors: 'A' };
    return { saatyValue: value + 1, favors: 'B' };
  }



  /**
   * Pula a comparação atual sem atribuir valor.
   * Valida conectividade do grafo antes de permitir (Bozóki et al., 2009, Teorema 1).
   */
  /**
   * Pula a comparação atual sem atribuir valor.
   * Valida conectividade do grafo antes de permitir (Bozóki et al., 2009, Teorema 1).
   */

  /**
   * Retorna os códigos dos itens para o grupo da comparação atual.
   */
  const getGroupItems = (group: string, type: string): string[] => {
    if (type === 'bocr' || type === 'magnitude') {
      return BOCR_CRITERIA.map(c => c.code); // ['B', 'O', 'C', 'R']
    }
    if (type === 'subcriteria') {
      return SUBCRITERIA.filter(s => s.group === group).map(s => s.code);
    }
    if (type === 'alternatives') {
      return alternatives.map(a => a.code);
    }
    return [];
  };

  // ============================================================
  // TELA DE LOADING
  // ============================================================

  if (loading || authStep === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  // ============================================================
  // TELA DE ERRO
  // ============================================================

  if (authStep === 'error' || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Erro</h1>
          <p className="text-gray-600">{error || 'Ocorreu um erro inesperado.'}</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA DE VALIDAÇÃO DE EMAIL E CÓDIGO
  // ============================================================

  if (authStep === 'email_validation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <VideoBackground />
        <ParticlesBackground />

        {/* Card de Login — Glassmorphism */}
        <div
          className={`w-full max-w-md relative ${stepTransition ? 'animate-slide-out' : 'animate-slide-in'}`}
          style={{
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <div className="p-8 sm:p-10">
            {/* Ícone com glow */}
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center animate-icon-glow"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.2))',
                  border: '1px solid rgba(6,182,212,0.3)',
                }}
              >
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>

            {/* Título e subtítulo */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-white mb-1">Acesso à Pesquisa</h1>
              <p className="text-base text-white/70">
                {project?.name || 'Pesquisa AHP-BOCR'}
              </p>
            </div>

            {/* Stepper — glass style */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center">
                <div className="w-7 h-7 bg-cyan-500/80 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg shadow-cyan-500/20">1</div>
                <span className="ml-1.5 text-sm font-medium text-cyan-300">Login</span>
              </div>
              <div className="w-6 h-px bg-white/20 mx-2"></div>
              <div className="flex items-center">
                <div className="w-7 h-7 bg-white/15 text-white/60 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <span className="ml-1.5 text-sm text-white/60">Consentimento</span>
              </div>
              <div className="w-6 h-px bg-white/20 mx-2"></div>
              <div className="flex items-center">
                <div className="w-7 h-7 bg-white/15 text-white/60 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <span className="ml-1.5 text-sm text-white/60">Perfil</span>
              </div>
              <div className="w-6 h-px bg-white/20 mx-2"></div>
              <div className="flex items-center">
                <div className="w-7 h-7 bg-white/15 text-white/60 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <span className="ml-1.5 text-sm text-white/60">Pesquisa</span>
              </div>
            </div>

            {/* Box info — glass ciano */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
              }}
            >
              <p className="text-base text-cyan-300">
                <strong>🔐 Verificação de identidade</strong><br />
                <span className="text-sm text-cyan-300/70">Digite seu email e o código de acesso que você recebeu.</span>
              </p>
            </div>

            {/* Formulário */}
            <div className="space-y-5">
              {/* Campo Email */}
              <div>
                <label className="block text-base font-semibold text-white/80 mb-2">
                  Seu email
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/60 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={validating}
                  autoFocus
                />
              </div>

              {/* Campo Código de Acesso */}
              <div>
                <label className="block text-base font-semibold text-white/80 mb-2">
                  Código de acesso
                </label>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailValidation()}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/60 outline-none transition-all duration-200 text-center text-2xl font-mono tracking-[0.5em]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={validating}
                />
                <p className="text-sm text-white/60 mt-2 text-center">
                  Código de 6 dígitos enviado com seu link de acesso
                </p>
              </div>

              {/* Erro */}
              {authError && (
                <div
                  className="p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <span>⚠️</span>
                  <span className="text-red-300">{authError}</span>
                </div>
              )}

              {/* Botão CTA */}
              <button
                onClick={handleEmailValidation}
                disabled={validating || !emailInput.trim() || codeInput.length < 6}
                className="w-full py-3.5 text-white font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.45)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.3)';
                }}
              >
                {validating ? 'Validando...' : 'Verificar e Continuar →'}
              </button>
            </div>

            {/* Link de ajuda */}
            <div className="mt-6 pt-5 border-t border-white/10 text-center">
              <a
                href="mailto:pedro.palma@unesp.br"
                className="text-sm text-cyan-400/70 hover:text-cyan-300 transition-colors"
              >
                Precisa de ajuda? Contate o pesquisador
              </a>
            </div>
          </div>
        </div>

        {/* Footer institucional */}
        <div className="mt-8 text-center relative animate-slide-in" style={{ zIndex: 10, animationDelay: '0.3s', opacity: 0 }}>
          <p className="text-sm text-white/25 tracking-wide">
            UNESP · FEG · Mestrado Profissional em Engenharia de Produção
          </p>
        </div>

        <style jsx global>{`
          @keyframes iconGlow {
            0%, 100% {
              box-shadow: 0 0 20px rgba(6, 182, 212, 0.15), 0 0 40px rgba(6, 182, 212, 0.05);
            }
            50% {
              box-shadow: 0 0 25px rgba(6, 182, 212, 0.3), 0 0 50px rgba(6, 182, 212, 0.1);
            }
          }
          .animate-icon-glow {
            animation: iconGlow 3s ease-in-out infinite;
          }
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slide-in {
            animation: slideInUp 0.7s ease-out forwards;
          }
          @keyframes slideOutLeft {
            from {
              opacity: 1;
              transform: translateX(0);
            }
            to {
              opacity: 0;
              transform: translateX(-30px);
            }
          }
          .animate-slide-out {
            animation: slideOutLeft 0.4s ease-in forwards;
          }
        `}</style>
      </div>
    );
  }

  // ============================================================
  // TELA DE CONSENTIMENTO
  // ============================================================

  if (authStep === 'consent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 py-8 px-4 relative overflow-hidden">
        <VideoBackground />
        <ParticlesBackground />
        <div className={`max-w-2xl mx-auto relative z-10 ${stepTransition ? 'animate-slide-out' : 'animate-slide-in'}`}>
          <div className="rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}>

            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-cyan-600/80 to-blue-600/80">
              <h1 className="text-2xl font-bold text-white mb-1">Termo de Consentimento</h1>
              <p className="text-cyan-100 text-sm">Leia atentamente antes de prosseguir</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center py-4 bg-white/5 border-b border-white/10">
              <div className="flex items-center">
                <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                <span className="ml-1.5 text-sm text-green-400">Login</span>
              </div>
              <div className="w-5 h-px bg-cyan-500 mx-1.5"></div>
              <div className="flex items-center">
                <div className="w-7 h-7 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg shadow-cyan-500/30">2</div>
                <span className="ml-1.5 text-sm font-medium text-cyan-300">Termo</span>
              </div>
              <div className="w-5 h-px bg-white/20 mx-1.5"></div>
              <div className="flex items-center opacity-50">
                <div className="w-7 h-7 bg-white/15 text-white/60 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <span className="ml-1.5 text-sm text-white/60">Perfil</span>
              </div>
              <div className="w-5 h-px bg-white/20 mx-1.5"></div>
              <div className="flex items-center opacity-50">
                <div className="w-7 h-7 bg-white/15 text-white/60 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <span className="ml-1.5 text-sm text-white/60">Pesquisa</span>
              </div>
            </div>

            {/* Corpo do Termo */}
            <div className="p-6">
              <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4 text-base text-white/80 leading-relaxed"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                }}>

                <p className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Termo de Consentimento Livre e Esclarecido (TCLE)</p>

                <p>Você está sendo convidado(a) a participar de uma pesquisa acadêmica intitulada <strong className="text-white">"ANÁLISE MULTICRITÉRIO DE INVESTIMENTOS NA INDÚSTRIA 4.0 EM UMA MONTADORA DE AUTOMÓVEIS"</strong>, conduzida por Pedro Luis Tozoni Palma, aluno do Mestrado Profissional em Engenharia de Produção da Universidade Estadual Paulista (UNESP), campus de Guaratinguetá, sob orientação do Prof. Dr. Valério Antonio Pamplona Salomon.</p>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Objetivo da pesquisa</p>
                    <p>Desenvolver e aplicar um modelo estruturado de apoio à decisão para avaliação de investimentos em tecnologias da Indústria 4.0 no setor automotivo brasileiro, considerando benefícios, oportunidades, custos e riscos associados.</p>
                  </div>

                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Sua participação</p>
                    <p>Consiste no preenchimento de um questionário online onde você avaliará, com base na sua experiência profissional, a importância relativa de critérios de decisão e de duas alternativas tecnológicas para otimização do consumo de gás natural em estufas de cura de pintura automotiva. O sistema apresentará pares de critérios e você indicará qual considera mais importante e em que intensidade. O tempo estimado de participação é de aproximadamente 20 minutos.</p>
                  </div>

                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Confidencialidade</p>
                    <p>Suas respostas serão mantidas em estrita confidencialidade. Os dados coletados serão utilizados exclusivamente para fins acadêmicos e os resultados serão apresentados de forma agregada, sem identificação individual dos participantes. Os dados serão armazenados em ambiente digital seguro e mantidos pelo período necessário à conclusão da pesquisa. Os valores de consumo energético e indicadores financeiros apresentados no questionário são estimativas paramétricas baseadas em literatura científica, não representando dados reais ou confidenciais da empresa.</p>
                  </div>

                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Voluntariedade</p>
                    <p>Sua participação é voluntária. Você pode interromper o preenchimento a qualquer momento, sem necessidade de justificativa e sem qualquer prejuízo.</p>
                  </div>

                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Riscos e benefícios</p>
                    <p>A pesquisa não apresenta riscos previsíveis além do tempo dedicado ao preenchimento. Como benefício indireto, os participantes contribuirão para o desenvolvimento de um modelo de apoio à decisão aplicável a contextos similares de investimento em tecnologias Indústria 4.0 no setor automotivo.</p>
                  </div>

                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Acesso aos resultados</p>
                    <p>Após a conclusão da pesquisa, os resultados agregados poderão ser disponibilizados aos participantes interessados mediante solicitação ao pesquisador responsável.</p>
                  </div>

                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Contato</p>
                    <p>Em caso de dúvidas, entre em contato com o pesquisador responsável: <a href="mailto:pedro.palma@unesp.br" className="text-cyan-400 hover:text-cyan-300 underline">pedro.palma@unesp.br</a></p>
                  </div>
                </div>
              </div>

              {/* Checkbox de aceite */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-base text-white/70 group-hover:text-white/90 transition-colors">
                    Declaro que li e compreendi as informações acima e concordo em participar voluntariamente desta pesquisa.
                  </span>
                </label>
              </div>

              {/* Botão */}
              <button
                onClick={async () => {
                  if (!consentAccepted || !respondentId) return;
                  try {
                    await updateDoc(doc(db, 'respondents', respondentId), {
                      consentAcceptedAt: new Date().toISOString()
                    });
                    setStepTransition(true);
                    setTimeout(() => {
                      setAuthStep('demographics');
                      setStepTransition(false);
                    }, 400);
                  } catch (err) {
                    console.error('Erro ao registrar consentimento:', err);
                  }
                }}
                disabled={!consentAccepted}
                className="w-full mt-4 py-3.5 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
                style={{
                  background: consentAccepted ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.1)',
                  boxShadow: consentAccepted ? '0 4px 15px rgba(6, 182, 212, 0.3)' : 'none',
                }}
              >
                {consentAccepted ? 'Concordo e desejo prosseguir →' : 'Marque a caixa acima para continuar'}
              </button>

              {/* Link de recusa */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    if (confirm('Ao recusar, você não poderá participar da pesquisa. Deseja realmente sair?')) {
                      window.location.href = '/';
                    }
                  }}
                  className="text-sm text-white/60 hover:text-white/70 transition-colors underline"
                >
                  Não desejo participar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA DE DADOS DEMOGRÁFICOS
  // ============================================================

  if (authStep === 'demographics') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 py-8 px-4 relative overflow-hidden">
        <VideoBackground />
        <ParticlesBackground />
        <div className={`max-w-2xl mx-auto relative z-10 ${stepTransition ? 'animate-slide-out' : 'animate-slide-in'}`}>
          <div className="rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600/80 to-purple-600/80">
              <h1 className="text-2xl font-bold text-white mb-2">Perfil do Especialista</h1>
              <p className="text-indigo-100 text-sm">
                Antes de iniciar a avaliação, precisamos conhecer um pouco sobre seu perfil profissional.
              </p>
            </div>

            {/* Indicador de etapa */}
            <div className="flex items-center justify-center py-4 bg-white/5 border-b border-white/10">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
                <span className="ml-2 text-sm text-green-500">Login</span>
              </div>
              <div className="w-8 h-px bg-green-500 mx-2"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
                <span className="ml-2 text-sm text-green-500">Consentimento</span>
              </div>
              <div className="w-8 h-px bg-green-500 mx-2"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/30">3</div>
                <span className="ml-2 text-sm font-medium text-indigo-300">Perfil</span>
              </div>
              <div className="w-8 h-px bg-white/30 mx-2"></div>
              <div className="flex items-center opacity-50">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white/60">4</div>
                <span className="ml-2 text-sm text-white/60">Pesquisa</span>
              </div>
            </div>

            {/* Formulário */}
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Idade */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {DEMOGRAPHIC_OPTIONS.idade.label} <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={demographics.idade}
                    onChange={(e) => setDemographics({ ...demographics, idade: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none text-white transition-all"
                  >
                    <option value="" className="bg-gray-900 text-white">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.idade.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Gênero */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {DEMOGRAPHIC_OPTIONS.genero.label}
                  </label>
                  <select
                    value={demographics.genero}
                    onChange={(e) => setDemographics({ ...demographics, genero: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none text-white transition-all"
                  >
                    <option value="" className="bg-gray-900 text-white">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.genero.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Formação */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {DEMOGRAPHIC_OPTIONS.formacao.label} <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={demographics.formacao}
                    onChange={(e) => setDemographics({ ...demographics, formacao: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none text-white transition-all"
                  >
                    <option value="" className="bg-gray-900 text-white">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.formacao.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Área de Formação */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {DEMOGRAPHIC_OPTIONS.areaFormacao.label} <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={demographics.areaFormacao}
                    onChange={(e) => setDemographics({ ...demographics, areaFormacao: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none text-white transition-all"
                  >
                    <option value="" className="bg-gray-900 text-white">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.areaFormacao.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tempo de Trabalho */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {DEMOGRAPHIC_OPTIONS.tempoTrabalho.label} <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={demographics.tempoTrabalho}
                    onChange={(e) => setDemographics({ ...demographics, tempoTrabalho: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none text-white transition-all"
                  >
                    <option value="" className="bg-gray-900 text-white">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.tempoTrabalho.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tempo como Gestor */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {DEMOGRAPHIC_OPTIONS.tempoGestor.label}
                  </label>
                  <select
                    value={demographics.tempoGestor}
                    onChange={(e) => setDemographics({ ...demographics, tempoGestor: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none text-white transition-all"
                  >
                    <option value="" className="bg-gray-900 text-white">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.tempoGestor.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Área de Atuação */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    {DEMOGRAPHIC_OPTIONS.areaAtuacao.label} <span className="text-red-400">*</span>
                  </label>
                  <p className="text-sm text-white/60 mb-2 italic">{DEMOGRAPHIC_OPTIONS.areaAtuacao.hint}</p>
                  <select
                    value={demographics.areaAtuacao}
                    onChange={(e) => setDemographics({ ...demographics, areaAtuacao: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none text-white transition-all"
                  >
                    <option value="" className="bg-gray-900 text-white">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.areaAtuacao.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">{opt.label}</option>
                    ))}
                  </select>
                  {demographics.areaAtuacao === 'outro' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={areaOutro}
                        onChange={(e) => setAreaOutro(e.target.value)}
                        placeholder="Especifique sua área de atuação"
                        className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Função */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    {DEMOGRAPHIC_OPTIONS.funcao.label} <span className="text-red-400">*</span>
                  </label>
                  <p className="text-sm text-white/60 mb-2 italic">{DEMOGRAPHIC_OPTIONS.funcao.hint}</p>
                  <select
                    value={demographics.funcao}
                    onChange={(e) => setDemographics({ ...demographics, funcao: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none text-white transition-all"
                  >
                    <option value="" className="bg-gray-900 text-white">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.funcao.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">{opt.label}</option>
                    ))}
                  </select>
                  {demographics.funcao === 'outro' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={funcaoOutro}
                        onChange={(e) => setFuncaoOutro(e.target.value)}
                        placeholder="Especifique seu cargo/função"
                        className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Erro */}
              {demographicsError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                  <p className="text-sm text-red-300">{demographicsError}</p>
                </div>
              )}

              {/* Informação de privacidade */}
              <div className="mt-6 p-4 bg-white/10 border border-white/10 rounded-lg">
                <p className="text-sm text-white/70">
                  <strong>🔒 Privacidade:</strong> Seus dados são confidenciais e serão utilizados apenas para fins estatísticos
                  da pesquisa acadêmica. Os resultados serão apresentados de forma agregada, sem identificação individual.
                </p>
              </div>

              {/* Botão */}
              <button
                onClick={handleSaveDemographics}
                disabled={savingDemographics}
                className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl hover:scale-[1.01]"
              >
                {savingDemographics ? 'Salvando...' : 'Iniciar Avaliação →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA DE JÁ RESPONDIDO
  // ============================================================

  // ============================================================
  // TELA DE INSTRUÇÕES — Como responder a pesquisa
  // ============================================================

  // ============================================================
  // CONSTRUÇÃO DAS 5 ABAS DE INSTRUÇÕES (reutilizada na tela
  // pré-questionário e no modal "Rever instruções" do questionário)
  // ============================================================
  const buildInstructionSteps = () => {
    // Helpers para apresentação da ficha técnica das alternativas
    const trlDescription = (trl?: number): string => {
      const map: Record<number, string> = {
        1: 'TRL 1 — princípios básicos observados',
        2: 'TRL 2 — conceito tecnológico formulado',
        3: 'TRL 3 — prova de conceito experimental',
        4: 'TRL 4 — validada em laboratório',
        5: 'TRL 5 — validada em ambiente relevante',
        6: 'TRL 6 — demonstrada em ambiente industrial',
        7: 'TRL 7 — demonstrada em ambiente operacional',
        8: 'TRL 8 — sistema completo qualificado',
        9: 'TRL 9 — sistema operacional comprovado',
      };
      return (trl && map[trl]) || 'TRL não informado';
    };

    const timelineLabel = (t?: string): string => {
      const map: Record<string, string> = {
        '3-6': '3 a 6 meses',
        '6-12': '6 a 12 meses',
        '12-24': '12 a 24 meses',
        '24+': 'Mais de 24 meses',
      };
      return (t && map[t]) || t || 'Não informado';
    };

    const parseInvestmentRange = (str?: string): { capex?: string; opex?: string } => {
      if (!str) return {};
      const capexMatch = str.match(/(R\$[\s.\d,]+)\s*\(CAPEX\)/i);
      const opexMatch = str.match(/(R\$[\s.\d,/a-z]+?)\s*\(OPEX\)/i);
      return {
        capex: capexMatch?.[1]?.trim(),
        opex: opexMatch?.[1]?.trim(),
      };
    };

    const parsePayback = (c3?: string): string | undefined => {
      if (!c3) return undefined;
      const m = c3.match(/(\d+[.,]?\d*)\s*anos?/i);
      return m ? `~${m[1]} anos` : undefined;
    };

    const SHORT_SUMMARIES: Record<string, string> = {
      A1: 'Sensores inteligentes e IA ajustam automaticamente a mistura ar-combustível nos queimadores em tempo real, sem necessidade de intervenções físicas na estufa.',
      A2: 'Simulação computacional de alta fidelidade identifica ineficiências de projeto das estufas e orienta otimizações estruturais de geometria e fluxo de ar.',
    };

    const instructionSteps = [
      {
        icon: '🗺️',
        title: 'Contexto da Decisão',
        content: (
          <div className="space-y-4">
            {/* Contexto industrial (do Firestore) */}
            {project?.industrialContext && (
              <div className="p-4 rounded-xl" style={{ background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                <p className="text-sm text-slate-300 font-semibold uppercase tracking-wider mb-1">Contexto industrial</p>
                <p className="text-base text-white/80 leading-relaxed whitespace-pre-line">{project.industrialContext}</p>
              </div>
            )}

            {/* Meta */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Meta da Pesquisa</p>
              <p className="text-white font-medium">
                {project?.name || 'Selecionar a melhor alternativa de investimento em Indústria 4.0'}
              </p>
              {project?.description && (
                <p className="text-base text-white/70 mt-1 leading-relaxed">{project.description}</p>
              )}
              <p className="text-base text-white/70 mt-2 leading-relaxed">
                A avaliação é estruturada em quatro dimensões (<strong className="text-white">Benefícios, Oportunidades, Custos e Riscos</strong>), organizadas sob as perspectivas de competitividade, aspectos sociotécnicos e sustentabilidade.
              </p>
            </div>

            {/* Alternativas — resumo executivo (camada 1) + detalhes técnicos (camada 2) */}
            <div>
              <p className="text-base text-white/60 uppercase tracking-wider mb-2">Alternativas em Avaliação</p>
              <div className="space-y-3">
                {(project?.alternatives || alternatives || []).map((alt: any, i: number) => {
                  const code = alt.code || `A${i + 1}`;
                  const shortSummary = SHORT_SUMMARIES[code] || (alt.description ? alt.description.split('.')[0] + '.' : '');
                  const { capex, opex } = parseInvestmentRange(alt.investmentRange);
                  const payback = parsePayback(alt.impacts?.C3);
                  const trlText = trlDescription(alt.trl);
                  const timelineText = timelineLabel(alt.timeline);

                  return (
                    <div key={code} className="p-4 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                      {/* Cabeçalho: badge + nome */}
                      <div className="flex items-start gap-3 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold text-white flex-shrink-0" style={{ background: '#8b5cf6' }}>
                          {code}
                        </span>
                        <p className="text-base font-semibold text-white">{alt.name}</p>
                      </div>

                      {/* Resumo curto */}
                      {shortSummary && (
                        <p className="text-base text-white/75 leading-relaxed mb-3">{shortSummary}</p>
                      )}

                      {/* Ficha técnica (grid com ícones) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {capex && (
                          <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider">💰 Investimento (CAPEX)</p>
                            <p className="text-sm text-white font-medium mt-0.5">{capex}</p>
                          </div>
                        )}
                        {opex && (
                          <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider">🔄 Operação anual (OPEX)</p>
                            <p className="text-sm text-white font-medium mt-0.5">{opex}</p>
                          </div>
                        )}
                        {payback && (
                          <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider">⏱️ Payback estimado</p>
                            <p className="text-sm text-white font-medium mt-0.5">{payback}</p>
                          </div>
                        )}
                        {alt.trl != null && (
                          <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider">🔧 Maturidade (TRL)</p>
                            <p className="text-sm text-white font-medium mt-0.5">{trlText}</p>
                          </div>
                        )}
                        {alt.timeline && (
                          <div className="sm:col-span-2">
                            <p className="text-xs text-white/50 uppercase tracking-wider">📅 Prazo de implementação</p>
                            <p className="text-sm text-white font-medium mt-0.5">{timelineText}</p>
                          </div>
                        )}
                      </div>

                      {/* Camada 2: detalhes técnicos (recolhidos) */}
                      {alt.description && (
                        <details className="mt-3 group">
                          <summary className="cursor-pointer text-sm text-purple-300 hover:text-purple-200 font-medium list-none flex items-center gap-1.5 select-none">
                            <span className="transition-transform group-open:rotate-90">▸</span>
                            <span>Ver detalhes técnicos</span>
                          </summary>
                          <p className="text-base text-white/65 leading-relaxed mt-2 pl-5">{alt.description}</p>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOCR — bloco explicativo */}
            <div>
              <p className="text-base text-white/60 uppercase tracking-wider mb-2">Entendendo as 4 dimensões de avaliação (BOCR)</p>
              <div className="space-y-2">
                {[
                  {
                    code: 'B',
                    label: 'Benefícios',
                    color: '#10b981',
                    desc: 'Ganhos tangíveis e mensuráveis que a tecnologia entrega de forma direta e contínua durante sua operação.',
                    example: 'Economia de combustível, aumento de produtividade.',
                  },
                  {
                    code: 'O',
                    label: 'Oportunidades',
                    color: '#3b82f6',
                    desc: 'Ganhos estratégicos, intangíveis ou de longo prazo que a tecnologia viabiliza além do benefício operacional direto.',
                    example: 'Posicionamento como smart factory, geração de dados para certificações ESG.',
                  },
                  {
                    code: 'C',
                    label: 'Custos',
                    color: '#f59e0b',
                    desc: 'Desembolsos financeiros planejados e quantificáveis necessários para implementar e operar a tecnologia.',
                    example: 'Investimento inicial (CAPEX), custo operacional anual (OPEX), capacitação de equipe.',
                  },
                  {
                    code: 'R',
                    label: 'Riscos',
                    color: '#ef4444',
                    desc: 'Impactos negativos incertos ou contingentes, cuja probabilidade e magnitude dependem de fatores externos ou internos não totalmente controláveis.',
                    example: 'Vulnerabilidade cibernética, dependência de fornecedor, resistência organizacional.',
                  },
                ].map(merit => (
                  <div key={merit.code} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: `${merit.color}10`, border: `1px solid ${merit.color}25` }}>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold text-white flex-shrink-0" style={{ background: merit.color }}>{merit.code}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{merit.label}</p>
                      <p className="text-base text-white/75 leading-relaxed mt-0.5">{merit.desc}</p>
                      <p className="text-sm text-white/55 leading-relaxed mt-1 italic">Exemplo: {merit.example}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Critérios BOCR — subcritérios */}
            <div>
              <p className="text-base text-white/60 uppercase tracking-wider mb-2">Subcritérios por dimensão</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'B', label: 'Benefícios', color: '#10b981' },
                  { code: 'O', label: 'Oportunidades', color: '#3b82f6' },
                  { code: 'C', label: 'Custos', color: '#f59e0b' },
                  { code: 'R', label: 'Riscos', color: '#ef4444' },
                ].map(merit => {
                  const items = SUBCRITERIA.filter(s => s.group === merit.code || s.code.startsWith(merit.code));
                  return (
                    <div key={merit.code} className="p-3 rounded-lg" style={{ background: `${merit.color}10`, border: `1px solid ${merit.color}25` }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold text-white" style={{ background: merit.color }}>{merit.code}</span>
                        <span className="text-sm font-semibold text-white">{merit.label}</span>
                      </div>
                      <ul className="space-y-0.5">
                        {items.slice(0, 5).map((item, i) => (
                          <li key={i} className="text-sm text-white/70 flex items-start gap-1.5">
                            <span className="flex-shrink-0 mt-0.5">•</span>
                            <span>{item.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-white/70 italic">
              Seus julgamentos de preferência entre critérios e alternativas serão utilizados para calcular a prioridade de cada alternativa, auxiliando na tomada de decisão.
            </p>
          </div>
        ),
      },
      {
        icon: '🎯',
        title: 'O que você vai fazer',
        content: (
          <div className="space-y-4">
            <p className="text-white/80 text-base leading-relaxed">
              Nesta pesquisa, será aplicado o Método AHP desenvolvido por Thomas Saaty. Você vai comparar <strong className="text-white">pares de critérios e alternativas</strong>, um par por vez.
            </p>
            <p className="text-white/80 text-base leading-relaxed">
              Para cada par, sua tarefa é responder:
            </p>
            <div className="my-4 p-4 rounded-xl text-center" style={{ background: 'rgba(6, 182, 212, 0.15)', border: '2px solid rgba(6, 182, 212, 0.4)' }}>
              <p className="text-lg font-semibold text-cyan-200 leading-relaxed italic">
                "Qual dos dois é mais importante para a decisão de investimento em Indústria 4.0, e com que intensidade?"
              </p>
            </div>

            {/* O que esperar */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
              <p className="text-sm text-slate-300 font-semibold uppercase tracking-wider mb-2">O que esperar</p>
              <ul className="space-y-2 text-base text-white/80 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">⏱️</span>
                  <span><strong className="text-white">Duração estimada:</strong> 20 a 30 minutos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">🔢</span>
                  <span>Você fará <strong className="text-white">72 comparações</strong> entre pares, organizadas em 10 blocos sequenciais. Graças ao método de comparação incompleta (IPC), o número mínimo necessário é de <strong className="text-white">42</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">📊</span>
                  <span>Cada comparação pergunta <em>"qual elemento é mais importante/impactante e com que intensidade"</em>, usando uma escala de <strong className="text-white">1</strong> (igual importância) a <strong className="text-white">9</strong> (extrema importância).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">🔒</span>
                  <span>Os julgamentos são <strong className="text-white">anônimos</strong> e agregados aos dos demais especialistas via média geométrica.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">💾</span>
                  <span>Seu progresso é <strong className="text-white">salvo automaticamente</strong> — você pode interromper a qualquer momento e retomar depois.</span>
                </li>
              </ul>
            </div>

            {/* As 4 etapas de julgamento */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <p className="text-sm text-purple-300 font-semibold uppercase tracking-wider mb-2">As 4 etapas de julgamento</p>
              <ol className="space-y-2 text-base text-white/80 leading-relaxed">
                {[
                  { title: 'Dimensões BOCR', desc: 'Comparar as 4 dimensões entre si para definir qual é mais importante na decisão de investimento.' },
                  { title: 'Magnitude dos méritos', desc: 'Comparar a intensidade com que cada dimensão impacta a decisão.' },
                  { title: 'Subcritérios dentro de cada dimensão', desc: 'Para cada dimensão (B, O, C e R), comparar os 5 subcritérios entre si para estabelecer a importância relativa dentro daquela dimensão.' },
                  { title: 'Alternativas em cada subcritério', desc: 'Comparar A1 vs A2 em cada um dos 20 subcritérios, indicando qual alternativa entrega maior valor (para Benefícios e Oportunidades) ou apresenta maior impacto negativo (para Custos e Riscos).' },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ background: '#8b5cf6' }}>{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-white font-medium">{step.title}</p>
                      <p className="text-base text-white/70 mt-0.5">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="p-4 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <p className="text-cyan-300 text-base">
                💡 Não existe resposta certa ou errada. Use sua experiência profissional e seu julgamento pessoal.
              </p>
            </div>
          </div>
        ),
      },
      {
        icon: '⚖️',
        title: 'Como funciona a escala',
        content: (
          <div className="space-y-4">
            <p className="text-white/80 text-base leading-relaxed">
              Para cada par, você verá uma fileira de <strong className="text-white">botões circulares</strong>. O botão central (=) significa que ambos são igualmente importantes.
            </p>

            {/* Exemplo visual */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-center mb-3">
                <span className="text-sm text-white/60">Exemplo: comparando Preço e Qualidade</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-bold text-cyan-400">Preço</span>
                <div className="flex items-center gap-1">
                  {['9', '7', '5', '3', '=', '3', '5', '7', '9'].map((v, i) => (
                    <div key={i} className="flex items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        width: i === 4 ? '28px' : '22px',
                        height: i === 4 ? '28px' : '22px',
                        background: i === 6 ? '#a855f7' : '#f1f5f9',
                        color: i === 6 ? '#fff' : '#94a3b8',
                        border: `2px solid ${i === 6 ? 'transparent' : '#e2e8f0'}`,
                        transform: i === 6 ? 'scale(1.15)' : 'scale(1)',
                      }}>{v}</div>
                  ))}
                </div>
                <span className="text-sm font-bold text-purple-400">Qualidade</span>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm text-white/60">→ Neste exemplo: Qualidade é <strong className="text-white">consideravelmente mais importante</strong> que Preço</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-white/70">
              <span className="text-cyan-400">←</span>
              <span>Botões à esquerda favorecem o primeiro item</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <span className="text-purple-400">→</span>
              <span>Botões à direita favorecem o segundo item</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <span className="text-gray-400">=</span>
              <span>Botão central = ambos igualmente importantes</span>
            </div>
          </div>
        ),
      },
      {
        icon: '📊',
        title: 'Significado dos valores',
        content: (
          <div className="space-y-4">
            <p className="text-white/80 text-base leading-relaxed">
              Os números representam <strong className="text-white">intensidade da preferência</strong>, conforme a Escala Saaty:
            </p>

            {/* Analogia: régua de preferência */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(99, 102, 241, 0.10)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <p className="text-sm text-indigo-300 font-semibold uppercase tracking-wider mb-1">📏 Régua de preferência</p>
              <p className="text-base text-white/80 leading-relaxed">
                Pense na escala como uma régua de preferência entre dois elementos: <strong className="text-white">1</strong> significa empate total, <strong className="text-white">3</strong> uma vantagem discreta mas clara, <strong className="text-white">5</strong> uma vantagem expressiva, <strong className="text-white">7</strong> dominância demonstrável na prática, e <strong className="text-white">9</strong> preferência sem comparação possível. Os valores pares (<strong className="text-white">2, 4, 6, 8</strong>) permitem calibrar posições intermediárias quando sua opinião está entre dois níveis adjacentes.
              </p>
            </div>

            <div className="space-y-1.5">
              {[
                { val: '1', label: 'Igual importância', desc: 'Ambos contribuem igualmente' },
                { val: '3', label: 'Importância moderada', desc: 'Experiência favorece levemente um sobre o outro' },
                { val: '5', label: 'Importância forte', desc: 'Experiência favorece fortemente um sobre o outro' },
                { val: '7', label: 'Importância muito forte', desc: 'Um é dominante e isso é demonstrado na prática' },
                { val: '9', label: 'Importância extrema', desc: 'A evidência favorece um com o mais alto grau de certeza' },
              ].map(item => (
                <div key={item.val} className="flex items-start gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>{item.val}</span>
                  <div>
                    <span className="text-base font-medium text-white">{item.label}</span>
                    <p className="text-base text-white/60 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>2,4,6,8</span>
                <div>
                  <span className="text-base font-medium text-white">Valores intermediários</span>
                  <p className="text-base text-white/60 mt-0.5">Use quando sua opinião está entre dois níveis adjacentes</p>
                </div>
              </div>
            </div>

            {/* Exemplo aplicado */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <p className="text-sm text-amber-300 font-semibold uppercase tracking-wider mb-2">📌 Exemplo aplicado</p>
              <p className="text-base text-white/80 leading-relaxed mb-2">
                Suponha que você está comparando <strong className="text-white">Payback (C3)</strong> com <strong className="text-white">Valor do Investimento (C1)</strong>, dentro da dimensão de Custos.
              </p>
              <ul className="space-y-1.5 text-base text-white/75 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">•</span>
                  <span>Se para você ambos importam igualmente na decisão → selecione <strong className="text-white">1</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">•</span>
                  <span>Se o Payback é marcadamente mais decisivo, mas o Valor do Investimento também pesa → selecione <strong className="text-white">3</strong> ou <strong className="text-white">5</strong> para Payback.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">•</span>
                  <span>Se, na sua experiência, o Payback é praticamente o único fator relevante e o Valor do Investimento tem peso desprezível → selecione <strong className="text-white">9</strong> para Payback.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">•</span>
                  <span>Se você hesita entre "moderado" (3) e "forte" (5) → use <strong className="text-white">4</strong>.</span>
                </li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        icon: '💡',
        title: 'Dicas importantes',
        content: (
          <div className="space-y-3">
            {[
              { icon: '🔄', text: 'Você pode alterar qualquer resposta a qualquer momento — basta clicar em outro botão, ou clicar no mesmo botão para limpar.' },
              { icon: '💾', text: 'Seu progresso é salvo automaticamente a cada 30 segundos. Se fechar o navegador, pode retomar de onde parou.' },
              { icon: '📖', text: 'Clique nos badges coloridos (ex: B, O, C, R) para ver a definição de cada critério. Use o glossário no topo de cada bloco para consultar todos.' },
              { icon: '⏭️', text: 'Comparações obrigatórias vs. complementares: 42 das 72 comparações são obrigatórias para validade do cálculo (marcadas com barra vermelha à esquerda), conforme o método IPC. As demais são complementares — responda se quiser aumentar a precisão.' },
              { icon: '🧭', text: 'A navegação segue uma ordem lógica (Dimensões → Magnitude → Subcritérios → Alternativas). Você pode voltar a qualquer bloco anterior para revisar suas respostas usando a barra lateral de progresso.' },
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-lg flex-shrink-0">{tip.icon}</span>
                <p className="text-base text-white/80 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        ),
      },
    ];

    return instructionSteps;
  };

  if (authStep === 'instructions') {
    const instructionSteps = buildInstructionSteps();
    const currentInstruction = instructionSteps[instructionStep];
    const isLastStep = instructionStep === instructionSteps.length - 1;

    const handleStartSurvey = async () => {
      // Carregar progresso (caso haja algum de sessão anterior)
      if (respondentId) {
        await loadExistingProgress(respondentId, projectId, comparisons, project?.alternatives || []);
      }
      setStepTransition(true);
      setTimeout(() => {
        setAuthStep('authenticated');
        setStepTransition(false);
      }, 400);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 py-6 px-4 relative overflow-hidden">
        <VideoBackground />
        <ParticlesBackground />
        <div className={`max-w-4xl mx-auto relative z-10 ${stepTransition ? 'animate-slide-out' : 'animate-slide-in'}`}>
          <div className="rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}>

            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-cyan-600/80 to-blue-600/80">
              <h1 className="text-2xl font-bold text-white mb-1">Como responder a pesquisa</h1>
              <p className="text-cyan-100 text-sm">Leia as instruções antes de iniciar a avaliação</p>
            </div>

            {/* Stepper global */}
            <div className="flex items-center justify-center py-4 bg-white/5 border-b border-white/10">
              <div className="flex items-center">
                <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                <span className="ml-1.5 text-sm text-green-400">Login</span>
              </div>
              <div className="w-5 h-px bg-green-500 mx-1.5"></div>
              <div className="flex items-center">
                <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                <span className="ml-1.5 text-sm text-green-400">Termo</span>
              </div>
              <div className="w-5 h-px bg-green-500 mx-1.5"></div>
              <div className="flex items-center">
                <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                <span className="ml-1.5 text-sm text-green-400">Perfil</span>
              </div>
              <div className="w-5 h-px bg-cyan-500 mx-1.5"></div>
              <div className="flex items-center">
                <div className="w-7 h-7 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg shadow-cyan-500/30">4</div>
                <span className="ml-1.5 text-sm font-medium text-cyan-300">Pesquisa</span>
              </div>
            </div>

            {/* Step indicators (horizontal) */}
            <div className="flex items-center justify-center gap-2 py-4 px-6">
              {instructionSteps.map((step, i) => (
                <button key={i} onClick={() => setInstructionStep(i)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-1 min-w-0"
                  style={{
                    background: i === instructionStep ? 'rgba(6,182,212,0.2)' : i < instructionStep ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                    color: i === instructionStep ? '#67e8f9' : i < instructionStep ? '#6ee7b7' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${i === instructionStep ? 'rgba(6,182,212,0.3)' : 'transparent'}`,
                  }}>
                  <span className="flex-shrink-0">{i < instructionStep ? '✓' : step.icon}</span>
                  <span className="hidden sm:inline truncate">{step.title}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{currentInstruction.icon}</span>
                  <h2 className="text-xl font-bold text-white">{currentInstruction.title}</h2>
                </div>
                {currentInstruction.content}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => setInstructionStep(Math.max(0, instructionStep - 1))}
                  disabled={instructionStep === 0}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  ← Anterior
                </button>

                <span className="text-sm text-white/60">{instructionStep + 1} / {instructionSteps.length}</span>

                {isLastStep ? (
                  <button
                    onClick={handleStartSurvey}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      color: '#fff',
                      boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                    }}
                  >
                    Iniciar Avaliação →
                  </button>
                ) : (
                  <button
                    onClick={() => setInstructionStep(instructionStep + 1)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      color: '#fff',
                      boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                    }}
                  >
                    Próximo →
                  </button>
                )}
              </div>

              {/* Skip link */}
              {!isLastStep && (
                <div className="text-center mt-3">
                  <button onClick={handleStartSurvey}
                    className="text-sm text-white/60 hover:text-white/70 transition-colors underline">
                    Pular instruções e iniciar pesquisa
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyResponded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-lg w-full relative z-10">
          {/* Ícone de Sucesso */}
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full"></div>
            <div className="absolute inset-2 bg-emerald-500/30 rounded-full"></div>
            <div className="absolute inset-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-white mb-4 text-center">
            Avaliação já Concluída!
          </h1>

          {/* Card Principal */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-6">
            <p className="text-gray-300 text-center text-lg mb-4">
              Você já completou esta avaliação anteriormente.
            </p>
            <p className="text-white text-center">
              Sua contribuição foi <span className="text-emerald-400 font-semibold">registrada com sucesso</span>.
              Agradecemos sua participação nesta pesquisa acadêmica.
            </p>
          </div>

          {/* Card de Contato */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
            <p className="text-gray-400 text-sm text-center mb-3">
              Em caso de dúvidas, entre em contato:
            </p>
            <a
              href="mailto:pedro.palma@unesp.br"
              className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              pedro.palma@unesp.br
            </a>
          </div>

          {/* Botão Voltar */}
          <div className="text-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Voltar ao Início
            </a>
          </div>

          {/* Footer Institucional */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  UNESP — Universidade Estadual Paulista | Guaratinguetá
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Mestrado Profissional em Engenharia de Produção
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA DE AGRADECIMENTO (após finalização)
  // ============================================================

  if (authStep === 'thankyou') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
        <VideoBackground />
        <ParticlesBackground />
        <div className="max-w-lg mx-auto text-center relative z-10">
          <div className="rounded-2xl shadow-2xl overflow-hidden p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}>

            {/* Ícone */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Título */}
            <h1 className="text-2xl font-bold text-white mb-3">
              Obrigado pela sua participação!
            </h1>

            {/* Mensagem */}
            <p className="text-white/70 text-base leading-relaxed mb-6">
              Suas respostas foram registradas com sucesso e serão fundamentais para os resultados desta pesquisa acadêmica sobre investimentos em tecnologia de Indústria 4.0.
            </p>

            {/* Info box */}
            <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <p className="text-base text-cyan-200">
                Os dados coletados serão tratados com total confidencialidade e utilizados exclusivamente para fins acadêmicos, conforme o Termo de Consentimento aceito.
              </p>
            </div>

            {/* Pesquisador */}
            <div className="text-white/60 text-sm space-y-1">
              <p>Pesquisa conduzida por <strong className="text-white/60">Pedro Luis Tozoni Palma</strong></p>
              <p>Mestrado Profissional em Engenharia de Produção — UNESP Guaratinguetá</p>
              <p>Contato: <a href="mailto:pedro.palma@unesp.br" className="text-cyan-400 hover:text-cyan-300">pedro.palma@unesp.br</a></p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA PRINCIPAL DE AVALIAÇÃO (PESQUISA AHP)
  // ============================================================

  if (blocks.length === 0 || authStep !== 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Carregando comparações...</div>
      </div>
    );
  }

  // === NAVEGAÇÃO POR BLOCOS ===
  const goToBlock = (idx: number) => {
    if (idx < 0 || idx >= blocks.length) return;
    setCurrentBlockIndex(idx);
    setSubmitError(false);
    blockContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextBlock = () => {
    if (currentBlockIndex < blocks.length - 1 && blockValidation[currentBlockIndex]?.connected) {
      setCompletedGroups(prev => {
        const next = new Set(prev);
        if (blocks[currentBlockIndex]) next.add(blocks[currentBlockIndex].id);
        return next;
      });
      goToBlock(currentBlockIndex + 1);
    }
  };

  const handlePrevBlock = () => {
    if (currentBlockIndex > 0) goToBlock(currentBlockIndex - 1);
  };

  // Métricas de progresso
  const globalAnswered = judgments.filter(j => j != null).length;
  const globalTotal = comparisons.length;
  const globalProgress = globalTotal > 0 ? Math.round((globalAnswered / globalTotal) * 100) : 0;

  /** Verifica se o bloco i está desbloqueado para navegação */
  const isBlockUnlocked = (targetIndex: number): boolean => {
    // Sempre pode voltar para blocos anteriores ao atual
    if (targetIndex <= currentBlockIndex) return true;
    // Para avançar, todos os blocos de 0 até targetIndex-1 devem estar conectados
    for (let b = 0; b <= targetIndex - 1; b++) {
      if (!blockValidation[b]?.connected) return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex overflow-hidden">
      <HierarchyTreeSidebar
        currentGroupIndex={currentBlockIndex}
        totalGroups={blocks.length}
        groups={blocks.map(b => ({
          id: b.id,
          label: b.title,
          type: b.type,
          parentMerit: (b.id.includes('B') || b.title.includes('Benefícios')) ? 'B' :
            (b.id.includes('O') || b.title.includes('Oportunidades')) ? 'O' :
              (b.id.includes('C') || b.title.includes('Custos')) ? 'C' :
                (b.id.includes('R') || b.title.includes('Riscos')) ? 'R' : 'B'
        }))}
        completedGroups={completedGroups}
        onNavigate={(idx) => {
          if (isBlockUnlocked(idx)) {
            goToBlock(idx);
          }
        }}
      />

      {/* Modal de Contexto da Decisão */}
      {showContextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowContextModal(false)}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Conteúdo */}
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10"
              style={{ background: 'rgba(15, 23, 42, 0.98)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">🗺️</span>
                <h3 className="text-lg font-bold text-white">Contexto da Decisão</h3>
              </div>
              <button
                onClick={() => setShowContextModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Meta */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Meta da Pesquisa</p>
                <p className="text-white font-medium">{project?.name || 'Pesquisa AHP-BOCR'}</p>
                {project?.description && (
                  <p className="text-base text-white/60 mt-1">{project.description}</p>
                )}
              </div>

              {/* Alternativas */}
              <div>
                <p className="text-sm text-white/70 uppercase tracking-wider mb-2">Alternativas em Avaliação</p>
                <div className="space-y-2">
                  {(project?.alternatives || alternatives || []).map((alt: any, i: number) => (
                    <div key={alt.code || i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white flex-shrink-0" style={{ background: '#8b5cf6' }}>
                        {alt.code || `A${i + 1}`}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{alt.name}</p>
                        {alt.description && <p className="text-sm text-white/70 mt-0.5">{alt.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impactos Detalhados (se disponíveis) */}
              {(project?.alternatives || []).some((alt: any) => alt.impacts && Object.keys(alt.impacts).length > 0) && (
                <div>
                  <p className="text-sm text-white/70 uppercase tracking-wider mb-3">Impactos por Subcritério</p>

                  {[
                    { code: 'B', label: 'Benefícios', color: '#10b981' },
                    { code: 'O', label: 'Oportunidades', color: '#3b82f6' },
                    { code: 'C', label: 'Custos', color: '#f59e0b' },
                    { code: 'R', label: 'Riscos', color: '#ef4444' },
                  ].map(merit => {
                    const meritSubs = SUBCRITERIA.filter(s => s.group === merit.code || s.code.startsWith(merit.code));
                    const hasAnyImpact = meritSubs.some(sub =>
                      (project?.alternatives || []).some((alt: any) => getImpactText(alt.impacts?.[sub.code]))
                    );
                    if (!hasAnyImpact) return null;

                    return (
                      <div key={merit.code} className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white"
                            style={{ background: merit.color }}>{merit.code}</span>
                          <span className="text-sm font-semibold text-white">{merit.label}</span>
                        </div>

                        <div className="space-y-2">
                          {meritSubs.map(sub => {
                            const altsWithImpact = (project?.alternatives || []).filter((alt: any) => getImpactText(alt.impacts?.[sub.code]));
                            if (altsWithImpact.length === 0) return null;

                            return (
                              <div key={sub.code} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: merit.color }}>{sub.code}</span>
                                  <span className="text-sm font-medium text-white/80">{sub.name}</span>
                                </div>
                                <div className="space-y-1.5">
                                  {(project?.alternatives || []).map((alt: any) => {
                                    const impactText = getImpactText(alt.impacts?.[sub.code]);
                                    if (!impactText) return null;
                                    return (
                                      <div key={alt.code} className="flex items-start gap-2">
                                        <span className="inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                                          style={{ background: '#8b5cf6' }}>{alt.code}</span>
                                        <p className="text-base text-white/60 leading-relaxed">{impactText}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal "Rever Instruções" (reutiliza buildInstructionSteps) */}
      {showInstructionsModal && (() => {
        const steps = buildInstructionSteps();
        const current = steps[modalInstructionStep];
        const isFirst = modalInstructionStep === 0;
        const isLast = modalInstructionStep === steps.length - 1;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowInstructionsModal(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10"
                style={{ background: 'rgba(15, 23, 42, 0.98)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📖</span>
                  <h3 className="text-lg font-bold text-white">Instruções da pesquisa</h3>
                </div>
                <button
                  onClick={() => setShowInstructionsModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Fechar instruções"
                >
                  ✕
                </button>
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-2 py-4 px-4 border-b border-white/5">
                {steps.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => setModalInstructionStep(i)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-1 min-w-0"
                    style={{
                      background: i === modalInstructionStep ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                      color: i === modalInstructionStep ? '#67e8f9' : 'rgba(255,255,255,0.6)',
                      border: `1px solid ${i === modalInstructionStep ? 'rgba(6,182,212,0.3)' : 'transparent'}`,
                    }}
                  >
                    <span className="flex-shrink-0">{step.icon}</span>
                    <span className="hidden sm:inline truncate">{step.title}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="px-5 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{current.icon}</span>
                  <h2 className="text-xl font-bold text-white">{current.title}</h2>
                </div>
                {current.content}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between p-4 border-t border-white/10"
                style={{ background: 'rgba(15, 23, 42, 0.98)' }}>
                <button
                  onClick={() => setModalInstructionStep(Math.max(0, modalInstructionStep - 1))}
                  disabled={isFirst}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  ← Anterior
                </button>
                <span className="text-sm text-white/60">{modalInstructionStep + 1} / {steps.length}</span>
                <button
                  onClick={() => {
                    if (isLast) {
                      setShowInstructionsModal(false);
                    } else {
                      setModalInstructionStep(modalInstructionStep + 1);
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                  }}
                >
                  {isLast ? 'Fechar' : 'Próximo →'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TOAST DE NOTIFICAÇÃO (Fixo no canto inferior direito) */}
      <div className="flex-1 overflow-y-auto py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header com info do respondente */}
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-white/70 text-sm">
              <span className="bg-white/10 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-white/70">{respondentData?.email || 'Respondente'}</span>
              </span>
            </div>
            <div className="text-white/70 text-sm flex items-center gap-3">
              {saving && <span className="text-yellow-300">💾 Salvando...</span>}
              {lastSaved && !saving && <span className="text-green-300">✓ Salvo às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
              <button
                onClick={async () => {
                  if (judgments.some(j => j != null)) {
                    await saveProgress();
                  }
                  sessionStorage.removeItem(`validatedEmail_${projectId}`);
                  sessionStorage.removeItem(`validatedRespondentId_${projectId}`);
                  window.location.reload();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
                title="Salvar progresso e sair"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
              </button>
            </div>
          </div>

          {/* ===== HEADER FIXO COM PROGRESSO GLOBAL ===== */}
          <div className="sticky top-0 z-30 mb-4" style={{ backdropFilter: 'blur(12px)' }}>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white/80 text-sm font-medium">Avaliação AHP-BOCR</span>
                  <button
                    onClick={() => setShowContextModal(true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-white/60 hover:text-white/70 hover:bg-white/10 transition-all"
                    title="Ver contexto da decisão"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Contexto
                  </button>
                  <button
                    onClick={() => {
                      setModalInstructionStep(0);
                      setShowInstructionsModal(true);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-white/60 hover:text-white/70 hover:bg-white/10 transition-all"
                    title="Rever instruções da pesquisa"
                  >
                    <span>📖</span>
                    <span>Instruções</span>
                  </button>
                </div>
                <span className="text-white/60 text-sm">{globalAnswered}/{globalTotal} respostas</span>
              </div>

              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${globalProgress}%`, background: allBlocksValid ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'linear-gradient(90deg, #6366f1, #06b6d4)' }} />
              </div>


            </div>
          </div>

          {/* ===== BANNER DE ERRO ===== */}
          {submitError && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-300">Responda mais comparações antes de finalizar</p>
                  <p className="text-sm text-red-300/80 mt-1">
                    {blockValidation.filter(v => !v.connected).length === 1
                      ? 'Há 1 bloco com comparações em destaque ainda não respondidas.'
                      : `Há ${blockValidation.filter(v => !v.connected).length} blocos com comparações em destaque ainda não respondidas.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===== CARD DO BLOCO ATUAL ===== */}
          {blocks[currentBlockIndex] && (() => {
            const block = blocks[currentBlockIndex];
            const validation = blockValidation[currentBlockIndex];
            const requiredMap = getRequiredComparisons(block.nodes, block.comparisons, judgments, block.startIndex);

            return (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-visible">
                {/* Header do bloco */}
                <div className="p-4 sm:p-6" style={{ background: `linear-gradient(135deg, ${block.color}, ${block.color}dd)` }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{block.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold text-white">{block.title}</h2>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: validation?.isComplete ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', color: '#fff' }}>
                          {validation?.answeredTotal || 0}/{block.comparisons.length}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm mt-0.5">{block.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Corpo */}
                <div className="p-4 sm:p-6" ref={blockContentRef}>
                  {/* Pergunta orientadora */}
                  <div className="mb-4 p-4 rounded-xl text-center" style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <p className="text-sm text-gray-500 mb-1">Para cada par abaixo, responda:</p>
                    <p className="text-base font-semibold text-gray-800 leading-relaxed">
                      {block.type === 'bocr' || block.type === 'merits'
                        ? '"De modo geral, ao decidir sobre investimentos em tecnologia de Indústria 4.0, qual dos dois critérios deve ter mais peso na decisão, e com que intensidade?"'
                        : block.type === 'magnitude' || block.type === 'rescaling'
                          ? '"Pensando especificamente no problema das estufas de cura, qual dos dois critérios tem maior impacto real na escolha entre as alternativas, e com que intensidade?"'
                          : block.type === 'subcriteria'
                            ? `"Dentro de ${block.title?.replace('Subcritérios de ', '') || 'este mérito'}, qual subcritério é mais importante para a decisão e com que intensidade?"`
                            : (() => {
                                const m = block.comparisons?.[0]?.group?.charAt(0) || '';
                                const qMap: Record<string, string> = {
                                  'B': '"Para cada subcritério de Benefícios abaixo, qual alternativa entrega mais valor e com que intensidade?"',
                                  'O': '"Para cada subcritério de Oportunidades abaixo, qual alternativa oferece maior potencial e com que intensidade?"',
                                  'C': '"Para cada subcritério de Custos abaixo, qual alternativa apresenta maior impacto financeiro e com que intensidade?"',
                                  'R': '"Para cada subcritério de Riscos abaixo, qual alternativa apresenta maior exposição ao risco e com que intensidade?"',
                                };
                                return qMap[m] || '"Para cada subcritério abaixo, compare as alternativas com base na sua experiência."';
                              })()
                      }
                    </p>
                  </div>
                  <BlockLegend block={block} />
                  <BlockContextCard
                    block={block}
                    alternatives={alternatives}
                    projectName={project?.name || 'Pesquisa AHP-BOCR'}
                    project={project}
                  />

                  {/* Indicador de progresso do bloco */}
                  {block.nodes.length >= 3 && (
                    <div className="mb-4 p-3 rounded-xl border" style={{
                      background: validation?.isComplete ? '#f0fdf4' : validation?.connected ? '#eff6ff' : '#fef2f2',
                      borderColor: validation?.isComplete ? '#bbf7d0' : validation?.connected ? '#bfdbfe' : '#fecaca',
                    }}>
                      <div className="flex items-center gap-2">
                        <span>{validation?.isComplete ? '✅' : validation?.connected ? '👍' : '📋'}</span>
                        <span className="text-sm font-medium" style={{ color: validation?.isComplete ? '#166534' : validation?.connected ? '#1e40af' : '#dc2626' }}>
                          {validation?.isComplete
                            ? 'Todas as comparações respondidas!'
                            : validation?.connected
                              ? `Pode avançar — responder as ${block.comparisons.length - (validation?.answeredTotal || 0)} restantes melhora a precisão`
                              : `Responda todas as comparações para maior precisão dos resultados. Para prosseguir, é necessário responder ao menos as sinalizadas em destaque (faltam ${Math.max(1, (validation?.minRequired || 0) - (validation?.answeredCount || 0))}).`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-400 mt-1">
                        <span>{validation?.answeredTotal || 0} de {block.comparisons.length} respondidas</span>
                        {validation?.connected && !validation?.isComplete && (
                          <span className="text-blue-500 font-medium">✓ Próximo bloco desbloqueado</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Legenda da escala */}
                  <div className="flex items-center justify-center mb-3 px-2 text-sm text-gray-400">
                    <span className="hidden sm:block flex-1 text-right pr-2">← {block.type === 'alternatives' ? (['C','R'].includes(block.comparisons?.[0]?.group?.charAt(0) || '') ? 'maior impacto' : 'mais favorável') : 'mais importante'}</span>
                    <div className="flex items-center gap-0.5">
                      {[9, 7, 5, 3, 1, 3, 5, 7, 9].map((v, i) => (
                        <span key={i} className="font-mono font-bold text-gray-300 text-center"
                          style={{ width: i === 4 ? '28px' : `${20 + v * 0.7}px`, display: 'inline-block' }}>{v}</span>
                      ))}
                    </div>
                    <span className="hidden sm:block flex-1 text-left pl-2">{block.type === 'alternatives' ? (['C','R'].includes(block.comparisons?.[0]?.group?.charAt(0) || '') ? 'maior impacto' : 'mais favorável') : 'mais importante'} →</span>
                  </div>

                  {/* === COMPARAÇÕES EMPILHADAS === */}
                  <div className="space-y-1">
                    {block.comparisons.map((comp, i) => {
                      const globalIndex = block.startIndex + i;
                      const judgment = judgments[globalIndex];
                      const currentValue = judgment && !judgment.skipped ? judgment.rawSlider : null;
                      const isSkipped = judgment?.skipped === true;
                      const isRequired = requiredMap[i];

                      return (
                        <div key={`${block.id}-${i}`}>
                          {/* Label de subcritério para blocos de alternativas */}
                          {comp.type === 'alternatives' && (() => {
                            const prevComp = i > 0 ? block.comparisons[i - 1] : null;
                            if (prevComp && prevComp.group === comp.group) return null;
                            const sub = SUBCRITERIA.find(s => s.code === comp.group);
                            return sub ? (
                              <div className="mb-2 mt-5 first:mt-0 mx-3 sm:mx-4 border-l-4 pl-3 py-1"
                                style={{ borderColor: block.color }}>
                                <span className="text-base font-bold text-gray-800">
                                  {sub.name}
                                </span>
                                <span className="ml-2 text-sm font-medium text-gray-400">
                                  ({sub.code})
                                </span>
                              </div>
                            ) : null;
                          })()}

                          <div className="flex items-center gap-2 sm:gap-3 py-2.5 px-3 sm:px-4 rounded-xl transition-all"
                            style={{
                              background: currentValue !== null ? `${block.color}08` : 'transparent',
                              border: `1px solid ${currentValue !== null ? `${block.color}20` : isRequired ? '#fecaca' : 'transparent'}`,
                            }}>

                            {/* Indicador lateral required/optional */}
                            <div className="w-1.5 flex-shrink-0 self-stretch rounded-full"
                              style={{
                                background: currentValue !== null ? `${block.color}50` : isRequired ? '#fca5a5' : '#e2e8f0',
                                opacity: currentValue !== null ? 1 : 0.6,
                              }} />

                            {/* Lado esquerdo */}
                            <div className="flex-1 text-right min-w-0 flex items-center justify-end gap-1.5">
                              <span className="text-sm font-medium text-gray-700 hidden sm:inline whitespace-normal text-left">
                                {getItemName(comp.itemA)}
                              </span>
                              <CriterionBadge code={comp.itemA} side="left" color={block.color} subcode={comp.group} />
                            </div>

                            {/* Botões da escala Saaty */}
                            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                              {[9, 7, 5, 3, 1, 3, 5, 7, 9].map((saatyDisplay, si) => {
                                const isCenter = si === 4;
                                const isLeft = si < 4;
                                // Mapeamento: si=0→-8, 1→-6, 2→-4, 3→-2, 4→0, 5→2, 6→4, 7→6, 8→8
                                const sliderVal = isCenter ? 0 : isLeft ? -((4 - si) * 2) : ((si - 4) * 2);
                                const isSelected = currentValue === sliderVal;
                                const sz = isCenter ? 28 : 20 + saatyDisplay * 0.7;

                                return (
                                  <button key={si}
                                    onClick={() => handleBlockAnswer(globalIndex, sliderVal)}
                                    className="flex items-center justify-center rounded-full transition-all focus:outline-none"
                                    style={{
                                      width: `${sz}px`, height: `${sz}px`,
                                      background: isSelected
                                        ? isCenter ? '#64748b' : isLeft ? block.color : '#a855f7'
                                        : '#f1f5f9',
                                      border: `2px solid ${isSelected ? 'transparent' : '#e2e8f0'}`,
                                      color: isSelected ? '#fff' : '#94a3b8',
                                      fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                      boxShadow: isSelected ? `0 2px 8px ${isLeft ? block.color : '#a855f7'}40` : 'none',
                                    }}
                                    title={`Saaty ${saatyDisplay} — ${isCenter ? 'Igual' : isLeft ? `← ${getItemName(comp.itemA)}` : `→ ${getItemName(comp.itemB)}`}`}
                                  >
                                    {isCenter ? '=' : saatyDisplay}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Lado direito */}
                            <div className="flex-1 text-left min-w-0 flex items-center gap-1.5">
                              <CriterionBadge code={comp.itemB} side="right" color={block.color} subcode={comp.group} />
                              <span className="text-sm font-medium text-gray-700 hidden sm:inline whitespace-normal">
                                {getItemName(comp.itemB)}
                              </span>
                            </div>
                          </div>

                          {/* Feedback textual — terminologia verbal de Saaty (1977) */}
                          {currentValue !== null && !isSkipped && (
                            <div className="text-center mt-0.5 mb-1">
                              <span className="text-sm text-gray-400">
                                {(() => {
                                  const isAlt = block.type === 'alternatives';
                                  const m = block.comparisons?.[0]?.group?.charAt(0) || '';
                                  const isCR = isAlt && ['C','R'].includes(m);
                                  const isBO = isAlt && ['B','O'].includes(m);

                                  if (currentValue === 0) {
                                    if (isCR) return 'Ambas têm o mesmo nível de impacto';
                                    if (isBO) return 'Ambas são igualmente favoráveis';
                                    return 'Ambos são igualmente importantes';
                                  }

                                  const winner = currentValue < 0 ? getItemName(comp.itemA) : getItemName(comp.itemB);
                                  const loser = currentValue < 0 ? getItemName(comp.itemB) : getItemName(comp.itemA);
                                  const raw = getSaatyVerbalLabel(Math.abs(sliderToSaaty(currentValue).saatyValue));

                                  if (isCR) {
                                    const adj = raw.replace('mais importante', 'maior').replace('igualmente importantes', 'igual');
                                    return `${winner} tem nível ${adj} que ${loser}`;
                                  }
                                  if (isBO) {
                                    const adj = raw.replace('importantes', 'favoráveis').replace('importante', 'favorável');
                                    return `${winner} é ${adj} que ${loser}`;
                                  }
                                  return `${winner} é ${raw} que ${loser}`;
                                })()}
                              </span>
                            </div>
                          )}
                          {isSkipped && (
                            <div className="text-center mt-0.5 mb-1">
                              <span className="text-sm text-gray-400 italic">⏭️ Pulada</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {validation?.connected && !validation?.isComplete && (
                    <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">
                        💡 <strong>Próximo bloco desbloqueado!</strong> Responder as comparações restantes melhora a precisão dos resultados da pesquisa.
                      </p>
                    </div>
                  )}

                  {validation?.isComplete && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                      <span className="text-emerald-500">✅</span>
                      <p className="text-sm text-emerald-700 font-medium">Bloco completo — todas as comparações respondidas.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ===== NAVEGAÇÃO ENTRE BLOCOS ===== */}
          <div className="flex items-center justify-between mt-6">
            <button onClick={handlePrevBlock} disabled={currentBlockIndex === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
              ← Anterior
            </button>

            {/* Pills removed - Navigation via Sidebar */}


            {currentBlockIndex < blocks.length - 1 ? (
              <button onClick={handleNextBlock}
                disabled={!blockValidation[currentBlockIndex]?.connected}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{
                  background: blockValidation[currentBlockIndex]?.connected
                    ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
                    : 'rgba(255,255,255,0.1)',
                  boxShadow: blockValidation[currentBlockIndex]?.connected
                    ? '0 4px 12px rgba(99,102,241,0.3)'
                    : 'none',
                }}>
                Próximo →
              </button>
            ) : (
              <button onClick={handleFinalizeSurvey} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{
                  background: allBlocksValid ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.1)',
                  boxShadow: allBlocksValid ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
                }}>
                {saving ? 'Finalizando...' : '✓ Finalizar'}
              </button>
            )}
          </div>

          {/* Salvar progresso */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <button onClick={saveProgress} disabled={saving || globalAnswered === 0}
              className="text-white/60 hover:text-white/70 text-xs transition-colors disabled:opacity-30 flex items-center gap-1">
              💾 Salvar progresso
            </button>
            {lastSaved && (
              <span className="text-white/60 text-xs">
                Salvo às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>




        </div>

        <style jsx>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-tooltip-in {
          animation: tooltipFadeIn 0.15s ease-out;
        }
      `}</style>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium transition-all transform translate-y-0 z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}>
          {toast.message}
        </div>
      )}
    </div >
  );
}

// ============================================================
// EXPORT COM ERROR BOUNDARY
// ============================================================

export default function AvaliacaoProjectPage() {
  return (
    <SurveyErrorBoundary>
      <AvaliacaoProjectPageInner />
    </SurveyErrorBoundary>
  );
}
