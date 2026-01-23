@echo off
echo.
echo ========================================
echo   FIX FINAL - TypeScript v6.4.3
echo ========================================
echo.

copy route-v643-final.ts app\api\ai-reviewer\route.ts >nul
echo OK route.ts atualizado (fix TypeScript definitivo)
echo.
echo Agora execute: npm run build
echo.
pause
