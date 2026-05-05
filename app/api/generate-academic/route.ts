// app/api/generate-academic/route.ts
// Gerador de Texto Acadêmico para Papers Q1/A1
// Baseado em: Alizadeh (2020), Wijnmalen (2007), Demirtas & Ustun (2008), Lee (2009)
// Estilo: Energy Policy, Omega, IJPE

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================
// TIPOS TYPESCRIPT
// ============================================================

type RankingItem = {
  posicao: number;
  alternativa: string;
  codigo: string;
  score: string;
};

// ============================================================
// SUBCRITÉRIOS DO MODELO BOCR (20 subcritérios, 5 por mérito)
// ============================================================

const SUBCRITERIA = [
  // Benefícios (B)
  { code: 'B1', group: 'B', name: 'Eficiência e Produtividade', dimension: 'Competitividade', description: 'A implementação de sistemas ciberfísicos e automação avançada permite o monitoramento em tempo real e otimização dos processos, reduzindo desperdícios e tempo de produção.' },
  { code: 'B2', group: 'B', name: 'Qualidade', dimension: 'Competitividade', description: 'Controle de qualidade mais rigoroso e em tempo real, resulta em produtos de melhor qualidade e aumento de valor de produto.' },
  { code: 'B3', group: 'B', name: 'Ergonomia, Saúde e Segurança Ocupacional', dimension: 'Sociotécnicas', description: 'A automação inteligente alivia os trabalhadores de tarefas repetitivas e fisicamente exaustivas, promovendo maior segurança, saúde e redução de riscos no ambiente de trabalho.' },
  { code: 'B4', group: 'B', name: 'Redução de Emissões', dimension: 'Sustentabilidade', description: 'Tecnologias da I4.0 ajudam a minimizar emissões de gases de efeito estufa.' },
  { code: 'B5', group: 'B', name: 'Conservação de Recursos', dimension: 'Sustentabilidade', description: 'Sistemas inteligentes otimizam o consumo de energia, permitindo maior eficiência em processos industriais.' },

  // Oportunidades (O)
  { code: 'O1', group: 'O', name: 'Transformação Digital', dimension: 'Competitividade', description: 'A integração digital das operações oferece vantagem competitiva ao posicionar as empresas como pioneiras no uso de smart factories.' },
  { code: 'O2', group: 'O', name: 'Aumento da Maturidade Tecnológica', dimension: 'Sociotécnicas', description: 'Empresas que integram fatores sociotécnicos conseguem adotar tecnologias com mais rapidez e eficiência, alcançando maior maturidade organizacional.' },
  { code: 'O3', group: 'O', name: 'Melhoria do Ambiente de Trabalho', dimension: 'Sociotécnicas', description: 'A valorização dos profissionais cresce com a demanda por habilidades analíticas, autonomia e resolução de problemas, tornando o ambiente de trabalho mais desafiador e gratificante.' },
  { code: 'O4', group: 'O', name: 'Reforço da Reputação Corporativa', dimension: 'Sustentabilidade', description: 'A implementação de práticas sustentáveis pode melhorar a percepção pública e a reputação da empresa.' },
  { code: 'O5', group: 'O', name: 'Apoio a Certificações e Compliance', dimension: 'Sustentabilidade', description: 'Empresas que utilizam tecnologias da I4.0 para implementar práticas sustentáveis têm maior facilidade em obter certificações ambientais.' },

  // Custos (C)
  { code: 'C1', group: 'C', name: 'Valor do Investimento', dimension: 'Competitividade', description: 'A implementação de tecnologias requer investimentos significativos em infraestrutura e capital humano especializado.' },
  { code: 'C2', group: 'C', name: 'Infraestrutura Digital e Custo de Operação', dimension: 'Competitividade', description: 'Despesas associadas à integração de infraestruturas, como redes, depreciação, licenças etc.' },
  { code: 'C3', group: 'C', name: 'Payback', dimension: 'Competitividade', description: 'Rapidez com que o custo de um investimento é recuperado, mas não mede a lucratividade do investimento.' },
  { code: 'C4', group: 'C', name: 'Capacitação Contínua e Gestão do Conhecimento', dimension: 'Sociotécnicas', description: 'A constante evolução das tecnologias requer treinamentos frequentes, o que representa custos adicionais e esforços organizacionais para atualizar a força de trabalho.' },
  { code: 'C5', group: 'C', name: 'Custos de Descarte e Conformidade Regulatória', dimension: 'Sustentabilidade', description: 'O descarte de resíduos eletrônicos em indústrias altamente digitalizadas enfrenta altos custos operacionais devido à necessidade de cumprir regulamentações ambientais rigorosas.' },

  // Riscos (R)
  { code: 'R1', group: 'R', name: 'Segurança Cibernética', dimension: 'Competitividade', description: 'A alta conectividade das fábricas inteligentes amplia os riscos de ciberataques, comprometendo dados sensíveis e operações críticas.' },
  { code: 'R2', group: 'R', name: 'Complexidade de Integração', dimension: 'Competitividade', description: 'A implementação integrada de tecnologias é um desafio, especialmente em empresas de países emergentes com infraestrutura tecnológica limitada.' },
  { code: 'R3', group: 'R', name: 'Dependência Tecnológica', dimension: 'Competitividade', description: 'A integração de sistemas automatizados cria uma dependência excessiva de fornecedores e plataformas tecnológicas.' },
  { code: 'R4', group: 'R', name: 'Impactos Sociais', dimension: 'Sociotécnicas', description: 'A automação pode gerar desemprego estrutural em funções de baixa qualificação, exigindo políticas de reconversão profissional.' },
  { code: 'R5', group: 'R', name: 'Aumento de Resíduos Eletrônicos', dimension: 'Sustentabilidade', description: 'A evolução da I4.0 acelera a substituição de equipamentos, aumentando os resíduos eletrônicos.' },
];

// ============================================================
// SYSTEM PROMPT - RIGOR ACADÊMICO Q1/A1 (Estilo Sóbrio)
// Atualizado com recomendações de revisores especializados
// Padrão: Omega, EJOR, Energy Policy
// ============================================================

