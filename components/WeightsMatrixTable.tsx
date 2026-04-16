// components/WeightsMatrixTable.tsx
// Tabela de Pesos por Grupo de Respondentes - Estilo Doutorado
// Formato: Critérios em linhas × Grupos em colunas
// Inspirado em: Tese Doutorado - Matriz de Prioridades

'use client';

import React, { useMemo } from 'react';

// ============================================================
// TIPOS
// ============================================================

interface SubcriterionWeight {
  code: string;
  name: string;
  localWeight: number;
  globalWeight: number;
}

interface ResponseData {
  id: string;
  demographic?: {
    cargo?: string;
    departamento?: string;
    experiencia?: string;
  };
  // Pesos calculados
  bocrWeights?: number[]; // [B, O, C, R]
  subWeights?: Record<string, number[]>; // { B: [...], O: [...], C: [...], R: [...] }
}

interface WeightsMatrixTableProps {
  responses: ResponseData[];
  aggregatedWeights: {
    bocrWeights: number[];
    subWeights: Record<string, number[]>;
  };
  groupBy?: 'cargo' | 'departamento' | 'experiencia';
  subcriteria?: {
    B: string[];
    O: string[];
    C: string[];
    R: string[];
  };
}

// Subcritérios padrão BOCR
const DEFAULT_SUBCRITERIA = {
  B: ['Produtividade', 'Qualidade', 'Flexibilidade', 'Ergonomia', 'Sustentabilidade'],
  O: ['Transformação Digital', 'Reputação', 'Novos Mercados', 'Parcerias', 'Inovação'],
  C: ['CAPEX', 'OPEX', 'Treinamento', 'Manutenção', 'Infraestrutura'],
  R: ['Técnico', 'Mercado', 'Regulatório', 'Cibersegurança', 'Implementação'],
};

const MERIT_NAMES: Record<string, string> = {
  B: 'Benefícios',
  O: 'Oportunidades',
  C: 'Custos',
  R: 'Riscos',
};

const MERIT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  B: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  O: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  C: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  R: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
};

// ============================================================
// COMPONENTE
// ============================================================

