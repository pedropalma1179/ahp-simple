// components/CRTableExpanded.tsx
/**
 * Tabela Expandida de Consistency Ratio por Respondente
 * 
 * Versão acadêmica completa baseada em estrutura de artigos científicos
 * Similar à formatação de dissertações/teses
 * 
 * Features:
 * - Headers multi-nível (agrupados)
 * - Todas as colunas (BOCR, Magnitude, 20 subcritérios, alternativas)
 * - Nº de julgamentos por respondente
 * - Estatísticas completas (média, mediana, DP, CV, percentis)
 * - Export formatado para artigo (Excel pronto para Word/LaTeX)
 * - Scroll horizontal para muitas colunas
 * 
 * Baseado em: Saaty (1980, 2008), estrutura de tabelas acadêmicas
 */

'use client';

import { useState, useMemo } from 'react';
import { Download, AlertTriangle, CheckCircle, XCircle, ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import * as XLSX from 'xlsx';

// ============================================================
// TIPOS
// ============================================================

interface RespondentCRExpanded {
  id: string;
  name: string;
  email?: string;
  judgmentCount: number;        // Total de comparações feitas
  completionRate: number;       // % de completude
  
  // Critérios estratégicos
  bocr: number;
  magnitude: number;
  
  // Subcritérios detalhados (todos individuais)
  B1: number; B2: number; B3: number; B4: number; B5: number;
  O1: number; O2: number; O3: number; O4: number; O5: number;
  C1: number; C2: number; C3: number; C4: number; C5: number;
  R1: number; R2: number; R3: number; R4: number; R5: number;
  
  // Agregados por mérito
  BAgr: number; // CR médio de B1-B5
  OAgr: number; // CR médio de O1-O5
  CAgr: number; // CR médio de C1-C5
  RAgr: number; // CR médio de R1-R5
  
  // Alternativas
  altMediaCR: number;           // CR médio das alternativas
  altMaxCR: number;             // CR máximo das alternativas
  
  // Status e métricas
  status: 'OK' | 'WARNING' | 'HIGH';
  outlierCount: number;
  worstCriterion: string;       // Qual critério tem maior CR
  worstCR: number;              // Valor do pior CR
}

interface CRTableExpandedProps {
  projectId: string;
  responses: any[];
  showAllColumns?: boolean;     // Modo compacto vs expandido
}

// ============================================================
// CONSTANTES
// ============================================================

const CR_THRESHOLDS = {
  OK: 0.05,
  WARNING: 0.10,
  HIGH: Infinity
};

const SUBCRITERIA_LABELS = {
  B: ['B1', 'B2', 'B3', 'B4', 'B5'],
  O: ['O1', 'O2', 'O3', 'O4', 'O5'],
  C: ['C1', 'C2', 'C3', 'C4', 'C5'],
  R: ['R1', 'R2', 'R3', 'R4', 'R5']
};

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function getCRStatus(cr: number): 'OK' | 'WARNING' | 'HIGH' {
  if (cr < CR_THRESHOLDS.OK) return 'OK';
  if (cr < CR_THRESHOLDS.WARNING) return 'WARNING';
  return 'HIGH';
}

function getCRColor(cr: number): string {
  if (cr < CR_THRESHOLDS.OK) return 'text-green-600';
  if (cr < CR_THRESHOLDS.WARNING) return 'text-yellow-600';
  return 'text-red-600';
}

function getCRBgColor(cr: number): string {
  if (cr < CR_THRESHOLDS.OK) return 'bg-green-50';
  if (cr < CR_THRESHOLDS.WARNING) return 'bg-yellow-50';
  return 'bg-red-50';
}

function formatCR(cr: number): string {
  return `${(cr * 100).toFixed(2)}%`;
}

function calculateDetailedStats(values: number[]) {
  if (values.length === 0) return {
    mean: 0, median: 0, max: 0, min: 0,
    stdDev: 0, cv: 0, p95: 0, outliers: 0,
    ci95Lower: 0, ci95Upper: 0
  };
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  const max = Math.max(...values);
  const min = Math.min(...values);
  
  // Desvio padrão
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  // Coeficiente de variação
  const cv = mean !== 0 ? stdDev / mean : 0;
  
  // Percentil 95
  const p95Index = Math.ceil(0.95 * n) - 1;
  const p95 = sorted[p95Index];
  
  // Outliers (CR > 10%)
  const outliers = values.filter(v => v > CR_THRESHOLDS.WARNING).length;
  
  // Intervalo de confiança 95% (assumindo distribuição normal)
  const marginError = 1.96 * (stdDev / Math.sqrt(n));
  const ci95Lower = mean - marginError;
  const ci95Upper = mean + marginError;
  
  return {
    mean, median, max, min,
    stdDev, cv, p95, outliers,
    ci95Lower, ci95Upper
  };
}

// ============================================================
// PROCESSAR DADOS
// ============================================================

function processExpandedData(responses: any[]): RespondentCRExpanded[] {
  return responses.map((response, idx) => {
    const consistencies = response.consistencies || {};
    
    // Critérios estratégicos
    const bocrCR = consistencies.bocr?.cr || 0;
    const magnitudeCR = consistencies.magnitude?.cr || 0;
    
    // Subcritérios individuais
    const B1 = consistencies.B1?.cr || 0;
    const B2 = consistencies.B2?.cr || 0;
    const B3 = consistencies.B3?.cr || 0;
    const B4 = consistencies.B4?.cr || 0;
    const B5 = consistencies.B5?.cr || 0;
    
    const O1 = consistencies.O1?.cr || 0;
    const O2 = consistencies.O2?.cr || 0;
    const O3 = consistencies.O3?.cr || 0;
    const O4 = consistencies.O4?.cr || 0;
    const O5 = consistencies.O5?.cr || 0;
    
    const C1 = consistencies.C1?.cr || 0;
    const C2 = consistencies.C2?.cr || 0;
    const C3 = consistencies.C3?.cr || 0;
    const C4 = consistencies.C4?.cr || 0;
    const C5 = consistencies.C5?.cr || 0;
    
    const R1 = consistencies.R1?.cr || 0;
    const R2 = consistencies.R2?.cr || 0;
    const R3 = consistencies.R3?.cr || 0;
    const R4 = consistencies.R4?.cr || 0;
    const R5 = consistencies.R5?.cr || 0;
    
    // Agregados por mérito
    const BAgr = (B1 + B2 + B3 + B4 + B5) / 5;
    const OAgr = (O1 + O2 + O3 + O4 + O5) / 5;
    const CAgr = (C1 + C2 + C3 + C4 + C5) / 5;
    const RAgr = (R1 + R2 + R3 + R4 + R5) / 5;
    
    // Alternativas (médio de todos os subcritérios)
    const altCRs: number[] = [];
    Object.keys(consistencies).forEach(key => {
      if (key.match(/^(B|O|C|R)\d+_alt$/)) {
        altCRs.push(consistencies[key]?.cr || 0);
      }
    });
    const altMediaCR = altCRs.length > 0 
      ? altCRs.reduce((a, b) => a + b, 0) / altCRs.length 
      : 0;
    const altMaxCR = altCRs.length > 0 ? Math.max(...altCRs) : 0;
    
    // Todos os CRs
    const allCRs = [
      bocrCR, magnitudeCR,
      B1, B2, B3, B4, B5,
      O1, O2, O3, O4, O5,
      C1, C2, C3, C4, C5,
      R1, R2, R3, R4, R5,
      ...altCRs
    ];
    
    // Pior CR e critério
    const worstCR = Math.max(...allCRs);
    const worstIndex = allCRs.indexOf(worstCR);
    const criteriaNames = [
      'BOCR', 'Magnitude',
      'B1', 'B2', 'B3', 'B4', 'B5',
      'O1', 'O2', 'O3', 'O4', 'O5',
      'C1', 'C2', 'C3', 'C4', 'C5',
      'R1', 'R2', 'R3', 'R4', 'R5'
    ];
    const worstCriterion = criteriaNames[worstIndex] || 'Alternativas';
    
    // Outliers
    const outlierCount = allCRs.filter(cr => cr > CR_THRESHOLDS.WARNING).length;
    
    // Nº de julgamentos
    // 6 BOCR + 6 Magnitude + 5x4=20 subcritérios + 20x2=40 alternativas = 72 total
    const expectedJudgments = 72;
    const actualJudgments = response.judgmentCount || expectedJudgments;
    const completionRate = (actualJudgments / expectedJudgments) * 100;
    
    return {
      id: response.id || `resp-${idx + 1}`,
      name: response.email || `Especialista ${idx + 1}`,
      email: response.email,
      judgmentCount: actualJudgments,
      completionRate,
      
      bocr: bocrCR,
      magnitude: magnitudeCR,
      
      B1, B2, B3, B4, B5,
      O1, O2, O3, O4, O5,
      C1, C2, C3, C4, C5,
      R1, R2, R3, R4, R5,
      
      BAgr, OAgr, CAgr, RAgr,
      
      altMediaCR,
      altMaxCR,
      
      status: getCRStatus(worstCR),
      outlierCount,
      worstCriterion,
      worstCR
    };
  });
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function CRTableExpanded({ 
  projectId, 
  responses,
  showAllColumns = true 
}: CRTableExpandedProps) {
  const [isExpanded, setIsExpanded] = useState(showAllColumns);
  const [sortField, setSortField] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Processar dados
  const data = useMemo(() => processExpandedData(responses), [responses]);

  // Ordenar
  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [data, sortField, sortOrder]);

  // Estatísticas detalhadas
  const stats = useMemo(() => ({
    bocr: calculateDetailedStats(data.map(r => r.bocr)),
    magnitude: calculateDetailedStats(data.map(r => r.magnitude)),
    B1: calculateDetailedStats(data.map(r => r.B1)),
    B2: calculateDetailedStats(data.map(r => r.B2)),
    B3: calculateDetailedStats(data.map(r => r.B3)),
    B4: calculateDetailedStats(data.map(r => r.B4)),
    B5: calculateDetailedStats(data.map(r => r.B5)),
    BAgr: calculateDetailedStats(data.map(r => r.BAgr)),
    OAgr: calculateDetailedStats(data.map(r => r.OAgr)),
    CAgr: calculateDetailedStats(data.map(r => r.CAgr)),
    RAgr: calculateDetailedStats(data.map(r => r.RAgr)),
  }), [data]);

  // Export formatado para artigo
  function exportToArticleFormat() {
    const wb = XLSX.utils.book_new();
    
    // Criar sheet com headers formatados
    const wsData: any[][] = [];
    
    // Título
    wsData.push([`Tabela X – Consistency Ratio por Respondente e Critério`]);
    wsData.push([]);
    
    // Headers (3 níveis)
    wsData.push([
      'Respondente',
      'Nº Julg.',
      'Critérios Estratégicos BOCR', '', '', '', '', '', '', '',
      'Subcritérios por Mérito', '', '', '',
      'Alternativas', '',
      'Status'
    ]);
    
    wsData.push([
      '', '',
      'BOCR', 'Magnitude',
      'Benefícios (B)', '', '', '', '',
      'Oportunidades', 'Custos', 'Riscos',
      'Média Alt.', 'Máx Alt.',
      ''
    ]);
    
    wsData.push([
      '', '',
      '', '',
      'B1', 'B2', 'B3', 'B4', 'B5',
      'O (agr.)', 'C (agr.)', 'R (agr.)',
      '', '',
      ''
    ]);
    
    // Dados
    sortedData.forEach(r => {
      wsData.push([
        r.name,
        r.judgmentCount,
        formatCR(r.bocr),
        formatCR(r.magnitude),
        formatCR(r.B1),
        formatCR(r.B2),
        formatCR(r.B3),
        formatCR(r.B4),
        formatCR(r.B5),
        formatCR(r.OAgr),
        formatCR(r.CAgr),
        formatCR(r.RAgr),
        formatCR(r.altMediaCR),
        formatCR(r.altMaxCR),
        r.status === 'OK' ? '✅ OK' : r.status === 'WARNING' ? '⚠️ Alerta' : '❌ Alto'
      ]);
    });
    
    // Linha separadora
    wsData.push([]);
    wsData.push(['AGREGAÇÃO']);
    wsData.push([]);
    
    // Estatísticas
    wsData.push([
      'Média',
      Math.round(data.reduce((s, r) => s + r.judgmentCount, 0) / data.length),
      formatCR(stats.bocr.mean),
      formatCR(stats.magnitude.mean),
      formatCR(stats.B1.mean),
      formatCR(stats.B2.mean),
      formatCR(stats.B3.mean),
      formatCR(stats.B4.mean),
      formatCR(stats.B5.mean),
      formatCR(stats.OAgr.mean),
      formatCR(stats.CAgr.mean),
      formatCR(stats.RAgr.mean),
      '', '', ''
    ]);
    
    wsData.push([
      'Mediana',
      '',
      formatCR(stats.bocr.median),
      formatCR(stats.magnitude.median),
      formatCR(stats.B1.median),
      formatCR(stats.B2.median),
      formatCR(stats.B3.median),
      formatCR(stats.B4.median),
      formatCR(stats.B5.median),
      formatCR(stats.OAgr.median),
      formatCR(stats.CAgr.median),
      formatCR(stats.RAgr.median),
      '', '', ''
    ]);
    
    wsData.push([
      'Desvio Padrão',
      '',
      formatCR(stats.bocr.stdDev),
      formatCR(stats.magnitude.stdDev),
      formatCR(stats.B1.stdDev),
      formatCR(stats.B2.stdDev),
      formatCR(stats.B3.stdDev),
      formatCR(stats.B4.stdDev),
      formatCR(stats.B5.stdDev),
      formatCR(stats.OAgr.stdDev),
      formatCR(stats.CAgr.stdDev),
      formatCR(stats.RAgr.stdDev),
      '', '', ''
    ]);
    
    wsData.push([
      'Máximo',
      '',
      formatCR(stats.bocr.max),
      formatCR(stats.magnitude.max),
      formatCR(stats.B1.max),
      formatCR(stats.B2.max),
      formatCR(stats.B3.max),
      formatCR(stats.B4.max),
      formatCR(stats.B5.max),
      formatCR(stats.OAgr.max),
      formatCR(stats.CAgr.max),
      formatCR(stats.RAgr.max),
      '', '', ''
    ]);
    
    wsData.push([
      'Outliers (CR>10%)',
      '',
      stats.bocr.outliers,
      stats.magnitude.outliers,
      stats.B1.outliers,
      stats.B2.outliers,
      stats.B3.outliers,
      stats.B4.outliers,
      stats.B5.outliers,
      stats.OAgr.outliers,
      stats.CAgr.outliers,
      stats.RAgr.outliers,
      '', '',
      data.reduce((s, r) => s + r.outlierCount, 0) + ' total'
    ]);
    
    // Notas
    wsData.push([]);
    wsData.push(['Legenda: CR < 5% (✅ OK) | 5% ≤ CR < 10% (⚠️ Alerta) | CR ≥ 10% (❌ Alto)']);
    wsData.push(['Fonte: Elaborado pelo autor com base em Saaty (1980, 2008)']);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Formatação (larguras de coluna)
    ws['!cols'] = [
      { wch: 15 }, // Respondente
      { wch: 8 },  // Nº Julg
      { wch: 7 },  // BOCR
      { wch: 7 },  // Mag
      { wch: 7 },  // B1
      { wch: 7 },  // B2
      { wch: 7 },  // B3
      { wch: 7 },  // B4
      { wch: 7 },  // B5
      { wch: 7 },  // O
      { wch: 7 },  // C
      { wch: 7 },  // R
      { wch: 8 },  // Alt média
      { wch: 8 },  // Alt max
      { wch: 10 }  // Status
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'CR por Respondente');
    XLSX.writeFile(wb, `Tabela-CR-Respondentes-${projectId}-${Date.now()}.xlsx`);
  }

  // Handler sort
  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            📊 Tabela X – Consistency Ratio por Respondente e Critério
          </h3>
          <p className="text-gray-600">
            Análise detalhada de consistência individual (Saaty, 1980, 2008)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isExpanded ? 'Compactar' : 'Expandir'}
          </button>
          <button
            onClick={exportToArticleFormat}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Excel (Formato Artigo)
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              {/* Nível 1: Agrupamentos principais */}
              <tr className="border-b-2 border-gray-300">
                <th rowSpan={3} className="px-4 py-3 text-left font-medium text-gray-700 border-r border-gray-300">
                  Respondente
                </th>
                <th rowSpan={3} className="px-4 py-3 text-center font-medium text-gray-700 border-r border-gray-300">
                  Nº<br/>Julg.
                </th>
                <th colSpan={9} className="px-4 py-2 text-center font-medium text-gray-700 border-r border-gray-300">
                  Critérios Estratégicos BOCR
                </th>
                <th colSpan={3} className="px-4 py-2 text-center font-medium text-gray-700 border-r border-gray-300">
                  Subcritérios (Agregados)
                </th>
                <th colSpan={2} className="px-4 py-2 text-center font-medium text-gray-700 border-r border-gray-300">
                  Alternativas
                </th>
                <th rowSpan={3} className="px-4 py-3 text-center font-medium text-gray-700">
                  Status
                </th>
              </tr>
              
              {/* Nível 2: Méritos */}
              <tr className="border-b border-gray-200">
                <th rowSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-200">
                  BOCR
                </th>
                <th rowSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-300">
                  Mag.
                </th>
                <th colSpan={5} className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-300">
                  Benefícios (B)
                </th>
                <th rowSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-200">
                  Agr. O
                </th>
                <th rowSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-200">
                  Agr. C
                </th>
                <th rowSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-300">
                  Agr. R
                </th>
                <th rowSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-200">
                  Média
                </th>
                <th rowSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-300">
                  Máx.
                </th>
              </tr>
              
              {/* Nível 3: Subcritérios individuais */}
              <tr className="border-b-2 border-gray-300 bg-gray-100">
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-r border-gray-200">B1</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-r border-gray-200">B2</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-r border-gray-200">B3</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-r border-gray-200">B4</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-r border-gray-300">B5</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((r, idx) => (
                <tr 
                  key={r.id}
                  className={`hover:bg-gray-50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {r.name}
                    {r.completionRate < 100 && (
                      <span className="ml-2 text-xs text-orange-600">
                        ({r.completionRate.toFixed(0)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">
                    {r.judgmentCount}
                  </td>
                  
                  {/* BOCR */}
                  <td className={`px-2 py-3 text-xs text-center font-semibold ${getCRColor(r.bocr)}`}>
                    {formatCR(r.bocr)}
                  </td>
                  
                  {/* Magnitude */}
                  <td className={`px-2 py-3 text-xs text-center font-semibold ${getCRColor(r.magnitude)}`}>
                    {formatCR(r.magnitude)}
                  </td>
                  
                  {/* Benefícios */}
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.B1)}`}>
                    {formatCR(r.B1)}
                  </td>
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.B2)}`}>
                    {formatCR(r.B2)}
                  </td>
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.B3)}`}>
                    {formatCR(r.B3)}
                  </td>
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.B4)}`}>
                    {formatCR(r.B4)}
                  </td>
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.B5)}`}>
                    {formatCR(r.B5)}
                  </td>
                  
                  {/* Agregados */}
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.OAgr)}`}>
                    {formatCR(r.OAgr)}
                  </td>
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.CAgr)}`}>
                    {formatCR(r.CAgr)}
                  </td>
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.RAgr)}`}>
                    {formatCR(r.RAgr)}
                  </td>
                  
                  {/* Alternativas */}
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.altMediaCR)}`}>
                    {formatCR(r.altMediaCR)}
                  </td>
                  <td className={`px-2 py-3 text-xs text-center ${getCRColor(r.altMaxCR)}`}>
                    {formatCR(r.altMaxCR)}
                  </td>
                  
                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <div className={`text-xs font-medium ${
                      r.status === 'OK' ? 'text-green-700' :
                      r.status === 'WARNING' ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {r.status === 'OK' ? '✅ OK' :
                       r.status === 'WARNING' ? '⚠️ Alerta' :
                       '❌ Alto'}
                    </div>
                    {r.outlierCount > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        {r.outlierCount} outliers
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            
            {/* Footer com estatísticas */}
            <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-semibold text-xs">
              <tr>
                <td colSpan={17} className="px-4 py-2 text-gray-700 font-bold">
                  AGREGAÇÃO
                </td>
              </tr>
              
              <tr>
                <td className="px-4 py-2 text-gray-700">Média</td>
                <td className="px-4 py-2 text-center text-gray-700">
                  {Math.round(data.reduce((s, r) => s + r.judgmentCount, 0) / data.length)}
                </td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.bocr.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.magnitude.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B1.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B2.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B3.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B4.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B5.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.OAgr.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.CAgr.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.RAgr.mean)}</td>
                <td className="px-2 py-2 text-center text-gray-700">-</td>
                <td className="px-2 py-2 text-center text-gray-700">-</td>
                <td className="px-4 py-2 text-center text-gray-700">-</td>
              </tr>
              
              <tr>
                <td className="px-4 py-2 text-gray-700">Mediana</td>
                <td className="px-4 py-2 text-center text-gray-700">-</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.bocr.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.magnitude.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B1.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B2.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B3.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B4.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B5.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.OAgr.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.CAgr.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.RAgr.median)}</td>
                <td className="px-2 py-2 text-center text-gray-700">-</td>
                <td className="px-2 py-2 text-center text-gray-700">-</td>
                <td className="px-4 py-2 text-center text-gray-700">-</td>
              </tr>
              
              <tr>
                <td className="px-4 py-2 text-gray-700">Desvio Padrão</td>
                <td className="px-4 py-2 text-center text-gray-700">-</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.bocr.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.magnitude.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B1.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B2.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B3.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B4.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.B5.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.OAgr.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.CAgr.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">{formatCR(stats.RAgr.stdDev)}</td>
                <td className="px-2 py-2 text-center text-gray-700">-</td>
                <td className="px-2 py-2 text-center text-gray-700">-</td>
                <td className="px-4 py-2 text-center text-gray-700">-</td>
              </tr>
              
              <tr className="text-red-700">
                <td className="px-4 py-2">Máximo</td>
                <td className="px-4 py-2 text-center">-</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.bocr.max)}</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.magnitude.max)}</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.B1.max)}</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.B2.max)}</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.B3.max)}</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.B4.max)}</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.B5.max)}</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.OAgr.max)}</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.CAgr.max)}</td>
                <td className="px-2 py-2 text-center">{formatCR(stats.RAgr.max)}</td>
                <td className="px-2 py-2 text-center">-</td>
                <td className="px-2 py-2 text-center">-</td>
                <td className="px-4 py-2 text-center">-</td>
              </tr>
              
              <tr className="text-orange-700">
                <td className="px-4 py-2">Outliers (CR&gt;10%)</td>
                <td className="px-4 py-2 text-center">-</td>
                <td className="px-2 py-2 text-center">{stats.bocr.outliers}</td>
                <td className="px-2 py-2 text-center">{stats.magnitude.outliers}</td>
                <td className="px-2 py-2 text-center">{stats.B1.outliers}</td>
                <td className="px-2 py-2 text-center">{stats.B2.outliers}</td>
                <td className="px-2 py-2 text-center">{stats.B3.outliers}</td>
                <td className="px-2 py-2 text-center">{stats.B4.outliers}</td>
                <td className="px-2 py-2 text-center">{stats.B5.outliers}</td>
                <td className="px-2 py-2 text-center">{stats.OAgr.outliers}</td>
                <td className="px-2 py-2 text-center">{stats.CAgr.outliers}</td>
                <td className="px-2 py-2 text-center">{stats.RAgr.outliers}</td>
                <td className="px-2 py-2 text-center">-</td>
                <td className="px-2 py-2 text-center">-</td>
                <td className="px-4 py-2 text-center font-bold">
                  {data.reduce((s, r) => s + r.outlierCount, 0)} total
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legenda e notas */}
      <div className="text-sm text-gray-600 space-y-2">
        <p>
          <strong>Legenda:</strong> CR &lt; 5% (✅ OK) | 5% ≤ CR &lt; 10% (⚠️ Alerta) | CR ≥ 10% (❌ Alto)
        </p>
        <p>
          <strong>Fonte:</strong> Elaborado pelo autor com base em Saaty (1980, 2008)
        </p>
        <p>
          <strong>Nota:</strong> Agr. = Agregado (média dos subcritérios do mérito); 
          Alt. = CR das matrizes de alternativas por subcritério
        </p>
      </div>
    </div>
  );
}
