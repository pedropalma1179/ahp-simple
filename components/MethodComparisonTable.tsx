// components/MethodComparisonTable.tsx
// ============================================================================
// Tabela Comparativa de Métodos de Síntese BOCR - Q1/A1 Compliant
// Baseado em Lee (2009a) Table 7 e Alizadeh et al. (2020) Table 10
// ============================================================================
//
// REFERÊNCIAS:
// [1] Lee, A.H.I. (2009). A fuzzy supplier selection model with the BOCR approach.
//     Expert Systems with Applications, 36(2), 2879-2893. Table 7.
// [2] Alizadeh, R. et al. (2020). Iranian energy and subsidy policy analysis using
//     BOCR. Energy Policy, 137, 111114. Table 10.
// [3] Petrillo, A., Salomon, V.A.P. & Tramarico, C.L. (2023). State-of-the-Art
//     Review on the AHP with BOCR. Journal of Risk and Financial Management, 16, 372.
//
// FUNCIONALIDADE:
// - Exibe scores e rankings para 5 métodos de síntese
// - Calcula e exibe concordância entre métodos
// - Destaca método de consenso (Subtrativo - Wijnmalen, 2007)
// - Identifica divergências entre métodos
//
// ============================================================================

'use client';

import React, { useState } from 'react';

interface FinalScore {
  code: string;
  name: string;
  scoreSubtractive: number;
  scoreAdditiveResidual: number;
  scoreMultiplicative: number;
  scoreQuotientSums: number;
  scoreMultSimple: number;
  rankSubtractive: number;
  rankAdditiveResidual: number;
  rankMultiplicative: number;
  rankQuotientSums: number;
  rankMultSimple: number;
  isNegative?: boolean;
}

interface MethodConcordance {
  totalMethods: number;
  agreeMethods: number;
  agreementPercent: number;
  consensusWinner: string | null;
  divergentMethods: string[];
  analysis?: string;
}

interface MethodComparisonTableProps {
  scores: FinalScore[];
  concordance?: MethodConcordance;
}

// Função helper para formatação segura
const safeToFixed = (value: number | undefined | null, decimals: number = 4): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0000';
  }
  return value.toFixed(decimals);
};

