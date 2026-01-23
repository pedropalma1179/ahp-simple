@echo off
echo.
echo ===============================================
echo   CORRIGIR FRONTEND - Suporte API v6.4.5
echo ===============================================
echo.

copy app\decisor\resultados\[projectId]\page.tsx app\decisor\resultados\[projectId]\page.tsx.backup-v645 >nul
echo OK Backup criado

copy page-fixed-v645.tsx app\decisor\resultados\[projectId]\page.tsx >nul
echo OK page.tsx corrigido (suporte v6.4.5)

echo.
echo Correcoes aplicadas:
echo   - Le data.nota e data.veredicto diretamente
echo   - Monta objeto compativel com AIReviewCard
echo   - Log completo do response (sem transformacao)
echo.
echo Proximos passos:
echo   1. npm run build
echo   2. vercel --prod
echo.
pause
