// app/decisor/simulacao/page.tsx
// Página para simulação de respondentes e testes de stress
// Versão corrigida: autenticação + campos demográficos compatíveis

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';

interface SimulationResult {
  success: boolean;
  message: string;
  results: {
    respondentsCreated: number;
    responsesCreated: number;
    patternDistribution: Record<string, number>;
    demographicsGenerated?: number;
  };
  calculation?: {
    bocrWeights: string[];
    bocrConsistency: {
      cr: string;
      crPercent: string;
      status: string;
    };
    finalRanking: { rank: number; code: string; name: string; scoreSubtractive: string; isTied?: boolean }[];
  };
  metrics?: {
    executionTimeMs: number;
    avgTimePerRespondent: number;
  };
  robustnessReport?: {
    rankings: Record<string, { code: string; name: string; score: string }[]>;
    winners: Record<string, string>;
    consensusWinner: string | null;
    convergenceMatrix: Record<string, Record<string, boolean>>;
    winCounts: Record<string, number>;
  };
  qaReport?: {
    summary: {
      total: number;
      passed: number;
      failed: number;
      warned: number;
      status: string;
    };
    tests: { test: string; status: 'PASS' | 'FAIL' | 'WARN'; expected?: any; actual?: any; message: string }[];
  };
  timestamp: string;
}

interface Project {
  id: string;
  name: string;
  alternatives: { code: string; name: string }[];
  responseCount?: number;
}

