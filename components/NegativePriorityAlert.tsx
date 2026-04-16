// components/NegativePriorityAlert.tsx
// ============================================================================
// Alerta de Prioridades Negativas - Q1/A1 Compliant
// Baseado em Lee (2009a) p.2891 e Wijnmalen (2007)
// ============================================================================
//
// REFERÊNCIAS:
// [1] Lee, A.H.I. (2009). A fuzzy supplier selection model with the BOCR approach.
//     Expert Systems with Applications, 36(2), 2879-2893. p.2891.
// [2] Wijnmalen, D.J.D. (2007). Analysis of benefits, opportunities, costs,
//     and risks (BOCR) with the AHP-ANP: A critical validation.
//     Mathematical and Computer Modelling, 46(7-8), 892-905.
//
// FUNCIONALIDADE:
// - Identifica alternativas com score subtrativo negativo
// - Exibe alerta visual destacado
// - Fornece explicação metodológica
// - Gera texto para dissertação
//
// ============================================================================

'use client';

import React, { useState } from 'react';

interface NegativeAlternative {
  code: string;
  name: string;
  score: number;
  message: string;
}

interface NegativePriorityAlertProps {
  negativeAlternatives: NegativeAlternative[];
  totalAlternatives: number;
}

// Função helper para formatação segura
const safeToFixed = (value: number | undefined | null, decimals: number = 4): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0000';
  }
  return value.toFixed(decimals);
};

export default function NegativePriorityAlert({
  negativeAlternatives,
  totalAlternatives,
}: NegativePriorityAlertProps) {
  const [expanded, setExpanded] = useState(false);

  // Se não houver alternativas negativas, não renderizar nada
  if (!negativeAlternatives || negativeAlternatives.length === 0) {
    return null;
  }

  const safeTotal = totalAlternatives ?? 0;
  const percentage = safeTotal > 0 
    ? ((negativeAlternatives.length / safeTotal) * 100).toFixed(0) 
    : '0';

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
      {/* Header do alerta */}
      <div className="flex items-start gap-4">
        <div className="text-4xl">⚠️</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
            Prioridades Negativas Detectadas
            <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-semibold rounded">
              Q1/A1 Alert
            </span>
          </h3>
          <p className="text-red-700 mt-1">
            <strong>{negativeAlternatives.length} de {safeTotal} alternativas</strong> ({percentage}%)
            apresentam score subtrativo negativo, indicando que os custos e riscos superam
            os benefícios e oportunidades.
          </p>
        </div>
      </div>

      {/* Lista de alternativas negativas */}
      <div className="mt-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-red-700 hover:text-red-900 underline"
        >
          {expanded ? '▼ Ocultar detalhes' : '▶ Ver alternativas afetadas'}
        </button>

        {expanded && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-red-100">
                  <th className="px-3 py-2 text-left font-semibold border border-red-200">Alternativa</th>
                  <th className="px-3 py-2 text-center font-semibold border border-red-200">Score Subtrativo</th>
                  <th className="px-3 py-2 text-left font-semibold border border-red-200">Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {negativeAlternatives.map((alt, idx) => (
                  <tr key={alt.code || idx} className="bg-white">
                    <td className="px-3 py-2 border border-red-200 font-medium">
                      {alt.name || alt.code}
                      <br />
                      <span className="text-xs text-gray-500">({alt.code})</span>
                    </td>
                    <td className="px-3 py-2 border border-red-200 text-center font-mono text-red-700 font-bold">
                      {safeToFixed(alt.score)}
                    </td>
                    <td className="px-3 py-2 border border-red-200 text-orange-700">
                      {alt.message || 'C+R > B+O'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explicação metodológica */}
      <div className="mt-4 p-3 bg-red-100 rounded-lg">
        <h4 className="font-semibold text-red-800 mb-2">📚 Significado Metodológico</h4>
        <p className="text-sm text-red-700">
          Conforme <strong>Lee (2009a, p.2891)</strong> e <strong>Wijnmalen (2007)</strong>, 
          scores negativos no método subtrativo indicam que a alternativa possui uma relação 
          desfavorável entre méritos positivos (B+O) e negativos (C+R). Isso pode significar:
        </p>
        <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
          <li>A alternativa tem custos/riscos que superam seus benefícios/oportunidades</li>
          <li>A alternativa deve ser desconsiderada ou reavaliada</li>
          <li>Pode haver necessidade de revisão dos julgamentos dos especialistas</li>
        </ul>
      </div>

      {/* Recomendações */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-semibold text-amber-800 mb-2">💡 Recomendações</h4>
        <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1">
          <li>Verificar se os julgamentos de custos e riscos estão calibrados corretamente</li>
          <li>Considerar excluir alternativas com scores muito negativos da análise final</li>
          <li>Documentar na dissertação que estas alternativas foram identificadas</li>
          <li>Se necessário, realizar análise de sensibilidade focada nestas alternativas</li>
        </ol>
      </div>

      {/* Texto para dissertação */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">📝 Texto Sugerido para Dissertação</h4>
        <p className="text-sm text-gray-600 italic">
          "A análise identificou {negativeAlternatives.length} alternativa(s) com prioridade global negativa 
          no método subtrativo, representando {percentage}% do total. Conforme Lee (2009a, p.2891), 
          isso indica que os custos e riscos ponderados superam os benefícios e oportunidades para 
          {negativeAlternatives.length === 1 ? ' esta alternativa' : ' estas alternativas'}:{' '}
          {negativeAlternatives.map(a => `${a.code}: ${safeToFixed(a.score)}`).join('; ')}.
          Este resultado sugere que {negativeAlternatives.length === 1 ? 'ela' : 'elas'} deve(m) ser 
          {negativeAlternatives.length === 1 ? ' descartada' : ' descartadas'} ou reavaliada(s) 
          pelos decisores."
        </p>
      </div>
    </div>
  );
}
