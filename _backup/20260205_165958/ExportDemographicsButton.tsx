// components/ExportDemographicsButton.tsx
// Componente para exportar dados demográficos em XLSX
// Usa a biblioteca xlsx (SheetJS) para gerar o arquivo no cliente

'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

interface ExportDemographicsButtonProps {
  projectId: string;
  projectName?: string;
}

export default function ExportDemographicsButton({ projectId, projectName }: ExportDemographicsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');

    try {
      // Buscar dados da API
      const response = await fetch(`/api/export-demographics?projectId=${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar dados');
      }

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // ============================================================
      // ABA 1: DADOS INDIVIDUAIS
      // ============================================================
      const individualHeaders = [
        'ID',
        'Email',
        'Status',
        'Faixa Etária',
        'Gênero',
        'Nível de Formação',
        'Área de Formação',
        'Tempo de Trabalho',
        'Tempo como Gestor',
        'Área de Atuação',
        'Função/Cargo',
        'Data Preenchimento',
        'Data Conclusão'
      ];

      const individualRows = data.individualData.map((row: any) => [
        row.id,
        row.email,
        row.status,
        row.idade,
        row.genero,
        row.formacao,
        row.areaFormacao,
        row.tempoTrabalho,
        row.tempoGestor,
        row.areaAtuacao,
        row.funcao,
        row.dataPreenchimento ? new Date(row.dataPreenchimento).toLocaleString('pt-BR') : '',
        row.dataConclusao ? new Date(row.dataConclusao).toLocaleString('pt-BR') : ''
      ]);

      const ws1 = XLSX.utils.aoa_to_sheet([individualHeaders, ...individualRows]);

      // Definir largura das colunas
      ws1['!cols'] = [
        { wch: 5 },   // ID
        { wch: 35 },  // Email
        { wch: 12 },  // Status
        { wch: 18 },  // Idade
        { wch: 12 },  // Gênero
        { wch: 22 },  // Formação
        { wch: 20 },  // Área Formação
        { wch: 18 },  // Tempo Trabalho
        { wch: 20 },  // Tempo Gestor
        { wch: 25 },  // Área Atuação
        { wch: 30 },  // Função
        { wch: 20 },  // Data Preenchimento
        { wch: 20 },  // Data Conclusão
      ];

      XLSX.utils.book_append_sheet(wb, ws1, 'Dados Individuais');

      // ============================================================
      // ABA 2: ESTATÍSTICAS AGREGADAS
      // ============================================================
      const statsRows: any[][] = [];

      // Cabeçalho
      statsRows.push(['PERFIL DOS ESPECIALISTAS - ESTATÍSTICAS AGREGADAS']);
      statsRows.push([`Projeto: ${projectName || projectId}`]);
      statsRows.push([`Total de respondentes: ${data.summary.totalRespondents}`]);
      statsRows.push([`Com dados demográficos: ${data.summary.withDemographics}`]);
      statsRows.push([`Avaliações completas: ${data.summary.completed}`]);
      statsRows.push([`Data de exportação: ${new Date().toLocaleString('pt-BR')}`]);
      statsRows.push([]); // Linha vazia

      // Função para adicionar seção de estatística
      const addStatsSection = (title: string, statsData: any[]) => {
        statsRows.push([title]);
        statsRows.push(['Categoria', 'n', '%']);
        statsData.forEach(item => {
          if (item.n > 0 || true) { // Mostrar todas as categorias
            statsRows.push([item.categoria, item.n, `${item.percentual}%`]);
          }
        });
        statsRows.push([]); // Linha vazia
      };

      // Adicionar todas as seções
      addStatsSection('FAIXA ETÁRIA', data.statistics.idade);
      addStatsSection('GÊNERO', data.statistics.genero);
      addStatsSection('NÍVEL DE FORMAÇÃO', data.statistics.formacao);
      addStatsSection('ÁREA DE FORMAÇÃO', data.statistics.areaFormacao);
      addStatsSection('TEMPO DE TRABALHO NA ÁREA', data.statistics.tempoTrabalho);
      addStatsSection('TEMPO COMO GESTOR', data.statistics.tempoGestor);
      addStatsSection('ÁREA DE ATUAÇÃO', data.statistics.areaAtuacao);
      addStatsSection('FUNÇÃO / CARGO', data.statistics.funcao);

      const ws2 = XLSX.utils.aoa_to_sheet(statsRows);

      // Definir largura das colunas
      ws2['!cols'] = [
        { wch: 40 },  // Categoria
        { wch: 8 },   // n
        { wch: 8 },   // %
      ];

      XLSX.utils.book_append_sheet(wb, ws2, 'Estatísticas');

      // ============================================================
      // ABA 3: TABELA FORMATADA PARA ARTIGO
      // ============================================================
      const articleRows: any[][] = [];
      
      articleRows.push(['Tabela X - Perfil dos especialistas participantes da pesquisa']);
      articleRows.push([]);
      articleRows.push(['Variável', 'Definição/Faixa', 'n', '%']);

      // Função para adicionar variável
      const addVariable = (variableName: string, statsData: any[]) => {
        let isFirst = true;
        statsData.forEach(item => {
          if (item.n > 0) {
            articleRows.push([
              isFirst ? variableName : '',
              item.categoria,
              item.n,
              `${item.percentual}%`
            ]);
            isFirst = false;
          }
        });
      };

      addVariable('Idade', data.statistics.idade);
      addVariable('Gênero', data.statistics.genero);
      addVariable('Nível de Formação', data.statistics.formacao);
      addVariable('Área de Formação', data.statistics.areaFormacao);
      addVariable('Tempo de Trabalho', data.statistics.tempoTrabalho);
      addVariable('Tempo como Gestor', data.statistics.tempoGestor);
      addVariable('Área de Atuação', data.statistics.areaAtuacao);
      addVariable('Função', data.statistics.funcao);

      articleRows.push([]);
      articleRows.push([`Fonte: Dados da pesquisa (n=${data.summary.withDemographics})`]);

      const ws3 = XLSX.utils.aoa_to_sheet(articleRows);

      ws3['!cols'] = [
        { wch: 20 },  // Variável
        { wch: 35 },  // Definição
        { wch: 8 },   // n
        { wch: 8 },   // %
      ];

      XLSX.utils.book_append_sheet(wb, ws3, 'Tabela Artigo');

      // ============================================================
      // GERAR E BAIXAR ARQUIVO
      // ============================================================
      const fileName = `dados_demograficos_${projectName?.replace(/\s+/g, '_') || projectId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (err: any) {
      console.error('Erro na exportação:', err);
      setError(err.message || 'Erro ao exportar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-block">
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Exportando...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Exportar Dados Demográficos (.xlsx)</span>
          </>
        )}
      </button>
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}


// ============================================================
// COMPONENTE ALTERNATIVO: TABELA DE VISUALIZAÇÃO
// ============================================================

interface DemographicsTableProps {
  projectId: string;
}

export function DemographicsTable({ projectId }: DemographicsTableProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/export-demographics?projectId=${projectId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar dados');
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) {
    return (
      <button
        onClick={loadData}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
      >
        Carregar Dados Demográficos
      </button>
    );
  }

  if (loading) {
    return <div className="text-gray-500">Carregando dados demográficos...</div>;
  }

  if (error) {
    return <div className="text-red-500">Erro: {error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Resumo</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total de respondentes:</span>
            <span className="ml-2 font-medium">{data.summary.totalRespondents}</span>
          </div>
          <div>
            <span className="text-gray-500">Com dados demográficos:</span>
            <span className="ml-2 font-medium">{data.summary.withDemographics}</span>
          </div>
          <div>
            <span className="text-gray-500">Avaliações completas:</span>
            <span className="ml-2 font-medium">{data.summary.completed}</span>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(data.statistics).map(([key, stats]: [string, any]) => (
          <div key={key} className="bg-white rounded-lg border p-4">
            <h4 className="font-medium text-gray-700 mb-3 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Categoria</th>
                  <th className="pb-2 text-right">n</th>
                  <th className="pb-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-1.5">{item.categoria}</td>
                    <td className="py-1.5 text-right">{item.n}</td>
                    <td className="py-1.5 text-right">{item.percentual}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
