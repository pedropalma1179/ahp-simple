// components/CRTable.tsx
// Tabela de Consistência Individual dos Especialistas
// v3.0 - CORRIGIDO: Proteção contra undefined + Extrai CRs do simulador v5

'use client';

import React, { useState, useMemo } from 'react';

interface QualityData {
  id: string;
  name?: string;
  cr: number;
  status: 'CONFIÁVEL' | 'REVISAR' | 'SUSPEITO' | 'CRÍTICO';
  overallScore: number;
  isSimulated?: boolean;
  metrics?: {
    avgCR?: number;
    crBOCR?: number;
    crB?: number | null;
    crO?: number | null;
    crC?: number | null;
    crR?: number | null;
    crBenefits?: number | null;
    crOpportunities?: number | null;
    crCosts?: number | null;
    crRisks?: number | null;
  };
  flags?: string[];
  demographic?: {
    cargo?: string;
    departamento?: string;
    experiencia?: string;
    nome?: string;
  };
}

interface CRTableProps {
  responses: any[];
  qualityData?: QualityData[];
  highlightThreshold?: number;
  groupBy?: 'none' | 'status' | 'cargo' | 'departamento';
  showSubcriteria?: boolean;
}

// Thresholds de CR conforme Saaty (1980)
const CR_THRESHOLDS = {
  EXCELLENT: 0.05,
  ACCEPTABLE: 0.10,
  MARGINAL: 0.15,
  SUSPECT: 0.20,
};

// Função para classificar CR
function getCRClassification(cr: number): {
  label: string;
  color: string;
  bgColor: string;
  status: string;
} {
  if (cr <= CR_THRESHOLDS.EXCELLENT) {
    return { label: 'Excelente', color: 'text-green-700', bgColor: 'bg-green-100', status: '✓' };
  }
  if (cr <= CR_THRESHOLDS.ACCEPTABLE) {
    return { label: 'Aceitável', color: 'text-green-600', bgColor: 'bg-green-50', status: '✓' };
  }
  if (cr <= CR_THRESHOLDS.MARGINAL) {
    return { label: 'Marginal', color: 'text-yellow-600', bgColor: 'bg-yellow-50', status: '⚠' };
  }
  if (cr <= CR_THRESHOLDS.SUSPECT) {
    return { label: 'Suspeito', color: 'text-orange-600', bgColor: 'bg-orange-50', status: '⚠' };
  }
  return { label: 'Crítico', color: 'text-red-600', bgColor: 'bg-red-50', status: '✕' };
}

// Função para calcular score baseado em CR
function calculateScore(cr: number, flags: string[] = []): number {
  let score: number;
  
  if (cr <= CR_THRESHOLDS.EXCELLENT) {
    score = 100;
  } else if (cr <= CR_THRESHOLDS.ACCEPTABLE) {
    score = Math.round(95 - ((cr - CR_THRESHOLDS.EXCELLENT) / (CR_THRESHOLDS.ACCEPTABLE - CR_THRESHOLDS.EXCELLENT)) * 7);
  } else if (cr <= CR_THRESHOLDS.MARGINAL) {
    score = Math.round(87 - ((cr - CR_THRESHOLDS.ACCEPTABLE) / (CR_THRESHOLDS.MARGINAL - CR_THRESHOLDS.ACCEPTABLE)) * 17);
  } else if (cr <= CR_THRESHOLDS.SUSPECT) {
    score = Math.round(69 - ((cr - CR_THRESHOLDS.MARGINAL) / (CR_THRESHOLDS.SUSPECT - CR_THRESHOLDS.MARGINAL)) * 19);
  } else {
    score = Math.max(0, Math.round(49 - (cr - CR_THRESHOLDS.SUSPECT) * 100));
  }
  
  // Penalização por outros problemas
  const otherProblems = (flags || []).filter(f => f !== 'CR_ALTO').length;
  return Math.max(0, score - (otherProblems * 3));
}

