// components/CRHeatmap.tsx
/**
 * Heatmap de Consistency Ratio - Versão Profissional
 * 
 * Visualização matricial de CR com grupos de especialistas
 * UX otimizada para uso de tela completa
 */

'use client';

import { useState, useMemo } from 'react';
import { Download, Info, ZoomIn, ZoomOut } from 'lucide-react';

interface CRHeatmapProps {
  responses: any[];
  demographicGroups: Record<string, string>;
}

interface HeatmapCell {
  respondentId: string;
  respondentName: string;
  criterionCode: string;
  criterionName: string;
  cr: number;
  group: string;
}

const CRITERIA = [
  { code: 'bocr', name: 'BOCR' },
  { code: 'magnitude', name: 'Mag.' },
  { code: 'B1', name: 'B1' }, { code: 'B2', name: 'B2' }, { code: 'B3', name: 'B3' }, { code: 'B4', name: 'B4' }, { code: 'B5', name: 'B5' },
  { code: 'O1', name: 'O1' }, { code: 'O2', name: 'O2' }, { code: 'O3', name: 'O3' }, { code: 'O4', name: 'O4' }, { code: 'O5', name: 'O5' },
  { code: 'C1', name: 'C1' }, { code: 'C2', name: 'C2' }, { code: 'C3', name: 'C3' }, { code: 'C4', name: 'C4' }, { code: 'C5', name: 'C5' },
  { code: 'R1', name: 'R1' }, { code: 'R2', name: 'R2' }, { code: 'R3', name: 'R3' }, { code: 'R4', name: 'R4' }, { code: 'R5', name: 'R5' },
];

function getCRIntensity(cr: number): string {
  if (cr < 0.05) {
    const intensity = Math.min(cr / 0.05, 1);
    return `rgba(34, 197, 94, ${0.3 + intensity * 0.7})`;
  } else if (cr < 0.10) {
    const intensity = (cr - 0.05) / 0.05;
    return `rgba(234, 179, 8, ${0.3 + intensity * 0.7})`;
  } else {
    const intensity = Math.min((cr - 0.10) / 0.10, 1);
    return `rgba(239, 68, 68, ${0.5 + intensity * 0.5})`;
  }
}

function processHeatmapData(responses: any[], demographicGroups: Record<string, string>): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  
  responses.forEach((response, idx) => {
    const respondentId = response.id || `resp-${idx}`;
    const respondentName = response.email || `Especialista ${idx + 1}`;
    const group = demographicGroups[respondentId] || 'Sem grupo';
    
    CRITERIA.forEach(criterion => {
      const cr = response.consistencies?.[criterion.code]?.cr || 0;
      cells.push({
        respondentId,
        respondentName,
        criterionCode: criterion.code,
        criterionName: criterion.name,
        cr,
        group
      });
    });
  });
  
  return cells;
}

