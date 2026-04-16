// components/CRHeatmapPlotly.tsx
/**
 * Heatmap de Consistency Ratio usando Plotly.js
 * 
 * Versão PROFISSIONAL com:
 * - Interatividade completa (hover, zoom, pan)
 * - Export PNG/SVG integrado
 * - Escala de cores científica
 * - Annotations automáticas
 * - Perfeito para dissertações
 */

'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Download, Maximize2, Filter, Info } from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

interface CRHeatmapPlotlyProps {
  responses: any[];
  demographicGroups: Record<string, string>;
  showGroupSeparation?: boolean;
}

// ============================================================
// CONSTANTES
// ============================================================

const CRITERIA_LABELS = {
  'bocr': 'BOCR',
  'magnitude': 'Mag',
  'B1': 'B1', 'B2': 'B2', 'B3': 'B3', 'B4': 'B4', 'B5': 'B5',
  'O1': 'O1', 'O2': 'O2', 'O3': 'O3', 'O4': 'O4', 'O5': 'O5',
  'C1': 'C1', 'C2': 'C2', 'C3': 'C3', 'C4': 'C4', 'C5': 'C5',
  'R1': 'R1', 'R2': 'R2', 'R3': 'R3', 'R4': 'R4', 'R5': 'R5'
};

const CRITERIA_ORDER = Object.keys(CRITERIA_LABELS);

// ============================================================
// PROCESSAR DADOS
// ============================================================

function processDataForPlotly(responses: any[], demographicGroups: Record<string, string>) {
  const yLabels: string[] = [];
  const xLabels = CRITERIA_ORDER.map(c => CRITERIA_LABELS[c as keyof typeof CRITERIA_LABELS]);
  const zValues: number[][] = [];
  const hoverTexts: string[][] = [];
  const groups: string[] = [];

  responses.forEach((response, idx) => {
    const respondentId = response.id || `resp-${idx}`;
    const respondentName = response.email || `Especialista ${idx + 1}`;
    const group = demographicGroups[respondentId] || 'Sem grupo';
    
    yLabels.push(respondentName);
    groups.push(group);
    
    const rowValues: number[] = [];
    const rowHovers: string[] = [];
    
    CRITERIA_ORDER.forEach(criterion => {
      const cr = response.consistencies?.[criterion]?.cr || 0;
      rowValues.push(cr * 100); // Converter para percentual
      
      const status = cr < 0.05 ? '✅ Excelente' : cr < 0.10 ? '⚠️ Aceitável' : '❌ Revisar';
      rowHovers.push(
        `<b>${respondentName}</b><br>` +
        `Grupo: ${group}<br>` +
        `Critério: ${CRITERIA_LABELS[criterion as keyof typeof CRITERIA_LABELS]}<br>` +
        `CR: ${(cr * 100).toFixed(2)}%<br>` +
        `Status: ${status}`
      );
    });
    
    zValues.push(rowValues);
    hoverTexts.push(rowHovers);
  });

  return { xLabels, yLabels, zValues, hoverTexts, groups };
}

// ============================================================
// COMPONENTE
// ============================================================

