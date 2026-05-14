// app/api/generate-academic/route.ts
// Gerador de Texto Acadêmico para Papers Q1/A1
// Baseado em: Alizadeh (2020), Wijnmalen (2007), Demirtas & Ustun (2008), Lee (2009)
// Estilo: Energy Policy, Omega, IJPE

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, API_VERSION, buildBenchmarksTable } from './system-prompt';

export const maxDuration = 800;

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

// SYSTEM_PROMPT v8.1.0 moved to ./system-prompt.ts (Phase 7 reconciled)

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
        table8?: string; // Phase 7.1 v8.1.5 - construido no backend
      };
    };

    const calculationData = data.calculationData;
    const projectContext = data.projectContext;
    const tables: any = data.markdownTables || {};

    // Phase 7.1 v8.1.5: construir Tabela 8 (benchmarks BOCR) no backend
    const studyB = calculationData?.bocrWeights?.[0] ?? 0;
    const studyO = calculationData?.bocrWeights?.[1] ?? 0;
    const studyC = calculationData?.bocrWeights?.[2] ?? 0;
    const studyR = calculationData?.bocrWeights?.[3] ?? 0;
    const respondentCount = calculationData?.responseCount ?? 0;
    const studyLabel = respondentCount > 0
      ? `Este estudo (HMCSA, n=${respondentCount})`
      : 'Este estudo';
    tables.table8 = buildBenchmarksTable({ B: studyB, O: studyO, C: studyC, R: studyR }, studyLabel);

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

