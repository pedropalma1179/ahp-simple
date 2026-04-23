// components/SensitivityAnalysisPanel.tsx
// ============================================================================
// Painel de Análise de Sensibilidade - Q1/A1 Compliant
// Versão 2.0: Gráficos de Linha (Trajectories) conforme Alizadeh et al. (2020)
// ============================================================================

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot
} from 'recharts';

export interface SensitivityItem {
  merit: string;
  meritName: string;
  currentWeight?: number;
  inflectionPoint: number | null;
  classification: 'robust' | 'moderate' | 'sensitive' | 'critical' | 'stable';
  description?: string;
  changeDescription?: string;
}

interface SensitivityAnalysisPanelProps {
  sensitivityAnalysis: SensitivityItem[];
  sensitivityTrajectories?: Record<string, Array<{
    weight: number;
    scores: Record<string, number>;
    winner: string;
    inflection: boolean;
  }>>;
  currentWinner: string;
}

// Paleta de cores para alternativas (até 10)
const COLORS = [
  '#10b981', // Emerald 500
  '#3b82f6', // Blue 500
  '#f59e0b', // Amber 500
  '#ef4444', // Red 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#06b6d4', // Cyan 500
  '#84cc16', // Lime 500
  '#d946ef', // Fuchsia 500
  '#6366f1'  // Indigo 500
];

// Helper para cores de mérito
const getMeritColor = (merit: string) => {
  switch (merit) {
    case 'B': return '#10b981'; // Green
    case 'O': return '#3b82f6'; // Blue
    case 'C': return '#f59e0b'; // Amber
    case 'R': return '#ef4444'; // Red
    default: return '#6b7280';
  }
};

const safeToFixed = (value: number | undefined | null, decimals: number = 0): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return value.toFixed(decimals);
};

