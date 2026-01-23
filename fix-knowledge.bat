@echo off
REM ═══════════════════════════════════════════════════════════════
REM  CORREÇÃO RÁPIDA - knowledge.ts (Array.from fix)
REM  Execute: fix-knowledge.bat
REM ═══════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  🔧 CORREÇÃO knowledge.ts - Array.from fix                    ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Fazer backup
copy app\api\ai-reviewer\knowledge.ts app\api\ai-reviewer\knowledge.ts.backup-before-fix >nul
echo ✅ Backup criado: knowledge.ts.backup-before-fix

REM Copiar versão corrigida
copy knowledge-fixed.ts app\api\ai-reviewer\knowledge.ts >nul
echo ✅ knowledge.ts corrigido (Array.from ao invés de spread)

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  ✨ CORREÇÃO APLICADA                                         ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo 📋 Mudanças:
echo    - [...new Set()] substituído por Array.from(new Set())
echo    - Compatível com tsconfig do Next.js
echo.
echo 🚀 Próximos passos:
echo    1. npm run build
echo    2. vercel --prod
echo.
pause
