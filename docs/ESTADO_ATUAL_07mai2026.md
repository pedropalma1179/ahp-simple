# ESTADO_ATUAL.md
## Diagnóstico do Sistema AHP-BOCR para Fase 6.3 (RAG vetorial)

> **Versão:** 1.0 — DEFINITIVA
> **Data:** 07/mai/2026
> **Baseline git:** Commit 3.1 SHA `88bf5c1`
> **Status:** Aprovado como base para Fase 6.3 após validação por Pedro
> **Localização sugerida em git:** `docs/ESTADO_ATUAL_07mai2026.md`

---

## 0. PROPÓSITO DESTE DOCUMENTO

Este documento descreve o estado real do sistema AHP-BOCR em 07/mai/2026, baseado em **leitura direta de arquivos** (não inferência), com lacunas explicitamente marcadas. Serve como:

1. Base para planejamento da Fase 6.3 (RAG vetorial real)
2. Âncora permanente — anexado em todo prompt Antigravity da Fase 6.3
3. Documento de contexto para sessões Claude futuras (zera o "Claude perde conhecimento entre sessões")
4. Material para a dissertação descrever o estado pré-RAG

---

## 1. ARQUIVOS LIDOS (com evidência)

| Arquivo | Linhas | Status | Confiança |
|---|---|---|---|
| `app/api/ai-reviewer/route.ts` | 1850 | Trechos críticos: imports, MODEL_CONFIG, generateReview, validateReviewOutput, GET, POST | Alta |
| `app/api/ai-reviewer/bias-detection.ts` | 660 | Header + interfaces (50 linhas iniciais) | Média (independente do RAG) |
| `app/api/ai-reviewer/knowledge.ts` | 1126 | Trechos: header, BOCR_KNOWLEDGE_BASE, SYNTHESIS_METHODS, BIBLIOGRAFIA, exports | Alta |
| `app/api/generate-academic/route.ts` | 970 | Modificado integralmente no Commit 3.1 | Alta |
| `lib/rag/types.ts` | 225 | Integral | Alta |
| `lib/rag/index.ts` | 220 | Integral | Alta |
| `lib/rag/README.md` | 60 | Integral | Alta |
| `lib/rag/articles/_template.ts` | (existe) | Não lido — assumido | Baixa |
| `lib/rag/articles/lee2009_wind.ts` | 349 | Integral | Alta |
| `lib/rag/articles/saatyOzdemir2003_negative.ts` | 266 | Integral | Alta |
| `lib/rag/articles/aullhyde2006_experiment.ts` | 190 | 30 linhas iniciais | Média |
| `package.json` | ~50 | Integral | Alta |
| `next.config.js` | 6 | Integral | Alta |
| `.env.local` (variáveis, sem valores) | — | Lista de keys obtida | Alta |
| Estrutura de pastas | — | Output de `Get-ChildItem -Recurse` | Alta |
| Lista de articles | — | 36 arquivos confirmados (35 papers + 1 template) | Alta |

**Total lido: ~5.000 linhas reais.**

---

## 2. TOPOLOGIA DO PROJETO

