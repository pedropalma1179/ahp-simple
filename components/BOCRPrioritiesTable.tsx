// components/BOCRPrioritiesTable.tsx
// ============================================================================
// Tabela de Prioridades BOCR por Alternativa - Q1/A1 Compliant
// Baseado em Lee (2009a) Table 6 e Alizadeh et al. (2020) Figure 6
// ============================================================================
//
// REFERÊNCIAS:
// [1] Lee, A.H.I. (2009). A fuzzy supplier selection model with the BOCR approach.
//     Expert Systems with Applications, 36(2), 2879-2893. Table 6.
// [2] Alizadeh, R. et al. (2020). Iranian energy and subsidy policy analysis using
//     BOCR. Energy Policy, 137, 111114. Figure 6.
//
// FUNCIONALIDADE:
// - Exibe Bi, Oi, Ci, Ri para cada alternativa
// - Mostra valores recíprocos normalizados (1/Ci)norm e (1/Ri)norm
// - Destaca o melhor valor em cada coluna
// - Linha de soma para verificação (deve ≈ 1.000)
//
// ============================================================================

'use client';

import React from 'react';

interface BOCRPriority {
  code: string;
  name: string;
  B: number;
  O: number;
  C: number;
  R: number;
  C_reciprocal: number;
  R_reciprocal: number;
  isWinner?: boolean;
}

interface BOCRPrioritiesTableProps {
  priorities: BOCRPriority[];
  showReciprocals?: boolean;
}

// Função helper para formatação segura
const safeToFixed = (value: number | undefined | null, decimals: number = 4): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0000';
  }
  return value.toFixed(decimals);
};