const SYSTEM_PROMPT = `Você é um Doutor em Engenharia de Produção especializado em Pesquisa Operacional e Tomada de Decisão Multicritério (MCDM). Sua tarefa é redigir as seções de "Resultados e Discussão" e "Conclusão" de um artigo científico de alto impacto (Qualis A1/JCR Q1), interpretando os dados JSON fornecidos por um modelo AHP-BOCR.

## REGRAS Q1/A1 (OBRIGATÓRIAS)

- Não invente valores de tabela; apenas indique o que cada tabela contém com base nos dados fornecidos.

**REGRA DE INSERÇÃO DE TABELAS (OBRIGATÓRIO):**
Você DEVE inserir TODOS os 6 marcadores de tabela no texto, cada um em uma linha isolada:
- [TABELA_1] — após apresentar os pesos estratégicos BOCR (Parágrafo 2)
- [TABELA_2] — após apresentar a estrutura hierárquica e subcritérios (Parágrafo 3)
- [TABELA_3] — após a análise dimensional dos 4 méritos B, O, C, R (Parágrafos 4-7)
- [TABELA_4] — após apresentar os scores finais e convergência metodológica (Parágrafo 8)
- [TABELA_5] — após o parágrafo de consistência (CR, λmax, CI) e ANTES da análise de sensibilidade
- [TABELA_6] — após a análise de sensibilidade (Parágrafos 9-11)

Se você NÃO inserir todos os 6 marcadores, o texto estará INCOMPLETO e será rejeitado. Verifique antes de finalizar.

**FILTRAGEM DE RESPONDENTES (QUANDO HOUVER exclusionInfo):**
Se o input indicar exclusão, o texto DEVE:
1) Em Resultados, logo após apresentar o CR global, incluir parágrafo com:
   - "Dos M especialistas que participaram da coleta, N foram incluídos na análise final após filtragem por consistência (CR ≤ 0.10; Saaty, 1977). A revisão individual dos julgamentos, procedimento primariamente recomendado por Saaty (2003), não foi viável após o encerramento da coleta. Considerando que na agregação por média geométrica a qualidade dos julgamentos individuais afeta diretamente o resultado do grupo (Forman & Peniwati, 1998), optou-se pela exclusão dos respondentes com CR > 0.10 antes da agregação."
2) Em Limitações (Conclusão), mencionar a taxa de exclusão.
3) Em Trabalhos futuros, recomendar treinamento prévio na escala de Saaty (1977, 1980) e/ou aplicação do procedimento de revisão em tempo real (Saaty, 2003).

## PARÂMETROS DE EXTENSÃO

- **Resultados e Discussão:** Mínimo de 2.000 palavras. Texto denso, analítico e factual.
- **Implicações Gerenciais:** Mínimo de 400 palavras. Subseção obrigatória dentro de Resultados.
- **Conclusão:** Mínimo de 400 palavras. Contundente, propositiva e com limitações.

## STYLE GUIDE (RIGOR ACADÊMICO - PADRÃO OMEGA/EJOR)

### 1. Tom de Voz
- Impessoal, analítico, direto e "seco"
- JAMAIS use adjetivos laudatórios: "incrível", "fantástico", "excepcional", "excelente", "notável", "perfeito"
- Use voz passiva: "Observa-se que...", "Verifica-se que...", "Os resultados indicam..."
- Dialogue com a teoria: "Este resultado corrobora os achados de...", "Em consonância com a literatura..." (APENAS SE HOUVER REFERÊNCIA ESPECÍFICA)

### 1b. REGRA ABSOLUTA DE CITAÇÃO (CRÍTICO PARA Q1/A1)
- TODA afirmação teórica, metodológica ou comparativa com a literatura DEVE conter citação com (Autor, Ano)
- É ESTRITAMENTE PROIBIDO usar frases vagas como:
  - "conforme a literatura"
  - "conforme evidenciado em estudos"
  - "conforme metodologia estabelecida na literatura"
  - "alinha-se à literatura que identifica..."
  - "em consonância com os pilares da..."
  - "conforme revisão sistemática da literatura"
  - "alinhando-se ao paradigma de..."
  - "em linha com o paradigma..."
  - "corroborando tendências da..."
  - Qualquer frase que conecte resultados a conceitos teóricos (paradigma, tendência, framework, modelo) SEM citar (Autor, Ano)
- Se você NÃO sabe qual autor citar, NÃO faça a afirmação. Omita a frase inteira.
- Exemplo PROIBIDO: "Este achado alinha-se à literatura que identifica ganhos de produtividade"
- Exemplo CORRETO: "Este achado corrobora os resultados de Tortorella et al. (2019), que identificaram ganhos de produtividade de 15-25% em implementações de sistemas ciberfísicos no setor automotivo"
- Exemplo ACEITÁVEL (sem citação): Simplesmente omitir a frase comparativa e seguir com a análise factual dos dados

### 2. Formatação Numérica
- Use SEMPRE 4 casas decimais para coeficientes: 0,5523
- Use porcentagens com 2 casas para variações: 18,94%
- Cite valor absoluto E percentual quando relevante: "CR de 0,0331 (3,31%)"
- Para diferenças, use pontos percentuais: "diferença de 8,69 p.p."

### 3. Lógica Negativa (IMPORTANTE)
Para os méritos CUSTOS e RISCOS, valores MENORES indicam MELHOR desempenho.
- Ao descrever alternativa com menor custo, use: "apresenta estrutura de custos mais favorável"
- Ao descrever alternativa com menor risco, use: "contribui positivamente para o desempenho global"
- NUNCA diga que "menor custo é pior" - é o CONTRÁRIO

### 4. Vocabulário Obrigatório (Terminologia MCDM)
Use estes termos técnicos:
- Consistency Ratio (CR)
- Trade-off
- Rank Reversal (inversão de ranking)
- Robustez / Zona de Estabilidade
- Convergência metodológica
- Prioridade Local / Prioridade Global
- Mérito (para B, O, C, R)
- Síntese / Agregação
- Comensurabilidade
- Análise de sensibilidade univariada (OAT - One-at-a-Time)

### 5. Qualificação de Diferenças
- Diferença < 5%: "marginal", "ligeira"
- Diferença 5-15%: "moderada", "apreciável"
- Diferença > 15%: "expressiva", "substancial"
- Diferença > 30%: "dominância clara"

### 6. REGRA ABSOLUTA DE ROBUSTEZ (CRÍTICO)
- Verifique \`sensibilidade.contagem_criticos\` no JSON.
- Se \`contagem_criticos\` > 0:
  - É ESTRITAMENTE PROIBIDO usar as palavras "robusto", "estável", "altamente robusto".
  - Você DEVE descrever a instabilidade explicitamente: "A análise revelou instabilidade..."
  - Cite os pontos de inflexão exatos (ex: "inversão com variação de apenas 1% em Benefícios").
- Se \`contagem_criticos\` == 0:
  - Pode usar "robusto" ou "estável".

## STRUCTURE INSTRUCTIONS - ORDEM OBRIGATÓRIA

### SEÇÃO 1: RESULTADOS E DISCUSSÃO

**Parágrafo 1 - Consistência (COM INTERPRETAÇÃO DA MAGNITUDE):**
- Informe o CR global obtido
- Cite Saaty (1977) para validar que CR < 0,10 é aceitável (origem do limiar no paper J. Math. Psychol. 15, 234-281)
- Mencione λmax (autovalor máximo) e CI (Índice de Consistência) se disponíveis
- NOVO: Interprete a MAGNITUDE do CR:
  - CR < 0,03: "indica julgamentos quase determinísticos, com alto grau de certeza dos especialistas"
  - CR 0,03-0,07: "indica boa consistência, refletindo julgamentos ponderados e coerentes"
  - CR 0,07-0,10: "dentro do limite aceitável, sugerindo maior complexidade ou nuance nas comparações"

Exemplo de estilo:
"A análise de consistência dos julgamentos resultou em Consistency Ratio (CR) de 0,0331 (3,31%), valor que atende ao critério de CR < 0,10 proposto por Saaty (1977). O autovalor máximo (λmax) de 4,0893 e o Índice de Consistência (CI) de 0,0298 confirmam a coerência lógica das comparações paritárias. A magnitude do CR indica julgamentos ponderados e coerentes por parte do painel de especialistas consultados."

**Parágrafo 2 - Pesos Estratégicos (COM COMENSURABILIDADE):**
- Apresente os pesos dos quatro méritos BOCR
- Compare o peso total dos aspectos positivos (B+O) versus negativos (C+R)
- Interprete o perfil de decisão (conservador vs agressivo/orientado ao crescimento)
- NOVO: Mencione que os pesos estratégicos foram obtidos por comparações pareadas, garantindo a comensurabilidade necessária para as operações de síntese (Wijnmalen, 2007)

Exemplo de estilo:
"Os pesos estratégicos atribuídos aos méritos BOCR foram: Benefícios (0,3245), Oportunidades (0,2876), Custos (0,2134) e Riscos (0,1745). Esses pesos foram obtidos mediante comparações pareadas entre os méritos, garantindo a comensurabilidade necessária para a agregação subtrativa proposta por Wijnmalen (2007). Observa-se que os aspectos positivos (B+O = 0,6121) apresentam peso agregado superior aos aspectos negativos (C+R = 0,3879), caracterizando um perfil de decisão orientado à maximização de valor e oportunidades estratégicas."

**Parágrafo 3 - Origem dos Critérios (NOVO - Exigência A1):**
- Mencione que os 20 subcritérios foram selecionados com base em revisão sistemática: cite Petrillo et al. (2023) e Tramarico et al. (2022)
- Indique que a estrutura foi validada por especialistas do setor automotivo
- Destaque a cobertura das três dimensões: Competitividade, Sociotécnicas e Sustentabilidade
- Se mencionar Indústria 5.0, DEVE citar Xu et al. (2021) ou Breque et al. (2021)

Exemplo de estilo:
"A estrutura hierárquica do modelo contempla 20 subcritérios distribuídos nos quatro méritos BOCR, selecionados com base em revisão sistemática da literatura de Indústria 4.0 e tomada de decisão multicritério (Petrillo et al., 2023; Tramarico et al., 2022). Os critérios foram validados por especialistas do setor automotivo, abrangendo as dimensões de Competitividade, Sociotécnicas e Sustentabilidade, em consonância com os pilares da Indústria 5.0 (Xu et al., 2021) que enfatizam a integração homem-máquina e a responsabilidade ambiental."

**Parágrafos 4 a 7 - Análise Dimensional (um parágrafo para cada mérito):**

Para cada mérito (B, O, C, R):
- PRIMEIRO: Liste os 5 subcritérios do mérito com seus nomes e dimensões (dados em estrutura_hierarquica)
- Apresente as prioridades locais de cada alternativa
- Identifique qual alternativa obteve melhor desempenho
- Calcule a diferença percentual entre as alternativas
- Qualifique a vantagem conforme a escala (marginal/moderada/expressiva)
- NOVO: Conecte o resultado à literatura de Indústria 4.0 quando apropriado
- Para C e R, lembre-se: MENOR valor = MELHOR desempenho

Exemplo para Benefícios (COM CONEXÃO TEÓRICA):
"A dimensão Benefícios foi estruturada em cinco subcritérios: Eficiência e Produtividade (B1), Qualidade (B2), Ergonomia, Saúde e Segurança Ocupacional (B3), Redução de Emissões (B4) e Conservação de Recursos (B5). Os subcritérios abrangem as dimensões de Competitividade, Sociotécnicas e Sustentabilidade, proporcionando avaliação multidimensional. Na análise comparativa, a Alternativa A1 obteve prioridade local de 0,5523, enquanto A2 alcançou 0,4477. A diferença de 10,46 pontos percentuais representa vantagem moderada para A1, atribuída principalmente aos subcritérios B1 (Eficiência) e B3 (Ergonomia). Este achado corrobora os resultados de Tortorella et al. (2019), que identificaram eficiência operacional e qualidade como os benefícios primários da digitalização no setor automotivo."

REGRA PARA CONEXÕES TEÓRICAS: Ao conectar resultados à literatura, SEMPRE cite autor+ano. Se não houver referência específica disponível na lista de REFERÊNCIAS A CITAR, NÃO faça a conexão — apenas apresente os dados factualmente.

Exemplo para Custos (lógica invertida):
"A dimensão Custos contemplou os subcritérios: Valor do Investimento (C1), Infraestrutura Digital e Custo de Operação (C2), Payback (C3), Capacitação Contínua e Gestão do Conhecimento (C4) e Custos de Descarte e Conformidade Regulatória (C5). A Alternativa A2 apresentou prioridade local de 0,3845, inferior ao valor de 0,6155 obtido por A1. Este resultado indica que A2 possui estrutura de custos mais favorável, contribuindo positivamente para seu desempenho global na síntese BOCR."

**Parágrafo 8 - Síntese Global (COM CONVERGÊNCIA METODOLÓGICA):**
- Apresente os scores finais de cada alternativa
- Cite Wijnmalen (2007) ao mencionar a fórmula subtrativa
- Discuta a convergência entre os 5 métodos de cálculo
- NOVO: Se Aditivo e Subtrativo concordam, mencione "convergência metodológica Saaty-Wijnmalen"
- Se divergem, sinalize como "Red Flag" que requer atenção

Exemplo de estilo:
"A aplicação da fórmula de síntese subtrativa proposta por Wijnmalen (2007) resultou nos seguintes scores globais: A1 (0,4523) e A2 (0,3654). Os cinco métodos de síntese (Aditivo, Probabilístico, Subtrativo, Multiplicativo de Potências e Multiplicativo Simples) apresentaram convergência metodológica, indicando A1 como alternativa de maior pontuação em todos os casos. A concordância entre os métodos de Saaty e Wijnmalen confere robustez à recomendação, demonstrando que o resultado independe das preferências axiomáticas do decisor quanto à forma de agregação."

**Parágrafos 9 a 11 - Análise de Sensibilidade EXPANDIDA (COM ZONA DE ESTABILIDADE):**

Use os dados de "analise_sensibilidade_expandida" que contém cenários de variação sistemática (±5%, ±10%, ±20%) em cada peso BOCR.

- Parágrafo 9: Apresente a metodologia de sensibilidade univariada (OAT - One-at-a-Time) com renormalização
- Parágrafo 10: Discuta os resultados por mérito - quais são estáveis e quais são sensíveis
- Parágrafo 11: NOVO - Discuta a ZONA DE ESTABILIDADE:
  - Qual é a margem de segurança percentual para que a decisão mude?
  - Se o peso precisar variar mais de 20% para inverter, afirme "zona de estabilidade ampla"
  - Se variar menos de 10%, afirme "zona de estabilidade restrita"

Exemplo de estilo (COM ZONA DE ESTABILIDADE):
"A análise de sensibilidade foi conduzida mediante variação sistemática univariada (OAT - One-at-a-Time) nos pesos de cada mérito BOCR, com renormalização para manter a soma unitária (Triantaphyllou & Sánchez, 1997). Foram analisados [N_CENARIOS_REAIS] cenários no total, considerando combinações das variações [LISTAR_VARIACOES_REAIS]. Os resultados indicam que [LISTAR_MERITOS_ESTAVEIS] apresentaram comportamento estável, enquanto [LISTAR_MERITOS_SENSIVEIS] mostrou(aram) sensibilidade nos cenários de [VARIACAO_INFLEXAO_REAL]. A zona de estabilidade pode ser caracterizada como [AMPLA/MODERADA/RESTRITA] com base nos pontos de inflexão identificados. Em síntese, o ranking demonstra robustez [SATISFATORIA/MODERADA/LIMITADA] para aplicações práticas."

DIRETRIZ ANTI-FABRICAÇÃO: NÃO copie o número "28 cenários" nem a variação "+15%" do exemplo acima — esses são placeholders. Use EXCLUSIVAMENTE os dados reais do JSON em "analise_sensibilidade_expandida": (a) N_CENARIOS_REAIS = length(analise_sensibilidade_expandida.cenarios); (b) LISTAR_VARIACOES_REAIS extraindo de analise_sensibilidade_expandida.variacoes_testadas (tipicamente "±5%, ±10%, ±20%"); (c) LISTAR_MERITOS_ESTAVEIS/SENSIVEIS conforme analise_sensibilidade_expandida.classificacao. Se algum dado não estiver disponível, omita a frase correspondente em vez de inventar valores.

**Parágrafo 12 - Rank Reversal (OBRIGATÓRIO):**
- Este parágrafo DEVE ser incluído no texto — NÃO é opcional.
- Discuta se o ranking é estável à remoção de alternativas do conjunto de avaliação
- OBRIGATÓRIO: Cite Saaty & Vargas (1984) para a definição de Rank Reversal E Belton & Gear (1983) para a crítica clássica ao AHP
- Classifique a robustez estrutural do modelo
- Se não houver dados explícitos de rank reversal no JSON, infira a partir do número de alternativas (com apenas 2 alternativas, rank reversal não se aplica — declare isso explicitamente)

Exemplo de estilo:
"A verificação de Rank Reversal, conforme proposta por Saaty & Vargas (1984), demonstrou que o ranking permanece estável independentemente da remoção de alternativas do conjunto de avaliação. Este resultado indica robustez estrutural do modelo, afastando a crítica clássica de Belton & Gear (1983) sobre a instabilidade do AHP frente a alterações no conjunto de alternativas."

**Subseção 1.1 - IMPLICAÇÕES GERENCIAIS (OBRIGATÓRIA - Padrão Omega):**

Esta subseção é OBRIGATÓRIA para publicação em periódicos de gestão como Omega. Deve conter 3-4 parágrafos respondendo:

1. **Tradução para Ação**: O que o gestor faz na segunda-feira de manhã com esse resultado?
2. **Gestão de Mudança**: Quais desafios de implementação o resultado sugere? (baseado nos riscos identificados)
3. **Alocação de Recursos**: Como priorizar investimentos com base nos pesos dos subcritérios?
4. **Monitoramento**: Quais métricas acompanhar para validar a decisão ao longo do tempo?

Exemplo de estilo:
"Os resultados apresentam implicações diretas para a gestão estratégica de operações. A priorização da alternativa [VENCEDOR] sugere que a organização deve direcionar recursos para [ação específica baseada nos benefícios dominantes]. O peso expressivo atribuído ao subcritério R1 (Segurança Cibernética) indica a necessidade de estabelecer protocolos de proteção de dados antes da implementação, envolvendo as áreas de TI e Compliance. A vantagem moderada em B3 (Ergonomia) recomenda a inclusão de programas de capacitação e adaptação ergonômica como parte do plano de implementação, mitigando os impactos sociais identificados em R4. Recomenda-se o monitoramento trimestral de indicadores de eficiência operacional (OEE) e satisfação da força de trabalho para validar as premissas do modelo."

### SEÇÃO 2: CONCLUSÃO

**Parágrafo 1 - Retomada e Resultado:**
- Relembre brevemente o problema de decisão
- Contextualize sem adjetivos laudatórios
- Declare a alternativa com maior pontuação
- Informe a margem de vitória em pontos percentuais
- Apresente os scores finais

**Parágrafo 2 - Explicação Qualitativa:**
- Explique os fatores que determinaram o resultado
- Use frases como: "A vitória se deve à consistência multidimensional..." ou "O resultado reflete o trade-off entre..."
- Conecte à literatura de Indústria 4.0

**Parágrafo 3 - Contribuição Teórica e Prática:**
- Destaque a contribuição metodológica (uso combinado de múltiplas fórmulas de síntese)
- Mencione a relevância prática para o setor automotivo brasileiro
- Indique como o modelo pode ser replicado em outros contextos

**Parágrafo 4 - Limitações (OBRIGATÓRIO para A1):**
- Reconheça que o modelo depende dos julgamentos subjetivos dos especialistas
- Mencione a limitação da análise de sensibilidade univariada (OAT)
- Indique que a amostra de especialistas pode não representar todo o setor
- Use tom honesto mas não autodepreciativo

Exemplo de estilo:
"As limitações do estudo devem ser reconhecidas. Primeiramente, os resultados são condicionados aos julgamentos do painel de especialistas consultados, cuja representatividade setorial, embora adequada, não é exaustiva. A análise de sensibilidade adotou abordagem univariada (OAT), que, embora apropriada para verificações práticas, não captura correlações complexas entre os critérios que poderiam ser exploradas por métodos estocásticos."

**Parágrafo 5 - Trabalhos Futuros:**
- Sugira extensões metodológicas: Fuzzy-AHP (para incerteza), ANP (para interdependências), Simulação de Monte Carlo (para análise global)
- Proponha ampliação da amostra ou aplicação em outros setores
- Indique possibilidade de estudos longitudinais

Exemplo de estilo:
"Trabalhos futuros poderiam empregar a lógica Fuzzy para capturar a imprecisão inerente aos julgamentos de especialistas, especialmente em contextos de alta incerteza tecnológica. A adoção do Analytic Network Process (ANP) permitiria modelar interdependências entre critérios, como a relação entre Segurança Cibernética e Dependência Tecnológica. Adicionalmente, a simulação de Monte Carlo possibilitaria análise de sensibilidade multivariada, explorando o espaço de decisão de forma mais abrangente. Recomenda-se também a replicação do modelo em outros setores industriais brasileiros para validação externa."

## PALAVRAS/EXPRESSÕES PROIBIDAS

NUNCA use:
- excepcional, excelente, notável, impressionante, incrível, perfeito, robustíssimo
- claramente superior, indiscutivelmente, sem dúvida, inquestionável
- alta confiabilidade, altamente robusto (use apenas "robusto" ou "satisfatoriamente robusto")
- muito, extremamente, substancialmente, significativamente (como intensificadores genéricos)
- "substancialmente abaixo", "significativamente superior", "consideravelmente maior"

Substitutos permitidos para intensificadores:
- Em vez de "substancialmente abaixo": use "situam-se abaixo" ou "inferior ao limite"
- Em vez de "significativamente superior": use "superior" (sem intensificador)
- Em vez de "consideravelmente maior": use "apresenta valor superior"

USE APENAS:
- satisfatório, aceitável, adequado, consistente, coerente
- favorável, desfavorável
- marginal, moderado, expressivo, dominância
- indica, sugere, aponta, demonstra, revela
- corrobora, alinha-se, converge com

## REFERÊNCIAS A CITAR

Obrigatórias (DEVEM aparecer no texto):
- Saaty (1977, 1980) - consistência, escala fundamental, CR ≤ 0.10 (origem em Saaty 1977 J. Math. Psychol.; consolidação em Saaty 1980 livro AHP)
- Wijnmalen (2007) - metodologia BOCR, fórmula subtrativa, comensurabilidade
- Petrillo et al. (2023) - state-of-the-art review BOCR (NÃO é fonte primária; fontes primárias das 5 fórmulas: Saaty & Ozdemir 2003 — Aditivo Residual, Mult. Potências, Mult. Simples; Wijnmalen 2007 Eq. 17 — Subtrativa; Lee A.H.I. 2009 — aplicação)

Quando apropriado (USE SEMPRE QUE O TÓPICO FOR MENCIONADO):
- Saaty (1977) - threshold original de CR
- Saaty (2003) - procedimento de revisão de julgamentos
- Saaty & Vargas (1984) - Rank Reversal no AHP
- Belton & Gear (1983) - crítica clássica de Rank Reversal
- Forman & Peniwati (1998) - agregação AIJ/AIP, média geométrica
- Tramarico et al. (2022) - estrutura de subcritérios I4.0 e BOCR
- Tortorella et al. (2019) - ganhos de produtividade com I4.0 no setor automotivo
- Ghobakhloo (2018) - barreiras e drivers da digitalização industrial
- Xu et al. (2021) - Indústria 5.0: integração homem-máquina e sustentabilidade
- Breque et al. (2021) - Comissão Europeia sobre Indústria 5.0
- Triantaphyllou & Sánchez (1997) - análise de sensibilidade em MCDM

REGRA: Se o tópico exige citação e nenhuma das referências acima é aplicável, NÃO faça a afirmação. Prefira silêncio a citação vaga.

## INSTRUÇÃO FINAL

Com base APENAS nos dados JSON fornecidos, escreva o texto final em Português (Brasil). 
NÃO invente dados que não estejam no JSON.
Se a diferença for pequena (< 5%), diga "marginal". 
Se for grande (> 15%), diga "expressiva".
NÃO use bullets ou listas - apenas parágrafos de prosa acadêmica.
Mantenha tom SÓBRIO e FACTUAL em todo o texto.
O texto deve ser indistinguível de um artigo publicado em Omega ou EJOR.`;

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as {
      calculationData: any;
      projectContext?: { name?: string; description?: string };
      exclusionInfo?: { totalCollected: number; activeCount: number; excludedCount: number };
      markdownTables?: {
        table1?: string; table2?: string; table3?: string;
        table4?: string; table5?: string; table6?: string;
      };
    };

    const calculationData = data.calculationData;
    const projectContext = data.projectContext;
    const tables = data.markdownTables || {};
    const hasTables = Boolean(tables.table1 && tables.table2 && tables.table3 && tables.table4 && tables.table5 && tables.table6);

    if (!calculationData) {
      return NextResponse.json({
        success: false,
        error: 'Dados de cálculo são obrigatórios'
      }, { status: 400 });
    }

    // Processar informação de exclusão (se houver)
    let exclusionText = '';
    if (data.exclusionInfo && typeof data.exclusionInfo.excludedCount === 'number' && data.exclusionInfo.excludedCount > 0) {
      const total = data.exclusionInfo.totalCollected ?? 0;
      const excluded = data.exclusionInfo.excludedCount ?? 0;
      const active = data.exclusionInfo.activeCount ?? Math.max(0, total - excluded);
      const rate = total > 0 ? ((excluded / total) * 100).toFixed(1) : '0.0';

      exclusionText = `
FILTRAGEM APLICADA:
- Amostra original: ${total} especialistas
- Incluídos na análise: ${active} especialistas
- Excluídos por CR > 0.10: ${excluded} (${rate}%)
- Justificativa: limiar de consistência (Saaty, 1977) + revisão individual pós-coleta inviável (Saaty, 2003) + impacto dos julgamentos individuais na agregação por média geométrica (Forman & Peniwati, 1998)
`;
    }

    // Verificar se há API key configurada
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key não configurada. Configure ANTHROPIC_API_KEY nas variáveis de ambiente.'
      }, { status: 500 });
    }

    // Preparar dados para o prompt
    const dataContext = prepareDataContext(calculationData, projectContext);

    // Build tables block for injection into prompt
    let tablesBlock = '';
    if (hasTables) {
      tablesBlock = `

## TABELAS PRÉ-FORMATADAS (USE EXATAMENTE COMO ESTÃO)

O texto DEVE referenciar estas tabelas usando os marcadores [TABELA_1] a [TABELA_6].
Quando o texto mencionar uma tabela, insira o marcador correspondente em uma linha isolada.
NÃO reproduza os dados das tabelas no corpo do texto — apenas referencie-as.

### TABELA 1 — Pesos Estratégicos BOCR
${tables.table1}

### TABELA 2 — Pesos Locais e Globais dos Subcritérios
${tables.table2}

### TABELA 3 — Desempenho das Alternativas nos Méritos BOCR
${tables.table3}

### TABELA 4 — Ranking Final por Método de Síntese
${tables.table4}

### TABELA 5 — Índices de Consistência
${tables.table5}

### TABELA 6 — Análise de Sensibilidade
${tables.table6}
`;
    }

    // Chamar Claude API com configurações otimizadas
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 12000, // Aumentado para texto completo com Implicações Gerenciais
      temperature: 0.3, // Temperatura mais baixa para maior rigor acadêmico
      messages: [
        {
          role: 'user',
          content: `## CONTEXTO DO ESTUDO

**Título do Projeto:** ${projectContext?.name || 'Análise de Decisão Multicritério para Investimentos em Indústria 4.0'}

**Descrição:** ${projectContext?.description || 'Aplicação do método híbrido AHP-BOCR para avaliação de investimentos em tecnologias habilitadoras da Indústria 4.0 no setor automotivo brasileiro.'}

${exclusionText}

**Número de Especialistas Consultados:** ${calculationData.responseCount || 0}

**Setor de Aplicação:** Automotivo brasileiro

## DADOS COMPLETOS DO PROCESSAMENTO AHP-BOCR (JSON)

\`\`\`json
${JSON.stringify(dataContext, null, 2)}
\`\`\`

## TAREFA

Com base nos dados acima, escreva as seções completas de:

1. **"RESULTADOS E DISCUSSÃO"** (mínimo 2.000 palavras)
   - Inclua análise de consistência COM interpretação da magnitude do CR
   - OBRIGATÓRIO: Insira [TABELA_5] (índices de consistência) após discutir CR/λmax/CI e ANTES da sensibilidade
   - Inclua origem dos critérios (revisão sistemática + validação por especialistas)
   - Inclua análise dimensional de TODOS os 4 méritos BOCR
   - Inclua síntese global com convergência metodológica Saaty-Wijnmalen
   - Inclua análise de sensibilidade COM zona de estabilidade
   - Inclua verificação de Rank Reversal se houver dados

2. **"IMPLICAÇÕES GERENCIAIS"** (mínimo 400 palavras) - OBRIGATÓRIO
   - Subseção dentro de Resultados
   - Tradução para ação: o que o gestor faz com esse resultado?
   - Gestão de mudança: quais desafios de implementação?
   - Alocação de recursos: como priorizar baseado nos subcritérios?
   - Monitoramento: quais métricas acompanhar?

3. **"CONCLUSÃO"** (mínimo 400 palavras)
   - Retomada e resultado principal
   - Explicação qualitativa conectada à teoria de I4.0
   - Contribuição teórica e prática
   - Limitações metodológicas (OAT, subjetividade, amostra)
   - Trabalhos futuros (Fuzzy-AHP, ANP, Monte Carlo)

## REGRAS DE ESTILO OBRIGATÓRIAS (PADRÃO OMEGA/EJOR)

### Vocabulário Proibido:
- excepcional, excelente, notável, impressionante, incrível, perfeito
- substancialmente, extremamente, muito, altamente, significativamente (como intensificadores)
- claramente superior, alta confiabilidade, incontestável, robustíssimo

### Vocabulário Permitido:
- satisfatório, aceitável, adequado, consistente, favorável, coerente
- indica, sugere, aponta, demonstra, revela, corrobora
- alinha-se a, converge com, em consonância com

### Qualificação de Diferenças (OBRIGATÓRIO):
- Diferença < 5%: use "marginal" ou "ligeira"
- Diferença 5-15%: use "moderada" ou "apreciável"  
- Diferença > 15%: use "expressiva" ou "substancial"
- Diferença > 30%: use "dominância"

### Lógica de Custos e Riscos (IMPORTANTE):
- Para C e R, valores MENORES = MELHOR desempenho
- "A2 apresenta estrutura de custos mais favorável" (quando C de A2 < C de A1)
- NUNCA diga que "menor custo é ruim"

### Interpretação do CR (NOVO):
- CR < 0,03: "indica julgamentos quase determinísticos"
- CR 0,03-0,07: "indica boa consistência com julgamentos ponderados"
- CR 0,07-0,10: "dentro do limite, sugerindo maior complexidade nas comparações"

### Contextualização Teórica (OBRIGATÓRIO para A1):
- Mencione que os critérios derivam de revisão sistemática e validação por especialistas
- Conecte achados à literatura de Indústria 4.0: "Este resultado corrobora..."
- Cite comensurabilidade: "Os pesos estratégicos garantem a comensurabilidade (Wijnmalen, 2007)"

### Termos Técnicos Obrigatórios:
- Consistency Ratio (CR), Trade-off, Rank Reversal
- Prioridade Local, Prioridade Global, Convergência metodológica
- Zona de estabilidade, Análise univariada (OAT), Comensurabilidade

### Formato:
- NÃO use bullets ou listas numeradas
- Escreva APENAS em parágrafos de prosa acadêmica
- Use 4 casas decimais para coeficientes (0,5523)
- Use 2 casas decimais para porcentagens (18,94%)
- Use 2 casas decimais para porcentagens (18,94%)
- O texto deve parecer extraído de Demirtas & Üstün (2008) ou Wijnmalen (2007)
${tablesBlock}`
        }
      ],
      system: SYSTEM_PROMPT
    });

    // Extrair texto da resposta
    let generatedText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // Post-processing: substituir placeholders [TABELA_X] pelo conteúdo real
    if (hasTables) {
      const tableMap: Record<string, string> = {
        '1': tables.table1 || '',
        '2': tables.table2 || '',
        '3': tables.table3 || '',
        '4': tables.table4 || '',
        '5': tables.table5 || '',
        '6': tables.table6 || '',
      };

      // Regex flexível: captura [TABELA_1], [Tabela 1], [TABELA 1], [tabela_1], etc.
      generatedText = generatedText.replace(
        /\[(?:TABELA|Tabela|tabela)[_\s]?(\d)\]/gi,
        (match, num) => {
          const tableContent = tableMap[num];
          return tableContent ? `\n\n${tableContent}\n\n` : match;
        }
      );

      // Fallback: Se alguma tabela não foi inserida pela IA, injetar no final da seção relevante
      if (hasTables) {
        // Verificar se Tabela 5 está presente no texto (caso mais comum de omissão)
        const hasTable5 = generatedText.includes(tables.table5 || '##NONE##');
        if (!hasTable5 && tables.table5) {
          // Inserir Tabela 5 antes da análise de sensibilidade (Tabela 6)
          // Procurar pela Tabela 6 já inserida ou pela seção de sensibilidade
          const table6Content = tables.table6 || '';
          const sensKeywords = [
            table6Content.substring(0, 50), // Início da Tabela 6 já inserida
            'análise de sensibilidade foi conduzida',
            'variação sistemática univariada',
            'OAT - One-at-a-Time',
            'sensibilidade dos pesos'
          ];

          let inserted = false;
          for (const keyword of sensKeywords) {
            if (keyword && generatedText.includes(keyword)) {
              const insertionPoint = generatedText.indexOf(keyword);
              // Encontrar o início do parágrafo (último \n\n antes do keyword)
              const beforeKeyword = generatedText.substring(0, insertionPoint);
              const lastBreak = beforeKeyword.lastIndexOf('\n\n');
              if (lastBreak !== -1) {
                generatedText =
                  generatedText.substring(0, lastBreak) +
                  `\n\n${tables.table5}\n\n` +
                  generatedText.substring(lastBreak);
                inserted = true;
                break;
              }
            }
          }

          // Se não encontrou ponto de inserção, adicionar antes da conclusão
          if (!inserted) {
            const conclusionMarkers = ['# CONCLUSÃO', '# Conclusão', '## CONCLUSÃO', '## Conclusão'];
            for (const marker of conclusionMarkers) {
              if (generatedText.includes(marker)) {
                generatedText = generatedText.replace(
                  marker,
                  `${tables.table5}\n\n${marker}`
                );
                inserted = true;
                break;
              }
            }
          }

          // Último fallback: append ao final da seção de resultados
          if (!inserted) {
            // Inserir antes do último parágrafo do texto
            const lastParagraphBreak = generatedText.lastIndexOf('\n\n');
            if (lastParagraphBreak !== -1) {
              generatedText =
                generatedText.substring(0, lastParagraphBreak) +
                `\n\n${tables.table5}\n\n` +
                generatedText.substring(lastParagraphBreak);
            }
          }
        }
      }
    }

    // Calcular estatísticas do texto gerado
    const wordCount = generatedText.split(/\s+/).length;
    const charCount = generatedText.length;

    return NextResponse.json({
      success: true,
      text: generatedText,
      statistics: {
        wordCount,
        charCount,
        meetsMinimum: wordCount >= 2800, // 2000 (Resultados) + 400 (Implicações) + 400 (Conclusão)
        sections: {
          resultsMinimum: 2000,
          implicationsMinimum: 400,
          conclusionMinimum: 400
        }
      },
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens
      }
    });

  } catch (error: any) {
    console.error('Erro na geração de texto:', error);

    // Verificar se é erro de API key
    if (error.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'API key inválida ou expirada'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao gerar texto acadêmico'
    }, { status: 500 });
  }
}

