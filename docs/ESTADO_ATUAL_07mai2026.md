# ESTADO_ATUAL.md v1.1 (CORRETIVO)
## Diagnóstico do Sistema AHP-BOCR para Fase 6.3 (RAG vetorial)

> **Versão:** 1.1 — corrige 5 erros materiais da v1.0
> **Data:** 07/mai/2026 (mesma sessão da v1.0, após Antigravity F1.3 FAIL)
> **Substitui:** `docs/ESTADO_ATUAL_07mai2026.md` v1.0
> **Baseline git:** Commit 3.1 SHA `88bf5c1`

---

## 0. ERRATA — O QUE A v1.0 ERROU

A v1.0 deste documento (committada hoje em `docs/ESTADO_ATUAL_07mai2026.md`) foi escrita com **inferência sem evidência completa**. Antigravity tentou executar Commit 6.2a baseado nessa inferência e parou em F1.3 (FAIL): o arquivo `app/api/ai-reviewer/knowledge.ts` tinha 326 linhas, não 1126.

Investigação posterior revelou **3 arquivos `knowledge.ts` distintos** no projeto:

| Caminho | Linhas | Versão | Status real |
|---|---|---|---|
| `\knowledge.ts` (raiz) | 950 | v2.0 ("5 papers") | **LIXO**, sem uso, descartável |
| `\app\api\ai-reviewer\knowledge.ts` | 326 | v7.0 ("dinâmico via @/lib/rag") | **EM USO**, fachada |
| `\lib\knowledge.ts` | 1125 | v3.0 ("7 papers Q1/A1") | **LEGADO MORTO**, sem uso |

Validação: `Select-String "from.*knowledge"` em todas as rotas API mostrou apenas 2 imports, ambos para `./knowledge` (a fachada v7.0).

Este v1.1 corrige os 5 erros materiais da v1.0:

| # | v1.0 (errado) | v1.1 (correto) |
|---|---|---|
| 1 | "RAG está órfão" | RAG dinâmica funcional via fachada v7.0; 35 articles JÁ chegam ao Parecer IA |
| 2 | "BOCR_KNOWLEDGE_BASE em app/api/ai-reviewer/knowledge.ts" | Está em `lib/knowledge.ts` LEGADO, sem importadores |
| 3 | "Knowledge curado de 7 papers no consumer" | v7.0 é dinâmico (35 articles); v3.0 curado de 7 papers está morto |
| 4 | "Fase 6.3 = 26-38h, 8 fases" | Fase 6.3 = 13-19h, 5 fases (RAG dinâmica já existe, falta só vetorial) |
| 5 | "Débito 6.2a prioritário" | **6.2a CANCELADO** — alvos em arquivo morto |

---

## 1. TOPOLOGIA REAL CONFIRMADA

### 1.1 Cadeia funcional do Parecer IA (HOJE)

```
[Frontend] → POST /api/ai-reviewer
                │
                ▼
app/api/ai-reviewer/route.ts (1850 linhas, v7.2.0)
        │ L8: import { getKnowledgeContext, getRAGThresholds,
        │             getRAGFormulas, getRAGBenchmarks, ... } from './knowledge'
        ▼
app/api/ai-reviewer/knowledge.ts (326 linhas, v7.0) ← FACHADA INTELIGENTE
        │ L6-15: import { getAllArticles, getAllClaims,
        │              getThresholdsByMetric, getFormulasByKeyword,
        │              getAllBenchmarks, ... } from '@/lib/rag/index'
        ▼
lib/rag/index.ts (220 linhas) ← AGREGADOR
        │ imports nominais dos 35 articles
        ▼
lib/rag/articles/*.ts (35 arquivos) ← FONTE DOS DADOS
   (verbatim + page + locator extraídos dos PDFs)
```

### 1.2 Arquivos legados (não usados pelo Parecer IA)

