// app/page.tsx
// Tela de Login - Sistema AHP-BOCR Indústria 4.0
// Design: Clean Corporate Tech com Glassmorphism e refinamentos visuais
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VideoBackground } from '@/components/VideoBackground';

/**
 * Partículas flutuantes estilo "network" sobre o vídeo.
 * Canvas leve com pontos conectados, reforça tema tecnológico.
 */
const ParticlesBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Criar partículas — poucas para não competir
    const PARTICLE_COUNT = 40;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
      });
    }

    const CONNECTION_DIST = 120;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mover e desenhar partículas
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.fill();
      });

      // Conectar partículas próximas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const opacity = 0.06 * (1 - dist / CONNECTION_DIST);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }} />;
};

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

    // Simulando delay de rede para ver o spinner
    await new Promise(resolve => setTimeout(resolve, 800));

    if (userId === 'decisor' && password === 'ahp2024') {
      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('userRole', 'decisor');
      router.push('/decisor/projetos');
    } else {
      setError('Credenciais inválidas. Verifique usuário e senha.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <VideoBackground />
      <ParticlesBackground />

      {/* Configuração de animações e estilos globais para esta página */}
      <style jsx>{`
        @keyframes iconGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.15), 0 0 40px rgba(6, 182, 212, 0.05);
          }
          50% {
            box-shadow: 0 0 25px rgba(6, 182, 212, 0.3), 0 0 50px rgba(6, 182, 212, 0.1);
          }
        }
        .animate-icon-glow {
          animation: iconGlow 3s ease-in-out infinite;
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slideInUp 0.7s ease-out forwards;
        }
      `}</style>

      {/* Branding sutil */}
      <div className="text-center mb-8 relative animate-slide-in" style={{ zIndex: 10, animationDelay: '0.1s', opacity: 0 }}>
        <h1 className="text-lg sm:text-xl font-medium text-white/60 tracking-wide">
          Sistema de Apoio à Decisão
        </h1>
        <p className="text-xs text-cyan-400/60 mt-1 tracking-widest uppercase">
          Investimentos em Indústria 4.0
        </p>
      </div>

      {/* Card de Login — Glassmorphism Refinado */}
      <div
        className="w-full max-w-md relative animate-slide-in"
        style={{
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.07)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        <div className="p-8 sm:p-10">
          {/* Ícone com glow */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center animate-icon-glow"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.2))',
                border: '1px solid rgba(6,182,212,0.3)',
                // Sombra agora controlada pela animação CSS
              }}
            >
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
          </div>

          {/* Título e subtítulo */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white mb-1">Painel de Decisão</h2>
            <p className="text-sm text-white/70">Gerencie projetos e analise resultados</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Campo Usuário */}
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => { setUserId(e.target.value); setError(''); }}
                  placeholder="Digite seu usuário"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white placeholder-white/40 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Digite sua senha"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white placeholder-white/40 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="p-3 rounded-xl text-sm flex items-center gap-2"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <span>⚠️</span>
                <span className="text-red-300">{error}</span>
              </div>
            )}

            {/* Botão CTA */}
            <button
              type="submit"
              disabled={loading || !userId || !password}
              className="w-full py-3.5 text-white font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.45)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.3)';
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Autenticando...
                </span>
              ) : (
                'Acessar Painel →'
              )}
            </button>
          </form>

          {/* Link de ajuda */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <a
              href="mailto:pedro.palma@unesp.br"
              className="text-sm text-cyan-400/70 hover:text-cyan-300 transition-colors"
            >
              Precisa de ajuda? Contate o pesquisador
            </a>
          </div>
        </div>
      </div>

      {/* Footer institucional */}
      <div className="mt-8 text-center relative animate-slide-in" style={{ zIndex: 10, animationDelay: '0.3s', opacity: 0 }}>
        <p className="text-xs text-white/25 tracking-wide">
          UNESP · FEG · Mestrado Profissional em Engenharia de Produção
        </p>
      </div>
    </div>
  );
}
