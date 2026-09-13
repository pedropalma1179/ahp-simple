// app/decisor/resultados/[projectId]/page.tsx
// Página de Resultados AHP-BOCR com Visualizações Científicas
// Baseado em: Wijnmalen (2007), Demirtas & Üstün (2008), Lee (2009)
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { BOCR_CRITERIA, SUBCRITERIA } from '@/lib/data';
import * as XLSX from 'xlsx';
import { toPng, toJpeg } from 'html-to-image';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Base de conhecimento teórico BOCR
import {
  SYNTHESIS_METHODS,
  LITERATURE_DIVERGENCES,
  WEIGHT_TYPES,
  QUALITY_THRESHOLDS,
  MERIT_LABELS,
  interpretConsistencyRatio,
  interpretSensitivity,
  interpretMethodAgreement,
  interpretDominanceGap,
  generateExecutiveSummary
} from '@/lib/knowledge';

// Componente híbrido para Revisão IA (resolve problema de alucinação numérica)
// Valores numéricos do SISTEMA + análise qualitativa da IA
import ParecerAISection from '@/components/ParecerAISection';
import ExternalValidation from '@/components/ExternalValidation';
import BiasAnalysisCard from '@/components/BiasAnalysisCard';

// Componentes Q1/A1
import BOCRPrioritiesTable from '@/components/BOCRPrioritiesTable';
import MethodComparisonTable from '@/components/MethodComparisonTable';
import SensitivityAnalysisPanel from '@/components/SensitivityAnalysisPanel';
import NegativePriorityAlert from '@/components/NegativePriorityAlert';

// Charts ECharts - Enterprise Grade
import {
  BOCRSunburstChart,
  BOCRWaterfallChart,
  ConsistencyGaugeChart,
  BOCRRadarChart
} from '@/components/charts';
import BentoGridDashboard from '@/components/BentoGridDashboard';
import BOCRConsistencyMatrix from '@/components/BOCRConsistencyMatrix';
import { calculateRespondentWeights } from '@/lib/respondent-weights';
import type { JudgmentItem as IPCJudgment } from '@/lib/types';
import { randomIndex } from '@/lib/ahp-engine';

// As seis matrizes não triviais do respondente, na ordem da Tabela 22 do
// Apêndice G. As vinte matrizes de alternativas são 2x2 e têm CR zero por
// construção; ficam fora. Ver docs/referencia-cr-individuais.md §1.
// Coexiste com recalcularCRBocrIndividual, que serve aos seis consumidores
// dentro de exportCSV e exportXLSX. Migrar esses consumidores é pendência do
// Bloco C.1, quando as tabelas de exportação vierem para a tela.
const MATRIZES_CR = ['BOCR', 'MAGNITUDE', 'SUB-B', 'SUB-O', 'SUB-C', 'SUB-R'] as const;
type MatrizCR = typeof MATRIZES_CR[number];

interface CRsIndividuais {
  crs: Record<MatrizCR, number | null>;
  governante: number;
  matrizGovernante: MatrizCR;
  n: number;
}

function calcularCRsIndividuais(
  judgments: IPCJudgment[] | undefined,
  alternativeCodes: string[]
): CRsIndividuais | null {
  if (!judgments || !Array.isArray(judgments) || judgments.length === 0) return null;
  if (!alternativeCodes || alternativeCodes.length === 0) return null;

  try {
    const result = calculateRespondentWeights(judgments, alternativeCodes);

    // CR indefinido é null, nunca zero: zero num CR significa consistência
    // perfeita, e usá-lo como marcador de ausência é erro de leitura.
    const bruto: Record<MatrizCR, unknown> = {
      'BOCR': result.bocrWeights?.cr,
      'MAGNITUDE': result.magnitudeWeights?.cr,
      'SUB-B': result.subWeights?.B?.cr,
      'SUB-O': result.subWeights?.O?.cr,
      'SUB-C': result.subWeights?.C?.cr,
      'SUB-R': result.subWeights?.R?.cr,
    };

    const crs = {} as Record<MatrizCR, number | null>;
    for (const m of MATRIZES_CR) {
      const v = bruto[m];
      crs[m] = typeof v === 'number' && !isNaN(v) ? v : null;
    }

    const definidos = MATRIZES_CR.filter(m => crs[m] !== null);
    if (definidos.length === 0) return null;

    // Governante: máximo sobre as matrizes com CR definido. Derivado aqui, e
    // conferível contra `result.maxCR`, que aplica a mesma regra sobre as mesmas
    // seis matrizes em `lib/respondent-weights.ts`.
    let matrizGovernante = definidos[0];
    for (const m of definidos) {
      if ((crs[m] as number) > (crs[matrizGovernante] as number)) matrizGovernante = m;
    }

    return {
      crs,
      governante: crs[matrizGovernante] as number,
      matrizGovernante,
      n: definidos.length,
    };
  } catch (e) {
    console.error('[calcularCRsIndividuais] Falha:', e);
    return null;
  }
}

function recalcularCRBocrIndividual(
  judgments: IPCJudgment[] | undefined,
  alternativeCodes: string[]
): { crBocr: number; avgCR: number } | null {
  if (!judgments || !Array.isArray(judgments) || judgments.length === 0) return null;
  if (!alternativeCodes || alternativeCodes.length === 0) return null;

  try {
    const result = calculateRespondentWeights(judgments, alternativeCodes);

    const crBocr = result.bocrWeights.cr;
    // Nome mantido: é o CR governante, e o campo persistido se chama avgCR.
    const avgCR = result.maxCR;

    if (isNaN(crBocr) || isNaN(avgCR)) return null;

    return { crBocr, avgCR };
  } catch (e) {
    console.error('[recalcularCRBocrIndividual] Falha:', e);
    return null;
  }
}

// Force reload

// ============================================================
// TIPOS - ATUALIZADO PARA v5.0 Q1/A1
// ============================================================

interface Project {
  id: string;
  name: string;
  description?: string;
  alternatives: Array<{
    code: string;
    name: string;
    description?: string;
  }>;
  sensitiveGroups?: {
    attribute: string;
    discriminated: string[];
    privileged: string[];
  };
  status: string;
}

// Interface BOCR Priorities [Lee 2009a]
interface BOCRPriority {
  code: string;
  name: string;
  B: number;
  O: number;
  C: number;
  R: number;
  C_reciprocal: number;
  R_reciprocal: number;
}

// Interface de Concordância entre Métodos [Lee 2009, Alizadeh 2020]
interface MethodConcordance {
  totalMethods: number;
  agreeMethods: number;
  agreementPercent: number;
  consensusWinner: string | null;
  divergentMethods: string[];
  rankingsByMethod: Record<string, string[]>;
  robustnessLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
  robustnessLabel: string;
}

// Interface de Análise de Sensibilidade [Alizadeh 2020]
import { SensitivityItem } from '@/components/SensitivityAnalysisPanel';

interface SensitivityAnalysisItem extends SensitivityItem {
  // Campos herdados de SensitivityItem:
  // merit, meritName, inflectionPoint, currentWeight?

  // Campos específicos da página:
  currentWinner: string;
  newWinner: string | null;
}

// Interface de Alternativa com Prioridade Negativa [Lee 2009a]
interface NegativeAlternative {
  code: string;
  name: string;
  score: number;
  message: string;
}

// Interface de Alertas Q1/A1
interface Q1Alerts {
  hasNegativePriorities: boolean;
  negativeAlternatives: NegativeAlternative[];
  lowConcordance: boolean;
}

// Interface Principal de Resultado - ATUALIZADA v5.0
interface CalculationResult {
  // Campos existentes
  bocrWeights: number[];
  bocrConsistency: { cr: number; lambda: number; ci: number };
  rescalingWeights?: { sb: number; so: number; sc: number; sr: number };
  magnitudeConsistency?: { cr: number; lambda: number; ci: number };
  subWeights: Record<string, number[]>;
  subConsistency: Record<string, { cr: number; lambda: number }>;
  altScores: Record<string, Record<string, number>>;
  altMeritScores?: { code: string; name: string; B: number; O: number; C: number; R: number }[];
  finalScores: any[];
  ranking?: { position: number; code: string; name: string }[];
  sensitivityInflections: Record<string, number | null>;
  responseCount: number;

  // === NOVOS CAMPOS v5.0 Q1/A1 ===

  // Tabela BOCR Priorities [Lee 2009a Table 6]
  bocrPrioritiesTable?: BOCRPriority[];

  // Análise de Concordância [Lee 2009, Alizadeh 2020]
  methodConcordance?: MethodConcordance;

  // Análise de Sensibilidade com Classificação [Alizadeh 2020]
  sensitivityAnalysis?: SensitivityAnalysisItem[];

  // Alertas Q1/A1
  alerts?: Q1Alerts;

  // Metadados
  metadata?: {
    projectName: string;
    alternativesCount: number;
    methodsCount: number;
    primaryMethod: string;
    version: string;
    q1Features?: string[];
    references?: Record<string, string>;
    excludedRespondentIds?: string[]; // Adicionado para persistência
    /** Recusadas pelo portão de completude (A.21). Vazio é o valor esperado. */
    rejectedIncomplete?: { respondentId: string; matrizes: string[] }[];
  };
}

// ============================================================
// FUNÇÃO AUXILIAR: Calcular valores BOCR por alternativa
// ============================================================

function calculateAltBOCR(
  altCode: string,
  altScores: Record<string, Record<string, number>>,
  subWeights: Record<string, number[]>,
  bocrWeights: number[]
): { B: number; O: number; C: number; R: number } {
  const merits = ['B', 'O', 'C', 'R'];
  const result = { B: 0, O: 0, C: 0, R: 0 };

  merits.forEach((merit, idx) => {
    const subScores = altScores[merit];
    const weights = subWeights[merit];
    const meritWeight = bocrWeights[idx] || 0;

    if (subScores && weights && subScores[altCode] !== undefined) {
      // Se temos scores por subcritério
      const subKeys = Object.keys(subScores).filter(k => k.startsWith(altCode.replace(/[0-9]/g, '')));
      if (subKeys.length > 0) {
        let weightedSum = 0;
        weights.forEach((w, i) => {
          const subCode = `${merit}${i + 1}`;
          const score = altScores[subCode]?.[altCode] || 0;
          weightedSum += w * score;
        });
        result[merit as keyof typeof result] = weightedSum * meritWeight;
      } else {
        // Score agregado por mérito
        result[merit as keyof typeof result] = (subScores[altCode] || 0) * meritWeight;
      }
    }
  });

  return result;
}

// ============================================================
// COMPONENTE: ChartDownloadWrapper
// Envoltório com botão de download para exportar gráficos como PNG/JPEG
// ============================================================

