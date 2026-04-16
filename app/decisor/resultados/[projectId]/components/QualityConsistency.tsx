// app/decisor/resultados/[projectId]/components/QualityConsistency.tsx
/**
 * Aba: Qualidade & Consistência
 * 
 * Componente principal para análise de consistência com:
 * - CR Table por respondente (com grupos)
 * - Distribuição estatística
 * - Identificação de outliers
 * - Análise de convergência do grupo
 * 
 * Layout: Full-screen profissional
 */

'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { AlertTriangle, CheckCircle, TrendingUp, Users, Download } from 'lucide-react';
import CRTableExpanded from '@/components/CRTableExpanded';
import * as XLSX from 'xlsx';

// ============================================================
// TIPOS
// ============================================================

interface QualityConsistencyProps {
  project: any;
  calculation: any;
  responses: any[];
  demographics?: any[];
}

// ============================================================
// PROCESSAR DADOS
// ============================================================

function processResponsesForHeatmap(responses: any[]) {
  return responses.map((response, idx) => {
    const consistencies = response.consistencies || {};
    
    return {
      respondentId: response.id || `resp-${idx + 1}`,
      respondentName: response.email || `Especialista ${idx + 1}`,
      group: response.group || response.demographics?.cargo || 'Não especificado',
      criteria: {
        'BOCR': consistencies.bocr?.cr || 0,
        'Magnitude': consistencies.magnitude?.cr || 0,
        'B1': consistencies.B1?.cr || 0,
        'B2': consistencies.B2?.cr || 0,
        'B3': consistencies.B3?.cr || 0,
        'B4': consistencies.B4?.cr || 0,
        'B5': consistencies.B5?.cr || 0,
        'O1': consistencies.O1?.cr || 0,
        'O2': consistencies.O2?.cr || 0,
        'O3': consistencies.O3?.cr || 0,
        'O4': consistencies.O4?.cr || 0,
        'O5': consistencies.O5?.cr || 0,
        'C1': consistencies.C1?.cr || 0,
        'C2': consistencies.C2?.cr || 0,
        'C3': consistencies.C3?.cr || 0,
        'C4': consistencies.C4?.cr || 0,
        'C5': consistencies.C5?.cr || 0,
        'R1': consistencies.R1?.cr || 0,
        'R2': consistencies.R2?.cr || 0,
        'R3': consistencies.R3?.cr || 0,
        'R4': consistencies.R4?.cr || 0,
        'R5': consistencies.R5?.cr || 0,
      }
    };
  });
}

function calculateCRDistribution(responses: any[]) {
  const allCRs: number[] = [];
  
  responses.forEach(response => {
    const consistencies = response.consistencies || {};
    Object.values(consistencies).forEach((c: any) => {
      if (c?.cr !== undefined) {
        allCRs.push(c.cr);
      }
    });
  });
  
  // Criar histograma
  const bins = [
    { range: '0-2%', min: 0, max: 0.02, count: 0, color: '#10b981' },
    { range: '2-5%', min: 0.02, max: 0.05, count: 0, color: '#34d399' },
    { range: '5-8%', min: 0.05, max: 0.08, count: 0, color: '#fbbf24' },
    { range: '8-10%', min: 0.08, max: 0.10, count: 0, color: '#fb923c' },
    { range: '>10%', min: 0.10, max: Infinity, count: 0, color: '#ef4444' }
  ];
  
  allCRs.forEach(cr => {
    const bin = bins.find(b => cr >= b.min && cr < b.max);
    if (bin) bin.count++;
  });
  
  return bins;
}

