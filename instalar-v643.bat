@echo off
REM Install v6.4.3 - Peer Review Academico A1/Q1

echo.
echo ========================================================
echo   INSTALACAO API v6.4.3 - PEER REVIEW ACADEMICO
echo ========================================================
echo.

REM Backup
copy app\api\ai-reviewer\route.ts app\api\ai-reviewer\route.ts.backup-pre-v643 >nul
echo OK Backup criado: route.ts.backup-pre-v643

REM Instalar
copy route-v643.ts app\api\ai-reviewer\route.ts >nul
echo OK route.ts v6.4.3 instalado

echo.
echo ========================================================
echo   INSTALACAO CONCLUIDA
echo ========================================================
echo.
echo Features da v6.4.3:
echo   - Peer Review como revisor senior A1/Q1
echo   - Analise qualitativa profunda
echo   - Identificacao de pontos fortes
echo   - Identificacao de limitacoes metodologicas
echo   - Direcionamento especifico para melhoria
echo   - Fundamentacao em 24 referencias cientificas
echo   - Tom educativo e construtivo
echo.
echo Proximos passos:
echo   1. npm run build
echo   2. vercel --prod
echo.
pause