export default function MethodComparisonTable({
  scores,
  concordance
}: MethodComparisonTableProps) {
  const [showFormulas, setShowFormulas] = useState(false);

  if (!scores || scores.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700">Dados de comparação de métodos não disponíveis.</p>
      </div>
    );
  }

  // Ordenar por ranking do método Subtrativo (consenso)
  const sortedScores = [...scores].sort((a, b) => (a.rankSubtractive ?? 99) - (b.rankSubtractive ?? 99));

  // Métodos e suas informações
  const methods = [
    {
      id: 'subtractive',
      name: 'Subtrativo',
      shortName: 'Subtrativo ⭐',
      formula: 'vb·sb·B + vo·so·O − vc·sc·C − vr·sr·R',
      ref: 'Wijnmalen (2007, Eq. 17)',
      note: 'Valor líquido; v = pesos pessoais, s = rescaling weights',
      isPrimary: true,
      scoreKey: 'scoreSubtractive' as const,
      rankKey: 'rankSubtractive' as const,
    },
    {
      id: 'quotientSums',
      name: 'Quociente de Somas',
      shortName: 'Q. Somas',
      formula: '(sb·B + so·O) / (sc·C + sr·R)',
      ref: 'Wijnmalen (2007, Eq. 12)',
      note: 'Razão benefício-custo com rescaling weights',
      isPrimary: false,
      scoreKey: 'scoreQuotientSums' as const,
      rankKey: 'rankQuotientSums' as const,
    },
    {
      id: 'additiveResidual',
      name: 'Aditivo Residual',
      shortName: 'Adit. Residual',
      formula: 'b·B + o·O + c·(1−C) + r·(1−R)',
      ref: 'Saaty & Ozdemir (2003); Lee (2009, Eq. 13); Demirtas & Üstün (2008)',
      note: 'Probabilistic additive; sempre positivo',
      isPrimary: false,
      scoreKey: 'scoreAdditiveResidual' as const,
      rankKey: 'rankAdditiveResidual' as const,
    },
    {
      id: 'multiplicative',
      name: 'Multiplicativo Potências',
      shortName: 'Mult. Potências',
      formula: '(B^vb · O^vo) / (C^vc · R^vr)',
      ref: 'Saaty & Ozdemir (2003); Lee (2009, Eq. 15)',
      note: 'Tradeoff exponencial',
      isPrimary: false,
      scoreKey: 'scoreMultiplicative' as const,
      rankKey: 'rankMultiplicative' as const,
    },
    {
      id: 'multSimple',
      name: 'Multiplicativo Simples',
      shortName: 'Mult. Simples',
      formula: '(B · O) / (C · R)',
      ref: 'Saaty & Ozdemir (2003); Lee (2009, Eq. 16)',
      note: 'Sem pesos dos méritos; benchmarking',
      isPrimary: false,
      scoreKey: 'scoreMultSimple' as const,
      rankKey: 'rankMultSimple' as const,
    },
  ];

  const getRankEmoji = (rank: number | undefined | null): string => {
    if (rank === undefined || rank === null) return '';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}º`;
  };

  const getAgreementColor = (percent: number | undefined | null): string => {
    const p = percent ?? 0;
    if (p === 100) return 'text-green-700 bg-green-100';
    if (p >= 80) return 'text-blue-700 bg-blue-100';
    if (p >= 60) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const getAgreementIcon = (percent: number | undefined | null): string => {
    const p = percent ?? 0;
    if (p === 100) return '✅';
    if (p >= 80) return '✓';
    if (p >= 60) return '⚠️';
    return '❌';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          📈 Comparativo de Métodos de Síntese
        </h3>
        <div className="flex items-center gap-2">
          {concordance && (
            <span className={`px-2 py-1 text-xs font-semibold rounded ${getAgreementColor(concordance.agreementPercent)}`}>
              {getAgreementIcon(concordance.agreementPercent)}{' '}
              <span className="font-medium">{safeToFixed(concordance.agreementPercent, 0)}% concordância</span>
              <span className="text-gray-500 ml-1">({concordance.agreeMethods ?? 0}/{concordance.totalMethods ?? 5} métodos)</span>
            </span>
          )}
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
            Q1/A1
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Conforme <strong>Lee (2009, Table 7)</strong>. Validação cruzada entre os 5 métodos de síntese BOCR: análise de concordância e dominância.
      </p>

      {/* Botão para mostrar/ocultar fórmulas */}
      <button
        onClick={() => setShowFormulas(!showFormulas)}
        className="mb-4 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        📐 {showFormulas ? 'Ocultar' : 'Mostrar'} Fórmulas
      </button>

      {/* Painel de fórmulas (colapsável) */}
      {showFormulas && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-3">Fórmulas dos Métodos de Síntese</h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {methods.map((method) => (
              <div
                key={method.id}
                className={`p-3 rounded-lg border ${method.isPrimary
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-white border-gray-200'
                  }`}
              >
                <div className="font-medium text-sm">
                  {method.isPrimary && '⭐ '}{method.name}
                </div>
                <div className="font-mono text-xs mt-1 text-gray-600">
                  {method.formula}
                </div>
                <div className="text-xs mt-1 text-gray-500">
                  {method.ref} • {method.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela principal */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left font-semibold border">Alternativa</th>
              {methods.map((method) => (
                <th
                  key={method.id}
                  className={`px-3 py-2 text-center font-semibold border ${method.isPrimary ? 'bg-emerald-100 text-emerald-800' : ''
                    }`}
                  title={`${method.formula} (${method.ref})`}
                >
                  {method.shortName}
                  <br />
                  <span className="text-xs font-normal text-gray-500">Score (Rank)</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedScores.map((s, idx) => (
              <tr key={s.code} className={idx === 0 ? 'bg-emerald-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 border font-medium">
                  {s.name || s.code}
                  <br />
                  <span className="text-xs text-gray-500">({s.code})</span>
                </td>

                {/* Subtrativo */}
                <td className={`px-3 py-2 border text-center bg-emerald-50 ${s.isNegative ? 'text-red-600' : ''}`}>
                  <span className="font-mono">
                    {safeToFixed(s.scoreSubtractive)}
                  </span>
                  <br />
                  <span className="text-lg">{getRankEmoji(s.rankSubtractive)}</span>
                </td>

                {/* Quociente de Somas */}
                <td className="px-3 py-2 border text-center">
                  <span className="font-mono">
                    {safeToFixed(s.scoreQuotientSums)}
                  </span>
                  <br />
                  <span className="text-lg">{getRankEmoji(s.rankQuotientSums)}</span>
                </td>

                {/* Aditivo Residual */}
                <td className="px-3 py-2 border text-center">
                  <span className="font-mono">
                    {safeToFixed(s.scoreAdditiveResidual)}
                  </span>
                  <br />
                  <span className="text-lg">{getRankEmoji(s.rankAdditiveResidual)}</span>
                </td>

                {/* Multiplicativo Potências */}
                <td className="px-3 py-2 border text-center">
                  <span className="font-mono">
                    {safeToFixed(s.scoreMultiplicative)}
                  </span>
                  <br />
                  <span className="text-lg">{getRankEmoji(s.rankMultiplicative)}</span>
                </td>

                {/* Multiplicativo Simples */}
                <td className="px-3 py-2 border text-center">
                  <span className="font-mono">
                    {safeToFixed(s.scoreMultSimple)}
                  </span>
                  <br />
                  <span className="text-lg">{getRankEmoji(s.rankMultSimple)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Análise de concordância */}
      {concordance && concordance.analysis && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>📊 Análise:</strong> {concordance.analysis}
          </p>
          {concordance.divergentMethods && concordance.divergentMethods.length > 0 && (
            <p className="text-sm text-orange-700 mt-1">
              <strong>⚠️ Métodos divergentes:</strong> {concordance.divergentMethods.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Referência */}
      <p className="mt-4 text-xs text-gray-500 italic">
        Referência: Lee, A.H.I. (2009). Expert Systems with Applications, Table 7.
      </p>
    </div>
  );
}