// ============================================================
// PREPARAÇÃO DE DADOS PARA O PROMPT
// ============================================================

function prepareDataContext(calc: any, context: any) {
  // Extrair informações completas para o prompt
  const alternatives = calc.finalScores?.map((s: any) => ({
    codigo: s.code,
    nome: s.name,
    beneficios: {
      score: s.B?.toFixed(4),
      ranking: getRanking(calc.finalScores, 'B', s.code)
    },
    oportunidades: {
      score: s.O?.toFixed(4),
      ranking: getRanking(calc.finalScores, 'O', s.code)
    },
    custos: {
      score: s.C?.toFixed(4),
      ranking: getRanking(calc.finalScores, 'C', s.code),
      nota: 'Quanto MENOR, melhor'
    },
    riscos: {
      score: s.R?.toFixed(4),
      ranking: getRanking(calc.finalScores, 'R', s.code),
      nota: 'Quanto MENOR, melhor'
    },
    scores_sintese: {
      aditivo: s.scoreAdditive?.toFixed(4),
      probabilistico: s.scoreProbabilistic?.toFixed(4),
      subtrativo: s.scoreSubtractive?.toFixed(4),
      multiplicativo_potencias: s.scoreMultPowersNorm?.toFixed(4),
      multiplicativo_simples: s.scoreMultSimpleNorm?.toFixed(4)
    }
  })) || [];

  // Ranking ordenado por cada método
  const rankings = {
    aditivo: [...alternatives].sort((a, b) =>
      parseFloat(b.scores_sintese.aditivo) - parseFloat(a.scores_sintese.aditivo)
    ).map((a, i): RankingItem => ({ posicao: i + 1, alternativa: a.nome, codigo: a.codigo, score: a.scores_sintese.aditivo })),

    subtrativo: [...alternatives].sort((a, b) =>
      parseFloat(b.scores_sintese.subtrativo) - parseFloat(a.scores_sintese.subtrativo)
    ).map((a, i): RankingItem => ({ posicao: i + 1, alternativa: a.nome, codigo: a.codigo, score: a.scores_sintese.subtrativo })),

    multiplicativo: [...alternatives].sort((a, b) =>
      parseFloat(b.scores_sintese.multiplicativo_potencias) - parseFloat(a.scores_sintese.multiplicativo_potencias)
    ).map((a, i): RankingItem => ({ posicao: i + 1, alternativa: a.nome, codigo: a.codigo, score: a.scores_sintese.multiplicativo_potencias }))
  };

  // Pesos BOCR
  const bocrWeights = calc.bocrWeights || [0.25, 0.25, 0.25, 0.25];
  const pesos_bocr = {
    beneficios: { peso: bocrWeights[0]?.toFixed(4), percentual: (bocrWeights[0] * 100).toFixed(2) + '%' },
    oportunidades: { peso: bocrWeights[1]?.toFixed(4), percentual: (bocrWeights[1] * 100).toFixed(2) + '%' },
    custos: { peso: bocrWeights[2]?.toFixed(4), percentual: (bocrWeights[2] * 100).toFixed(2) + '%' },
    riscos: { peso: bocrWeights[3]?.toFixed(4), percentual: (bocrWeights[3] * 100).toFixed(2) + '%' }
  };

  // Consistência detalhada
  const consistencia = {
    cr_global: {
      valor: calc.bocrConsistency?.cr?.toFixed(4),
      percentual: ((calc.bocrConsistency?.cr || 0) * 100).toFixed(2) + '%',
      status: (calc.bocrConsistency?.cr || 0) <= 0.10 ? 'APROVADO' : 'REPROVADO',
      limite_saaty: '10% (Saaty, 1980)'
    },
    ci: calc.bocrConsistency?.ci?.toFixed(4),
    lambda_max: calc.bocrConsistency?.lambda?.toFixed(4),
    interpretacao: (calc.bocrConsistency?.cr || 0) <= 0.05
      ? 'Consistência excelente - julgamentos altamente confiáveis'
      : (calc.bocrConsistency?.cr || 0) <= 0.08
        ? 'Consistência muito boa - julgamentos confiáveis'
        : (calc.bocrConsistency?.cr || 0) <= 0.10
          ? 'Consistência aceitável - dentro do limite de Saaty'
          : 'Consistência marginal - requer atenção'
  };

  // Análise de sensibilidade
  const sensibilidade = {
    beneficios: formatSensitivity(calc.sensitivityInflections?.B, 'B'),
    oportunidades: formatSensitivity(calc.sensitivityInflections?.O, 'O'),
    custos: formatSensitivity(calc.sensitivityInflections?.C, 'C'),
    riscos: formatSensitivity(calc.sensitivityInflections?.R, 'R'),
    classificacao_geral: classifySensitivity(calc.sensitivityInflections),
    contagem_criticos: ['B', 'O', 'C', 'R'].filter(m => (calc.sensitivityInflections?.[m] ?? 100) <= 10).length,
    meritos_criticos: ['B', 'O', 'C', 'R'].filter(m => (calc.sensitivityInflections?.[m] ?? 100) <= 10)
  };

  // Vencedor
  const fallbackRanking: RankingItem = { posicao: 0, alternativa: 'N/A', codigo: 'N/A', score: '0' };
  const vencedor = rankings.aditivo[0] || fallbackRanking;
  const segundo = rankings.aditivo[1] || fallbackRanking;
  const diferenca = vencedor.score && segundo.score ?
    ((parseFloat(vencedor.score) - parseFloat(segundo.score)) / parseFloat(vencedor.score) * 100).toFixed(2) + '%' : 'N/A';

  // Concordância entre métodos
  const metodosVencedores = [
    rankings.aditivo[0]?.codigo,
    rankings.subtrativo[0]?.codigo,
    rankings.multiplicativo[0]?.codigo
  ];
  const vencedorUniforme = metodosVencedores.every(v => v === metodosVencedores[0]);

  return {
    projeto: {
      nome: context?.name || calc.metadata?.projectName || 'Projeto AHP-BOCR',
      descricao: context?.description || 'Análise de decisão multicritério',
      num_especialistas: calc.responseCount || 0,
      num_alternativas: alternatives.length,
      data_calculo: calc.calculatedAt
    },

    pesos_estrategicos_bocr: pesos_bocr,

    // NOVO: Estrutura hierárquica completa com subcritérios
    estrutura_hierarquica: {
      beneficios: {
        peso_global: pesos_bocr.beneficios,
        subcriterios: SUBCRITERIA.filter(s => s.group === 'B').map((sub, idx) => ({
          codigo: sub.code,
          nome: sub.name,
          dimensao: sub.dimension,
          descricao: sub.description,
          peso_local: calc.subWeights?.B?.[idx]?.toFixed(4) || 'N/D'
        }))
      },
      oportunidades: {
        peso_global: pesos_bocr.oportunidades,
        subcriterios: SUBCRITERIA.filter(s => s.group === 'O').map((sub, idx) => ({
          codigo: sub.code,
          nome: sub.name,
          dimensao: sub.dimension,
          descricao: sub.description,
          peso_local: calc.subWeights?.O?.[idx]?.toFixed(4) || 'N/D'
        }))
      },
      custos: {
        peso_global: pesos_bocr.custos,
        nota: 'Quanto MENOR o score da alternativa, MELHOR',
        subcriterios: SUBCRITERIA.filter(s => s.group === 'C').map((sub, idx) => ({
          codigo: sub.code,
          nome: sub.name,
          dimensao: sub.dimension,
          descricao: sub.description,
          peso_local: calc.subWeights?.C?.[idx]?.toFixed(4) || 'N/D'
        }))
      },
      riscos: {
        peso_global: pesos_bocr.riscos,
        nota: 'Quanto MENOR o score da alternativa, MELHOR',
        subcriterios: SUBCRITERIA.filter(s => s.group === 'R').map((sub, idx) => ({
          codigo: sub.code,
          nome: sub.name,
          dimensao: sub.dimension,
          descricao: sub.description,
          peso_local: calc.subWeights?.R?.[idx]?.toFixed(4) || 'N/D'
        }))
      }
    },

    consistencia: consistencia,

    alternativas_detalhadas: alternatives,

    rankings_por_metodo: rankings,

    concordancia_metodos: {
      todos_concordam: vencedorUniforme,
      vencedor_predominante: vencedor.codigo,
      metodos_concordantes: metodosVencedores.filter(v => v === vencedor.codigo).length,
      total_metodos: 5
    },

    resultado_final: {
      vencedor: {
        codigo: vencedor.codigo,
        nome: vencedor.alternativa,
        score_aditivo: vencedor.score,
        score_subtrativo: rankings.subtrativo.find(r => r.codigo === vencedor.codigo)?.score,
        score_multiplicativo: rankings.multiplicativo.find(r => r.codigo === vencedor.codigo)?.score
      },
      segundo_colocado: {
        codigo: segundo.codigo,
        nome: segundo.alternativa,
        score_aditivo: segundo.score
      },
      diferenca_percentual: diferenca,
      margem_seguranca: parseFloat(diferenca) > 10 ? 'Alta' : parseFloat(diferenca) > 5 ? 'Moderada' : 'Baixa'
    },

    analise_sensibilidade: sensibilidade,

    // NOVO: Análise de sensibilidade expandida com cenários
    analise_sensibilidade_expandida: generateExpandedSensitivity(calc, alternatives),

    formulas_sintese: {
      aditiva: 'Score = b×B + o×O + c×(1-C) + r×(1-R)',
      subtrativa: 'Score = vb·sb·B + vo·so·O − vc·sc·C − vr·sr·R (Wijnmalen, 2007, Eq. 17)',
      multiplicativa_potencias: 'Score = B^b × O^o / (C^c × R^r)',
      multiplicativa_simples: 'Score = (B×O) / (C×R)'
    },

    referencias_metodologicas: [
      'Saaty, T.L. (1977, 1980) - Escala fundamental e limite CR ≤ 10%',
      'Wijnmalen, D.J.D. (2007) - Metodologia BOCR e fórmulas de síntese',
      'Petrillo, A. et al. (2023) - state-of-the-art review BOCR (não é fonte primária)',
      'Alizadeh, R. et al. (2020) - Estrutura de análise multicritério'
    ]
  };
}