function ChartDownloadWrapper({
  children,
  filename,
  title
}: {
  children: React.ReactNode;
  filename: string;
  title?: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [showFormat, setShowFormat] = useState(false);

  const handleDownload = async (format: 'png' | 'jpeg') => {
    if (!chartRef.current) return;
    setDownloading(true);
    setShowFormat(false);
    try {
      const scale = 3;
      const options = {
        cacheBust: true,
        pixelRatio: scale,
        backgroundColor: '#ffffff',
      };

      let dataUrl: string;
      let extension: string;

      if (format === 'jpeg') {
        dataUrl = await toJpeg(chartRef.current, { ...options, quality: 0.95 });
        extension = 'jpg';
      } else {
        dataUrl = await toPng(chartRef.current, options);
        extension = 'png';
      }

      const link = document.createElement('a');
      link.download = `${filename}.${extension}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar gráfico:', err);
    }
    setDownloading(false);
  };

  return (
    <div className="relative group">
      <div ref={chartRef} className="bg-white p-4 rounded-lg">
        {title && (
          <p className="text-sm font-semibold text-gray-700 mb-2 text-center">{title}</p>
        )}
        {children}
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {showFormat ? (
          <div className="flex gap-1 bg-white rounded-lg shadow-lg border p-1">
            <button
              onClick={() => handleDownload('png')}
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
              disabled={downloading}
            >
              PNG
            </button>
            <button
              onClick={() => handleDownload('jpeg')}
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
              disabled={downloading}
            >
              JPEG
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowFormat(true)}
            className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow border border-gray-200 text-gray-500 hover:text-gray-700 transition-all"
            title="Baixar gráfico"
            disabled={downloading}
          >
            {downloading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: BOCRPieChart
// Gráfico de Pizza com Labels Matemáticos e Hover Sincronizado
// ============================================================

interface BOCRPieChartProps {
  bocrWeights: number[];
}

const BOCRPieChart: React.FC<BOCRPieChartProps> = ({ bocrWeights }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const labels = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
  const colors = ['#22c55e', '#3b82f6', '#f97316', '#ef4444'];
  const bgColors = ['bg-green-500', 'bg-blue-500', 'bg-orange-500', 'bg-red-500'];
  const hoverBgColors = ['bg-green-100', 'bg-blue-100', 'bg-orange-100', 'bg-red-100'];

  // Configuração do SVG otimizada para menos whitespace
  const viewBoxSize = 200;
  const center = viewBoxSize / 2;
  const radius = 85; // Raio grande para ocupar mais espaço
  const labelRadius = 55; // Raio para posicionar labels dentro da fatia

  // Calcula os dados do arco para cada fatia
  const calculateSliceData = () => {
    let cumulative = 0;
    return bocrWeights.map((weight, idx) => {
      const startAngle = cumulative * 360 - 90; // -90 para começar do topo
      const endAngle = (cumulative + weight) * 360 - 90;
      const midAngle = (startAngle + endAngle) / 2;
      cumulative += weight;

      // Coordenadas do arco
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const midRad = (midAngle * Math.PI) / 180;

      const startX = center + radius * Math.cos(startRad);
      const startY = center + radius * Math.sin(startRad);
      const endX = center + radius * Math.cos(endRad);
      const endY = center + radius * Math.sin(endRad);

      // Centróide da fatia para posicionar o label
      const labelX = center + labelRadius * Math.cos(midRad);
      const labelY = center + labelRadius * Math.sin(midRad);

      const largeArc = weight > 0.5 ? 1 : 0;

      return {
        idx,
        weight,
        startX,
        startY,
        endX,
        endY,
        labelX,
        labelY,
        largeArc,
        color: colors[idx],
        label: labels[idx],
        percentage: ((weight || 0) * 100).toFixed(1),
      };
    });
  };

  const slices = calculateSliceData();

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Vetor de Prioridades Estratégicas (BOCR)
      </h3>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* Tabela com Hover */}
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Mérito</th>
                <th className="px-4 py-2 text-right">Peso (w)</th>
                <th className="px-4 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((label, idx) => (
                <tr
                  key={idx}
                  className={`border-b cursor-pointer transition-all duration-200 ${hoveredIndex === idx
                    ? `${hoverBgColors[idx]} font-semibold`
                    : hoveredIndex !== null
                      ? 'opacity-50'
                      : ''
                    }`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-sm ${bgColors[idx]}`}></div>
                      {label}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {(bocrWeights[idx] || 0).toFixed(4)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {((bocrWeights[idx] || 0) * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right">1.0000</td>
                <td className="px-4 py-2 text-right">100.00%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Gráfico de Pizza SVG Otimizado */}
        <div className="flex items-center justify-center">
          <svg
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            className="w-64 h-64"
            style={{ maxWidth: '280px', maxHeight: '280px' }}
          >
            {/* Fatias do gráfico */}
            {slices.map((slice) => (
              <path
                key={slice.idx}
                d={`M ${center} ${center} L ${slice.startX} ${slice.startY} A ${radius} ${radius} 0 ${slice.largeArc} 1 ${slice.endX} ${slice.endY} Z`}
                fill={slice.color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-200"
                style={{
                  opacity: hoveredIndex === null ? 1 : hoveredIndex === slice.idx ? 1 : 0.4,
                  transform: hoveredIndex === slice.idx ? 'scale(1.03)' : 'scale(1)',
                  transformOrigin: 'center',
                }}
                onMouseEnter={() => setHoveredIndex(slice.idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}

            {/* Labels posicionados no centróide de cada fatia */}
            {slices.map((slice) => {
              // Só mostra label se a fatia for grande o suficiente
              if (slice.weight < 0.08) return null;

              return (
                <g
                  key={`label-${slice.idx}`}
                  className="pointer-events-none"
                  style={{
                    opacity: hoveredIndex === null ? 1 : hoveredIndex === slice.idx ? 1 : 0.4,
                  }}
                >
                  <text
                    x={slice.labelX}
                    y={slice.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-bold"
                    fill="white"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {slice.percentage}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legenda Interativa */}
      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {labels.map((label, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-all duration-200 ${hoveredIndex === idx
              ? `${hoverBgColors[idx]} ring-2 ring-offset-1`
              : hoveredIndex !== null
                ? 'opacity-50'
                : 'hover:bg-gray-100'
              }`}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={`w-4 h-4 rounded ${bgColors[idx]}`}></div>
            <span className="text-sm">
              {label}: {((bocrWeights[idx] || 0) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ResultadosPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [audit, setAudit] = useState<any>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [biasAnalysis, setBiasAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Configuração de Disparate Impact (Dodevska et al., 2023)
  // Opcional — o pesquisador define atributo sensível e agrupamento
  const [sensitiveGroups, setSensitiveGroups] = useState<{
    attribute: string;
    discriminated: string[];
    privileged: string[];
  } | null>(null);

  // Implementação de aba persistente via URL hash
  const validTabs = ['executive', 'results', 'quality', 'robustness', 'review', 'export'] as const;
  type TabId = typeof validTabs[number];

  const getInitialTab = (): TabId => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if ((validTabs as readonly string[]).includes(hash)) {
        return hash as TabId;
      }
    }
    return 'executive';
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // Estados para texto acadêmico

  // Estado para dados demográficos dos respondentes
  const [respondentsDemographics, setRespondentsDemographics] = useState<any[]>([]);

  // Mapa respondentId → email
  const [respondentEmails, setRespondentEmails] = useState<Record<string, string>>({});

  // Estado para exclusão de respondentes
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [selectedForExclusion, setSelectedForExclusion] = useState<string[]>([]);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const [demographicView, setDemographicView] = useState<'dashboard' | 'table'>('dashboard');

  // Estados para análise de qualidade das respostas
  const [qualityAnalysis, setQualityAnalysis] = useState<any>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [projectResponses, setProjectResponses] = useState<any[]>([]);

  // Dados formatados para o Dashboard Demográfico
  const demographicDashboardData = useMemo(() => {
    if (respondentsDemographics.length === 0) return null;

    const total = respondentsDemographics.length;

    // Mapear valores para labels amigáveis
    const mapAge = (val: string) => {
      const map: Record<string, string> = {
        'menos_30': '< 30 anos',
        '31_40': '31-40 anos',
        '41_50': '41-50 anos',
        'mais_50': '> 50 anos'
      };
      return map[val] || val;
    };

    const mapEducation = (val: string) => {
      const map: Record<string, string> = {
        'superior': 'Graduação',
        'especializacao': 'Espec./MBA',
        'mestrado': 'Mestrado',
        'doutorado': 'Doutorado+'
      };
      return map[val] || val;
    };

    const mapExperience = (val: string) => {
      const map: Record<string, string> = {
        'menos_10': '< 10 anos',
        '11_20': '11-20 anos',
        '21_30': '21-30 anos',
        'mais_30': '> 30 anos'
      };
      return map[val] || val;
    };

    const mapRole = (val: string) => {
      const map: Record<string, string> = {
        'c_level': 'C-Level',
        'diretor': 'Diretor',
        'gerente': 'Gerente',
        'supervisor': 'Supervisor',
        'analista': 'Analista/Eng'
      };
      return map[val] || val;
    };

    const mapArea = (val: string) => {
      const map: Record<string, string> = {
        'producao': 'Produção',
        'eng_processos': 'Eng. Processos',
        'financas': 'Finanças',
        'qualidade': 'Qualidade',
        'manutencao': 'Manutenção',
        'logistica': 'Logística',
        'ti': 'TI'
      };
      return map[val] || val;
    };

    // Contar por categoria
    const countBy = (field: string, mapper?: (v: string) => string) => {
      const counts: Record<string, number> = {};
      respondentsDemographics.forEach(d => {
        const val = d[field];
        if (val) {
          const label = mapper ? mapper(val) : val;
          counts[label] = (counts[label] || 0) + 1;
        }
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    };

    return {
      total,
      age: countBy('idade', mapAge),
      gender: [
        { name: 'Masculino', value: respondentsDemographics.filter(d => d.genero === 'masculino').length },
        { name: 'Feminino', value: respondentsDemographics.filter(d => d.genero === 'feminino').length }
      ].filter(d => d.value > 0),
      education: countBy('formacao', mapEducation),
      experience: countBy('tempoTrabalho', mapExperience),
      role: countBy('funcao', mapRole),
      area: countBy('areaAtuacao', mapArea)
    };
  }, [respondentsDemographics]);
  // Dados formatados para o componente de filtro de qualidade
  // Unifica dados de qualityAnalysis.respondents + processedRespondents + excludedIds
  // FILTRO DEFENSIVO: apenas respondentes com response finalizada (completedAt) em projectResponses
  // Formata CR para exibição. Corrige o sinal de -0,00 originado do último bit
  // de um double em matriz perfeitamente consistente (R12/SUB-B). É clamp de
  // EXIBIÇÃO. Não introduzir clamp no motor: ver docs/referencia-cr-individuais.md §6.
  const fmtCR = (v: number | null | undefined): string => {
    const p = (v || 0) * 100;
    return (Math.abs(p) < 0.005 ? 0 : p).toFixed(2);
  };

  const getRespondentsList = useMemo(() => {
    const validResponseIds = new Set(
      projectResponses.map((r: any) => r.respondentId || r.visitorId || r.id || '').filter(Boolean)
    );

    // Recálculo no display: CR por respondente sempre a partir dos julgamentos,
    // via o mesmo helper da exportação. Fonte única; o valor gravado é só fallback.
    const altCodes = (project?.alternatives || []).map((a: any) => a.code);
    const judgmentsById = new Map<string, any>();
    projectResponses.forEach((r: any) => {
      const id = r.respondentId || r.visitorId || r.id || '';
      if (id) judgmentsById.set(id, r.judgments);
    });
    const calcCRs = (id: string): CRsIndividuais | null =>
      calcularCRsIndividuais(judgmentsById.get(id) as IPCJudgment[], altCodes);

    const qaRespondents = qualityAnalysis?.respondents || [];

    if (qaRespondents.length === 0 && projectResponses.length > 0) {
      return projectResponses.map((r: any) => {
        const respondentId = r.visitorId || r.respondentId || r.id || '';
        const c = calcCRs(respondentId);
        return { respondentId, crs: c?.crs ?? null, cr: c?.governante ?? null, matrizGov: c?.matrizGovernante ?? null };
      });
    }

    const filteredQaRespondents = qaRespondents.filter((r: any) => {
      const rid = r.respondentId || r.id || r.visitorId || '';
      return validResponseIds.has(rid);
    });

    return filteredQaRespondents.map((r: any) => {
      const respondentId = r.respondentId || r.id || r.visitorId || '';
      const c = calcCRs(respondentId);
      return { respondentId, crs: c?.crs ?? null, cr: c?.governante ?? null, matrizGov: c?.matrizGovernante ?? null };
    });
  }, [qualityAnalysis, projectResponses, project]);

  // ============================================================
  // Gerar dados de trajetória para gráficos de sensibilidade
  // Simula variação de pesos (0-100%) para cada mérito BOCR
  // Ref: Alizadeh et al. (2020) Section 5.7, Figures 6-7
  // ============================================================
  const sensitivityTrajectories = useMemo(() => {
    if (!calculation?.finalScores || calculation.finalScores.length === 0 || !calculation.bocrWeights) {
      return undefined;
    }

    const merits = ['B', 'O', 'C', 'R'];
    const weights = calculation.bocrWeights; // [b, o, c, r] normalized
    const alts = calculation.finalScores;

    // Verificar se alternativas têm scores por mérito
    if (!alts[0]?.B && alts[0]?.B !== 0) {
      return undefined;
    }

    const trajectories: Record<string, Array<{
      weight: number;
      scores: Record<string, number>;
      winner: string;
      inflection: boolean;
    }>> = {};

    // Rescaling weights (magnitude) — FIXOS durante variação de pesos pessoais
    // Ref: Wijnmalen (2007) p.899 — magnitude comparisons for commensurability
    const rwObj = calculation.rescalingWeights;
    let rw: number[];
    if (Array.isArray(rwObj)) {
      rw = [rwObj[0] || 1, rwObj[1] || 1, rwObj[2] || 1, rwObj[3] || 1];
    } else if (rwObj && typeof rwObj === 'object') {
      // @ts-ignore
      rw = [rwObj.sb || 1, rwObj.so || 1, rwObj.sc || 1, rwObj.sr || 1];
    } else {
      rw = [1, 1, 1, 1];
    }

    // DEBUG — executa 1 vez só (fora dos loops)
    const debugRw = (() => {
      const rwObj = calculation.rescalingWeights;
      if (Array.isArray(rwObj)) return [rwObj[0] || 1, rwObj[1] || 1, rwObj[2] || 1, rwObj[3] || 1];
      if (rwObj && typeof rwObj === 'object') return [(rwObj as any).sb || 1, (rwObj as any).so || 1, (rwObj as any).sc || 1, (rwObj as any).sr || 1];
      return [1, 1, 1, 1];
    })();
    console.log('📊 [SENSITIVITY] rescalingWeights raw:', calculation.rescalingWeights);
    console.log('📊 [SENSITIVITY] rw resolved:', debugRw);
    console.log('📊 [SENSITIVITY] alts[0] B/O/C/R:', alts[0]?.B, alts[0]?.O, alts[0]?.C, alts[0]?.R);

    merits.forEach((merit, meritIdx) => {
      const points: typeof trajectories[string] = [];
      let prevWinner = '';

      // Simular de 0% a 100% em passos de 2%
      for (let pct = 0; pct <= 100; pct += 2) {
        const variedWeight = pct / 100;

        // Redistribuir peso restante proporcionalmente entre outros méritos
        const remaining = 1 - variedWeight;
        const otherWeightsSum = weights.reduce((sum, w, i) => i !== meritIdx ? sum + w : sum, 0);

        const adjustedWeights = weights.map((w, i) => {
          if (i === meritIdx) return variedWeight;
          if (otherWeightsSum === 0) return remaining / 3;
          return (w / otherWeightsSum) * remaining;
        });

        // Calcular score subtrativo para cada alternativa
        const scores: Record<string, number> = {};
        let maxScore = -Infinity;
        let winnerName = '';

        alts.forEach((alt: any) => {
          const name = alt.name || alt.code || 'Alt';
          const meritScores = [alt.B || 0, alt.O || 0, alt.C || 0, alt.R || 0];

          // Subtrativo com rescaling: v_b·s_b·B + v_o·s_o·O - v_c·s_c·C - v_r·s_r·R
          // Wijnmalen (2007) Eq.17 completa
          const score = adjustedWeights[0] * rw[0] * meritScores[0]
            + adjustedWeights[1] * rw[1] * meritScores[1]
            - adjustedWeights[2] * rw[2] * meritScores[2]
            - adjustedWeights[3] * rw[3] * meritScores[3];

          if (pct === 0 && meritIdx === 0) {
            console.log('📊 [SENSITIVITY] First calculation:', {
              adjustedWeights,
              rw,
              meritScores,
              score
            });
          }

          scores[name] = score;
          if (score > maxScore) {
            maxScore = score;
            winnerName = name;
          }
        });

        const isInflection = prevWinner !== '' && winnerName !== prevWinner;
        points.push({ weight: pct, scores, winner: winnerName, inflection: isInflection });
        prevWinner = winnerName;
      }

      trajectories[merit] = points;
    });

    return trajectories;
  }, [calculation?.finalScores, calculation?.bocrWeights, calculation?.rescalingWeights]);


  // Função para executar revisão profunda com IA
  const runAiReview = async () => {
    console.log('🚀 [AI-REVIEW] Função chamada!');
    console.log('🔍 [AI-REVIEW] calculation:', !!calculation, 'project:', !!project, 'qualityAnalysis:', !!qualityAnalysis);

    if (!calculation || !project) {
      console.error('❌ [AI-REVIEW] Abortando - dados faltando');
      return;
    }

    setAiReviewLoading(true);
    setAiReview(null);
    setBiasAnalysis(null);

    try {
      // ============================================================
      // CORREÇÃO v6.5: Garantir análise de qualidade antes da revisão IA
      // ============================================================
      let currentQualityAnalysis = qualityAnalysis;

      // Se não há análise de qualidade, executar agora
      if (!currentQualityAnalysis && projectResponses.length > 0) {
        console.log('⚠️ [AI-REVIEW] Análise de qualidade não disponível, executando agora...');
        try {
          const qualityResponse = await fetch('/api/response-quality', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              responses: projectResponses,
              includeSimulated: true
            })
          });

          const qualityData = await qualityResponse.json();

          if (qualityData.success) {
            currentQualityAnalysis = qualityData.analysis;
            setQualityAnalysis(currentQualityAnalysis);
            console.log('✅ [AI-REVIEW] Análise de qualidade executada:', currentQualityAnalysis.statistics);
          } else {
            console.error('❌ [AI-REVIEW] Erro na análise de qualidade:', qualityData.error);
          }
        } catch (qualityError) {
          console.error('❌ [AI-REVIEW] Falha ao executar análise de qualidade:', qualityError);
        }
      }

      console.log('📤 [AI-REVIEW] Preparando payload...');
      console.log('📤 [AI-REVIEW] qualityAnalysis.respondents count:', currentQualityAnalysis?.respondents?.length || 0);

      // ------------------------------------------------------------
      // CORREÇÃO: FILTRAR RESPONDENTES EXCLUÍDOS ANTES DO CÁLCULO
      // ------------------------------------------------------------
      const activeRespondents = currentQualityAnalysis?.respondents
        ? currentQualityAnalysis.respondents.filter((r: any) => {
          const id = r.respondentId || r.id || r.visitorId || '';
          return !excludedIds.includes(id);
        })
        : [];

      const activeProjectResponses = projectResponses.filter((r: any) => {
        const id = r.respondentId || r.id || r.visitorId || '';
        return !excludedIds.includes(id);
      });
      // ------------------------------------------------------------

      console.log('📤 [AI-REVIEW] activeRespondents count:', activeRespondents.length);
      console.log('📤 [AI-REVIEW] activeProjectResponses count:', activeProjectResponses.length);

      // ------------------------------------------------------------
      // CORREÇÃO CRÍTICA: CÁLCULO DE QUALIDADE ROBUSTO
      // ------------------------------------------------------------
      let individualStats = { valid: 0, warning: 0, critical: 0, total: 0, avgCR: 0 };

      // Tentar usar dados da análise de qualidade primeiro
      if (activeRespondents.length > 0) {
        console.log('📊 [AI-REVIEW] Usando dados de qualityAnalysis:', activeRespondents.length, 'respondentes ativos (de', currentQualityAnalysis?.respondents?.length || 0, 'total)');

        let totalCR = 0;
        individualStats = activeRespondents.reduce((acc: any, r: any) => {
          // 1. Tenta encontrar o CR em qualquer lugar possível
          let crValue = 0;

          if (typeof r.cr === 'number') crValue = r.cr;
          else if (r.metrics && typeof r.metrics.avgCR === 'number') crValue = r.metrics.avgCR;
          else if (r.consistency && typeof r.consistency.cr === 'number') crValue = r.consistency.cr;
          else if (typeof r.cr_mean === 'number') crValue = r.cr_mean;

          totalCR += crValue;

          // 2. Classificação Agressiva (Mesma régua do Menu Qualidade)
          const isExplicitlyBad = r.status === 'SUSPEITO' || r.status === 'CRÍTICO';
          const isMathematicallyBad = crValue > 0.20; // CR > 20% = CRÍTICO
          const isMathematicallySuspect = crValue > 0.10; // CR > 10% = SUSPEITO

          if (isExplicitlyBad || isMathematicallyBad) {
            acc.critical++;
            console.log(`⚠️ [QUALITY] Respondente CRÍTICO: ${r.id || r.visitorId || 'N/A'} (CR: ${(crValue * 100).toFixed(1)}%, Status: ${r.status || 'N/A'})`);
          } else if (isMathematicallySuspect) {
            acc.warning++;
            console.log(`🔸 [QUALITY] Respondente SUSPEITO: ${r.id || r.visitorId || 'N/A'} (CR: ${(crValue * 100).toFixed(1)}%)`);
          } else {
            acc.valid++;
          }

          acc.total++;
          return acc;
        }, { valid: 0, warning: 0, critical: 0, total: 0 });

        individualStats.avgCR = individualStats.total > 0 ? totalCR / individualStats.total : 0;

      } else if (activeProjectResponses.length > 0) {
        // Fallback: calcular CR diretamente das respostas
        console.log('📊 [AI-REVIEW] Fallback: calculando CR de', activeProjectResponses.length, 'respostas ativas');

        let totalCR = 0;
        let validCount = 0;
        let warningCount = 0;
        let criticalCount = 0;

        activeProjectResponses.forEach((response: any) => {
          // Tentar extrair CR de várias estruturas possíveis
          let cr = 0;

          // Estrutura 1: response.consistency.cr
          if (response.consistency?.cr !== undefined) {
            cr = response.consistency.cr;
          }
          // Estrutura 2: response.cr
          else if (response.cr !== undefined) {
            cr = response.cr;
          }
          // Estrutura 3: response.metrics?.avgCR
          else if (response.metrics?.avgCR !== undefined) {
            cr = response.metrics.avgCR;
          }
          // Estrutura 4: Calcular média dos CRs de cada matriz
          else if (response.bocrJudgments || response.subJudgments) {
            // Se tem dados brutos, não conseguimos calcular sem mais processamento
            // Assumir como válido se não há CR explícito
            validCount++;
            return;
          }

          totalCR += cr;

          // Classificar respondente
          if (cr > 0.20) {
            criticalCount++;
            console.log(`❌ [QUALITY] Resposta CRÍTICA: CR = ${(cr * 100).toFixed(1)}%`);
          } else if (cr > 0.10) {
            warningCount++;
            console.log(`⚠️ [QUALITY] Resposta SUSPEITA: CR = ${(cr * 100).toFixed(1)}%`);
          } else {
            validCount++;
          }
        });

        // Se não conseguimos extrair CR de nenhuma resposta, usar CR global
        if (validCount + warningCount + criticalCount === 0) {
          console.log('📊 [AI-REVIEW] Sem CR individual, usando CR global do projeto');
          const globalCR = calculation.bocrConsistency?.cr || 0;

          if (globalCR <= 0.10) {
            // CR global excelente = assumir todas respostas válidas
            validCount = activeProjectResponses.length;
            console.log(`✅ [QUALITY] CR global ${(globalCR * 100).toFixed(2)}% - todas respostas consideradas válidas`);
          } else if (globalCR <= 0.20) {
            // CR global aceitável = assumir maioria válida
            validCount = Math.floor(activeProjectResponses.length * 0.7);
            warningCount = activeProjectResponses.length - validCount;
          } else {
            // CR global ruim = assumir maioria problemática
            validCount = Math.floor(activeProjectResponses.length * 0.4);
            warningCount = Math.floor(activeProjectResponses.length * 0.3);
            criticalCount = activeProjectResponses.length - validCount - warningCount;
          }
        }

        individualStats = {
          valid: validCount,
          warning: warningCount,
          critical: criticalCount,
          total: activeProjectResponses.length,
          avgCR: activeProjectResponses.length > 0 ? totalCR / activeProjectResponses.length : 0
        };

        console.log(`📊 [AI-REVIEW] Qualidade calculada: ${validCount}✅ ${warningCount}⚠️ ${criticalCount}❌ de ${activeProjectResponses.length} respostas`);
      }

      console.log('📉 [AI-REVIEW] RESUMO DE QUALIDADE:', individualStats);

      // Calcular % de problemáticos
      const badRatio = individualStats.total > 0
        ? (individualStats.warning + individualStats.critical) / individualStats.total
        : 0;

      if (badRatio >= 0.3) {
        console.warn(`🚨 [AI-REVIEW] ALERTA: ${(badRatio * 100).toFixed(0)}% dos respondentes são problemáticos! Quality Gate será ativado.`);
      } else if (badRatio >= 0.2) {
        console.warn(`⚠️ [AI-REVIEW] ATENÇÃO: ${(badRatio * 100).toFixed(0)}% dos respondentes requerem revisão.`);
      }
      // ------------------------------------------------------------

      // ============================================================
      // CONSTRUIR RESPONDENTES PARA ANÁLISE DE VIÉS
      // Garante que o bias-detection.ts sempre recebe dados individuais
      // ============================================================
      let biasRespondents: any[] = [];

      if (activeRespondents.length > 0) {
        // Usar respondentes da análise de qualidade (já processados)
        biasRespondents = activeRespondents.map((r: any) => ({
          ...r,
          cr: typeof r.cr === 'number' ? r.cr
            : (r.metrics?.avgCR ?? r.consistency?.cr ?? r.cr_mean ?? 0),
          isSimulated: r.isSimulated === true, // Strict boolean
        }));
        console.log(`📊 [AI-REVIEW] Bias: ${biasRespondents.length} respondentes de qualityAnalysis`);
      } else if (activeProjectResponses.length > 0) {
        // Fallback: construir respondentes a partir das respostas brutas do Firestore
        biasRespondents = activeProjectResponses.map((response: any, idx: number) => {
          let cr = 0;
          if (response.consistency?.cr !== undefined) cr = response.consistency.cr;
          else if (response.cr !== undefined) cr = response.cr;
          else if (response.metrics?.avgCR !== undefined) cr = response.metrics.avgCR;

          let status = 'CONFIÁVEL';
          if (cr > 0.20) status = 'CRÍTICO';
          else if (cr > 0.10) status = 'SUSPEITO';

          return {
            id: response.visitorId || response.id || `resp-${idx + 1}`,
            name: response.respondentName || response.name || `Respondente ${idx + 1}`,
            cr: cr,
            status: status,
            isSimulated: response.isSimulated === true,
            metrics: { avgCR: cr },
          };
        });
        console.log(`📊 [AI-REVIEW] Bias: ${biasRespondents.length} respondentes de projectResponses (fallback)`);
      }

      // Preparar payload
      const payload = {
        projectName: project.name || 'Projeto sem nome',
        projectDescription: project.description || '',
        alternatives: project.alternatives || [],
        bocrWeights: calculation.bocrWeights || [],
        // ANTI-ALUCINAÇÃO: pesos pessoais (v) e rescaling weights (s) para fórmula Wijnmalen (2007, Eq. 17)
        // O backend (normalizeBOCRWeights) aceita ambos os formatos: array [b,o,c,r] ou objeto {sb,so,sc,sr}
        personalWeights: Array.isArray(calculation.bocrWeights) && calculation.bocrWeights.length >= 4
          ? {
            Benefits: calculation.bocrWeights[0],
            Opportunities: calculation.bocrWeights[1],
            Costs: calculation.bocrWeights[2],
            Risks: calculation.bocrWeights[3],
          }
          : undefined,
        rescalingWeights: calculation.rescalingWeights
          ? {
            // @ts-ignore
            Benefits: calculation.rescalingWeights.sb,
            // @ts-ignore
            Opportunities: calculation.rescalingWeights.so,
            // @ts-ignore
            Costs: calculation.rescalingWeights.sc,
            // @ts-ignore
            Risks: calculation.rescalingWeights.sr,
          }
          : undefined,
        bocrConsistency: calculation.bocrConsistency || { cr: 0, lambda: 0 },
        subWeights: calculation.subWeights || {},
        subConsistency: calculation.subConsistency || {},
        finalScores: calculation.finalScores || [],
        responseCount: calculation.responseCount || activeProjectResponses.length || 0,
        sensitivityInflections: calculation.sensitivityInflections || {},
        // CORREÇÃO v6.5: Enviar qualityAnalysis COMPLETO (com statistics.byStatus)
        qualityAnalysis: currentQualityAnalysis ? {
          respondents: biasRespondents,
          statistics: {
            byStatus: {
              'CONFIÁVEL': individualStats.valid || 0,
              'REVISAR': 0,
              'SUSPEITO': individualStats.warning || 0,
              'CRÍTICO': individualStats.critical || 0
            },
            total: individualStats.total || 0,
            avgCR: individualStats.avgCR || 0
          },
          overall: currentQualityAnalysis.overall || {},
          summary: {
            total: individualStats.total || calculation.responseCount || 0,
            ok: individualStats.valid || 0,
            suspicious: individualStats.warning || 0,
            critical: individualStats.critical || 0
          }
        } : {
          respondents: biasRespondents,
          statistics: {
            byStatus: {
              'CONFIÁVEL': individualStats.valid || calculation.responseCount || 0,
              'REVISAR': 0,
              'SUSPEITO': individualStats.warning || 0,
              'CRÍTICO': individualStats.critical || 0
            },
            total: individualStats.total || calculation.responseCount || 0,
            avgCR: individualStats.avgCR || 0
          },
          summary: {
            total: calculation.responseCount || activeProjectResponses.length || 0,
            ok: individualStats.valid || calculation.responseCount || 0,
            suspicious: individualStats.warning || 0,
            critical: individualStats.critical || 0
          }
        },
        // overallStats para compatibilidade
        overallStats: {
          total: individualStats.total || calculation.responseCount || activeProjectResponses.length || 0,
          valid: individualStats.valid || 0,
          warning: individualStats.warning || 0,
          critical: individualStats.critical || 0
        },
        individualStats: individualStats.total > 0 ? individualStats : undefined
      };

      // Adicionar dados demográficos ao payload
      const demographicsSummary = respondentsDemographics.length > 0 ? {
        total: respondentsDemographics.length,
        hasData: true,
        fields: {
          idade: [...new Set(respondentsDemographics.map(d => d.idade).filter(Boolean))],
          genero: [...new Set(respondentsDemographics.map(d => d.genero).filter(Boolean))],
          formacao: [...new Set(respondentsDemographics.map(d => d.formacao).filter(Boolean))],
          tempoTrabalho: [...new Set(respondentsDemographics.map(d => d.tempoTrabalho).filter(Boolean))],
          funcao: [...new Set(respondentsDemographics.map(d => d.funcao).filter(Boolean))],
          areaAtuacao: [...new Set(respondentsDemographics.map(d => d.areaAtuacao).filter(Boolean))]
        }
      } : { total: 0, hasData: false };

      // Adicionar ao payload
      const finalPayload = {
        ...payload,
        demographicsSummary,
        // Disparate Impact (Dodevska et al., 2023) — opcional
        sensitiveGroups: sensitiveGroups || undefined,
        // NOVO: Informação de exclusão para contextualizar a IA
        exclusionInfo: excludedIds.length > 0 ? {
          totalCollected: projectResponses.length,
          activeCount: activeProjectResponses.length,
          excludedCount: excludedIds.length,
          reason: 'Filtragem por consistência (CR > 0.10, Saaty 1977)'
        } : undefined
      };


      console.log('📤 [AI-REVIEW] demographicsSummary:', demographicsSummary);

      console.log('📤 [AI-REVIEW] personalWeights:', finalPayload.personalWeights);
      console.log('📤 [AI-REVIEW] rescalingWeights:', finalPayload.rescalingWeights);

      const response = await fetch('/api/ai-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      console.log('📥 [AI-REVIEW] Response status:', response.status);
      const data = await response.json();
      console.log('📥 [AI-REVIEW] Response data:', { success: data.success, hasReview: !!data.review, error: data.error });
      console.log('📥 [AI-REVIEW] biasAnalysis in response:', data.biasAnalysis ? `${data.biasAnalysis.overallRiskLevel} (${data.biasAnalysis.totalIndicators} indicators)` : 'NULL');
      console.log('📥 [AI-REVIEW] metadata.biasDetection:', data.metadata?.biasDetection);

      if (data.success && data.review) {
        console.log('✅ [AI-REVIEW] Sucesso! Nota:', data.nota, 'Veredicto:', data.veredicto);
        // Setar objeto completo com nota, veredicto e review
        setAiReview({
          nota: data.nota,
          veredicto: data.veredicto,
          review: data.review,
          metadata: data.metadata
        });
        // Capturar análise de viés (Dodevska et al., 2023)
        if (data.biasAnalysis) {
          setBiasAnalysis(data.biasAnalysis);
          console.log('✅ [AI-REVIEW] Bias analysis:', data.biasAnalysis.overallRiskLevel, `(${data.biasAnalysis.overallScore}/100)`);
        }
      } else {
        console.error('❌ [AI-REVIEW] Erro na resposta:', data.error);
        setAiReview({
          error: true,
          message: data.error || 'Erro ao executar revisão'
        });
      }
    } catch (e: any) {
      console.error('❌ [AI-REVIEW] Exceção:', e);
      setAiReview({
        error: true,
        message: 'Erro de conexão: ' + (e.message || String(e))
      });
    } finally {
      console.log('🏁 [AI-REVIEW] Finalizando...');
      setAiReviewLoading(false);
    }
  };

  // ============================================================
  // Disparate Impact — Salvar/Remover configuração
  // ============================================================

  const saveSensitiveGroups = async (config: {
    attribute: string;
    discriminated: string[];
    privileged: string[];
  } | null) => {
    if (!projectId) return;

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const projectRef = doc(db, 'projects', projectId);

      if (config) {
        await updateDoc(projectRef, { sensitiveGroups: config });
        setSensitiveGroups(config);
        console.log('✅ [DI] Configuração salva:', config);
      } else {
        // Remover configuração
        const { deleteField } = await import('firebase/firestore');
        await updateDoc(projectRef, { sensitiveGroups: deleteField() });
        setSensitiveGroups(null);
        console.log('🗑️ [DI] Configuração removida');
      }
    } catch (err) {
      console.error('❌ [DI] Erro ao salvar:', err);
    }
  };

  // Função para analisar qualidade das respostas
  const runQualityAnalysis = async () => {
    if (projectResponses.length === 0) return;

    setQualityLoading(true);
    try {
      const response = await fetch('/api/response-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: projectResponses,
          includeSimulated: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setQualityAnalysis(data.analysis);
      } else {
        console.error('Erro na análise de qualidade:', data.error);
      }
    } catch (e) {
      console.error('Erro ao analisar qualidade:', e);
    } finally {
      setQualityLoading(false);
    }
  };

  // ============================================================
  // RECÁLCULO COM EXCLUSÕES
  // ============================================================

  // Batch Exclusion Logic
  const handleToggleSelection = (respondentId: string) => {
    setSelectedForExclusion(prev =>
      prev.includes(respondentId)
        ? prev.filter(id => id !== respondentId)
        : [...prev, respondentId]
    );
  };

  const handleSelectAll = (isChecked: boolean, availableRespondents: string[]) => {
    if (isChecked) {
      setSelectedForExclusion(availableRespondents);
    } else {
      setSelectedForExclusion([]);
    }
  };

  const handleBatchExclusion = async () => {
    if (selectedForExclusion.length === 0) return;

    const newExcludedIds = [...new Set([...excludedIds, ...selectedForExclusion])];
    setExcludedIds(newExcludedIds);
    await recalculateResults(newExcludedIds);
    setSelectedForExclusion([]); // Clear selection after exclusion
  };

  const handleRestoreAll = async () => {
    setExcludedIds([]);
    await recalculateResults([]);
    setSelectedForExclusion([]);
  };

  // Kept for compatibility if needed, but not used in UI anymore
  const handleToggleExclusion = async (respondentId: string) => {
    const newExcludedIds = excludedIds.includes(respondentId)
      ? excludedIds.filter(id => id !== respondentId)
      : [...excludedIds, respondentId];
    setExcludedIds(newExcludedIds);
    await recalculateResults(newExcludedIds);
  };

  const recalculateResults = async (exclusions: string[]) => {
    setIsRecalculating(true);
    setLoading(true); // Bloquear UI geral
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          excludedRespondentIds: exclusions
        })
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar calculation com o novo resultado (incluindo metadados atualizados)
        setCalculation(data.calculation);

        // Re-executar auditoria com novos dados
        const auditResponse = await fetch('/api/audit-decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calculationData: data.calculation })
        });
        const auditData = await auditResponse.json();
        if (auditData.success) setAudit(auditData.audit);

        // Limpar AI review anterior pois dados mudaram
        setAiReview(null);

      } else {
        setError(data.error || 'Erro ao recalcular');
        // Reverter estado local em caso de erro
        setExcludedIds(calculation?.metadata?.excludedRespondentIds || []);
      }
    } catch (e: any) {
      console.error('Erro no recálculo:', e);
      setError('Erro de conexão ao recalcular: ' + e.message);
      setExcludedIds(calculation?.metadata?.excludedRespondentIds || []);
    } finally {
      setIsRecalculating(false);
      setLoading(false);
    }
  };

  // Verificar autenticação
  useEffect(() => {
    const auth = sessionStorage.getItem('isAuthenticated');
    if (auth !== 'true') window.location.href = '/';
  }, []);

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Carregar projeto
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (!projectDoc.exists()) {
          setError('Projeto não encontrado');
          setLoading(false);
          return;
        }
        setProject({ id: projectDoc.id, ...projectDoc.data() } as Project);
        const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;
        setProject(projectData);

        // 2. Carregar cálculo salvo
        const calcDoc = await getDoc(doc(db, 'calculations', projectId));
        if (calcDoc.exists()) {
          const calcData = calcDoc.data() as CalculationResult;

          // Carregar configuração de Disparate Impact (se existir)
          if (projectData.sensitiveGroups) {
            setSensitiveGroups(projectData.sensitiveGroups);
            console.log('📊 [DI] Configuração carregada:', projectData.sensitiveGroups);
          }

          setCalculation(calcData);

          // Inicializar excluídos a partir do metadata salvo
          if (calcData.metadata?.excludedRespondentIds) {
            setExcludedIds(calcData.metadata.excludedRespondentIds);
          }

          // 3. Executar auditoria
          try {
            const auditResponse = await fetch('/api/audit-decision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ calculationData: calcData })
            });
            const auditData = await auditResponse.json();
            if (auditData.success) {
              setAudit(auditData.audit);
            }
          } catch (e) {
            console.log('Auditoria não disponível');
          }
        } else {
          setError('Resultados não calculados ainda. Execute o cálculo primeiro.');
        }

        // 4. Carregar dados demográficos dos respondentes
        let validRespondentIds = new Set<string>();
        try {
          const respondentsQuery = query(
            collection(db, 'respondents'),
            where('projectId', '==', projectId)
          );
          const respondentsSnapshot = await getDocs(respondentsQuery);
          console.log('Total respondents found:', respondentsSnapshot.docs.length);

          validRespondentIds = new Set(respondentsSnapshot.docs.map(doc => doc.id));

          // Criar mapa respondentId → email
          const emailMap: Record<string, string> = {};
          respondentsSnapshot.docs.forEach(d => {
            const data = d.data();
            if (data.email) {
              emailMap[d.id] = data.email;
            }
          });
          setRespondentEmails(emailMap);

          // Filtrar apenas respondentes com status completed (possuem response finalizada)
          const demographics = respondentsSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              return data.status === 'completed' || data.completedAt;
            })
            .map(doc => {
              const data = doc.data();
              return data.demographics || null;
            })
            .filter((d): d is NonNullable<typeof d> => d !== null && Object.keys(d).length > 0);

          console.log('Demographics loaded:', demographics.length, 'with data');
          setRespondentsDemographics(demographics);
        } catch (demoErr) {
          console.error('Erro ao carregar dados demográficos:', demoErr);
        }

        // 5. Carregar respostas para análise de qualidade (filtradas)
        try {
          const responsesQuery = query(
            collection(db, 'responses'),
            where('projectId', '==', projectId)
          );
          const responsesSnapshot = await getDocs(responsesQuery);
          console.log('Total responses found (raw):', responsesSnapshot.docs.length);

          // Filtro 1: apenas respostas finalizadas (com completedAt)
          const completedDocs = responsesSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.completedAt != null && data.completedAt !== '';
          });
          console.log('Completed responses:', completedDocs.length);

          // Filtro 2: respondentId deve existir na collection respondents
          const validatedDocs = completedDocs.filter(doc => {
            const data = doc.data();
            if (!validRespondentIds.has(data.respondentId)) {
              console.warn('Ignorando response órfã:', data.respondentId);
              return false;
            }
            return true;
          });
          console.log('Validated responses:', validatedDocs.length);

          // Filtro 3: deduplicar por respondentId (manter mais recente)
          const uniqueMap = new Map();
          validatedDocs.forEach(doc => {
            const data = doc.data();
            const existing = uniqueMap.get(data.respondentId);
            if (!existing || (data.completedAt > existing.completedAt)) {
              uniqueMap.set(data.respondentId, { id: doc.id, ...data });
            }
          });
          const responses = Array.from(uniqueMap.values());
          console.log('Final unique responses:', responses.length);

          setProjectResponses(responses);
        } catch (respErr) {
          console.error('Erro ao carregar respostas:', respErr);
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro:', err);
        setError('Erro ao carregar dados');
        setLoading(false);
      }
    };

    if (projectId) loadData();
  }, [projectId]);

  // ============================================================
  // AUTO-EXECUTAR ANÁLISE DE QUALIDADE QUANDO DADOS CARREGAREM
  // ============================================================
  useEffect(() => {
    if (projectResponses.length > 0 && !qualityAnalysis && !qualityLoading) {
      runQualityAnalysis();
    }
  }, [projectResponses]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================

  const formatPercent = (value: number | undefined | null) => `${((value || 0) * 100).toFixed(2)}%`;
  const formatNumber = (value: number | undefined | null) => (value || 0).toFixed(4);

  const getCRStatus = (cr: number) => {
    if (cr <= 0.08) return { status: 'Excelente', color: 'text-green-600', bg: 'bg-green-100' };
    if (cr <= 0.10) return { status: 'Aceitável', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { status: 'Inconsistente', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const exportLatex = () => {
    if (!calculation || !project) return;

    // Calcular CI para cada matriz
    const calcCI = (cr: number, lambda: number, n: number): number => {
      return cr * randomIndex(n);
    };

    let latex = `% Tabelas LaTeX - Resultados AHP-BOCR
% Projeto: ${project.name}
% Gerado em: ${new Date().toLocaleString('pt-BR')}
% Software: AHP-BOCR Decision Support System v5.0

% ==================================================
% TABELA 1: PESOS ESTRATÉGICOS BOCR
% ==================================================
\\begin{table}[htbp]
\\centering
\\caption{Pesos estratégicos dos méritos BOCR}
\\label{tab:bocr-weights}
\\begin{tabular}{lcc}
\\toprule
\\textbf{Mérito} & \\textbf{Peso} & \\textbf{Peso (\\%)} \\\\
\\midrule
`;

    const bocrLabels = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
    calculation.bocrWeights.forEach((w, i) => {
      latex += `${bocrLabels[i]} & ${(w || 0).toFixed(4)} & ${((w || 0) * 100).toFixed(2)}\\% \\\\\n`;
    });

    const ciBocr = calcCI(calculation.bocrConsistency.cr, calculation.bocrConsistency.lambda, 4);
    latex += `\\midrule
\\textbf{Total} & 1.0000 & 100.00\\% \\\\
\\bottomrule
\\end{tabular}
\\begin{tablenotes}
\\small
\\item $\\lambda_{max}$ = ${(calculation.bocrConsistency.lambda || 0).toFixed(4)}
\\item CI = ${(ciBocr || 0).toFixed(4)} (Índice de Consistência)
\\item CR = ${((calculation.bocrConsistency.cr || 0) * 100).toFixed(2)}\\% (${calculation.bocrConsistency.cr <= 0.10 ? 'Consistente' : 'Inconsistente'})
\\item RI = 0.90 (Índice Aleatório para n=4, Saaty 1977)
\\end{tablenotes}
\\end{table}

% ==================================================
% TABELA 2: PESOS LOCAIS E GLOBAIS DOS SUBCRITÉRIOS
% ==================================================
\\begin{table}[htbp]
\\centering
\\caption{Pesos locais e globais dos subcritérios}
\\label{tab:subcriteria-weights}
\\begin{tabular}{llccc}
\\toprule
\\textbf{Mérito} & \\textbf{Subcritério} & \\textbf{Peso Local} & \\textbf{Peso Mérito} & \\textbf{Peso Global} \\\\
\\midrule
`;

    // Adicionar pesos dos subcritérios
    ['B', 'O', 'C', 'R'].forEach((merit, mIdx) => {
      const meritName = bocrLabels[mIdx];
      const meritWeight = calculation.bocrWeights[mIdx] || 0;
      const weights = calculation.subWeights[merit];
      const subs = SUBCRITERIA.filter(s => s.group === merit);

      if (weights && subs.length > 0) {
        subs.forEach((sub, idx) => {
          const localWeight = weights[idx] || 0;
          const globalWeight = localWeight * meritWeight;
          latex += `${meritName} & ${sub.name} & ${localWeight.toFixed(4)} & ${meritWeight.toFixed(4)} & ${globalWeight.toFixed(4)} \\\\\n`;
        });
        latex += `\\midrule\n`;
      }
    });

    latex += `\\bottomrule
\\end{tabular}
\\begin{tablenotes}
\\small
\\item Peso Global = Peso Local $\\times$ Peso do Mérito
\\item Fórmula: $w_{global} = w_{local} \\times w_{mérito}$
\\end{tablenotes}
\\end{table}

% ==================================================
% TABELA 3: MATRIZ DE DESEMPENHO BOCR
% ==================================================
\\begin{table}[htbp]
\\centering
\\caption{Desempenho das alternativas nos méritos BOCR}
\\label{tab:bocr-performance}
\\begin{tabular}{lcccc}
\\toprule
\\textbf{Alternativa} & \\textbf{B} & \\textbf{O} & \\textbf{C} & \\textbf{R} \\\\
\\midrule
`;

    // Matriz de desempenho BOCR
    calculation.finalScores.forEach(alt => {
      const b = alt.B || 0;
      const o = alt.O || 0;
      const c = alt.C || 0;
      const r = alt.R || 0;
      latex += `${alt.name} & ${b.toFixed(4)} & ${o.toFixed(4)} & ${c.toFixed(4)} & ${r.toFixed(4)} \\\\\n`;
    });

    latex += `\\bottomrule
\\end{tabular}
\\begin{tablenotes}
\\small
\\item B = Benefícios, O = Oportunidades, C = Custos, R = Riscos
\\item Valores normalizados representam o desempenho ponderado em cada mérito
\\item Baseado em Wijnmalen (2007)
\\end{tablenotes}
\\end{table}

% ==================================================
% TABELA 4: RANKING FINAL DAS ALTERNATIVAS
% ==================================================
\\begin{table}[htbp]
\\centering
\\caption{Ranking final das alternativas por método de síntese}
\\label{tab:ranking-final}
\\begin{tabular}{lccccc}
\\toprule
\\textbf{Alternativa} & \\textbf{Adit. Residual} & \\textbf{Q. Somas} & \\textbf{Subtrativo*} & \\textbf{Mult. Potências} & \\textbf{Mult. Simples} \\\\
\\midrule
`;

    const sortedAlts = [...calculation.finalScores].sort((a, b) =>
      (b.scoreSubtractive ?? b.scores?.subtractive ?? 0) - (a.scoreSubtractive ?? a.scores?.subtractive ?? 0)
    );

    sortedAlts.forEach(alt => {
      latex += `${alt.name} & ${(alt.scoreAdditiveResidualNorm || 0).toFixed(4)} & ${(alt.scoreQuotientSumsNorm || 0).toFixed(4)} & ${(alt.scoreSubtractive ?? alt.scores?.subtractive ?? 0).toFixed(4)} & ${(alt.scoreMultiplicativeNorm || 0).toFixed(4)} & ${(alt.scoreMultSimpleNorm || 0).toFixed(4)} \\\\\n`;
    });

    latex += `\\bottomrule
\\end{tabular}
\\begin{tablenotes}
\\small
\\item Fonte: Dados da pesquisa (n=${calculation.responseCount})
\\item Método de agregação: Média geométrica dos julgamentos
\\item Fórmulas conforme Petrillo et al. (2023)
\\end{tablenotes}
\\end{table}

% ==================================================
% TABELA 5: ÍNDICES DE CONSISTÊNCIA
% ==================================================
\\begin{table}[htbp]
\\centering
\\caption{Índices de consistência das matrizes de julgamento}
\\label{tab:consistency}
\\begin{tabular}{lcccl}
\\toprule
\\textbf{Matriz} & \\textbf{$\\lambda_{max}$} & \\textbf{CI} & \\textbf{CR} & \\textbf{Status} \\\\
\\midrule
BOCR (n=4) & ${(calculation.bocrConsistency.lambda || 0).toFixed(4)} & ${(calcCI(calculation.bocrConsistency.cr, calculation.bocrConsistency.lambda, 4) || 0).toFixed(4)} & ${((calculation.bocrConsistency.cr || 0) * 100).toFixed(2)}\\% & ${calculation.bocrConsistency.cr <= 0.10 ? 'Consistente' : 'Inconsistente'} \\\\
`;

    ['B', 'O', 'C', 'R'].forEach(merit => {
      const cons = calculation.subConsistency[merit];
      if (cons) {
        const meritName = { B: 'Benefícios', O: 'Oportunidades', C: 'Custos', R: 'Riscos' }[merit];
        const ciSub = calcCI(cons.cr, cons.lambda, 5);
        latex += `${meritName} (n=5) & ${(cons.lambda || 0).toFixed(4)} & ${(ciSub || 0).toFixed(4)} & ${((cons.cr || 0) * 100).toFixed(2)}\\% & ${cons.cr <= 0.10 ? 'Consistente' : 'Inconsistente'} \\\\\n`;
      }
    });

    latex += `\\bottomrule
\\end{tabular}
\\begin{tablenotes}
\\small
\\item CI = $(\\lambda_{max} - n) / (n - 1)$ (Índice de Consistência)
\\item CR = CI / RI (Razão de Consistência)
\\item Limite aceitável: CR $\\leq$ 10\\% (Saaty, 1977)
\\item RI(4) = 0.90, RI(5) = 1.12 (Índice Aleatório)
\\end{tablenotes}
\\end{table}

% ==================================================
% TABELA 6: ANÁLISE DE SENSIBILIDADE
% ==================================================
\\begin{table}[htbp]
\\centering
\\caption{Análise de sensibilidade dos pesos dos méritos}
\\label{tab:sensitivity}
\\begin{tabular}{lccc}
\\toprule
\\textbf{Mérito} & \\textbf{Peso Atual (\\%)} & \\textbf{Ponto de Inflexão (\\%)} & \\textbf{Classificação} \\\\
\\midrule
`;

    ['B', 'O', 'C', 'R'].forEach((merit, idx) => {
      const meritName = bocrLabels[idx];
      const currentWeight = (calculation.bocrWeights[idx] || 0) * 100;
      const inflection = calculation.sensitivityInflections?.[merit] ?? null;
      let classification = 'Estável';
      if (inflection !== null) {
        if (inflection <= 10) classification = 'Crítico';
        else if (inflection <= 20) classification = 'Sensível';
        else if (inflection <= 50) classification = 'Moderado';
      }
      latex += `${meritName} & ${currentWeight.toFixed(1)} & ${inflection !== null ? inflection + '\\%' : 'Sem inversão'} & ${classification} \\\\\n`;
    });

    latex += `\\bottomrule
\\end{tabular}
\\begin{tablenotes}
\\small
\\item Ponto de inflexão: peso no qual ocorre inversão no ranking
\\item Classificação baseada em Triantaphyllou \\& Sánchez (1997)
\\end{tablenotes}
\\end{table}
`;

    // Tabela demográfica se houver dados
    if (respondentsDemographics.length > 0) {
      latex += `
% ==================================================
% TABELA 7: CARACTERIZAÇÃO DA AMOSTRA
% ==================================================
\\begin{table}[htbp]
\\centering
\\caption{Caracterização sociodemográfica e profissional dos especialistas participantes (n = ${respondentsDemographics.length})}
\\label{tab:demographics}
\\begin{tabular}{llcc}
\\toprule
\\textbf{Variável} & \\textbf{Categoria} & \\textbf{n} & \\textbf{\\%} \\\\
\\midrule
`;

      // Mapeamentos
      const mapIdade: Record<string, string> = {
        'menos_30': 'Menos de 30 anos', '31_40': '31 a 40 anos',
        '41_50': '41 a 50 anos', 'mais_50': 'Mais de 50 anos'
      };
      const mapGenero: Record<string, string> = { 'masculino': 'Masculino', 'feminino': 'Feminino' };
      const mapFormacao: Record<string, string> = {
        'superior': 'Graduação', 'especializacao': 'Especialização/MBA',
        'mestrado': 'Mestrado', 'doutorado': 'Doutorado'
      };
      const mapExperiencia: Record<string, string> = {
        'menos_10': 'Menos de 10 anos', '11_20': '11 a 20 anos',
        '21_30': '21 a 30 anos', 'mais_30': 'Mais de 30 anos'
      };
      const mapArea: Record<string, string> = {
        'operacoes': 'Operações', 'manufatura': 'Manufatura',
        'qualidade': 'Qualidade', 'financeiro': 'Financeiro',
        'otimizacao_custos': 'Otimização e Custos', 'p_and_d': 'P&D / Inovação', 'outro': 'Outro'
      };
      const mapFuncao: Record<string, string> = {
        'c_level': 'C-Level/Diretoria', 'diretor': 'Diretor', 'gerente': 'Gerente',
        'supervisor': 'Supervisor', 'outro': 'Outro'
      };

      const countField = (field: string, mapping: Record<string, string>) => {
        const counts: Record<string, number> = {};
        const order: string[] = [];
        Object.values(mapping).forEach(label => {
          counts[label] = 0;
          order.push(label);
        });
        respondentsDemographics.forEach(d => {
          const val = d[field];
          if (val && mapping[val]) {
            counts[mapping[val]] = (counts[mapping[val]] || 0) + 1;
          }
        });
        return order.map(label => ({ label, count: counts[label] || 0 })).filter(c => c.count > 0);
      };

      const variables = [
        { title: 'Faixa Etária', field: 'idade', map: mapIdade },
        { title: 'Gênero', field: 'genero', map: mapGenero },
        { title: 'Formação', field: 'formacao', map: mapFormacao },
        { title: 'Experiência', field: 'tempoTrabalho', map: mapExperiencia },
        { title: 'Área', field: 'areaAtuacao', map: mapArea },
        { title: 'Cargo', field: 'funcao', map: mapFuncao },
      ];

      variables.forEach((v, vIdx) => {
        const counts = countField(v.field, v.map);
        counts.forEach((c, idx) => {
          const pct = ((c.count / (respondentsDemographics.length || 1)) * 100).toFixed(1);
          if (idx === 0) {
            latex += `${v.title} & ${c.label} & ${c.count} & ${pct} \\\\\n`;
          } else {
            latex += ` & ${c.label} & ${c.count} & ${pct} \\\\\n`;
          }
        });
        if (vIdx < variables.length - 1) {
          latex += `\\midrule\n`;
        }
      });

      latex += `\\midrule
\\textbf{Total} & & \\textbf{${respondentsDemographics.length}} & \\textbf{100,0} \\\\
\\bottomrule
\\end{tabular}
\\begin{tablenotes}
\\small
\\item Fonte: Dados primários da pesquisa (${new Date().getFullYear()}).
\\end{tablenotes}
\\end{table}
`;
    }

    // Download
    const blob = new Blob([latex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados_ahp_bocr_${project.name.replace(/\s+/g, '_')}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // EXPORTAÇÃO CSV
  // ============================================================

  const exportCSV = () => {
    if (!calculation || !project) return;

    // Calcular CI
    const calcCI = (cr: number, n: number): number => {
      return cr * randomIndex(n);
    };

    let csv = `Resultados AHP-BOCR - ${project.name}\n`;
    csv += `Gerado em:,${new Date().toLocaleString('pt-BR')}\n`;
    csv += `Número de especialistas:,${calculation.responseCount}\n`;
    csv += `Software:,AHP-BOCR Decision Support System v5.0\n\n`;

    // Pesos BOCR
    csv += `===== PESOS ESTRATÉGICOS BOCR =====\n`;
    csv += `Mérito,Peso,Peso (%)\n`;
    const bocrLabels = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
    calculation.bocrWeights.forEach((w, i) => {
      csv += `${bocrLabels[i]},${(w || 0).toFixed(6)},${((w || 0) * 100).toFixed(2)}%\n`;
    });

    const ciBocr = calcCI(calculation.bocrConsistency.cr, 4);
    csv += `\nÍndices de Consistência BOCR:\n`;
    csv += `Lambda max:,${(calculation.bocrConsistency.lambda || 0).toFixed(6)}\n`;
    csv += `CI:,${(ciBocr || 0).toFixed(6)}\n`;
    csv += `CR:,${((calculation.bocrConsistency.cr || 0) * 100).toFixed(2)}%\n`;
    csv += `RI (n=4):,0.90\n\n`;

    // Pesos dos Subcritérios
    csv += `===== PESOS DOS SUBCRITÉRIOS =====\n`;
    csv += `Mérito,Subcritério,Peso Local,Peso Mérito,Peso Global\n`;
    ['B', 'O', 'C', 'R'].forEach((merit, mIdx) => {
      const meritName = bocrLabels[mIdx];
      const meritWeight = calculation.bocrWeights[mIdx] || 0;
      const weights = calculation.subWeights[merit];
      const subs = SUBCRITERIA.filter(s => s.group === merit);

      if (weights && subs.length > 0) {
        subs.forEach((sub, idx) => {
          const localWeight = weights[idx] || 0;
          const globalWeight = localWeight * meritWeight;
          csv += `${meritName},${sub.name},${localWeight.toFixed(6)},${meritWeight.toFixed(6)},${globalWeight.toFixed(6)}\n`;
        });
      }
    });
    csv += `\n`;

    // Matriz de Desempenho BOCR
    csv += `===== MATRIZ DE DESEMPENHO BOCR =====\n`;
    csv += `Alternativa,B,O,C,R\n`;
    calculation.finalScores.forEach(alt => {
      csv += `${alt.name},${(alt.B || 0).toFixed(6)},${(alt.O || 0).toFixed(6)},${(alt.C || 0).toFixed(6)},${(alt.R || 0).toFixed(6)}\n`;
    });
    csv += `\n`;

    // Ranking
    csv += `===== RANKING FINAL =====\n`;
    csv += `Alternativa,Adit. Residual (Σ=1),Q. Somas (Σ=1),Subtrativo (bruto),Mult Potências (Σ=1),Mult Simples (Σ=1)\n`;
    const sortedAlts = [...calculation.finalScores].sort((a, b) =>
      (b.scoreSubtractive ?? b.scores?.subtractive ?? 0) - (a.scoreSubtractive ?? a.scores?.subtractive ?? 0)
    );
    sortedAlts.forEach(alt => {
      csv += `${alt.name},${(alt.scoreAdditiveResidualNorm || 0).toFixed(6)},${(alt.scoreQuotientSumsNorm || 0).toFixed(6)},${(alt.scoreSubtractive ?? alt.scores?.subtractive ?? 0).toFixed(6)},${(alt.scoreMultiplicativeNorm || 0).toFixed(6)},${(alt.scoreMultSimpleNorm || 0).toFixed(6)}\n`;
    });
    csv += `\n`;

    // Consistência de todas as matrizes
    csv += `===== ÍNDICES DE CONSISTÊNCIA =====\n`;
    csv += `Matriz,n,Lambda max,CI,CR,Status\n`;
    csv += `BOCR,4,${(calculation.bocrConsistency.lambda || 0).toFixed(6)},${(calcCI(calculation.bocrConsistency.cr, 4) || 0).toFixed(6)},${((calculation.bocrConsistency.cr || 0) * 100).toFixed(2)}%,${calculation.bocrConsistency.cr <= 0.10 ? 'Consistente' : 'Inconsistente'}\n`;

    ['B', 'O', 'C', 'R'].forEach((merit, idx) => {
      const cons = calculation.subConsistency[merit];
      if (cons) {
        const ciSub = calcCI(cons.cr, 5);
        csv += `${bocrLabels[idx]},5,${(cons.lambda || 0).toFixed(6)},${(ciSub || 0).toFixed(6)},${((cons.cr || 0) * 100).toFixed(2)}%,${cons.cr <= 0.10 ? 'Consistente' : 'Inconsistente'}\n`;
      }
    });
    csv += `\n`;

    // Análise de Sensibilidade
    csv += `===== ANÁLISE DE SENSIBILIDADE =====\n`;
    csv += `Mérito,Peso Atual (%),Ponto de Inflexão (%),Classificação\n`;
    ['B', 'O', 'C', 'R'].forEach((merit, idx) => {
      const currentWeight = (calculation.bocrWeights[idx] || 0) * 100;
      const inflection = calculation.sensitivityInflections?.[merit] ?? null;
      let classification = 'Estável';
      if (inflection !== null) {
        if (inflection <= 10) classification = 'Crítico';
        else if (inflection <= 20) classification = 'Sensível';
        else if (inflection <= 50) classification = 'Moderado';
      }
      csv += `${bocrLabels[idx]},${currentWeight.toFixed(1)},${inflection !== null ? inflection : 'Sem inversão'},${classification}\n`;
    });
    csv += `\n`;

    // Dados Demográficos
    if (respondentsDemographics.length > 0) {
      csv += `===== PERFIL DEMOGRÁFICO DOS ESPECIALISTAS =====\n`;
      csv += `Total de respondentes:,${respondentsDemographics.length}\n\n`;

      // Mapeamentos
      const mapIdade: Record<string, string> = {
        'menos_30': 'Menos de 30 anos', '31_40': '31 a 40 anos',
        '41_50': '41 a 50 anos', 'mais_50': 'Mais de 50 anos'
      };
      const mapGenero: Record<string, string> = { 'masculino': 'Masculino', 'feminino': 'Feminino' };
      const mapFormacao: Record<string, string> = {
        'superior': 'Graduação', 'especializacao': 'Especialização/MBA',
        'mestrado': 'Mestrado', 'doutorado': 'Doutorado'
      };
      const mapExperiencia: Record<string, string> = {
        'menos_10': 'Menos de 10 anos', '11_20': '11 a 20 anos',
        '21_30': '21 a 30 anos', 'mais_30': 'Mais de 30 anos'
      };
      const mapArea: Record<string, string> = {
        'operacoes': 'Operações', 'manufatura': 'Manufatura',
        'qualidade': 'Qualidade', 'financeiro': 'Financeiro',
        'otimizacao_custos': 'Otimização e Custos', 'p_and_d': 'P&D / Inovação', 'outro': 'Outro'
      };
      const mapFuncao: Record<string, string> = {
        'c_level': 'C-Level/Diretoria', 'diretor': 'Diretor', 'gerente': 'Gerente',
        'supervisor': 'Supervisor', 'outro': 'Outro'
      };

      const countField = (field: string, mapping: Record<string, string>) => {
        const counts: Record<string, number> = {};
        respondentsDemographics.forEach(d => {
          const val = d[field];
          if (val && mapping[val]) {
            counts[mapping[val]] = (counts[mapping[val]] || 0) + 1;
          }
        });
        return counts;
      };

      const variables = [
        { title: 'Faixa Etária', field: 'idade', map: mapIdade },
        { title: 'Gênero', field: 'genero', map: mapGenero },
        { title: 'Nível de Formação', field: 'formacao', map: mapFormacao },
        { title: 'Tempo de Experiência', field: 'tempoTrabalho', map: mapExperiencia },
        { title: 'Área de Atuação', field: 'areaAtuacao', map: mapArea },
        { title: 'Cargo/Função', field: 'funcao', map: mapFuncao },
      ];

      variables.forEach(v => {
        csv += `${v.title}:\n`;
        csv += `Categoria,n,%\n`;
        const counts = countField(v.field, v.map);
        Object.entries(counts).forEach(([label, count]) => {
          csv += `${label},${count},${((count / respondentsDemographics.length) * 100).toFixed(1)}%\n`;
        });
        csv += `\n`;
      });
    }

    // Resumo das Respostas
    if (projectResponses.length > 0) {
      csv += `===== RESUMO DAS RESPOSTAS =====\n`;
      csv += `Total de respostas:,${projectResponses.length}\n`;

      const realResponses = projectResponses.filter(r => !r.isSimulated);
      const simulatedResponses = projectResponses.filter(r => r.isSimulated);
      const altCodesCSV = (project?.alternatives || []).map((a: any) => a.code);
      const avgCR = projectResponses.reduce((sum, r) => {
        const recalc = recalcularCRBocrIndividual(r.judgments as IPCJudgment[], altCodesCSV);
        const cr = recalc?.avgCR ?? (r.responses?.avgCR || 0);
        return sum + cr;
      }, 0) / projectResponses.length;
      const consistentCount = projectResponses.filter(r => {
        const recalc = recalcularCRBocrIndividual(r.judgments as IPCJudgment[], altCodesCSV);
        const cr = recalc?.avgCR ?? (r.responses?.avgCR || 0);
        return cr <= 0.10;
      }).length;

      csv += `Respostas reais:,${realResponses.length}\n`;
      csv += `Respostas simuladas:,${simulatedResponses.length}\n`;
      csv += `CR médio:,${(avgCR * 100).toFixed(2)}%\n`;
      csv += `Respostas consistentes:,${consistentCount} (${((consistentCount / projectResponses.length) * 100).toFixed(0)}%)\n`;
      csv += `\n`;

      csv += `Detalhamento por resposta:\n`;
      csv += `ID,Data/Hora,Tempo (min),CR BOCR,Maior CR,Status,Tipo\n`;
      projectResponses.forEach((resp, idx) => {
        const recalcResult = recalcularCRBocrIndividual(resp.judgments as IPCJudgment[], altCodesCSV);
        const crBocr = recalcResult?.crBocr ?? (resp.responses?.bocrConsistency?.cr || 0);
        const crMedio = recalcResult?.avgCR ?? (resp.responses?.avgCR || 0);
        const submittedAt = resp.submittedAt ? new Date(resp.submittedAt.seconds * 1000).toLocaleString('pt-BR') : '-';
        const duration = resp.duration ? (resp.duration / 60).toFixed(1) : '-';
        const tipo = resp.isSimulated ? 'Simulada' : 'Real';
        csv += `R${idx + 1},${submittedAt},${duration},${(crBocr * 100).toFixed(2)}%,${(crMedio * 100).toFixed(2)}%,${crMedio <= 0.10 ? 'Consistente' : 'Inconsistente'},${tipo}\n`;
      });
    }

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados_ahp_bocr_${project.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // EXPORTAÇÃO XLSX - PLANILHA COMPLETA COM MÚLTIPLAS SHEETS
  // ============================================================

  const exportXLSX = () => {
    if (!calculation || !project) return;

    const wb = XLSX.utils.book_new();
    const bocrLabels = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];

    // Função auxiliar para calcular CI
    const calcCI = (cr: number, n: number): number => {
      return cr * randomIndex(n);
    };

    // ===== SHEET 1: VISÃO GERAL =====
    const overviewData = [
      ['RESULTADOS AHP-BOCR'],
      [''],
      ['Projeto:', project.name],
      ['Descrição:', project.description || '-'],
      ['Data de Geração:', new Date().toLocaleString('pt-BR')],
      ['Número de Especialistas:', calculation.responseCount],
      ['Número de Alternativas:', project.alternatives.length],
      [''],
      ['ALTERNATIVAS'],
      ['Código', 'Nome', 'Descrição'],
      ...project.alternatives.map(alt => [alt.code, alt.name, alt.description || '-']),
      [''],
      ['SOFTWARE'],
      ['Sistema:', 'AHP-BOCR Decision Support System v5.0'],
      ['Metodologia:', 'Saaty (1977, 1980), Wijnmalen (2007), Petrillo et al. (2023)'],
      ['Instituição:', 'UNESP - Engenharia de Produção'],
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
    wsOverview['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, 'Visão Geral');

    // ===== SHEET 2: PESOS BOCR =====
    const bocrData = [
      ['PESOS ESTRATÉGICOS BOCR'],
      [''],
      ['Mérito', 'Peso', 'Peso (%)', 'Interpretação'],
      ...bocrLabels.map((label, i) => {
        const w = calculation.bocrWeights[i] || 0;
        let interp = '';
        if (i === 0 || i === 1) interp = 'Maximizar (Positivo)';
        else interp = 'Minimizar (Negativo)';

        return [label, w.toFixed(6), `${(w * 100).toFixed(2)}%`, interp];
      }),
      ['TOTAL', '1.000000', '100.00%', ''],
      [''],
      ['ÍNDICES DE CONSISTÊNCIA'],
      ['λmax (autovalor máximo):', (calculation.bocrConsistency.lambda || 0).toFixed(6)],
      ['CI (Índice de Consistência):', calcCI(calculation.bocrConsistency.cr, 4).toFixed(6)],
      ['RI (Índice Aleatório):', '0.90'],
      ['CR (Razão de Consistência):', `${((calculation.bocrConsistency.cr || 0) * 100).toFixed(2)}%`],
      ['Status:', calculation.bocrConsistency.cr <= 0.10 ? 'CONSISTENTE (CR ≤ 10%)' : 'INCONSISTENTE (CR > 10%)'],
      [''],
      ['INTERPRETAÇÃO'],
      ['Aspectos Positivos (B+O):', `${(((calculation.bocrWeights[0] || 0) + (calculation.bocrWeights[1] || 0)) * 100).toFixed(2)}%`],
      ['Aspectos Negativos (C+R):', `${(((calculation.bocrWeights[2] || 0) + (calculation.bocrWeights[3] || 0)) * 100).toFixed(2)}%`],
      ['Perfil de Decisão:', ((calculation.bocrWeights[0] || 0) + (calculation.bocrWeights[1] || 0)) > 0.6 ? 'Orientado a Valor' :
        ((calculation.bocrWeights[2] || 0) + (calculation.bocrWeights[3] || 0)) > 0.6 ? 'Conservador/Cauteloso' : 'Balanceado'],
    ];
    const wsBocr = XLSX.utils.aoa_to_sheet(bocrData);
    wsBocr['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsBocr, 'Pesos BOCR');

    // ===== SHEET 3: SUBCRITÉRIOS =====
    const subData = [
      ['PESOS DOS SUBCRITÉRIOS'],
      [''],
      ['Mérito', 'Código', 'Subcritério', 'Dimensão', 'Peso Local', 'Peso Mérito', 'Peso Global'],
    ];
    ['B', 'O', 'C', 'R'].forEach((merit, mIdx) => {
      const meritName = bocrLabels[mIdx];
      const meritWeight = calculation.bocrWeights[mIdx] || 0;
      const weights = calculation.subWeights[merit];
      const subs = SUBCRITERIA.filter(s => s.group === merit);

      if (weights && subs.length > 0) {
        subs.forEach((sub, idx) => {
          const localWeight = weights[idx] || 0;
          const globalWeight = localWeight * meritWeight;
          subData.push([
            meritName,
            sub.code,
            sub.name,
            sub.dimension,
            localWeight.toFixed(6),
            meritWeight.toFixed(6),
            globalWeight.toFixed(6)
          ]);
        });
      }
    });
    // Adicionar consistência dos subcritérios
    subData.push(['']);
    subData.push(['CONSISTÊNCIA DOS SUBCRITÉRIOS']);
    subData.push(['Mérito', 'n', 'λmax', 'CI', 'CR', 'Status']);
    ['B', 'O', 'C', 'R'].forEach((merit, idx) => {
      const cons = calculation.subConsistency[merit];
      if (cons) {
        const ciSub = calcCI(cons.cr, 5);
        subData.push([
          bocrLabels[idx],
          '5',
          (cons.lambda || 0).toFixed(6),
          (ciSub || 0).toFixed(6),
          `${((cons.cr || 0) * 100).toFixed(2)}%`,
          cons.cr <= 0.10 ? 'Consistente' : 'Inconsistente'
        ]);
      }
    });
    const wsSub = XLSX.utils.aoa_to_sheet(subData);
    wsSub['!cols'] = [{ wch: 15 }, { wch: 8 }, { wch: 40 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSub, 'Subcritérios');

    // ===== SHEET 4: MATRIZ DE DESEMPENHO =====
    const perfData = [
      ['MATRIZ DE DESEMPENHO BOCR'],
      [''],
      ['Alternativa', 'Benefícios (B)', 'Oportunidades (O)', 'Custos (C)', 'Riscos (R)', 'B+O', 'C+R', 'Saldo (B+O-C-R)'],
      ...calculation.finalScores.map(alt => {
        const b = alt.B || 0;
        const o = alt.O || 0;
        const c = alt.C || 0;
        const r = alt.R || 0;
        return [
          alt.name,
          b.toFixed(6),
          o.toFixed(6),
          c.toFixed(6),
          r.toFixed(6),
          (b + o).toFixed(6),
          (c + r).toFixed(6),
          (b + o - c - r).toFixed(6)
        ];
      }),
      [''],
      ['INTERPRETAÇÃO'],
      ['- B e O: Valores maiores são melhores (maximizar)'],
      ['- C e R: Valores menores são melhores (minimizar)'],
      ['- Saldo positivo indica que benefícios superam custos/riscos'],
    ];
    const wsPerf = XLSX.utils.aoa_to_sheet(perfData);
    wsPerf['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsPerf, 'Desempenho BOCR');

    // ===== SHEET 5: RANKING =====
    const sortedAlts = [...calculation.finalScores].sort((a, b) =>
      (b.scoreSubtractive ?? b.scores?.subtractive ?? 0) - (a.scoreSubtractive ?? a.scores?.subtractive ?? 0)
    );
    const rankData = [
      ['RANKING FINAL - COMPARATIVO DE MÉTODOS'],
      [''],
      ['Posição', 'Alternativa', 'Adit. Residual', 'Q. Somas', 'Subtrativo', 'Mult. Potências', 'Mult. Simples'],
      ...sortedAlts.map((alt, idx) => [
        `${idx + 1}º`,
        alt.name,
        (alt.scoreAdditiveResidualNorm || 0).toFixed(6),
        (alt.scoreQuotientSumsNorm || 0).toFixed(6),
        (alt.scoreSubtractive ?? alt.scores?.subtractive ?? 0).toFixed(6),
        (alt.scoreMultiplicativeNorm || 0).toFixed(6),
        (alt.scoreMultSimpleNorm || 0).toFixed(6)
      ]),
      [''],
      ['VERIFICAÇÃO DAS SOMAS (métodos distributivos devem somar 1.0)'],
      ['Método', 'Soma', 'Status'],
      ['Aditivo Residual', calculation.finalScores.reduce((s, a) => s + (a.scoreAdditiveResidualNorm || 0), 0).toFixed(6),
        Math.abs(calculation.finalScores.reduce((s, a) => s + (a.scoreAdditiveResidualNorm || 0), 0) - 1) < 0.001 ? 'OK' : 'ERRO'],
      ['Quociente de Somas', calculation.finalScores.reduce((s, a) => s + (a.scoreQuotientSumsNorm || 0), 0).toFixed(6),
        Math.abs(calculation.finalScores.reduce((s, a) => s + (a.scoreQuotientSumsNorm || 0), 0) - 1) < 0.001 ? 'OK' : 'ERRO'],
      [''],
      ['VENCEDOR'],
      ['Alternativa recomendada:', sortedAlts[0]?.name || '-'],
      ['Score (Aditivo Residual):', (sortedAlts[0]?.scoreAdditiveResidualNorm || 0).toFixed(6)],
      ['Diferença para 2º lugar:', sortedAlts.length >= 2 ?
        `${(Math.abs((sortedAlts[0]?.scoreAdditiveResidualNorm || 0) - (sortedAlts[1]?.scoreAdditiveResidualNorm || 0)) * 100).toFixed(2)}%` : '-'],
    ];
    const wsRank = XLSX.utils.aoa_to_sheet(rankData);
    wsRank['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsRank, 'Ranking');

    // ===== SHEET 6: CONSISTÊNCIA =====
    const consData = [
      ['ÍNDICES DE CONSISTÊNCIA - TODAS AS MATRIZES'],
      [''],
      ['Referência: Saaty (1977) - CR ≤ 0.10 (10%) indica julgamentos consistentes'],
      [''],
      ['Matriz', 'Tamanho (n)', 'λmax', 'CI', 'RI', 'CR', 'Status'],
      ['BOCR (Méritos)', '4', (calculation.bocrConsistency.lambda || 0).toFixed(6),
        calcCI(calculation.bocrConsistency.cr, 4).toFixed(6), '0.90',
        `${((calculation.bocrConsistency.cr || 0) * 100).toFixed(2)}%`,
        calculation.bocrConsistency.cr <= 0.10 ? '✓ Consistente' : '✗ Inconsistente'],
    ];
    ['B', 'O', 'C', 'R'].forEach((merit, idx) => {
      const cons = calculation.subConsistency[merit];
      if (cons) {
        consData.push([
          `${bocrLabels[idx]} (Subcritérios)`,
          '5',
          (cons.lambda || 0).toFixed(6),
          calcCI(cons.cr, 5).toFixed(6),
          '1.12',
          `${((cons.cr || 0) * 100).toFixed(2)}%`,
          cons.cr <= 0.10 ? '✓ Consistente' : '✗ Inconsistente'
        ]);
      }
    });
    consData.push(['']);
    consData.push(['FÓRMULAS']);
    consData.push(['CI = (λmax - n) / (n - 1)']);
    consData.push(['CR = CI / RI']);
    consData.push(['RI (n=4) = 0.90, RI (n=5) = 1.12 (Saaty, 1977)']);
    const wsCons = XLSX.utils.aoa_to_sheet(consData);
    wsCons['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsCons, 'Consistência');

    // ===== SHEET 7: SENSIBILIDADE =====
    const sensData = [
      ['ANÁLISE DE SENSIBILIDADE DOS PESOS BOCR'],
      [''],
      ['Metodologia: Variação sistemática de ±5%, ±10%, ±20% nos pesos com renormalização'],
      ['Ponto de inflexão: percentual de variação no peso que causa inversão no ranking'],
      [''],
      ['Mérito', 'Peso Atual', 'Ponto de Inflexão', 'Classificação', 'Interpretação'],
    ];
    ['B', 'O', 'C', 'R'].forEach((merit, idx) => {
      const currentWeight = (calculation.bocrWeights[idx] || 0) * 100;
      const inflection = calculation.sensitivityInflections?.[merit] ?? null;
      let classification = 'Estável';
      let interpretation = 'Ranking robusto - sem inversão em variações de até ±20%';
      if (inflection !== null) {
        if (inflection <= 10) {
          classification = 'CRÍTICO';
          interpretation = 'Pequenas mudanças podem inverter a recomendação';
        } else if (inflection <= 20) {
          classification = 'Sensível';
          interpretation = 'Mudanças moderadas podem afetar o resultado';
        } else if (inflection <= 50) {
          classification = 'Moderado';
          interpretation = 'Ranking estável para variações pequenas';
        }
      }
      sensData.push([
        bocrLabels[idx],
        `${currentWeight.toFixed(1)}%`,
        inflection !== null ? `${inflection}%` : 'Sem inversão',
        classification,
        interpretation
      ]);
    });

    // Resumo da robustez
    const criticalCount = ['B', 'O', 'C', 'R'].filter(m => {
      const inf = calculation.sensitivityInflections?.[m];
      return inf !== null && inf <= 10;
    }).length;
    const sensitiveCount = ['B', 'O', 'C', 'R'].filter(m => {
      const inf = calculation.sensitivityInflections?.[m];
      return inf !== null && inf > 10 && inf <= 20;
    }).length;

    sensData.push(['']);
    sensData.push(['RESUMO DA ROBUSTEZ']);
    sensData.push(['Méritos críticos:', criticalCount.toString()]);
    sensData.push(['Méritos sensíveis:', sensitiveCount.toString()]);
    sensData.push(['Classificação geral:',
      criticalCount === 0 && sensitiveCount === 0 ? 'ALTAMENTE ROBUSTO' :
        criticalCount === 0 ? 'ROBUSTO' :
          criticalCount <= 1 ? 'MODERADAMENTE SENSÍVEL' : 'SENSÍVEL']);
    const wsSens = XLSX.utils.aoa_to_sheet(sensData);
    wsSens['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSens, 'Sensibilidade');

    // ===== SHEET 8: DADOS DEMOGRÁFICOS =====
    const demoData = [
      ['PERFIL DEMOGRÁFICO DOS ESPECIALISTAS'],
      [''],
      [`Total de respondentes: ${respondentsDemographics.length}`],
      [''],
    ];

    if (respondentsDemographics.length > 0) {
      // Mapeamentos
      const mapIdade: Record<string, string> = {
        'menos_30': 'Menos de 30 anos',
        '31_40': '31 a 40 anos',
        '41_50': '41 a 50 anos',
        'mais_50': 'Mais de 50 anos'
      };
      const mapGenero: Record<string, string> = {
        'masculino': 'Masculino',
        'feminino': 'Feminino'
      };
      const mapFormacao: Record<string, string> = {
        'superior': 'Graduação',
        'especializacao': 'Especialização/MBA',
        'mestrado': 'Mestrado',
        'doutorado': 'Doutorado'
      };
      const mapExperiencia: Record<string, string> = {
        'menos_10': 'Menos de 10 anos',
        '11_20': '11 a 20 anos',
        '21_30': '21 a 30 anos',
        'mais_30': 'Mais de 30 anos'
      };
      const mapArea: Record<string, string> = {
        'operacoes': 'Operações',
        'manufatura': 'Manufatura',
        'qualidade': 'Qualidade',
        'financeiro': 'Financeiro',
        'otimizacao_custos': 'Otimização e Custos',
        'p_and_d': 'P&D / Inovação',
        'outro': 'Outro'
      };
      const mapFuncao: Record<string, string> = {
        'c_level': 'C-Level/Diretoria Executiva',
        'diretor': 'Diretor',
        'gerente': 'Gerente',
        'supervisor': 'Supervisor/Coordenador',
        'outro': 'Outro'
      };

      // Função para contar
      const countField = (field: string, mapping: Record<string, string>) => {
        const counts: Record<string, number> = {};
        respondentsDemographics.forEach(d => {
          const val = d[field];
          if (val && mapping[val]) {
            counts[mapping[val]] = (counts[mapping[val]] || 0) + 1;
          }
        });
        return Object.entries(counts).map(([label, count]) => ({
          label,
          count,
          pct: ((count / respondentsDemographics.length) * 100).toFixed(1)
        }));
      };

      // Tabelas por variável
      const variables = [
        { title: 'FAIXA ETÁRIA', field: 'idade', map: mapIdade },
        { title: 'GÊNERO', field: 'genero', map: mapGenero },
        { title: 'NÍVEL DE FORMAÇÃO', field: 'formacao', map: mapFormacao },
        { title: 'TEMPO DE EXPERIÊNCIA', field: 'tempoTrabalho', map: mapExperiencia },
        { title: 'ÁREA DE ATUAÇÃO', field: 'areaAtuacao', map: mapArea },
        { title: 'CARGO/FUNÇÃO', field: 'funcao', map: mapFuncao },
      ];

      variables.forEach(v => {
        demoData.push([v.title]);
        demoData.push(['Categoria', 'n', '%']);
        const counts = countField(v.field, v.map);
        counts.forEach(c => {
          demoData.push([c.label, c.count.toString(), `${c.pct}%`]);
        });
        demoData.push(['']);
      });

      // Estatísticas de qualificação
      const posGrad = respondentsDemographics.filter(d =>
        ['especializacao', 'mestrado', 'doutorado'].includes(d.formacao)
      ).length;
      const experientes = respondentsDemographics.filter(d =>
        ['11_20', '21_30', 'mais_30'].includes(d.tempoTrabalho)
      ).length;
      const gestores = respondentsDemographics.filter(d =>
        ['c_level', 'diretor', 'gerente'].includes(d.funcao)
      ).length;

      demoData.push(['QUALIFICAÇÃO DA AMOSTRA']);
      demoData.push(['Indicador', 'n', '%', 'Avaliação']);
      demoData.push([
        'Pós-graduados',
        posGrad.toString(),
        `${((posGrad / respondentsDemographics.length) * 100).toFixed(1)}%`,
        posGrad >= respondentsDemographics.length * 0.5 ? 'Adequado (≥50%)' : 'Baixo (<50%)'
      ]);
      demoData.push([
        'Experiência >10 anos',
        experientes.toString(),
        `${((experientes / respondentsDemographics.length) * 100).toFixed(1)}%`,
        experientes >= respondentsDemographics.length * 0.5 ? 'Adequado (≥50%)' : 'Baixo (<50%)'
      ]);
      demoData.push([
        'Gestores',
        gestores.toString(),
        `${((gestores / respondentsDemographics.length) * 100).toFixed(1)}%`,
        gestores >= respondentsDemographics.length * 0.3 ? 'Adequado (≥30%)' : 'Baixo (<30%)'
      ]);
    } else {
      demoData.push(['Nenhum dado demográfico disponível']);
    }

    const wsDemo = XLSX.utils.aoa_to_sheet(demoData);
    wsDemo['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsDemo, 'Demográficos');

    // ===== SHEET 9: RESPOSTAS INDIVIDUAIS (Matrizes de Julgamento) =====
    if (projectResponses.length > 0) {
      const responsesData: any[][] = [
        ['RESPOSTAS INDIVIDUAIS - MATRIZES DE JULGAMENTO'],
        [''],
        ['Total de respostas:', projectResponses.length],
        [''],
        ['RESUMO POR RESPONDENTE'],
        ['ID Resposta', 'Data/Hora', 'Tempo (min)', 'CR BOCR', 'Maior CR', 'Status CR', 'Tipo'],
      ];

      const altCodesXLSX = (project?.alternatives || []).map((a: any) => a.code);

      projectResponses.forEach((resp, idx) => {
        const recalcResult = recalcularCRBocrIndividual(resp.judgments as IPCJudgment[], altCodesXLSX);
        const crBocr = recalcResult?.crBocr ?? (resp.responses?.bocrConsistency?.cr || 0);
        const crMedio = recalcResult?.avgCR ?? (resp.responses?.avgCR || 0);
        const submittedAt = resp.submittedAt ? new Date(resp.submittedAt.seconds * 1000).toLocaleString('pt-BR') : '-';
        const duration = resp.duration ? (resp.duration / 60).toFixed(1) : '-';
        const tipo = resp.isSimulated ? 'Simulada' : 'Real';

        responsesData.push([
          `R${idx + 1}`,
          submittedAt,
          duration,
          (crBocr * 100).toFixed(2) + '%',
          (crMedio * 100).toFixed(2) + '%',
          crMedio <= 0.10 ? 'Consistente' : 'Inconsistente',
          tipo
        ]);
      });

      // Adicionar estatísticas agregadas
      const realResponses = projectResponses.filter(r => !r.isSimulated);
      const simulatedResponses = projectResponses.filter(r => r.isSimulated);
      const avgCRComputed = projectResponses.reduce((sum, r) => {
        const recalc = recalcularCRBocrIndividual(r.judgments as IPCJudgment[], altCodesXLSX);
        const cr = recalc?.avgCR ?? (r.responses?.avgCR || 0);
        return sum + cr;
      }, 0) / projectResponses.length;
      const consistentCount = projectResponses.filter(r => {
        const recalc = recalcularCRBocrIndividual(r.judgments as IPCJudgment[], altCodesXLSX);
        const cr = recalc?.avgCR ?? (r.responses?.avgCR || 0);
        return cr <= 0.10;
      }).length;

      responsesData.push(['']);
      responsesData.push(['ESTATÍSTICAS']);
      responsesData.push(['Respostas reais:', realResponses.length.toString()]);
      responsesData.push(['Respostas simuladas:', simulatedResponses.length.toString()]);
      responsesData.push(['CR Médio (geral):', (avgCRComputed * 100).toFixed(2) + '%']);
      responsesData.push([
        'Respostas consistentes (Maior CR ≤ 10%):',
        `${consistentCount} (${((consistentCount / projectResponses.length) * 100).toFixed(0)}%)`
      ]);

      // Adicionar detalhamento dos julgamentos BOCR (primeira resposta como exemplo)
      responsesData.push(['']);
      responsesData.push(['ESTRUTURA DOS JULGAMENTOS (exemplo)']);
      responsesData.push(['']);
      responsesData.push(['Os julgamentos são realizados em comparações pareadas usando a escala de Saaty (1-9):']);
      responsesData.push(['1 = Igual importância, 3 = Moderada, 5 = Forte, 7 = Muito forte, 9 = Extrema']);
      responsesData.push(['']);
      responsesData.push(['Matrizes coletadas por respondente:']);
      responsesData.push(['- Matriz BOCR (4x4): Compara Benefícios, Oportunidades, Custos, Riscos']);
      responsesData.push(['- Matriz Benefícios (5x5): Compara subcritérios B1 a B5']);
      responsesData.push(['- Matriz Oportunidades (5x5): Compara subcritérios O1 a O5']);
      responsesData.push(['- Matriz Custos (5x5): Compara subcritérios C1 a C5']);
      responsesData.push(['- Matriz Riscos (5x5): Compara subcritérios R1 a R5']);
      responsesData.push(['- Matrizes de Alternativas (2x2 cada): Para cada subcritério']);

      const wsResponses = XLSX.utils.aoa_to_sheet(responsesData);
      wsResponses['!cols'] = [
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, wsResponses, 'Respostas');
    }

    // ===== SHEET 10: METADADOS E REFERÊNCIAS =====
    const metaData = [
      ['METADADOS E REFERÊNCIAS METODOLÓGICAS'],
      [''],
      ['INFORMAÇÕES DO ARQUIVO'],
      ['Gerado em:', new Date().toLocaleString('pt-BR')],
      ['Formato:', 'Microsoft Excel (.xlsx)'],
      ['Sheets:', '10'],
      [''],
      ['METODOLOGIA AHP-BOCR'],
      [''],
      ['O método AHP-BOCR (Analytic Hierarchy Process with Benefits, Opportunities, Costs, Risks)'],
      ['é uma extensão do AHP clássico que considera tanto aspectos positivos quanto negativos.'],
      [''],
      ['ESTRUTURA HIERÁRQUICA'],
      ['Nível 0:', 'Objetivo (Decisão de Investimento)'],
      ['Nível 1:', '4 Méritos (B, O, C, R)'],
      ['Nível 2:', '20 Subcritérios (5 por mérito)'],
      ['Nível 3:', 'Alternativas de decisão'],
      [''],
      ['FÓRMULAS DE SÍNTESE (Saaty & Ozdemir 2003; Wijnmalen 2007; Lee 2009)'],
      ['Adit. Residual:', 'Score = b·B + o·O + c·(1−C) + r·(1−R) — Saaty & Ozdemir (2003); Demirtas & Üstün (2008); Lee (2009, Eq. 13)'],
      ['Q. Somas:', 'Score = (s_b·B + s_o·O) / (s_c·C + s_r·R) — Wijnmalen (2007, Eq. 12)'],
      ['Subtrativo:', 'Score = v_b·s_b·B + v_o·s_o·O − v_c·s_c·C − v_r·s_r·R — Wijnmalen (2007, Eq. 17)'],
      ['Mult. Potências:', 'Score = (B^v_b · O^v_o) / (C^v_c · R^v_r) — Saaty & Ozdemir (2003); Lee (2009, Eq. 15)'],
      ['Mult. Simples:', 'Score = (B · O) / (C · R) — Saaty & Ozdemir (2003); Lee (2009, Eq. 16)'],
      [''],
      ['REFERÊNCIAS'],
      ['SAATY, T.L. (1980). The Analytic Hierarchy Process. McGraw-Hill, New York.'],
      ['WIJNMALEN, D.J.D. (2007). Analysis of benefits, opportunities, costs, and risks (BOCR)'],
      ['  with the AHP-ANP. Mathematical and Computer Modelling, 46(7-8), 892-905.'],
      ['PETRILLO, A.; SALOMON, V.A.P.; TRAMARICO, C.L. (2023). State-of-the-Art Review on'],
      ['  Analytic Hierarchy Process with BOCR. JRFM, 16(8), 372.'],
      [''],
      ['SOFTWARE'],
      ['Sistema:', 'AHP-BOCR Decision Support System v5.0'],
      ['Desenvolvido para:', 'Dissertação de Mestrado em Engenharia de Produção'],
      ['Instituição:', 'UNESP - Universidade Estadual Paulista'],
      ['Campus:', 'Guaratinguetá'],
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
    wsMeta['!cols'] = [{ wch: 20 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Referências');

    // ===== DOWNLOAD =====
    XLSX.writeFile(wb, `resultados_completos_${project.name.replace(/\s+/g, '_')}.xlsx`);
  };

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando resultados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Erro</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!project || !calculation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum Resultado Disponível</h2>
          <p className="text-gray-600 mb-6">
            {!project
              ? 'Projeto não encontrado.'
              : 'Este projeto ainda não possui resultados calculados. Execute uma simulação ou colete respostas reais primeiro.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = '/decisor/projetos'}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Voltar para Projetos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 Resultados da Análise</h1>
              <p className="text-gray-500 text-sm mt-1">{project.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/decisor/projetos'}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Voltar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-2 overflow-x-auto py-1">
            {[
              { id: 'executive', label: '📊 Dashboard Executivo', description: 'Visão geral e KPIs' },
              { id: 'results', label: '📈 Resultados & Análise', description: 'Pesos e rankings' },
              { id: 'quality', label: '✓ Qualidade & Consistência', description: 'CR individual e validação' },
              { id: 'robustness', label: '🔬 Robustez & Validação', description: 'Sensibilidade e confiabilidade' },
              { id: 'review', label: '🤖 Revisão & Documentação', description: 'IA e texto acadêmico' },
              { id: 'export', label: '📥 Exportar & Relatórios', description: 'Downloads e relatórios' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group relative px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ==================================================
            TAB: DASHBOARD EXECUTIVO (Combina Visão Geral + Demographics + Bento Grid)
        ================================================== */}
        {activeTab === 'executive' && (
          <div className="space-y-8">
            {/* Bento Grid Dashboard Principal */}
            <BentoGridDashboard
              projectName={project.name}
              bocrWeights={calculation.bocrWeights}
              finalScores={calculation.finalScores}
              bocrConsistency={calculation.bocrConsistency}
              responseCount={calculation.responseCount}
            />

            {/* Perfil BOCR por Alternativa */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Perfil BOCR por Alternativa</h3>
              <p className="text-sm text-gray-500 mb-4">
                Baseado em Wijnmalen (2007), Lee (2009) e Kabak & Dağdeviren (2014): B e O entram com sinal positivo na síntese subtrativa; C e R entram com sinal negativo (subtraídos). Os eixos representam a contribuição bruta de cada mérito, pré-ponderação. O Score Final aplica os pesos v·s conforme Eq. 17 (Wijnmalen, 2007).
              </p>
              <ChartDownloadWrapper filename="bocr-profile" title="Perfil BOCR por Alternativa">
                <div className="space-y-6">
                  {(() => {
                    // PRÉ-CALCULAR valores BOCR para todas as alternativas
                    const altBOCRData = calculation.finalScores.map((alt) => {
                      let b = alt.B || 0;
                      let o = alt.O || 0;
                      let c = alt.C || 0;
                      let r = alt.R || 0;

                      // Se não tiver valores diretos, calcular a partir de altScores
                      if (b === 0 && o === 0 && c === 0 && r === 0 && calculation.altScores) {
                        const bocrVals = calculateAltBOCR(
                          alt.code,
                          calculation.altScores,
                          calculation.subWeights,
                          calculation.bocrWeights
                        );
                        b = bocrVals.B;
                        o = bocrVals.O;
                        c = bocrVals.C;
                        r = bocrVals.R;
                      }

                      // Se ainda não tiver valores, usar os scores como proxy
                      if (b === 0 && o === 0 && c === 0 && r === 0) {
                        const total = Math.abs(alt.scoreAdditive || 1);
                        b = total * (calculation.bocrWeights[0] || 0.25);
                        o = total * (calculation.bocrWeights[1] || 0.25);
                        c = total * (calculation.bocrWeights[2] || 0.25);
                        r = total * (calculation.bocrWeights[3] || 0.25);
                      }

                      return {
                        name: alt.name,
                        b, o, c, r,
                        positive: b + o,
                        negative: c + r
                      };
                    });

                    // ESCALA GLOBAL - máximo entre todas as alternativas
                    const globalMax = Math.max(
                      ...altBOCRData.map(d => d.positive),
                      ...altBOCRData.map(d => d.negative),
                      0.01
                    );

                    return altBOCRData.map((data, idx) => (
                      <div key={idx} className="relative">
                        <div className="text-sm font-medium text-gray-700 mb-2">{data.name}</div>
                        <div className="flex items-center h-10">
                          {/* Barra agregada C+R — eixo esquerdo */}
                          <div className="flex-1 flex justify-end">
                            <div
                              className="h-8 bg-red-400 rounded-l flex items-center justify-start pl-2"
                              style={{
                                width: `${(data.negative / globalMax) * 100}%`,
                                minWidth: data.negative > 0.001 ? '20px' : '0'
                              }}
                            >
                              {data.negative > 0.01 && (
                                <span className="text-white text-xs font-medium">
                                  C+R: {(data.negative || 0).toFixed(4)}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Centro */}
                          <div className="w-1 h-12 bg-gray-400 flex-shrink-0"></div>
                          {/* Barra agregada B+O — eixo direito */}
                          <div className="flex-1">
                            <div
                              className="h-8 bg-green-400 rounded-r flex items-center justify-end pr-2"
                              style={{
                                width: `${(data.positive / globalMax) * 100}%`,
                                minWidth: data.positive > 0.001 ? '20px' : '0'
                              }}
                            >
                              {data.positive > 0.01 && (
                                <span className="text-white text-xs font-medium">
                                  B+O: {(data.positive || 0).toFixed(4)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Valores individuais B, O, C, R conforme Lee (2009) e Kabak & Dağdeviren (2014) */}
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-600 font-mono">
                          <span><span className="font-semibold text-emerald-600">B</span> = {(data.b || 0).toFixed(4)}</span>
                          <span><span className="font-semibold text-blue-600">O</span> = {(data.o || 0).toFixed(4)}</span>
                          <span><span className="font-semibold text-amber-600">C</span> = {(data.c || 0).toFixed(4)}</span>
                          <span><span className="font-semibold text-rose-600">R</span> = {(data.r || 0).toFixed(4)}</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                <div className="flex justify-center gap-8 mt-4 text-xs text-gray-500">
                  <span>← C + R (Custos + Riscos)</span>
                  <span>B + O (Benefícios + Oportunidades) →</span>
                </div>
              </ChartDownloadWrapper>
            </div>

            {/* Gráfico Radar Comparativo — visualização adaptada de Alizadeh (2020) */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Gráfico de Radar Comparativo</h3>
              <p className="text-sm text-gray-500 mb-4">
                Visualização de trade-offs entre alternativas nos 4 méritos BOCR. Adaptação para BOCR seguindo Alizadeh et al. (2020, Figure 6).
              </p>

              <ChartDownloadWrapper filename="bocr-radar" title="Radar Comparativo BOCR">
                <div className="flex justify-center">
                  <svg viewBox="0 0 500 420" className="w-full max-w-md">
                    {(() => {
                      // CONSTANTES CENTRALIZADAS - garante consistência
                      const CX = 250;  // Centro X
                      const CY = 200;  // Centro Y
                      const MAX_R = 140;  // Raio máximo
                      const ANGLES = [-90, 0, 90, 180];  // Topo, Direita, Baixo, Esquerda

                      const toRad = (deg: number) => (deg * Math.PI) / 180;
                      const getX = (angle: number, r: number) => CX + r * Math.cos(toRad(angle));
                      const getY = (angle: number, r: number) => CY + r * Math.sin(toRad(angle));

                      return (
                        <>
                          {/* Grid concêntrico */}
                          {[0.2, 0.4, 0.6, 0.8, 1.0].map((level, i) => {
                            const r = level * MAX_R;
                            const points = ANGLES.map(angle => `${getX(angle, r)},${getY(angle, r)}`).join(' ');
                            return (
                              <polygon
                                key={i}
                                points={points}
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="1"
                              />
                            );
                          })}

                          {/* Eixos */}
                          {ANGLES.map((angle, i) => (
                            <line
                              key={i}
                              x1={CX}
                              y1={CY}
                              x2={getX(angle, MAX_R)}
                              y2={getY(angle, MAX_R)}
                              stroke="#d1d5db"
                              strokeWidth="1"
                            />
                          ))}

                          {/* Labels */}
                          <text x={CX} y={CY - MAX_R - 15} textAnchor="middle" className="text-sm fill-green-600 font-semibold">Benefícios</text>
                          <text x={CX + MAX_R + 15} y={CY + 5} textAnchor="start" className="text-sm fill-blue-600 font-semibold">Oportunidades</text>
                          <text x={CX} y={CY + MAX_R + 25} textAnchor="middle" className="text-sm fill-orange-600 font-semibold">Custos</text>
                          <text x={CX - MAX_R - 15} y={CY + 5} textAnchor="end" className="text-sm fill-red-600 font-semibold">Riscos</text>

                          {/* Polígonos e pontos das alternativas */}
                          {calculation.finalScores.map((alt, altIdx) => {
                            const b = alt.B || 0;
                            const o = alt.O || 0;
                            const c = alt.C || 0;
                            const altR = alt.R || 0;

                            const maxVal = Math.max(
                              ...calculation.finalScores.flatMap(a => [a.B || 0, a.O || 0, a.C || 0, a.R || 0]),
                              0.01
                            );

                            const values = [b, o, c, altR].map(v => Math.min(v / maxVal, 1));
                            const colors = ['#6366f1', '#a855f7', '#ec4899', '#f97316'];
                            const color = colors[altIdx % colors.length];

                            // Calcular pontos do polígono
                            const polygonPoints = ANGLES.map((angle, i) => {
                              const r = values[i] * MAX_R;
                              return `${getX(angle, r)},${getY(angle, r)}`;
                            }).join(' ');

                            return (
                              <g key={altIdx}>
                                <polygon
                                  points={polygonPoints}
                                  fill={color}
                                  fillOpacity="0.2"
                                  stroke={color}
                                  strokeWidth="2"
                                />
                                {/* Pontos nos vértices - mesmas coordenadas do polígono */}
                                {ANGLES.map((angle, i) => {
                                  const r = values[i] * MAX_R;
                                  return (
                                    <circle
                                      key={i}
                                      cx={getX(angle, r)}
                                      cy={getY(angle, r)}
                                      r="5"
                                      fill={color}
                                      stroke="white"
                                      strokeWidth="1"
                                    />
                                  );
                                })}
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* Legenda */}
                <div className="flex justify-center gap-6 mt-4">
                  {calculation.finalScores.map((alt, idx) => {
                    const colors = ['#6366f1', '#a855f7', '#ec4899', '#f97316'];
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: colors[idx % colors.length] }}
                        ></div>
                        <span className="text-sm text-gray-700">{alt.name}</span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 text-center mt-4">
                  Nota: Quanto maior a área do polígono nos quadrantes B e O, e menor em C e R, melhor o desempenho global.
                </p>
              </ChartDownloadWrapper>
            </div>
          </div>
        )}

        {/* ==================================================
            TAB: PERFIL DEMOGRÁFICO - DASHBOARD VISUAL
        ================================================== */}
        {activeTab === 'executive' && (
          <div className="space-y-6 mt-12 pt-8 border-t border-slate-200">
            {/* Header com Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">👥 Perfil Demográfico dos Especialistas</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Caracterização da amostra (n={respondentsDemographics.length})
                </p>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setDemographicView('dashboard')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${demographicView === 'dashboard'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => setDemographicView('table')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${demographicView === 'table'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  📋 Tabela
                </button>
              </div>
            </div>

            {respondentsDemographics.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-lg text-gray-600 mb-2">Nenhum dado demográfico disponível</p>
                <p className="text-sm text-gray-500">Os respondentes ainda não completaram suas avaliações ou os dados demográficos não foram coletados.</p>
              </div>
            ) : demographicView === 'dashboard' && demographicDashboardData ? (
              /* ========== DASHBOARD VISUAL ========== */
              <div className="space-y-6">
                {/* KPIs no Topo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* KPI Principal */}
                  <div className="md:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-indigo-200 text-sm font-medium">Total de Respondentes</p>
                        <p className="text-5xl font-bold mt-2">{demographicDashboardData.total}</p>
                        <p className="text-indigo-200 text-sm mt-2">especialistas consultados</p>
                      </div>
                      <div className="text-6xl opacity-20">👥</div>
                    </div>
                  </div>

                  {/* KPI Experiência */}
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm">+20 anos experiência</p>
                    {(() => {
                      const experientes = respondentsDemographics.filter(d =>
                        ['21_30', 'mais_30'].includes(d.tempoTrabalho)
                      ).length;
                      const total = respondentsDemographics.length;
                      return (
                        <>
                          <p className="text-3xl font-bold text-gray-800 mt-1">
                            {experientes} <span className="text-lg font-normal text-gray-500">({((experientes / (total || 1)) * 100).toFixed(0)}%)</span>
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                            <span>✓</span> Profissionais experientes
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* KPI Pós-graduados */}
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm">Pós-graduados</p>
                    {(() => {
                      const posGrad = respondentsDemographics.filter(d =>
                        ['especializacao', 'mestrado', 'doutorado'].includes(d.formacao)
                      ).length;
                      const total = respondentsDemographics.length;
                      return (
                        <>
                          <p className="text-3xl font-bold text-indigo-600 mt-1">
                            {posGrad} <span className="text-lg font-normal text-gray-500">({((posGrad / (total || 1)) * 100).toFixed(0)}%)</span>
                          </p>
                          <p className="text-sm text-gray-500 mt-2">Alta qualificação</p>
                        </>
                      );
                    })()}
                  </div>

                  {/* KPI Gestores */}
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm">Gestores (Ger+Dir+C)</p>
                    {(() => {
                      const gestores = respondentsDemographics.filter(d =>
                        ['gerente', 'diretor', 'c_level'].includes(d.funcao)
                      ).length;
                      const total = respondentsDemographics.length;
                      return (
                        <>
                          <p className="text-3xl font-bold text-amber-600 mt-1">
                            {gestores} <span className="text-lg font-normal text-gray-500">({((gestores / (total || 1)) * 100).toFixed(0)}%)</span>
                          </p>
                          <p className="text-sm text-gray-500 mt-2">Poder de decisão</p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Grid de Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gênero - Donut Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span>👤</span> Distribuição por Gênero
                      </h4>
                    </div>
                    <div className="p-5">
                      <ChartDownloadWrapper filename="demographics-gender" title="Distribuição por Gênero">
                        <div className="flex items-center justify-between">
                          <ResponsiveContainer width="50%" height={180}>
                            <PieChart>
                              <Pie
                                data={demographicDashboardData.gender}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {demographicDashboardData.gender.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : '#EC4899'} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) => {
                                  const v = Number(value) || 0;
                                  return [`${v} (${((v / demographicDashboardData.total) * 100).toFixed(1)}%)`, 'Respondentes'];
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-col gap-3 pr-4">
                            {demographicDashboardData.gender.map((item, index) => (
                              <div key={item.name} className="flex items-center gap-3">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: index === 0 ? '#3B82F6' : '#EC4899' }}
                                />
                                <div>
                                  <p className="font-medium text-gray-700">{item.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {item.value} ({((item.value / demographicDashboardData.total) * 100).toFixed(1)}%)
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ChartDownloadWrapper>
                    </div>
                  </div>

                  {/* Faixa Etária - Bar Chart Vertical */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span>📅</span> Distribuição por Faixa Etária
                      </h4>
                    </div>
                    <div className="p-5">
                      <ChartDownloadWrapper filename="demographics-age" title="Distribuição por Faixa Etária">
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={demographicDashboardData.age} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip formatter={(value) => { const v = Number(value) || 0; return [`${v} (${((v / demographicDashboardData.total) * 100).toFixed(1)}%)`, 'Respondentes']; }} />
                            <Bar dataKey="value" fill="#60A5FA" radius={[4, 4, 0, 0]} maxBarSize={50} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartDownloadWrapper>
                    </div>
                  </div>

                  {/* Formação - Bar Chart Horizontal */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span>🎓</span> Nível de Formação Acadêmica
                      </h4>
                    </div>
                    <div className="p-5">
                      <ChartDownloadWrapper filename="demographics-education" title="Nível de Formação Acadêmica">
                        <ResponsiveContainer width="100%" height={demographicDashboardData.education.length * 40 + 20}>
                          <BarChart data={demographicDashboardData.education} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} tickLine={false} axisLine={false} width={90} />
                            <Tooltip formatter={(value) => { const v = Number(value) || 0; return [`${v} (${((v / demographicDashboardData.total) * 100).toFixed(1)}%)`, 'Respondentes']; }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                              {demographicDashboardData.education.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE'][index % 4]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartDownloadWrapper>
                    </div>
                  </div>

                  {/* Experiência - Bar Chart Vertical */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span>⏱️</span> Tempo de Experiência Profissional
                      </h4>
                    </div>
                    <div className="p-5">
                      <ChartDownloadWrapper filename="demographics-experience" title="Tempo de Experiência Profissional">
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={demographicDashboardData.experience} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip formatter={(value) => { const v = Number(value) || 0; return [`${v} (${((v / demographicDashboardData.total) * 100).toFixed(1)}%)`, 'Respondentes']; }} />
                            <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartDownloadWrapper>
                    </div>
                  </div>

                  {/* Cargo - Bar Chart Horizontal (Ordenado) */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span>💼</span> Distribuição por Cargo
                      </h4>
                    </div>
                    <div className="p-5">
                      {(() => {
                        const sortedRoles = [...demographicDashboardData.role].sort((a, b) => b.value - a.value);
                        return (
                          <ChartDownloadWrapper filename="demographics-roles" title="Distribuição por Cargo">
                            <ResponsiveContainer width="100%" height={sortedRoles.length * 40 + 20}>
                              <BarChart data={sortedRoles} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} tickLine={false} axisLine={false} width={90} />
                                <Tooltip formatter={(value) => { const v = Number(value) || 0; return [`${v} (${((v / demographicDashboardData.total) * 100).toFixed(1)}%)`, 'Respondentes']; }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                                  {sortedRoles.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'][index % 5]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartDownloadWrapper>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Área de Atuação - Bar Chart Horizontal (Pareto) */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span>🏭</span> Área de Atuação (Pareto)
                      </h4>
                    </div>
                    <div className="p-5">
                      {(() => {
                        const sortedAreas = [...demographicDashboardData.area].sort((a, b) => b.value - a.value);
                        const areaColors = ['#10B981', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#94A3B8'];
                        return (
                          <ChartDownloadWrapper filename="demographics-areas" title="Área de Atuação">
                            <ResponsiveContainer width="100%" height={sortedAreas.length * 40 + 20}>
                              <BarChart data={sortedAreas} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} tickLine={false} axisLine={false} width={100} />
                                <Tooltip formatter={(value) => { const v = Number(value) || 0; return [`${v} (${((v / demographicDashboardData.total) * 100).toFixed(1)}%)`, 'Respondentes']; }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                                  {sortedAreas.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={areaColors[index % areaColors.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartDownloadWrapper>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Resumo da Amostra */}
                <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl p-6 border border-slate-200">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>📊</span> Resumo da Caracterização Amostral
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    A amostra é composta por <strong>{demographicDashboardData.total} especialistas</strong>
                    {demographicDashboardData.gender.length > 0 && (
                      <>, predominantemente do gênero {demographicDashboardData.gender[0].value > (demographicDashboardData.gender[1]?.value || 0) ? demographicDashboardData.gender[0].name.toLowerCase() : demographicDashboardData.gender[1]?.name.toLowerCase()}
                        ({((Math.max(demographicDashboardData.gender[0].value, demographicDashboardData.gender[1]?.value || 0) / demographicDashboardData.total) * 100).toFixed(0)}%)</>
                    )}
                    {demographicDashboardData.age.length > 0 && (
                      <>. A faixa etária mais representativa é de <strong>{[...demographicDashboardData.age].sort((a, b) => b.value - a.value)[0]?.name}</strong></>
                    )}
                    {(() => {
                      const posGrad = respondentsDemographics.filter(d => ['especializacao', 'mestrado', 'doutorado'].includes(d.formacao)).length;
                      return posGrad > 0 && (
                        <>. Em termos de formação, <strong>{((posGrad / demographicDashboardData.total) * 100).toFixed(0)}%</strong> possuem pós-graduação</>
                      );
                    })()}
                    {demographicDashboardData.area.length > 0 && (
                      <>. A área de <strong>{[...demographicDashboardData.area].sort((a, b) => b.value - a.value)[0]?.name}</strong> concentra a maior parte dos respondentes, validando a aderência da amostra ao contexto de Indústria 4.0 no setor automotivo.</>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              /* ========== TABELA ACADÊMICA CLÁSSICA ========== */
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Título da Tabela */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <p className="text-sm text-gray-800">
                      <strong>Tabela 1</strong> – Caracterização sociodemográfica e profissional dos especialistas participantes (n = {respondentsDemographics.length})
                    </p>
                  </div>

                  {/* Tabela */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      {/* Cabeçalho */}
                      <thead>
                        <tr className="border-t-2 border-b-2 border-gray-800">
                          <th className="px-4 py-3 text-left font-semibold text-gray-800">Variável</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-800">Categoria</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-800 w-16">n</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-800 w-20">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Faixa Etária */}
                        {[
                          { value: 'menos_30', label: 'Menos de 30 anos' },
                          { value: '31_40', label: '31 a 40 anos' },
                          { value: '41_50', label: '41 a 50 anos' },
                          { value: 'mais_50', label: 'Mais de 50 anos' }
                        ].map((opt, idx, arr) => {
                          const count = respondentsDemographics.filter(d => d.idade === opt.value).length;
                          const pct = respondentsDemographics.length > 0 ? (count / respondentsDemographics.length) * 100 : 0;
                          return (
                            <tr key={`idade-${idx}`} className={idx === arr.length - 1 ? 'border-b border-gray-200' : ''}>
                              {idx === 0 && (
                                <td className="px-4 py-2 text-gray-700 font-medium align-top" rowSpan={arr.length}>
                                  Faixa Etária
                                </td>
                              )}
                              <td className="px-4 py-2 text-gray-600">{opt.label}</td>
                              <td className="px-4 py-2 text-center text-gray-700">{count}</td>
                              <td className="px-4 py-2 text-center text-gray-600">{pct.toFixed(1)}</td>
                            </tr>
                          );
                        })}

                        {/* Gênero */}
                        {[
                          { value: 'masculino', label: 'Masculino' },
                          { value: 'feminino', label: 'Feminino' }
                        ].map((opt, idx, arr) => {
                          const count = respondentsDemographics.filter(d => d.genero === opt.value).length;
                          const pct = respondentsDemographics.length > 0 ? (count / respondentsDemographics.length) * 100 : 0;
                          return (
                            <tr key={`genero-${idx}`} className={idx === arr.length - 1 ? 'border-b border-gray-200' : ''}>
                              {idx === 0 && (
                                <td className="px-4 py-2 text-gray-700 font-medium align-top" rowSpan={arr.length}>
                                  Gênero
                                </td>
                              )}
                              <td className="px-4 py-2 text-gray-600">{opt.label}</td>
                              <td className="px-4 py-2 text-center text-gray-700">{count}</td>
                              <td className="px-4 py-2 text-center text-gray-600">{pct.toFixed(1)}</td>
                            </tr>
                          );
                        })}

                        {/* Nível de Formação */}
                        {[
                          { value: 'superior', label: 'Graduação' },
                          { value: 'especializacao', label: 'Especialização / MBA' },
                          { value: 'mestrado', label: 'Mestrado' },
                          { value: 'doutorado', label: 'Doutorado ou superior' }
                        ].map((opt, idx, arr) => {
                          const count = respondentsDemographics.filter(d => d.formacao === opt.value).length;
                          const pct = respondentsDemographics.length > 0 ? (count / respondentsDemographics.length) * 100 : 0;
                          return (
                            <tr key={`formacao-${idx}`} className={idx === arr.length - 1 ? 'border-b border-gray-200' : ''}>
                              {idx === 0 && (
                                <td className="px-4 py-2 text-gray-700 font-medium align-top" rowSpan={arr.length}>
                                  Nível de Formação
                                </td>
                              )}
                              <td className="px-4 py-2 text-gray-600">{opt.label}</td>
                              <td className="px-4 py-2 text-center text-gray-700">{count}</td>
                              <td className="px-4 py-2 text-center text-gray-600">{pct.toFixed(1)}</td>
                            </tr>
                          );
                        })}

                        {/* Tempo de Experiência */}
                        {[
                          { value: 'menos_10', label: 'Menos de 10 anos' },
                          { value: '11_20', label: '11 a 20 anos' },
                          { value: '21_30', label: '21 a 30 anos' },
                          { value: 'mais_30', label: 'Mais de 30 anos' }
                        ].map((opt, idx, arr) => {
                          const count = respondentsDemographics.filter(d => d.tempoTrabalho === opt.value).length;
                          const pct = respondentsDemographics.length > 0 ? (count / respondentsDemographics.length) * 100 : 0;
                          return (
                            <tr key={`exp-${idx}`} className={idx === arr.length - 1 ? 'border-b border-gray-200' : ''}>
                              {idx === 0 && (
                                <td className="px-4 py-2 text-gray-700 font-medium align-top" rowSpan={arr.length}>
                                  Tempo de Experiência
                                </td>
                              )}
                              <td className="px-4 py-2 text-gray-600">{opt.label}</td>
                              <td className="px-4 py-2 text-center text-gray-700">{count}</td>
                              <td className="px-4 py-2 text-center text-gray-600">{pct.toFixed(1)}</td>
                            </tr>
                          );
                        })}

                        {/* Área de Atuação */}
                        {(() => {
                          const options = [
                            { value: 'operacoes', label: 'Operações' },
                            { value: 'manufatura', label: 'Manufatura' },
                            { value: 'qualidade', label: 'Qualidade' },
                            { value: 'financeiro', label: 'Financeiro' },
                            { value: 'otimizacao_custos', label: 'Otimização e Custos' },
                            { value: 'p_and_d', label: 'P&D / Inovação' },
                            { value: 'outro', label: 'Outro' }
                          ];
                          return options.map((opt, idx, arr) => {
                            const count = respondentsDemographics.filter(d => d.areaAtuacao === opt.value).length;
                            const pct = respondentsDemographics.length > 0 ? (count / respondentsDemographics.length) * 100 : 0;
                            return (
                              <tr key={`area-${idx}`} className={idx === arr.length - 1 ? 'border-b border-gray-200' : ''}>
                                {idx === 0 && (
                                  <td className="px-4 py-2 text-gray-700 font-medium align-top" rowSpan={arr.length}>
                                    Área de Atuação
                                  </td>
                                )}
                                <td className="px-4 py-2 text-gray-600">{opt.label}</td>
                                <td className="px-4 py-2 text-center text-gray-700">{count}</td>
                                <td className="px-4 py-2 text-center text-gray-600">{pct.toFixed(1)}</td>
                              </tr>
                            );
                          });
                        })()}

                        {/* Função / Cargo */}
                        {(() => {
                          const options = [
                            { value: 'c_level', label: 'C-Level (CEO, CFO, CTO)' },
                            { value: 'diretor', label: 'Diretor' },
                            { value: 'gerente', label: 'Gerente' },
                            { value: 'supervisor', label: 'Supervisor / Coordenador' },
                            { value: 'outro', label: 'Outro' }
                          ];
                          return options.map((opt, idx, arr) => {
                            const count = respondentsDemographics.filter(d => d.funcao === opt.value).length;
                            const pct = respondentsDemographics.length > 0 ? (count / respondentsDemographics.length) * 100 : 0;
                            return (
                              <tr key={`funcao-${idx}`}>
                                {idx === 0 && (
                                  <td className="px-4 py-2 text-gray-700 font-medium align-top" rowSpan={arr.length}>
                                    Cargo / Função
                                  </td>
                                )}
                                <td className="px-4 py-2 text-gray-600">{opt.label}</td>
                                <td className="px-4 py-2 text-center text-gray-700">{count}</td>
                                <td className="px-4 py-2 text-center text-gray-600">{pct.toFixed(1)}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>

                      {/* Rodapé */}
                      <tfoot>
                        <tr className="border-t-2 border-gray-800">
                          <td colSpan={2} className="px-4 py-3 text-gray-800 font-semibold">
                            Total
                          </td>
                          <td className="px-4 py-3 text-center text-gray-800 font-semibold">
                            {respondentsDemographics.length}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-800 font-semibold">
                            100,0
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Nota de Rodapé */}
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      <strong>Fonte:</strong> Dados primários da pesquisa ({new Date().getFullYear()}).
                    </p>
                  </div>
                </div>

                {/* Nota metodológica sobre exclusões (visível apenas se houver excluídos) */}
                {excludedIds.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mt-4">
                    <strong>⚠️ Nota metodológica:</strong> Dos {respondentsDemographics.length} especialistas consultados,
                    {' '}{respondentsDemographics.length - excludedIds.length} foram incluídos na análise final
                    após filtragem por consistência (CR ≤ 0.10, Saaty 1977).
                    {' '}{excludedIds.length} respondente{excludedIds.length > 1 ? 's' : ''}
                    {' '}fo{excludedIds.length > 1 ? 'ram' : 'i'} excluído{excludedIds.length > 1 ? 's' : ''} por
                    apresentar{excludedIds.length > 1 ? 'em' : ''} índice de consistência acima do limiar aceitável.
                  </div>
                )}

                {/* Rejeição por incompletude. Frase PRÓPRIA, e não herda a
                    justificativa por CR acima: uma é decisão metodológica do
                    gestor, a outra é dado inválido recusado pelo sistema. */}
                {(calculation?.metadata?.rejectedIncomplete?.length ?? 0) > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 mt-4">
                    <strong>⚠️ Respostas incompletas, recusadas pelo sistema:</strong>{' '}
                    {calculation!.metadata!.rejectedIncomplete!.length} resposta
                    {calculation!.metadata!.rejectedIncomplete!.length > 1 ? 's' : ''} não
                    {calculation!.metadata!.rejectedIncomplete!.length > 1 ? ' entraram' : ' entrou'} no
                    cálculo por não ter todas as comparações respondidas. Não é exclusão por
                    consistência: é dado incompleto, e não depende de decisão metodológica.
                    <ul className="list-disc list-inside mt-2">
                      {calculation!.metadata!.rejectedIncomplete!.map((r: any) => (
                        <li key={r.respondentId}>
                          {r.respondentId}: {r.matrizes.join('; ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ==================================================
            TAB: QUALIDADE DOS DADOS
        ================================================== */}
        {activeTab === 'quality' && (
          <div className="space-y-6">


            {/* ========================================
                SEÇÃO 2: ANÁLISE DE QUALIDADE
            ======================================== */}
            {/* Header */}


            {/* Resultados da Análise */}
            {qualityAnalysis && (
              <>


                {/* ============================================ */}
                {/* TABELA UNIFICADA DE RESPONDENTES             */}
                {/* ============================================ */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-800">👥 Análise Individual dos Especialistas</h4>
                    <p className="text-sm text-gray-500">
                      Tabela de CR por respondente
                    </p>
                  </div>

                  {/* Barra de Ações (exclusão em lote) */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {selectedForExclusion.length > 0 && (
                        <span className="text-sm text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                          {selectedForExclusion.length} selecionado(s)
                        </span>
                      )}
                      {excludedIds.length > 0 && (
                        <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                          ⚠️ {excludedIds.length} excluído(s)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedForExclusion.length > 0 && (
                        <button
                          onClick={handleBatchExclusion}
                          disabled={isRecalculating}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                          🗑 Excluir {selectedForExclusion.length} Resposta(s)
                        </button>
                      )}
                      {excludedIds.length > 0 && (
                        <button
                          onClick={handleRestoreAll}
                          disabled={isRecalculating}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50"
                        >
                          ↩ Restaurar Todos ({excludedIds.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabela */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-3 text-center w-10">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Selecionar apenas os não excluídos
                                  const allActiveIds = getRespondentsList
                                    .filter((r: any) => !excludedIds.includes(r.respondentId))
                                    .map((r: any) => r.respondentId);
                                  setSelectedForExclusion(allActiveIds);
                                } else {
                                  setSelectedForExclusion([]);
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                              title="Selecionar todos"
                            />
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">ID Respondente</th>
                          {MATRIZES_CR.map(m => (
                            <th key={m} className="px-2 py-3 text-center font-semibold text-gray-700">{m}</th>
                          ))}
                          <th className="px-3 py-3 text-center font-semibold text-gray-700">CR governante</th>
                          <th className="px-3 py-3 text-center font-semibold text-gray-700">Matriz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...getRespondentsList]
                          .sort((a: any, b: any) => (b.cr ?? -1) - (a.cr ?? -1))
                          .map((r: any, idx: number) => {
                            const isExcluded = excludedIds.includes(r.respondentId);
                            const isSelected = selectedForExclusion.includes(r.respondentId);

                            return (
                              <tr key={idx} className={`border-t ${isExcluded ? 'opacity-40 bg-gray-50' : ''}`}>
                                {/* Checkbox */}
                                <td className="px-3 py-3 text-center">
                                  {isExcluded ? (
                                    <span className="text-xs text-red-400">—</span>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleSelection(r.respondentId)}
                                      disabled={isRecalculating}
                                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                                    />
                                  )}
                                </td>

                                {/* ID / Email */}
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm truncate max-w-[220px]" title={respondentEmails[r.respondentId] || r.respondentId}>
                                      {respondentEmails[r.respondentId] || r.respondentId}
                                    </span>
                                    {respondentEmails[r.respondentId] && (
                                      <span className="text-xs text-gray-400 font-mono">#{r.respondentId?.slice(-6)}</span>
                                    )}
                                  </div>
                                  {isExcluded && <span className="ml-2 text-red-500 font-medium text-xs">(Excluído)</span>}
                                </td>

                                {/* Os seis CRs. Travessão = CR indefinido, nunca zero. Marcador de UI, não prosa. */}
                                {MATRIZES_CR.map(m => {
                                  const v = r.crs?.[m] ?? null;
                                  return (
                                    <td key={m} className={`px-2 py-3 text-center font-mono text-xs ${v === null ? 'text-gray-300' : v > 0.10 ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                      {v === null ? '—' : `${fmtCR(v)}%`}
                                    </td>
                                  );
                                })}

                                {/* CR governante = máximo das seis */}
                                <td className={`px-3 py-3 text-center font-mono font-bold ${r.cr === null ? 'text-gray-300' : r.cr > 0.10 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                  {r.cr === null ? '—' : `${fmtCR(r.cr)}%`}
                                </td>

                                {/* Matriz que governou */}
                                <td className="px-3 py-3 text-center text-xs text-gray-600">
                                  {r.matrizGov ?? '—'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Referência metodológica */}
                  <p className="mt-4 text-xs text-gray-400">
                    CR &le; 10% é o limiar de aceitação recomendado por Saaty (1977). CR governante é o maior entre as seis matrizes não triviais do respondente.
                  </p>
                </div>


              </>
            )}

            {/* Estado inicial */}
            {!qualityAnalysis && !qualityLoading && (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-gray-600 mb-2">
                  {projectResponses.length > 0
                    ? `${projectResponses.length} respostas disponíveis para análise`
                    : 'Nenhuma resposta encontrada para este projeto'}
                </p>
                <p className="text-sm text-gray-500">
                  Clique em "Analisar Qualidade" para identificar respostas suspeitas
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================================================
            TAB: CONSISTÊNCIA
        ================================================== */}
        {activeTab === 'quality' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Dashboard de Consistência</h3>
              <p className="text-sm text-gray-500 mb-4">
                Índice de Consistência (CR) ≤ 10% é aceitável segundo Saaty (1977).
                Resultados em <span className="text-red-600 font-medium">vermelho</span> requerem revisão.
              </p>

              {/* Gauge Visual - Consistência Global */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="flex items-center justify-center">
                  <ChartDownloadWrapper filename="consistency-gauge" title="Consistência Global (CR)">
                    <ConsistencyGaugeChart
                      cr={calculation.bocrConsistency.cr}
                      lambda={calculation.bocrConsistency.lambda}
                      ci={calculation.bocrConsistency.ci}
                      height={280}
                      showDetails={true}
                    />
                  </ChartDownloadWrapper>
                </div>
                <div className="flex flex-col justify-center space-y-4">
                  <h4 className="font-semibold text-gray-800">Interpretação do CR</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-emerald-500" />
                      <div>
                        <p className="font-medium text-emerald-800">CR ≤ 10%</p>
                        <p className="text-xs text-emerald-600">Consistência aceitável</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-amber-500" />
                      <div>
                        <p className="font-medium text-amber-800">10% &lt; CR ≤ 15%</p>
                        <p className="text-xs text-amber-600">Consistência marginal - considere revisão</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                      <div>
                        <p className="font-medium text-red-800">CR &gt; 15%</p>
                        <p className="text-xs text-red-600">Inconsistência alta - revisão necessária</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </div>
            {/* ============================================================
                Tabela de Consistência das 6 matrizes agregadas
                Saaty (1977) — Decisão D4 do projeto
                ============================================================ */}
            <BOCRConsistencyMatrix
              bocrConsistency={calculation.bocrConsistency}
              magnitudeConsistency={calculation.magnitudeConsistency}
              subConsistency={calculation.subConsistency}
            />
          </div>
        )}

        {/* ==================================================
            TAB: PESOS
        ================================================== */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* Sunburst - Hierarquia BOCR Interativa */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Vetor de Prioridades Estratégicas (BOCR)
              </h3>
              <ChartDownloadWrapper filename="bocr-sunburst" title="Vetor de Prioridades Estratégicas (BOCR)">
                <BOCRSunburstChart
                  bocrWeights={calculation.bocrWeights}
                  subWeights={calculation.subWeights}
                  height={550}
                  showLabels={true}
                />
              </ChartDownloadWrapper>
              <p className="text-xs text-gray-500 mt-2 italic">
                ℹ️ Os percentuais exibidos representam os pesos pessoais (v) derivados da hierarquia de controle. Na Equação 17 de Wijnmalen (2007), são multiplicados pelos rescaling weights (s) para compor os pesos efetivos (v·s) usados na síntese subtrativa.
              </p>
            </div>

            {/* Pesos dos Subcritérios */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Pesos Globais dos Subcritérios</h3>

              <div className="grid md:grid-cols-2 gap-6">
                {['B', 'O', 'C', 'R'].map(merit => {
                  const weights = calculation.subWeights[merit];
                  if (!weights) return null;

                  const meritName = { B: 'Benefícios', O: 'Oportunidades', C: 'Custos', R: 'Riscos' }[merit];
                  const subs = SUBCRITERIA.filter(s => s.group === merit);
                  const meritWeight = calculation.bocrWeights[['B', 'O', 'C', 'R'].indexOf(merit)] || 0;

                  return (
                    <div key={merit} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-3">{meritName}</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 text-xs">
                            <th className="text-left pb-2">Subcritério</th>
                            <th className="text-right pb-2">Local</th>
                            <th className="text-right pb-2">Global</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.map((sub, idx) => {
                            const localWeight = weights[idx] || 0;
                            const globalWeight = localWeight * meritWeight;
                            return (
                              <tr key={sub.code} className="border-t">
                                <td className="py-2">{sub.name}</td>
                                <td className="py-2 text-right font-mono text-gray-600">{(localWeight * 100).toFixed(1)}%</td>
                                <td className="py-2 text-right font-mono font-medium">{(globalWeight * 100).toFixed(2)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>


              {/* TABELA BOCR PRIORITIES */}
              {calculation.bocrPrioritiesTable && (
                <div className="mt-8 bg-slate-50 rounded-xl p-6">
                  <BOCRPrioritiesTable
                    priorities={calculation.bocrPrioritiesTable}
                    showReciprocals={true}
                  />
                </div>
              )}

              {/* ALERTA DE PRIORIDADES NEGATIVAS */}
              {calculation.alerts?.hasNegativePriorities && (
                <div className="mt-8">
                  <NegativePriorityAlert
                    negativeAlternatives={calculation.alerts.negativeAlternatives}
                    totalAlternatives={calculation.finalScores.length}
                  />
                </div>
              )}

              {/* TABELA COMPARATIVA DE MÉTODOS */}
              {calculation.finalScores && (
                <div className="mt-8 bg-slate-50 rounded-xl p-6">
                  <MethodComparisonTable
                    scores={calculation.finalScores}
                    concordance={calculation.methodConcordance}
                  />
                </div>
              )}

              {/* ANÁLISE DE SENSIBILIDADE (REMOVIDO - DUPLICIDADE) */}
              {/* O componente foi movido para a aba Robustez conforme solicitação do usuário */}

              {/* Nota sobre Normalização e Referências */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Convenções e Referências:</strong><br />
                  • <strong>⭐ Subtrativo (Principal):</strong> v<sub>b</sub>·s<sub>b</sub>·B + v<sub>o</sub>·s<sub>o</sub>·O − v<sub>c</sub>·s<sub>c</sub>·C − v<sub>r</sub>·s<sub>r</sub>·R. Valor líquido (pode ser negativo); v = pesos pessoais, s = rescaling weights. <em>Wijnmalen (2007, Eq. 17)</em><br />
                  • <strong>Quociente de Somas:</strong> (s<sub>b</sub>·B + s<sub>o</sub>·O) / (s<sub>c</sub>·C + s<sub>r</sub>·R). Razão benefício-custo com rescaling weights. <em>Wijnmalen (2007, Eq. 12)</em><br />
                  • <strong>Adit. Residual:</strong> b·B + o·O + c·(1−C) + r·(1−R). Probabilistic additive; sempre positivo. <em>Saaty & Ozdemir (2003); Lee (2009, Eq. 13); Demirtas & Üstün (2008)</em><br />
                  • <strong>Mult. Potências:</strong> (B<sup>v<sub>b</sub></sup>·O<sup>v<sub>o</sub></sup>) / (C<sup>v<sub>c</sub></sup>·R<sup>v<sub>r</sub></sup>). Tradeoff exponencial. <em>Saaty & Ozdemir (2003); Lee (2009, Eq. 15)</em><br />
                  • <strong>Mult. Simples:</strong> (B·O) / (C·R). Sem pesos dos méritos; benchmarking. <em>Saaty & Ozdemir (2003); Lee (2009, Eq. 16)</em>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            TAB: SENSIBILIDADE
        ================================================== */}
        {activeTab === 'robustness' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Análise de Sensibilidade</h3>
              <p className="text-sm text-gray-500 mb-4">
                Mostra como o ranking mudaria se os pesos dos méritos fossem alterados.
                Pontos de inflexão indicam onde ocorreria inversão no ranking.
              </p>

              <ChartDownloadWrapper filename="sensitivity-analysis" title="Análise de Sensibilidade">
                <SensitivityAnalysisPanel
                  sensitivityAnalysis={(calculation.sensitivityAnalysis || []).map((item, idx) => ({
                    ...item,
                    currentWeight: item.currentWeight ?? (
                      item.merit === 'B' ? (calculation.bocrWeights[0] || 0) * 100 :
                        item.merit === 'O' ? (calculation.bocrWeights[1] || 0) * 100 :
                          item.merit === 'C' ? (calculation.bocrWeights[2] || 0) * 100 :
                            item.merit === 'R' ? (calculation.bocrWeights[3] || 0) * 100 : undefined
                    )
                  }))}
                  sensitivityTrajectories={sensitivityTrajectories}
                  currentWinner={calculation.ranking?.[0]?.code || ''}
                />
              </ChartDownloadWrapper>
            </div>

            {/* Implicações Práticas da Sensibilidade */}
            {(() => {
              const meritLabels = ['B', 'O', 'C', 'R'];
              const meritNames = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
              const criticalMetrics = meritLabels.filter(m => {
                const inf = calculation.sensitivityInflections?.[m];
                return inf !== null && inf !== undefined && inf <= 10;
              }).map(m => meritNames[meritLabels.indexOf(m)]);

              const sensitiveMetrics = meritLabels.filter(m => {
                const inf = calculation.sensitivityInflections?.[m];
                return inf !== null && inf !== undefined && inf > 10 && inf <= 20;
              }).map(m => meritNames[meritLabels.indexOf(m)]);

              const isRobust = criticalMetrics.length === 0 && sensitiveMetrics.length === 0;

              return (
                <div className={`rounded-xl shadow-sm p-6 ${isRobust ? 'bg-green-50 border border-green-200' :
                  criticalMetrics.length > 0 ? 'bg-red-50 border border-red-200' :
                    'bg-amber-50 border border-amber-200'
                  }`}>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    {isRobust ? '✅' : criticalMetrics.length > 0 ? '⚠️' : '📊'}
                    Implicações Práticas da Sensibilidade
                  </h3>

                  {isRobust ? (
                    <div className="space-y-3">
                      <p className="text-green-800 font-medium">
                        O ranking é robusto: variações de até ±20% nos pesos BOCR não alteram a recomendação.
                      </p>
                      <p className="text-green-700 text-sm">
                        A decisão pode ser implementada com confiança nas premissas atuais do modelo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {criticalMetrics.length > 0 && (
                        <div className="p-3 bg-red-100 rounded-lg">
                          <p className="text-red-800 font-medium">
                            ⚠️ CRÍTICO: Pequenas mudanças (≤10%) nos pesos de {criticalMetrics.join(', ')} podem inverter a recomendação.
                          </p>
                          <p className="text-red-700 text-sm mt-1">
                            Recomenda-se revisão cuidadosa destes pesos antes da decisão final.
                          </p>
                        </div>
                      )}
                      {sensitiveMetrics.length > 0 && (
                        <div className="p-3 bg-amber-100 rounded-lg">
                          <p className="text-amber-800 font-medium">
                            📊 SENSÍVEL: Mudanças moderadas (10-20%) nos pesos de {sensitiveMetrics.join(', ')} podem afetar o resultado.
                          </p>
                          <p className="text-amber-700 text-sm mt-1">
                            Monitoramento periódico das premissas é recomendado.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Análise de Desempate (quando diferença < 5%) */}
            {(() => {
              // CORRIGIDO: Usar scoreSubtractiveNorm (método principal com consenso)
              const sorted = [...(calculation.finalScores || [])].sort((a, b) =>
                (b.scoreSubtractiveNorm ?? b.scoreSubtractive ?? 0) - (a.scoreSubtractiveNorm ?? a.scoreSubtractive ?? 0)
              );
              const first = sorted[0];
              const second = sorted[1];

              if (!first || !second) return null;

              const firstScore = first.scoreSubtractiveNorm ?? first.scoreSubtractive ?? 0;
              const secondScore = second.scoreSubtractiveNorm ?? second.scoreSubtractive ?? 0;
              const diff = Math.abs(firstScore - secondScore) * 100;

              if (diff >= 5) return null;

              const firstPositive = (first.B || 0) + (first.O || 0);
              const secondPositive = (second.B || 0) + (second.O || 0);
              const firstNegative = (first.C || 0) + (first.R || 0);
              const secondNegative = (second.C || 0) + (second.R || 0);

              return (
                <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-indigo-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    ⚖️ Análise de Desempate
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                      Diferença &lt; 5%
                    </span>
                  </h3>

                  <p className="text-sm text-gray-600 mb-4">
                    Como a diferença entre as alternativas é marginal ({diff.toFixed(2)}%), apresentamos critérios adicionais para auxiliar na decisão:
                  </p>

                  {/* Tabela de Comparação */}
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Critério</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">{first.name}</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">{second.name}</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Vantagem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="px-4 py-3 text-gray-600">Score Final (Subtrativo)</td>
                          <td className="px-4 py-3 text-center font-mono">{firstScore.toFixed(4)}</td>
                          <td className="px-4 py-3 text-center font-mono">{secondScore.toFixed(4)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{first.name}</span>
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">Aspectos Positivos (B+O)</td>
                          <td className="px-4 py-3 text-center font-mono">{firstPositive.toFixed(4)}</td>
                          <td className="px-4 py-3 text-center font-mono">{secondPositive.toFixed(4)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${firstPositive > secondPositive ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {firstPositive > secondPositive ? first.name : second.name}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-600">Aspectos Negativos (C+R)</td>
                          <td className="px-4 py-3 text-center font-mono">{firstNegative.toFixed(4)}</td>
                          <td className="px-4 py-3 text-center font-mono">{secondNegative.toFixed(4)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${firstNegative < secondNegative ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {firstNegative < secondNegative ? first.name : second.name} (menor)
                            </span>
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">Benefícios (B)</td>
                          <td className="px-4 py-3 text-center font-mono">{(first.B || 0).toFixed(4)}</td>
                          <td className="px-4 py-3 text-center font-mono">{(second.B || 0).toFixed(4)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${(first.B || 0) > (second.B || 0) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {(first.B || 0) > (second.B || 0) ? first.name : second.name}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-600">Riscos (R) - menor é melhor</td>
                          <td className="px-4 py-3 text-center font-mono">{(first.R || 0).toFixed(4)}</td>
                          <td className="px-4 py-3 text-center font-mono">{(second.R || 0).toFixed(4)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${(first.R || 0) < (second.R || 0) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {(first.R || 0) < (second.R || 0) ? first.name : second.name}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Recomendação */}
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <h4 className="font-semibold text-indigo-800 mb-2">💡 Recomendação de Desempate</h4>
                    <p className="text-indigo-700 text-sm">
                      {firstPositive > secondPositive && firstNegative <= secondNegative ? (
                        <><strong>{first.name}</strong> apresenta perfil mais favorável: maiores benefícios/oportunidades E menores custos/riscos.</>
                      ) : firstPositive > secondPositive ? (
                        <><strong>{first.name}</strong> tem vantagem em aspectos positivos (B+O), mas <strong>{second.name}</strong> tem menores aspectos negativos (C+R). A decisão depende do perfil de risco do decisor.</>
                      ) : (
                        <>As alternativas são genuinamente equivalentes. A decisão pode considerar fatores não modelados (facilidade de implementação, preferências organizacionais, timing, etc.).</>
                      )}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* ==================================================
                SUMÁRIO DE VALIDAÇÃO - Interpretação Automática
            ================================================== */}
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-indigo-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="text-2xl">🎯</span> Sumário de Validação
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Interpretação automática baseada na análise crítica da literatura BOCR
              </p>

              {(() => {
                // Preparar dados para interpretação
                const sortedAlts = [...(calculation.finalScores || [])]
                  .sort((a, b) => (b.scoreSubtractive || b.scoreSubtractiveNorm || 0) - (a.scoreSubtractive || a.scoreSubtractiveNorm || 0));
                const winner = sortedAlts[0];
                const second = sortedAlts[1];

                // FIX BUG 2: Usar scores brutos para calcular gap real (evita inflação do min-max)
                const winnerScore = winner?.scoreSubtractive ?? 0;
                const secondScore = second?.scoreSubtractive ?? 0;

                // Usar funções do knowledge.ts
                const gapAnalysis = interpretDominanceGap(winnerScore, secondScore);

                // Consistência
                const avgCR = calculation.bocrConsistency?.cr || 0;
                const crAnalysis = interpretConsistencyRatio(avgCR);

                // Sensibilidade
                const sensitivityResults = ['B', 'O', 'C', 'R'].map(merit => ({
                  merit,
                  name: MERIT_LABELS[merit]?.name || merit,
                  ...interpretSensitivity(
                    calculation.sensitivityInflections?.[merit] ?? null,
                    MERIT_LABELS[merit]?.name || merit
                  )
                }));

                // FIX BUG 1: Contar todos os status não-robustos (crítico, sensível, moderado)
                const nonRobustMerits = sensitivityResults.filter(s =>
                  ['critical', 'sensitive', 'moderate'].includes(s.status)
                );
                const hasCritical = sensitivityResults.some(s => s.status === 'critical');
                const robustMerits = sensitivityResults.filter(s => s.status === 'robust');

                // Concordância entre métodos
                const methodsConfig = [
                  { id: 'subtractive', key: 'scoreSubtractive' },
                  { id: 'additiveResidual', key: 'scoreAdditiveResidual' },
                  { id: 'multiplicative', key: 'scoreMultiplicative' },
                  // TODO pós-defesa: refatorar id para 'quotientSums'. Mantido como
                  // 'reciprocal' por compatibilidade interna. Representa o método
                  // Q. Somas (Wijnmalen 2007, Eq. 12) — ver scoreQuotientSums em
                  // calculate/route.ts.
                  { id: 'reciprocal', key: 'scoreQuotientSums' },
                  { id: 'multSimple', key: 'scoreMultSimple' }
                ];

                const rankings: Record<string, string[]> = {};
                methodsConfig.forEach(config => {
                  const sorted = [...(calculation.finalScores || [])]
                    .sort((a, b) => {
                      // Tentar encontrar score na propriedade direta ou no objeto scores
                      const scoreA = (a as any)[config.key] ?? (a as any)[config.key + 'Norm'] ?? 0;
                      const scoreB = (b as any)[config.key] ?? (b as any)[config.key + 'Norm'] ?? 0;
                      return scoreB - scoreA;
                    });
                  rankings[config.id] = sorted.map(s => s.code || s.name);
                });
                const methodAgreement = interpretMethodAgreement(rankings);

                // Score negativo?
                const negativeScores = calculation.finalScores?.filter(
                  (s: any) => (s.scoreSubtractive || 0) < 0
                ) || [];

                return (
                  <div className="space-y-4">
                    {/* Indicadores Principais */}
                    <div className="grid md:grid-cols-4 gap-4">
                      {/* Resultado Principal */}
                      <div className={`p-4 rounded-lg border-2 ${gapAnalysis.status === 'clear' ? 'border-emerald-300 bg-emerald-50' :
                        gapAnalysis.status === 'moderate' ? 'border-blue-300 bg-blue-50' :
                          'border-amber-300 bg-amber-50'
                        }`}>
                        <div className="text-xs text-gray-500 mb-1">Dominância</div>
                        <div className="text-2xl font-bold text-gray-800">{(gapAnalysis?.gap || 0).toFixed(1)}%</div>
                        <div className={`text-sm font-medium ${gapAnalysis.status === 'clear' ? 'text-emerald-700' :
                          gapAnalysis.status === 'moderate' ? 'text-blue-700' :
                            'text-amber-700'
                          }`}>
                          {gapAnalysis.status === 'clear' ? '✅ Clara' :
                            gapAnalysis.status === 'moderate' ? '👍 Moderada' : '⚠️ Empate'}
                        </div>
                      </div>

                      {/* Consistência */}
                      <div className={`p-4 rounded-lg border-2 ${crAnalysis.status === 'excellent' ? 'border-emerald-300 bg-emerald-50' :
                        crAnalysis.status === 'acceptable' ? 'border-blue-300 bg-blue-50' :
                          'border-red-300 bg-red-50'
                        }`}>
                        <div className="text-xs text-gray-500 mb-1">Consistência (CR)</div>
                        <div className="text-2xl font-bold text-gray-800">{(avgCR * 100).toFixed(1)}%</div>
                        <div className={`text-sm font-medium ${crAnalysis.status === 'excellent' ? 'text-emerald-700' :
                          crAnalysis.status === 'acceptable' ? 'text-blue-700' :
                            'text-red-700'
                          }`}>
                          {crAnalysis.status === 'excellent' ? '✅ Excelente' :
                            crAnalysis.status === 'acceptable' ? '👍 Aceitável' : '❌ Inconsistente'}
                        </div>
                      </div>

                      {/* Concordância Métodos */}
                      <div className={`p-4 rounded-lg border-2 ${methodAgreement.agreementLevel === 'full' ? 'border-emerald-300 bg-emerald-50' :
                        methodAgreement.agreementLevel === 'majority' ? 'border-blue-300 bg-blue-50' :
                          'border-amber-300 bg-amber-50'
                        }`}>
                        <div className="text-xs text-gray-500 mb-1">Concordância</div>
                        <div className="text-2xl font-bold text-gray-800">{(methodAgreement?.percentage || 0).toFixed(0)}%</div>
                        <div className={`text-sm font-medium ${methodAgreement.agreementLevel === 'full' ? 'text-emerald-700' :
                          methodAgreement.agreementLevel === 'majority' ? 'text-blue-700' :
                            'text-amber-700'
                          }`}>
                          {methodAgreement.agreementLevel === 'full' ? '✅ Total' :
                            methodAgreement.agreementLevel === 'majority' ? '👍 Majoritária' : '⚠️ Parcial'}
                        </div>
                      </div>

                      {/* Robustez */}
                      <div className={`p-4 rounded-lg border-2 ${nonRobustMerits.length === 0 ? 'border-emerald-300 bg-emerald-50' :
                        !hasCritical ? 'border-amber-300 bg-amber-50' :
                          'border-red-300 bg-red-50'
                        }`}>
                        <div className="text-xs text-gray-500 mb-1">Sensibilidade</div>
                        <div className="text-2xl font-bold text-gray-800">{nonRobustMerits.length}/4</div>
                        <div className={`text-sm font-medium ${nonRobustMerits.length === 0 ? 'text-emerald-700' :
                          !hasCritical ? 'text-amber-700' :
                            'text-red-700'
                          }`}>
                          {hasCritical ? '❌ Crítico' :
                            nonRobustMerits.length > 0 ? '⚠️ Sensível' :
                              '✅ Robusto'}
                        </div>
                      </div>
                    </div>

                    {/* Interpretação Textual Automática */}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span>📝</span> Interpretação Automática
                      </h4>
                      <div className="space-y-3 text-sm text-gray-700">
                        {/* Resultado Principal */}
                        <p>
                          <strong>Resultado:</strong> A alternativa <strong className="text-emerald-700">"{winner?.name}"</strong> é
                          a recomendação pelo método Subtrativo (consenso na literatura), com score
                          normalizado de <strong>{(winnerScore * 100).toFixed(1)}%</strong>.
                          {gapAnalysis.status === 'clear' && (
                            <span className="text-emerald-600"> Dominância clara com gap de {(gapAnalysis?.gap || 0).toFixed(1)}% sobre o segundo colocado.</span>
                          )}
                          {gapAnalysis.status === 'tie' && (
                            <span className="text-amber-600"> ⚠️ Empate técnico - considerar análise qualitativa adicional.</span>
                          )}
                        </p>

                        {/* Consistência */}
                        <p>
                          <strong>Qualidade dos dados:</strong> {crAnalysis.message}
                          {crAnalysis.status === 'critical' && (
                            <span className="text-red-600"> Recomenda-se revisão dos julgamentos inconsistentes.</span>
                          )}
                        </p>

                        {/* Concordância */}
                        <p>
                          <strong>Validação cruzada:</strong> {(methodAgreement?.percentage || 0).toFixed(0)}% dos métodos
                          ({methodsConfig.length - methodAgreement.divergences.length} de {methodsConfig.length})
                          concordam com a recomendação.
                          {methodAgreement.agreementLevel === 'full' && (
                            <span className="text-emerald-600"> Alta confiança na decisão.</span>
                          )}
                          {methodAgreement.divergences.length > 0 && (
                            <span className="text-gray-500"> Métodos divergentes: {methodAgreement.divergences.join(', ')}.</span>
                          )}
                        </p>

                        {/* Sensibilidade */}
                        {(() => {
                          if (hasCritical) {
                            const criticalNames = sensitivityResults
                              .filter(s => s.status === 'critical')
                              .map(s => `${s.name} (${s.inflectionPoint}%)`)
                              .join(', ');
                            return (
                              <p className="text-red-700">
                                <strong>⚠️ ATENÇÃO:</strong> {nonRobustMerits.length} de {sensitivityResults.length} méritos apresentam sensibilidade.
                                Pontos de inflexão críticos em: {criticalNames}. Pequenas variações podem inverter o ranking.
                              </p>
                            );
                          } else if (nonRobustMerits.length > 0) {
                            return (
                              <p className="text-amber-700">
                                <strong>⚠️ Atenção:</strong> O ranking apresenta sensibilidade moderada em {nonRobustMerits.length} de {sensitivityResults.length} méritos.
                              </p>
                            );
                          } else {
                            return (
                              <p className="text-emerald-700">
                                <strong>✅ Robustez:</strong> O ranking é estável para variações nos pesos BOCR.
                              </p>
                            );
                          }
                        })()}

                        {/* Scores Negativos */}
                        {negativeScores.length > 0 && (
                          <p className="text-red-700">
                            <strong>⚠️ Alerta:</strong> {negativeScores.length} alternativa(s) apresentam score
                            subtrativo negativo ({negativeScores.map((s: any) => s.name).join(', ')}),
                            indicando que custos e riscos superam os benefícios esperados.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Fundamentação Metodológica Resumida */}
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <h4 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                        <span>📚</span> Fundamentação Metodológica
                      </h4>
                      <p className="text-sm text-indigo-700">
                        O método <strong>Subtrativo</strong> (Score = v<sub>b</sub>·s<sub>b</sub>·B + v<sub>o</sub>·s<sub>o</sub>·O − v<sub>c</sub>·s<sub>c</sub>·C − v<sub>r</sub>·s<sub>r</sub>·R) foi utilizado
                        como principal por sua <strong>coerência matemática</strong> (Wijnmalen, 2007, Eq. 17), aplicação validada em Demirtas & Üstün (2008) e inclusão no state-of-the-art de Petrillo et al. (2023):
                        Wijnmalen (2007) Eq. 17, Demirtas & Ustun (2008) Eq. 2, e Petrillo et al. (2023).
                        Este método é particularmente adequado para avaliação de investimentos em Indústria 4.0
                        pois permite identificar alternativas com valor líquido negativo (prejuízo).
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ==================================================
                VALIDAÇÃO METODOLÓGICA - Fundamentação Acadêmica
            ================================================== */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">📚 Validação Metodológica</h3>
              <p className="text-sm text-gray-500 mb-6">
                Fundamentação acadêmica dos métodos de síntese BOCR utilizados
              </p>

              {/* Análise Crítica da Literatura - Baseado em Petrillo et al. (2023) */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">📖</span> Análise Crítica da Literatura
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Métodos selecionados conforme revisão state-of-the-art de Petrillo, Salomon & Tramarico (2023)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border">Método</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Petrillo (2023)</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Wijnmalen (2007)</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Demirtas (2008)</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-emerald-50">
                        <td className="px-3 py-2 border font-medium">⭐ Subtrativo</td>
                        <td className="px-3 py-2 border text-center">✅ Citado</td>
                        <td className="px-3 py-2 border text-center">✅ Eq. 17</td>
                        <td className="px-3 py-2 border text-center">✅ Eq. 3</td>
                        <td className="px-3 py-2 border text-center">
                          <span className="px-2 py-1 bg-emerald-200 text-emerald-800 rounded text-xs font-bold">Recomendado</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border font-medium">Aditivo Residual</td>
                        <td className="px-3 py-2 border text-center">✅ Eq. 3</td>
                        <td className="px-3 py-2 border text-center text-gray-400">—</td>
                        <td className="px-3 py-2 border text-center">✅ Eq. 2</td>
                        <td className="px-3 py-2 border text-center">
                          <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs">Referência</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border font-medium">Multiplicativo Potências</td>
                        <td className="px-3 py-2 border text-center">✅ Eq. 4</td>
                        <td className="px-3 py-2 border text-center text-amber-600">⚠️ "Ambiguous"</td>
                        <td className="px-3 py-2 border text-center text-gray-400">—</td>
                        <td className="px-3 py-2 border text-center">
                          <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">Referência</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border font-medium">Quociente de Somas</td>
                        <td className="px-3 py-2 border text-center">✅ Eq. 12 (Wijnmalen 2007)</td>
                        <td className="px-3 py-2 border text-center text-emerald-700">✅ Mantém comensurabilidade</td>
                        <td className="px-3 py-2 border text-center text-gray-400">—</td>
                        <td className="px-3 py-2 border text-center">
                          <span className="px-2 py-1 bg-emerald-200 text-emerald-800 rounded text-xs">Comparativo</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Nota: Os métodos Multiplicativo Potências, Multiplicativo Simples e Quociente de Somas são incluídos como referência para validação cruzada da síntese subtrativa principal (Wijnmalen, 2007, Eq. 17). As fórmulas seguem Saaty & Ozdemir (2003) e Wijnmalen (2007).
                </p>
              </div>

              {/* Justificativa do Método Principal */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 mb-6">
                <h4 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                  ⭐ Justificativa do Método Principal (Subtrativo)
                </h4>
                <div className="text-sm text-emerald-700 space-y-2">
                  <p>
                    <strong>Fórmula:</strong> <code className="bg-white px-2 py-1 rounded">Score = v<sub>b</sub>·s<sub>b</sub>·B + v<sub>o</sub>·s<sub>o</sub>·O − v<sub>c</sub>·s<sub>c</sub>·C − v<sub>r</sub>·s<sub>r</sub>·R</code>
                  </p>
                  <p>
                    <strong>Fundamentação:</strong> O método Subtrativo foi adotado como principal por sua <strong>coerência matemática</strong> (Wijnmalen, 2007, Eq. 17), aplicação validada em Demirtas & Üstün (2008) e inclusão no state-of-the-art de Petrillo et al. (2023):
                  </p>
                  <ul className="list-disc list-inside pl-4 space-y-1">
                    <li>Wijnmalen (2007), Eq. 17 - Validação matemática formal</li>
                    <li>Demirtas & Ustun (2008), Eq. 2 - Aplicação em seleção de fornecedores</li>
                    <li>Petrillo et al. (2023) - Revisão do estado da arte, cita ambos</li>
                  </ul>
                  <p>
                    <strong>Adequação ao contexto:</strong> Para avaliação de investimentos em Indústria 4.0, o método Subtrativo é particularmente adequado pois:
                  </p>
                  <ul className="list-disc list-inside pl-4 space-y-1">
                    <li>Permite identificar alternativas com valor líquido negativo (prejuízo)</li>
                    <li>Interpretação intuitiva como "valor líquido" (positivos - negativos)</li>
                    <li>Preserva magnitude absoluta das diferenças entre alternativas</li>
                  </ul>
                </div>
              </div>

              {/* Validação Cruzada entre Métodos */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">🔄</span> Validação Cruzada entre Métodos
                </h4>
                {(() => {
                  const methods = [
                    { id: 'subtractive', name: 'Subtrativo', key: 'scoreSubtractive' },
                    { id: 'additiveResidual', name: 'Adit. Residual', key: 'scoreAdditiveResidualNorm' },
                    { id: 'multiplicative', name: 'Mult. Potências', key: 'scoreMultiplicativeNorm' },
                    // TODO pós-defesa: refatorar id para 'quotientSums'. Mantido como
                    // 'reciprocal' por compatibilidade interna.
                    { id: 'reciprocal', name: 'Q. Somas', key: 'scoreQuotientSumsNorm' },
                    { id: 'multSimple', name: 'Mult. Simples', key: 'scoreMultSimpleNorm' }
                  ];

                  // Calcular ranking por cada método
                  const rankings: Record<string, string[]> = {};
                  methods.forEach(method => {
                    const sorted = [...(calculation.finalScores || [])]
                      .sort((a, b) => {
                        // Tentar encontrar score na propriedade direta ou no objeto scores
                        const scoreA = a[method.key] ?? a.scores?.[method.id] ?? a[method.key + 'Norm'] ?? 0;
                        const scoreB = b[method.key] ?? b.scores?.[method.id] ?? b[method.key + 'Norm'] ?? 0;
                        return scoreB - scoreA;
                      });
                    rankings[method.id] = sorted.map(s => s.code || s.name);
                  });

                  // Encontrar vencedor do método principal
                  const principalWinner = rankings.subtractive?.[0] || rankings.additiveResidual?.[0];

                  // Contar concordância
                  const agreementCount = Object.values(rankings).filter(r => r[0] === principalWinner).length;
                  const agreementPct = (agreementCount / methods.length) * 100;

                  return (
                    <div className="space-y-4">
                      {/* Indicador de Concordância */}
                      <div className={`p-4 rounded-lg border-2 ${agreementPct === 100 ? 'border-emerald-300 bg-emerald-50' :
                        agreementPct >= 75 ? 'border-blue-300 bg-blue-50' :
                          agreementPct >= 50 ? 'border-amber-300 bg-amber-50' :
                            'border-red-300 bg-red-50'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-semibold text-gray-800">
                              {agreementPct === 100 ? '✅ Consenso Total' :
                                agreementPct >= 75 ? '👍 Alta Concordância' :
                                  agreementPct >= 50 ? '⚠️ Concordância Parcial' :
                                    '❌ Divergência Significativa'}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {agreementCount} de {methods.length} métodos indicam "{principalWinner}" como vencedor
                            </p>
                          </div>
                          <div className="text-3xl font-bold text-gray-800">
                            {(agreementPct || 0).toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      {/* Tabela de Rankings por Método */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Posição</th>
                              {methods.map(m => (
                                <th key={m.id} className={`px-3 py-2 text-center font-semibold ${m.id === 'subtractive' ? 'text-emerald-700 bg-emerald-100' : 'text-gray-700'
                                  }`}>
                                  {m.id === 'subtractive' ? '⭐ ' : ''}{m.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[0, 1, 2].map(pos => (
                              <tr key={pos} className={pos === 0 ? 'bg-green-50' : ''}>
                                <td className="px-3 py-2 font-medium">
                                  {pos === 0 ? '🥇 1º' : pos === 1 ? '🥈 2º' : '🥉 3º'}
                                </td>
                                {methods.map(m => (
                                  <td key={m.id} className={`px-3 py-2 text-center ${m.id === 'subtractive' ? 'bg-emerald-50 font-medium' : ''
                                    } ${rankings[m.id]?.[pos] === principalWinner && pos === 0 ? 'text-emerald-700' : ''
                                    }`}>
                                    {rankings[m.id]?.[pos] || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Interpretação */}
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        <strong>Interpretação:</strong> {
                          agreementPct === 100 ?
                            'Todos os métodos convergem para a mesma recomendação. Alta confiança na decisão.' :
                            agreementPct >= 75 ?
                              'A maioria dos métodos concorda. A recomendação é robusta com ressalvas menores.' :
                              agreementPct >= 50 ?
                                'Concordância parcial entre métodos. Recomenda-se análise de sensibilidade detalhada.' :
                                'Divergência significativa entre métodos. A decisão requer análise qualitativa adicional.'
                        }
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Tipos de Pesos */}
              <p className="text-xs text-gray-500 mb-2 italic">
                ℹ️ Os percentuais exibidos representam os pesos pessoais (v) derivados da hierarquia de controle. Na Equação 17 de Wijnmalen (2007), são multiplicados pelos rescaling weights (s) para compor os pesos efetivos (v·s) usados na síntese subtrativa.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h5 className="font-semibold text-indigo-800 mb-2">Personal Weights (Importância)</h5>
                  <p className="text-sm text-indigo-700 mb-2">
                    <strong>Variáveis:</strong> vb, vo, vc, vr
                  </p>
                  <p className="text-sm text-indigo-600">
                    Obtidos de comparações BOCR: "Qual mérito é mais <em>importante</em> para esta decisão?"
                  </p>
                  <p className="text-xs text-indigo-500 mt-2">
                    Ref: Saaty & Ozdemir (2003). Aplicação em Demirtas & Üstün (2008).
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h5 className="font-semibold text-purple-800 mb-2">Rescaling Weights (Magnitude)</h5>
                  <p className="text-sm text-purple-700 mb-2">
                    <strong>Variáveis:</strong> sb, so, sc, sr
                  </p>
                  <p className="text-sm text-purple-600">
                    Obtidos de comparações de magnitude: "Qual mérito tem <em>maior valor absoluto</em>?"
                  </p>
                  <p className="text-xs text-purple-500 mt-2">
                    Ref: Wijnmalen (2007) p.899 - "magnitude comparisons for commensurability"
                  </p>
                </div>
              </div>
            </div>

            {/* ================================================== 
                VALIDAÇÃO EXTERNA — AhpAnpLib (Creative Decisions Foundation)
            ================================================== */}
            <ExternalValidation
              calculation={calculation}
              project={project}
            />
          </div>
        )}

        {/* ==================================================
            TAB: PARECER IA
        ================================================== */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            {audit ? (
              <>
                {/* Verificações Matemáticas e Lógicas */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800">🔬 Verificações Automáticas</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Checklist de validação matemática e lógica • Saaty (1977, 1980), Wijnmalen (2007), Petrillo et al. (2023)
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      As verificações automáticas abaixo são diagnósticos técnicos descritivos. A avaliação qualitativa do estudo é emitida pelo Parecer Científico IA abaixo.
                    </p>
                  </div>

                  {/* Cards de Verificação */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Matemática */}
                    <div className={`p-4 rounded-lg border ${audit.verificacao_matematica?.consistencia_ok
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                      }`}>
                      <h4 className="font-semibold text-gray-800 mb-2">🧮 Verificação Matemática</h4>
                      <div className="space-y-1 text-sm">
                        <p>CR Global: <strong>{audit.verificacao_matematica?.cr_global}</strong></p>
                        <p>Consistência: {audit.verificacao_matematica?.consistencia_ok ? '✅ OK' : '❌ Falha'}</p>
                        <p>Pesos: {audit.verificacao_matematica?.pesos_somam_100 ? '✅ 100%' : '⚠️ Verificar'}</p>
                      </div>
                    </div>

                    {/* Lógica */}
                    <div className={`p-4 rounded-lg border ${audit.verificacao_logica?.formula_correta && audit.verificacao_logica?.sinais_bocr_corretos && audit.verificacao_logica?.ranking_coerente
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                      }`}>
                      <h4 className="font-semibold text-gray-800 mb-2">🔍 Verificação Lógica</h4>
                      <div className="space-y-1 text-sm">
                        <p>Fórmulas: {audit.verificacao_logica?.formula_correta ? '✅ OK' : '⚠️ Verificar'}</p>
                        <p>Sinais BOCR: {audit.verificacao_logica?.sinais_bocr_corretos ? '✅ OK' : '⚠️ Verificar'}</p>
                        <p>Ranking: {audit.verificacao_logica?.ranking_coerente ? '✅ Coerente' : '⚠️ Divergente'}</p>
                      </div>
                    </div>

                    {/* Robustez */}
                    <div className={`p-4 rounded-lg border ${audit.robustez?.metodos_concordantes >= 4
                      ? 'bg-green-50 border-green-200'
                      : audit.robustez?.metodos_concordantes >= 3
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                      }`}>
                      <h4 className="font-semibold text-gray-800 mb-2">💪 Robustez</h4>
                      <div className="space-y-1 text-sm">
                        <p>Métodos concordantes: <strong>{audit.robustez?.metodos_concordantes}/5</strong></p>
                        <p>Δ 1º-2º: {audit.robustez?.diferenca_1o_2o}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Problemas de Verificação Lógica */}
                {audit.verificacao_logica?.problemas && audit.verificacao_logica.problemas.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4">🔍 Problemas de Verificação Lógica</h3>
                    <div className="space-y-3">
                      {audit.verificacao_logica.problemas.map((p: any, idx: number) => (
                        <div key={idx} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="font-semibold text-orange-800 mb-2">⚠️ {p.problem}</p>
                          <div className="bg-white p-3 rounded-lg">
                            <p className="text-sm text-orange-700">
                              <strong>Ação necessária:</strong> {p.action}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validações Detalhadas */}
                {audit.validacoes && audit.validacoes.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Detalhamento das Validações</h3>
                    <div className="space-y-3">
                      {audit.validacoes.map((v: any, idx: number) => {
                        const statusColors: Record<string, string> = {
                          'PASS': 'bg-green-50 border-green-200',
                          'ALERT': 'bg-yellow-50 border-yellow-200',
                          'FAIL': 'bg-orange-50 border-orange-200',
                          'CRITICAL': 'bg-red-50 border-red-200'
                        };
                        const statusIcons: Record<string, string> = {
                          'PASS': '✅',
                          'ALERT': '⚠️',
                          'FAIL': '❌',
                          'CRITICAL': '🚫'
                        };
                        return (
                          <div key={idx} className={`p-4 rounded-lg border ${statusColors[v.status] || 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span>{statusIcons[v.status] || '?'}</span>
                                <span className="font-semibold text-gray-800">{v.test}</span>
                              </div>
                              <span className={`text-sm font-bold px-2 py-0.5 rounded ${v.status === 'PASS' ? 'bg-green-100 text-green-700' : v.status === 'ALERT' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{v.status}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{v.message}</p>
                            {v.action && (
                              <div className="bg-white/70 p-2 rounded text-sm">
                                <strong className="text-gray-700">💡 Ação:</strong> <span className="text-gray-600">{v.action}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pontos Fortes e Recomendações */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Pontos Fortes */}
                  {audit.pontos_fortes && audit.pontos_fortes.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-green-800 mb-4">✅ Pontos Fortes</h3>
                      <ul className="space-y-2">
                        {audit.pontos_fortes.map((ponto: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-green-700">
                            <span className="text-green-500 mt-0.5">•</span>
                            {ponto}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recomendações */}
                  {audit.recomendacoes && audit.recomendacoes.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-amber-800 mb-4">💡 Recomendações</h3>
                      <ul className="space-y-2">
                        {audit.recomendacoes.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>



                {/* Relatório Técnico Completo */}
                {audit.relatorio_tecnico && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">📄 Relatório Técnico Completo</h3>
                      <button
                        onClick={() => {
                          const blob = new Blob([audit.relatorio_tecnico], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `parecer-ahp-bocr-${projectId}.md`;
                          a.click();
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                      >
                        📥 Download .MD
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {audit.relatorio_tecnico}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🤖</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Parecer não disponível</h3>
                <p className="text-gray-500 mb-4">
                  A análise automática não pôde ser gerada para este projeto.
                </p>
                <p className="text-sm text-gray-400">
                  Verifique se todos os dados foram calculados corretamente.
                </p>
              </div>
            )}

            {/* ⭐ NOVO - Parecer AI Estilizado */}
            <ParecerAISection
              aiReview={aiReview}
              loading={aiReviewLoading}
              onExecute={runAiReview}
            />

            {/* 🔍 Análise de Viés nos Julgamentos (Dodevska et al., 2023) */}
            {biasAnalysis && (
              <BiasAnalysisCard
                biasAnalysis={biasAnalysis}
                alternatives={project?.alternatives || []}
                sensitiveGroups={sensitiveGroups}
                onSaveSensitiveGroups={saveSensitiveGroups}
              />
            )}
          </div>
        )}

        {/* ==================================================
            TAB: EXPORTAR
        ================================================== */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Exportar Resultados</h3>
              <p className="text-sm text-gray-500 mb-6">
                Exporte os resultados em diferentes formatos para uso em artigos científicos e dissertações.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                {/* CSV */}
                <div className="border rounded-xl p-6 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📄</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">CSV</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Arquivo único com todas as seções: Pesos, Subcritérios, Ranking, Consistência, Sensibilidade, Demográficos e Respostas. Compatível com Excel, SPSS, R.
                  </p>
                  <button
                    onClick={exportCSV}
                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Baixar CSV
                  </button>
                </div>

                {/* LaTeX */}
                <div className="border rounded-xl p-6 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📐</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">LaTeX</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    7 tabelas formatadas: Pesos BOCR, Subcritérios, Desempenho, Ranking, Consistência, Sensibilidade e Demográficos. Pronto para Overleaf.
                  </p>
                  <button
                    onClick={exportLatex}
                    className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Baixar .tex
                  </button>
                </div>

                {/* XLSX */}
                <div className="border rounded-xl p-6 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Excel (XLSX)</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Planilha completa com 10 abas: Visão Geral, Pesos BOCR, Subcritérios, Desempenho, Ranking, Consistência, Sensibilidade, Demográficos, Respostas e Referências
                  </p>
                  <button
                    onClick={exportXLSX}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Baixar .xlsx
                  </button>
                </div>
              </div>

              {/* Preview LaTeX */}
              <div className="mt-8">
                <h4 className="font-medium text-gray-700 mb-3">Preview das Tabelas LaTeX</h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`% Exemplo de tabela gerada
\\begin{table}[htbp]
\\centering
\\caption{Pesos estratégicos dos méritos BOCR}
\\begin{tabular}{lcc}
\\toprule
\\textbf{Mérito} & \\textbf{Peso} & \\textbf{Peso (\\%)} \\\\
\\midrule
${['Benefícios', 'Oportunidades', 'Custos', 'Riscos'].map((l, i) =>
                    `${l} & ${(calculation.bocrWeights[i] || 0).toFixed(4)} & ${((calculation.bocrWeights[i] || 0) * 100).toFixed(2)}\\%`
                  ).join(' \\\\\n')} \\\\
\\bottomrule
\\end{tabular}
\\end{table}`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Sistema AHP-BOCR v5.0</p>
          <p className="mt-1">Desenvolvido para dissertação de mestrado em Engenharia de Produção - UNESP</p>
        </div>
      </footer>
    </div>
  );
}
