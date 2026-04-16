# Cleanup Script - Move unnecessary files to _backup folder
# Run: .\cleanup-to-backup.ps1
# To restore: Move files back from _backup folder

$backupDir = ".\_backup"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "$backupDir\$timestamp"

# Create backup directory
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null
Write-Host "Created backup folder: $backupPath" -ForegroundColor Green

# Files to move (relative to ahp-simple root)
$filesToMove = @(
    # Root duplicates/old versions
    "AIReviewCard-FIXED.tsx",
    "AIReviewCard-corrigido.tsx",
    "AIReviewCard.tsx",
    "ExportDemographicsButton.tsx",
    "ImpactComparison.tsx",
    "QualityDashboard.tsx",
    "RespondentsDemographics.tsx",
    
    # Debug files
    "debug_charts.txt",
    "debug_helpers.txt",
    "debug_tofixed.txt",
    "debug_tofixed_v2.txt",
    "lista-arquivos.txt",
    "lista-completa-arquivos.txt",
    
    # Old page versions
    "avaliacao-page-with-demographics.tsx",
    "dashboard-final-v4.tsx",
    "especialista-page-v2.tsx",
    "obrigado-page.tsx",
    "page-debug.tsx",
    "page-fixed-v645.tsx",
    "page-home-login.tsx",
    "perfil-page.tsx",
    "projetos-page-v6.tsx",
    "resultados-page.tsx",
    "resultados-page-hibrido.tsx",
    "simulacao-page.tsx",
    "layout.tsx",
    
    # Utility scripts
    "find-function-end.js",
    "find-syntax-error.js",
    "fix-aireviewer-auto.py",
    "truncate.js",
    
    # Old documentation
    "README-v642.md",
    "README-v643.md",
    "README-v645.md",
    "README-FIX-AUTO.md",
    "README-FIX-FRONTEND-V645.md",
    "README-SOLUCAO-DEFINITIVA.md",
    "PATCH-AIReviewCard-v645.md",
    "FIX-AIReviewCard-SIMPLES.md",
    "CORRECAO_RAPIDA.md",
    
    # Config backups
    "package.json.api.backup",
    "tsconfig.json.old",
    
    # Misc
    "d.areaAtuacao",
    "test.ts",
    
    # Component backups
    "components\AIReviewCard.tsx.backup-1767841267658",
    "components\AIReviewCard.tsx.backup-1767841465736",
    "components\AIReviewCard.tsx.backup-1767841487383",
    "components\AIReviewCard.tsx.backup-1767987945988",
    "components\AIReviewCard.tsx.backup-1767989289531",
    "components\AIReviewCard.tsx.backup-final",
    "components\AIReviewCard.tsx.backup-v645",
    "components\BOCRHierarchyD3.tsx.disabled",
    "components\CRHeatmapPlotly.tsx.disabled",
    
    # Lib backups
    "lib\data.ts.backup.ts",
    
    # App backups
    "app\layout.tsx.backup-zoom"
)

$movedCount = 0
$skippedCount = 0

foreach ($file in $filesToMove) {
    if (Test-Path $file) {
        $destDir = Split-Path -Parent "$backupPath\$file"
        if ($destDir -and !(Test-Path $destDir)) {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        }
        Move-Item -Path $file -Destination "$backupPath\$file" -Force
        Write-Host "  Moved: $file" -ForegroundColor Yellow
        $movedCount++
    } else {
        $skippedCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "  Files moved: $movedCount" -ForegroundColor White
Write-Host "  Files not found (skipped): $skippedCount" -ForegroundColor Gray
Write-Host "  Backup location: $backupPath" -ForegroundColor White
Write-Host ""
Write-Host "To restore, move files from $backupPath back to root." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
