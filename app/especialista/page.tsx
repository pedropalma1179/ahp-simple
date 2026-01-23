// app/especialista/page.tsx
// Página Informativa para Especialistas
'use client';

import Link from 'next/link';

export default function EspecialistaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Card Principal */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
          {/* Ícone */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 14l9-5-9-5-9 5 9 5z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" 
              />
            </svg>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Área do Especialista
          </h1>
          <p className="text-gray-400 text-center text-sm mb-6">
            Bem-vindo à pesquisa acadêmica
          </p>

          {/* Instruções Principais */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-amber-300 font-semibold mb-1">Como participar?</h3>
                <p className="text-gray-300 text-sm">
                  Para participar da pesquisa, você precisa acessar pelo <strong className="text-white">link personalizado</strong> enviado pelo pesquisador via email ou WhatsApp.
                </p>
              </div>
            </div>
          </div>

          {/* Etapas */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-4 bg-white/5 rounded-lg p-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">1</span>
              </div>
              <div className="text-gray-300 text-sm">
                <span className="text-white font-medium">Receba o convite</span> por email ou WhatsApp
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 rounded-lg p-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">2</span>
              </div>
              <div className="text-gray-300 text-sm">
                <span className="text-white font-medium">Clique no link</span> e digite seu email + código
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 rounded-lg p-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                <span className="text-purple-400 font-bold text-sm">3</span>
              </div>
              <div className="text-gray-300 text-sm">
                <span className="text-white font-medium">Preencha o perfil</span> e responda a avaliação
              </div>
            </div>
          </div>

          {/* Info adicional */}
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Tempo estimado: <strong className="text-white">15-20 minutos</strong></span>
            </div>
          </div>

          {/* Não recebeu? */}
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-2">Não recebeu o convite?</p>
            <a 
              href="mailto:pedro.palma@unesp.br"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contate o pesquisador
            </a>
          </div>
        </div>

        {/* Botão Voltar */}
        <div className="text-center mt-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao início
          </Link>
        </div>

        {/* Footer Institucional */}
        <div className="mt-10 pt-6 border-t border-white/10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                UNESP — Universidade Estadual Paulista | Guaratinguetá
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Mestrado Profissional em Engenharia de Produção — 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