```
ahp-simple/
├─ app/
│  ├─ api/                       (13 rotas)
│  │  ├─ ai-reviewer/            ← Parecer IA (foco da Fase 6.3)
│  │  │  ├─ route.ts             (1850 linhas, v7.2.0)
│  │  │  ├─ knowledge.ts         (1126 linhas, knowledge curado de 7 papers)
│  │  │  └─ bias-detection.ts    (660 linhas, independente)
│  │  ├─ audit-decision/
│  │  ├─ backup/
│  │  ├─ calculate/              ← motor AHP-BOCR
│  │  ├─ export-demographics/
│  │  ├─ generate-academic/      ← Gerador acadêmico (Commit 3.1)
│  │  ├─ generate-article/
│  │  ├─ response-quality/
│  │  ├─ send-invite/            ← Resend (email)
│  │  ├─ simulate/
│  │  ├─ test-claude/
│  │  ├─ validate/
│  │  └─ validate-external/      ← AhpAnpLib (Railway)
│  ├─ avaliacao/
│  │  └─ [projectId]/             ← coleta respondentes (NÃO TOCAR — pode estar ATIVA)
│  ├─ decisor/
│  │  ├─ projetos/
│  │  ├─ resultados/[projectId]/
│  │  │  └─ components/
│  │  │     ├─ ExportReports.tsx
│  │  │     └─ QualityConsistency.tsx
│  │  ├─ simulacao/
│  │  └─ validacao/
│  ├─ especialista/
│  ├─ obrigado/
│  ├─ perfil/                     ← ÚNICO lugar com Firebase
│  └─ test-design/
├─ components/
│  ├─ charts/
│  └─ q1-features/
├─ lib/
│  ├─ __tests__/                  ← infra de teste pronta (jest)
│  ├─ analysis/                   ← dominanceAnalyzer
│  └─ rag/                        ← Aqui vai a infraestrutura vetorial
│     ├─ articles/                (36 arquivos: 35 papers + _template.ts)
│     ├─ index.ts                 (220 linhas, AGREGADOR FUNCIONAL)
│     ├─ types.ts                 (225 linhas, schema ArticleExtraction)
│     └─ README.md                (60 linhas, doc original)
├─ public/
└─ scripts/                       ← pasta para scripts existe
```

---

## 3. STACK ATUAL (PRÉ-FASE 6.3)

### 3.1 Dependências instaladas (`package.json`)

**Já presentes:**
- `@anthropic-ai/sdk` 0.71.2 (recente, Tool Use moderna)
- `@google/generative-ai` 0.24.1 (Gemini — não usado pelo ai-reviewer)
- `@radix-ui/react-dialog`, `framer-motion`, `lucide-react`, `recharts`, `echarts`
- `firebase` 10.0.0 (usado APENAS em `app/perfil/page.tsx`)
- `mathjs`, `simple-statistics`, `xlsx`, `d3`, `ahp-lite` 1.2.1
- Next.js 14, React 18, TypeScript 5
- Jest 30, ts-jest 29.4.6

**A instalar para Fase 6.3:**
- `@upstash/vector` (vector store)
- `voyageai` (embeddings)

### 3.2 Variáveis de ambiente

Confirmadas no `.env.local`:
- `ANTHROPIC_API_KEY` — uso ai-reviewer (revogada e substituída em 07/mai após vazamento em chat)
- `GOOGLE_AI_API_KEY` — não usada pelo ai-reviewer
- `RESEND_KEY` — uso send-invite
- `NEXT_PUBLIC_BASE_URL` — `https://ahp-simple.vercel.app`

**A criar:**
- `VOYAGE_API_KEY`
- `UPSTASH_VECTOR_REST_URL`
- `UPSTASH_VECTOR_REST_TOKEN`

### 3.3 Persistência de dados

**Confirmado:** Firebase só aparece em `app/perfil/page.tsx`. **NÃO é o banco principal** dos dados AHP-BOCR.

**Hipóteses sobre persistência principal:**
- localStorage do navegador (mais provável — projetos efêmeros)
- Vercel KV (não há env var visível)
- Algum endpoint externo
- Memória in-process

**Decisão para Fase 6.3:** irrelevante. O ai-reviewer recebe os dados via POST body, agnóstico ao banco.

**Débito separado:** investigar persistência principal em sessão futura quando relevante (não é foco do RAG).

### 3.4 Modelo LLM atual

```typescript
// app/api/ai-reviewer/route.ts L139-143
const MODEL_CONFIG = {
  id: 'claude-sonnet-4-5-20250929',
  maxTokens: 12000,
  temperature: 0.4,
};
```

**Para Fase 6.3:** trocar para Opus 4.7 com extended thinking.

---

## 4. A "RAG" PROMETIDA EM JANEIRO — O QUE FOI ENTREGUE DE FATO

### 4.1 Estrutura física existente