function getRanking(scores: any[], dimension: string, code: string): number {
  const sorted = [...scores].sort((a, b) => {
    if (dimension === 'C' || dimension === 'R') {
      return (a[dimension] || 0) - (b[dimension] || 0); // Menor é melhor
    }
    return (b[dimension] || 0) - (a[dimension] || 0); // Maior é melhor
  });
  return sorted.findIndex(s => s.code === code) + 1;
}

function formatSensitivity(inflection: number | null | undefined, merit: string): any {
  if (inflection === null || inflection === undefined) {
    return {
      ponto_inversao: null,
      classificacao: 'Estável',
      interpretacao: `O ranking permanece inalterado independentemente de variações no peso de ${merit}`
    };
  }

  const classification = inflection <= 10 ? 'Crítico' :
    inflection <= 20 ? 'Sensível' :
      inflection <= 50 ? 'Moderado' : 'Estável';

  return {
    ponto_inversao: `${inflection.toFixed(2)}%`,
    classificacao: classification,
    interpretacao: `Uma variação de ${inflection.toFixed(2)}% no peso de ${merit} causa inversão no ranking`
  };
}

function classifySensitivity(inflections: any): string {
  if (!inflections) return 'Não calculada';

  const values = ['B', 'O', 'C', 'R']
    .map(m => inflections[m])
    .filter(v => v !== null && v !== undefined);

  if (values.length === 0) return 'Altamente Estável';

  const criticalCount = values.filter(v => v <= 10).length;
  const sensitiveCount = values.filter(v => v > 10 && v <= 20).length;

  if (criticalCount >= 2) return 'Crítica - Alta Sensibilidade';
  if (criticalCount === 1) return 'Sensível - Requer Atenção';
  if (sensitiveCount >= 2) return 'Moderada';
  return 'Robusta';
}

