// app/api/export-demographics/route.ts
// API para exportar dados demográficos dos especialistas em XLSX
// Gera arquivo com 2 abas: Dados Individuais e Estatísticas Agregadas

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

// ============================================================
// MAPEAMENTO DE LABELS
// ============================================================

const LABELS = {
  idade: {
    'menos_30': 'Menos de 30 anos',
    '31_40': '31 a 40 anos',
    '41_50': '41 a 50 anos',
    'mais_50': 'Mais de 50 anos'
  },
  genero: {
    'masculino': 'Masculino',
    'feminino': 'Feminino',
    'outro': 'Outro / Prefiro não informar'
  },
  formacao: {
    'superior': 'Superior (Graduação)',
    'especializacao': 'Especialização / MBA',
    'mestrado': 'Mestrado',
    'doutorado': 'Doutorado ou Acima'
  },
  areaFormacao: {
    'administracao': 'Administração',
    'engenharias': 'Engenharias',
    'logistica': 'Logística',
    'ti_sistemas': 'TI / Sistemas',
    'ciencias_exatas': 'Ciências Exatas',
    'outra': 'Outra'
  },
  tempoTrabalho: {
    'menos_10': 'Menos de 10 anos',
    '11_20': '11 a 20 anos',
    '21_30': '21 a 30 anos',
    'mais_30': 'Mais de 30 anos'
  },
  tempoGestor: {
    'nao_atua': 'Não atuo como gestor',
    'menos_10': 'Menos de 10 anos',
    '11_20': '11 a 20 anos',
    '21_30': '21 a 30 anos',
    'mais_30': 'Mais de 30 anos'
  },
  areaAtuacao: {
    'operacoes': 'Operações',
    'manufatura': 'Manufatura',
    'qualidade': 'Qualidade',
    'financeiro': 'Financeiro',
    'otimizacao_custos': 'Otimização e Custos',
    'p_and_d': 'P&D / Inovação',
    'outro': 'Outro'
  },
  funcao: {
    'c_level': 'C-Level',
    'diretor': 'Diretor',
    'gerente': 'Gerente',
    'supervisor': 'Supervisor',
    'outro': 'Outro'
  }
};

// ============================================================
// TIPOS
// ============================================================

interface DemographicData {
  idade: string;
  genero: string;
  formacao: string;
  areaFormacao: string;
  tempoTrabalho: string;
  tempoGestor: string;
  areaAtuacao: string;
  funcao: string;
  submittedAt?: string;
}

interface Respondent {
  id: string;
  email: string;
  projectId: string;
  status: string;
  demographics?: DemographicData;
  completedAt?: string;
}

// ============================================================
// FUNÇÃO PARA CALCULAR ESTATÍSTICAS
// ============================================================

function calculateStatistics(respondents: Respondent[]): Record<string, Record<string, { n: number; pct: number }>> {
  const stats: Record<string, Record<string, number>> = {
    idade: {},
    genero: {},
    formacao: {},
    areaFormacao: {},
    tempoTrabalho: {},
    tempoGestor: {},
    areaAtuacao: {},
    funcao: {}
  };

  const total = respondents.length;

  // Contar ocorrências
  respondents.forEach(resp => {
    if (resp.demographics) {
      Object.keys(stats).forEach(key => {
        const value = resp.demographics![key as keyof DemographicData];
        if (value && typeof value === 'string') {
          stats[key][value] = (stats[key][value] || 0) + 1;
        }
      });
    }
  });

  // Converter para formato com n e %
  const result: Record<string, Record<string, { n: number; pct: number }>> = {};

  Object.keys(stats).forEach(key => {
    result[key] = {};
    const labels = LABELS[key as keyof typeof LABELS];

    // Ordenar por ordem das opções
    Object.keys(labels).forEach(optValue => {
      const n = stats[key][optValue] || 0;
      const pct = total > 0 ? Math.round((n / total) * 100) : 0;
      result[key][optValue] = { n, pct };
    });
  });

  return result;
}

