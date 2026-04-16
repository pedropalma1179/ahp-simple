// app/decisor/resultados/[projectId]/components/ExportReports.tsx
/**
 * Aba 6: Exportar & Relatórios
 * 
 * Central de exports com:
 * - Excel completo (agregado)
 * - Excel por especialista
 * - CSVs individuais
 * - JSON estruturado
 * - Prévia dos dados
 */

'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportReportsProps {
  project: any;
  calculation: any;
  responses: any[];
}

export default function ExportReports({ project, calculation, responses }: ExportReportsProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  // Excel completo agregado
  function exportExcelComplete() {
    setExporting('excel-complete');
    
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: BOCR Weights
      const bocrData = [
        ['PESOS BOCR'],
        [],
        ['Mérito', 'Peso (%)'],
        ['Benefícios', ((calculation?.bocr_weights?.B || 0) * 100).toFixed(2)],
        ['Oportunidades', ((calculation?.bocr_weights?.O || 0) * 100).toFixed(2)],
        ['Custos', ((calculation?.bocr_weights?.C || 0) * 100).toFixed(2)],
        ['Riscos', ((calculation?.bocr_weights?.R || 0) * 100).toFixed(2)]
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(bocrData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Pesos BOCR');
      
      // Sheet 2: Subcritérios
      const subWeights = calculation?.sub_weights || {};
      const subData = [
        ['PESOS SUBCRITÉRIOS'],
        [],
        ['Código', 'Peso Local (%)', 'Peso Global (%)']
      ];
      
      ['B', 'O', 'C', 'R'].forEach(merit => {
        const meritWeight = calculation?.bocr_weights?.[merit] || 0;
        for (let i = 1; i <= 5; i++) {
          const code = `${merit}${i}`;
          const localWeight = subWeights[code] || 0;
          const globalWeight = localWeight * meritWeight;
          subData.push([
            code,
            (localWeight * 100).toFixed(2),
            (globalWeight * 100).toFixed(2)
          ]);
        }
      });
      const ws2 = XLSX.utils.aoa_to_sheet(subData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Subcritérios');
      
      // Sheet 3: Ranking
      const finalScores = calculation?.final_scores_normalized || {};
      const alternatives = Object.keys(finalScores);
      const rankData = [
        ['RANKING FINAL'],
        [],
        ['Posição', 'Alternativa', 'Score (%)']
      ];
      
      alternatives
        .sort((a, b) => finalScores[b] - finalScores[a])
        .forEach((alt, idx) => {
          rankData.push([
            (idx + 1).toString(),
            alt,
            (finalScores[alt] * 100).toFixed(2)
          ]);
        });
      const ws3 = XLSX.utils.aoa_to_sheet(rankData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Ranking');
      
      // Download
      XLSX.writeFile(wb, `AHP-BOCR-Completo-${project.id}-${Date.now()}.xlsx`);
      
    } finally {
      setExporting(null);
    }
  }

  // Excel por especialista
  function exportExcelByRespondent() {
    setExporting('excel-respondent');
    
    try {
      const wb = XLSX.utils.book_new();
      
      responses.forEach((response, idx) => {
        const name = response.email || `Especialista ${idx + 1}`;
        const consistencies = response.consistencies || {};
        
        const data = [
          [`CR - ${name}`],
          [],
          ['Critério', 'CR (%)']
        ];
        
        Object.entries(consistencies).forEach(([code, cons]: [string, any]) => {
          data.push([code, (cons.cr * 100).toFixed(2)]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        const sheetName = name.substring(0, 31); // Excel limit
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
      
      XLSX.writeFile(wb, `CR-Por-Especialista-${project.id}-${Date.now()}.xlsx`);
      
    } finally {
      setExporting(null);
    }
  }

  // CSV BOCR
  function exportCSV_BOCR() {
    setExporting('csv-bocr');
    
    try {
      const bocrWeights = calculation?.bocr_weights || {};
      const csv = [
        'Mérito,Peso',
        `Benefícios,${bocrWeights.B || 0}`,
        `Oportunidades,${bocrWeights.O || 0}`,
        `Custos,${bocrWeights.C || 0}`,
        `Riscos,${bocrWeights.R || 0}`
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BOCR-Weights-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
    } finally {
      setExporting(null);
    }
  }

  // JSON completo
  function exportJSON() {
    setExporting('json');
    
    try {
      const data = {
        project: {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt
        },
        calculation: {
          bocr_weights: calculation?.bocr_weights,
          sub_weights: calculation?.sub_weights,
          final_scores: calculation?.final_scores_normalized,
          magnitude_weights: calculation?.magnitude_weights
        },
        statistics: {
          total_respondents: responses.length,
          total_alternatives: Object.keys(calculation?.final_scores_normalized || {}).length
        }
      };
      
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AHP-BOCR-Data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
    } finally {
      setExporting(null);
    }
  }

  const exports = [
    {
      id: 'excel-complete',
      title: 'Excel Completo (Agregado)',
      description: 'Pesos BOCR, subcritérios e ranking em um único arquivo',
      icon: FileSpreadsheet,
      color: 'green',
      action: exportExcelComplete
    },
    {
      id: 'excel-respondent',
      title: 'Excel por Especialista',
      description: 'CR de cada especialista em abas separadas',
      icon: FileSpreadsheet,
      color: 'blue',
      action: exportExcelByRespondent
    },
    {
      id: 'csv-bocr',
      title: 'CSV - Pesos BOCR',
      description: 'Arquivo CSV simples com pesos BOCR',
      icon: FileText,
      color: 'purple',
      action: exportCSV_BOCR
    },
    {
      id: 'json',
      title: 'JSON Estruturado',
      description: 'Dados completos em formato JSON para integração',
      icon: FileJson,
      color: 'orange',
      action: exportJSON
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-[1400px] mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            📥 Exportar & Relatórios
          </h2>
          <p className="text-gray-600">
            Central de downloads e exportação de dados
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Stats resumidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total de Respondentes</div>
            <div className="text-2xl font-bold text-gray-900">{responses.length}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Alternativas Avaliadas</div>
            <div className="text-2xl font-bold text-gray-900">
              {Object.keys(calculation?.final_scores_normalized || {}).length}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Subcritérios</div>
            <div className="text-2xl font-bold text-gray-900">20</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Formatos Disponíveis</div>
            <div className="text-2xl font-bold text-gray-900">4</div>
          </div>
        </div>

        {/* Export cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exports.map((exp) => {
            const Icon = exp.icon;
            const isExporting = exporting === exp.id;
            
            return (
              <div 
                key={exp.id}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-lg ${
                    exp.color === 'green' ? 'bg-green-100' :
                    exp.color === 'blue' ? 'bg-blue-100' :
                    exp.color === 'purple' ? 'bg-purple-100' :
                    'bg-orange-100'
                  }`}>
                    <Icon className={`w-8 h-8 ${
                      exp.color === 'green' ? 'text-green-600' :
                      exp.color === 'blue' ? 'text-blue-600' :
                      exp.color === 'purple' ? 'text-purple-600' :
                      'text-orange-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {exp.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {exp.description}
                    </p>
                    
                    <button
                      onClick={exp.action}
                      disabled={isExporting}
                      className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                        exp.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                        exp.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                        exp.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
                        'bg-orange-600 hover:bg-orange-700'
                      } text-white disabled:opacity-50`}
                    >
                      {isExporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Exportando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Exportar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informações adicionais */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">
            ℹ️ Informações sobre os Exports
          </h3>
          
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Excel Completo:</strong> Recomendado para análise geral. 
                Contém 3 abas (BOCR, Subcritérios, Ranking) prontas para copiar na dissertação.
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Excel por Especialista:</strong> Útil para análise individual de CR. 
                Cada especialista tem sua própria aba.
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>CSV:</strong> Formato simples para importar em outras ferramentas 
                (SPSS, R, Python, etc).
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>JSON:</strong> Formato estruturado para integração com outros sistemas 
                ou análises programáticas.
              </div>
            </div>
          </div>
        </div>

        {/* Checklist para dissertação */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📋 Checklist para Dissertação
          </h3>
          
          <div className="space-y-2">
            {[
              'Exportar Excel Completo para Apêndice A',
              'Exportar screenshots dos gráficos Plotly (PNG alta resolução)',
              'Exportar hierarquia D3 (SVG vetorial)',
              'Exportar heatmap de CR (PNG 1600×1200)',
              'Documentar processo de exportação na metodologia',
              'Incluir legenda e fonte em todas as figuras',
              'Referenciar Plotly e D3.js na bibliografia'
            ].map((item, idx) => (
              <label key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" />
                <span className="text-sm text-gray-700">{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
