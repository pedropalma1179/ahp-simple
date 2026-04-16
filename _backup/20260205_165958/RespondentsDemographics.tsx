// components/RespondentsDemographics.tsx
// Componente para exibir resumo demográfico dos especialistas no dashboard

'use client';

import { Respondent } from '@/lib/data';

interface RespondentsDemographicsProps {
  respondents: Respondent[];
}

// Labels para exibição
const LABELS = {
  faixaIdade: {
    '<30': 'Menos de 30 anos',
    '31-40': '31 a 40 anos',
    '41-50': '41 a 50 anos',
    '>50': 'Mais de 50 anos',
  },
  genero: {
    'masculino': 'Masculino',
    'feminino': 'Feminino',
    'outro': 'Outro',
    'prefiro_nao_informar': 'Não informado',
  },
  nivelFormacao: {
    'ensino_medio': 'Ensino Médio',
    'superior': 'Superior',
    'especializacao': 'Especialização/MBA',
    'mestrado': 'Mestrado',
    'doutorado': 'Doutorado ou Acima',
  },
  areaFormacao: {
    'administracao': 'Administração',
    'engenharias': 'Engenharias',
    'logistica': 'Logística',
    'marketing': 'Marketing',
    'ti_sistemas': 'TI / Sistemas de Informação',
    'ciencias_exatas': 'Ciências Exatas',
    'outra': 'Outra',
  },
  tempoTrabalho: {
    '<10': 'Menos de 10 anos',
    '11-20': '11 a 20 anos',
    '21-30': '21 a 30 anos',
    '>30': 'Mais de 30 anos',
  },
  tempoGestor: {
    '0': 'Não atua como gestor',
    '<10': 'Menos de 10 anos',
    '11-20': '11 a 20 anos',
    '21-30': '21 a 30 anos',
    '>30': 'Mais de 30 anos',
  },
  areaAtuacao: {
    'gerencial': 'Gerencial',
    'engenharia_processos': 'Eng. de Processos/Produção',
    'planejamento_logistica': 'Planejamento e Logística',
    'producao': 'Produção',
    'projetos': 'Projetos',
    'qualidade': 'Qualidade / Melhoria Contínua',
    'manutencao': 'Manutenção',
    'outra': 'Outra',
  },
  funcao: {
    'c_level': 'C-Level',
    'diretor': 'Diretor',
    'gerente': 'Gerente',
    'supervisor': 'Supervisor / Coordenador',
    'analista_especialista': 'Analista / Especialista / Engenheiro',
  },
};

