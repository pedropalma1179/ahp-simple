// app/obrigado/page.tsx
// Página de Agradecimento - Visual Sofisticado
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ObrigadoPage() {
  const [showContent, setShowContent] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Animação de entrada
    setTimeout(() => setShowContent(true), 100);
    setTimeout(() => setShowDetails(true), 600);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Ícone de Sucesso Animado */}
        <div className={`transform transition-all duration-700 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="w-28 h-28 mx-auto mb-8 relative">
            {/* Círculos decorativos */}
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
            <div className="absolute inset-2 bg-emerald-500/30 rounded-full"></div>
            <div className="absolute inset-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Título */}
        <div className={`transform transition-all duration-700 delay-200 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
            Avaliação Concluída!
          </h1>
        </div>

        {/* Card Principal */}
        <div className={`transform transition-all duration-700 delay-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-6">
            <p className="text-gray-300 text-center text-lg mb-4">
              Obrigado por participar desta pesquisa acadêmica.
            </p>
            <p className="text-white text-center">
              Sua contribuição é <span className="text-emerald-400 font-semibold">fundamental</span> para o avanço do 
              conhecimento sobre decisões de investimento em tecnologias da <span className="text-blue-400 font-semibold">Indústria 4.0</span>.
            </p>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className={`transform transition-all duration-700 delay-500 ${showDetails ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm">
                  Os resultados serão analisados pelo pesquisador e poderão ser compartilhados 
                  após a conclusão da dissertação.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Contato */}
        <div className={`transform transition-all duration-700 delay-700 ${showDetails ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
            <p className="text-gray-400 text-sm text-center mb-3">
              Em caso de dúvidas, entre em contato:
            </p>
            <a 
              href="mailto:pedro.palma@unesp.br"
              className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              pedro.palma@unesp.br
            </a>
          </div>
        </div>

        {/* Botão Voltar */}
        <div className={`transform transition-all duration-700 delay-900 ${showDetails ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="text-center">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Voltar ao Início
            </Link>
          </div>
        </div>

        {/* Footer Institucional */}
        <div className={`transform transition-all duration-700 delay-1000 ${showDetails ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col items-center gap-4">
              {/* Logo UNESP estilizado */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  UNESP — Universidade Estadual Paulista | Guaratinguetá
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Mestrado Profissional em Engenharia de Produção
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
