@echo off
echo.
echo ============================================================
echo   FIX AUTOMATICO - AIReviewCard.tsx para v6.4.5
echo ============================================================
echo.

REM Verificar se estamos na raiz do projeto
if not exist "components\AIReviewCard.tsx" (
    echo ❌ ERRO: Arquivo components\AIReviewCard.tsx nao encontrado
    echo.
    echo Certifique-se de que voce esta em: C:\AHP-BOCR\ahp-simple
    echo.
    pause
    exit /b 1
)

echo 📂 Arquivo encontrado: components\AIReviewCard.tsx
echo.

REM Tentar executar com Node.js
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Node.js encontrado! Executando fix...
    echo.
    node fix-aireviewer-auto.js
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ============================================================
        echo   SUCESSO! Arquivo corrigido
        echo ============================================================
        echo.
        echo Proximos passos:
        echo   1. npm run build
        echo   2. vercel --prod
        echo.
        goto :success
    ) else (
        echo.
        echo ❌ Erro ao executar o script
        goto :error
    )
) else (
    echo ⚠️  Node.js nao encontrado. Tentando com Python...
    echo.
    
    REM Tentar executar com Python
    where python >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Python encontrado! Executando fix...
        echo.
        python fix-aireviewer-auto.py
        
        if %ERRORLEVEL% EQU 0 (
            echo.
            echo ============================================================
            echo   SUCESSO! Arquivo corrigido
            echo ============================================================
            echo.
            echo Proximos passos:
            echo   1. npm run build
            echo   2. vercel --prod
            echo.
            goto :success
        ) else (
            echo.
            echo ❌ Erro ao executar o script
            goto :error
        )
    ) else (
        echo.
        echo ❌ ERRO: Nem Node.js nem Python encontrados
        echo.
        echo Instale Node.js ou Python para executar este script.
        echo.
        echo Alternativamente, aplique as mudancas manualmente seguindo:
        echo   FIX-AIReviewCard-SIMPLES.md
        echo.
        goto :error
    )
)

:success
pause
exit /b 0

:error
pause
exit /b 1
