// components/charts/BOCRWaterfallChart.tsx
// Visualização da síntese BOCR (B + O - C - R)
// Mostra como cada mérito contribui para o score final
// v4.2 - CORRIGIDO: Rich text para cores por mérito + Fórmula consistente

'use client';

import React, { useMemo } from 'react';
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

interface BOCRWaterfallChartProps {
  alternative: AlternativeScore;
  height?: number;
  showValues?: boolean;
}

const BOCR_CONFIG = {
  B: { label: 'Benefícios', color: '#10B981', operator: '+' },
  O: { label: 'Oportunidades', color: '#F59E0B', operator: '+' },
  C: { label: 'Custos', color: '#EF4444', operator: '−' },
  R: { label: 'Riscos', color: '#F97316', operator: '−' },
};

export default function BOCRWaterfallChart({
  alternative,
  height = 400,
  showValues = true,
}: BOCRWaterfallChartProps) {
  
  const { chartData, categories, values } = useMemo(() => {
    const B = (alternative.B || 0) * 100;
    const O = (alternative.O || 0) * 100;
    const C = (alternative.C || 0) * 100;
    const R = (alternative.R || 0) * 100;
    
    // Cálculo do waterfall
    // Início → +B → +O → -C → -R → Total
    const accumulated = [
      0,           // Início
      B,           // Após B
      B + O,       // Após O
      B + O - C,   // Após C (subtrai)
      B + O - C - R, // Após R (subtrai) = Total
    ];
    
    const categories = ['Início', 'Benefícios', 'Oportunidades', 'Custos', 'Riscos', 'Score Final'];
    
    // Dados para o gráfico de barras empilhadas (simula waterfall)
    const placeholder: (number | string)[] = []; // Barras transparentes
    const positive: (number | string)[] = [];    // Barras positivas (B, O)
    const negative: (number | string)[] = [];    // Barras negativas (C, R)
    const total: (number | string)[] = [];       // Barra final
    
    // Início (zero)
    placeholder.push(0);
    positive.push('-');
    negative.push('-');
    total.push('-');
    
    // Benefícios (+)
    placeholder.push(0);
    positive.push(B);
    negative.push('-');
    total.push('-');
    
    // Oportunidades (+)
    placeholder.push(B);
    positive.push(O);
    negative.push('-');
    total.push('-');
    
    // Custos (-)
    placeholder.push(B + O - C);
    positive.push('-');
    negative.push(C);
    total.push('-');
    
    // Riscos (-)
    placeholder.push(B + O - C - R);
    positive.push('-');
    negative.push(R);
    total.push('-');
    
    // Score Final
    const finalScore = B + O - C - R;
    placeholder.push(0);
    positive.push('-');
    negative.push('-');
    total.push(finalScore);
    
    return {
      chartData: { placeholder, positive, negative, total, accumulated },
      categories,
      values: { B, O, C, R, final: finalScore },
    };
  }, [alternative]);

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: {
        color: '#1e293b',
      },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;',
      formatter: (params: any) => {
        const idx = params[0].dataIndex;
        
        if (idx === 0) return `<strong>Início</strong><br/>Valor: 0`;
        if (idx === 5) {
          const final = chartData.total[5] as number;
          return `
            <strong>Score Final</strong><br/>
            <span style="font-size: 18px; font-weight: bold; color: ${final >= 0 ? '#10B981' : '#EF4444'}">
              ${final.toFixed(2)} pts
            </span>
          `;
        }
        
        const meritKey = ['', 'B', 'O', 'C', 'R'][idx] as keyof typeof BOCR_CONFIG;
        const config = BOCR_CONFIG[meritKey];
        const value = idx <= 2 
          ? chartData.positive[idx] as number
          : chartData.negative[idx] as number;
        
        return `
          <strong style="color: ${config.color}">${config.label}</strong><br/>
          Contribuição: ${config.operator}${value.toFixed(2)}<br/>
          Acumulado: ${chartData.accumulated[idx].toFixed(2)}
        `;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '8%',
      top: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: {
        lineStyle: { color: '#e2e8f0' },
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: 500,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: '#f1f5f9', type: 'dashed' },
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        formatter: (value: number) => value.toFixed(0),
      },
    },
    series: [
      // Placeholder (transparente)
      {
        name: 'Placeholder',
        type: 'bar',
        stack: 'waterfall',
        itemStyle: {
          borderColor: 'transparent',
          color: 'transparent',
        },
        emphasis: {
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent',
          },
        },
        data: chartData.placeholder,
      },
      // Valores positivos (B, O) - com labels usando rich text
      {
        name: 'Positivo',
        type: 'bar',
        stack: 'waterfall',
        itemStyle: {
          color: (params: any) => {
            if (params.dataIndex === 1) return BOCR_CONFIG.B.color;
            if (params.dataIndex === 2) return BOCR_CONFIG.O.color;
            return 'transparent';
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: showValues,
          position: 'top',
          formatter: (params: any) => {
            if (params.value === '-' || params.value === 0) return '';
            const val = (params.value as number).toFixed(1);
            // Usar rich text para cor dinâmica
            if (params.dataIndex === 1) return `{beneficios|+${val}}`;
            if (params.dataIndex === 2) return `{oportunidades|+${val}}`;
            return `+${val}`;
          },
          rich: {
            beneficios: {
              color: BOCR_CONFIG.B.color,
              fontWeight: 600,
              fontSize: 12,
            },
            oportunidades: {
              color: BOCR_CONFIG.O.color,
              fontWeight: 600,
              fontSize: 12,
            },
          },
        },
        data: chartData.positive,
      },
      // Valores negativos (C, R) - com labels usando rich text
      {
        name: 'Negativo',
        type: 'bar',
        stack: 'waterfall',
        itemStyle: {
          color: (params: any) => {
            if (params.dataIndex === 3) return BOCR_CONFIG.C.color;
            if (params.dataIndex === 4) return BOCR_CONFIG.R.color;
            return 'transparent';
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: showValues,
          position: 'top',
          formatter: (params: any) => {
            if (params.value === '-' || params.value === 0) return '';
            const val = (params.value as number).toFixed(1);
            // Usar rich text para cor dinâmica
            if (params.dataIndex === 3) return `{custos|−${val}}`;
            if (params.dataIndex === 4) return `{riscos|−${val}}`;
            return `−${val}`;
          },
          rich: {
            custos: {
              color: BOCR_CONFIG.C.color,
              fontWeight: 600,
              fontSize: 12,
            },
            riscos: {
              color: BOCR_CONFIG.R.color,
              fontWeight: 600,
              fontSize: 12,
            },
          },
        },
        data: chartData.negative,
      },
      // Total
      {
        name: 'Total',
        type: 'bar',
        stack: 'waterfall',
        itemStyle: {
          color: (params: any) => {
            const val = params.value as number;
            return val >= 0 ? '#3B82F6' : '#EF4444';
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: showValues,
          position: 'top',
          formatter: (params: any) => {
            if (params.value === '-') return '';
            return (params.value as number).toFixed(2);
          },
          color: '#3B82F6',
          fontWeight: 700,
          fontSize: 13,
        },
        data: chartData.total,
      },
    ],
    animationDuration: 1200,
    animationEasing: 'elasticOut',
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-slate-800">{alternative.name}</h4>
        <p className="text-sm text-slate-500">
          Decomposição: B + O − C − R = Score
        </p>
      </div>
      
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
      />
      
      {/* ✅ CORRIGIDO: Fórmula usa valores consistentes do cálculo interno */}
      <div className="flex items-center justify-center gap-2 mt-4 text-sm font-mono flex-wrap">
        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">
          +{values.B.toFixed(1)}
        </span>
        <span className="text-slate-400">+</span>
        <span className="px-2 py-1 rounded bg-amber-100 text-amber-700">
          +{values.O.toFixed(1)}
        </span>
        <span className="text-slate-400">−</span>
        <span className="px-2 py-1 rounded bg-red-100 text-red-700">
          {values.C.toFixed(1)}
        </span>
        <span className="text-slate-400">−</span>
        <span className="px-2 py-1 rounded bg-orange-100 text-orange-700">
          {values.R.toFixed(1)}
        </span>
        <span className="text-slate-400">=</span>
        <span className={`px-3 py-1 rounded font-bold ${
          values.final >= 0 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {values.final.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
