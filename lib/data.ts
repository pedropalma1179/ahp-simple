// lib/data.ts
// VERSÃO ATUALIZADA COM MAGNITUDE - LINGUAGEM SIMPLIFICADA PARA ESPECIALISTAS

// Tipos para Impactos das Alternativas
export interface ImpactField {
  type: 'text' | 'currency' | 'months' | 'percentage';
  label: string;
  placeholder: string;
  hasNoValue?: boolean;
  noValueLabel?: string;
}

export interface AlternativeImpact {
  value?: string | number;
  description?: string;
  noValue?: boolean;
}

// Tipos para Projetos
export interface Alternative {
  code: string;
  name: string;
  description: string;
  impacts?: Record<string, AlternativeImpact>;
}

export interface Project {
  id?: string;
  name: string;
  description: string;
  alternatives: Alternative[];
  status: 'draft' | 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface Respondent {
  id?: string;
  projectId: string;
  email: string;
  accessCode: string;
  status: 'pending' | 'in_progress' | 'completed';
  invitedAt?: string;
  startedAt?: string;
  completedAt?: string;
  
  // Dados Demográficos (novo formato unificado)
  demographics?: {
    idade: string;
    genero: string;
    formacao: string;
    areaFormacao: string;
    tempoTrabalho: string;
    tempoGestor: string;
    areaAtuacao: string;
    funcao: string;
    submittedAt?: string;
  };
  
  // Perfil Demográfico do Especialista (campos legados)
  nome?: string;
  faixaIdade?: '<30' | '31-40' | '41-50' | '>50';
  genero?: 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_informar';
  
  // Formação Acadêmica
  nivelFormacao?: 'ensino_medio' | 'superior' | 'especializacao' | 'mestrado' | 'doutorado';
  areaFormacao?: 'administracao' | 'engenharias' | 'logistica' | 'marketing' | 'ti_sistemas' | 'ciencias_exatas' | 'outra';
  areaFormacaoOutra?: string;
  
  // Experiência Profissional
  tempoTrabalho?: '<10' | '11-20' | '21-30' | '>30';
  tempoGestor?: '0' | '<10' | '11-20' | '21-30' | '>30';
  
  // Atuação Atual
  areaAtuacao?: 'gerencial' | 'engenharia_processos' | 'planejamento_logistica' | 'producao' | 'projetos' | 'qualidade' | 'manutencao' | 'outra';
  areaAtuacaoOutra?: string;
  funcao?: 'c_level' | 'diretor' | 'gerente' | 'supervisor' | 'analista_especialista';
  
  // Controle
  perfilCompleto?: boolean;
  perfilPreenchidoEm?: string;
  
  // Campos legados (compatibilidade)
  name?: string;
  role?: string;
  division?: string;
  experience?: string;
  cargo?: string;
  divisao?: string;
  tempoEmpresa?: number | string;
}

// ============================================================
// SEÇÃO 1: BOCR_CRITERIA - SIMPLIFICADO PARA LEIGOS
// ============================================================

export const BOCR_CRITERIA = [
  { 
    code: 'B', 
    name: 'Benefícios', 
    color: '#22C55E', 
    description: 'Representam ganhos concretos obtidos pela decisão' 
  },
  { 
    code: 'O', 
    name: 'Oportunidades', 
    color: '#3B82F6', 
    description: 'Representam possibilidades futuras de ganhos, como inovações ou expansão de mercado' 
  },
  { 
    code: 'C', 
    name: 'Custos', 
    color: '#F97316', 
    description: 'Representa os investimentos necessários (financeiros e operacionais)' 
  },
  { 
    code: 'R', 
    name: 'Riscos', 
    color: '#EF4444', 
    description: 'Representam possíveis problemas e prejuízos que podem ocorrer, como falhas tecnológicas ou instabilidades' 
  },
];

// ============================================================
// SEÇÃO 2: MAGNITUDE - OPÇÃO 1 APLICADA (IMPACTO TOTAL)
// ============================================================

export const MAGNITUDE_NAMES = {
  B: 'Benefícios TOTAIS',
  O: 'Oportunidades TOTAIS',
  C: 'Custos TOTAIS',
  R: 'Riscos TOTAIS'
};

export const MAGNITUDE_DESCRIPTIONS = {
  B: 'Impacto agregado de TODOS os benefícios esperados do investimento em Indústria 4.0',
  O: 'Impacto agregado de TODAS as oportunidades futuras geradas pelo investimento',
  C: 'Impacto agregado de TODOS os custos envolvidos (investimento inicial, manutenção, operação)',
  R: 'Impacto agregado de TODOS os riscos potenciais do investimento'
};

export const MAGNITUDE_QUESTIONS = {
  'B_O': 'Considerando o impacto TOTAL de cada fator na decisão, qual tem maior peso?',
  'B_C': 'Considerando o impacto TOTAL de cada fator na decisão, qual tem maior peso?',
  'B_R': 'Considerando o impacto TOTAL de cada fator na decisão, qual tem maior peso?',
  'O_C': 'Considerando o impacto TOTAL de cada fator na decisão, qual tem maior peso?',
  'O_R': 'Considerando o impacto TOTAL de cada fator na decisão, qual tem maior peso?',
  'C_R': 'Considerando o impacto TOTAL de cada fator na decisão, qual tem maior peso?'
};

export const MAGNITUDE_HELP_TEXT = {
  'B_O': '💡 Pense em TODOS os benefícios somados versus TODAS as oportunidades somadas. Não compare critérios individuais, mas sim o conjunto completo de cada fator. Por exemplo: todos os ganhos de eficiência, qualidade, ergonomia, etc. (Benefícios) versus todas as possibilidades de transformação digital, evolução tecnológica, etc. (Oportunidades).',
  
  'B_C': '💡 Pense em TODOS os benefícios somados versus TODOS os custos somados. Compare o conjunto completo: todos os ganhos de eficiência, qualidade, ergonomia, etc. (Benefícios) versus todos os investimentos, infraestrutura, treinamento, etc. (Custos).',
  
  'B_R': '💡 Pense em TODOS os benefícios somados versus TODOS os riscos somados. Compare o conjunto completo: todos os ganhos de eficiência, qualidade, ergonomia, etc. (Benefícios) versus todas as ameaças de segurança cibernética, complexidade, impactos sociais, etc. (Riscos).',
  
  'O_C': '💡 Pense em TODAS as oportunidades somadas versus TODOS os custos somados. Compare o conjunto completo: todas as possibilidades de transformação digital, evolução tecnológica, etc. (Oportunidades) versus todos os investimentos, infraestrutura, treinamento, etc. (Custos).',
  
  'O_R': '💡 Pense em TODAS as oportunidades somadas versus TODOS os riscos somados. Compare o conjunto completo: todas as possibilidades de transformação digital, evolução tecnológica, etc. (Oportunidades) versus todas as ameaças de segurança cibernética, complexidade, impactos sociais, etc. (Riscos).',
  
  'C_R': '💡 Pense em TODOS os custos somados versus TODOS os riscos somados. Compare o conjunto completo: todos os investimentos, infraestrutura, treinamento, etc. (Custos) versus todas as ameaças de segurança cibernética, complexidade, impactos sociais, etc. (Riscos).'
};

// Configuração dos campos de impacto por subcritério
export const IMPACT_FIELDS: Record<string, ImpactField> = {
  // Benefícios
  B1: { type: 'text', label: 'Impacto em Eficiência e Produtividade', placeholder: 'Ex: Reduz tempo de ciclo em 15%, aumenta throughput em 20%...' },
  B2: { type: 'text', label: 'Impacto em Qualidade', placeholder: 'Ex: Reduz defeitos em 30%, melhora precisão dimensional...' },
  B3: { type: 'text', label: 'Impacto em Ergonomia, Saúde e Segurança', placeholder: 'Ex: Elimina movimentos repetitivos, reduz exposição a riscos...' },
  B4: { type: 'text', label: 'Impacto em Redução de Emissões', placeholder: 'Ex: Reduz emissões de CO2 em X toneladas/ano...' },
  B5: { type: 'text', label: 'Impacto em Conservação de Recursos', placeholder: 'Ex: Reduz consumo de energia em 25%, economiza água...' },
  
  // Oportunidades
  O1: { type: 'text', label: 'Impacto em Transformação Digital', placeholder: 'Ex: Posiciona empresa como referência em digitalização...' },
  O2: { type: 'text', label: 'Impacto em Maturidade Tecnológica', placeholder: 'Ex: Acelera adoção de novas tecnologias...' },
  O3: { type: 'text', label: 'Impacto no Ambiente de Trabalho', placeholder: 'Ex: Valoriza profissionais com novas habilidades...' },
  O4: { type: 'text', label: 'Impacto na Reputação Corporativa', placeholder: 'Ex: Melhora percepção de marca, atrai investidores...' },
  O5: { type: 'text', label: 'Impacto em Certificações e Compliance', placeholder: 'Ex: Facilita ISO 14001, atende requisitos de clientes...' },
  
  // Custos
  C1: { type: 'currency', label: 'Valor do Investimento (R$)', placeholder: 'Ex: 500000' },
  C2: { type: 'text', label: 'Infraestrutura e Custos Operacionais', placeholder: 'Ex: Requer upgrade de rede, licenças anuais de R$ X...' },
  C3: { type: 'months', label: 'Payback (meses)', placeholder: 'Ex: 24', hasNoValue: true, noValueLabel: 'Sem payback definido' },
  C4: { type: 'text', label: 'Custos de Capacitação', placeholder: 'Ex: Treinamento de X funcionários, duração Y horas...' },
  C5: { type: 'text', label: 'Custos de Descarte e Conformidade', placeholder: 'Ex: Custo de descarte de equipamentos antigos...' },
  
  // Riscos
  R1: { type: 'text', label: 'Riscos de Segurança Cibernética', placeholder: 'Ex: Exposição a ataques via rede, necessita firewall industrial...' },
  R2: { type: 'text', label: 'Riscos de Complexidade de Integração', placeholder: 'Ex: Requer integração com sistemas legados, tempo de implantação...' },
  R3: { type: 'text', label: 'Riscos de Dependência Tecnológica', placeholder: 'Ex: Fornecedor único, risco de descontinuidade...' },
  R4: { type: 'text', label: 'Riscos de Impactos Sociais', placeholder: 'Ex: Pode reduzir X postos de trabalho, requer realocação...' },
  R5: { type: 'text', label: 'Riscos de Resíduos Eletrônicos', placeholder: 'Ex: Gera X kg de e-waste por ano, requer destinação especial...' },
};

// ============================================================
// SEÇÃO 3: SUBCRITERIA - SIMPLIFICADO PARA LEIGOS
// ============================================================

export const SUBCRITERIA = [
  // BENEFÍCIOS
  { 
    code: 'B1', 
    group: 'B', 
    name: 'Eficiência e Produtividade', 
    dimension: 'Competitividade', 
    color: '#F59E0B', 
    description: 'A implementação de sistemas digitais integrados e automação avançada permite o monitoramento em tempo real e otimização dos processos, reduzindo desperdícios e tempo de produção.' 
  },
  { 
    code: 'B2', 
    group: 'B', 
    name: 'Qualidade', 
    dimension: 'Competitividade', 
    color: '#F59E0B', 
    description: 'Controle de qualidade mais rigoroso e em tempo real resulta em produtos de melhor qualidade e aumento de valor.' 
  },
  { 
    code: 'B3', 
    group: 'B', 
    name: 'Ergonomia, Saúde e Segurança Ocupacional', 
    dimension: 'Sociotécnicas', 
    color: '#0EA5E9', 
    description: 'A automação inteligente alivia os trabalhadores de tarefas repetitivas e fisicamente exaustivas, promovendo maior segurança, saúde e redução de riscos no ambiente de trabalho.' 
  },
  { 
    code: 'B4', 
    group: 'B', 
    name: 'Redução de Emissões', 
    dimension: 'Sustentabilidade', 
    color: '#10B981', 
    description: 'Tecnologias da Indústria 4.0 ajudam a minimizar emissões de gases de efeito estufa.' 
  },
  { 
    code: 'B5', 
    group: 'B', 
    name: 'Conservação de Recursos', 
    dimension: 'Sustentabilidade', 
    color: '#10B981', 
    description: 'Sistemas inteligentes otimizam o consumo de energia, permitindo maior eficiência em processos industriais.' 
  },
  
  // OPORTUNIDADES
  { 
    code: 'O1', 
    group: 'O', 
    name: 'Transformação Digital', 
    dimension: 'Competitividade', 
    color: '#F59E0B', 
    description: 'A integração digital das operações oferece vantagem competitiva ao posicionar as empresas como pioneiras no uso de fábricas inteligentes.' 
  },
  { 
    code: 'O2', 
    group: 'O', 
    name: 'Aumento da Maturidade Tecnológica', 
    dimension: 'Sociotécnicas', 
    color: '#0EA5E9', 
    description: 'Empresas que integram aspectos humanos e tecnológicos conseguem adotar tecnologias com mais rapidez e eficiência, alcançando maior evolução organizacional.' 
  },
  { 
    code: 'O3', 
    group: 'O', 
    name: 'Melhoria do Ambiente de Trabalho', 
    dimension: 'Sociotécnicas', 
    color: '#0EA5E9', 
    description: 'A valorização dos profissionais cresce com a demanda por habilidades analíticas, autonomia e resolução de problemas, tornando o ambiente de trabalho mais desafiador e gratificante.' 
  },
  { 
    code: 'O4', 
    group: 'O', 
    name: 'Reforço da Reputação Corporativa', 
    dimension: 'Sustentabilidade', 
    color: '#10B981', 
    description: 'A implementação de práticas sustentáveis pode melhorar a percepção pública e a reputação da empresa.' 
  },
  { 
    code: 'O5', 
    group: 'O', 
    name: 'Apoio a Certificações e Compliance', 
    dimension: 'Sustentabilidade', 
    color: '#10B981', 
    description: 'Empresas que utilizam tecnologias da Indústria 4.0 para implementar práticas sustentáveis têm maior facilidade em obter certificações ambientais.' 
  },
  
  // CUSTOS
  { 
    code: 'C1', 
    group: 'C', 
    name: 'Valor do Investimento', 
    dimension: 'Competitividade', 
    color: '#F59E0B', 
    description: 'A implementação de tecnologias requer investimentos significativos em infraestrutura e capital humano especializado.' 
  },
  { 
    code: 'C2', 
    group: 'C', 
    name: 'Infraestrutura Digital e Custo de Operação', 
    dimension: 'Competitividade', 
    color: '#F59E0B', 
    description: 'Despesas associadas à integração de infraestruturas, como redes, depreciação, licenças etc.' 
  },
  { 
    code: 'C3', 
    group: 'C', 
    name: 'Payback', 
    dimension: 'Competitividade', 
    color: '#F59E0B', 
    description: 'Rapidez com que o custo de um investimento é recuperado, mas não mede a lucratividade do investimento.' 
  },
  { 
    code: 'C4', 
    group: 'C', 
    name: 'Capacitação Contínua e Gestão do Conhecimento', 
    dimension: 'Sociotécnicas', 
    color: '#0EA5E9', 
    description: 'A constante evolução das tecnologias requer treinamentos frequentes, o que representa custos adicionais e esforços organizacionais para atualizar a força de trabalho.' 
  },
  { 
    code: 'C5', 
    group: 'C', 
    name: 'Custos de Descarte e Conformidade Regulatória', 
    dimension: 'Sustentabilidade', 
    color: '#10B981', 
    description: 'O descarte de resíduos eletrônicos em indústrias altamente digitalizadas enfrenta altos custos operacionais devido à necessidade de cumprir regulamentações ambientais rigorosas.' 
  },
  
  // RISCOS
  { 
    code: 'R1', 
    group: 'R', 
    name: 'Segurança Cibernética', 
    dimension: 'Competitividade', 
    color: '#F59E0B', 
    description: 'A alta conectividade das fábricas inteligentes amplia os riscos de ataques cibernéticos, comprometendo dados sensíveis e operações críticas.' 
  },
  { 
    code: 'R2', 
    group: 'R', 
    name: 'Complexidade de Integração', 
    dimension: 'Competitividade', 
    color: '#F59E0B', 
    description: 'A implementação integrada de tecnologias é um desafio, especialmente em empresas de países emergentes com infraestrutura tecnológica limitada.' 
  },
  { 
    code: 'R3', 
    group: 'R', 
    name: 'Dependência Tecnológica', 
    dimension: 'Competitividade', 
    color: '#F59E0B', 
    description: 'A integração de sistemas automatizados cria uma dependência excessiva de fornecedores e plataformas tecnológicas.' 
  },
  { 
    code: 'R4', 
    group: 'R', 
    name: 'Impactos Sociais', 
    dimension: 'Sociotécnicas', 
    color: '#0EA5E9', 
    description: 'A automação pode gerar redução de empregos em funções de baixa qualificação, exigindo políticas de realocação profissional.' 
  },
  { 
    code: 'R5', 
    group: 'R', 
    name: 'Aumento de Resíduos Eletrônicos', 
    dimension: 'Sustentabilidade', 
    color: '#10B981', 
    description: 'A evolução da Indústria 4.0 acelera a substituição de equipamentos, aumentando os resíduos eletrônicos.' 
  },
];

export const ALTERNATIVES = [
  { code: 'A1', name: 'Gêmeo Digital', fullName: 'Gêmeo digital para simulação de transferência de calor', description: '' },
  { code: 'A2', name: 'IA Temperatura', fullName: 'Sistema autônomo de controle de temperatura baseado em IA', description: '' },
];

export const SAATY_SCALE = [
  { value: 1, label: '1 - Igual importância' },
  { value: 2, label: '2 - Intermediário' },
  { value: 3, label: '3 - Importância fraca' },
  { value: 4, label: '4 - Intermediário' },
  { value: 5, label: '5 - Importância essencial' },
  { value: 6, label: '6 - Intermediário' },
  { value: 7, label: '7 - Importância demonstrada' },
  { value: 8, label: '8 - Intermediário' },
  { value: 9, label: '9 - Importância absoluta' },
];

export function generatePairs(items: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

export function generateAllComparisons(alternatives?: Alternative[]) {
  const comparisons: { type: string; group: string; itemA: string; itemB: string }[] = [];
  
  // 1. BOCR - Importância relativa (pesos w_b, w_o, w_c, w_r)
  const bocrCodes = BOCR_CRITERIA.map(c => c.code);
  generatePairs(bocrCodes).forEach(([a, b]) => {
    comparisons.push({ type: 'bocr', group: 'BOCR', itemA: a, itemB: b });
  });
  
  // 2. MAGNITUDE - Impacto Total (rescaling weights sb, so, sc, sr)
  generatePairs(bocrCodes).forEach(([a, b]) => {
    comparisons.push({ type: 'magnitude', group: 'MAGNITUDE', itemA: a, itemB: b });
  });
  
  // 3. SUBCRITÉRIOS
  ['B', 'O', 'C', 'R'].forEach(group => {
    const items = SUBCRITERIA.filter(s => s.group === group).map(s => s.code);
    generatePairs(items).forEach(([a, b]) => {
      comparisons.push({ type: 'subcriteria', group, itemA: a, itemB: b });
    });
  });
  
  // 4. ALTERNATIVAS
  const altCodes = alternatives ? alternatives.map(a => a.code) : ALTERNATIVES.map(a => a.code);
  const altPairs = generatePairs(altCodes);
  
  SUBCRITERIA.forEach(sub => {
    altPairs.forEach(([a, b]) => {
      comparisons.push({ type: 'alternatives', group: sub.code, itemA: a, itemB: b });
    });
  });
  
  return comparisons;
}

export function calculateTotalComparisons(numAlternatives: number): number {
  const bocrComparisons = 6;
  const magnitudeComparisons = 6;
  const subcriteriaComparisons = 40;
  const altPairs = (numAlternatives * (numAlternatives - 1)) / 2;
  const alternativeComparisons = altPairs * 20;
  
  return bocrComparisons + magnitudeComparisons + subcriteriaComparisons + alternativeComparisons;
}

export function formatImpactValue(code: string, impact?: AlternativeImpact): string {
  if (!impact) return 'Não informado';
  
  const field = IMPACT_FIELDS[code];
  if (!field) return impact.description || 'Não informado';
  
  if (impact.noValue) {
    return field.noValueLabel || 'Não se aplica';
  }
  
  if (field.type === 'currency' && impact.value) {
    return `R$ ${Number(impact.value).toLocaleString('pt-BR')}`;
  }
  
  if (field.type === 'months' && impact.value) {
    return `${impact.value} meses`;
  }
  
  if (field.type === 'percentage' && impact.value) {
    return `${impact.value}%`;
  }
  
  return impact.description || impact.value?.toString() || 'Não informado';
}
