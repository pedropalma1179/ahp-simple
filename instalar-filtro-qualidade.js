// instalar-filtro-qualidade.js
// Execute com: node instalar-filtro-qualidade.js
// FAZ TUDO AUTOMATICAMENTE - não precisa fazer mais nada!

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 INSTALADOR DO FILTRO DE QUALIDADE');
console.log('═══════════════════════════════════════════════════════════\n');

// ============================================================
// PASSO 1: CRIAR O COMPONENTE
// ============================================================

console.log('📦 PASSO 1: Criando componente...\n');

const componentsDir = path.join(__dirname, 'components');
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

const componentCode = `// components/QualityAnalysisWithFilter.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';

interface Respondent {
  id: string;
  cr: number;
  status: 'CONFIÁVEL' | 'REVISAR' | 'SUSPEITO' | 'CRÍTICO';
  overallScore?: number;
  isSimulated?: boolean;
  metrics?: { avgCR: number };
  flags?: Array<{ type: string; severity: string; details?: string }>;
}

interface Props {
  respondents: Respondent[];
  onRecalculate?: (ids: string[]) => Promise<void>;
  isRecalculating?: boolean;
}

export default function QualityAnalysisWithFilter({ respondents, onRecalculate, isRecalculating = false }: Props) {
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'status' | 'cr' | 'score'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const activeRespondents = useMemo(() => respondents.filter(r => !excludedIds.has(r.id)), [respondents, excludedIds]);

  const calcAvgCR = (list: Respondent[]) => {
    if (list.length === 0) return 0;
    const crs = list.map(r => r.cr || r.metrics?.avgCR || 0).filter(c => c > 0);
    return crs.length > 0 ? crs.reduce((a, b) => a + b, 0) / crs.length : 0;
  };

  const calcAvgScore = (list: Respondent[]) => {
    if (list.length === 0) return 0;
    return list.map(r => r.overallScore || 0).reduce((a, b) => a + b, 0) / list.length;
  };

  const countByStatus = (list: Respondent[], status: string) => list.filter(r => r.status === status).length;

  const originalStats = useMemo(() => ({
    total: respondents.length,
    avgCR: calcAvgCR(respondents),
    avgScore: calcAvgScore(respondents),
    confiavel: countByStatus(respondents, 'CONFIÁVEL'),
    suspeito: countByStatus(respondents, 'SUSPEITO'),
    critico: countByStatus(respondents, 'CRÍTICO'),
  }), [respondents]);

  const currentStats = useMemo(() => ({
    total: activeRespondents.length,
    avgCR: calcAvgCR(activeRespondents),
    avgScore: calcAvgScore(activeRespondents),
    confiavel: countByStatus(activeRespondents, 'CONFIÁVEL'),
  }), [activeRespondents]);

  const crVariation = originalStats.avgCR > 0 ? ((currentStats.avgCR - originalStats.avgCR) / originalStats.avgCR) * 100 : 0;

  const sortedRespondents = useMemo(() => {
    const order = { 'CRÍTICO': 0, 'SUSPEITO': 1, 'REVISAR': 2, 'CONFIÁVEL': 3 };
    return [...respondents].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'status') cmp = order[a.status] - order[b.status];
      else if (sortBy === 'cr') cmp = (a.cr || 0) - (b.cr || 0);
      else cmp = (a.overallScore || 0) - (b.overallScore || 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [respondents, sortBy, sortOrder]);

  const toggle = (id: string) => setExcludedIds(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const excludeProblematic = () => {
    const ids = respondents.filter(r => r.status === 'SUSPEITO' || r.status === 'CRÍTICO').map(r => r.id);
    setExcludedIds(new Set(ids));
  };

  const excludeCritical = () => {
    const ids = respondents.filter(r => r.status === 'CRÍTICO').map(r => r.id);
    setExcludedIds(prev => { const s = new Set(prev); ids.forEach(i => s.add(i)); return s; });
  };

  const clear = () => setExcludedIds(new Set());

  const doRecalc = async () => { if (onRecalculate) await onRecalculate(activeRespondents.map(r => r.id)); };

  const statusColor = (s: string) => ({
    'CONFIÁVEL': 'bg-green-100 text-green-800 border-green-200',
    'REVISAR': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'SUSPEITO': 'bg-orange-100 text-orange-800 border-orange-200',
    'CRÍTICO': 'bg-red-100 text-red-800 border-red-200'
  }[s] || 'bg-gray-100 text-gray-800');

  const statusIcon = (s: string) => ({ 'CONFIÁVEL': '✅', 'REVISAR': '⚠️', 'SUSPEITO': '🟠', 'CRÍTICO': '🔴' }[s] || '❓');
  const crColor = (cr: number) => cr <= 0.08 ? 'text-green-600' : cr <= 0.1 ? 'text-yellow-600' : cr <= 0.15 ? 'text-orange-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* PAINEL DE IMPACTO */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">📊 Painel de Impacto da Filtragem</h3>
          <div className="flex gap-2">
            <button onClick={clear} disabled={excludedIds.size === 0}
              className={\`px-3 py-1.5 rounded-lg text-sm font-medium \${excludedIds.size === 0 ? 'bg-gray-200 text-gray-400' : 'bg-white text-indigo-600 hover:bg-indigo-100 border border-indigo-300'}\`}>
              🔄 Limpar
            </button>
            {onRecalculate && (
              <button onClick={doRecalc} disabled={isRecalculating || excludedIds.size === 0}
                className={\`px-4 py-1.5 rounded-lg text-sm font-medium \${isRecalculating || excludedIds.size === 0 ? 'bg-gray-300 text-gray-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}\`}>
                {isRecalculating ? '⏳ Calculando...' : '🔬 Recalcular AHP'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-xs text-gray-500 mb-1">Amostra</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-400 line-through">{originalStats.total}</span>
              <span className="text-3xl font-bold text-indigo-600">{currentStats.total}</span>
            </div>
            <p className="text-xs text-gray-500">{excludedIds.size > 0 ? \`-\${excludedIds.size} excluídos\` : 'Sem exclusões'}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-xs text-gray-500 mb-1">CR Médio</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-400 line-through">{(originalStats.avgCR * 100).toFixed(2)}%</span>
              <span className={\`text-2xl font-bold \${crColor(currentStats.avgCR)}\`}>{(currentStats.avgCR * 100).toFixed(2)}%</span>
            </div>
            <p className={\`text-xs \${crVariation < 0 ? 'text-green-600' : crVariation > 0 ? 'text-red-600' : 'text-gray-500'}\`}>
              {crVariation !== 0 ? \`\${crVariation < 0 ? '↓' : '↑'} \${Math.abs(crVariation).toFixed(1)}%\` : 'Sem variação'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-xs text-gray-500 mb-1">Score Qualidade</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-400 line-through">{originalStats.avgScore.toFixed(0)}</span>
              <span className={\`text-2xl font-bold \${currentStats.avgScore >= 80 ? 'text-green-600' : currentStats.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'}\`}>
                {currentStats.avgScore.toFixed(0)}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-xs text-gray-500 mb-1">Confiáveis</p>
            <span className="text-2xl font-bold text-green-600">{currentStats.confiavel}</span>
            <span className="text-sm text-gray-500"> / {currentStats.total}</span>
          </div>
        </div>

        {currentStats.total < 5 && currentStats.total > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ Amostra pequena ({currentStats.total}). Mínimo: 5 especialistas.
          </div>
        )}
        {excludedIds.size > 0 && currentStats.avgCR < originalStats.avgCR && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✅ Melhoria: CR reduziu {Math.abs(crVariation).toFixed(1)}%
          </div>
        )}
      </div>

      {/* AÇÕES RÁPIDAS */}
      <div className="bg-white rounded-xl shadow-sm p-4 border flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Ações:</span>
        <button onClick={excludeCritical} disabled={originalStats.critico === 0}
          className={\`px-3 py-1.5 rounded-lg text-sm \${originalStats.critico === 0 ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'}\`}>
          🔴 Excluir Críticos ({originalStats.critico})
        </button>
        <button onClick={excludeProblematic} disabled={originalStats.suspeito + originalStats.critico === 0}
          className={\`px-3 py-1.5 rounded-lg text-sm \${originalStats.suspeito + originalStats.critico === 0 ? 'bg-gray-100 text-gray-400' : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'}\`}>
          🟠 Excluir Problemáticos ({originalStats.suspeito + originalStats.critico})
        </button>
        <div className="flex-1" />
        <span className="text-sm text-gray-500">{excludedIds.size} de {respondents.length} excluídos</span>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h4 className="font-semibold text-gray-800">👥 Respondentes ({activeRespondents.length} ativos)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-center w-20">Incluir</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100" onClick={() => { sortBy === 'status' ? setSortOrder(o => o === 'asc' ? 'desc' : 'asc') : setSortBy('status'); }}>
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100" onClick={() => { sortBy === 'score' ? setSortOrder(o => o === 'asc' ? 'desc' : 'asc') : setSortBy('score'); }}>
                  Score {sortBy === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100" onClick={() => { sortBy === 'cr' ? setSortOrder(o => o === 'asc' ? 'desc' : 'asc') : setSortBy('cr'); }}>
                  CR {sortBy === 'cr' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left">Problemas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRespondents.map(r => {
                const excluded = excludedIds.has(r.id);
                const cr = r.cr || r.metrics?.avgCR || 0;
                const problem = r.status === 'SUSPEITO' || r.status === 'CRÍTICO';
                return (
                  <tr key={r.id} className={\`\${excluded ? 'bg-gray-100 opacity-60' : problem ? 'bg-red-50/50' : 'hover:bg-gray-50'}\`}>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggle(r.id)} className={\`w-12 h-6 rounded-full relative \${excluded ? 'bg-gray-300' : 'bg-indigo-600'}\`}>
                        <span className={\`absolute top-1 w-4 h-4 bg-white rounded-full transition-all \${excluded ? 'left-1' : 'left-7'}\`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border \${statusColor(r.status)}\`}>
                        {statusIcon(r.status)} {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`font-bold \${(r.overallScore || 0) >= 80 ? 'text-green-600' : (r.overallScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'}\`}>
                        {r.overallScore || '-'}
                      </span>
                    </td>
                    <td className={\`px-4 py-3 text-center font-mono \${crColor(cr)}\`}>{(cr * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3">
                      {r.flags && r.flags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.flags.slice(0, 2).map((f, i) => (
                            <span key={i} className={\`px-2 py-0.5 rounded text-xs \${f.severity === 'GRAVE' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}\`}>
                              {f.type.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-green-600 text-xs">✓ OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXCLUÍDOS */}
      {excludedIds.size > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border">
          <h4 className="font-semibold text-gray-700 mb-3">🚫 Excluídos ({excludedIds.size})</h4>
          <div className="flex flex-wrap gap-2">
            {respondents.filter(r => excludedIds.has(r.id)).map(r => (
              <div key={r.id} className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border">
                <span className={\`text-xs px-1.5 py-0.5 rounded \${statusColor(r.status)}\`}>{r.status}</span>
                <span className="text-xs font-mono">{r.id.slice(0, 8)}</span>
                <button onClick={() => toggle(r.id)} className="text-indigo-600 text-xs font-medium">Reincluir</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(path.join(componentsDir, 'QualityAnalysisWithFilter.tsx'), componentCode);
console.log('   ✅ Componente criado: components/QualityAnalysisWithFilter.tsx\n');

// ============================================================
// PASSO 2: ATUALIZAR PAGE.TSX
// ============================================================

console.log('📝 PASSO 2: Atualizando page.tsx...\n');

const pagePath = path.join(__dirname, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.error('❌ Arquivo não encontrado:', pagePath);
  process.exit(1);
}

let content = fs.readFileSync(pagePath, 'utf8');
const backup = content;

// 2.1 Adicionar import
if (!content.includes("import QualityAnalysisWithFilter")) {
  const lastImport = content.lastIndexOf("import ");
  const endOfLine = content.indexOf(";", lastImport) + 1;
  content = content.slice(0, endOfLine) + "\nimport QualityAnalysisWithFilter from '@/components/QualityAnalysisWithFilter';" + content.slice(endOfLine);
  console.log('   ✅ Import adicionado');
}

// 2.2 Adicionar useMemo para qualityRespondentsData
if (!content.includes('qualityRespondentsData')) {
  const memoCode = `

  // Dados formatados para filtro de qualidade
  const qualityRespondentsData = useMemo(() => {
    if (!qualityAnalysis?.respondents) return [];
    return qualityAnalysis.respondents.map((r: any) => ({
      id: r.respondentId || r.id || String(Math.random()),
      cr: r.metrics?.avgCR || 0,
      status: r.status || 'REVISAR',
      overallScore: r.overallScore || 0,
      isSimulated: r.isSimulated || false,
      metrics: r.metrics,
      flags: r.flags || []
    }));
  }, [qualityAnalysis]);
`;
  
  // Inserir após demographicDashboardData
  const insertPoint = content.indexOf('}, [respondentsDemographics]);');
  if (insertPoint > 0) {
    const pos = insertPoint + '}, [respondentsDemographics]);'.length;
    content = content.slice(0, pos) + memoCode + content.slice(pos);
    console.log('   ✅ useMemo qualityRespondentsData adicionado');
  }
}

// 2.3 Adicionar o componente na TAB quality
if (!content.includes('<QualityAnalysisWithFilter')) {
  // Procurar pelo bloco {qualityAnalysis && (
  const searchStr = '{qualityAnalysis && (';
  const idx = content.indexOf(searchStr);
  
  if (idx > 0) {
    // Encontrar o <> depois
    const fragStart = content.indexOf('<>', idx);
    if (fragStart > 0 && fragStart < idx + 100) {
      const insertPos = fragStart + 2;
      const componentCode = `
                {/* Painel de Filtro de Respondentes */}
                <QualityAnalysisWithFilter respondents={qualityRespondentsData || []} />
`;
      content = content.slice(0, insertPos) + componentCode + content.slice(insertPos);
      console.log('   ✅ Componente inserido na TAB quality');
    }
  }
}

// Salvar
if (content !== backup) {
  const backupPath = pagePath + '.backup-' + Date.now();
  fs.writeFileSync(backupPath, backup);
  console.log('   📦 Backup: ' + backupPath);
  
  fs.writeFileSync(pagePath, content);
  console.log('   💾 page.tsx salvo!\n');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('✨ INSTALAÇÃO CONCLUÍDA!');
console.log('═══════════════════════════════════════════════════════════');
console.log('\n📋 Agora execute:');
console.log('   npm run dev\n');
console.log('🌐 Acesse: http://localhost:3000');
console.log('📍 Navegue até: Resultados → Aba "Qualidade"\n');
