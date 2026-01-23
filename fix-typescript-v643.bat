@echo off
REM Correcao rapida - Erro TypeScript quality.summary

echo.
echo ========================================================
echo   CORRECAO v6.4.3 - Erro TypeScript
echo ========================================================
echo.

copy app\api\ai-reviewer\route.ts app\api\ai-reviewer\route.ts.backup-typescript-error >nul
echo OK Backup criado

copy route-v643-fixed.ts app\api\ai-reviewer\route.ts >nul
echo OK route.ts corrigido (acesso ao quality.summary)

echo.
echo Proximos passos:
echo   npm run build
echo.
pause
