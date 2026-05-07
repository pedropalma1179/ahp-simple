# RAG_DECISIONS.md v2

## Decisões Técnicas Congeladas para a Fase 6.3 — RAG Vetorial

> **Versão:** 2.0
> **Data:** 07/mai/2026
> **Substitui:** v1 (gerado em sessão anterior, escopo errado)
> **Baseline:** docs/ESTADO_ATUAL_07mai2026.md v1.1 (SHA `815e508`)
> **Status:** STACK CONGELADA — qualquer mudança exige nova revisão Pedro+Claude

---

## 0. PROPÓSITO

Este documento congela as decisões técnicas que vão guiar a execução da Fase 6.3 (RAG vetorial) até a defesa em julho/2026. Funciona como contrato entre Pedro e Claude:

- **Para Pedro:** referência autoritativa quando Claude começar a sugerir alternativas
- **Para Claude:** instrução clara de "não desviar — se algo precisar mudar, parar e perguntar"
- **Para a dissertação:** material para Cap. 3/4 descrever a metodologia

Mudanças à stack após este documento exigem **nova decisão explícita** — não silenciosa em prompt Antigravity.

---

## 1. CONTEXTO HERDADO (resumo)

A Fase 6.3 **NÃO** constrói RAG do zero. O sistema já tem:

1. **35 articles científicos extraídos** em `lib/rag/articles/*.ts` (verbatim quotes + page numbers + locators)
2. **Schema tipado** em `lib/rag/types.ts` (`ArticleExtraction`, `Threshold`, `Formula`, `KeyClaim`, `BenchmarkEntry`)
3. **Agregador funcional** em `lib/rag/index.ts` com funções `getAllClaims()`, `getCRThresholds()`, `getBOCRFormulas()`, etc.
4. **Fachada inteligente** em `app/api/ai-reviewer/knowledge.ts` (v7.0, 326 linhas) que consome o agregador e expõe ao route.ts via `getKnowledgeContext()`, `getRefsByTopic()`, `getRAGThresholds()`, etc.
5. **Validação pós-LLM** em `app/api/ai-reviewer/route.ts` (`validateReviewOutput`, 6 categorias de checks regex)
6. **Detecção de viés** em `app/api/ai-reviewer/bias-detection.ts` (independente, baseada em Dodevska 2023)

A Fase 6.3 **adiciona uma camada vetorial paralela** ao retrieval keyword-based já existente. Não substitui.

---

## 2. STACK CONGELADA

### 2.1 Vector store

**Decisão:** **Upstash Vector** (free tier)

| Atributo | Valor | Justificativa |
|---|---|---|
| Provider | Upstash | Serverless, mesma filosofia de Vercel; sem custo fixo |
| Plano | Free Tier | 200MB / 10k vectors / 200k queries/mês — folgado para 35 papers (~210 chunks) |
| Region | `us-east-1` | Mesma região default da Vercel — minimiza latência (5-15ms vs cross-region 50-150ms) |
| Index name | `ahp-bocr-rag` | Único namespace; sem multi-tenant |
| Dimensions | 1024 | Voyage-3 produz embeddings de 1024 dimensões (ver §2.2) |
| Distance metric | COSINE | Padrão para embeddings de texto; mede ângulo entre vetores normalizados |

**Alternativas descartadas e por quê:**
- *Pinecone:* free tier mais restritivo, latência maior fora de us-east-1
- *Weaviate Cloud:* curva de aprendizado, schema GraphQL desnecessário
- *Chroma local:* não roda em Vercel (precisa servidor persistente)
- *pgvector via Supabase:* ainda não usamos Supabase no projeto, adicionar dependência só pra isso é overkill

### 2.2 Embedding model

**Decisão:** **Voyage-3** via Voyage AI API

| Atributo | Valor | Justificativa |
|---|---|---|
| Provider | Voyage AI | Especialista em embeddings; melhor qualidade que OpenAI ada-002 em benchmarks recentes |
| Modelo | `voyage-3` | 1024 dimensões, 32k context window por chunk |
| Plano | Free Tier (50M tokens) | 35 articles × ~5k tokens = 175k tokens. Free tier dura semanas/meses |
| Input type | `document` para ingestão, `query` para consulta | Voyage diferencia (otimização interna) |

**Alternativas descartadas:**
- *OpenAI text-embedding-3-small:* qualidade ligeiramente inferior, custo similar
- *Cohere embed-v3:* boa opção mas Voyage tem precisão marginal melhor em domínios técnicos
- *Anthropic embeddings:* não existe API oficial até a data desta sessão

### 2.3 LLM (gerador do Parecer IA)

**Decisão:** **Claude Opus 4.7** com extended thinking