| Item | Status | Função |
|---|---|---|
| 35 articles em `lib/rag/articles/*.ts` | ✅ Existe | Extração estruturada de PDFs (verbatim + page + locator) |
| `lib/rag/types.ts` | ✅ Existe | Schema `ArticleExtraction` completo |
| `lib/rag/index.ts` | ✅ Existe | Agregador com funções utilitárias (getAllClaims, getCRThresholds, getBOCRFormulas, etc.) |
| `lib/rag/README.md` | ✅ Existe | Documentação do pipeline de extração |

### 4.2 O que NÃO foi entregue

| Item | Status | Implicação |
|---|---|---|
| Importação de `lib/rag/index.ts` pelo ai-reviewer | ❌ Órfão | **Os 35 articles NÃO chegam ao Parecer IA hoje** |
| Embeddings vetoriais | ❌ Inexistente | Sem retrieval por similaridade |
| Vector store | ❌ Inexistente | Sem busca dinâmica |
| Citation verifier contra chunks | ❌ Inexistente | Validação atual é regex sobre texto |
| Structured output (Tool Use) | ❌ Inexistente | LLM gera texto livre |

### 4.3 O que existe e protege contra alucinação HOJE

| Camada | Onde | Robustez |
|---|---|---|
| Knowledge curado de 7 papers | `app/api/ai-reviewer/knowledge.ts` | Alta |
| Funções keyword-based getRAG* | `knowledge.ts` (NÃO o `lib/rag/index.ts`) | Média |
| Validação pós-LLM (`validateReviewOutput`) | `route.ts` L1551, 6 categorias de checks | Média |
| Detecção de viés (Dodevska 2023) | `bias-detection.ts` | Alta (independente) |
| Diretrizes anti-fabricação no prompt | `route.ts` L1486-1509 | Média (depende do LLM seguir) |

### 4.4 Avaliação honesta

**O que falhou em janeiro:**

A extração dos 35 papers foi entregue. O agregador `index.ts` foi criado. Os tipos foram definidos. Mas o **passo crítico de conectar `lib/rag/index.ts` ao `app/api/ai-reviewer/route.ts`** nunca aconteceu. O README.md tem regra explícita "NÃO ALTERAR: app/api/ai-reviewer/route.ts" — provavelmente Claude foi instruído a entregar a extração SEM tocar no consumer, e a integração ficou para depois.

Em paralelo, alguém (Pedro? Outra sessão Claude?) criou o `app/api/ai-reviewer/knowledge.ts` curado manualmente e o conectou ao route.ts. Esse é o "RAG" que de fato funciona hoje — mas é apenas 7 papers consolidados manualmente, e não usa os 35 extraídos.

**Resultado:** dois sistemas de conhecimento paralelos, um deles órfão.

---

## 5. ARQUITETURA DO PARECER IA (HOJE)

### 5.1 Fluxo completo

```
[Frontend] → POST /api/ai-reviewer
                    │
                    ▼
            normalizeRequest(rawData)
                    │
                    ▼
            calculateGrade(data)
                    │
                    ▼
            analyzeBias(respondents)         ← bias-detection.ts
                    │
                    ▼
            generateReview(data, ...)         ← route.ts L839
                    │
                    │  ┌─────────────────────────────┐
                    │  │ getKnowledgeContext()        │
                    │  │ getCriticalRefs()            │
                    │  │ getRefsByTopic('consistência')│
                    │  │ getRefsByTopic('BOCR')       │
                    │  │ getRefsByTopic('sensibilidade')│
                    │  │ getRAGThresholds('CR')       │ ← keyword-based
                    │  │ getRAGFormulas('bocr')       │ ← keyword-based
                    │  │ getRAGBenchmarks()           │ ← keyword-based
                    │  └─────────────────────────────┘
                    │
                    ▼
            Anthropic.messages.create()       ← Sonnet 4.5, text livre
                    │
                    ▼
            validateReviewOutput(review)      ← regex pós-validação
                    │
                    ▼
            Response JSON
                    │
                    ▼
[Frontend] renderiza
```

