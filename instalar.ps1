# ========================================
# AHP-BOCR API v6.5.0 - Instalacao Rapida
# PowerShell Script
# ========================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  AHP-BOCR PEER REVIEW API v6.5.0                       ║" -ForegroundColor Cyan
Write-Host "║  Instalacao Automatica para Windows (PowerShell)       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# [1/4] Verificar Node.js
Write-Host "[1/4] Verificando Node.js..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version 2>&1
    $npmVersion = npm --version 2>&1
    
    Write-Host "✅ Node.js encontrado:" -ForegroundColor Green
    Write-Host "   Node: $nodeVersion" -ForegroundColor Gray
    Write-Host "   npm:  $npmVersion" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "❌ ERRO: Node.js não está instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale Node.js de: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Recomendado: Versão LTS (Long Term Support)" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

# [2/4] Instalar dependencias
Write-Host "[2/4] Instalando dependências..." -ForegroundColor Yellow
Write-Host ""

try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install falhou"
    }
    Write-Host ""
    Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "❌ ERRO ao instalar dependências!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

# [3/4] Verificar arquivos
Write-Host "[3/4] Verificando arquivos..." -ForegroundColor Yellow

$arquivosNecessarios = @(
    "knowledge.ts",
    "bocr-peer-review-api.ts",
    "demo.ts",
    "package.json"
)

$arquivosFaltando = @()
foreach ($arquivo in $arquivosNecessarios) {
    if (-not (Test-Path $arquivo)) {
        $arquivosFaltando += $arquivo
    }
}

if ($arquivosFaltando.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ ERRO: Arquivos não encontrados:" -ForegroundColor Red
    foreach ($arquivo in $arquivosFaltando) {
        Write-Host "   - $arquivo" -ForegroundColor Red
    }
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "✅ Todos os arquivos encontrados!" -ForegroundColor Green
Write-Host ""

# [4/4] Perguntar se quer executar demo
Write-Host "[4/4] Deseja executar o demo agora? (S/N)" -ForegroundColor Yellow
$choice = Read-Host "Sua escolha"

if ($choice -eq "S" -or $choice -eq "s") {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Executando demo..." -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    npm run demo
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Demo concluído!" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
}
else {
    Write-Host ""
    Write-Host "✅ Instalação concluída com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para executar o demo mais tarde, use:" -ForegroundColor Yellow
    Write-Host "   npm run demo" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OU:" -ForegroundColor Yellow
    Write-Host "   npx ts-node demo.ts" -ForegroundColor Gray
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Instalação Completa! ✅                               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Leia o SUMARIO_EXECUTIVO.md" -ForegroundColor Gray
Write-Host "  2. Leia o README.md" -ForegroundColor Gray
Write-Host "  3. Execute: npm run demo" -ForegroundColor Gray
Write-Host "  4. Prepare seus dados para análise" -ForegroundColor Gray
Write-Host ""

Read-Host "Pressione Enter para finalizar"