// Função para classificar status baseado em CR
function getStatusFromCR(cr: number): 'CONFIÁVEL' | 'REVISAR' | 'SUSPEITO' | 'CRÍTICO' {
  if (cr <= CR_THRESHOLDS.ACCEPTABLE) return 'CONFIÁVEL';
  if (cr <= CR_THRESHOLDS.MARGINAL) return 'REVISAR';
  if (cr <= CR_THRESHOLDS.SUSPECT) return 'SUSPEITO';
  return 'CRÍTICO';
}

// ⭐ NOVO: Extrair CRs diretamente de uma response (formato simulador v5)
function extractCRsFromResponse(response: any): {
  avgCR: number;
  crBOCR: number;
  crB: number | null;
  crO: number | null;
  crC: number | null;
  crR: number | null;
} {
  // Formato v5: response.responses.bocrConsistency
  if (response?.responses?.bocrConsistency) {
    const bocr = response.responses.bocrConsistency.cr || 0;
    const sub = response.responses.subConsistency || {};
    
    const crB = sub.B?.cr ?? null;
    const crO = sub.O?.cr ?? null;
    const crC = sub.C?.cr ?? null;
    const crR = sub.R?.cr ?? null;
    
    const avgCR = response.responses.avgCR ?? bocr;
    
    return { avgCR, crBOCR: bocr, crB, crO, crC, crR };
  }
  
  // Formato legado
  if (response?.bocrConsistency) {
    const bocr = response.bocrConsistency.cr || 0;
    const sub = response.subConsistency || {};
    
    return {
      avgCR: bocr,
      crBOCR: bocr,
      crB: sub.B?.cr ?? null,
      crO: sub.O?.cr ?? null,
      crC: sub.C?.cr ?? null,
      crR: sub.R?.cr ?? null,
    };
  }
  
  // Fallback
  return { avgCR: 0, crBOCR: 0, crB: null, crO: null, crC: null, crR: null };
}

// ⭐ NOVO: Função segura para obter ID truncado
function safeGetDisplayId(id: any): string {
  if (!id) return 'N/A';
  const strId = String(id);
  if (strId.length <= 12) return strId;
  return `${strId.slice(0, 10)}...`;
}