### 5.2 Camadas anti-alucinação atuais (no prompt e pós)

**No prompt (route.ts L1486-1509):**
- DIRETRIZ 1-5 explícitas
- Checklist obrigatório
- Lista de "AFIRMAÇÕES PROIBIDAS"

**Pós-LLM (route.ts L1551-1660 `validateReviewOutput`):**
1. Detecta "respondente fantasma" via 4 padrões regex
2. Verifica fórmula simplificada vs completa (Wijnmalen Eq. 17 com v e s)
3. Detecta referência a IA como fonte (ChatGPT, Gemini, Scopus AI)
4. Verifica consistência de total de respondentes
5. Verifica scores das alternativas contra `validFinalScores`
6. Detecta limiar empírico sem referência

**Lacuna:** validação atual NÃO compara citações contra fontes reais. Ex: se o LLM citar "Saaty (1980, p. 22) afirma que CR > 0.30 é catastrófico", o sistema atual não detecta que a página/afirmação é inventada.

---

## 6. O QUE A FASE 6.3 PRECISA ENTREGAR

### 6.1 Princípios não-negociáveis (acordados em 07/mai/2026)

1. **Aditivo, não substitutivo:** RAG vetorial COMPLEMENTA o knowledge curado, não o substitui. Se Upstash cair, sistema cai para baseline curado.
2. **Citation verifier obrigatório:** toda citação no Parecer IA deve ter chunk correspondente no vector store. Citações sem suporte são removidas ou regeradas.
3. **Structured output:** LLM gera JSON com `verbatim_quote` obrigatório por afirmação, não texto livre.
4. **Stack revisada para zero alucinação:**
   - Vector store: **Upstash Vector**
   - Embedding: **Voyage-3**
   - LLM: **Claude Opus 4.7** com extended thinking
   - Output: **Tool Use** com schema obrigatório
   - Validação: regex existente + citation verifier novo

### 6.2 Critérios objetivos de "feito" (11 critérios)

| # | Critério | Aceitável | Não-aceitável |
|---|---|---|---|
| 1 | Articles indexados no Upstash | 35 articles, ~210 chunks | <30 articles |
| 2 | Latência retrieval | <500ms top-3 | ≥1s |
| 3 | Anti-regressão | 3 Pareceres iguais antes/depois | qualquer regressão |
| 4 | Citações novas | ≥5 vindas dos 35 articles em 1 Parecer | 0 |
| 5 | Failover | Upstash off → baseline funciona | crash |
| 6 | Custo por Parecer | <$0.05 estimado | >$0.10 |
| 7 | Build | TypeScript + Next build PASS | qualquer erro |
| 8 | Documentação | suficiente para Cap 3/4 dissertação | incompleta |
| 9 | Teste adversarial | 10 Pareceres com dados lacunares — sistema omite/recusa | inventa valores |
| 10 | Citation audit | 5 Pareceres auditados manualmente — 0 citações falsas | ≥1 falsa |
| 11 | Paráfrase audit | 20 paráfrases vs verbatim — todas preservam sentido | ≥1 distorce |

### 6.3 Plano de fases

| Fase | Entregável | Estimativa | Reversível |
|---|---|---|---|
| 6.3.0 | `RAG_DECISIONS.md` + setup contas Upstash + Voyage | 1-2h | Sim |
| 6.3.1 | `lib/rag/embed.ts` + `lib/rag/upstash-client.ts` (wrappers) | 2-3h | Sim |
| 6.3.2 | `scripts/ingest-rag.ts` usando `getAllClaims()` + `getAllFormulas()` do `index.ts` existente | 3-4h | Sim |
| 6.3.3 | `lib/rag/retrieve.ts` com testes isolados | 3-4h | Sim |
| 6.3.4 | `getEnhancedContext()` em `app/api/ai-reviewer/knowledge.ts` (combina curado + RAG) | 2-3h | Sim |
| 6.3.5 | Modificar `route.ts`: Opus 4.7 + Tool Use + injetar enhanced context | 5-7h | Cuidado |
| 6.3.6 | `lib/rag/citation-verifier.ts` + integrar em `validateReviewOutput` | 4-6h | Sim |
| 6.3.7 | Anti-regressão + adversariais (todos os 11 critérios) | 4-6h | n/a |
| 6.3.8 | Documentação metodológica para Cap 3/4 da dissertação | 2-3h | n/a |

