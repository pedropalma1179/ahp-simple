@echo off
echo.
echo =========================================
echo   API v6.4.5 - Conversao Array-^>Objeto
echo =========================================
echo.

copy app\api\ai-reviewer\route.ts app\api\ai-reviewer\route.ts.backup-v645 >nul
echo OK Backup criado

copy route-v645.ts app\api\ai-reviewer\route.ts >nul
echo OK route.ts v6.4.5 instalado

echo.
echo Correcoes na v6.4.5:
echo   - Converte bocrWeights [array] para {objeto}
echo   - Benefits = array[0]
echo   - Opportunities = array[1]
echo   - Costs = array[2]
echo   - Risks = array[3]
echo   - Logs detalhados da chamada Anthropic
echo   - Melhor tratamento de erros
echo.
echo Proximos passos:
echo   1. npm run build
echo   2. vercel --prod
echo.
pause