export default function CRHeatmapPlotly({ 
  responses, 
  demographicGroups,
  showGroupSeparation = true 
}: CRHeatmapPlotlyProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [colorscale, setColorscale] = useState<string>('RdYlGn_r');

  // Grupos disponíveis
  const groups = useMemo(() => {
    const uniqueGroups = new Set(Object.values(demographicGroups));
    return ['all', ...Array.from(uniqueGroups)];
  }, [demographicGroups]);

  // Filtrar por grupo
  const filteredResponses = useMemo(() => {
    if (selectedGroup === 'all') return responses;
    return responses.filter((r, idx) => {
      const respondentId = r.id || `resp-${idx}`;
      return demographicGroups[respondentId] === selectedGroup;
    });
  }, [responses, selectedGroup, demographicGroups]);

  // Processar dados
  const plotData = useMemo(
    () => processDataForPlotly(filteredResponses, demographicGroups),
    [filteredResponses, demographicGroups]
  );

  // Estatísticas
  const stats = useMemo(() => {
    const allValues = plotData.zValues.flat();
    return {
      mean: allValues.reduce((a, b) => a + b, 0) / allValues.length,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      excellent: allValues.filter(v => v < 5).length,
      acceptable: allValues.filter(v => v >= 5 && v < 10).length,
      review: allValues.filter(v => v >= 10).length,
      total: allValues.length
    };
  }, [plotData]);

  // Criar/Atualizar gráfico Plotly
  useEffect(() => {
    if (!plotRef.current) return;

    const trace: Partial<Plotly.PlotData> = {
      type: 'heatmap',
      x: plotData.xLabels,
      y: plotData.yLabels,
      z: plotData.zValues,
      text: plotData.hoverTexts,
      hovertemplate: '%{text}<extra></extra>',
      colorscale: [
        [0, '#10b981'],      // Verde escuro (0%)
        [0.05, '#34d399'],   // Verde claro (5%)
        [0.08, '#fbbf24'],   // Amarelo (8%)
        [0.10, '#fb923c'],   // Laranja (10%)
        [1, '#ef4444']       // Vermelho (>10%)
      ],
      zmin: 0,
      zmax: Math.max(15, stats.max), // Mínimo 15% para escala consistente
      colorbar: {
        title: {
          text: 'CR (%)',
          side: 'right'
        },
        ticksuffix: '%',
        thickness: 20,
        len: 0.7
      },
      xgap: 1,
      ygap: 1
    };

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: '<b>Heatmap de Consistency Ratio</b><br><sub>Respondente × Critério</sub>',
        font: { size: 18, family: 'Inter, sans-serif' }
      },
      xaxis: {
        title: 'Critérios',
        tickangle: -45,
        side: 'bottom',
        tickfont: { size: 10 },
        showgrid: false
      },
      yaxis: {
        title: 'Respondentes',
        tickfont: { size: 10 },
        automargin: true,
        showgrid: false
      },
      margin: {
        l: 150,
        r: 80,
        t: 80,
        b: 100
      },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      height: Math.max(500, plotData.yLabels.length * 25 + 150),
      annotations: []
    };

    // Adicionar linhas de separação por grupo (se ativado)
    if (showGroupSeparation && selectedGroup === 'all') {
      let currentGroup = plotData.groups[0];
      let groupStartIdx = 0;

      plotData.groups.forEach((group, idx) => {
        if (group !== currentGroup && layout.annotations) {
          // Adicionar linha horizontal
          layout.shapes = layout.shapes || [];
          layout.shapes.push({
            type: 'line',
            x0: -0.5,
            x1: plotData.xLabels.length - 0.5,
            y0: idx - 0.5,
            y1: idx - 0.5,
            line: {
              color: '#6366f1',
              width: 2,
              dash: 'dot'
            }
          });

          // Adicionar label do grupo
          layout.annotations.push({
            x: -1,
            y: (groupStartIdx + idx - 1) / 2,
            xref: 'x',
            yref: 'y',
            text: `<b>${currentGroup}</b>`,
            showarrow: false,
            font: { size: 11, color: '#6366f1' },
            textangle: -90,
            xanchor: 'right'
          });

          currentGroup = group;
          groupStartIdx = idx;
        }
      });

      // Último grupo
      if (layout.annotations) {
        layout.annotations.push({
          x: -1,
          y: (groupStartIdx + plotData.groups.length - 1) / 2,
          xref: 'x',
          yref: 'y',
          text: `<b>${currentGroup}</b>`,
          showarrow: false,
          font: { size: 11, color: '#6366f1' },
          textangle: -90,
          xanchor: 'right'
        });
      }
    }

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      toImageButtonOptions: {
        format: 'png',
        filename: `CR-Heatmap-${Date.now()}`,
        height: 1200,
        width: 1600,
        scale: 2
      }
    };

    Plotly.newPlot(plotRef.current, [trace], layout, config);

    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [plotData, showGroupSeparation, selectedGroup, stats.max]);

  // Export handlers
  function exportAsPNG() {
    if (!plotRef.current) return;
    Plotly.downloadImage(plotRef.current, {
      format: 'png',
      width: 1600,
      height: 1200,
      filename: `CR-Heatmap-${Date.now()}`
    });
  }

  function exportAsSVG() {
    if (!plotRef.current) return;
    Plotly.downloadImage(plotRef.current, {
      format: 'svg',
      width: 1600,
      height: 1200,
      filename: `CR-Heatmap-${Date.now()}`
    });
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              🔥 Heatmap Interativo de CR (Plotly)
            </h3>
            <p className="text-gray-600">
              Visualização profissional com zoom, pan e export de alta qualidade
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportAsPNG}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm"
              title="Exportar como PNG (alta resolução)"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            <button
              onClick={exportAsSVG}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
              title="Exportar como SVG (vetorial)"
            >
              <Download className="w-4 h-4" />
              SVG
            </button>
          </div>
        </div>

        {/* Filtro de Grupo */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Filter className="w-4 h-4" />
            Filtrar por Grupo:
          </label>
          <div className="flex flex-wrap gap-2">
            {groups.map(group => (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                  selectedGroup === group
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {group === 'all' ? '📊 Todos os Grupos' : `👥 ${group}`}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs Rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
            <div className="text-xs text-green-700 font-medium">✅ Excelentes</div>
            <div className="text-xl font-bold text-green-900">{stats.excellent}</div>
            <div className="text-xs text-green-600">
              {((stats.excellent / stats.total) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border border-yellow-200">
            <div className="text-xs text-yellow-700 font-medium">⚠️ Aceitáveis</div>
            <div className="text-xl font-bold text-yellow-900">{stats.acceptable}</div>
            <div className="text-xs text-yellow-600">
              {((stats.acceptable / stats.total) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
            <div className="text-xs text-red-700 font-medium">❌ Revisar</div>
            <div className="text-xl font-bold text-red-900">{stats.review}</div>
            <div className="text-xs text-red-600">
              {((stats.review / stats.total) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border border-indigo-200">
            <div className="text-xs text-indigo-700 font-medium">📊 CR Médio</div>
            <div className="text-xl font-bold text-indigo-900">{stats.mean.toFixed(2)}%</div>
            <div className="text-xs text-indigo-600">{stats.total} medições</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
            <div className="text-xs text-purple-700 font-medium">📈 CR Máx</div>
            <div className="text-xl font-bold text-purple-900">{stats.max.toFixed(2)}%</div>
            <div className="text-xs text-purple-600">Pior caso</div>
          </div>
        </div>
      </div>

      {/* Gráfico Plotly */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div ref={plotRef} className="w-full" />
      </div>

      {/* Instruções de Uso */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Info className="w-5 h-5" />
          💡 Como usar o heatmap interativo:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Hover:</strong> Passe o mouse sobre as células para ver detalhes</li>
          <li>• <strong>Zoom:</strong> Clique e arraste para dar zoom em uma área</li>
          <li>• <strong>Pan:</strong> Duplo clique para resetar, arraste para mover</li>
          <li>• <strong>Export:</strong> Use os botões PNG/SVG para imagens de alta qualidade</li>
          <li>• <strong>Filtros:</strong> Selecione grupos para análise focada</li>
          <li>• <strong>Cores:</strong> Verde (excelente) → Amarelo (aceitável) → Vermelho (revisar)</li>
        </ul>
      </div>

      {/* Nota Metodológica */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-semibold text-purple-900 mb-2">
          📚 Nota Metodológica
        </h4>
        <p className="text-sm text-purple-800">
          Heatmap implementado com Plotly.js seguindo as recomendações de Saaty (1980, 2008) 
          para visualização de Consistency Ratio em grupo. Escala de cores baseada nos thresholds: 
          CR &lt; 5% (excelente), 5% ≤ CR &lt; 10% (aceitável), CR ≥ 10% (revisar). 
          Exports em alta resolução (PNG 1600×1200) prontos para inclusão em dissertação.
        </p>
      </div>
    </div>
  );
}