```
\knowledge.ts (raiz, 950 linhas, v2.0 "5 papers")           ← LIXO
\lib\knowledge.ts (1125 linhas, v3.0 "7 papers")             ← MORTO
\app\api\ai-reviewer\route-v641-compatible.ts                ← já registrado morto (mem #15)
```

**Implicação:** o ai-reviewer **JÁ USA** os 35 articles de `lib/rag/articles/` há tempos, via fachada v7.0. A v1.0 deste documento errou ao chamar isso de "órfão".

---

## 2. O QUE A FACHADA v7.0 FAZ HOJE

### 2.1 Funções exportadas (todas usadas pelo route.ts)

| Função | Tipo | O que retorna |
|---|---|---|
| `getKnowledgeContext()` | string | Top 60 claims dos 35 papers, ordenados por peso, formatados como `[REFERÊNCIA ACADÊMICA] Autor (Ano) - Contexto - Tópico - Regra` |
| `getRefsByTopic(topic)` | ReferenceDoc[] | Filtro por palavra-chave + alias (ex: 'consistência' → ['cr', 'ratio', 'inconsistency']) |
| `getRefsByContext(ctx)` | ReferenceDoc[] | Filtro por domínio (ex: 'energia') |
| `getRefsByAuthor(author)` | ReferenceDoc[] | Filtro por autor |
| `getCriticalRefs()` | ReferenceDoc[] | Refs com weight >= 3 |
| `getRAGThresholds(metric)` | string | Limiares formatados: valor, unit, contexto, fonte, quote |
| `getRAGFormulas(keyword)` | string | Fórmulas LaTeX + variáveis + condições + fonte |
| `getRAGBenchmarks()` | string | Tabela markdown com bocr_weights de até 10 estudos |
| `getKnowledgeStats()` | object | Métricas (totalRefs, uniqueArticles, etc.) |
| `validateKnowledgeBase()` | object | Validação de integridade |

### 2.2 Mecanismo de retrieval atual

A fachada v7.0 implementa **retrieval por palavra-chave + alias**, não vetorial. Ex.:

```typescript
// Quando o route.ts chama:
getRefsByTopic('consistência')

// A fachada expande via TOPIC_ALIASES:
['consistência', 'consistency', 'cr', 'ratio', 'inconsistency', 'transitivity']

// Filtra os 35 papers cujos claim/rule/context contêm qualquer um desses termos
// Retorna ReferenceDoc[] com citation, topic, rule, context, weight
```

**Isso já é "RAG" no sentido funcional** — Retrieval-Augmented Generation com retrieval keyword-based.

### 2.3 Anti-alucinação atual (3 camadas)

1. **No prompt (route.ts L1486-1509):** diretrizes + lista AFIRMAÇÕES PROIBIDAS
2. **Pós-LLM (route.ts L1551-1660 `validateReviewOutput`):** 6 categorias de checks regex
3. **Dados injetados verbatim:** fórmulas com `latex`, claims com `verbatim_quote`, locators com `page` — tudo direto dos PDFs

---

## 3. O QUE A FASE 6.3 REALMENTE PRECISA

### 3.1 Gap real (vs gap aparente da v1.0)

A v1.0 dizia "construir RAG do zero". **Errado.**

O gap real é apenas **substituir/complementar o retrieval keyword-based por retrieval semântico (embeddings)**:

```
Hoje:    query "como avaliar consistência" → expand aliases → grep nos 35 papers
Futuro:  query "como avaliar consistência" → embed → busca top-K por similaridade cosseno
```

### 3.2 Por que isso importa

Retrieval keyword-based pega papers cujo TEXTO LITERAL contém a palavra. Retrieval semântico pega papers cujo SIGNIFICADO casa, mesmo com palavras diferentes.

Ex.: query sobre "qualidade dos julgamentos" hoje pode não pegar o paper Saaty 1977 mesmo que ele defina CR — porque o termo "julgamentos" pode não estar no claim. Com embeddings, pega.

### 3.3 Estratégia: aditivo, não substitutivo

