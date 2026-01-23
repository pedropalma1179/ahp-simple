@echo off
echo.
echo ======================================
echo   API v6.4.4 - Fallback Inteligente
echo ======================================
echo.

copy app\api\ai-reviewer\route.ts app\api\ai-reviewer\route.ts.backup-v644 >nul
echo OK Backup criado

copy route-v644.ts app\api\ai-reviewer\route.ts >nul
echo OK route.ts v6.4.4 instalado

echo.
echo Mudancas na v6.4.4:
echo   - Detecta formato agregado do frontend
echo   - Distribui valores para dimensoes BOCR
echo   - Logs detalhados do payload
echo   - Tratamento de erro melhorado
echo.
echo Proximos passos:
echo   1. npm run build
echo   2. vercel --prod
echo.
pause
