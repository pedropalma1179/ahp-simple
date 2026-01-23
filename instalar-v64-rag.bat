@echo off
REM ═══════════════════════════════════════════════════════════════
REM  INSTALAÇÃO API v6.4 - RAG + PEER REVIEWER
REM  Execute: instalar-v64-rag.bat
REM ═══════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  🚀 INSTALAÇÃO API v6.4 - RAG + PEER REVIEWER                 ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM ═══════════════════════════════════════════════════════════════
REM 1. VERIFICAR SE ESTAMOS NO DIRETÓRIO CORRETO
REM ═══════════════════════════════════════════════════════════════

if not exist "app\api\ai-reviewer" (
    echo ❌ ERRO: Diretório app\api\ai-reviewer não encontrado
    echo    Execute este script na raiz do projeto: C:\AHP-BOCR\ahp-simple
    pause
    exit /b 1
)

REM ═══════════════════════════════════════════════════════════════
REM 2. FAZER BACKUP DA ROUTE.TS ATUAL
REM ═══════════════════════════════════════════════════════════════

echo 📦 [1/3] Fazendo backup da route.ts atual...

if exist "app\api\ai-reviewer\route.ts" (
    set timestamp=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set timestamp=%timestamp: =0%
    copy "app\api\ai-reviewer\route.ts" "app\api\ai-reviewer\route.ts.backup-%timestamp%" >nul
    echo    ✅ Backup criado: route.ts.backup-%timestamp%
) else (
    echo    ⚠️  route.ts não encontrada (primeira instalação)
)

REM ═══════════════════════════════════════════════════════════════
REM 3. INSTALAR ROUTE.TS v6.4
REM ═══════════════════════════════════════════════════════════════

echo.
echo 📝 [2/3] Instalando route.ts v6.4 (RAG + Peer Reviewer)...

if exist "route-v64-rag.ts" (
    copy "route-v64-rag.ts" "app\api\ai-reviewer\route.ts" >nul
    echo    ✅ route.ts v6.4 instalado
) else (
    echo    ❌ route-v64-rag.ts não encontrado na raiz
    echo    📥 Baixe o arquivo e coloque em: %cd%\route-v64-rag.ts
    pause
    exit /b 1
)

REM ═══════════════════════════════════════════════════════════════
REM 4. VERIFICAR KNOWLEDGE.TS
REM ═══════════════════════════════════════════════════════════════

echo.
echo 📚 [3/3] Verificando knowledge.ts (Base RAG)...

if exist "app\api\ai-reviewer\knowledge.ts" (
    echo    ✅ knowledge.ts já existe (16 artigos, 24 referências)
) else (
    echo    ❌ knowledge.ts não encontrado
    echo    📥 Execute primeiro: copy knowledge.ts app\api\ai-reviewer\
    pause
    exit /b 1
)

REM ═══════════════════════════════════════════════════════════════
REM 5. RESUMO E PRÓXIMOS PASSOS
REM ═══════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  ✨ INSTALAÇÃO CONCLUÍDA COM SUCESSO                          ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo 📚 Features da v6.4:
echo    • RAG com 16 artigos científicos (24 referências)
echo    • Persona: Peer Reviewer A1/Q1 (tom técnico impessoal)
echo    • Benchmarks: Comparação com literatura científica
echo    • Quality Gate: Detecção de respondentes ruins
echo    • Modelo: claude-sonnet-4-20250514
echo.
echo 📋 Próximos passos:
echo    1. Deletar pasta .next:     rmdir /s /q .next
echo    2. Build do projeto:        npm run build
echo    3. Deploy no Vercel:        vercel --prod
echo.
echo 🧪 Para testar após deploy:
echo    Acesse: https://seu-projeto.vercel.app/api/ai-reviewer
echo.
echo 📖 Arquivos instalados:
dir app\api\ai-reviewer\*.ts
echo.
pause