| Atributo | Valor atual (Sonnet 4.5) | Valor Fase 6.3 (Opus 4.7) |
|---|---|---|
| Modelo | `claude-sonnet-4-5-20250929` | `claude-opus-4-7` (string exata a confirmar via product-self-knowledge skill na Fase 6.3.5) |
| Max tokens | 12.000 | 16.000 (Pareceres mais longos comportam) |
| Temperature | 0.4 | 0.3 (mais conservador para reduzir alucinação) |
| Extended thinking | ❌ | ✅ habilitado (raciocínio estruturado antes da resposta) |
| Custo estimado por Parecer | ~$0.03-0.05 | ~$0.15-0.30 (3-5x mais) |

**Justificativa:** o Parecer IA é o artefato mais sensível do sistema (alucinações afetam a defesa). Opus 4.7 + extended thinking reduz erro de citação e melhora qualidade de paráfrase. Custo extra (~$0.20-0.25/Parecer) é insignificante diante do custo de uma alucinação detectada na banca.

**Backup:** se Opus falhar (rate limit, indisponibilidade), fallback para Sonnet 4.5 mantendo a integração.

### 2.4 Output do LLM

**Decisão:** **Anthropic Tool Use** com schema JSON estruturado

**Antes (atual):** LLM retorna texto livre. Validação é regex pós-geração.

**Depois (Fase 6.3.5):** LLM retorna via Tool Use com schema definido tipo:

```typescript
{
  sections: [
    {
      title: string,                    // ex: "Análise da Consistência Agregada"
      findings: [
        {
          observation: string,           // observação do LLM
          citation: {
            article_id: string,          // ex: "saaty1977_scaling"
            verbatim_quote: string,      // EXATAMENTE como no chunk
            page: number | null,
            locator_id: string | null
          },
          interpretation: string         // paráfrase do que isso significa para o estudo
        }
      ]
    }
  ],
  overall_recommendation: string,
  confidence_level: 'high' | 'medium' | 'low'
}
```

**Vantagem:** cada citação é auditável programaticamente — `verbatim_quote` deve casar exatamente com o chunk recuperado. Schema garante que LLM não pode "esquecer" de citar.

### 2.5 Retrieval pipeline

**Decisão:** Pipeline aditivo, mantendo retrieval keyword-based existente.

```
[Query do contexto do Parecer]
       │
       ├──→ Keyword-based (existente, MANTIDO)
       │       └─ getRefsByTopic('consistência') → top N por palavra-chave
       │
       ├──→ Semântico (NOVO)
       │       ├─ embed(query) via Voyage-3
       │       ├─ Upstash Vector query top-K=5
       │       └─ retorna chunks ordenados por similarity
       │
       └──→ Merge: keyword union semantic, dedupe por article_id+chunk_id, top 20
              │
              └─→ inject no prompt do LLM
```

**Failover:** se Upstash retornar erro/timeout, retrieval semântico vira no-op silencioso e prompt usa só keyword-based. Sistema **NUNCA** falha por causa do RAG vetorial.

---

## 3. ESTRATÉGIA DE CHUNKING

**Decisão:** **1 chunk por elemento estruturado** dos 35 articles

Em vez de chunkar PDFs por janela deslizante (típico em RAG genéricos), usamos os elementos já extraídos:

| Tipo de chunk | Origem | Quantidade estimada (35 papers) | Conteúdo |
|---|---|---|---|
| `claim` | `article.key_claims[]` | ~129 claims (memória 6.1 P2) | claim + verbatim_quote + evidence |
| `formula` | `article.formulas[]` | ~119 fórmulas | id + latex + description + variables |
| `threshold` | `article.thresholds[]` | ~30-50 | metric + operator + value + context |
| `table_figure` | `article.tables_figures[]` | ~50-70 | label + caption + content |
| `recommendation` | `article.recommendations[]` | ~70 | text plus article context |

**Total estimado: ~400-450 chunks** (revisar após ingestão real).

**Vantagens vs chunking de PDF bruto:**
- Cada chunk tem semântica clara (não corta no meio de fórmula)
- Verbatim_quote e page já vêm preservados
- Citation verifier vira simples comparação string

### 3.1 Schema do chunk no Upstash

```typescript
{
  id: string,                          // ex: "saaty1977_scaling::claim::3"
  vector: number[],                    // 1024 dims do embedding
  metadata: {
    article_id: string,                // "saaty1977_scaling"
    article_year: number,              // 1977
    article_type: string,              // "foundational"
    chunk_type: 'claim' | 'formula' | 'threshold' | 'table_figure' | 'recommendation',
    chunk_index: number,
    text: string,                      // para retrieval display (verbatim ou paráfrase curta)
    verbatim_quote: string | null,
    page: number | null,
    locator_type: string | null,
    locator_id: string | null,
    usable_as: string | null            // só para claims
  }
}
```