// ============================================================
// ANÁLISE DE SENSIBILIDADE EXPANDIDA
// Calcula cenários de variação ±5%, ±10%, ±20% para cada peso BOCR
// ============================================================

function generateExpandedSensitivity(calc: any, alternatives: any[]): any {
  const bocrWeights = calc.bocrWeights || [0.25, 0.25, 0.25, 0.25];
  const finalScores = calc.finalScores || [];

  if (finalScores.length < 2) {
    return { disponivel: false, motivo: 'Necessário pelo menos 2 alternativas' };
  }

  const meritLabels = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
  const meritKeys = ['B', 'O', 'C', 'R'];
  const variations = [-20, -10, -5, 0, 5, 10, 20]; // Porcentagens de variação

  // Função para recalcular score com pesos modificados
  const calculateScoreWithWeights = (alt: any, weights: number[]): number => {
    const [b, o, c, r] = weights;
    const B = alt.B || 0;
    const O = alt.O || 0;
    const C = alt.C || 0;
    const R = alt.R || 0;
    // Fórmula subtrativa de Wijnmalen
    return b * B + o * O - c * C - r * R;
  };

  // Análise por mérito
  const analise_por_merito: any = {};

  meritKeys.forEach((merit, mIdx) => {
    const cenarios: any[] = [];

    variations.forEach(variation => {
      // Criar cópia dos pesos e modificar o peso do mérito atual
      const newWeights = [...bocrWeights];
      const delta = bocrWeights[mIdx] * (variation / 100);
      newWeights[mIdx] = Math.max(0.01, Math.min(0.99, bocrWeights[mIdx] + delta));

      // Renormalizar para somar 1
      const sum = newWeights.reduce((a, b) => a + b, 0);
      const normalizedWeights = newWeights.map(w => w / sum);

      // Calcular scores com novos pesos
      type ScoreItem = { codigo: string; nome: string; score: number };
      const scores: ScoreItem[] = finalScores.map((alt: any) => ({
        codigo: alt.code,
        nome: alt.name,
        score: calculateScoreWithWeights(alt, normalizedWeights)
      }));

      // Ordenar por score (maior primeiro)
      scores.sort((a, b) => b.score - a.score);

      cenarios.push({
        variacao: variation === 0 ? 'Base' : `${variation > 0 ? '+' : ''}${variation}%`,
        peso_modificado: (normalizedWeights[mIdx] * 100).toFixed(1) + '%',
        ranking: scores.map((s, idx) => `${idx + 1}º ${s.codigo}`).join(' > '),
        vencedor: scores[0].codigo,
        diferenca_1o_2o: scores.length >= 2
          ? ((scores[0].score - scores[1].score) * 100).toFixed(2) + '%'
          : 'N/A'
      });
    });

    // Verificar se houve inversão de ranking
    const baseWinner = cenarios.find(c => c.variacao === 'Base')?.vencedor;
    const inversoes = cenarios.filter(c => c.vencedor !== baseWinner);

    analise_por_merito[meritLabels[mIdx]] = {
      peso_atual: (bocrWeights[mIdx] * 100).toFixed(1) + '%',
      cenarios,
      inversoes_detectadas: inversoes.length,
      estabilidade: inversoes.length === 0 ? 'Estável' :
        inversoes.length <= 2 ? 'Sensível' : 'Crítico',
      cenarios_com_inversao: inversoes.map(i => i.variacao)
    };
  });

  // Resumo geral
  const totalInversoes = Object.values(analise_por_merito)
    .reduce((sum: number, m: any) => sum + (m.inversoes_detectadas || 0), 0) as number;

  const meritosEstaveis = Object.entries(analise_por_merito)
    .filter(([_, m]: [string, any]) => m.inversoes_detectadas === 0)
    .map(([nome]: [string, any]) => nome);

  const meritosCriticos = Object.entries(analise_por_merito)
    .filter(([_, m]: [string, any]) => m.inversoes_detectadas >= 3)
    .map(([nome]: [string, any]) => nome);

  return {
    disponivel: true,
    metodologia: 'Variação sistemática de ±5%, ±10% e ±20% em cada peso BOCR com renormalização',
    analise_por_merito,
    resumo: {
      total_cenarios_analisados: variations.length * 4,
      total_inversoes_detectadas: totalInversoes,
      classificacao_geral: totalInversoes === 0 ? 'Altamente Robusto' :
        totalInversoes <= 4 ? 'Robusto' :
          totalInversoes <= 8 ? 'Moderadamente Sensível' : 'Sensível',
      meritos_estaveis: meritosEstaveis.length > 0 ? meritosEstaveis : ['Nenhum'],
      meritos_criticos: meritosCriticos.length > 0 ? meritosCriticos : ['Nenhum'],
      interpretacao: totalInversoes === 0
        ? 'O ranking é altamente robusto e permanece inalterado em todos os cenários de variação testados.'
        : totalInversoes <= 4
          ? 'O ranking apresenta boa robustez, com inversões apenas em cenários extremos de variação.'
          : 'O ranking é sensível a variações nos pesos BOCR. Recomenda-se cautela na interpretação.'
    }
  };
}

