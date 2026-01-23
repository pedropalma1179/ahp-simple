// app/decisor/page.tsx
// Página de redirecionamento - NÃO é mais uma tela de login
// Função: Verificar autenticação e redirecionar adequadamente
// Versão: v1.0 - Single Sign-On Fix
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DecisorRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Verificar se usuário está autenticado
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const userRole = sessionStorage.getItem('userRole');

    if (isAuthenticated && userRole === 'decisor') {
      // Usuário autenticado -> vai direto para projetos
      router.replace('/decisor/projetos');
    } else {
      // Não autenticado -> volta para login na home
      router.replace('/');
    }
  }, [router]);

  // Tela de loading enquanto verifica e redireciona
  return (
    <div className="min-h-screen bg-[#0B1C2C] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 text-sm">Verificando autenticação...</p>
      </div>
    </div>
  );
}
