@echo off
echo.
echo ========================================
echo   CORRIGIR ZOOM DA PAGINA (75%% -^> 100%%)
echo ========================================
echo.

copy app\layout.tsx app\layout.tsx.backup-zoom >nul
echo OK Backup criado

copy layout.tsx app\layout.tsx >nul
echo OK layout.tsx atualizado (viewport: initialScale=1)

echo.
echo Proximos passos:
echo   1. npm run build
echo   2. vercel --prod
echo.
pause