### 3.2 Texto a embeddar (input para Voyage)

Por tipo de chunk, formatamos o texto de input:

```typescript
// claim
`${claim.claim}\n\nVerbatim: ${claim.verbatim_quote}\n\nContext: ${article.metadata.domain}`

// formula
`${formula.description}\n\nLatex: ${formula.latex}\n\nVariables: ${stringify(formula.variables)}`

// threshold
`Metric ${threshold.metric} ${threshold.operator} ${threshold.value} ${threshold.unit}. Context: ${threshold.context}`

// ... etc
```

A formatação do input afeta qualidade do retrieval — explorar variações na Fase 6.3.2.

---

## 4. PLANO DE 5 FASES

| Fase | Entregável | Tempo | Risco | Reversível |
|---|---|---|---|---|
| **6.3.0** | ✅ `RAG_DECISIONS.md` (este documento) + contas/env vars | 1-2h | Baixo | Sim |
| **6.3.1** | `lib/rag/embed.ts` (Voyage wrapper) + `lib/rag/upstash-client.ts` (Upstash wrapper) + tests isolados | 2-3h | Baixo | Sim |
| **6.3.2** | `scripts/ingest-rag.ts` consumindo `getAllClaims()` + `getAllFormulas()` + `getAllThresholds()` → embed → upload | 3-4h | Médio | Sim (limpa índice + refaz) |
| **6.3.3** | `lib/rag/semantic-retrieve.ts` + `getRAGSemantic(query, k)` na fachada `app/api/ai-reviewer/knowledge.ts` | 3-4h | Médio | Sim |
| **6.3.4** | Modificar `app/api/ai-reviewer/route.ts`: trocar modelo para Opus 4.7 + adicionar Tool Use schema + injetar `getRAGSemantic()` no prompt + estender validateReviewOutput | 4-6h | **Alto** | Cuidado |

**Total: 13-19h focado.** Realista com debugging: 18-25h.

### 4.1 Estado da Fase 6.3.0 (HOJE)

✅ `RAG_DECISIONS.md` v2 produzido
✅ Conta Upstash criada (index `ahp-bocr-rag`, us-east-1, 1024 dims, COSINE, free tier)
✅ Conta Voyage AI criada
✅ 3 env vars no `.env.local` local: `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`, `VOYAGE_API_KEY`
✅ Mesmas 3 vars no Vercel Production + Preview (Sensitive)
⚠️ Development env não tem as vars (limitação Vercel: Sensitive vars não vão para Development) — `.env.local` local cobre dev local

### 4.2 Próxima sessão: Fase 6.3.1

Foco: criar wrappers minimalistas testáveis isoladamente, sem tocar em `route.ts`.

```
lib/rag/
├── embed.ts                     ← NOVO
│   export async function embed(text: string, type: 'document' | 'query'): Promise<number[]>
│
├── upstash-client.ts            ← NOVO
│   export async function upsertChunk(id: string, vector: number[], metadata: object): Promise<void>
│   export async function querySimilar(vector: number[], topK: number): Promise<RetrievedChunk[]>
│
└── (existente intocado)
```

Validação Fase 6.3.1:
- `npm run build` sem erros
- Teste isolado: `embed("test")` retorna array de 1024 floats
- Teste isolado: `upsertChunk('test', [...], {})` sucesso + `querySimilar([...], 1)` retorna o que foi upserted
- TypeScript types OK

---

## 5. CRITÉRIOS DE PRONTO (PARA TODA A FASE 6.3)

| # | Critério | Aceitável | Não-aceitável |
|---|---|---|---|
| 1 | Articles indexados no Upstash | 35 papers, ~400 chunks | <30 papers ou <300 chunks |
| 2 | Latência `getRAGSemantic` p95 | <500ms top-3 | ≥1s |
| 3 | Anti-regressão | 3 Pareceres reais idênticos antes/depois | qualquer regressão na qualidade |
| 4 | Pareceres novos citam chunks vetoriais | ≥2 chunks únicos vs keyword | 0 |
| 5 | Failover Upstash off | Keyword-based funciona | Crash |
| 6 | Custo estimado por Parecer | <$0.30 com Opus 4.7 | >$0.50 |
| 7 | TypeScript + build PASS | Sem warnings novos | Qualquer erro |
| 8 | Documentação metodológica | Suficiente Cap 3/4 dissertação | Incompleta |
| 9 | Audit manual citações | 0 falsas em 5 Pareceres | ≥1 falsa |
| 10 | Tool Use schema validado | 100% Pareceres conformes | <100% |
| 11 | Free tier não estourado | <50% uso de quota Upstash/Voyage | >80% |

---

## 6. PRINCÍPIOS NÃO-NEGOCIÁVEIS

