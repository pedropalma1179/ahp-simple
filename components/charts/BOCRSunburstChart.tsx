// components/charts/BOCRSunburstChart.tsx
// Visualização hierárquica do modelo AHP-BOCR
// Features: Drill-down interativo, cores semânticas, animações
// CORRIGIDO: Labels externos visíveis

'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface SubcriteriaWeight {
  code: string;
  name: string;
  localWeight: number;
  globalWeight: number;
}

interface BOCRSunburstChartProps {
  bocrWeights: number[];
  subWeights?: Record<string, number[]>;
  subcriteria?: Record<string, SubcriteriaWeight[]>;
  height?: number;
  showLabels?: boolean;
}

// Cores BOCR oficiais
const BOCR_COLORS = {
  B: { main: '#10B981', light: '#34D399', lighter: '#6EE7B7', bg: '#ECFDF5' },
  O: { main: '#F59E0B', light: '#FBBF24', lighter: '#FCD34D', bg: '#FFFBEB' },
  C: { main: '#EF4444', light: '#F87171', lighter: '#FCA5A5', bg: '#FEF2F2' },
  R: { main: '#F97316', light: '#FB923C', lighter: '#FDBA74', bg: '#FFF7ED' },
};

const BOCR_LABELS = {
  B: { full: 'Benefícios', short: 'B' },
  O: { full: 'Oportunidades', short: 'O' },
  C: { full: 'Custos', short: 'C' },
  R: { full: 'Riscos', short: 'R' },
};

// Subcritérios padrão (baseado na dissertação)
const DEFAULT_SUBCRITERIA: Record<string, string[]> = {
  B: ['Produtividade', 'Qualidade', 'Flexibilidade', 'Ergonomia', 'Sustentabilidade'],
  O: ['Transformação Digital', 'Reputação', 'Novos Mercados', 'Parcerias', 'Inovação'],
  C: ['CAPEX', 'OPEX', 'Treinamento', 'Manutenção', 'Infraestrutura'],
  R: ['Técnico', 'Mercado', 'Regulatório', 'Cibersegurança', 'Implementação'],
};

export default function BOCRSunburstChart({
  bocrWeights,
  subWeights,
  subcriteria,
  height = 550,
  showLabels = true,
}: BOCRSunburstChartProps) {
  
  const chartData = useMemo(() => {
    const meritKeys: ('B' | 'O' | 'C' | 'R')[] = ['B', 'O', 'C', 'R'];
    
    return meritKeys.map((merit, idx) => {
      const weight = bocrWeights[idx] || 0;
      const colors = BOCR_COLORS[merit];
      const labels = BOCR_LABELS[merit];
      
      // Subcritérios
      const subs = subWeights?.[merit] || [];
      const subNames = subcriteria?.[merit]?.map(s => s.name) || DEFAULT_SUBCRITERIA[merit];
      
      const children = subNames.map((name, subIdx) => {
        const localWeight = subs[subIdx] || (1 / subNames.length);
        const globalWeight = weight * localWeight;
        
        return {
          name: name,
          value: globalWeight * 100,
          itemStyle: {
            color: subIdx % 2 === 0 ? colors.light : colors.lighter,
          },
        };
      });
      
      return {
        name: labels.full,
        value: weight * 100,
        itemStyle: {
          color: colors.main,
        },
        children: children.length > 0 ? children : undefined,
      };
    });
  }, [bocrWeights, subWeights, subcriteria]);

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: {
        color: '#1e293b',
        fontSize: 12,
      },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;',
      formatter: (params: any) => {
        const value = params.value || 0;
        const parent = params.treePathInfo?.[1]?.name || '';
        
        if (params.treePathInfo?.length === 2) {
          // É um mérito (nível 1)
          return `
            <div style="padding: 8px;">
              <strong style="font-size: 14px;">${params.name}</strong><br/>
              <strong style="font-size: 18px; color: ${params.color};">${value.toFixed(1)}%</strong>
            </div>
          `;
        } else {
          // É um subcritério (nível 2)
          return `
            <div style="padding: 8px;">
              <strong>${params.name}</strong><br/>
              <span style="color: #666; font-size: 11px;">${parent}</span><br/>
              Peso Global: <strong>${value.toFixed(2)}%</strong>
            </div>
          `;
        }
      },
    },
    series: [
      {
        type: 'sunburst',
        data: chartData,
        radius: ['12%', '70%'],
        center: ['50%', '50%'],
        sort: undefined,
        emphasis: {
          focus: 'ancestor',
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
        levels: [
          {},
          // Nível 1: Méritos BOCR (anel interno)
          {
            r0: '12%',
            r: '40%',
            itemStyle: {
              borderWidth: 3,
              borderColor: '#fff',
            },
            label: {
              show: showLabels,
              rotate: 'tangential',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              formatter: (params: any) => {
                return `${params.name}\n${params.value.toFixed(1)}%`;
              },
            },
          },
          // Nível 2: Subcritérios (anel externo)
          {
            r0: '40%',
            r: '70%',
            itemStyle: {
              borderWidth: 1,
              borderColor: '#fff',
            },
            label: {
              show: showLabels,
              rotate: 'radial',
              fontSize: 9,
              fontWeight: 500,
              color: '#374151',
              minAngle: 5,
              formatter: (params: any) => {
                // Mostrar nome completo se tiver espaço suficiente
                const name = params.name || '';
                if (params.value < 1.5) return ''; // Muito pequeno
                if (name.length > 15) {
                  return name.substring(0, 13) + '..';
                }
                return name;
              },
            },
          },
        ],
        itemStyle: {
          borderRadius: 4,
        },
        animationDuration: 1000,
        animationEasing: 'cubicOut',
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
      
      {/* Legenda personalizada */}
      <div className="flex justify-center gap-6 mt-4 flex-wrap">
        {(['B', 'O', 'C', 'R'] as const).map((merit, idx) => (
          <div key={merit} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: BOCR_COLORS[merit].main }}
            />
            <span className="text-sm text-slate-600">
              {BOCR_LABELS[merit].full}
            </span>
            <span className="text-sm font-mono font-medium" style={{ color: BOCR_COLORS[merit].main }}>
              {((bocrWeights[idx] || 0) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