export default function BOCRPrioritiesTable({ 
  priorities, 
  showReciprocals = true 
}: BOCRPrioritiesTableProps) {
  
  if (!priorities || priorities.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700">Dados de prioridades BOCR não disponíveis.</p>
      </div>
    );
  }

  // Calcular somas para verificação
  const sums = priorities.reduce(
    (acc, p) => ({
      B: acc.B + (p.B ?? 0),
      O: acc.O + (p.O ?? 0),
      C: acc.C + (p.C ?? 0),
      R: acc.R + (p.R ?? 0),
      C_reciprocal: acc.C_reciprocal + (p.C_reciprocal ?? 0),
      R_reciprocal: acc.R_reciprocal + (p.R_reciprocal ?? 0),
    }),
    { B: 0, O: 0, C: 0, R: 0, C_reciprocal: 0, R_reciprocal: 0 }
  );

  // Encontrar melhores valores (maior para B/O, menor para C/R)
  const maxB = Math.max(...priorities.map(p => p.B ?? 0));
  const maxO = Math.max(...priorities.map(p => p.O ?? 0));
  const minC = Math.min(...priorities.map(p => p.C ?? 0));
  const minR = Math.min(...priorities.map(p => p.R ?? 0));
  const maxCRecip = Math.max(...priorities.map(p => p.C_reciprocal ?? 0));
  const maxRRecip = Math.max(...priorities.map(p => p.R_reciprocal ?? 0));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          📊 Tabela de Prioridades BOCR por Alternativa
        </h3>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
            Q1/A1 Compliant
          </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Conforme <strong>Lee (2009, Table 6)</strong>. Formato de apresentação inspirado em Alizadeh et al. (2020, Figure 6).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left font-semibold border" rowSpan={2}>
                Alternativa
              </th>
              <th className="px-3 py-2 text-center font-semibold border bg-green-50 text-green-800" colSpan={2}>
                Positivos (+)
              </th>
              <th className="px-3 py-2 text-center font-semibold border bg-red-50 text-red-800" colSpan={showReciprocals ? 4 : 2}>
                Negativos (−)
              </th>
            </tr>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-center font-medium border bg-green-50" title="Benefícios: Quanto MAIOR, melhor">
                B<sub>i</sub><br />
                <span className="text-xs font-normal text-gray-500">Benefícios</span>
              </th>
              <th className="px-3 py-2 text-center font-medium border bg-green-50" title="Oportunidades: Quanto MAIOR, melhor">
                O<sub>i</sub><br />
                <span className="text-xs font-normal text-gray-500">Oportunidades</span>
              </th>
              <th className="px-3 py-2 text-center font-medium border bg-red-50" title="Custos: Quanto MENOR, melhor">
                C<sub>i</sub><br />
                <span className="text-xs font-normal text-gray-500">Custos</span>
              </th>
              {showReciprocals && (
                <th className="px-3 py-2 text-center font-medium border bg-amber-50" title="Recíproco normalizado de Custos: (1/Ci)norm">
                  (1/C<sub>i</sub>)<sub>norm</sub><br />
                  <span className="text-xs font-normal text-gray-500">Recíproco</span>
                </th>
              )}
              <th className="px-3 py-2 text-center font-medium border bg-red-50" title="Riscos: Quanto MENOR, melhor">
                R<sub>i</sub><br />
                <span className="text-xs font-normal text-gray-500">Riscos</span>
              </th>
              {showReciprocals && (
                <th className="px-3 py-2 text-center font-medium border bg-amber-50" title="Recíproco normalizado de Riscos: (1/Ri)norm">
                  (1/R<sub>i</sub>)<sub>norm</sub><br />
                  <span className="text-xs font-normal text-gray-500">Recíproco</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {priorities.map((p, idx) => (
              <tr key={p.code || idx} className={p.isWinner ? 'bg-emerald-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 border font-medium">
                  {p.isWinner && <span className="mr-1">🏆</span>}
                  {p.name || p.code}
                  <br />
                  <span className="text-xs text-gray-500">({p.code})</span>
                </td>
                <td className={`px-3 py-2 border text-center font-mono ${(p.B ?? 0) === maxB ? 'font-bold text-green-700 bg-green-100' : ''}`}>
                  {safeToFixed(p.B)}
                </td>
                <td className={`px-3 py-2 border text-center font-mono ${(p.O ?? 0) === maxO ? 'font-bold text-green-700 bg-green-100' : ''}`}>
                  {safeToFixed(p.O)}
                </td>
                <td className={`px-3 py-2 border text-center font-mono ${(p.C ?? 0) === minC ? 'font-bold text-blue-700 bg-blue-100' : ''}`}>
                  {safeToFixed(p.C)}
                </td>
                {showReciprocals && (
                  <td className={`px-3 py-2 border text-center font-mono ${(p.C_reciprocal ?? 0) === maxCRecip ? 'font-bold text-amber-700 bg-amber-100' : ''}`}>
                    {safeToFixed(p.C_reciprocal)}
                  </td>
                )}
                <td className={`px-3 py-2 border text-center font-mono ${(p.R ?? 0) === minR ? 'font-bold text-blue-700 bg-blue-100' : ''}`}>
                  {safeToFixed(p.R)}
                </td>
                {showReciprocals && (
                  <td className={`px-3 py-2 border text-center font-mono ${(p.R_reciprocal ?? 0) === maxRRecip ? 'font-bold text-amber-700 bg-amber-100' : ''}`}>
                    {safeToFixed(p.R_reciprocal)}
                  </td>
                )}
              </tr>
            ))}
            
            {/* Linha de soma para verificação */}
            <tr className="bg-gray-200 font-semibold">
              <td className="px-3 py-2 border">Σ (Soma)</td>
              <td className="px-3 py-2 border text-center font-mono">
                {safeToFixed(sums.B)}
              </td>
              <td className="px-3 py-2 border text-center font-mono">
                {safeToFixed(sums.O)}
              </td>
              <td className="px-3 py-2 border text-center font-mono">
                {safeToFixed(sums.C)}
              </td>
              {showReciprocals && (
                <td className="px-3 py-2 border text-center font-mono">
                  {safeToFixed(sums.C_reciprocal)}
                </td>
              )}
              <td className="px-3 py-2 border text-center font-mono">
                {safeToFixed(sums.R)}
              </td>
              {showReciprocals && (
                <td className="px-3 py-2 border text-center font-mono">
                  {safeToFixed(sums.R_reciprocal)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notas metodológicas */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <strong>📝 Notas Metodológicas:</strong>
        <ul className="mt-1 list-disc list-inside space-y-1">
          <li><strong>B<sub>i</sub>, O<sub>i</sub>:</strong> Quanto MAIOR, melhor (benefícios e oportunidades)</li>
          <li><strong>C<sub>i</sub>, R<sub>i</sub>:</strong> Quanto MENOR, melhor (custos e riscos)</li>
          {showReciprocals && (
            <li><strong>(1/C<sub>i</sub>)<sub>norm</sub>, (1/R<sub>i</sub>)<sub>norm</sub>:</strong> Valores recíprocos normalizados usados nas fórmulas aditivas (Lee, 2009a)</li>
          )}
          <li>Valores em <strong>negrito</strong> indicam o melhor desempenho na coluna</li>
          <li>Colunas somam aproximadamente 1.000 (normalização distributiva)</li>
        </ul>
        <p className="mt-2 text-gray-500 italic">
          Referência: Lee, A.H.I. (2009). A fuzzy supplier selection model with BOCR. Expert Systems with Applications, Table 6.
        </p>
      </div>
    </div>
  );
}