export default function CRTable({
  responses,
  qualityData,
  highlightThreshold = 0.10,
  groupBy = 'none',
  showSubcriteria = true,
}: CRTableProps) {
  const [sortField, setSortField] = useState<'cr' | 'score' | 'name'>('cr');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<'all' | 'consistent' | 'review' | 'critical'>('all');
  
  // ⭐ CORRIGIDO: Processar dados com fallback para responses diretamente
  const processedData = useMemo(() => {
    // Se temos qualityData válido, usar ele
    if (qualityData && Array.isArray(qualityData) && qualityData.length > 0) {
      return qualityData.map((q, idx) => {
        const cr = q.cr || q.metrics?.avgCR || 0;
        const correctStatus = getStatusFromCR(cr);
        const correctScore = calculateScore(cr, q.flags);
        const safeId = q.id || `resp_${idx}`;
        
        return {
          ...q,
          id: safeId,
          cr,
          status: correctStatus,
          overallScore: correctScore,
          metrics: {
            avgCR: cr,
            crBOCR: q.metrics?.crBOCR || 0,
            crB: q.metrics?.crB ?? q.metrics?.crBenefits ?? null,
            crO: q.metrics?.crO ?? q.metrics?.crOpportunities ?? null,
            crC: q.metrics?.crC ?? q.metrics?.crCosts ?? null,
            crR: q.metrics?.crR ?? q.metrics?.crRisks ?? null,
          }
        };
      });
    }
    
    // ⭐ FALLBACK: Extrair CRs diretamente das responses (simulador v5)
    if (responses && Array.isArray(responses) && responses.length > 0) {
      return responses.map((r, idx) => {
        const safeId = r.respondentId || r.visitorId || r.id || `resp_${idx}`;
        const crs = extractCRsFromResponse(r);
        const correctStatus = getStatusFromCR(crs.avgCR);
        const correctScore = calculateScore(crs.avgCR, []);
        
        return {
          id: safeId,
          name: undefined,
          cr: crs.avgCR,
          status: correctStatus,
          overallScore: correctScore,
          isSimulated: r.isSimulated || false,
          metrics: crs,
          flags: [],
        };
      });
    }
    
    return [];
  }, [qualityData, responses]);
  
  // Filtrar dados
  const filteredData = useMemo(() => {
    let data = [...processedData];
    
    if (filter === 'consistent') {
      data = data.filter(d => d.cr <= highlightThreshold);
    } else if (filter === 'review') {
      data = data.filter(d => d.cr > highlightThreshold && d.cr <= 0.20);
    } else if (filter === 'critical') {
      data = data.filter(d => d.cr > 0.20);
    }
    
    // Ordenar
    data.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'cr') {
        comparison = a.cr - b.cr;
      } else if (sortField === 'score') {
        comparison = b.overallScore - a.overallScore;
      } else if (sortField === 'name') {
        const nameA = a.name || String(a.id || '');
        const nameB = b.name || String(b.id || '');
        comparison = nameA.localeCompare(nameB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return data;
  }, [processedData, filter, sortField, sortOrder, highlightThreshold]);
  
  // Estatísticas
  const stats = useMemo(() => {
    if (processedData.length === 0) {
      return { total: 0, consistent: 0, marginal: 0, suspect: 0, critical: 0, avgCR: 0, minCR: 0, maxCR: 0 };
    }
    
    const total = processedData.length;
    const consistent = processedData.filter(q => q.cr <= CR_THRESHOLDS.ACCEPTABLE).length;
    const marginal = processedData.filter(q => q.cr > CR_THRESHOLDS.ACCEPTABLE && q.cr <= CR_THRESHOLDS.MARGINAL).length;
    const suspect = processedData.filter(q => q.cr > CR_THRESHOLDS.MARGINAL && q.cr <= CR_THRESHOLDS.SUSPECT).length;
    const critical = processedData.filter(q => q.cr > CR_THRESHOLDS.SUSPECT).length;
    
    const avgCR = processedData.reduce((sum, q) => sum + q.cr, 0) / total;
    const allCRs = processedData.map(q => q.cr);
    const minCR = Math.min(...allCRs);
    const maxCR = Math.max(...allCRs);
    
    return { total, consistent, marginal, suspect, critical, avgCR, minCR, maxCR };
  }, [processedData]);
  
  const handleSort = (field: 'cr' | 'score' | 'name') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  // Renderizar célula de CR
  const renderCRCell = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">—</span>;
    }
    const classification = getCRClassification(value);
    return (
      <span className={`font-mono ${classification.color}`}>
        {(value * 100).toFixed(2)}%
      </span>
    );
  };
  
  // Se não há dados
  if (processedData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800">Nenhum dado disponível para análise de CR.</p>
        <p className="text-sm text-yellow-600 mt-2">Execute uma simulação ou aguarde respostas reais.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-100 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
          <p className="text-xs text-slate-500">respondentes</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
          <p className="text-2xl font-bold text-green-600">{stats.consistent}</p>
          <p className="text-xs text-green-600">CR ≤ 10%</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
          <p className="text-2xl font-bold text-yellow-600">{stats.marginal}</p>
          <p className="text-xs text-yellow-600">10% &lt; CR ≤ 15%</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
          <p className="text-2xl font-bold text-orange-600">{stats.suspect}</p>
          <p className="text-xs text-orange-600">15% &lt; CR ≤ 20%</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          <p className="text-xs text-red-600">CR &gt; 20%</p>
        </div>
      </div>
      
      {/* CR Médio */}
      <div className={`p-3 rounded-lg border ${
        stats.avgCR <= 0.10 ? 'bg-green-50 border-green-300' :
        stats.avgCR <= 0.20 ? 'bg-yellow-50 border-yellow-300' :
        'bg-red-50 border-red-300'
      }`}>
        <span className="text-sm">CR Médio Individual:</span>
        <span className={`font-bold ml-2 ${
          stats.avgCR <= 0.10 ? 'text-green-700' :
          stats.avgCR <= 0.20 ? 'text-yellow-700' :
          'text-red-700'
        }`}>
          {(stats.avgCR * 100).toFixed(2)}%
        </span>
        <span className="text-xs text-gray-500 ml-2">
          Min: {(stats.minCR * 100).toFixed(2)}% | Max: {(stats.maxCR * 100).toFixed(2)}%
        </span>
      </div>
      
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">Filtrar:</span>
        {[
          { key: 'all', label: `Todos (${stats.total})` },
          { key: 'consistent', label: `✓ Consistentes (${stats.consistent})` },
          { key: 'review', label: `⚠ Revisar (${stats.marginal + stats.suspect})` },
          { key: 'critical', label: `✕ Críticos (${stats.critical})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      
      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-gray-600">#</th>
              <th className="px-3 py-2 text-left text-gray-600">Respondente</th>
              <th 
                className="px-3 py-2 text-center text-gray-600 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cr')}
              >
                CR Médio {sortField === 'cr' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              {showSubcriteria && (
                <>
                  <th className="px-3 py-2 text-center text-gray-600">CR B</th>
                  <th className="px-3 py-2 text-center text-gray-600">CR O</th>
                  <th className="px-3 py-2 text-center text-gray-600">CR C</th>
                  <th className="px-3 py-2 text-center text-gray-600">CR R</th>
                </>
              )}
              <th 
                className="px-3 py-2 text-center text-gray-600 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('score')}
              >
                Score {sortField === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2 text-center text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((r, idx) => {
              const classification = getCRClassification(r.cr);
              return (
                <tr 
                  key={r.id || idx} 
                  className={`border-t ${classification.bgColor} hover:bg-opacity-75`}
                >
                  <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {r.isSimulated && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded">SIM</span>
                      )}
                      <span className="font-mono text-xs">
                        {/* ⭐ CORRIGIDO: Usar função segura para evitar erro de undefined */}
                        {r.name || safeGetDisplayId(r.id)}
                      </span>
                    </div>
                  </td>
                  <td className={`px-3 py-2 text-center font-mono font-medium ${classification.color}`}>
                    {(r.cr * 100).toFixed(2)}%
                  </td>
                  {showSubcriteria && (
                    <>
                      <td className="px-3 py-2 text-center">{renderCRCell(r.metrics?.crB)}</td>
                      <td className="px-3 py-2 text-center">{renderCRCell(r.metrics?.crO)}</td>
                      <td className="px-3 py-2 text-center">{renderCRCell(r.metrics?.crC)}</td>
                      <td className="px-3 py-2 text-center">{renderCRCell(r.metrics?.crR)}</td>
                    </>
                  )}
                  <td className="px-3 py-2 text-center font-bold">{r.overallScore}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      r.status === 'CONFIÁVEL' ? 'bg-green-100 text-green-800' :
                      r.status === 'REVISAR' ? 'bg-yellow-100 text-yellow-800' :
                      r.status === 'SUSPEITO' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {classification.status} {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td colSpan={showSubcriteria ? 7 : 3} className="px-3 py-2 font-medium text-gray-700">
                MÉDIA GERAL (n={stats.total})
              </td>
              <td className={`px-3 py-2 text-center font-bold ${
                stats.avgCR <= 0.10 ? 'text-green-600' :
                stats.avgCR <= 0.20 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {(stats.avgCR * 100).toFixed(2)}%
              </td>
              <td colSpan={2} className={`px-3 py-2 text-center font-medium ${
                stats.avgCR <= 0.10 ? 'text-green-600' :
                stats.avgCR <= 0.20 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {stats.avgCR <= 0.10 ? '✓ Aceitável' :
                 stats.avgCR <= 0.20 ? '⚠ Revisar' :
                 '✕ Crítico'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-4">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500"></span>
          ✓ ≤5% Excelente
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-400"></span>
          ✓ ≤10% Aceitável
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-400"></span>
          ⚠ ≤15% Marginal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-400"></span>
          ⚠ ≤20% Suspeito
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500"></span>
          ✕ &gt;20% Crítico
        </span>
      </div>
      
      <p className="text-xs text-gray-500">
        <strong>Referências:</strong><br/>
        • SAATY (1980). The Analytic Hierarchy Process. McGraw-Hill.<br/>
        • CR ≤ 10% para n ≥ 5; CR ≤ 8% para n = 4; CR ≤ 5% para n = 3
      </p>
    </div>
  );
}
