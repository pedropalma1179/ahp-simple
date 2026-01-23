@echo off
REM ========================================
REM AHP-BOCR API v6.5.0 - Instalacao Rapida
REM ========================================

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  AHP-BOCR PEER REVIEW API v6.5.0                       ║
echo ║  Instalacao Automatica para Windows                    ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Verificar Node.js
echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERRO: Node.js nao esta instalado!
    echo.
    echo Por favor, instale Node.js de: https://nodejs.org/
    echo Recomendado: Versao LTS ^(Long Term Support^)
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado:
node --version
npm --version
echo.

REM Instalar dependencias
echo [2/4] Instalando dependencias...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERRO ao instalar dependencias!
    echo.
    pause
    exit /b 1
)
echo.
echo ✅ Dependencias instaladas com sucesso!
echo.

REM Verificar arquivos
echo [3/4] Verificando arquivos...
if not exist "knowledge.ts" (
    echo ❌ ERRO: knowledge.ts nao encontrado!
    pause
    exit /b 1
)
if not exist "bocr-peer-review-api.ts" (
    echo ❌ ERRO: bocr-peer-review-api.ts nao encontrado!
    pause
    exit /b 1
)
if not exist "demo.ts" (
    echo ❌ ERRO: demo.ts nao encontrado!
    pause
    exit /b 1
)
echo ✅ Todos os arquivos encontrados!
echo.

REM Perguntar se quer executar demo
echo [4/4] Deseja executar o demo agora? (S/N)
set /p choice="Sua escolha: "

if /i "%choice%"=="S" (
    echo.
    echo ═══════════════════════════════════════════════════════
    echo Executando demo...
    echo ═══════════════════════════════════════════════════════
    echo.
    call npm run demo
    echo.
    echo ═══════════════════════════════════════════════════════
    echo Demo concluido!
    echo ═══════════════════════════════════════════════════════
) else (
    echo.
    echo ✅ Instalacao concluida com sucesso!
    echo.
    echo Para executar o demo mais tarde, use:
    echo    npm run demo
    echo.
    echo OU:
    echo    npx ts-node demo.ts
)

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  Instalacao Completa! ✅                               ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Proximos passos:
echo   1. Leia o SUMARIO_EXECUTIVO.md
echo   2. Leia o README.md
echo   3. Execute: npm run demo
echo   4. Prepare seus dados para analise
echo.
pause
