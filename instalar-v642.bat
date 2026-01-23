@echo off
REM ═══════════════════════════════════════════════════════════════
REM  ESCOLHA A VERSÃO
REM ═══════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  INSTALAÇÃO API v6.4.2                                        ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo Escolha a versão:
echo.
echo [1] DEBUG - Ver payload completo (recomendado primeiro)
echo [2] COMPLETA - Análise + Nota + Veredicto
echo.
set /p choice="Digite 1 ou 2: "

if "%choice%"=="1" goto DEBUG
if "%choice%"=="2" goto COMPLETA
echo Opção inválida!
pause
exit /b 1

:DEBUG
echo.
echo Instalando versão DEBUG...
copy app\api\ai-reviewer\route.ts app\api\ai-reviewer\route.ts.backup-pre-debug >nul
copy route-debug.ts app\api\ai-reviewer\route.ts >nul
echo ✅ route.ts DEBUG instalado
echo.
echo 📋 Próximos passos:
echo    1. npm run build
echo    2. vercel --prod
echo    3. Clicar em "Executar Revisão IA"
echo    4. Ver logs no Vercel Dashboard
echo.
pause
exit /b 0

:COMPLETA
echo.
echo Instalando versão COMPLETA v6.4.2...
copy app\api\ai-reviewer\route.ts app\api\ai-reviewer\route.ts.backup-pre-v642 >nul
copy route-v642.ts app\api\ai-reviewer\route.ts >nul
echo ✅ route.ts v6.4.2 instalado
echo.
echo 📋 Features da v6.4.2:
echo    • RAG com 24 referências científicas
echo    • Análise de CRs individuais
echo    • Classificação automática (A-F)
echo    • Veredicto (APROVADO/REVISÃO/REJEITADO)
echo    • Benchmarks da literatura
echo.
echo 📋 Próximos passos:
echo    1. npm run build
echo    2. vercel --prod
echo.
pause
exit /b 0
