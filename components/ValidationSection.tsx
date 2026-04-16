// components/ValidationSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface ValidationSectionProps {
  projectId: string;
}

interface ValidationReport {
  projectId: string;
  projectName: string;
  timestamp: string;
  library: string;
  tolerance: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
    passRate: number;
  };
  tests: Array<{
    test: string;
    category: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    yourValue: number | number[];
    referenceValue: number | number[];
    difference: number;
    differencePercent: number;
    tolerance: number;
    message: string;
  }>;
  metadata: {
    responseCount: number;
    alternativesCount: number;
    version: string;
  };
}

export default function ValidationSection({ projectId }: ValidationSectionProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Executar validação automaticamente ao montar
  useEffect(() => {
    runValidation();
  }, [projectId]);

  async function runValidation() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });

      if (!response.ok) {
        throw new Error('Falha na validação');
      }

      const data = await response.json();

      if (data.success) {
        setReport(data.report);
      } else {
        setError(data.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro na validação:', err);
      setError('Erro ao executar validação');
    } finally {
      setLoading(false);
    }
  }

  function downloadReport(format: 'json' | 'txt') {
    if (!report) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
      filename = `validacao-${report.projectId}-${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      content = generateTextReport(report);
      filename = `validacao-${report.projectId}-${Date.now()}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateTextReport(report: ValidationReport): string {
    let text = '';
    text += '='.repeat(70) + '\n';
    text += 'RELATÓRIO DE VALIDAÇÃO CIENTÍFICA AHP\n';
    text += '='.repeat(70) + '\n\n';
    text += `Projeto: ${report.projectName}\n`;
    text += `Data: ${new Date(report.timestamp).toLocaleString('pt-BR')}\n`;
    text += `Biblioteca: ${report.library}\n`;
    text += `Tolerância: ${(report.tolerance * 100).toFixed(2)}%\n\n`;

    text += '='.repeat(70) + '\n';
    text += 'RESUMO\n';
    text += '='.repeat(70) + '\n';
    text += `Total de Testes: ${report.summary.total}\n`;
    text += `✅ Aprovados: ${report.summary.passed}\n`;
    text += `❌ Reprovados: ${report.summary.failed}\n`;
    text += `⚠️  Avisos: ${report.summary.warned}\n`;
    text += `Taxa de Aprovação: ${report.summary.passRate.toFixed(1)}%\n\n`;

    text += '='.repeat(70) + '\n';
    text += 'TESTES DETALHADOS\n';
    text += '='.repeat(70) + '\n\n';

    report.tests.forEach((test, idx) => {
      text += `TESTE ${idx + 1}: ${test.test}\n`;
      text += '-'.repeat(70) + '\n';
      text += `Status: ${test.status}\n`;
      text += `Categoria: ${test.category}\n`;
      text += `Diferença: ${(test.differencePercent).toFixed(4)}%\n`;
      text += `Mensagem: ${test.message}\n\n`;
    });

    text += '='.repeat(70) + '\n';
    text += 'METADADOS\n';
    text += '='.repeat(70) + '\n';
    text += `Respondentes: ${report.metadata.responseCount}\n`;
    text += `Alternativas: ${report.metadata.alternativesCount}\n`;
    text += `Versão: ${report.metadata.version}\n`;

    return text;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-lg text-gray-600">Validando cálculos AHP...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Erro na Validação</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={runValidation}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!report) {
    return <div className="text-center py-12 text-gray-500">Carregando validação...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔬 Validação Científica AHP
        </h2>
        <p className="text-gray-600">
          Comparação com biblioteca consolidada (ahp-lite) para garantir precisão matemática
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total de Testes</div>
          <div className="text-3xl font-bold text-gray-900">{report.summary.total}</div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6 border border-green-200">
          <div className="text-sm text-green-600 mb-1">✅ Aprovados</div>
          <div className="text-3xl font-bold text-green-700">{report.summary.passed}</div>
        </div>

        <div className="bg-red-50 rounded-lg shadow p-6 border border-red-200">
          <div className="text-sm text-red-600 mb-1">❌ Reprovados</div>
          <div className="text-3xl font-bold text-red-700">{report.summary.failed}</div>
        </div>

        <div className="bg-blue-50 rounded-lg shadow p-6 border border-blue-200">
          <div className="text-sm text-blue-600 mb-1">Taxa de Aprovação</div>
          <div className="text-3xl font-bold text-blue-700">
            {report.summary.passRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Status Geral */}
      <div className={`rounded-lg shadow p-6 border-2 ${
        report.summary.failed === 0
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          {report.summary.failed === 0 ? (
            <>
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h3 className="text-2xl font-bold text-green-900">
                🎉 Validação Completa - Implementação Correta!
              </h3>
            </>
          ) : (
            <>
              <XCircle className="w-8 h-8 text-red-600" />
              <h3 className="text-2xl font-bold text-red-900">
                ⚠️ Atenção - Discrepâncias Encontradas
              </h3>
            </>
          )}
        </div>
        <p className={report.summary.failed === 0 ? 'text-green-700' : 'text-red-700'}>
          {report.summary.failed === 0
            ? `Todos os ${report.summary.total} testes passaram com diferenças < ${(report.tolerance * 100).toFixed(2)}%. A implementação AHP está matematicamente correta e pode ser usada com confiança.`
            : `${report.summary.failed} teste(s) falharam. Revise a implementação para garantir precisão matemática.`
          }
        </p>
      </div>

      {/* Gráfico de Distribuição */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-bold mb-4">📊 Distribuição de Resultados</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[
                { name: 'Aprovados', value: report.summary.passed, fill: '#10b981' },
                { name: 'Reprovados', value: report.summary.failed, fill: '#ef4444' },
                { name: 'Avisos', value: report.summary.warned, fill: '#f59e0b' }
              ].filter(d => d.value > 0)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={100}
              dataKey="value"
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Diferenças */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-bold mb-4">📈 Diferenças Percentuais por Teste</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={report.tests.map(t => ({
            name: t.test.slice(0, 25),
            diff: t.differencePercent,
            tolerance: report.tolerance * 100
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} fontSize={11} />
            <YAxis label={{ value: 'Diferença (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="diff" fill="#3b82f6" name="Diferença (%)" />
            <Bar dataKey="tolerance" fill="#ef4444" name="Tolerância (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold">📋 Resultados Detalhados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teste</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diferença</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {report.tests.map((test, idx) => (
                <tr key={idx} className={
                  test.status === 'PASS' ? 'bg-green-50' :
                  test.status === 'FAIL' ? 'bg-red-50' :
                  'bg-yellow-50'
                }>
                  <td className="px-6 py-4 text-sm text-gray-900">{test.test}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{test.category}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      test.status === 'PASS' ? 'bg-green-100 text-green-800' :
                      test.status === 'FAIL' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {test.status === 'PASS' ? '✅ PASS' :
                       test.status === 'FAIL' ? '❌ FAIL' :
                       '⚠️ WARN'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {test.differencePercent.toFixed(4)}%
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{test.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadados */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-bold mb-4">ℹ️ Informações do Projeto</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Respondentes</div>
            <div className="text-lg font-semibold">{report.metadata.responseCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Alternativas</div>
            <div className="text-lg font-semibold">{report.metadata.alternativesCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Versão</div>
            <div className="text-lg font-semibold">{report.metadata.version}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Biblioteca</div>
            <div className="text-lg font-semibold">ahp-lite</div>
          </div>
        </div>
      </div>

      {/* Botões de Download */}
      <div className="flex gap-4">
        <button
          onClick={() => downloadReport('json')}
          className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-5 h-5" />
          Baixar Relatório JSON
        </button>
        <button
          onClick={() => downloadReport('txt')}
          className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-5 h-5" />
          Baixar Relatório TXT
        </button>
      </div>

      {/* Info para Dissertação */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-bold text-blue-900 mb-2">📚 Para Dissertação</h4>
        <p className="text-blue-800 text-sm">
          <strong>Metodologia - Validação:</strong>
        </p>
        <div className="mt-2 bg-white p-4 rounded border border-blue-200">
          <p className="text-gray-700 text-sm italic">
            "A implementação AHP foi validada através de comparação sistemática com biblioteca 
            consolidada (ahp-lite), confirmando precisão matemática com diferenças &lt; {(report.tolerance * 100).toFixed(2)}% 
            em {report.summary.passed} de {report.summary.total} testes ({report.summary.passRate.toFixed(1)}% aprovação). 
            Esta validação independente assegura a correção matemática dos resultados e a confiabilidade 
            científica da metodologia adotada."
          </p>
        </div>
      </div>
    </div>
  );
}