A Fase 6.3 **adiciona** uma nova função `getRAGSemantic(query, k)` em paralelo às outras `getRAG*`. O route.ts continua usando keyword-based + adiciona uma chamada para semântico.

**Se Upstash/Voyage caírem, sistema cai para keyword-based existente.** Sem regressão.

---

## 4. PLANO REVISADO — 5 FASES

| Fase | Entregável | Tempo | Reversível |
|---|---|---|---|
| **6.3.0** | `docs/RAG_DECISIONS.md` v2 + abrir contas Upstash + Voyage + adicionar env vars | 1-2h | Sim |
| **6.3.1** | `lib/rag/embed.ts` (Voyage wrapper) + `lib/rag/upstash-client.ts` (Upstash wrapper) | 2-3h | Sim |
| **6.3.2** | `scripts/ingest-rag.ts` que consome `getAllClaims()` + `getAllFormulas()` existentes → embed → upload | 3-4h | Sim (limpa índice e refaz) |
| **6.3.3** | `lib/rag/semantic-retrieve.ts` + nova função `getRAGSemantic(query, k)` na fachada `app/api/ai-reviewer/knowledge.ts` | 3-4h | Sim |
| **6.3.4** | Modificar `route.ts` L856 com 1 nova chamada + testes anti-regressão | 4-6h | Cuidado |

**Total: 13-19h focado.** Com debugging realista: 18-25h.

### 4.1 Arquivos a serem TOCADOS

| Tipo | Arquivo | Linhas |
|---|---|---|
| **CRIAR** | `lib/rag/embed.ts` | ~50 |
| **CRIAR** | `lib/rag/upstash-client.ts` | ~30 |
| **CRIAR** | `lib/rag/semantic-retrieve.ts` | ~80 |
| **CRIAR** | `scripts/ingest-rag.ts` | ~150 |
| **CRIAR** | `docs/RAG_DECISIONS.md` v2 | ~200 |
| **MODIFICAR** | `app/api/ai-reviewer/knowledge.ts` (fachada) | +30 (nova função `getRAGSemantic`) |
| **MODIFICAR** | `app/api/ai-reviewer/route.ts` L139-143 (modelo) | ~10 |
| **MODIFICAR** | `app/api/ai-reviewer/route.ts` L856 (chamada nova) | +5 |
| **MODIFICAR** | `package.json` | +2 deps |

### 4.2 Citation verifier — REAVALIADO

A v1.0 colocava como obrigatório. Após ver a fachada v7.0:

A v7.0 já injeta no prompt:
- `f.latex` (fórmula verbatim)
- `f.variables` (verbatim)
- `f.source_article` (id) + `f.source_year`
- `claim.verbatim_quote` (verbatim do PDF)
- `f.evidence.page` + `f.evidence.locator_id`

**Hipótese:** alucinação de citações pode ser baixa porque o LLM já recebe dados estruturados, não tem que inventar.

**Validação:** auditar 3 Pareceres reais já gerados, contar alucinações de citação. Se >5%, citation verifier vira obrigatório (Fase 6.3.5 nova). Se <2%, vira nice-to-have pós-defesa.

**Decisão:** auditar **antes** da Fase 6.3.0 começar. 1h de trabalho. Define se o escopo da Fase 6.3 é 5 fases ou 6 fases.

### 4.3 Modelo LLM

Memória atual: `claude-sonnet-4-5-20250929`, 12k tokens, temp 0.4.

**Para Fase 6.3:** trocar para Opus 4.7 com extended thinking. Custo ~3-5x maior por Parecer (~$0.15-0.30 vs $0.03-0.05). Justificável academicamente.

**Pode ser feito independente do RAG vetorial** — é só mudar 3 linhas. Pode ser commit separado (`6.3.0a` opcional).

---

## 5. DÉBITOS REORGANIZADOS