export default function SimulacaoPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [count, setCount] = useState(10);
  const [pattern, setPattern] = useState('mixed');
  const [consistencyFactor, setConsistencyFactor] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalRespondents: number;
    simulatedRespondents: number;
    totalResponses: number;
    simulatedResponses: number;
  } | null>(null);

  // Autenticação corrigida
  useEffect(() => {
    const auth = sessionStorage.getItem('isAuthenticated');
    if (auth !== 'true') {
      window.location.href = '/';
      return;
    }
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadStats();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const projectsSnapshot = await getDocs(collection(db, 'projects'));
      const projectsList = projectsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Project[];
      setProjects(projectsList);
      if (projectsList.length > 0) {
        setSelectedProject(projectsList[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadStats = async () => {
    if (!selectedProject) return;
    
    try {
      // Buscar respondentes
      const respondentsQuery = query(
        collection(db, 'respondents'),
        where('projectId', '==', selectedProject)
      );
      const respondentsSnapshot = await getDocs(respondentsQuery);
      const respondents = respondentsSnapshot.docs.map(d => d.data());
      
      // Buscar respostas
      const responsesQuery = query(
        collection(db, 'responses'),
        where('projectId', '==', selectedProject)
      );
      const responsesSnapshot = await getDocs(responsesQuery);
      const responses = responsesSnapshot.docs.map(d => d.data());

      setStats({
        totalRespondents: respondents.length,
        simulatedRespondents: respondents.filter(r => r.isSimulated).length,
        totalResponses: responses.length,
        simulatedResponses: responses.filter(r => r.isSimulated).length,
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const handleSimulate = async () => {
    if (!selectedProject) {
      setError('Selecione um projeto');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          count,
          pattern,
          consistencyFactor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na simulação');
      }

      setResult(data);
      loadStats(); // Atualizar estatísticas
    } catch (err: any) {
      setError(err.message || 'Erro ao executar simulação');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!selectedProject) return;
    
    if (!confirm('⚠️ ATENÇÃO: Isso irá EXCLUIR:\n\n• Todos os dados simulados (respondentes e respostas)\n• Os resultados calculados (precisarão ser recalculados)\n\nDados REAIS NÃO serão afetados. Continuar?')) {
      return;
    }

    setCleanupLoading(true);
    setError(null);

    try {
      // Buscar e excluir respondentes simulados
      const respondentsQuery = query(
        collection(db, 'respondents'),
        where('projectId', '==', selectedProject),
        where('isSimulated', '==', true)
      );
      const respondentsSnapshot = await getDocs(respondentsQuery);
      
      for (const docSnap of respondentsSnapshot.docs) {
        await deleteDoc(doc(db, 'respondents', docSnap.id));
      }

      // Buscar e excluir respostas simuladas
      const responsesQuery = query(
        collection(db, 'responses'),
        where('projectId', '==', selectedProject),
        where('isSimulated', '==', true)
      );
      const responsesSnapshot = await getDocs(responsesQuery);
      
      for (const docSnap of responsesSnapshot.docs) {
        await deleteDoc(doc(db, 'responses', docSnap.id));
      }

      // Excluir o cálculo salvo (já que os dados mudaram, precisa recalcular)
      try {
        await deleteDoc(doc(db, 'calculations', selectedProject));
      } catch (calcErr) {
        console.log('Nenhum cálculo salvo para excluir');
      }

      setResult({
        success: true,
        message: `Limpeza concluída: ${respondentsSnapshot.size} respondentes, ${responsesSnapshot.size} respostas e resultados calculados removidos`,
        results: {
          respondentsCreated: 0,
          responsesCreated: 0,
          patternDistribution: {},
        },
        timestamp: new Date().toISOString(),
      });

      loadStats();
    } catch (err: any) {
      setError(err.message || 'Erro ao limpar dados simulados');
    } finally {
      setCleanupLoading(false);
    }
  };

  // Limpar TODOS os dados do projeto (simulados + reais/órfãos)
  const handleCleanupAll = async () => {
    if (!selectedProject) return;
    
    const confirmText = `⚠️ ATENÇÃO MÁXIMA!\n\nIsso irá EXCLUIR TODOS os dados do projeto:\n- Todos os respondentes (simulados E reais)\n- Todas as respostas (simuladas E reais)\n- Todos os resultados calculados\n\nEsta ação NÃO pode ser desfeita!\n\nDigite "CONFIRMAR" para prosseguir:`;
    
    const userInput = prompt(confirmText);
    if (userInput !== 'CONFIRMAR') {
      alert('Operação cancelada. Digite exatamente "CONFIRMAR" para prosseguir.');
      return;
    }

    setCleanupLoading(true);
    setError(null);

    try {
      // Buscar e excluir TODOS os respondentes do projeto
      const respondentsQuery = query(
        collection(db, 'respondents'),
        where('projectId', '==', selectedProject)
      );
      const respondentsSnapshot = await getDocs(respondentsQuery);
      
      for (const docSnap of respondentsSnapshot.docs) {
        await deleteDoc(doc(db, 'respondents', docSnap.id));
      }

      // Buscar e excluir TODAS as respostas do projeto
      const responsesQuery = query(
        collection(db, 'responses'),
        where('projectId', '==', selectedProject)
      );
      const responsesSnapshot = await getDocs(responsesQuery);
      
      for (const docSnap of responsesSnapshot.docs) {
        await deleteDoc(doc(db, 'responses', docSnap.id));
      }

      // Excluir o cálculo salvo do projeto (se existir)
      try {
        await deleteDoc(doc(db, 'calculations', selectedProject));
      } catch (calcErr) {
        // Ignora se não existir
        console.log('Nenhum cálculo salvo para excluir');
      }

      setResult({
        success: true,
        message: `🧹 Limpeza TOTAL concluída: ${respondentsSnapshot.size} respondentes, ${responsesSnapshot.size} respostas e resultados calculados removidos`,
        results: {
          respondentsCreated: 0,
          responsesCreated: 0,
          patternDistribution: {},
        },
        timestamp: new Date().toISOString(),
      });

      loadStats();
    } catch (err: any) {
      setError(err.message || 'Erro ao limpar todos os dados');
    } finally {
      setCleanupLoading(false);
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  const PATTERN_INFO = {
    mixed: { 
      label: '🎲 Misto (Realista)', 
      desc: 'Mistura de todos os padrões com distribuição realista' 
    },
    consistent: { 
      label: '✓ Consistente', 
      desc: 'Respostas logicamente consistentes (B>O>C>R)' 
    },
    random: { 
      label: '🎰 Aleatório', 
      desc: 'Respostas completamente aleatórias' 
    },
    biased_benefits: { 
      label: '📈 Pró-Benefícios', 
      desc: 'Favorece Benefícios e Oportunidades' 
    },
    biased_costs: { 
      label: '📉 Pró-Custos', 
      desc: 'Favorece Custos e Riscos (conservador)' 
    },
    moderate: { 
      label: '⚖️ Moderado', 
      desc: 'Valores baixos na escala Saaty (1-3)' 
    },
    extreme: { 
      label: '⚡ Extremo', 
      desc: 'Valores altos na escala Saaty (7-9)' 
    },
  };

  if (loadingProjects) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧪</span>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Simulação de Respondentes</h1>
              <p className="text-sm text-gray-500">Stress Test do Motor AHP-BOCR</p>
            </div>
          </div>
          <a 
            href="/decisor/projetos"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Voltar aos Projetos
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Seleção de Projeto */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Selecionar Projeto</h2>
          
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum projeto encontrado.</p>
              <a href="/decisor/projetos" className="text-blue-600 hover:underline mt-2 block">
                Criar um projeto primeiro
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.alternatives?.length || 0} alternativas)
                  </option>
                ))}
              </select>

              {selectedProjectData && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Alternativas:</strong>{' '}
                    {selectedProjectData.alternatives?.map(a => a.name).join(', ') || 'Nenhuma'}
                  </p>
                  
                  {stats && (
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Respondentes</p>
                        <p className="font-semibold">
                          {stats.totalRespondents} total 
                          <span className="text-orange-500 ml-1">({stats.simulatedRespondents} simulados)</span>
                          {stats.totalRespondents > stats.simulatedRespondents && (
                            <span className="text-red-500 ml-1">
                              ⚠️ {stats.totalRespondents - stats.simulatedRespondents} real/órfão
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Respostas</p>
                        <p className="font-semibold">
                          {stats.totalResponses} total
                          <span className="text-orange-500 ml-1">({stats.simulatedResponses} simuladas)</span>
                          {stats.totalResponses > stats.simulatedResponses && (
                            <span className="text-red-500 ml-1">
                              ⚠️ {stats.totalResponses - stats.simulatedResponses} real/órfã
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configuração da Simulação */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">2. Configurar Simulação</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade de Respondentes
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                    <span>1</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
                <span className="w-12 text-center font-bold text-lg text-blue-600">{count}</span>
              </div>
            </div>

            {/* Fator de Consistência */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fator de Consistência
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={consistencyFactor * 100}
                    onChange={(e) => setConsistencyFactor(parseInt(e.target.value) / 100)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Maior = respostas mais consistentes (CR menor)
                  </p>
                </div>
                <span className="w-12 text-center font-bold text-lg text-blue-600">{Math.round(consistencyFactor * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Padrão de Resposta */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Padrão de Resposta
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(PATTERN_INFO).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setPattern(key)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    pattern === key 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{info.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{info.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">3. Executar</h2>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleSimulate}
              disabled={loading || !selectedProject}
              className="flex-1 min-w-[200px] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Simulando...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Executar Simulação</span>
                </>
              )}
            </button>

            <button
              onClick={handleCleanup}
              disabled={cleanupLoading || !selectedProject || !stats?.simulatedRespondents}
              className="py-4 px-6 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {cleanupLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Limpando...</span>
                </>
              ) : (
                <>
                  <span>🗑️</span>
                  <span>Limpar Simulados</span>
                </>
              )}
            </button>

            {/* Botão para limpar TUDO (incluindo órfãos) */}
            {stats && (stats.totalResponses > stats.simulatedResponses || stats.totalRespondents > stats.simulatedRespondents) && (
              <button
                onClick={handleCleanupAll}
                disabled={cleanupLoading || !selectedProject}
                className="py-4 px-6 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                title="Remove TODOS os dados do projeto (simulados + reais/órfãos)"
              >
                <span>⚠️</span>
                <span>Limpar TUDO ({(stats.totalRespondents - stats.simulatedRespondents) + (stats.totalResponses - stats.simulatedResponses)} órfãos)</span>
              </button>
            )}
          </div>
        </div>

        {/* Resultado */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className={`rounded-xl p-6 mb-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{result.message}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(result.timestamp).toLocaleString('pt-BR')}
                </p>

                {result.results.respondentsCreated > 0 && (
                  <div className="mt-4 bg-white rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Distribuição de Padrões:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(result.results.patternDistribution).map(([p, count]) => (
                        <div key={p} className="text-sm">
                          <span className="text-gray-500">{PATTERN_INFO[p as keyof typeof PATTERN_INFO]?.label || p}:</span>
                          <span className="font-semibold ml-1">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Métricas */}
                {result.metrics && (
                  <div className="mt-4 bg-white rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">📊 Métricas de Execução:</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Tempo Total:</span>
                        <span className="font-semibold ml-1">{result.metrics.executionTimeMs}ms</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Por Respondente:</span>
                        <span className="font-semibold ml-1">{result.metrics.avgTimePerRespondent}ms</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resultados do Cálculo AHP-BOCR */}
                {result.calculation && (
                  <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm font-bold text-blue-800 mb-3">📐 Cálculo AHP-BOCR Executado</p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Pesos BOCR */}
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-2">Pesos Estratégicos (BOCR):</p>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {['B', 'O', 'C', 'R'].map((merit, idx) => (
                            <div key={merit} className={`p-2 rounded ${
                              merit === 'B' ? 'bg-green-100' : 
                              merit === 'O' ? 'bg-blue-100' : 
                              merit === 'C' ? 'bg-orange-100' : 'bg-red-100'
                            }`}>
                              <p className="text-xs text-gray-500">{merit}</p>
                              <p className="font-bold">{result.calculation!.bocrWeights[idx]}</p>
                            </div>
                          ))}
                        </div>
                        <p className={`text-xs mt-2 text-center ${
                          result.calculation.bocrConsistency.status === 'VÁLIDO' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          CR: {result.calculation.bocrConsistency.crPercent} ({result.calculation.bocrConsistency.status})
                        </p>
                      </div>

                      {/* Ranking Final */}
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-2">Ranking Final (Subtrativo - valores brutos):</p>
                        {(() => {
                          const hasTie = result.calculation!.finalRanking.filter(r => r.rank === 1).length > 1;
                          return (
                            <>
                              {hasTie && (
                                <p className="text-xs text-amber-600 mb-2 font-medium">⚠️ Empate detectado no 1º lugar</p>
                              )}
                              {result.calculation!.finalRanking.map((item: any) => (
                                <div key={item.code} className={`flex justify-between items-center py-1 ${item.rank === 1 ? 'font-bold text-green-700' : ''}`}>
                                  <span>
                                    {item.rank === 1 ? '🏆' : `${item.rank}.`} {item.name}
                                    {item.isTied && <span className="text-xs text-amber-500 ml-1">(empate)</span>}
                                  </span>
                                  <span className="font-mono text-sm">{item.scoreSubtractive}</span>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Relatório de QA */}
                {result.qaReport && (
                  <div className={`mt-4 rounded-lg p-4 border ${
                    result.qaReport.summary.failed === 0 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <p className="text-sm font-bold mb-3">
                      🧪 Relatório de QA - Validação Matemática
                    </p>
                    
                    {/* Summary */}
                    <div className="bg-white rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">{result.qaReport.summary.status}</span>
                        <div className="flex gap-3 text-sm">
                          <span className="text-green-600">✓ {result.qaReport.summary.passed} passou</span>
                          <span className="text-red-600">✗ {result.qaReport.summary.failed} falhou</span>
                          <span className="text-amber-600">⚠ {result.qaReport.summary.warned} avisos</span>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Testes */}
                    <div className="bg-white rounded-lg p-3 max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1">Teste</th>
                            <th className="text-center py-1">Status</th>
                            <th className="text-right py-1">Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.qaReport.tests.map((test, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-1">{test.test}</td>
                              <td className="py-1 text-center">
                                {test.status === 'PASS' && <span className="text-green-600">✓</span>}
                                {test.status === 'FAIL' && <span className="text-red-600">✗</span>}
                                {test.status === 'WARN' && <span className="text-amber-600">⚠</span>}
                              </td>
                              <td className="py-1 text-right font-mono">{test.actual}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Relatório de Robustez */}
                {result.robustnessReport && (
                  <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                    <p className="text-sm font-bold text-indigo-800 mb-3">🔬 Relatório de Robustez (5 Fórmulas de Síntese)</p>
                    
                    {/* Vencedor de Consenso */}
                    <div className="bg-white rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-1">Vencedor de Consenso:</p>
                      {result.robustnessReport.consensusWinner ? (
                        <p className="text-lg font-bold text-green-600">
                          🏆 {result.robustnessReport.consensusWinner}
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            (venceu em {result.robustnessReport.winCounts[result.robustnessReport.consensusWinner]}/5 métodos)
                          </span>
                        </p>
                      ) : (
                        <p className="text-amber-600 font-medium">⚠️ Sem consenso claro - resultados variam por método</p>
                      )}
                    </div>

                    {/* Matriz de Convergência */}
                    <div className="bg-white rounded-lg p-3 mb-3 overflow-x-auto">
                      <p className="text-xs text-gray-500 mb-2">Matriz de Convergência:</p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-2">Alternativa</th>
                            <th className="text-center py-1 px-1" title="Aditiva">ADD</th>
                            <th className="text-center py-1 px-1" title="Probabilística">PROB</th>
                            <th className="text-center py-1 px-1" title="Subtrativa (Principal)">SUB*</th>
                            <th className="text-center py-1 px-1" title="Multiplicativa Potências">M.POT</th>
                            <th className="text-center py-1 px-1" title="Multiplicativa Simples">M.SIM</th>
                            <th className="text-center py-1 px-1 font-bold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(result.robustnessReport.convergenceMatrix).map(([altCode, methods]) => (
                            <tr key={altCode} className="border-b">
                              <td className="py-1 px-2 font-medium">{altCode}</td>
                              {['additive', 'probabilistic', 'subtractive', 'multiplicative_power', 'multiplicative_simple'].map(method => (
                                <td key={method} className="text-center py-1 px-1">
                                  {(methods as any)[method] ? (
                                    <span className="text-green-600 font-bold">✓</span>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              ))}
                              <td className="text-center py-1 px-1 font-bold text-indigo-600">
                                {result.robustnessReport!.winCounts[altCode]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-400 mt-2">* SUB = Método Subtrativo (Wijnmalen, 2007) - valores brutos, principal da dissertação</p>
                    </div>

                    {/* Vencedores por Método */}
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-2">Vencedor por Método:</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        {[
                          { key: 'additive', label: 'Aditiva', formula: 'b·B + o·O + c·(1-C) + r·(1-R)' },
                          { key: 'probabilistic', label: 'Probabilística', formula: 'Pesos normalizados' },
                          { key: 'subtractive', label: 'Subtrativa ⭐', formula: 'b·B + o·O - c·C - r·R' },
                          { key: 'multiplicative_power', label: 'Mult. Potências', formula: '(B^b·O^o)/(C^c·R^r)' },
                          { key: 'multiplicative_simple', label: 'Mult. Simples', formula: '(B·O)/(C·R)' },
                        ].map(method => (
                          <div key={method.key} className={`p-2 rounded ${method.key === 'subtractive' ? 'bg-indigo-100 border border-indigo-300' : 'bg-gray-50'}`}>
                            <p className="font-medium text-gray-700">{method.label}</p>
                            <p className="text-lg font-bold text-indigo-600">
                              {result.robustnessReport!.winners[method.key]}
                            </p>
                            <p className="text-gray-400 text-[10px] truncate" title={method.formula}>{method.formula}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📖 Como Usar</h2>
          
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex gap-3">
              <span className="text-lg">1️⃣</span>
              <p>Selecione o projeto que deseja testar. O projeto deve ter pelo menos 2 alternativas cadastradas.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">2️⃣</span>
              <p>Configure a quantidade de respondentes (5-100) e o padrão de respostas. O modo "Misto" é recomendado para testes realistas.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">3️⃣</span>
              <p>Execute a simulação. Cada respondente terá um <strong>perfil demográfico completo</strong> gerado automaticamente.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">4️⃣</span>
              <p>Acesse <strong>Resultados</strong> para verificar cálculos, gráficos, perfil demográfico e análises.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">5️⃣</span>
              <p>Use "Limpar Simulados" para remover todos os dados de teste antes de iniciar a coleta real.</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Importante:</strong> Os dados simulados são marcados com flag <code>isSimulated=true</code>. 
              Isso permite distingui-los dos dados reais e removê-los facilmente.
            </p>
          </div>
        </div>

        {/* Links */}
        {selectedProject && (
          <div className="mt-6 flex justify-center gap-6">
            <a 
              href={`/decisor/resultados/${selectedProject}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              📊 Ver Resultados →
            </a>
            <a 
              href="/decisor/projetos"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium"
            >
              📁 Voltar aos Projetos
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
