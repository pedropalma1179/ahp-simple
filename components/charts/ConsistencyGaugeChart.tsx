// components/charts/ConsistencyGaugeChart.tsx
// Medidor visual de consistência (CR) estilo velocímetro
// Features: Animação, cores semáforo, threshold lines

'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface ConsistencyGaugeChartProps {
  cr: number;
  height?: number;
  showDetails?: boolean;
  lambda?: number;
  ci?: number;
}

export default function ConsistencyGaugeChart({
  cr,
  height = 300,
  showDetails = true,
  lambda,
  ci,
}: ConsistencyGaugeChartProps) {
  
  // Converter CR para porcentagem (0-100 para visualização, mas limitado a 20%)
  const crPercent = cr * 100;
  const displayValue = Math.min(crPercent, 20); // Cap visual em 20%
  
  // Determinar status e cor
  const getStatus = () => {
    if (cr <= 0.10) return { 
      label: 'Consistente', 
      color: '#10B981',
      bgColor: '#ECFDF5',
      icon: '✓',
      description: 'Julgamentos dentro do limite aceitável (CR ≤ 10%)'
    };
    if (cr <= 0.15) return { 
      label: 'Atenção', 
      color: '#F59E0B',
      bgColor: '#FFFBEB',
      icon: '!',
      description: 'Consistência marginal - considere revisar alguns julgamentos'
    };
    return { 
      label: 'Revisar', 
      color: '#EF4444',
      bgColor: '#FEF2F2',
      icon: '✕',
      description: 'Inconsistência alta - revisão necessária'
    };
  };
  
  const status = getStatus();

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    series: [
      // Gauge principal
      {
        type: 'gauge',
        center: ['50%', '60%'],
        radius: '90%',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 20,
        splitNumber: 4,
        
        // Eixo
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.5, '#10B981'],   // 0-10%: Verde
              [0.75, '#F59E0B'],  // 10-15%: Amarelo
              [1, '#EF4444'],     // 15-20%: Vermelho
            ],
          },
        },
        
        // Ponteiro
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '65%',
          width: 12,
          offsetCenter: [0, '-10%'],
          itemStyle: {
            color: status.color,
            shadowColor: 'rgba(0,0,0,0.2)',
            shadowBlur: 8,
            shadowOffsetY: 4,
          },
        },
        
        // Âncora do ponteiro
        anchor: {
          show: true,
          showAbove: true,
          size: 20,
          itemStyle: {
            borderWidth: 4,
            borderColor: status.color,
            color: '#fff',
            shadowColor: 'rgba(0,0,0,0.1)',
            shadowBlur: 10,
          },
        },
        
        // Marcas principais
        axisTick: {
          length: 8,
          lineStyle: {
            color: 'auto',
            width: 2,
          },
        },
        
        // Linhas de divisão
        splitLine: {
          length: 15,
          lineStyle: {
            color: 'auto',
            width: 3,
          },
        },
        
        // Labels do eixo
        axisLabel: {
          color: '#64748b',
          fontSize: 12,
          fontWeight: 500,
          distance: 30,
          formatter: (value: number) => `${value}%`,
        },
        
        // Título (dentro do gauge) - posição mais baixa
        title: {
          offsetCenter: [0, '55%'],
          fontSize: 12,
          color: '#64748b',
          fontWeight: 500,
        },
        
        // Valor principal - posição ajustada para não sobrepor
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: 700,
          fontFamily: 'Roboto Mono, monospace',
          offsetCenter: [0, '25%'],
          formatter: (value: number) => `${crPercent.toFixed(2)}%`,
          color: status.color,
        },
        
        data: [
          {
            value: displayValue,
            name: 'Consistency Ratio',
          },
        ],
        
        animationDuration: 2000,
        animationEasing: 'elasticOut',
      },
      
      // Anel externo decorativo
      {
        type: 'gauge',
        center: ['50%', '60%'],
        radius: '100%',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 20,
        
        axisLine: {
          lineStyle: {
            width: 2,
            color: [[1, '#e2e8f0']],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        detail: { show: false },
      },
    ],
  };

  return (
    <div className="w-full">
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
      />
      
      {/* Status badge */}
      <div className="flex justify-center -mt-4">
        <div 
          className="px-4 py-2 rounded-full flex items-center gap-2"
          style={{ backgroundColor: status.bgColor }}
        >
          <span 
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: status.color }}
          >
            {status.icon}
          </span>
          <span className="font-semibold" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
      </div>
      
      {/* Detalhes adicionais */}
      {showDetails && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-600 text-center">
            {status.description}
          </p>
          
          {/* Métricas adicionais */}
          {(lambda !== undefined || ci !== undefined) && (
            <div className="flex justify-center gap-6 pt-3 border-t border-slate-200">
              {lambda !== undefined && (
                <div className="text-center">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">λ max</span>
                  <p className="text-lg font-mono font-semibold text-slate-700">
                    {lambda.toFixed(4)}
                  </p>
                </div>
              )}
              {ci !== undefined && (
                <div className="text-center">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">CI</span>
                  <p className="text-lg font-mono font-semibold text-slate-700">
                    {ci.toFixed(4)}
                  </p>
                </div>
              )}
              <div className="text-center">
                <span className="text-xs text-slate-500 uppercase tracking-wider">CR</span>
                <p className="text-lg font-mono font-semibold" style={{ color: status.color }}>
                  {(cr * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          )}
          
          {/* Escala de referência */}
          <div className="flex items-center justify-center gap-4 pt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>≤10% OK</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>10-15% Atenção</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>&gt;15% Revisar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
