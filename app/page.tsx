// app/page.tsx
// Tela de Login - Sistema AHP-BOCR Indústria 4.0
// Design: Clean Corporate Tech com Glassmorphism
// Layout: Desktop Only - Versão v3 (Layout Corrigido)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (userId === 'decisor' && password === 'ahp2024') {
      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('userRole', 'decisor');
      router.push('/decisor/projetos');
    } else {
      setError('Credenciais inválidas. Verifique usuário e senha.');
    }
    
    setLoading(false);
  };

  return (
    <div 
      className="bg-[#0B1C2C] relative overflow-hidden"
      style={{ 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '48px'
      }}
    >
      {/* ============================================= */}
      {/* BACKGROUND                                   */}
      {/* ============================================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1C2C] via-[#0f2744] to-[#0B1C2C]"></div>
        
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 229, 255, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 229, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        ></div>

        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]"></div>

        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="network" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="1" fill="#00E5FF"/>
              <line x1="50" y1="50" x2="100" y2="0" stroke="#00E5FF" strokeWidth="0.5"/>
              <line x1="50" y1="50" x2="100" y2="100" stroke="#00E5FF" strokeWidth="0.5"/>
              <line x1="50" y1="50" x2="0" y2="100" stroke="#00E5FF" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#network)"/>
        </svg>
      </div>

      {/* ============================================= */}
      {/* MAIN CONTENT - Flex grow para ocupar espaço  */}
      {/* ============================================= */}
      <div 
        className="relative z-10 w-full px-8"
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: '48px',
          paddingBottom: '32px'
        }}
      >
        {/* ------------------------------------------- */}
        {/* TÍTULO                                     */}
        {/* ------------------------------------------- */}
        <div className="w-full max-w-4xl text-center" style={{ marginBottom: '48px' }}>
          <h1 className="text-4xl font-bold leading-tight tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Sistema de Apoio à Decisão de Investimentos em Indústria 4.0
          </h1>
        </div>

        {/* ------------------------------------------- */}
        {/* LOGIN CARD                                 */}
        {/* ------------------------------------------- */}
        <div className="w-full max-w-md relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl"></div>
          
          <div className="relative bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-10 shadow-2xl">
            <div className="text-center" style={{ marginBottom: '40px' }}>
              <div 
                className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30"
                style={{ marginBottom: '20px' }}
              >
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-white" style={{ marginBottom: '8px' }}>Área do Decisor</h2>
              <p className="text-gray-400">Acesse o painel de gerenciamento</p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '24px' }}>
                <label className="block text-sm font-medium text-gray-300" style={{ marginBottom: '8px' }}>
                  Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => { setUserId(e.target.value); setError(''); }}
                    placeholder="Digite seu usuário"
                    className="w-full pl-12 pr-4 py-4 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-base"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="block text-sm font-medium text-gray-300" style={{ marginBottom: '8px' }}>
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Digite sua senha"
                    className="w-full pl-12 pr-4 py-4 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-base"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl" style={{ marginBottom: '24px' }}>
                  <p className="text-red-400 text-sm text-center flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !userId || !password}
                className={`w-full py-4 rounded-xl font-semibold text-base tracking-wide transition-all duration-300 ${
                  loading || !userId || !password
                    ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Entrar
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* FOOTER - Flex shrink 0, não encolhe          */}
      {/* ============================================= */}
      <div 
        className="relative z-10 w-full border-t border-white/[0.05]"
        style={{
          flex: '0 0 auto',
          paddingTop: '32px',
          paddingBottom: '16px',
          marginTop: 'auto'
        }}
      >
        <div className="flex flex-col items-center" style={{ gap: '20px' }}>
          {/* Logo UNESP */}
          <img 
            src="/unesp-seeklogo.png" 
            alt="UNESP" 
            style={{ height: '36px', width: 'auto', opacity: 0.85 }}
          />
          
          {/* Texto Institucional */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Universidade Estadual Paulista (UNESP) | Faculdade de Engenharia e Ciências | Guaratinguetá/SP
            </p>
            <p className="text-gray-500 text-sm" style={{ marginTop: '4px' }}>
              MePEP — Mestrado Profissional em Engenharia de Produção
            </p>
            <p className="text-gray-600 text-xs" style={{ marginTop: '8px' }}>
              2026
            </p>
          </div>

          {/* Contato */}
          <p className="text-gray-500 text-xs">
            Em caso de dúvidas, entre em contato:{' '}
            <a 
              href="mailto:pedro.palma@unesp.br" 
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              pedro.palma@unesp.br
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
