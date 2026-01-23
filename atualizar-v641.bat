@echo off
REM ═══════════════════════════════════════════════════════════════
REM  ATUALIZAÇÃO v6.4 → v6.4.1 (Backwards Compatible)
REM  Execute: atualizar-v641.bat
REM ═══════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  🔄 ATUALIZAÇÃO v6.4 → v6.4.1 (Backwards Compatible)          ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Fazer backup
copy app\api\ai-reviewer\route.ts app\api\ai-reviewer\route.ts.backup-v64 >nul
echo ✅ Backup criado: route.ts.backup-v64

REM Copiar versão v6.4.1
copy route-v641-compatible.ts app\api\ai-reviewer\route.ts >nul
echo ✅ route.ts v6.4.1 instalado

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  ✨ ATUALIZAÇÃO CONCLUÍDA                                     ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo 🔧 Mudanças na v6.4.1:
echo    • Função normalizeRequest() para aceitar formato antigo
echo    • Logs detalhados de debug (console.log)
echo    • Compatível com individualStats do frontend
echo    • Mantém todas as features RAG da v6.4
echo.
echo 🚀 Próximos passos:
echo    1. npm run build
echo    2. vercel --prod
echo.
echo 🐛 Debug:
echo    Após deploy, verifique os logs no Vercel para ver
echo    o formato dos dados sendo recebidos
echo.
pause