| Item | Status | Prioridade |
|---|---|---|
| ~~Commit 6.2a (knowledge.ts L66/L287/L294)~~ | **CANCELADO** — alvos em arquivo legado morto | n/a |
| Deletar `\knowledge.ts` raiz (lixo v2.0) | Novo débito | Baixa, pós-defesa |
| Deletar `lib/knowledge.ts` (legado v3.0) | Novo débito | Baixa, pós-defesa |
| Deletar `route-v641-compatible.ts` | Confirmado lixo | Baixa, pós-defesa |
| 5a.3 — A6+A9 tabela CR 6 matrizes | Mantido | Alta Q1 |
| 5a.4 — A7+M1+M2+M4 polimento Revisão | Mantido | Médio |
| PVB Manuscrito (Saaty 2005/1980 dissertação) | Mantido | Alta, dia inteiro pós-Fase 6.3 |
| Atualizar eslint warning | Mantido | Baixa pós-defesa |

---

## 6. CRITÉRIOS DE "FEITO" (REVISADOS)

Mantidos da v1.0, mas adaptados ao escopo menor:

| # | Critério | Aceitável | Não-aceitável |
|---|---|---|---|
| 1 | 35 articles indexados no Upstash | 35, ~210 chunks | <30 |
| 2 | Latência `getRAGSemantic` | <500ms top-3 | ≥1s |
| 3 | Anti-regressão | 3 Pareceres iguais antes/depois | qualquer regressão |
| 4 | Pareceres novos citam papers via semântico | ≥2 chunks únicos vs keyword | 0 |
| 5 | Failover | Upstash off → keyword-based funciona | crash |
| 6 | Custo por Parecer | <$0.30 com Opus | >$0.50 |
| 7 | TypeScript + build PASS | sem warnings novos | qualquer erro |
| 8 | Documentação metodológica | suficiente Cap 3/4 | incompleta |
| 9 | Audit manual citações | 0 falsas em 5 Pareceres | ≥1 falsa |

---

## 7. PRÓXIMOS PASSOS

### Hoje (07/mai/2026, fim da sessão)
1. ✅ Cancelar prompt 6.2a (não executar)
2. ✅ Commit corretivo: `docs: ESTADO_ATUAL v1.1 — corrige topologia knowledge.ts`
3. ✅ Atualizar memória com correções

### Próxima sessão
1. Auditar 3 Pareceres IA reais para taxa de alucinação (1h)
2. Se taxa alta → adicionar Fase 6.3.5 (citation verifier)
3. Iniciar Fase 6.3.0: criar `RAG_DECISIONS.md` v2 + abrir contas Upstash + Voyage

### Cronograma até dissertação 30/mai
- 7 dias: Fase 6.3 completa (5 fases × 2-4h cada)
- 1 dia: PVB manuscrito
- 1 dia: 5a.3
- 1 dia: 5a.4
- Restante: escrita/revisão dissertação

---

## 8. LIÇÕES METODOLÓGICAS

### Para Claude (futuras sessões)
1. **Inferência sem evidência é a fonte de retrabalho.** Eu vi `import './knowledge'` no L8 e assumi que era o arquivo de 1126 linhas que tu uploadeou. Não confirmei. Antigravity pegou o erro em F1.3.
2. **Múltiplos arquivos com mesmo nome são suspeitos.** Sempre listar TODOS os hits antes de prescrever.
3. **`route.ts → './knowledge'` é caminho relativo.** Sempre confirmar arquivo físico, não apenas o import resolvido mentalmente.

### Para Pedro
1. **CADAR funcionou.** O método pegou erro antes de chegar em produção. Esse é o objetivo.
2. **Tem 3 arquivos legados (`\knowledge.ts`, `lib\knowledge.ts`, `route-v641-compatible.ts`)** acumulados de refatorações. Padrão de "manter versão antiga em vez de deletar". Cleanup pós-defesa é importante para evitar confusão em sessões futuras.

---

*FIM DO ESTADO_ATUAL v1.1 — versão corretiva*
