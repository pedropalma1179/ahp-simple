# RAG_DECISIONS.md v3

## Decisões Técnicas Congeladas para a Fase 6.3 — RAG Vetorial

> **Versão:** 3.0
> **Data:** 09/mai/2026
> **Substitui:** v2 (07/mai/2026) — corrige decisão de LLM, documenta hardening PVB
> **Baseline:** docs/ESTADO_ATUAL_08mai2026.md v1.0, HEAD `6b07af0`
> **Status:** STACK CONGELADA — qualquer mudança exige nova revisão Pedro+Claude

---

## 0. ERRATA — O QUE A v2 ERROU (LLM)

A v2 deste documento (07/mai/2026) prescreveu **Claude Opus 4.7** como LLM da Fase 6.3.4. Após validação contra a documentação oficial da Anthropic (Migration Guide, What's New in 4.7, Models Overview), constatou-se que o Opus 4.7 introduz **breaking changes** incompatíveis com a parametrização atual do sistema e arriscadas pré-defesa:

| Parâmetro atual | Comportamento no Opus 4.7 |
|---|---|
| `temperature: 0.4` | Retorna HTTP 400 — `temperature/top_p/top_k` removidos |
| `thinking: { type: 'enabled', budget_tokens: N }` (legacy) | Retorna HTTP 400 — apenas `adaptive` é aceito |
| Assistant message prefills | Retorna HTTP 400 — exige structured outputs |
| Prompts calibrados para Sonnet/Opus anteriores | Funcionam, mas com risco de regressão por interpretação mais literal |
| Tokenizer | Novo — 1.0–1.35x mais tokens consumidos |

A v2 §2.3 também especificou `temperature: 0.3` para o Opus 4.7, o que **violaria a própria API** se aplicado.

A defesa está em ~21 dias (30/mai/2026). Risco de regressão silenciosa em prompts complexos pré-defesa é inaceitável. Decisão revisada após análise dos 3 caminhos (Sonnet 4.5 / Opus 4.6 / Opus 4.7):

**Caminho B aceito: migrar para Opus 4.6 (transitional model).**

Razões:
- Opus 4.6 mantém compatibilidade próxima da API anterior (apenas `temperature` é incompatível com `thinking: adaptive` — ver §2.3)
- Suporta `thinking: { type: 'adaptive' }` (raciocínio estruturado)
- Mesmo pricing do 4.7 ($5/$25 por M tokens)
- Compatível com prompts calibrados para Sonnet 4.5 (sem "more literal interpretation" do 4.7)
- Anti-regressão simples: comparar 1 Parecer real Opus 4.6 vs Sonnet 4.5 antes de oficializar

A migração foi separada em **Fase 6.3.0a** (commit cirúrgico em `route.ts` apenas), executada antes da Fase 6.3.2 (ingest) por independência funcional. Durante a execução, a Fase 6.3.0a foi **expandida** para incluir hardening PVB em duas camadas (ver §4.2).

---

## 1. CONTEXTO HERDADO (resumo)

A Fase 6.3 **NÃO** constrói RAG do zero. O sistema já tem:

1. **35 articles científicos extraídos** em `lib/rag/articles/*.ts` (verbatim quotes + page numbers + locators)
2. **Schema tipado** em `lib/rag/types.ts` (`ArticleExtraction`, `Threshold`, `Formula`, `KeyClaim`, `BenchmarkEntry`)
3. **Agregador funcional** em `lib/rag/index.ts` com funções `getAllClaims()`, `getCRThresholds()`, `getBOCRFormulas()`, `getAllArticles()`, etc.
4. **Fachada inteligente** em `app/api/ai-reviewer/knowledge.ts` (v7.0, 326 linhas) que consome o agregador e expõe ao route.ts via `getKnowledgeContext()`, `getRefsByTopic()`, `getRAGThresholds()`, etc.
5. **Validação pós-LLM** em `app/api/ai-reviewer/route.ts` (`validateReviewOutput`, **7 categorias** de checks regex após Fase 6.3.0a — categoria 7 é o citation validator do D2)
6. **Detecção de viés** em `app/api/ai-reviewer/bias-detection.ts` (independente, baseada em Dodevska 2023)
7. **(NOVO em 6.3.1)** Wrappers `lib/rag/embed.ts` (Voyage-3, 1024 dims, lazy singleton) e `lib/rag/upstash-client.ts` (Upstash Vector, COSINE, lazy singleton) prontos para uso pela Fase 6.3.2
8. **(NOVO em 6.3.0a-D2)** `lib/rag/citation-whitelist.ts` (320 linhas) — validator pós-LLM que extrai todas as citações `Autor (ano)` do Parecer e flagga as fora da whitelist canônica derivada dos 35 articles

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

**Status pós-6.3.1:** wrapper `lib/rag/upstash-client.ts` validado (self-similarity 1.0000, latência query 178ms).

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

**Status pós-6.3.1:** wrapper `lib/rag/embed.ts` validado (dimensão 1024, norma L2 1.0000, latência single embed 587ms).

**Alternativas descartadas:**
- *OpenAI text-embedding-3-small:* qualidade ligeiramente inferior, custo similar
- *Cohere embed-v3:* boa opção mas Voyage tem precisão marginal melhor em domínios técnicos
- *Anthropic embeddings:* não existe API oficial até a data desta sessão

### 2.3 LLM (gerador do Parecer IA) — REVISTO em v3

**Decisão:** **Claude Opus 4.6** com adaptive thinking, sem `temperature`

| Atributo | Valor anterior (Sonnet 4.5) | Valor pós-Fase 6.3.0a (Opus 4.6) |
|---|---|---|
| Modelo | `claude-sonnet-4-5-20250929` | `claude-opus-4-6` |
| Max tokens | 12.000 | 16.000 (folga para Pareceres mais longos com raciocínio adaptativo) |
| Temperature | `0.4` | **omitido** — incompatível com `thinking: adaptive` (API rejeita ≠ 1) |
| Top_p / Top_k | (não setados) | (não setados — manter) |
| Thinking | (ausente) | `{ type: 'adaptive' }` (raciocínio estruturado, profundidade ajustada à complexidade) |
| Effort parameter | (n/a) | (default — não setado nesta fase; revisar pós-Fase 6.3.4 se necessário) |
| Display thinking | (n/a) | `summarized` (default no 4.6 — não precisa setar explicitamente) |
| Custo estimado por Parecer | ~$0.03–0.05 | ~$0.10–0.20 (input + output + thinking tokens) |

**Nota sobre temperature:** o commit `e8ab51b` inicial manteve `temperature: 0.4` baseado na premissa de que Opus 4.6 aceitava o parâmetro. O backend Anthropic retornou HTTP 400 em runtime: *"temperature may only be set to 1 when thinking is enabled or in adaptive mode."* O hotfix `18082fe` removeu o parâmetro. SDK aceita em tipos mas runtime rejeita.

**Justificativa da escolha entre as 3 opções:**

| Opção avaliada | Decisão | Razão |
|---|---|---|
| Sonnet 4.5 (manter) | ❌ Rejeitado | Não cumpre RAG_DECISIONS §2.3 (LLM superior para reduzir alucinação); ganho qualitativo do 4.6 sobre 4.5 é real |
| **Opus 4.6 (adotado)** | ✅ Aceito | Sweet spot: qualidade superior + sintaxe da API próxima da anterior (só temperature foi obstáculo) + sem breaking changes pré-defesa |
| Opus 4.7 | ❌ Rejeitado | Breaking changes (temperature/top_p/top_k removidos, prompts mais literais) inviáveis em janela de defesa |

**Validação anti-regressão executada:** 1 Parecer real Opus 4.6 gerado em 8/mai/2026 sobre o estudo Hyundai paint shop (gás natural 5.9M m³/ano, 12 especialistas, A1 vs A2). Qualidade textual e estrutural mantidas vs baseline Sonnet 4.5; raciocínio adaptativo melhorou aderência a referências do RAG.

### 2.4 Output do LLM

**Decisão:** **Anthropic Tool Use** com schema JSON estruturado (Fase 6.3.4)

**Antes (atual em Sonnet 4.5 e Opus 4.6 pós-6.3.0a):** LLM retorna texto livre. Validação é regex pós-geração (`validateReviewOutput`, 7 categorias após D2).

**Depois (Fase 6.3.4):** LLM retorna via Tool Use com schema definido tipo:

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
       ├──→ Semântico (NOVO — Fase 6.3.3)
       │       ├─ embed(query) via Voyage-3 (✅ pronto pós-6.3.1)
       │       ├─ Upstash Vector query top-K=5 (✅ pronto pós-6.3.1)
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

**Total estimado: ~400-450 chunks** (revisar após ingestão real na Fase 6.3.2).

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

Tipos `ChunkMetadata` e `RetrievedChunk` já implementados em `lib/rag/upstash-client.ts` (Fase 6.3.1).

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

## 4. PLANO DE FASES

| Fase | Entregável | Tempo | Risco | Reversível | Status |
|---|---|---|---|---|---|
| **6.3.0** | `RAG_DECISIONS.md` v2 + contas Upstash/Voyage + env vars | 1-2h | Baixo | Sim | ✅ Concluído |
| **6.3.0a** | Upgrade LLM Sonnet 4.5 → Opus 4.6 + adaptive thinking + PVB hardening (D1 prompt sync + D2 validator + D2.1 fixes) | 6-8h | Médio | Sim (`git revert`) | ✅ Concluído |
| **6.3.1** | `lib/rag/embed.ts` + `lib/rag/upstash-client.ts` + tests isolados | 2-3h | Baixo | Sim | ✅ Concluído (commit `655255f`) |
| **6.3.2** | `scripts/ingest-rag.ts` consumindo `getAllClaims()` + `getAllFormulas()` + `getAllThresholds()` → embed → upload | 3-4h | Médio | Sim (limpa índice + refaz) | ⏸ Próxima |
| **6.3.3** | `lib/rag/semantic-retrieve.ts` + `getRAGSemantic(query, k)` na fachada `app/api/ai-reviewer/knowledge.ts` | 3-4h | Médio | Sim | ⏸ Pendente |
| **6.3.4** | Modificar `app/api/ai-reviewer/route.ts`: adicionar Tool Use schema + injetar `getRAGSemantic()` no prompt + estender validateReviewOutput | 4-6h | **Alto** | Cuidado | ⏸ Pendente |

**Total restante: 10-14h focado.** Realista com debugging: 13-18h.

### 4.1 Estado da Fase 6.3.0 (CONCLUÍDA)

✅ `RAG_DECISIONS.md` v2 produzido (07/mai)
✅ Conta Upstash criada (index `ahp-bocr-rag`, us-east-1, 1024 dims, COSINE, free tier)
✅ Conta Voyage AI criada
✅ 3 env vars no `.env.local` local: `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`, `VOYAGE_API_KEY`
✅ Mesmas 3 vars no Vercel Production + Preview (Sensitive)
⚠️ Development env não tem as vars (limitação Vercel: Sensitive vars não vão para Development) — `.env.local` local cobre dev local

### 4.2 Estado da Fase 6.3.0a (CONCLUÍDA — defesa em profundidade)

A Fase 6.3.0a foi prescrita inicialmente como apenas o upgrade LLM. Durante a execução, expandiu-se para incluir hardening PVB em duas camadas após auditoria humana detectar 4 anomalias reais de citação no primeiro Parecer Opus 4.6 (todas decorrentes de dessincronia entre a whitelist no `SYSTEM_PROMPT` e os 35 articles do RAG).

**Sequência completa:** 4 commits em `app/api/ai-reviewer/route.ts` + 1 commit criando `lib/rag/citation-whitelist.ts` + 1 commit de hotfix dos bugs do validator + 1 commit de docs.

#### 4.2.1 Upgrade LLM (commits `e8ab51b` + `18082fe`)

`feat(ai-reviewer): upgrade LLM Sonnet 4.5 → Opus 4.6 + adaptive thinking`

```diff
- model: 'claude-sonnet-4-5-20250929'
+ model: 'claude-opus-4-6'
- max_tokens: 12000
+ max_tokens: 16000
+ thinking: { type: 'adaptive' }
- temperature: 0.4
```

SDK upgrade `@anthropic-ai/sdk@0.71.2 → 0.95.1`. O `temperature: 0.4` foi inicialmente mantido em `e8ab51b` e removido em hotfix `18082fe` após HTTP 400 do backend Anthropic.

#### 4.2.2 D1 — sincronização da whitelist com o RAG (commit `16b98a8`)

`fix(ai-reviewer): synchronize SYSTEM_PROMPT whitelist with RAG (PVB Phase 6.3.0a)`

Auditoria humana do Parecer Opus 4.6 inicial detectou 4 anomalias críticas:
1. Saaty (1980) sozinho — paper não está no RAG
2. Saaty (2012) sem Vargas — paper coautorado, atribuição incompleta
3. Feldman et al. (2015) — paper não está no RAG (regra dos 80% atribuída erradamente)
4. Saaty (2003) ambíguo — para BOCR deveria ser Saaty & Ozdemir (2003)

Causa-raiz: a whitelist de fontes autorizadas no `SYSTEM_PROMPT` (L575-600) listava 4 papers que **não estão em `lib/rag/articles/`** e omitia ~10 papers que **estão**. O LLM seguia o prompt corretamente — o prompt é que estava desalinhado com a realidade do RAG.

Mudanças no `SYSTEM_PROMPT` (28 linhas líquidas adicionadas):
- Whitelist L575-600 reescrita, agrupada por categorias (Fundamentos AHP, Síntese BOCR, Agregação/Consistência/IPC, Aplicações, Fairness/Viés)
- Removidos: Saaty (1980), Saaty & Vargas (2007), Feldman et al. (2015), Crawford & Williams (1985)
- Adicionados: Aull-Hyde et al. (2006), Kabak (2014), Mu (2016), Ossadnik et al. (2016), Saaty (1987), Saaty & Vargas (2012), Saaty & Vargas (1984), Saaty & Ozdemir (2003), Salomon (2024), Tavana et al. (2023), Xu (2000)
- Novo bloco "REGRAS DE ATRIBUIÇÃO DESAMBIGUADAS" (5 regras): Saaty (2003) sozinho = Eigenvector; para BOCR usar Saaty & Ozdemir (2003); Saaty (2012) sempre com Vargas; Saaty (1980) e Feldman (2015) proibidos
- L605 removida: limiares CR ajustados (≤0.05 para n=3, ≤0.08 para n=4) sem suporte no RAG. Saaty (1977) cobre apenas CR ≤ 0.10 geral; os limiares ajustados vinham de Saaty (1980) que não está no RAG.
- L606 reatribuída: regra dos 80% via Dodevska et al. (2023, Eq. 10), não Feldman
- AFIRMAÇÕES PROIBIDAS expandidas com 4 novos bullets

**Validação humana pós-D1:** 1 Parecer real reprocessado. **4/4 anomalias críticas eliminadas.**

#### 4.2.3 D2 — citation validator pós-LLM (commit `b0e41d1`)

`feat(ai-reviewer): add citation whitelist validator (PVB Phase 6.3.0a — D2)`

Defesa em profundidade: além da whitelist no prompt (D1), agora `validateReviewOutput` verifica TODAS as citações do Parecer contra whitelist canônica derivada dos 35 articles.

Novo módulo `lib/rag/citation-whitelist.ts` (307 linhas iniciais → 320 após D2.1):
- `getCanonicalWhitelist()`: constrói lista em runtime via `getAllArticles()` + parsing de `bibtex.author={...}`
- Cache singleton (uma construção por processo)
- Limpeza de escapes LaTeX (`\"u`, `\'c`, `\v{s}`)
- Normalização sem acentos para matching robusto
- Regex de extração captura: `Saaty (1977)`, `Saaty & Vargas (2012)`, `Saaty et al. (2023)`, `Saaty, 1977` (com vírgula)

Validações implementadas em 3 camadas:

**Camada 1 — Citação fora da whitelist** (severidade: `issue`)
- Autor + ano não consta nos 35 articles → `CITACAO_FORA_WHITELIST`
- Reporta anos disponíveis quando autor existe mas ano divergente

**Camada 2a — Atribuição incompleta** (severidade: `warning`)
- Paper coautorado citado sem `&` ou `et al.` → `CITACAO_INCOMPLETA`
- Ex: `Saaty (2012)` quando paper é Saaty & Vargas (2012)

**Camada 2b — Atribuição contextualmente subótima** (severidade: `warning`)
- `Saaty (2003)` próximo de "BOCR/hierarquia de controle/aditivo/multiplicativo" → `ATRIBUICAO_SUBOTIMA` sugerindo Saaty & Ozdemir (2003)
- `Saaty (1987)` próximo de "unicidade/prova/única função" → `ATRIBUICAO_SUBOTIMA` indicando que prova é Aczél & Saaty (1983), fora do RAG

Integração em `route.ts`:
- Import `@/lib/rag/citation-whitelist` na linha 11
- Categoria 7 em `validateReviewOutput`, antes do `return` final (5 linhas)

**Validação humana pós-D2:** 1 Parecer real. Validator detectou 4 issues + 6 warnings, dos quais 7 verdadeiros positivos genuínos e 3 falsos positivos por bugs do código.

#### 4.2.4 D2.1 — hotfix dos 3 bugs do validator (commit `1dd9f93`)

`fix(rag): correct 3 bugs in citation validator (PVB Phase 6.3.0a — D2.1)`

Bugs corrigidos em `lib/rag/citation-whitelist.ts`:

| Bug | Causa | Fix |
|---|---|---|
| `Neely et al. (2020)` flaggado como fora do RAG | bibtex `Neely Jr, Brett H` — `extractSurname` retornava `"Neely Jr"` em vez de `"Neely"` | Strip de sufixos `Jr/Sr/II/III/IV/Filho/Neto` após split |
| `Hyde et al. (2006)` flaggado como fora do RAG | regex capturava `Hyde` a partir do meio de `Aull-Hyde` porque lookbehind `(?<![A-Za-zÀ-ú])` aceita hífen | Lookbehind agora `(?<![A-Za-zÀ-ú\-'])` (exclui também `-` e `'`) |
| `Saaty (2003)` disparava CITACAO_INCOMPLETA mesmo sendo válido | 2 papers no RAG: `saaty2003_eigenvector` (single-author) + `saatyOzdemir2003_negative` (coautorado). Validator iterava nos 2 e disparava warning | Lógica passou a usar `every(a => isCoauthored \|\| isMultiAuthor)` — só dispara se TODOS os matches forem multi-autor |

`+22/-9` linhas. Tamanho final 320 linhas.

#### 4.2.5 Resultado consolidado pós-Fase 6.3.0a

**Parecer real pós-D2.1 (8/mai/2026 19h):**
- 0 issues `CITACAO_FORA_WHITELIST` ← (vs 4 antes)
- 5-6 warnings legítimos (Salomon, Lee, Kabak, Escobar incompletos + Saaty 2003 BOCR subótima)
- 3 falsos positivos eliminados: Neely, Hyde, Saaty 2003 incomplete duplicado
- LLM internalizou diretrizes do D1: parou de citar Coughlan & Coghlan e Thiollent espontaneamente (papers fora do RAG que foram flaggados em D2)

**Métricas da Fase 6.3.0a:**
- 6 commits sequenciais no main
- ~440 linhas adicionadas no total (`route.ts`: +118, `citation-whitelist.ts`: +320, docs)
- 0 reverts necessários
- 4/4 anomalias críticas iniciais eliminadas
- Defesa em profundidade: prompt (D1) + validator (D2/D2.1)

**Débitos pós-defesa relacionados:**
- D3: adicionar `lib/rag/articles/saaty1980_ahp.ts` para restaurar L605 do prompt
- D1.2: refinar prompt L600 para evitar "literatura de pesquisa-ação" induzir citação de autores fora do RAG (Coughlan, Thiollent)
- Adicionar testes unitários para `citation-whitelist.ts` (vitest)

### 4.3 Estado da Fase 6.3.1 (CONCLUÍDA — commit `655255f`)

✅ `lib/rag/embed.ts` (Voyage-3 wrapper, lazy singleton, 76 linhas)
✅ `lib/rag/upstash-client.ts` (Upstash wrapper, lazy singleton, 133 linhas, tipos `ChunkMetadata` e `RetrievedChunk` exportados)
✅ `scripts/test-rag-embed.ts` (50 linhas, valida dimensão 1024 + norma L2)
✅ `scripts/test-rag-upstash.ts` (115 linhas, valida self-similarity round-trip + cleanup)
✅ Deps: `voyageai@0.2.1`, `@upstash/vector@1.2.3`, `tsx`, `dotenv`
✅ Validação executável: V3 embed PASS (587ms, norma 1.0000), V4 upstash PASS (query 178ms, score 1.0000)

### 4.4 Próxima sessão: Fase 6.3.2

Foco: criar `scripts/ingest-rag.ts` que:

```
lib/rag/index.ts (existente)
  ├─ getAllClaims()        → ~129 claims
  ├─ getAllFormulas()      → ~119 formulas
  ├─ getAllThresholds()    → ~30-50
  ├─ getAllTablesFigures() → ~50-70 (a confirmar)
  └─ getAllRecommendations() → ~70

scripts/ingest-rag.ts (NOVO)
  ├─ formatTextForEmbedding(chunk) por tipo (RAG_DECISIONS §3.2)
  ├─ batch embed via embed() de embed.ts (loop com retry)
  ├─ upsertChunk via upstash-client.ts
  └─ summary final: total chunks, latência média, erros
```

Validação Fase 6.3.2:
- 35 articles ingeridos sem erro
- ~400 chunks no index `ahp-bocr-rag`
- Sample query manual ("consistency ratio Saaty") retorna chunks relevantes top-5

---

## 5. CRITÉRIOS DE PRONTO (PARA TODA A FASE 6.3)

| # | Critério | Aceitável | Não-aceitável | Status |
|---|---|---|---|---|
| 1 | Articles indexados no Upstash | 35 papers, ~400 chunks | <30 papers ou <300 chunks | Pendente Fase 6.3.2 |
| 2 | Latência `getRAGSemantic` p95 | <500ms top-3 | ≥1s | Validado em 6.3.1 (178ms top-1) |
| 3 | Anti-regressão LLM (Sonnet 4.5 vs Opus 4.6) | 1 Parecer real Opus 4.6 com qualidade ≥ Sonnet 4.5 | Regressão visível | ✅ Validado em 6.3.0a (Parecer 8/mai) |
| 4 | Anti-regressão RAG (com vs sem vetorial) | 3 Pareceres iguais ou melhores antes/depois | qualquer regressão | Pendente Fase 6.3.4 |
| 5 | Pareceres novos citam chunks vetoriais | ≥2 chunks únicos vs keyword | 0 | Pendente Fase 6.3.4 |
| 6 | Failover Upstash off | Keyword-based funciona | Crash | Pendente Fase 6.3.3 |
| 7 | Custo estimado por Parecer | <$0.30 com Opus 4.6 | >$0.50 | Pendente medição em produção |
| 8 | TypeScript + build PASS | Sem warnings novos | Qualquer erro | ✅ Validado em 6.3.0a, 6.3.1 |
| 9 | Documentação metodológica | Suficiente Cap 3/4 dissertação | Incompleta | Em construção |
| 10 | Audit manual citações | 0 falsas em 5 Pareceres | ≥1 falsa | Parcial pós-D2.1 (1 Parecer auditado, 0 issues; faltam 4) |
| 11 | Tool Use schema validado | 100% Pareceres conformes | <100% | Pendente Fase 6.3.4 |
| 12 | Free tier não estourado | <50% uso de quota Upstash/Voyage | >80% | Monitorar contínuo |
| 13 | PVB validator detecta atribuições incompletas | ≥4 de 5 verdadeiros positivos em 1 Parecer | <50% precisão | ✅ Validado pós-D2.1 (5 verdadeiros positivos detectados, 0 falsos positivos) |

---

## 6. PRINCÍPIOS NÃO-NEGOCIÁVEIS

1. **Aditivo, nunca substitutivo.** RAG vetorial COMPLEMENTA keyword-based existente. Failover automático.

2. **Zero alucinação tolerada em produção.** Tool Use força `verbatim_quote` por afirmação. Citation verifier (Fase 6.3.5 caso necessário) compara contra chunks recuperados. Validator pós-LLM (D2/D2.1) já cobre Camada 1 hoje.

3. **Toda citação rastreável.** Cada afirmação no Parecer IA tem `article_id` + `page` + `locator_id` + `verbatim_quote`. Não há "Saaty (1980)" sem suporte concreto.

4. **PVB-compliant.** Citações no código que NÃO existem nos 35 articles do RAG são **proibidas**. Validator do D2 garante isso programaticamente; whitelist do prompt (D1) reduz probabilidade do LLM tentar.

5. **Sem regressão de qualidade.** Se Pareceres com vetorial forem PIORES que sem vetorial em qualquer dimensão, rollback imediato. Mesmo princípio aplicado ao upgrade de LLM (Fase 6.3.0a — validado positivo).

6. **Custo controlado.** Free tier do Upstash + Voyage. Opus 4.6 só para Pareceres (não para reviewer interno, não para tasks de baixa importância).

7. **Verify before document.** Mudanças metodológicas só vão para o documento oficial **depois** de validação humana real (1 Parecer ou 1 query manual). Primeiro o código, depois a doc.

8. **Defesa em profundidade.** Camadas independentes (prompt + validator) reduzem chance de bug em uma derrubar a invariante. Aplicado em D1 + D2.

---

## 7. RISCOS IDENTIFICADOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação | Status |
|---|---|---|---|---|
| Embeddings de baixa qualidade | Baixa | Alto | Voyage-3 é estado-da-arte; testar com 5 queries conhecidas antes de prosseguir Fase 6.3.3 | Pendente Fase 6.3.3 |
| Custo Opus 4.6 acima de orçamento | Baixa | Médio | Limit configurável; fallback para Sonnet 4.5 via `git revert` 6.3.0a se observado | Monitorar contínuo |
| Regressão de qualidade Opus 4.6 vs Sonnet 4.5 | Média | Alto | Validação manual obrigatória ANTES de commitar v3 | ✅ Mitigado (Parecer 8/mai aprovado) |
| Adaptive thinking aumenta latência inaceitavelmente | Média | Baixo | Default não tem `effort` setado; latência típica adaptive é 5-15s para Pareceres densos | Aceitável em prod |
| Tool Use schema não validar | Média | Alto | Anthropic SDK já suporta — testar isoladamente em 6.3.4 antes de integrar | Pendente Fase 6.3.4 |
| Latência Upstash ruim em produção | Baixa | Médio | us-east-1 + Vercel us-east-1 = co-localizado. Validado em 6.3.1 (178ms). Se >500ms p95, investigar | Validado em 6.3.1 |
| Free tier estourar antes da defesa | Baixa | Baixo | 200k queries/mês = 6.6k/dia — defesa não usa nem 1% disso | Monitorar contínuo |
| `vercel env pull` sobrescrever `.env.local` | Média | Alto | Backup do `.env.local` antes de qualquer pull | Procedimental |
| Antigravity inferir caminho/sintaxe errada | Média | Alto | CADAR obrigatório: ler arquivo + `.d.ts` antes de prescrever, marcar inferências, Decision Gate explícito | Procedimental |
| Falsos positivos do citation validator confundirem revisor humano | Média | Médio | D2.1 corrigiu 3 bugs conhecidos. Auditar próximos Pareceres para detectar mais | ✅ Mitigado parcialmente |
| LLM continuar citando autores fora do RAG sob "literatura de [área]" | Média | Médio | D1.2 (refinamento de L600 do prompt) — débito pós-defesa | ⏸ Aceito como débito |

---

## 8. DECISÕES ABERTAS (revisitar antes de Fase 6.3.4)

| Decisão | Quando decidir | Critério |
|---|---|---|
| Citation verifier baseado em `verbatim_quote` obrigatório? | Antes de Fase 6.3.4 | Auditar 3 Pareceres reais; se ≥1 alucinação em 100 citações, obrigatório |
| Top-K ideal | Durante Fase 6.3.3 | A/B test com K=3, 5, 10; escolher menor que mantém qualidade |
| `effort` parameter (Opus 4.6) | Pós-Fase 6.3.4 | Se latência adaptive default for OK e qualidade for satisfatória, manter sem effort. Se Pareceres ficarem rasos, setar `effort: 'high'` |
| Reranker (Cohere/Voyage rerank) | Pós-Fase 6.3.4 | Se top-K=5 já dá precisão >90%, não precisa |
| Cache de embeddings | Pós-Fase 6.3.4 | Se queries repetidas explodem custo, cachear no Upstash KV |
| Adicionar mais regras à `SUBOPTIMAL_RULES` do citation validator | Conforme novos casos surjam | Ex: `Saaty (1990)` para unicidade de média geométrica (similar ao caso Saaty 1987) |

---

## 9. COMPROMISSOS

### De Pedro
- Não autorizar mudança de stack sem revisar este documento
- Auditar próximos Pareceres reais (4 restantes para fechar critério §5.10)
- Backup do `.env.local` antes de qualquer `vercel env pull`

### De Claude
- Não desviar das decisões da §2 sem perguntar
- Antes de cada fase: ler arquivos relevantes, marcar inferências como tal
- Toda alteração via prompt Antigravity com Fase 1 (diagnóstico) + Fase 2 (alteração) + V (validação)
- Anti-regressão obrigatória em mudanças que tocam `route.ts` ou `citation-whitelist.ts`

### Do método CADAR
- Compreender → Diferença → Plano → Implementar → Checar → Corrigir → Verificar laterais
- Aplicar em cada fase

---

## 10. APÊNDICE — COMANDOS DE VALIDAÇÃO RÁPIDA

### 10.1 Bash/zsh (macOS, Linux)

```bash
# Validar env vars locais (mostra apenas nomes das chaves, sem valores)
grep -E '^(UPSTASH|VOYAGE|ANTHROPIC)' .env.local | cut -d= -f1
# Esperado:
# ANTHROPIC_API_KEY
# UPSTASH_VECTOR_REST_URL
# UPSTASH_VECTOR_REST_TOKEN
# VOYAGE_API_KEY
```

```bash
# Validar que o LLM em uso é Opus 4.6
grep -nE 'claude-opus-4-6|claude-sonnet-4-5' app/api/ai-reviewer/route.ts
# Esperado: apenas linhas com 'claude-opus-4-6'
```

```bash
# Ver estado dos articles no RAG
ls lib/rag/articles/*.ts | wc -l
# Esperado: 36 (35 articles + _template.ts)
```

```bash
# Validar Fase 6.3.1 (wrappers)
for f in lib/rag/embed.ts lib/rag/upstash-client.ts \
         scripts/test-rag-embed.ts scripts/test-rag-upstash.ts; do
  test -f "$f" && echo "OK $f" || echo "MISSING $f"
done
# Esperado: 4x OK
```

```bash
# Validar Fase 6.3.0a-D2 (citation validator)
test -f lib/rag/citation-whitelist.ts && \
  echo "OK $(wc -l < lib/rag/citation-whitelist.ts) linhas" || \
  echo "MISSING lib/rag/citation-whitelist.ts"
# Esperado: OK 320 linhas (após D2.1)
```

```bash
# Smoke test pós-6.3.0a (LLM): rodar test-rag-embed para confirmar 6.3.1 não regrediu
npx tsx scripts/test-rag-embed.ts
# Esperado: PASS
```

```bash
# Listar HEAD recente da Phase 6.3.0a
git log --oneline 9f03490..HEAD | head -10
# Esperado: 6+ commits incluindo e8ab51b, 18082fe, 16b98a8, b0e41d1, 1dd9f93, 6b07af0
```

### 10.2 PowerShell (Windows)

```powershell
# Validar env vars locais (não mostra valores)
[System.IO.File]::ReadAllText("C:\AHP-BOCR\ahp-simple\.env.local") `
  -split "`r?`n" `
  | Where-Object { $_ -match "^(UPSTASH|VOYAGE|ANTHROPIC)" } `
  | ForEach-Object { ($_ -split '=', 2)[0] }
```

```powershell
# Validar que o LLM em uso é Opus 4.6
Select-String -Path .\app\api\ai-reviewer\route.ts -Pattern "claude-opus-4-6|claude-sonnet-4-5" -Encoding utf8 |
  Format-Table LineNumber, Line -AutoSize -Wrap
```

```powershell
# Ver estado dos articles no RAG
Get-ChildItem lib\rag\articles\ -Filter *.ts | Measure-Object | Select-Object Count
# Esperado: 36
```

```powershell
# Validar Fase 6.3.1 (wrappers)
Test-Path .\lib\rag\embed.ts
Test-Path .\lib\rag\upstash-client.ts
Test-Path .\scripts\test-rag-embed.ts
Test-Path .\scripts\test-rag-upstash.ts
# Esperado: True para todos
```

```powershell
# Validar Fase 6.3.0a-D2 (citation validator)
Test-Path .\lib\rag\citation-whitelist.ts
(Get-Content .\lib\rag\citation-whitelist.ts -Encoding utf8).Count
# Esperado: True; 320 linhas
```

---

*FIM do RAG_DECISIONS v3 — stack revisada com Opus 4.6 + hardening PVB em duas camadas (D1 prompt + D2/D2.1 validator)*
