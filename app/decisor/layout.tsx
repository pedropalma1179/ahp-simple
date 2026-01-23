// app/decisor/layout.tsx
// Layout da área do Decisor com proteção de rotas
// Versão: v1.0 - Route Guard Implementation
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function DecisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticação
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const userRole = sessionStorage.getItem('userRole');

    if (!isAuthenticated || userRole !== 'decisor') {
      // Não autenticado -> redireciona para home (login)
      // Limpa qualquer estado residual
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('userRole');
      router.replace('/');
    } else {
      // Autenticado -> permite acesso
      setIsVerified(true);
    }
    
    setIsLoading(false);
  }, [router, pathname]);

  // Loading state enquanto verifica
  if (isLoading || !isVerified) {
    return (
      <div className="min-h-screen bg-[#0B1C2C] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Usuário autenticado -> renderiza conteúdo
  return <>{children}</>;
}