**Total: 26-38h.** Realista com debugging: 32-45h.

### 6.4 Arquivos a serem TOCADOS

| Tipo | Arquivo | Linhas |
|---|---|---|
| **CRIAR** | `lib/rag/embed.ts` | ~50 |
| **CRIAR** | `lib/rag/upstash-client.ts` | ~30 |
| **CRIAR** | `lib/rag/retrieve.ts` | ~80 |
| **CRIAR** | `lib/rag/citation-verifier.ts` | ~150 |
| **CRIAR** | `scripts/ingest-rag.ts` | ~200 |
| **CRIAR** | `lib/rag/articles/lee2009_supplier.ts` | ~270 (débito 6.2b incorporado) |
| **CRIAR** | `docs/RAG_DECISIONS.md` | ~200 |
| **CRIAR** | `docs/ESTADO_ATUAL_07mai2026.md` | (este documento) |
| **MODIFICAR** | `app/api/ai-reviewer/knowledge.ts` | +30 linhas (`getEnhancedContext`) |
| **MODIFICAR** | `app/api/ai-reviewer/route.ts` L139-143 | trocar modelo (~10 linhas) |
| **MODIFICAR** | `app/api/ai-reviewer/route.ts` L852-855 | trocar 3 chamadas getRAG* por 1 (~15 linhas) |
| **MODIFICAR** | `app/api/ai-reviewer/route.ts` L1529-1538 | Tool Use com schema (~80 linhas) |
| **MODIFICAR** | `app/api/ai-reviewer/route.ts` L1551-1660 | estender validateReviewOutput (~50 linhas) |
| **MODIFICAR** | `lib/rag/index.ts` | +2 linhas (registrar lee2009_supplier) |
| **MODIFICAR** | `package.json` | +2 deps (`@upstash/vector`, `voyageai`) |

### 6.5 Arquivos NÃO TOCADOS

- `app/api/generate-academic/route.ts` (Commit 3.1 fechado)
- `app/api/calculate/route.ts` (motor)
- `app/avaliacao/[projectId]/page.tsx` (coleta)
- `app/api/generate-article/route.ts`
- `app/api/audit-decision/route.ts`
- `app/api/validate*` (validação externa)
- `app/api/response-quality/route.ts`
- `app/api/send-invite/route.ts` (Resend)
- `lib/analysis/dominanceAnalyzer.ts`
- `app/api/ai-reviewer/bias-detection.ts`
- `lib/rag/types.ts` (schema completo)
- 35 articles existentes em `lib/rag/articles/`
- Toda a UI (frontend) — contrato POST mantido

---

## 7. RUPTURA DE REGRA HISTÓRICA

O `lib/rag/README.md` linhas 80-83 lista como **"NÃO ALTERAR"**:
- `lib/knowledge.ts`
- `app/api/ai-reviewer/route.ts`
- `app/api/calculate/route.ts`
- `app/api/audit-decision/route.ts`

Essa regra fazia sentido em janeiro — Claude que extraía papers não devia tocar nos consumers. **Para Fase 6.3, vamos quebrar essa regra deliberadamente** porque o problema fundamental é exatamente que `app/api/ai-reviewer/route.ts` precisa importar de `lib/rag/index.ts` para usar os 35 papers.

