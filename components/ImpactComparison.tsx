// components/ImpactComparison.tsx
// Componente para exibir os impactos lado a lado durante a comparação de alternativas

'use client';

import { Alternative, SUBCRITERIA } from '@/lib/data';

interface ImpactComparisonProps {
  subcriterioCode: string;
  alternativeA: Alternative;
  alternativeB: Alternative;
}

export function ImpactComparison({ subcriterioCode, alternativeA, alternativeB }: ImpactComparisonProps) {
  const subcriteria = SUBCRITERIA.find(s => s.code === subcriterioCode);

  if (!subcriteria) return null;

  const impactA = alternativeA.impacts?.[subcriterioCode];
  const impactB = alternativeB.impacts?.[subcriterioCode];

  // Verificar se há impactos preenchidos (agora são strings)
  const hasImpactA = !!impactA && impactA.trim().length > 0;
  const hasImpactB = !!impactB && impactB.trim().length > 0;

  if (!hasImpactA && !hasImpactB) {
    return null; // Não mostrar se nenhum impacto foi preenchido
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <span className="text-sm font-medium text-gray-700">Comparação de Impactos em {subcriteria.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Alternativa A */}
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-indigo-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded">
              {alternativeA.code}
            </span>
            <span className="font-medium text-gray-800 text-sm">{alternativeA.name}</span>
          </div>
          <div className="text-sm text-gray-600">
            {hasImpactA ? (
              <p className="text-gray-700">{impactA}</p>
            ) : (
              <p className="text-gray-400 italic">Não informado</p>
            )}
          </div>
        </div>

        {/* Alternativa B */}
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded">
              {alternativeB.code}
            </span>
            <span className="font-medium text-gray-800 text-sm">{alternativeB.name}</span>
          </div>
          <div className="text-sm text-gray-600">
            {hasImpactB ? (
              <p className="text-gray-700">{impactB}</p>
            ) : (
              <p className="text-gray-400 italic">Não informado</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3 text-center">
        💡 Compare os impactos acima para decidir qual alternativa é melhor neste critério
      </p>
    </div>
  );
}

// Versão compacta para listagem
export function ImpactComparisonCompact({ subcriterioCode, alternativeA, alternativeB }: ImpactComparisonProps) {
  const subcriteria = SUBCRITERIA.find(s => s.code === subcriterioCode);

  if (!subcriteria) return null;

  const impactA = alternativeA.impacts?.[subcriterioCode];
  const impactB = alternativeB.impacts?.[subcriterioCode];

  const hasImpactA = !!impactA && impactA.trim().length > 0;
  const hasImpactB = !!impactB && impactB.trim().length > 0;

  if (!hasImpactA && !hasImpactB) return null;

  const getDisplayValue = (impact: string | undefined) => {
    if (!impact || impact.trim().length === 0) return 'N/I';
    return impact.length > 50 ? impact.substring(0, 50) + '...' : impact;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-xs text-gray-500">{alternativeA.code}:</span>
          <p className="text-gray-800">{getDisplayValue(impactA)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">{alternativeB.code}:</span>
          <p className="text-gray-800">{getDisplayValue(impactB)}</p>
        </div>
      </div>
    </div>
  );
}

export default ImpactComparison;