// Função para contar ocorrências
function countBy<T extends string>(items: (T | undefined)[]): Record<string, number> {
  return items.reduce((acc, item) => {
    if (item) {
      acc[item] = (acc[item] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
}

// Função para calcular percentual
function toPercent(count: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

export function RespondentsDemographics({ respondents }: RespondentsDemographicsProps) {
  // Filtrar apenas respondentes com perfil completo
  const completedProfiles = respondents.filter(r => r.perfilCompleto);
  const total = completedProfiles.length;

  if (total === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <p className="text-gray-500">Nenhum especialista completou o perfil demográfico ainda.</p>
      </div>
    );
  }

  // Calcular distribuições
  const distributions = {
    faixaIdade: countBy(completedProfiles.map(r => r.faixaIdade)),
    genero: countBy(completedProfiles.map(r => r.genero)),
    nivelFormacao: countBy(completedProfiles.map(r => r.nivelFormacao)),
    areaFormacao: countBy(completedProfiles.map(r => r.areaFormacao)),
    tempoTrabalho: countBy(completedProfiles.map(r => r.tempoTrabalho)),
    tempoGestor: countBy(completedProfiles.map(r => r.tempoGestor)),
    areaAtuacao: countBy(completedProfiles.map(r => r.areaAtuacao)),
    funcao: countBy(completedProfiles.map(r => r.funcao)),
  };

  const renderDistribution = (
    title: string, 
    distribution: Record<string, number>, 
    labels: Record<string, string>,
    color: string
  ) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`px-4 py-2 ${color}`}>
        <h4 className="font-medium text-white text-sm">{title}</h4>
      </div>
      <div className="p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs">
              <th className="text-left pb-2">Categoria</th>
              <th className="text-center pb-2 w-16">n</th>
              <th className="text-center pb-2 w-16">%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(labels).map(([key, label]) => {
              const count = distribution[key] || 0;
              if (count === 0) return null;
              return (
                <tr key={key} className="border-t border-gray-100">
                  <td className="py-1.5 text-gray-700">{label}</td>
                  <td className="py-1.5 text-center font-medium">{count}</td>
                  <td className="py-1.5 text-center text-gray-500">{toPercent(count, total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Caracterização dos Especialistas</h3>
          <p className="text-sm text-gray-500">n = {total} respondentes com perfil completo</p>
        </div>
        <button
          onClick={() => {
            // Gerar CSV com dados
            const headers = ['Nome', 'Email', 'Faixa Idade', 'Gênero', 'Nível Formação', 'Área Formação', 
                           'Tempo Trabalho', 'Tempo Gestor', 'Área Atuação', 'Função', 'Concluído Em'];
            const rows = completedProfiles.map(r => [
              r.nome || '',
              r.email,
              LABELS.faixaIdade[r.faixaIdade as keyof typeof LABELS.faixaIdade] || '',
              LABELS.genero[r.genero as keyof typeof LABELS.genero] || '',
              LABELS.nivelFormacao[r.nivelFormacao as keyof typeof LABELS.nivelFormacao] || '',
              r.areaFormacao === 'outra' ? r.areaFormacaoOutra : (LABELS.areaFormacao[r.areaFormacao as keyof typeof LABELS.areaFormacao] || ''),
              LABELS.tempoTrabalho[r.tempoTrabalho as keyof typeof LABELS.tempoTrabalho] || '',
              LABELS.tempoGestor[r.tempoGestor as keyof typeof LABELS.tempoGestor] || '',
              r.areaAtuacao === 'outra' ? r.areaAtuacaoOutra : (LABELS.areaAtuacao[r.areaAtuacao as keyof typeof LABELS.areaAtuacao] || ''),
              LABELS.funcao[r.funcao as keyof typeof LABELS.funcao] || '',
              r.completedAt ? new Date(r.completedAt).toLocaleDateString('pt-BR') : '',
            ]);
            
            const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `especialistas_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
          }}
          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
        >
          📥 Exportar CSV
        </button>
      </div>

      {/* Grid de Distribuições */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderDistribution('Faixa de Idade', distributions.faixaIdade, LABELS.faixaIdade, 'bg-blue-600')}
        {renderDistribution('Gênero', distributions.genero, LABELS.genero, 'bg-purple-600')}
        {renderDistribution('Nível de Formação', distributions.nivelFormacao, LABELS.nivelFormacao, 'bg-indigo-600')}
        {renderDistribution('Área de Formação', distributions.areaFormacao, LABELS.areaFormacao, 'bg-teal-600')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderDistribution('Tempo de Trabalho', distributions.tempoTrabalho, LABELS.tempoTrabalho, 'bg-orange-600')}
        {renderDistribution('Tempo como Gestor', distributions.tempoGestor, LABELS.tempoGestor, 'bg-amber-600')}
        {renderDistribution('Área de Atuação', distributions.areaAtuacao, LABELS.areaAtuacao, 'bg-green-600')}
        {renderDistribution('Função', distributions.funcao, LABELS.funcao, 'bg-red-600')}
      </div>

      {/* Tabela Detalhada (Estilo Acadêmico) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <h4 className="font-medium text-gray-800">Tabela para Dissertação/Artigo</h4>
          <p className="text-xs text-gray-500">Formato pronto para copiar</p>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-left">Variável</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Definição/Faixa</th>
                <th className="border border-gray-300 px-3 py-2 text-center">n</th>
                <th className="border border-gray-300 px-3 py-2 text-center">%</th>
              </tr>
            </thead>
            <tbody>
              {/* Idade */}
              <tr className="bg-blue-50">
                <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.faixaIdade).length + 1}>Idade</td>
              </tr>
              {Object.entries(LABELS.faixaIdade).map(([key, label]) => {
                const count = distributions.faixaIdade[key] || 0;
                if (count === 0) return null;
                return (
                  <tr key={`idade-${key}`}>
                    <td className="border border-gray-300 px-3 py-1">{label}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center">{count}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(count, total)}</td>
                  </tr>
                );
              })}

              {/* Gênero */}
              <tr className="bg-purple-50">
                <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.genero).length + 1}>Gênero</td>
              </tr>
              {Object.entries(LABELS.genero).map(([key, label]) => {
                const count = distributions.genero[key] || 0;
                if (count === 0) return null;
                return (
                  <tr key={`genero-${key}`}>
                    <td className="border border-gray-300 px-3 py-1">{label}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center">{count}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(count, total)}</td>
                  </tr>
                );
              })}

              {/* Nível de Formação */}
              <tr className="bg-indigo-50">
                <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.nivelFormacao).length + 1}>Nível de Formação</td>
              </tr>
              {Object.entries(LABELS.nivelFormacao).map(([key, label]) => {
                const count = distributions.nivelFormacao[key] || 0;
                if (count === 0) return null;
                return (
                  <tr key={`formacao-${key}`}>
                    <td className="border border-gray-300 px-3 py-1">{label}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center">{count}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(count, total)}</td>
                  </tr>
                );
              })}

              {/* Função */}
              <tr className="bg-red-50">
                <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.funcao).length + 1}>Função</td>
              </tr>
              {Object.entries(LABELS.funcao).map(([key, label]) => {
                const count = distributions.funcao[key] || 0;
                if (count === 0) return null;
                return (
                  <tr key={`funcao-${key}`}>
                    <td className="border border-gray-300 px-3 py-1">{label}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center">{count}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(count, total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota de Rodapé */}
      <p className="text-xs text-gray-500 text-center">
        Fonte: Dados coletados pelo sistema AHP-BOCR. Produção do próprio autor.
      </p>
    </div>
  );
}

export default RespondentsDemographics;