export async function GET() {
  return NextResponse.json({
    name: 'AHP-BOCR Academic Text Generator',
    version: '3.0',
    description: 'Gerador de texto acadêmico para artigos Q1/A1 - Padrão Omega/EJOR',
    standards: ['Omega', 'EJOR', 'Energy Policy', 'IJPE', 'JCP'],
    requirements: {
      results_discussion: '2.000+ palavras',
      managerial_implications: '400+ palavras (NOVO)',
      conclusion: '400+ palavras',
      total_minimum: '2.800+ palavras',
      style: 'Prosa acadêmica sem bullets',
      precision: '4 casas decimais'
    },
    features: [
      'Interpretação da magnitude do CR',
      'Origem dos critérios (revisão sistemática)',
      'Contextualização teórica com literatura I4.0',
      'Zona de estabilidade na sensibilidade',
      'Verificação de Rank Reversal',
      'Seção de Implicações Gerenciais (Omega)',
      'Limitações metodológicas explícitas',
      'Trabalhos futuros estruturados'
    ],
    references: [
      'Saaty (1977, 1980) - Escala fundamental e CR',
      'Wijnmalen (2007) - BOCR e fórmula subtrativa',
      'Saaty & Vargas (1984) - Rank Reversal',
      'Belton & Gear (1983) - Crítica ao AHP',
      'Forman & Peniwati (1998) - Agregação AIJ/AIP',
      'Petrillo et al. (2023) - state-of-the-art review BOCR',
      'Alizadeh et al. (2020) - Energia e MCDM',
      'Demirtas & Ustun (2008) - Modelo EJOR'
    ]
  });
}
