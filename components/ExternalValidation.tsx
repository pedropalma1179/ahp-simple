'use client';

import { useState } from 'react';

/**
 * ExternalValidation Component — AhpAnpLib (Creative Decisions Foundation)
 * 
 * Validates AHP calculations by sending the REAL aggregated pairwise matrices
 * to AhpAnpLib for independent eigenvector and CR calculation.
 * 
 * Data flow:
 *   1. Read aggregatedMatrices from calculation (saved by route.ts v5.0+)
 *   2. Send real matrices + system weights/CR to Railway microservice
 *   3. AhpAnpLib recalculates eigenvector and CR independently
 *   4. Compare: system vs AhpAnpLib (weights AND CR)
 * 
 * Data structure (from Firestore 'calculations' collection):
 *   calculation.aggregatedMatrices.bocr: number[4][4]
 *   calculation.aggregatedMatrices.magnitude: number[4][4]
 *   calculation.aggregatedMatrices.subcriteria: {B: number[5][5], O: ..., C: ..., R: ...}
 *   calculation.bocrWeights: number[4]
 *   calculation.bocrConsistency: {cr, lambda, ci}
 *   calculation.subWeights: {B: number[5], O: number[5], C: number[5], R: number[5]}
 *   calculation.subConsistency: {B: {cr, lambda}, O: ..., C: ..., R: ...}
 * 
 * Reference:
 *   MU, E. (2023). Creative Decisions Foundation Announces the Release of
 *   AHP/ANP Python Library. IJAHP, v. 15, n. 2. DOI: 10.13033/ijahp.v15i2.1163
 */

interface ProjectValidationResult {
  results: Record<string, any>;
  summary: {
    total_matrices: number;
    valid_matrices: number;
    max_weight_diff: number;
    max_cr_diff: number;
    issues: string[];
  };
  all_valid: boolean;
  library: string;
  citation: string;
}

interface ExternalValidationProps {
  calculation: any;
  project: any;
}