export default function SensitivityAnalysisPanel({
  sensitivityAnalysis,
  sensitivityTrajectories,
  currentWinner,
}: SensitivityAnalysisPanelProps) {
  if (!sensitivityAnalysis || sensitivityAnalysis.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700">Dados de análise de sensibilidade não disponíveis.</p>
      </div>
    );
  }

  // Extrair nomes das alternativas do primeiro ponto de dados disponível
  // Extrair nomes das alternativas do primeiro ponto de dados disponível
  const getAlternativeNames = (): string[] => {
    if (!sensitivityTrajectories) return [];
    for (const merit of ['B', 'O', 'C', 'R']) {
      const traj = sensitivityTrajectories[merit];
      if (traj && traj.length > 0 && traj[0]?.scores) {
        return Object.keys(traj[0].scores);
      }
    }
    return [];
  };

  const alternatives = getAlternativeNames();
  const hasTrajectoryData = !!sensitivityTrajectories;

  const getMeritLabel = (merit: string) => {
    switch (merit) {
      case 'B': return 'Benefícios';
      case 'O': return 'Oportunidades';
      case 'C': return 'Custos';
      case 'R': return 'Riscos';
      default: return merit;
    }
  };

  const getClassificationStyle = (classification: string) => {
    switch (classification) {
      case 'robust':
        return { color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-300', icon: '🟢' };
      case 'moderate':
        return { color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-300', icon: '🟡' };
      case 'sensitive':
        return { color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-300', icon: '🟠' };
      case 'critical':
        return { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300', icon: '🔴' };
      default:
        return { color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300', icon: '⚪' };
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          🔬 Análise de Sensibilidade
        </h3>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
            Q1/A1
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Análise de sensibilidade por variação de pesos (0% a 100%) para cada mérito BOCR. Técnica estabelecida em AHP por <strong>Triantaphyllou & Sánchez (1997)</strong> e aplicada a BOCR por <strong>Alizadeh et al. (2020, Section 5.7)</strong>.
      </p>

      {hasTrajectoryData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {sensitivityAnalysis.map((item) => {
            const trajectory = sensitivityTrajectories?.[item.merit] || [];
            const meritColor = getMeritColor(item.merit);

            // Transformar dados para formato Recharts (flat object)
            // { weight: 0, "Alt1": 0.5, "Alt2": 0.4 }
            const chartData = trajectory.map(point => ({
              weight: point.weight,
              ...point.scores,
              winner: point.winner
            }));

            // Encontrar ponto onde cruza (inflexão) para desenhar bolinha
            const inflectionPoints = trajectory
              .filter(p => p.inflection)
              .map(p => ({ x: p.weight, y: p.scores[p.winner] })); // Y aproximado

            return (
              <div key={item.merit} className="border rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: meritColor }}
                    />
                    {getMeritLabel(item.merit)} ({item.merit})
                  </h4>
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded border">
                    Atual: {safeToFixed(item.currentWeight, 1)}%
                  </span>
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="weight"
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `${v}%`}
                        label={{ value: 'Peso (%)', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        domain={['auto', 'auto']}
                        width={50}
                        tickFormatter={(v: number) => typeof v === 'number' ? v.toFixed(2) : String(v)}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: '12px', borderRadius: '4px' }}
                        formatter={(value: number) => {
                          if (value === null || value === undefined || isNaN(value)) return 'N/A';
                          return value.toFixed(4);
                        }}
                        labelFormatter={(v) => `Peso: ${v}%`}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '10px' }}
                        iconType="circle"
                      />

                      {/* Linha vertical do peso atual */}
                      {item.currentWeight !== undefined && (
                        <ReferenceLine
                          x={item.currentWeight}
                          stroke={meritColor}
                          strokeDasharray="4 4"
                          label={{
                            value: 'Atual',
                            position: 'insideTopLeft',
                            fontSize: 10,
                            fill: meritColor
                          }}
                        />
                      )}

                      {/* Linhas das alternativas */}
                      {alternatives.map((alt, idx) => (
                        <Line
                          key={alt}
                          type="monotone"
                          dataKey={alt}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}

                      {/* Marcador de Inflexão (se houver) */}
                      {item.inflectionPoint !== null && (
                        <ReferenceLine
                          x={item.inflectionPoint}
                          stroke="#ef4444"
                          strokeDasharray="2 2"
                          label={{
                            value: 'Inflexão',
                            position: 'insideBottomLeft',
                            fill: '#ef4444',
                            fontSize: 10
                          }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center bg-gray-50 rounded-lg mb-6">
          <p className="text-gray-500">Gráficos de trajetória indisponíveis para estes dados.</p>
        </div>
      )}

      {/* Classificações de Robustez (Cards existentes) */}
      <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
        Classificação de Robustez
      </h4>
      <div className="grid md:grid-cols-2 gap-4">
        {sensitivityAnalysis.map((item, idx) => {
          const style = getClassificationStyle(item.classification);
          const hasWeight = item.currentWeight !== undefined && item.currentWeight !== null;

          return (
            <div
              key={idx}
              className={`p-4 rounded-lg border-2 ${style.bg} ${style.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${style.color}`}>
                  {style.icon} {getMeritLabel(item.merit)} ({item.merit})
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.color}`}>
                  {item.classification === 'robust' ? 'Robusto' :
                    item.classification === 'moderate' ? 'Moderado' :
                      item.classification === 'sensitive' ? 'Sensível' : 'Crítico'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Peso Atual:</span>
                  <span className={`ml-1 font-mono ${hasWeight ? '' : 'text-gray-400 italic'}`}>
                    {hasWeight ? `${safeToFixed(item.currentWeight, 1)}%` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Ponto de Inflexão:</span>
                  <span className="ml-1 font-mono">
                    {item.inflectionPoint !== null ? `${safeToFixed(item.inflectionPoint, 1)}%` : 'Estável'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {item.changeDescription || item.description || `Ranking estável para qualquer variação em ${getMeritLabel(item.merit)}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