export default function CRHeatmap({ responses, demographicGroups }: CRHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [cellSize, setCellSize] = useState(40);

  const heatmapData = useMemo(
    () => processHeatmapData(responses, demographicGroups),
    [responses, demographicGroups]
  );

  const groups = useMemo(() => {
    const groupSet = new Set(Object.values(demographicGroups));
    return ['all', ...Array.from(groupSet)];
  }, [demographicGroups]);

  const filteredData = useMemo(() => {
    if (selectedGroup === 'all') return heatmapData;
    return heatmapData.filter(cell => cell.group === selectedGroup);
  }, [heatmapData, selectedGroup]);

  const matrix = useMemo(() => {
    const respondents = Array.from(new Set(filteredData.map(c => c.respondentId)));
    const result: Record<string, Record<string, HeatmapCell>> = {};
    
    respondents.forEach(respId => {
      result[respId] = {};
      CRITERIA.forEach(criterion => {
        const cell = filteredData.find(
          c => c.respondentId === respId && c.criterionCode === criterion.code
        );
        if (cell) result[respId][criterion.code] = cell;
      });
    });
    
    return result;
  }, [filteredData]);

  const respondentIds = Object.keys(matrix);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            🔥 Heatmap de Consistency Ratio
          </h3>
          <p className="text-gray-600">
            Visualização matricial: Respondente × Critério
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCellSize(prev => Math.max(20, prev - 5))}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCellSize(prev => Math.min(80, prev + 5))}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filtro Grupo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filtrar por Grupo:
        </label>
        <div className="flex flex-wrap gap-2">
          {groups.map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                selectedGroup === group
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {group === 'all' ? 'Todos' : group}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-gradient-to-r from-green-50 via-yellow-50 to-red-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-gray-700">CR &lt; 5%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span className="text-sm text-gray-700">5-10%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm text-gray-700">&gt; 10%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            Cor mais escura = CR mais alto
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold sticky left-0 bg-indigo-600 z-10">
                  Respondente
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium" colSpan={2}>
                  Estratégico
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium border-l border-indigo-500" colSpan={5}>
                  Benefícios
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium border-l border-indigo-500" colSpan={5}>
                  Oportunidades
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium border-l border-indigo-500" colSpan={5}>
                  Custos
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium border-l border-indigo-500" colSpan={5}>
                  Riscos
                </th>
              </tr>
              <tr className="bg-indigo-700">
                <th className="px-4 py-2 sticky left-0 bg-indigo-700 z-10"></th>
                {CRITERIA.map((criterion, idx) => (
                  <th 
                    key={criterion.code}
                    className={`px-2 py-2 text-center text-xs font-medium ${
                      [2, 7, 12, 17].includes(idx) ? 'border-l border-indigo-500' : ''
                    }`}
                    style={{ width: `${cellSize}px`, minWidth: `${cellSize}px` }}
                  >
                    {criterion.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {respondentIds.map((respId, respIdx) => {
                const firstCell = matrix[respId][CRITERIA[0].code];
                return (
                  <tr 
                    key={respId}
                    className={`hover:bg-gray-50 transition-colors ${
                      respIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                      <div>{firstCell?.respondentName}</div>
                      <div className="text-xs text-gray-500 mt-1">{firstCell?.group}</div>
                    </td>
                    {CRITERIA.map((criterion, critIdx) => {
                      const cell = matrix[respId][criterion.code];
                      if (!cell) return <td key={criterion.code}></td>;
                      
                      return (
                        <td
                          key={criterion.code}
                          className={`px-2 py-2 text-center text-xs font-medium cursor-pointer transition-all ${
                            [2, 7, 12, 17].includes(critIdx) ? 'border-l border-gray-300' : ''
                          }`}
                          style={{
                            backgroundColor: getCRIntensity(cell.cr),
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            minWidth: `${cellSize}px`
                          }}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {cellSize > 30 && `${(cell.cr * 100).toFixed(1)}%`}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl z-50 max-w-sm">
          <div className="font-semibold mb-2">{hoveredCell.respondentName}</div>
          <div className="text-sm space-y-1">
            <div><span className="text-gray-400">Grupo:</span> {hoveredCell.group}</div>
            <div><span className="text-gray-400">Critério:</span> {hoveredCell.criterionName}</div>
            <div>
              <span className="text-gray-400">CR:</span>{' '}
              <span className={`font-bold ${
                hoveredCell.cr < 0.05 ? 'text-green-400' :
                hoveredCell.cr < 0.10 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {(hoveredCell.cr * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>{' '}
              {hoveredCell.cr < 0.05 ? '✅ Excelente' :
               hoveredCell.cr < 0.10 ? '⚠️ Aceitável' :
               '❌ Revisar'}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-4">
          <div className="text-sm text-green-700 font-medium mb-1">Excelentes</div>
          <div className="text-2xl font-bold text-green-900">
            {filteredData.filter(c => c.cr < 0.05).length}
          </div>
          <div className="text-xs text-green-600 mt-1">
            {((filteredData.filter(c => c.cr < 0.05).length / filteredData.length) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-sm border border-yellow-200 p-4">
          <div className="text-sm text-yellow-700 font-medium mb-1">Aceitáveis</div>
          <div className="text-2xl font-bold text-yellow-900">
            {filteredData.filter(c => c.cr >= 0.05 && c.cr < 0.10).length}
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            {((filteredData.filter(c => c.cr >= 0.05 && c.cr < 0.10).length / filteredData.length) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-4">
          <div className="text-sm text-red-700 font-medium mb-1">Revisar</div>
          <div className="text-2xl font-bold text-red-900">
            {filteredData.filter(c => c.cr >= 0.10).length}
          </div>
          <div className="text-xs text-red-600 mt-1">
            {((filteredData.filter(c => c.cr >= 0.10).length / filteredData.length) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-sm border border-indigo-200 p-4">
          <div className="text-sm text-indigo-700 font-medium mb-1">CR Médio</div>
          <div className="text-2xl font-bold text-indigo-900">
            {((filteredData.reduce((sum, c) => sum + c.cr, 0) / filteredData.length) * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-indigo-600 mt-1">
            {filteredData.length} medições
          </div>
        </div>
      </div>
    </div>
  );
}