// ============================================================
// HANDLER GET - GERA XLSX
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 });
    }

    // Buscar respondentes do projeto
    const respondentsQuery = query(
      collection(db, 'respondents'),
      where('projectId', '==', projectId)
    );
    const snapshot = await getDocs(respondentsQuery);

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Nenhum respondente encontrado' }, { status: 404 });
    }

    const respondents: Respondent[] = [];
    snapshot.forEach(doc => {
      respondents.push({ id: doc.id, ...doc.data() } as Respondent);
    });

    // Filtrar apenas respondentes com dados demográficos
    const withDemographics = respondents.filter(r => r.demographics);

    if (withDemographics.length === 0) {
      return NextResponse.json({
        error: 'Nenhum respondente com dados demográficos encontrado',
        total: respondents.length,
        withDemographics: 0
      }, { status: 404 });
    }

    // Calcular estatísticas
    const stats = calculateStatistics(withDemographics);

    // Retornar dados para o cliente processar
    // (O cliente vai gerar o XLSX usando uma biblioteca como xlsx ou exceljs)
    return NextResponse.json({
      success: true,
      projectId,
      summary: {
        totalRespondents: respondents.length,
        withDemographics: withDemographics.length,
        completed: respondents.filter(r => r.status === 'completed').length
      },
      individualData: withDemographics.map((r, idx) => ({
        id: idx + 1,
        email: r.email,
        status: r.status,
        idade: r.demographics?.idade ? LABELS.idade[r.demographics.idade as keyof typeof LABELS.idade] || r.demographics.idade : '',
        genero: r.demographics?.genero ? LABELS.genero[r.demographics.genero as keyof typeof LABELS.genero] || r.demographics.genero : '',
        formacao: r.demographics?.formacao ? LABELS.formacao[r.demographics.formacao as keyof typeof LABELS.formacao] || r.demographics.formacao : '',
        areaFormacao: r.demographics?.areaFormacao ? LABELS.areaFormacao[r.demographics.areaFormacao as keyof typeof LABELS.areaFormacao] || r.demographics.areaFormacao : '',
        tempoTrabalho: r.demographics?.tempoTrabalho ? LABELS.tempoTrabalho[r.demographics.tempoTrabalho as keyof typeof LABELS.tempoTrabalho] || r.demographics.tempoTrabalho : '',
        tempoGestor: r.demographics?.tempoGestor ? LABELS.tempoGestor[r.demographics.tempoGestor as keyof typeof LABELS.tempoGestor] || r.demographics.tempoGestor : '',
        areaAtuacao: r.demographics?.areaAtuacao ? LABELS.areaAtuacao[r.demographics.areaAtuacao as keyof typeof LABELS.areaAtuacao] || r.demographics.areaAtuacao : '',
        funcao: r.demographics?.funcao ? LABELS.funcao[r.demographics.funcao as keyof typeof LABELS.funcao] || r.demographics.funcao : '',
        dataPreenchimento: r.demographics?.submittedAt || '',
        dataConclusao: r.completedAt || ''
      })),
      statistics: {
        idade: Object.entries(stats.idade).map(([key, val]) => ({
          categoria: LABELS.idade[key as keyof typeof LABELS.idade] || key,
          n: val.n,
          percentual: val.pct
        })),
        genero: Object.entries(stats.genero).map(([key, val]) => ({
          categoria: LABELS.genero[key as keyof typeof LABELS.genero] || key,
          n: val.n,
          percentual: val.pct
        })),
        formacao: Object.entries(stats.formacao).map(([key, val]) => ({
          categoria: LABELS.formacao[key as keyof typeof LABELS.formacao] || key,
          n: val.n,
          percentual: val.pct
        })),
        areaFormacao: Object.entries(stats.areaFormacao).map(([key, val]) => ({
          categoria: LABELS.areaFormacao[key as keyof typeof LABELS.areaFormacao] || key,
          n: val.n,
          percentual: val.pct
        })),
        tempoTrabalho: Object.entries(stats.tempoTrabalho).map(([key, val]) => ({
          categoria: LABELS.tempoTrabalho[key as keyof typeof LABELS.tempoTrabalho] || key,
          n: val.n,
          percentual: val.pct
        })),
        tempoGestor: Object.entries(stats.tempoGestor).map(([key, val]) => ({
          categoria: LABELS.tempoGestor[key as keyof typeof LABELS.tempoGestor] || key,
          n: val.n,
          percentual: val.pct
        })),
        areaAtuacao: Object.entries(stats.areaAtuacao).map(([key, val]) => ({
          categoria: LABELS.areaAtuacao[key as keyof typeof LABELS.areaAtuacao] || key,
          n: val.n,
          percentual: val.pct
        })),
        funcao: Object.entries(stats.funcao).map(([key, val]) => ({
          categoria: LABELS.funcao[key as keyof typeof LABELS.funcao] || key,
          n: val.n,
          percentual: val.pct
        }))
      },
      labels: LABELS
    });

  } catch (error: any) {
    console.error('Erro ao exportar dados demográficos:', error);
    return NextResponse.json({
      error: error.message || 'Erro interno'
    }, { status: 500 });
  }
}
