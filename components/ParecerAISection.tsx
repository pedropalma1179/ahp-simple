// components/ParecerAISection.tsx
// Componente estilizado para apresentar o Parecer Científico IA
// Compatível com AIReviewCard existente

'use client';

import React from 'react';

interface ParecerAISectionProps {
  aiReview: {
    nota?: string;
    veredicto?: string;
    review?: string;
    metadata?: {
      knowledgeBase?: {
        refsUsed?: number;
        criticalRefs?: number;
        uniqueArticles?: number;
      };
    };
  } | null;
  loading: boolean;
  onExecute: () => void;
}

export default function ParecerAISection({
  aiReview,
  loading,
  onExecute,
}: ParecerAISectionProps) {
  // Cores dinâmicas baseadas na nota/veredicto
  const getNotaStyle = (nota: string) => {
    switch (nota) {
      case 'A': return { bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'text-emerald-700', value: 'text-emerald-900' };
      case 'B': return { bg: 'bg-green-50', border: 'border-green-200', label: 'text-green-700', value: 'text-green-900' };
      case 'C': return { bg: 'bg-amber-50', border: 'border-amber-200', label: 'text-amber-700', value: 'text-amber-900' };
      case 'D': return { bg: 'bg-orange-50', border: 'border-orange-200', label: 'text-orange-700', value: 'text-orange-900' };
      case 'F': return { bg: 'bg-red-50', border: 'border-red-200', label: 'text-red-700', value: 'text-red-900' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', label: 'text-gray-700', value: 'text-gray-900' };
    }
  };

  const getVeredictoStyle = (veredicto: string) => {
    const v = veredicto.toUpperCase();
    if (v.includes('ACEITO') && !v.includes('REVIS')) {
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'text-emerald-700', value: 'text-emerald-900' };
    }
    if (v.includes('MENORES')) {
      return { bg: 'bg-green-50', border: 'border-green-200', label: 'text-green-700', value: 'text-green-900' };
    }
    if (v.includes('MAIORES')) {
      return { bg: 'bg-amber-50', border: 'border-amber-200', label: 'text-amber-700', value: 'text-amber-900' };
    }
    if (v.includes('RECONSIDERAR')) {
      return { bg: 'bg-orange-50', border: 'border-orange-200', label: 'text-orange-700', value: 'text-orange-900' };
    }
    if (v.includes('REJEITAR')) {
      return { bg: 'bg-red-50', border: 'border-red-200', label: 'text-red-700', value: 'text-red-900' };
    }
    return { bg: 'bg-gray-50', border: 'border-gray-200', label: 'text-gray-700', value: 'text-gray-900' };
  };

  return (
    <div className="card border-l-4 border-l-indigo-500">
      {/* Header com Botão */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Ícone */}
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🤖</span>
          </div>

          {/* Textos */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-1">
              🔬 Parecer Científico IA
            </h3>
            <p className="text-sm text-secondary">
              Análise por Claude Sonnet 4.5 • Arquitetura RAG com base científica em MCDM
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              ✓ Valores numéricos do sistema | ✓ Análise qualitativa por IA
            </p>
          </div>
        </div>

        {/* Botão Executar */}
        <button
          onClick={onExecute}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Analisando...
            </span>
          ) : (
            '🤖 Executar Revisão IA'
          )}
        </button>
      </div>

      {/* Conteúdo do Parecer */}
      {aiReview ? (
        <div>
          {/* Badges de Classificação */}
          {(aiReview.nota || aiReview.veredicto) && (
            <div className="flex gap-3 mb-6 flex-wrap">
              {aiReview.nota && (() => {
                const s = getNotaStyle(aiReview.nota!);
                return (
                  <div className={`flex items-center gap-2 px-4 py-2 ${s.bg} border ${s.border} rounded-lg`}>
                    <span className="text-lg">📊</span>
                    <div>
                      <p className={`text-xs font-medium ${s.label}`}>
                        Nota Científica
                      </p>
                      <p className={`text-xl font-bold ${s.value}`}>
                        {aiReview.nota}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {aiReview.veredicto && (() => {
                const s = getVeredictoStyle(aiReview.veredicto!);
                return (
                  <div className={`flex items-center gap-2 px-4 py-2 ${s.bg} border ${s.border} rounded-lg`}>
                    <span className="text-lg">⚖️</span>
                    <div>
                      <p className={`text-xs font-medium ${s.label}`}>
                        Veredicto
                      </p>
                      <p className={`text-sm font-semibold ${s.value}`}>
                        {aiReview.veredicto}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Review Text */}
          {aiReview.review && (
            <div className="mt-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="prose prose-sm max-w-none">
                  {/* Renderização simples do markdown */}
                  <div className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                    {aiReview.review.split('\n').map((line, idx) => {
                      // Headers
                      if (line.startsWith('## ')) {
                        return (
                          <h2
                            key={idx}
                            className="text-xl font-bold text-gray-900 mt-6 mb-3 border-b pb-2"
                          >
                            {line.replace('## ', '')}
                          </h2>
                        );
                      }
                      if (line.startsWith('### ')) {
                        return (
                          <h3
                            key={idx}
                            className="text-lg font-semibold text-gray-800 mt-4 mb-2"
                          >
                            {line.replace('### ', '')}
                          </h3>
                        );
                      }
                      if (line.startsWith('# ')) {
                        return (
                          <h1
                            key={idx}
                            className="text-2xl font-bold text-gray-900 mt-6 mb-4"
                          >
                            {line.replace('# ', '')}
                          </h1>
                        );
                      }

                      // Bold text
                      if (line.includes('**')) {
                        const parts = line.split(/\*\*(.*?)\*\*/g);
                        return (
                          <p key={idx} className="mb-3">
                            {parts.map((part, i) =>
                              i % 2 === 1 ? (
                                <strong key={i}>{part}</strong>
                              ) : (
                                part
                              )
                            )}
                          </p>
                        );
                      }

                      // Empty lines
                      if (line.trim() === '') {
                        return <div key={idx} className="h-2" />;
                      }

                      // Regular paragraphs
                      return (
                        <p key={idx} className="mb-3 text-justify">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dica de uso */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  💡 Sobre esta Análise
                </h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>
                    • Esta revisão foi gerada por Claude Sonnet 4.5, baseada em {aiReview.metadata?.knowledgeBase?.refsUsed || 24}
                    referências científicas de {aiReview.metadata?.knowledgeBase?.uniqueArticles || 29} artigos (RAG)
                  </p>
                  <p>
                    • Os valores numéricos são calculados pelo sistema AHP-BOCR
                    (não pela IA)
                  </p>
                  <p>
                    • A análise qualitativa segue protocolo de periódicos A1/Q1
                    em MCDM
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : !loading ? (
        /* Estado Vazio - Pronto para Executar */
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔬</span>
          </div>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">
            Pronto para Análise
          </h4>
          <p className="text-gray-500 max-w-lg mx-auto mb-6">
            Clique no botão acima para executar uma revisão profunda dos
            resultados, incluindo análise de robustez, comensurabilidade,
            consistência e validação científica.
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-400">
            <span>🕐 ~30 segundos</span>
            <span>📚 {aiReview?.metadata?.knowledgeBase?.refsUsed || 24} referências</span>
            <span>🎯 Protocolo A1/Q1</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
