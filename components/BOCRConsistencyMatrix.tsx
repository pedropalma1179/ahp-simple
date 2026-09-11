// components/BOCRConsistencyMatrix.tsx
// =========================================================================
// Tabela de Consistência das 6 matrizes agregadas do método AHP-BOCR
// =========================================================================
// Estrutura: BOCR (n=4) + Magnitude (n=4) + 4 subcritérios B/O/C/R (n=5 cada)
// Limiar: CR ≤ 0.10 conforme Saaty (1977)
// Q1/A1 alignment: Lee (2009), Demirtas & Üstün (2008), Petrillo et al. (2023)
//
// Referências bibliográficas:
//   Saaty, T.L. (1977). A scaling method for priorities in hierarchical
//     structures. Journal of Mathematical Psychology, 15(3), 234-281.
//   Wijnmalen, D.J.D. (2007). Analysis of benefits, opportunities, costs,
//     and risks (BOCR) with the AHP-ANP. Mathematical and Computer
//     Modelling, 46(7-8), 892-905.
// =========================================================================

'use client';

import React, { useMemo } from 'react';
import { randomIndex } from '@/lib/ahp-engine';

// =========================================================================
// TIPOS
// =========================================================================

interface ConsistencyData {
  cr: number;
  lambda: number;
  ci?: number; // opcional — calculamos se não vier do payload
}

interface BOCRConsistencyMatrixProps {
  bocrConsistency: ConsistencyData;                // n=4
  magnitudeConsistency: ConsistencyData;           // n=4
  // subConsistency é tipado como Record para compatibilidade com o payload
  // de calculate/route.ts (Record<string, {cr, lambda}>). O componente acessa
  // as chaves B, O, C, R com optional chaining + fallback, mantendo runtime
  // idêntico e robusto.
  subConsistency: Record<string, ConsistencyData>;
}

// =========================================================================
// CONSTANTES — Saaty (1977), Tabela RI
// =========================================================================

const CR_THRESHOLD = 0.10; // Saaty (1977, p. 271)

// =========================================================================
// HELPERS
// =========================================================================

function calcCI(lambda: number, n: number): number {
  if (n <= 1) return 0;
  return (lambda - n) / (n - 1);
}

function fmt4(x: number): string {
  return (x ?? 0).toFixed(4).replace('.', ',');
}

function fmt2pct(x: number): string {
  return ((x ?? 0) * 100).toFixed(2).replace('.', ',') + '%';
}

// =========================================================================
// COMPONENTE
// =========================================================================

const BOCRConsistencyMatrix: React.FC<BOCRConsistencyMatrixProps> = ({
  bocrConsistency,
  magnitudeConsistency,
  subConsistency,
}) => {
  const rows = useMemo(() => {
    const safeBOCR  = bocrConsistency      ?? { cr: 0, lambda: 0 };
    const safeMag   = magnitudeConsistency ?? { cr: 0, lambda: 0 };
    const safeB     = subConsistency?.B    ?? { cr: 0, lambda: 0 };
    const safeO     = subConsistency?.O    ?? { cr: 0, lambda: 0 };
    const safeC     = subConsistency?.C    ?? { cr: 0, lambda: 0 };
    const safeR     = subConsistency?.R    ?? { cr: 0, lambda: 0 };

    return [
      { label: 'BOCR',          n: 4, cr: safeBOCR.cr, lambda: safeBOCR.lambda, ci: safeBOCR.ci ?? calcCI(safeBOCR.lambda, 4),  ri: randomIndex(4) },
      { label: 'Magnitude',     n: 4, cr: safeMag.cr,  lambda: safeMag.lambda,  ci: safeMag.ci  ?? calcCI(safeMag.lambda, 4),   ri: randomIndex(4) },
      { label: 'Benefícios',    n: 5, cr: safeB.cr,    lambda: safeB.lambda,    ci: safeB.ci    ?? calcCI(safeB.lambda, 5),     ri: randomIndex(5) },
      { label: 'Oportunidades', n: 5, cr: safeO.cr,    lambda: safeO.lambda,    ci: safeO.ci    ?? calcCI(safeO.lambda, 5),     ri: randomIndex(5) },
      { label: 'Custos',        n: 5, cr: safeC.cr,    lambda: safeC.lambda,    ci: safeC.ci    ?? calcCI(safeC.lambda, 5),     ri: randomIndex(5) },
      { label: 'Riscos',        n: 5, cr: safeR.cr,    lambda: safeR.lambda,    ci: safeR.ci    ?? calcCI(safeR.lambda, 5),     ri: randomIndex(5) },
    ];
  }, [bocrConsistency, magnitudeConsistency, subConsistency]);

  const maxCR = useMemo(
    () => Math.max(...rows.map(r => r.cr ?? 0)),
    [rows]
  );

  const allConsistent = maxCR <= CR_THRESHOLD;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
      {/* Header com título + CR Máximo destacado */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Consistência das 6 Matrizes Agregadas
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Razão de Consistência (CR), índice (CI) e autovalor máximo (λmax) por matriz, conforme Saaty (1977).
          </p>
        </div>

        {/* CR Máximo em destaque — Decisão D4 */}
        <div
          className={`px-4 py-2 rounded-lg border ${
            allConsistent
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="text-xs font-medium uppercase tracking-wide">CR Máximo</div>
          <div className="text-2xl font-bold font-mono">
            {fmt2pct(maxCR)}
          </div>
          <div className="text-xs mt-0.5">
            {allConsistent ? 'Todas as matrizes consistentes' : 'Há matriz inconsistente'}
          </div>
        </div>
      </div>

      {/* Tabela das 6 matrizes */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300 text-gray-700">
              <th className="px-3 py-2 text-left font-semibold">Matriz</th>
              <th className="px-3 py-2 text-center font-semibold">n</th>
              <th className="px-3 py-2 text-right font-semibold">λmax</th>
              <th className="px-3 py-2 text-right font-semibold">CI</th>
              <th className="px-3 py-2 text-right font-semibold">RI</th>
              <th className="px-3 py-2 text-right font-semibold">CR (%)</th>
              <th className="px-3 py-2 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isConsistent = row.cr <= CR_THRESHOLD;
              return (
                <tr
                  key={row.label}
                  className={`border-b border-gray-100 ${
                    idx % 2 === 1 ? 'bg-gray-50' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-gray-800">{row.label}</td>
                  <td className="px-3 py-2 text-center text-gray-600 font-mono">{row.n}</td>
                  <td className="px-3 py-2 text-right text-gray-700 font-mono">{fmt4(row.lambda)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 font-mono">{fmt4(row.ci)}</td>
                  <td className="px-3 py-2 text-right text-gray-500 font-mono">{fmt4(row.ri)}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono font-semibold ${
                      isConsistent ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {fmt2pct(row.cr)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isConsistent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        ✓ Consistente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        ✗ Inconsistente
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Nota de rodapé acadêmica */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>Nota:</strong> CI = (λmax − n)/(n − 1); CR = CI/RI. Limite aceitável:
          CR ≤ 10% (Saaty, 1977). Índice Aleatório (RI): RI(4) = 0,90; RI(5) = 1,12
          (Saaty, 1977). Matrizes BOCR e Magnitude possuem dimensão n=4 (4 méritos estratégicos);
          subcritérios de cada mérito possuem dimensão n=5.
        </p>
      </div>
    </div>
  );
};

export default BOCRConsistencyMatrix;
