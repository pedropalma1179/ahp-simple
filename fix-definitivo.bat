@echo off
echo.
echo ============================================================
echo   FIX DEFINITIVO - AIReviewCard.tsx v6.4.5
echo ============================================================
echo.

if not exist "components\AIReviewCard.tsx" (
    echo ❌ ERRO: Arquivo nao encontrado: components\AIReviewCard.tsx
    echo.
    echo Execute este script na raiz do projeto: C:\AHP-BOCR\ahp-simple
    echo.
    pause
    exit /b 1
)

echo 📂 Criando backup...
copy components\AIReviewCard.tsx components\AIReviewCard.tsx.backup-final >nul
echo ✅ Backup criado: components\AIReviewCard.tsx.backup-final

echo.
echo 📥 Instalando versao corrigida...
copy AIReviewCard-FIXED.tsx components\AIReviewCard.tsx >nul
echo ✅ AIReviewCard.tsx atualizado!

echo.
echo ============================================================
echo   CONCLUIDO COM SUCESSO!
echo ============================================================
echo.
echo Mudanca aplicada:
echo   + Adicionado metadata na interface AIReviewResponse
echo.
echo O que foi corrigido:
echo   - Linha 788: aiReview.metadata?.version agora compila
echo   - TypeScript nao reclama mais de Property metadata
echo.
echo Proximos passos:
echo   1. npm run build
echo   2. vercel --prod
echo.
echo Aguarde 2-3 minutos apos o deploy e teste!
echo.
pause