1. **Aditivo, nunca substitutivo.** RAG vetorial COMPLEMENTA keyword-based existente. Failover automático.

2. **Zero alucinação tolerada em produção.** Tool Use força `verbatim_quote` por afirmação. Citation verifier (Fase 6.3.4 ou 6.3.5 caso necessário) compara contra chunks recuperados.

3. **Toda citação rastreável.** Cada afirmação no Parecer IA tem `article_id` + `page` + `locator_id` + `verbatim_quote`. Não há "Saaty (1980)" sem suporte concreto.

4. **PVB-compliant.** Citações no código que NÃO existem nos 35 articles do RAG são **proibidas**. Auditoria PVB já feita em sessões anteriores deve ser preservada.

5. **Sem regressão de qualidade.** Se Pareceres com vetorial forem PIORES que sem vetorial em qualquer dimensão, rollback imediato.

6. **Custo controlado.** Free tier do Upstash + Voyage. Opus 4.7 só para Pareceres (não para reviewer interno, não para tasks de baixa importância).

---

## 7. RISCOS IDENTIFICADOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Embeddings de baixa qualidade | Baixa | Alto | Voyage-3 é estado-da-arte; testar com 5 queries conhecidas antes de prosseguir |
| Custo Opus 4.7 acima de orçamento | Média | Médio | Limit configurável; fallback para Sonnet 4.5 se Opus falhar |
| Tool Use schema não validar | Média | Alto | Anthropic SDK 0.71.2 já suporta — testar isoladamente em 6.3.4 antes de integrar |
| Latência ruim em produção | Baixa | Médio | us-east-1 + Vercel us-east-1 = co-localizado. Se >500ms, investigar |
| Free tier estourar antes da defesa | Baixa | Baixo | 200k queries/mês = 6.6k/dia — defesa não usa nem 1% disso |
| `vercel env pull` sobrescrever `.env.local` | Média | Alto | Backup do `.env.local` antes de qualquer pull. Documentado em §4.1 |
| Antigravity inferir caminho errado de novo | Média | Alto | CADAR obrigatório: ler arquivo antes de prescrever, marcar inferências |

---

## 8. DECISÕES ABERTAS (revisitar antes de Fase 6.3.4)

| Decisão | Quando decidir | Critério |
|---|---|---|
| Citation verifier obrigatório? | Antes de Fase 6.3.4 | Auditar 3 Pareceres reais; se ≥1 alucinação em 100 citações, obrigatório |
| Top-K ideal | Durante Fase 6.3.3 | A/B test com K=3, 5, 10; escolher menor que mantém qualidade |
| Reranker (Cohere/Voyage rerank) | Pós-Fase 6.3.4 | Se top-K=5 já dá precisão >90%, não precisa |
| Cache de embeddings | Pós-Fase 6.3.4 | Se queries repetidas explodem custo, cachear no Upstash KV |

---

## 9. COMPROMISSOS

### De Pedro
- Não autorizar mudança de stack sem revisar este documento
- Auditar 3 Pareceres reais antes de Fase 6.3.4 começar
- Backup do `.env.local` antes de qualquer `vercel env pull`

### De Claude
- Não desviar das decisões da §2 sem perguntar
- Antes de cada fase: ler arquivos relevantes, marcar inferências como tal
- Toda alteração via prompt Antigravity com Fase 1 (diagnóstico) + Fase 2 (alteração) + V (validação)
- Anti-regressão obrigatória em 6.3.4

### Do método CADAR
- Compreender → Diferença → Plano → Implementar → Checar → Corrigir → Verificar laterais
- Aplicar em cada fase

---

## 10. APÊNDICE — COMANDOS DE VALIDAÇÃO RÁPIDA

```powershell
# Validar env vars locais (não mostra valores)
[System.IO.File]::ReadAllText("C:\AHP-BOCR\ahp-simple\.env.local") `
  -split "`r?`n" `
  | Where-Object { $_ -match "^(UPSTASH|VOYAGE|ANTHROPIC)" } `
  | ForEach-Object { ($_ -split '=', 2)[0] }

# Esperado:
# ANTHROPIC_API_KEY
# UPSTASH_VECTOR_REST_URL
# UPSTASH_VECTOR_REST_TOKEN
# VOYAGE_API_KEY
```

```powershell
# Validar que ESTADO_ATUAL v1.1 está em produção (último commit do docs/)
git log --oneline -- docs/ESTADO_ATUAL_07mai2026.md
# Esperado: 815e508 docs: ESTADO_ATUAL v1.1...
```

```powershell
# Ver estado dos articles no RAG
Get-ChildItem lib\rag\articles\ -Filter *.ts | Measure-Object | Select-Object Count
# Esperado: 36 (35 articles + _template.ts)
```

---

*FIM DO RAG_DECISIONS v2 — stack congelada para a defesa*