### TABELA 8 — Comparacao com Benchmarks BOCR
${tables.table8}
`;
    }

    // Chamar Claude API com configurações otimizadas
    const client = new Anthropic({ apiKey });

    // Phase 7: Opcoes runtime para construcao do SYSTEM_PROMPT
    const systemPromptOptions = {
      hasExternalValidation: !!(calculationData as any)?.externalValidation?.results,
      exclusionInfo: (calculationData as any)?.exclusionInfo,
      sensitivityHasCriticos: (((calculationData as any)?.sensitivityInflections?.contagem_criticos) ?? 0) > 0,
      criticalMerits: ((calculationData as any)?.sensitivityInflections?.meritos_criticos) ?? [],
    };
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 32000,  // Phase 7 v8.1.4: 32k = 12k thinking budget + 20k texto
      thinking: { type: 'enabled' as const, budget_tokens: 12000 }, // Phase 7 v8.1.4: budget controlado evita comer todo max_tokens em thinking
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

1. **"RESULTADOS E DISCUSSÃO"** (densidade analítica conforme requerida pelos dados, sem mínimo artificial de palavras)
   - Inclua análise de consistência COM interpretação da magnitude do CR
   - OBRIGATÓRIO: Insira [TABELA_5] (índices de consistência) após discutir CR/λmax/CI e ANTES da sensibilidade
   - Inclua origem dos critérios (revisão sistemática + validação por especialistas)
   - Inclua análise dimensional de TODOS os 4 méritos BOCR
   - Inclua síntese global com convergência metodológica Saaty-Wijnmalen
   - Inclua análise de sensibilidade COM zona de estabilidade
   - Inclua verificação de Rank Reversal se houver dados

2. **"IMPLICAÇÕES GERENCIAIS"** (subseção obrigatória, 4 dimensões em prosa contínua, sem mínimo artificial)
   - Subseção dentro de Resultados
   - Tradução para ação: o que o gestor faz com esse resultado?
   - Gestão de mudança: quais desafios de implementação?
   - Alocação de recursos: como priorizar baseado nos subcritérios?
   - Monitoramento: quais métricas acompanhar?

3. **"CONCLUSÃO"** (5 parágrafos: retomada, explicação qualitativa, contribuição, limitações, trabalhos futuros)
   - Retomada e resultado principal
   - Explicação qualitativa conectada à teoria de I4.0
   - Contribuição teórica e prática
   - Limitações metodológicas (subjetividade dos julgamentos, tamanho da amostra)
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
- Zona de estabilidade, Análise contínua de inflexões, Comensurabilidade

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
      system: buildSystemPrompt(systemPromptOptions)
    });

    // Phase 7 v8.1.2 chunked streaming response — evita proxy idle timeout (~5-8 min de geração)
    const encoder = new TextEncoder();
    let accumulatedText = '';
    let finalUsage: { input_tokens: number; output_tokens: number } = { input_tokens: 0, output_tokens: 0 };

    const readable = new ReadableStream({
      async start(controller) {
        // Phase 7 v8.1.3 - keep-alive heartbeat (evita Vercel Edge idle timeout)
        // Anthropic com adaptive thinking pode aguardar varios minutos antes do primeiro chunk de texto.
        // Heartbeat de zero-width space a cada 15s mantem conexao viva pelo proxy.
        controller.enqueue(encoder.encode(' '));  // flush imediato (<1s)
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode('\u200B'));  // zero-width space, invisivel no display
          } catch (heartbeatErr) {
            // Stream ja fechado; clearInterval cleanup
          }
        }, 15000);

        try {
          // Stream chunks de texto à medida que chegam do Anthropic
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const textDelta = chunk.delta.text;
              accumulatedText += textDelta;
              controller.enqueue(encoder.encode(textDelta));
            }
          }

          // Stream terminou — capturar usage final
          const finalMessage = await stream.finalMessage();
          finalUsage = {
            input_tokens: finalMessage.usage.input_tokens,
            output_tokens: finalMessage.usage.output_tokens
          };

          // Post-processing: substituir placeholders [TABELA_X] pelo conteúdo real
          let generatedText = accumulatedText;
          if (hasTables) {
            const tableMap: Record<string, string> = {
              '1': tables.table1 || '',
              '2': tables.table2 || '',
              '3': tables.table3 || '',
              '4': tables.table4 || '',
              '5': tables.table5 || '',
              '6': tables.table6 || '',
              '8': tables.table8 || '', // Phase 7.1 v8.1.5
            };

            // Regex flexível: captura [TABELA_1], [Tabela 1], [TABELA 1], [tabela_1], etc.
            generatedText = generatedText.replace(
              /\[(?:TABELA|Tabela|tabela)[_\s]?(\d)\]/gi,
              (match, num) => {
                const tableContent = tableMap[num];
                return tableContent ? `\n\n${tableContent}\n\n` : match;
              }
            );

            // Fallback: Se Tabela 5 não foi inserida pela IA, injetar antes da sensibilidade
            const hasTable5 = generatedText.includes(tables.table5 || '##NONE##');
            if (!hasTable5 && tables.table5) {
              const table6Content = tables.table6 || '';
              const sensKeywords = [
                table6Content.substring(0, 50),
                'análise de sensibilidade foi conduzida',
                'pontos de inflexão',
                'metodologia contínua',
                'sensibilidade dos pesos'
              ];

              let inserted = false;
              for (const keyword of sensKeywords) {
                if (keyword && generatedText.includes(keyword)) {
                  const insertionPoint = generatedText.indexOf(keyword);
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

              if (!inserted) {
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

          // Calcular estatísticas do texto pós-processado
          const wordCount = generatedText.split(/\s+/).length;
          const charCount = generatedText.length;

          // Footer: marcador + JSON com texto final (com tabelas) + metadata
          // Frontend detecta <<<METADATA>>> e substitui texto exibido pelo texto pós-processado
          const metadata = {
            success: true,
            text: generatedText,
            statistics: {
              wordCount,
              charCount,
              apiVersion: API_VERSION
            },
            usage: {
              inputTokens: finalUsage.input_tokens,
              outputTokens: finalUsage.output_tokens
            }
          };

          const metadataMarker = '\n\n<<<METADATA>>>\n' + JSON.stringify(metadata);
          controller.enqueue(encoder.encode(metadataMarker));
          clearInterval(heartbeatInterval);  // Phase 7 v8.1.3 cleanup
          controller.close();
        } catch (streamErr: any) {
          clearInterval(heartbeatInterval);  // Phase 7 v8.1.3 cleanup em erro
          console.error('Erro durante stream:', streamErr);
          const errorMarker = '\n\n<<<ERROR>>>\n' + JSON.stringify({ error: streamErr.message || 'Erro no streaming' });
          controller.enqueue(encoder.encode(errorMarker));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no'  // Desabilita buffering em proxies
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
// ============================================================

export async function GET() {
  return NextResponse.json({
    name: 'AHP-BOCR Academic Text Generator',
    version: '8.1.0',
    description: 'Gerador de texto acadêmico para artigos Q1/A1 - Padrão Omega/EJOR',
    standards: ['Omega', 'EJOR', 'Energy Policy', 'IJPE', 'JCP'],
    requirements: {
      structure: '10 secoes R&D + Implicacoes Gerenciais (4 dimensoes prosa) + Conclusao (5 paragrafos)',
      citation_format: 'ABNT NBR 10520 com verbatim_quote na primeira aparicao',
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
      'Saaty (1977) - Escala fundamental e CR',
      'Wijnmalen (2007) - BOCR e fórmula subtrativa',
      'Saaty & Vargas (1984) - Rank Reversal',
      'Forman & Peniwati (1998) - Agregação AIJ/AIP',
      'Petrillo et al. (2023) - state-of-the-art review BOCR',
      'Alizadeh et al. (2020) - Energia e MCDM',
      'Demirtas & Ustun (2008) - Modelo EJOR'
    ]
  });
}