**Mitigação:**
- Cada modificação em `route.ts` será cirúrgica (linhas exatas listadas em 6.4)
- Validação anti-regressão (critério #3) garante que o sistema antigo continua funcionando
- Fallback para baseline curado garante operação se vetorial falhar

---

## 8. DÉBITOS NÃO RELACIONADOS À FASE 6.3 (registrar para futuro)

| Débito | Origem | Prioridade |
|---|---|---|
| Atualizar `eslint` para resolver warning `extensions has been removed` | Commit 3.1 build | Baixa (pós-defesa) |
| BIBLIOGRAFIA.ipc no `knowledge.ts` aponta `saaty2003` para "Magic Seven" (paper errado) | Investigação 6.2 | Média (corrigir junto Fase 6.3) |
| Investigar persistência principal (Firebase só em perfil/) | Investigação 6.2 | Baixa (não bloqueia) |
| `lib/rag/articles/_template.ts` não foi lido | Estrutura | Baixa (verificar antes de criar lee2009_supplier.ts) |
| Saaty & Ozdemir (2004) na L66 do `knowledge.ts` é typo de 2003 | Auditoria PVB 6.2 | Média (incluir no 6.2a quando rodar) |
| L287 e L294 do `knowledge.ts` (referências fracas Mult. Potências e Simples) | Auditoria PVB 6.2 | Média (incluir no 6.2a) |

**Commit 6.2a (entregue como prompt mas não executado)** ainda é válido e prioritário antes de Fase 6.3.5 (porque mexe nas mesmas linhas que Fase 6.3.5 vai mexer — fazer 6.2a primeiro evita conflito de merge).

---

## 9. LIÇÕES APRENDIDAS REGISTRADAS

### Para Pedro
1. **Comandos que dumpam .env** podem expor API keys mesmo em conversas Claude. Sempre redijir antes de colar.
2. **PowerShell `Select-String` sem `-Encoding utf8`** retorna matches errados para acentos. Sempre usar.
3. **`str_replace` literal NÃO normaliza CRLF↔LF.** Para arquivos Windows, usar substituições single-line.
4. **`[projectId]` no PowerShell** é tratado como wildcard — usar `-LiteralPath`.

### Para Claude (instrução para sessões futuras)
1. **Nunca prescrever sem ler.** Inferência sem evidência é a fonte de retrabalho.
2. **Distinguir RAG vetorial de knowledge keyword-based** — o nome "RAG" é abusado, sempre validar a implementação real.
3. **Conectar arquivos novos aos consumers** — entregar extração sem integrar é sintoma de tarefa incompleta.
4. **Anexos no chat ≠ arquivos em disco.** Pedir explicitamente "faz upload no chat" quando precisar.

---

## 10. CONFIRMAÇÕES E CORREÇÕES À MEMÓRIA

| Memória entrada | Status | Correção |
|---|---|---|
| #7 "matrizes Firestore... calculate/route.ts L1198" | ❓ Não confirmado | Firebase só em `app/perfil/` — investigar persistência real depois |
| #11 "Coleta Hyundai 12 respondentes" | ❓ Não confirmado | Não vimos onde estão armazenados |
| #14 "29 PDFs" | ❌ Errado | São **35 articles + 1 template = 36 arquivos** em `lib/rag/articles/` |
| #18 "Total RAG: 33 artigos" (Commit 6.1 Parte 1) | ❌ Errado | Era 35 ou 33 na época? Inconsistente |
| #19 "Total RAG: 35 artigos, 119 fórmulas, 129 claims" | ✅ Confirmado (35 articles) | Métricas exatas via `getRAGStats()` quando rodar |
| #20 "lee2009_supplier não está no RAG" | ✅ Confirmado | Existe `lee2009_wind.ts` mas não `lee2009_supplier.ts` |

---

## 11. PRÓXIMO PASSO IMEDIATO

Quando Pedro aprovar este documento:

1. **Salvar como `docs/ESTADO_ATUAL_07mai2026.md`** no repo
2. **Commit: `docs: add ESTADO_ATUAL baseline for Fase 6.3`**
3. **Push** (não bloqueia produção)
4. **Em sessão nova:** anexar este documento no início + começar Fase 6.3.0

---

*FIM DO ESTADO_ATUAL — versão 1.0 definitiva*