export default function WeightsMatrixTable({
  responses,
  aggregatedWeights,
  groupBy = 'cargo',
  subcriteria = DEFAULT_SUBCRITERIA,
}: WeightsMatrixTableProps) {

  // Agrupar respondentes
  const groups = useMemo(() => {
    const groupMap = new Map<string, ResponseData[]>();
    
    responses.forEach(resp => {
      const groupValue = resp.demographic?.[groupBy] || 'Não informado';
      if (!groupMap.has(groupValue)) groupMap.set(groupValue, []);
      groupMap.get(groupValue)!.push(resp);
    });

    // Ordenar grupos
    return Array.from(groupMap.entries())
      .sort(([a], [b]) => {
        if (a === 'Não informado') return 1;
        if (b === 'Não informado') return -1;
        return a.localeCompare(b);
      });
  }, [responses, groupBy]);

  // Calcular média de pesos por grupo
  const groupWeights = useMemo(() => {
    const result: Record<string, { 
      n: number; 
      bocr: number[]; 
      sub: Record<string, number[]> 
    }> = {};

    groups.forEach(([groupName, groupResponses]) => {
      const n = groupResponses.length;
      
      // Média BOCR
      const bocrSum = [0, 0, 0, 0];
      let bocrCount = 0;
      
      groupResponses.forEach(resp => {
        if (resp.bocrWeights) {
          resp.bocrWeights.forEach((w, i) => bocrSum[i] += w);
          bocrCount++;
        }
      });

      const bocrAvg = bocrCount > 0 
        ? bocrSum.map(s => s / bocrCount) 
        : aggregatedWeights.bocrWeights;

      // Média subcritérios
      const subAvg: Record<string, number[]> = {};
      ['B', 'O', 'C', 'R'].forEach(merit => {
        const subSum = new Array(5).fill(0);
        let subCount = 0;
        
        groupResponses.forEach(resp => {
          if (resp.subWeights?.[merit]) {
            resp.subWeights[merit].forEach((w, i) => subSum[i] += w);
            subCount++;
          }
        });

        subAvg[merit] = subCount > 0 
          ? subSum.map(s => s / subCount)
          : aggregatedWeights.subWeights[merit] || new Array(5).fill(0.2);
      });

      result[groupName] = { n, bocr: bocrAvg, sub: subAvg };
    });

    return result;
  }, [groups, aggregatedWeights]);

  // Formatar porcentagem
  const formatPct = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Tabela de Prioridades por Grupo
          </h3>
          <p className="text-sm text-slate-500">
            Pesos médios dos critérios BOCR agrupados por {groupBy}
          </p>
        </div>
        <div className="text-xs text-slate-400">
          n = {responses.length} respondentes | {groups.length} grupos
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700 min-w-[200px]">
                  Critérios e Subcritérios
                </th>
                {groups.map(([groupName, items]) => (
                  <th key={groupName} className="px-4 py-3 text-center font-semibold text-slate-700 min-w-[100px]">
                    <div>{groupName}</div>
                    <div className="text-xs font-normal text-slate-500">(n={items.length})</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-bold text-slate-900 min-w-[100px] bg-slate-200">
                  <div>Geral</div>
                  <div className="text-xs font-normal text-slate-600">(n={responses.length})</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Para cada mérito BOCR */}
              {(['B', 'O', 'C', 'R'] as const).map((merit, meritIdx) => {
                const colors = MERIT_COLORS[merit];
                const meritName = MERIT_NAMES[merit];
                const subs = subcriteria[merit];

                return (
                  <React.Fragment key={merit}>
                    {/* Linha do Mérito (B, O, C, R) */}
                    <tr className={`${colors.bg} border-t-2 ${colors.border}`}>
                      <td className={`px-4 py-3 font-bold ${colors.text}`}>
                        {meritName} ({merit})
                      </td>
                      {groups.map(([groupName]) => {
                        const weight = groupWeights[groupName]?.bocr[meritIdx] || 0;
                        return (
                          <td key={groupName} className={`px-4 py-3 text-center font-mono font-semibold ${colors.text}`}>
                            {formatPct(weight)}
                          </td>
                        );
                      })}
                      <td className={`px-4 py-3 text-center font-mono font-bold ${colors.text} bg-slate-200`}>
                        {formatPct(aggregatedWeights.bocrWeights[meritIdx])}
                      </td>
                    </tr>

                    {/* Linhas dos Subcritérios */}
                    {subs.map((subName, subIdx) => (
                      <tr key={`${merit}-${subIdx}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 pl-8 text-slate-600">
                          <span className="text-slate-400 mr-2">├─</span>
                          {subName}
                        </td>
                        {groups.map(([groupName]) => {
                          const weight = groupWeights[groupName]?.sub[merit]?.[subIdx] || 0;
                          const globalWeight = weight * (groupWeights[groupName]?.bocr[meritIdx] || 0);
                          return (
                            <td key={groupName} className="px-4 py-2 text-center">
                              <span className="font-mono text-slate-600">{formatPct(weight)}</span>
                              <span className="text-xs text-slate-400 block">
                                ({formatPct(globalWeight)})
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-4 py-2 text-center bg-slate-50">
                          <span className="font-mono text-slate-700 font-medium">
                            {formatPct(aggregatedWeights.subWeights[merit]?.[subIdx] || 0)}
                          </span>
                          <span className="text-xs text-slate-500 block">
                            ({formatPct((aggregatedWeights.subWeights[merit]?.[subIdx] || 0) * aggregatedWeights.bocrWeights[meritIdx])})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Linha Total */}
              <tr className="bg-slate-800 text-white">
                <td className="px-4 py-3 font-bold">TOTAL</td>
                {groups.map(([groupName]) => (
                  <td key={groupName} className="px-4 py-3 text-center font-mono font-bold">
                    100%
                  </td>
                ))}
                <td className="px-4 py-3 text-center font-mono font-bold bg-slate-700">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notas */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-xs text-slate-600">
          <strong>Notas:</strong><br />
          • Valores superiores = peso local do subcritério dentro do mérito<br />
          • Valores inferiores (entre parênteses) = peso global (local × peso do mérito)<br />
          • Agregação realizada por média geométrica (Saaty, 1980; Forman & Peniwati, 1998)
        </p>
      </div>
    </div>
  );
}