export default function ExternalValidation({ calculation, project }: ExternalValidationProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProjectValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [matrixSource, setMatrixSource] = useState<'none' | 'real' | 'reconstructed' | null>(null);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/validate-external');
      if (res.ok) {
        const data = await res.json();
        setServiceStatus(data.ahpanplib_available ? 'online' : 'offline');
      } else {
        setServiceStatus('offline');
      }
    } catch {
      setServiceStatus('offline');
    }
  };

  const extractMatrices = () => {
    const matrices: Record<string, any> = {};
    if (!calculation) return { matrices, source: 'none' as const };

    const hasRealMatrices = calculation.aggregatedMatrices?.bocr &&
      calculation.aggregatedMatrices?.subcriteria;

    // ============================================================
    // STRATEGY A: Use REAL aggregated matrices (route.ts v5.0+)
    // Matrices stored as JSON strings in Firestore (no nested arrays)
    // ============================================================
    if (hasRealMatrices) {
      const agg = calculation.aggregatedMatrices;

      const parseMatrix = (m: any): number[][] | null => {
        try {
          return typeof m === 'string' ? JSON.parse(m) : Array.isArray(m) ? m : null;
        } catch { return null; }
      };

      // BOCR merit matrix (4×4)
      const bocrMatrix = parseMatrix(agg.bocr);
      if (bocrMatrix && bocrMatrix.length === 4) {
        matrices['BOCR Méritos'] = {
          matrix: bocrMatrix,
          items: ['Benefits', 'Opportunities', 'Costs', 'Risks'],
          your_weights: calculation.bocrWeights,
          your_cr: calculation.bocrConsistency?.cr || 0
        };
      }

      // Magnitude matrix (4×4)
      const magMatrix = parseMatrix(agg.magnitude);
      if (magMatrix && magMatrix.length === 4) {
        matrices['Magnitude (Rescaling)'] = {
          matrix: magMatrix,
          items: ['Benefits', 'Opportunities', 'Costs', 'Risks'],
          your_weights: [
            calculation.rescalingWeights?.sb || 0,
            calculation.rescalingWeights?.so || 0,
            calculation.rescalingWeights?.sc || 0,
            calculation.rescalingWeights?.sr || 0
          ],
          your_cr: calculation.magnitudeConsistency?.cr || 0
        };
      }

      // Subcriteria matrices (5×5 each)
      const meritMap: Record<string, string> = {
        B: 'Benefits', O: 'Opportunities', C: 'Costs', R: 'Risks'
      };

      if (agg.subcriteria && typeof agg.subcriteria === 'object') {
        for (const [key, raw] of Object.entries(agg.subcriteria)) {
          const matrix = parseMatrix(raw);
          if (matrix && matrix.length >= 2) {
            const meritName = meritMap[key] || key;
            const items = matrix.map((_: any, i: number) => `${key}${i + 1}`);
            matrices[`${meritName} Subcritérios`] = {
              matrix,
              items,
              your_weights: calculation.subWeights?.[key] || [],
              your_cr: calculation.subConsistency?.[key]?.cr || 0
            };
          }
        }
      }

      return { matrices, source: 'real' as const };
    }

    // ============================================================
    // STRATEGY B: Fallback — reconstruct from weights (legacy)
    // ============================================================
    const weightsToMatrix = (weights: number[]): number[][] => {
      const n = weights.length;
      return Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => weights[i] / weights[j])
      );
    };

    if (Array.isArray(calculation.bocrWeights) && calculation.bocrWeights.length === 4) {
      const w = calculation.bocrWeights as number[];
      if (w.every((v: number) => v > 0)) {
        matrices['BOCR Méritos'] = {
          matrix: weightsToMatrix(w),
          items: ['Benefits', 'Opportunities', 'Costs', 'Risks'],
          your_weights: w,
          your_cr: calculation.bocrConsistency?.cr || 0
        };
      }
    }

    const meritMap: Record<string, string> = {
      B: 'Benefits', O: 'Opportunities', C: 'Costs', R: 'Risks'
    };

    if (calculation.subWeights && typeof calculation.subWeights === 'object') {
      for (const [key, weights] of Object.entries(calculation.subWeights as Record<string, number[]>)) {
        if (Array.isArray(weights) && weights.length >= 2 && weights.every((v: number) => v > 0)) {
          const items = weights.map((_: number, i: number) => `${key}${i + 1}`);
          matrices[`${meritMap[key] || key} Subcritérios`] = {
            matrix: weightsToMatrix(weights),
            items,
            your_weights: weights,
            your_cr: calculation.subConsistency?.[key]?.cr || 0
          };
        }
      }
    }

    return { matrices, source: 'reconstructed' as const };
  };

  const runValidation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setMatrixSource(null);

    try {
      const { matrices, source } = extractMatrices();
      setMatrixSource(source);

      if (Object.keys(matrices).length === 0) {
        setError('Nenhuma matriz encontrada. Execute o cálculo primeiro.');
        setLoading(false);
        return;
      }

      if (source === 'reconstructed') {
        console.warn('[ExternalValidation] Usando matrizes reconstruídas (legado). Recalcule o projeto para validação completa.');
      }

      const response = await fetch('/api/validate-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate-project', matrices })
      });

      if (!response.ok) throw new Error(`Serviço retornou erro ${response.status}`);

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao serviço de validação');
    } finally {
      setLoading(false);
    }
  };

  const { matrices: previewMatrices, source: previewSource } = calculation
    ? extractMatrices()
    : { matrices: {}, source: 'none' };
  const matrixCount = Object.keys(previewMatrices).length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-xl">🔬</span>
            Validação Externa — AhpAnpLib
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Compara os cálculos do sistema com a biblioteca oficial da
            <strong className="text-gray-700"> Creative Decisions Foundation</strong>
          </p>
          <p className="text-xs text-gray-400 mt-1 italic">
            Mu, E. (2023). IJAHP, v. 15, n. 2. DOI: 10.13033/ijahp.v15i2.1163
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            serviceStatus === 'online' ? 'bg-green-400' :
            serviceStatus === 'offline' ? 'bg-red-400' : 'bg-gray-300'
          }`} />
          <span className="text-xs text-gray-400">
            {serviceStatus === 'online' ? 'Online' :
             serviceStatus === 'offline' ? 'Offline' : 'Verificar'}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={runValidation} disabled={loading}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Validando...
            </span>
          ) : `🔬 Executar Validação (${matrixCount} matrizes)`}
        </button>
        <button onClick={checkHealth}
          className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors">
          Verificar Serviço
        </button>
      </div>

      {/* Source warning */}
      {matrixSource === 'reconstructed' && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-4">
          <p className="text-xs text-amber-800">
            <strong>⚠️ Modo legado:</strong> Matrizes reconstruídas a partir dos pesos (CR sempre = 0).
            Para validação completa de pesos <strong>e</strong> CR, recalcule o projeto
            (as matrizes originais serão salvas automaticamente).
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-700 font-medium">❌ Erro na validação</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${
            result.all_valid ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{result.all_valid ? '✅' : '⚠️'}</span>
              <div>
                <p className={`font-semibold ${result.all_valid ? 'text-green-800' : 'text-amber-800'}`}>
                  {result.all_valid ? 'VALIDAÇÃO APROVADA' : 'VALIDAÇÃO COM RESSALVAS'}
                </p>
                <p className={`text-xs ${result.all_valid ? 'text-green-600' : 'text-amber-600'}`}>
                  {result.summary.valid_matrices}/{result.summary.total_matrices} matrizes válidas
                  • Diferença máx pesos: {(result.summary.max_weight_diff * 100).toFixed(3)}%
                  • Diferença máx CR: {(result.summary.max_cr_diff * 100).toFixed(3)}%
                </p>
              </div>
            </div>
          </div>

          {matrixSource === 'real' && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Método:</strong> Matrizes pareadas <strong>reais</strong> (agregadas por média geométrica
                dos julgamentos dos especialistas) enviadas à AhpAnpLib para cálculo independente
                do eigenvector e Consistency Ratio via método das potências (Saaty, 1980).
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border">Matriz</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border">N</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border">CR (Sistema)</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border">CR (AhpAnpLib)</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Δ CR</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Δ Pesos Máx</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.results).map(([name, r]: [string, any]) => (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border font-medium text-gray-800">{name}</td>
                    <td className="px-3 py-2 border text-center text-gray-600">{r.n}</td>
                    <td className="px-3 py-2 border text-center font-mono text-gray-600">
                      {r.your_cr !== undefined ? `${(r.your_cr * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 border text-center font-mono text-gray-600">
                      {(r.sdk_cr * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 border text-center font-mono">
                      {r.cr_diff !== undefined ? (
                        <span className={
                          r.cr_diff < 0.001 ? 'text-green-600' :
                          r.cr_diff < 0.01 ? 'text-blue-600' : 'text-amber-600'
                        }>
                          {(r.cr_diff * 100).toFixed(3)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 border text-center font-mono">
                      {r.max_weight_diff !== undefined ? (
                        <span className={
                          r.max_weight_diff < 0.001 ? 'text-green-600' :
                          r.max_weight_diff < 0.01 ? 'text-blue-600' : 'text-amber-600'
                        }>
                          {(r.max_weight_diff * 100).toFixed(3)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 border text-center">
                      {r.valid ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ OK</span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">⚠ Verificar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.summary.issues.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm font-medium text-amber-800 mb-1">Pontos de atenção:</p>
              {result.summary.issues.map((issue: string, i: number) => (
                <p key={i} className="text-xs text-amber-700">• {issue}</p>
              ))}
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-2">📝 Citação para dissertação:</p>
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &ldquo;Os cálculos AHP do sistema foram validados contra a biblioteca AhpAnpLib
              (Creative Decisions Foundation), utilizando as matrizes pareadas agregadas
              {matrixSource === 'real' ? ' reais' : ''} do projeto. A diferença máxima
              foi de {(result.summary.max_weight_diff * 100).toFixed(3)}% nos vetores de prioridade
              e {(result.summary.max_cr_diff * 100).toFixed(3)}% nos índices de consistência (CR),
              atestando a precisão matemática da implementação
              (MU, 2023; AhpAnpLib v2.3).&rdquo;
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t">
            <span>Biblioteca: {result.library}</span>
            <span>•</span>
            <span>
              <a href="https://doi.org/10.13033/ijahp.v15i2.1163" target="_blank"
                rel="noopener noreferrer" className="text-blue-500 hover:underline">
                DOI: 10.13033/ijahp.v15i2.1163
              </a>
            </span>
          </div>
        </div>
      )}

      {!result && !error && !loading && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-3">🔬</p>
          <p className="text-sm">
            Clique em <strong>&ldquo;Executar Validação&rdquo;</strong> para comparar os cálculos
            do sistema com a biblioteca AhpAnpLib da Creative Decisions Foundation.
          </p>
          {matrixCount > 0 && (
            <p className="text-xs mt-2 text-gray-500">
              {matrixCount} matrizes detectadas
              {previewSource === 'real'
                ? ' (matrizes reais — validação completa)'
                : ' (reconstruídas — recalcule para validação completa de CR)'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