function identifyOutliers(responses: any[], threshold: number = 0.10) {
  const outliers: Array<{
    respondent: string;
    criterion: string;
    cr: number;
  }> = [];
  
  responses.forEach((response, idx) => {
    const consistencies = response.consistencies || {};
    const respondentName = response.email || `Especialista ${idx + 1}`;
    
    Object.entries(consistencies).forEach(([criterion, data]: [string, any]) => {
      if (data?.cr > threshold) {
        outliers.push({
          respondent: respondentName,
          criterion,
          cr: data.cr
        });
      }
    });
  });
  
  return outliers.sort((a, b) => b.cr - a.cr);
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function QualityConsistency({
  project,
  calculation,
  responses,
  demographics = []
}: QualityConsistencyProps) {
  const [activeView, setActiveView] = useState<'table' | 'heatmap' | 'distribution'>('table');

  // Processar dados
  const heatmapData = useMemo(() => processResponsesForHeatmap(responses), [responses]);
  const crDistribution = useMemo(() => calculateCRDistribution(responses), [responses]);
  const outliers = useMemo(() => identifyOutliers(responses), [responses]);
  
  // Extrair grupos únicos
  const groups = useMemo(() => {
    const uniqueGroups = new Set(responses.map(r => 
      r.group || r.demographics?.cargo || 'Não especificado'
    ));
    return Array.from(uniqueGroups);
  }, [responses]);

  // Calcular estatísticas gerais
  const stats = useMemo(() => {
    const allCRs: number[] = [];
    responses.forEach(r => {
      const consistencies = r.consistencies || {};
      Object.values(consistencies).forEach((c: any) => {
        if (c?.cr !== undefined) allCRs.push(c.cr);
      });
    });

    const mean = allCRs.reduce((a, b) => a + b, 0) / allCRs.length;
    const sorted = [...allCRs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const max = Math.max(...allCRs);
    const outliersCount = allCRs.filter(cr => cr > 0.10).length;
    const okCount = allCRs.filter(cr => cr < 0.05).length;
    const warningCount = allCRs.filter(cr => cr >= 0.05 && cr < 0.10).length;

    return {
      total: allCRs.length,
      mean,
      median,
      max,
      outliersCount,
      okCount,
      warningCount,
      okPercent: (okCount / allCRs.length) * 100,
      warningPercent: (warningCount / allCRs.length) * 100,
      outliersPercent: (outliersCount / allCRs.length) * 100
    };
  }, [responses]);

  // Export função
  function exportOutliers() {
    const wsData = [
      ['Outliers (CR > 10%)'],
      [],
      ['Respondente', 'Critério', 'CR (%)'],
      ...outliers.map(o => [o.respondent, o.criterion, (o.cr * 100).toFixed(2)])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outliers');
    XLSX.writeFile(wb, `Outliers-${project.id}-${Date.now()}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com KPIs */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                ✓ Qualidade & Consistência
              </h2>
              <p className="text-gray-600 mt-1">
                Análise detalhada de consistência por respondente e critério
              </p>
            </div>

            {/* View selector */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveView('table')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'table'
                    ? 'bg-white text-indigo-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Tabela
              </button>
              <button
                onClick={() => setActiveView('heatmap')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'heatmap'
                    ? 'bg-white text-indigo-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔥 Heatmap
              </button>
              <button
                onClick={() => setActiveView('distribution')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'distribution'
                    ? 'bg-white text-indigo-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📈 Distribuição
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
              <div className="text-sm opacity-90">Total de CRs</div>
              <div className="text-3xl font-bold mt-1">{stats.total}</div>
              <div className="text-xs opacity-75 mt-1">
                {responses.length} especialistas
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="text-sm opacity-90">✅ Excelentes</div>
              <div className="text-3xl font-bold mt-1">{stats.okCount}</div>
              <div className="text-xs opacity-75 mt-1">
                {stats.okPercent.toFixed(1)}% (CR &lt; 5%)
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
              <div className="text-sm opacity-90">⚠️ Aceitáveis</div>
              <div className="text-3xl font-bold mt-1">{stats.warningCount}</div>
              <div className="text-xs opacity-75 mt-1">
                {stats.warningPercent.toFixed(1)}% (5-10%)
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
              <div className="text-sm opacity-90">❌ Outliers</div>
              <div className="text-3xl font-bold mt-1">{stats.outliersCount}</div>
              <div className="text-xs opacity-75 mt-1">
                {stats.outliersPercent.toFixed(1)}% (CR &gt; 10%)
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600">Média Geral</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">
                {(stats.mean * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Mediana: {(stats.median * 100).toFixed(2)}%
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600">CR Máximo</div>
              <div className="text-3xl font-bold text-red-600 mt-1">
                {(stats.max * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Pior caso identificado
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content área */}
      <div className="max-w-[1800px] mx-auto p-6">
        {/* View: Tabela CR */}
        {activeView === 'table' && (
          <div className="space-y-6 animate-fade-in">
            <CRTableExpanded 
              projectId={project.id}
              responses={responses}
              showAllColumns={true}
            />
          </div>
        )}

        {/* View: Heatmap */}
        {/* {activeView === 'heatmap' && (
          <div className="space-y-6 animate-fade-in">
            <CRHeatmap 
              data={heatmapData}
              groups={groups}
              showGroups={groups.length > 1}
            />
          </div>
        )} */}

        {/* View: Distribuição e Análise */}
        {activeView === 'distribution' && (
          <div className="space-y-6 animate-fade-in">
            {/* Distribuição de CR */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                📊 Distribuição de Consistency Ratio
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={crDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis label={{ value: 'Frequência', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => [
                      `${value} CRs (${((value / stats.total) * 100).toFixed(1)}%)`,
                      'Frequência'
                    ]}
                  />
                  <Bar dataKey="count" name="Frequência">
                    {crDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Interpretação:</strong> {stats.okPercent.toFixed(1)}% dos CRs estão em níveis excelentes (&lt; 5%). 
                  {stats.outliersCount > 0 && (
                    <> Identificados {stats.outliersCount} outliers que requerem atenção.</>
                  )}
                </p>
              </div>
            </div>

            {/* Outliers detalhados */}
            {outliers.length > 0 && (
              <div className="bg-white rounded-lg shadow border border-red-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Outliers Identificados (CR &gt; 10%)
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {outliers.length} caso{outliers.length !== 1 ? 's' : ''} requerem revisão
                    </p>
                  </div>
                  <button
                    onClick={exportOutliers}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-red-900">#</th>
                        <th className="px-4 py-2 text-left font-medium text-red-900">Respondente</th>
                        <th className="px-4 py-2 text-left font-medium text-red-900">Critério</th>
                        <th className="px-4 py-2 text-right font-medium text-red-900">CR</th>
                        <th className="px-4 py-2 text-center font-medium text-red-900">Gravidade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {outliers.slice(0, 20).map((outlier, idx) => (
                        <tr key={idx} className="hover:bg-red-50">
                          <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{outlier.respondent}</td>
                          <td className="px-4 py-3 text-gray-700">{outlier.criterion}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">
                            {(outlier.cr * 100).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            {outlier.cr > 0.15 ? (
                              <span className="badge-error">Crítico</span>
                            ) : (
                              <span className="badge-warning">Alto</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {outliers.length > 20 && (
                    <div className="text-center text-sm text-gray-500 mt-4">
                      Mostrando 20 de {outliers.length} outliers. Use exportar para ver todos.
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">📋 Recomendações:</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Revisar julgamentos dos respondentes identificados</li>
                    <li>• Considerar exclusão de outliers extremos (CR &gt; 15%)</li>
                    <li>• Realizar análise de sensibilidade sem outliers</li>
                    <li>• Documentar decisão metodológica na dissertação</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Análise por grupo */}
            {groups.length > 1 && (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Análise por Grupo de Especialistas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {groups.map(group => {
                    const groupResponses = responses.filter(r => 
                      (r.group || r.demographics?.cargo || 'Não especificado') === group
                    );
                    const groupCRs: number[] = [];
                    groupResponses.forEach(r => {
                      const consistencies = r.consistencies || {};
                      Object.values(consistencies).forEach((c: any) => {
                        if (c?.cr !== undefined) groupCRs.push(c.cr);
                      });
                    });
                    const groupMean = groupCRs.reduce((a, b) => a + b, 0) / groupCRs.length;
                    const groupOutliers = groupCRs.filter(cr => cr > 0.10).length;

                    return (
                      <div key={group} className="border border-gray-200 rounded-lg p-4">
                        <div className="font-semibold text-gray-900 mb-2">{group}</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Respondentes:</span>
                            <span className="font-medium">{groupResponses.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">CR Médio:</span>
                            <span className="font-medium">{(groupMean * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Outliers:</span>
                            <span className={`font-medium ${groupOutliers > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {groupOutliers}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Convergência do grupo */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Convergência do Grupo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Coeficiente de Variação</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {((Math.sqrt(stats.mean) / stats.mean) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {(Math.sqrt(stats.mean) / stats.mean) < 0.20 ? '✅ Alta convergência' : '⚠️ Convergência moderada'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">Consenso Geral</div>
                  <div className="text-3xl font-bold text-green-600">
                    {(stats.okPercent + stats.warningPercent).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    CRs dentro do aceitável
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">Qualidade Geral</div>
                  <div className="text-3xl font-bold text-indigo-600">
                    {stats.outliersPercent < 5 ? 'A' : stats.outliersPercent < 10 ? 'B' : 'C'}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.outliersPercent < 5 ? '✅ Excelente' : stats.outliersPercent < 10 ? '⚠️ Boa' : '❌ Requer atenção'}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-900">
                  <strong>Conclusão:</strong> {' '}
                  {stats.outliersPercent < 5 
                    ? 'O grupo apresenta excelente qualidade de julgamentos com alta convergência. Os resultados são confiáveis para tomada de decisão.'
                    : stats.outliersPercent < 10
                      ? 'O grupo apresenta boa qualidade geral, mas alguns julgamentos requerem revisão. Recomenda-se análise de sensibilidade.'
                      : 'O grupo apresenta várias inconsistências. Recomenda-se revisar julgamentos e considerar exclusão de outliers extremos.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
