// components/charts/BOCRRadarChart.tsx
// Comparação visual do perfil BOCR entre alternativas
// Features: Múltiplas alternativas, tooltip rico, animação
// CORRIGIDO: Usar scoreAdditive em vez de score

'use client';

import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface AlternativeScore {
  code: string;
  name: string;
  score?: number;
  scoreAdditive?: number;
  B?: number;
  O?: number;
  C?: number;
  R?: number;
}

interface BOCRRadarChartProps {
  alternatives: AlternativeScore[];
  height?: number;
  maxAlternatives?: number;
}

// Helper para obter score válido
const getScore = (alt: AlternativeScore): number => {
  const score = alt.score ?? alt.scoreAdditive ?? 0;
  return (typeof score === 'number' && !isNaN(score) && isFinite(score)) ? score : 0;
};

// Cores para diferentes alternativas
const ALTERNATIVE_COLORS = [
  { main: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },   // Blue
  { main: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },   // Purple
  { main: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' },   // Pink
  { main: '#14B8A6', bg: 'rgba(20, 184, 166, 0.15)' },   // Teal
  { main: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },   // Orange
];

export default function BOCRRadarChart({
  alternatives,
  height = 450,
  maxAlternatives = 5,
}: BOCRRadarChartProps) {
  const [selectedAlternatives, setSelectedAlternatives] = useState<string[]>(
    alternatives.slice(0, Math.min(3, maxAlternatives)).map(a => a.code)
  );

  // Filtrar alternativas selecionadas
  const displayAlternatives = alternatives.filter(a => 
    selectedAlternatives.includes(a.code)
  );

  // Calcular valores máximos para normalização
  const maxValues = {
    B: Math.max(...alternatives.map(a => a.B || 0)),
    O: Math.max(...alternatives.map(a => a.O || 0)),
    C: Math.max(...alternatives.map(a => a.C || 0)),
    R: Math.max(...alternatives.map(a => a.R || 0)),
  };

  // Indicadores do radar
  const indicators = [
    { name: 'Benefícios', max: Math.max(maxValues.B * 100 * 1.2, 50), color: '#10B981' },
    { name: 'Oportunidades', max: Math.max(maxValues.O * 100 * 1.2, 50), color: '#F59E0B' },
    { name: 'Custos\n(invertido)', max: Math.max(maxValues.C * 100 * 1.2, 50), color: '#EF4444' },
    { name: 'Riscos\n(invertido)', max: Math.max(maxValues.R * 100 * 1.2, 50), color: '#F97316' },
  ];

  // Dados das séries
  const seriesData = displayAlternatives.map((alt, idx) => {
    const color = ALTERNATIVE_COLORS[idx % ALTERNATIVE_COLORS.length];
    
    // Para custos e riscos, invertemos a escala (menor é melhor)
    const B = (alt.B || 0) * 100;
    const O = (alt.O || 0) * 100;
    const C = indicators[2].max - (alt.C || 0) * 100; // Invertido
    const R = indicators[3].max - (alt.R || 0) * 100; // Invertido
    
    return {
      value: [B, O, C, R],
      name: alt.name,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 2,
        color: color.main,
      },
      areaStyle: {
        color: color.bg,
      },
      itemStyle: {
        color: color.main,
      },
      emphasis: {
        lineStyle: {
          width: 3,
        },
        areaStyle: {
          color: color.bg.replace('0.15', '0.25'),
        },
      },
    };
  });

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: {
        color: '#1e293b',
      },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;',
      formatter: (params: any) => {
        const alt = displayAlternatives[params.seriesIndex];
        if (!alt) return '';
        
        const score = getScore(alt);
        
        return `
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${alt.name}</strong>
            <div style="margin-top: 8px; font-size: 12px;">
              <div style="color: #10B981;">● Benefícios: ${((alt.B || 0) * 100).toFixed(2)}</div>
              <div style="color: #F59E0B;">● Oportunidades: ${((alt.O || 0) * 100).toFixed(2)}</div>
              <div style="color: #EF4444;">● Custos: ${((alt.C || 0) * 100).toFixed(2)}</div>
              <div style="color: #F97316;">● Riscos: ${((alt.R || 0) * 100).toFixed(2)}</div>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <strong>Score Final: ${(score * 100).toFixed(2)}</strong>
            </div>
          </div>
        `;
      },
    },
    legend: {
      show: false, // Usamos legenda customizada
    },
    radar: {
      center: ['50%', '55%'],
      radius: '65%',
      startAngle: 90,
      splitNumber: 5,
      shape: 'polygon',
      axisName: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: 500,
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(241, 245, 249, 0.8)', 'rgba(255, 255, 255, 0.8)'],
        },
      },
      axisLine: {
        lineStyle: {
          color: '#e2e8f0',
        },
      },
      splitLine: {
        lineStyle: {
          color: '#e2e8f0',
        },
      },
      indicator: indicators.map(ind => ({
        name: ind.name,
        max: ind.max,
        color: ind.color,
      })),
    },
    series: [
      {
        type: 'radar',
        data: seriesData,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
      },
    ],
  };

  const toggleAlternative = (code: string) => {
    setSelectedAlternatives(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      }
      if (prev.length < maxAlternatives) {
        return [...prev, code];
      }
      return prev;
    });
  };

  return (
    <div className="w-full">
      {/* Seletor de alternativas */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        {alternatives.map((alt, idx) => {
          const isSelected = selectedAlternatives.includes(alt.code);
          const colorIdx = selectedAlternatives.indexOf(alt.code);
          const color = colorIdx >= 0 
            ? ALTERNATIVE_COLORS[colorIdx % ALTERNATIVE_COLORS.length]
            : { main: '#94a3b8', bg: 'transparent' };
          
          return (
            <button
              key={alt.code}
              onClick={() => toggleAlternative(alt.code)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                ${isSelected 
                  ? 'text-white shadow-md' 
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }
              `}
              style={{
                backgroundColor: isSelected ? color.main : undefined,
              }}
            >
              {alt.name}
            </button>
          );
        })}
      </div>
      
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
      />
      
      {/* Legenda customizada */}
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        {displayAlternatives.map((alt, idx) => {
          const color = ALTERNATIVE_COLORS[idx % ALTERNATIVE_COLORS.length];
          const score = getScore(alt);
          return (
            <div key={alt.code} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color.main }}
              />
              <span className="text-sm text-slate-600">{alt.name}</span>
              <span 
                className="text-sm font-mono font-semibold"
                style={{ color: color.main }}
              >
                {(score * 100).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Nota sobre inversão */}
      <p className="text-xs text-slate-400 text-center mt-4">
        * Custos e Riscos são invertidos: área maior = melhor (menores custos/riscos)
      </p>
    </div>
  );
}
