# ESTADO ATUAL — 08/mai/2026

**Versão:** 1.0
**Sucessor de:** `docs/ESTADO_ATUAL_07mai2026.md` v1.1
**Encerramento da sessão:** 19h33 BRT (commit 1dd9f93)
**Defesa:** 30/mai/2026 (~22 dias)

---

## 1. Resumo executivo

Phase 6.3.0a (PVB hardening) concluída com 3 commits sequenciais em main no dia 8/mai. O sistema de Pareceres IA passou a ter defesa em profundidade contra alucinações de citação:

- **Camada 1 (prompt):** whitelist canônica no `SYSTEM_PROMPT` sincronizada com os 35 articles do RAG, mais bloco de regras desambiguadas.
- **Camada 2 (validator):** módulo `lib/rag/citation-whitelist.ts` que extrai todas as citações do Parecer e flagga as fora da whitelist (issues) ou subótimas (warnings).

A alucinação cega de fontes fora do RAG (Saaty 1980, Feldman 2015, etc.) foi eliminada. As alucinações remanescentes (Coughlan & Coghlan, Thiollent) vêm de "literatura de pesquisa-ação" — caso de borda que o validator agora detecta.

---

## 2. Estado do repositório

| Campo | Valor |
|---|---|
| HEAD em main | `1dd9f93dc8a0eb34851c25c8eb2700d572ed083c` |
| Branch | `main` (sync com `origin/main`) |
| Working tree | limpo (após commit) |
| Tamanho `app/api/ai-reviewer/route.ts` | 1888 linhas |
| Tamanho `lib/rag/citation-whitelist.ts` | 320 linhas |
| MD5 `citation-whitelist.ts` | `D6287A4F7F83AF462111919DF3665A18` |
| Versão API | `7.2.0-dominance-analysis` |
| LLM ativo | `claude-opus-4-6` + adaptive thinking |
| SDK Anthropic | `@anthropic-ai/sdk@0.95.1` |

### 2.1 Vercel deployments relevantes

| Commit | Deployment ID | State |
|---|---|---|
| `1dd9f93` (D2.1 — HEAD) | `dpl_HGpmcF65UqF4ACHbkkVa48NgTaA3` | BUILDING ao final da sessão |
| `b0e41d1` (D2) | `dpl_E1N2PwjqNKzVtsfQZrq8k7R8Fgnw` | READY |
| `16b98a8` (D1) | `dpl_7cC8NpPc11K9rDFZf6tzBmFChktY` | READY |

Time/Project IDs:
- `teamId` = `team_OO4BSsSsesaOMSdVoWA9wuoI`
- `projectId` = `prj_PPXeakZQfHCl82ynLW9mvnlQVPAP`

---

## 3. Linha do tempo da sessão 8/mai/2026

### 3.1 Contexto inicial

- HEAD = `18082fe` (hotfix `temperature` do 7/mai/noite)
- Auditoria manual do Parecer Opus 4.6 anterior detectara 5 anomalias de citação:
  1. Saaty (1980) sozinho
  2. Saaty (2012) sem Vargas
  3. Saaty & Ergu (2015)
  4. Feldman et al. (2015)
  5. Saaty (2003) ambíguo entre Eigenvector e Saaty & Ozdemir

### 3.2 Diagnóstico (F1 + F1.5)

Read-only de `app/api/ai-reviewer/route.ts`, `lib/rag/index.ts`, `lib/rag/types.ts`, e dos articles `saaty1977_scaling.ts`, `dodevska2023when.ts`, `_template.ts`. Achados:

- **Anomalia #3 era falso positivo**: `saaty2015_trustworthy.ts` confirma autoria com Ergu — citação estava correta.
- **Anomalias #1, #2, #4, #5 eram dessincronia**: o `SYSTEM_PROMPT` L575-600 autorizava Saaty 1980, Feldman 2015, Saaty & Vargas 2007, Crawford & Williams 1985 — papers que **não estão no RAG**. O LLM seguia o prompt corretamente; o prompt é que estava desalinhado com o RAG real.
- **Saaty (1977) NÃO cobre os limiares ajustados** CR ≤ 0.05 (n=3) e CR ≤ 0.08 (n=4) — esses vinham de Saaty (1980), que não está no RAG.
- **Dodevska (2023) não cita "Feldman" verbatim** nos chunks extraídos — só "80% rule [73]". A reatribuição da regra dos 80% para Dodevska et al. (2023, Eq. 10) é defensável.

### 3.3 Commits executados

#### Commit 1 — D1 (`16b98a8`)

`fix(ai-reviewer): synchronize SYSTEM_PROMPT whitelist with RAG (PVB Phase 6.3.0a)`

Mudanças em `app/api/ai-reviewer/route.ts`:
1. Whitelist L575-600 reescrita (28 entradas agrupadas por categorias, sincronizada com 35 articles)
2. Adicionado bloco "REGRAS DE ATRIBUIÇÃO DESAMBIGUADAS" com 6 regras
3. L605 removida (limiares ajustados CR sem suporte no RAG)
4. L606 reatribuída: regra dos 80% via Dodevska (2023, Eq. 10)
5. L612, L719, L742 atualizadas para Dodevska (2023, Eq. 10 e 15)
6. AFIRMAÇÕES PROIBIDAS expandidas com 4 novos bullets

Stat: `1 file changed, 49 insertions(+), 21 deletions(-)`. Linhas 1854 → 1882.

**Validação humana:** Parecer real reprocessado eliminou 4/4 anomalias críticas. Restaram 2 atribuições subótimas:
- Saaty (2003) ainda aparece em "hierarquia de controle BOCR" (deveria ser Saaty & Ozdemir)
- Saaty (1987;1990) atribuído a "única função de agregação válida" — alucinação atributiva (a prova é Aczél & Saaty 1983, fora do RAG)

#### Commit 2 — D2 (`b0e41d1`)

`feat(ai-reviewer): add citation whitelist validator (PVB Phase 6.3.0a — D2)`

- Novo: `lib/rag/citation-whitelist.ts` (307 linhas)
- Modificado: `app/api/ai-reviewer/route.ts` — import + categoria 7 em `validateReviewOutput`

Camadas:
- Camada 1 (issues): citação fora dos 35 articles → CITACAO_FORA_WHITELIST
- Camada 2a (warnings): paper coautorado citado sem coautor/et al. → CITACAO_INCOMPLETA
- Camada 2b (warnings): atribuições contextualmente subótimas (Saaty 2003 em BOCR, Saaty 1987 em prova teórica) → ATRIBUICAO_SUBOTIMA

Stat: `2 files changed, 313 insertions(+)`.

**Validação humana:** validator detectou 4 issues + 6 warnings. Auditoria revelou que **3 dos 10 são falsos positivos** por bugs do meu próprio código.

#### Commit 3 — D2.1 (`1dd9f93`)

`fix(rag): correct 3 bugs in citation validator (PVB Phase 6.3.0a — D2.1)`

Bugs corrigidos em `lib/rag/citation-whitelist.ts`:

1. **`extractSurname` não tratava sufixos Jr/Sr/II/III/IV**:
   `Neely Jr, Brett H` → split por `,` retornava `"Neely Jr"`. Fix: strip de Jr/Sr/II/III/IV/Filho/Neto após split.

2. **`CITATION_REGEX` lookbehind aceitava hífen e apóstrofo**:
   `Aull-Hyde et al. (2006)` gerava 2 matches porque `(?<![A-Za-zÀ-ú])` não rejeita `-`. Fix: `(?<![A-Za-zÀ-ú\-'])`.

3. **CITACAO_INCOMPLETA disparava com qualquer match coautorado**:
   `Saaty (2003)` tem 2 papers no RAG (1 single-author + 1 coautorado). Validator iterava nos 2 e disparava warning. Fix: só dispara se `every(a => isCoauthored || isMultiAuthor)`.

Stat: `1 file changed, 22 insertions(+), 9 deletions(-)`. Linhas 307 → 320.

**Validação humana:** pendente ao final da sessão. Build estava em BUILDING. Critério esperado:
- Issues caem 4 → 2 (Coughlan, Thiollent — verdadeiros positivos)
- Warnings CITACAO_INCOMPLETA caem 5 → 4 (Saaty 2003 sai)
- ATRIBUICAO_SUBOTIMA Saaty 2003 BOCR mantém-se (camada 2b)

---

## 4. Topologia do código

### 4.1 `app/api/ai-reviewer/route.ts` (1888 linhas)

- L11: import novo `validateCitationsAgainstWhitelist` from `@/lib/rag/citation-whitelist`
- L139-144: `MODEL_CONFIG` com `claude-opus-4-6` + `thinking: { type: 'adaptive' }` + `maxTokens: 16000`
- L559-833: `SYSTEM_PROMPT` (template literal)
  - L575-624: whitelist sincronizada + REGRAS DE ATRIBUIÇÃO DESAMBIGUADAS + AFIRMAÇÕES PROIBIDAS
  - L755-833: 5 diretrizes complementares (Escobar, sensibilidade+CR, decisão editorial, IPC, paradigma)
- L1577-1581: interface `ValidationResult { isValid, issues, warnings }`
- L1583-1700: `validateReviewOutput` com 7 categorias de checks (foi 6 pré-D2):
  1. RESPONDENTE_FANTASMA
  2. FORMULA_SIMPLIFICADA / FORMULA_INCOMPLETA
  3. REFERENCIA_IA_PROIBIDA
  4. TOTAL_INCONSISTENTE
  5. SCORE_NAO_RECONHECIDO
  6. EMPIRICO_SEM_REF
  7. **CITACAO_FORA_WHITELIST + CITACAO_INCOMPLETA + ATRIBUICAO_SUBOTIMA** (novo D2)

### 4.2 `lib/rag/citation-whitelist.ts` (320 linhas, NOVO em D2)

Exports:
- `CitationEntry` (interface)
- `CitationValidationResult` (interface)
- `validateCitationsAgainstWhitelist(text)` (função pública principal)
- `getWhitelistStats()` (debug)
- `getCanonicalWhitelist()` (debug)

Internals:
- `cleanLatex`, `normalize`, `extractSurname` (com strip de Jr/Sr após D2.1)
- `buildWhitelist()` cache singleton consumindo `getAllArticles()` de `lib/rag/index.ts`
- `CITATION_REGEX` lookbehind `(?<![A-Za-zÀ-ú\-'])` após D2.1
- `SUBOPTIMAL_RULES`: 2 regras contextuais (Saaty 2003 BOCR, Saaty 1987 unicidade)
- `detectSuboptimalAttributions(text)`: aplica as regras com janela contextual de 250 chars

### 4.3 RAG (35 articles, inalterado nesta sessão)

`lib/rag/index.ts` (234 linhas) com:
- `ARTICLES` array (35 entradas)
- `getAllArticles()`, `getArticle(id)`, `getArticleIds()`
- Agregadores: `getAllThresholds`, `getAllFormulas`, `getAllClaims`, `getAllBenchmarks`
- Helpers: `getCRThresholds`, `getSensitivityThresholds`, `getBOCRFormulas`
- `getRAGStats()`

Schema em `lib/rag/types.ts` (225 linhas) — `ArticleExtraction` com `citation`, `metadata`, `thresholds`, `formulas`, `key_claims`, etc.

---

## 5. Auditoria PVB esperada pós-D2.1

Na próxima geração de Parecer com mesma matéria-prima (Hyundai paint shop, gás natural):

### 5.1 Issues esperadas (verdadeiros positivos)

| Citação | Razão |
|---|---|
| `Coughlan & Coghlan (2002)` | Não está no RAG. LLM cita em "Ações de Mitigação" sob "literatura de pesquisa-ação" |
| `Thiollent (2022)` | Idem |

Esses são problemas de prompt — o L600 permite "conforme a literatura de [área]" interpretado pelo LLM como liberdade de citar autores específicos. Fix futuro = D1.2 (refinamento do prompt).

### 5.2 Warnings esperados (verdadeiros positivos)

| Citação | Categoria | Razão |
|---|---|---|
| `Salomon (2024)` sem Gomes | CITACAO_INCOMPLETA | Paper coautorado |
| `Escobar (2004)` sem et al. | CITACAO_INCOMPLETA | 3 autores |
| `Lee (2009)` sem et al. | CITACAO_INCOMPLETA | 3 autores |
| `Kabak (2014)` sem Dağdeviren | CITACAO_INCOMPLETA | Paper coautorado |
| `Saaty (2003)` em contexto BOCR | ATRIBUICAO_SUBOTIMA | Camada 2b |

### 5.3 Falsos positivos eliminados em D2.1

| Citação | Bug |
|---|---|
| `Neely et al. (2020)` | Bug 1 (sufixo Jr) |
| `Hyde et al. (2006)` | Bug 2 (regex hífen) |
| `Saaty (2003)` CITACAO_INCOMPLETA | Bug 3 (multi-match) — duplicava com a ATRIBUICAO_SUBOTIMA da camada 2b |

---

## 6. Pendências pré-defesa (priorizadas)

### P1 — Urgente

1. **Validar D2.1 em Parecer real** (5 min). Confirmar que os 3 falsos positivos sumiram e os 7 verdadeiros positivos seguem aparecendo.

2. **Commit B — RAG_DECISIONS v3** (~30 min)
   - Atualizar `docs/RAG_DECISIONS.md` para v3 refletindo:
     - §0 Errata: Caminho B (Opus 4.6 vs 4.7) — decisão arquitetural
     - §2.3 reescrita: Opus 4.6 + adaptive thinking (substitui texto v2 que falava de 4.7)
     - §6 nova: PVB hardening (D1 + D2 + D2.1) com link para commits
     - Apêndice: hashes dos commits e MD5s
   - Draft inicial existe em `/mnt/user-data/outputs/RAG_DECISIONS_v3.md` (gerado 8/mai manhã, precisa atualização para incluir D1+D2+D2.1)

### P2 — Importante

3. **Phase 6.3.2 — `scripts/ingest-rag.ts`** (3-4h)
   - Consumir `getAllClaims/getAllFormulas/getAllThresholds/getAllTablesFigures/getAllRecommendations` de `lib/rag/index.ts`
   - Format text per type (RAG_DECISIONS §3.2)
   - Batch embed via `lib/rag/embed.ts` → upsert via `lib/rag/upstash-client.ts`
   - Validação: 35 articles, ~400 chunks, query manual top-5 relevante
   - Bloqueada até P1.1+P1.2 fechar

### P3 — Pode esperar

4. **Phase 6.3.3 — `lib/rag/semantic-retrieve.ts` + `getRAGSemantic()` na fachada `knowledge.ts`** (2-3h)

5. **Phase 6.3.4 — `route.ts` Tool Use + injeção semântica no prompt** (4-6h)

6. **Phase 6.3.5 — Citation verifier opcional (com `verbatim_quote` checking)** — só se P1+P2+P3.4+P3.5 confirmarem necessidade

---

## 7. Débito técnico pós-defesa

| Item | Justificativa |
|---|---|
| **D3 — Adicionar `lib/rag/articles/saaty1980_ahp.ts`** | Permite restaurar L605 do prompt (limiares CR ≤ 0.05/0.08 para n=3, n=4). Hoje removidos por falta de suporte no RAG. Caso de borda, baixa prioridade pré-defesa |
| **D1.2 — Refinar prompt para evitar Coughlan/Thiollent** | LLM ainda cita autores fora do RAG sob "literatura de pesquisa-ação". Solução: L600 mais restritiva ou whitelist explícita por área |
| **Cleanup `scopusAI2025_cr_group.ts.REMOVED`** | Arquivo legado fora da lista ativa de articles. Renomear para `.bak` ou remover |
| **Adicionar testes unitários para `citation-whitelist.ts`** | Hoje não tem cobertura de testes. Os 3 bugs encontrados em D2 poderiam ter sido pegos por testes. Sugestão: vitest com casos para Aull-Hyde, Neely Jr, Saaty 2003 ambíguo, Coughlan, etc. |
| **Tornar `SUBOPTIMAL_RULES` configurável via JSON externo** | Hoje hardcoded no .ts. Para escalar, mover para `lib/rag/citation-suboptimal-rules.json` carregado em runtime |

---

## 8. Lições aprendidas nesta sessão

### 8.1 Arquiteturais

- **Dessincronia entre fontes de verdade gera "alucinações por permissão"**: o LLM não inventou — seguiu o prompt corretamente. O prompt é que listava como autorizadas fontes que não estão no RAG. Lição: **toda whitelist em texto deve ser derivada programaticamente do RAG ou ter teste de sincronia em CI**.

- **Defesa em profundidade funciona**: D1 (prompt) + D2 (validator) cobrem casos diferentes. D1 reduz a probabilidade do LLM emitir; D2 captura quando emite. Cada camada pegou achados que a outra não pegou (Coughlan/Thiollent só viraram visíveis com D2; Saaty 1980/Feldman só foram eliminados com D1).

- **Validator pós-LLM revela problemas semânticos** que não aparecem em validação manual: Lee (2009) sem et al., Escobar (2004) sem et al., Kabak (2014) sem Dağdeviren — essas atribuições incompletas passaram desapercebidas em revisões manuais por meses.

### 8.2 Operacionais

- **`apply_patch` é frágil** com strings longas em arquivos grandes. Falha opaca mesmo com conteúdo correto. **`str_replace` por edição individual** é mais robusto.

- **Para inserções complexas, PowerShell direto via `Set-Content` + `[System.IO.File]::WriteAllText` com `[System.Text.UTF8Encoding]::new($false)`** (UTF-8 sem BOM) é o caminho mais seguro. Detectar EOL CRLF/LF antes para preservar.

- **Higiene de sessão Antigravity:** thread limpa antes de colar prompts; backups `.bak-pre-XX` antes de operações arriscadas; remoção de backup só após V passar; marker `[ignoring loop detection]` é interno do Antigravity, não injection.

- **PowerShell quoting com regex**: usar `-SimpleMatch` ou aspas simples sempre que regex tiver caracteres especiais. Aspas duplas em regex no PowerShell quebram a parse.

- **Pager git trava terminal Windows**: `git --no-pager log` ou `git config --global core.pager ""`.

### 8.3 Específicas do citation validator

- **Lookbehind precisa excluir todos os "non-word breakers"**: hífen, apóstrofo, talvez também `_`. Letras não são suficientes.
- **Sufixos generacionais (Jr/Sr/II/III/IV/Filho/Neto)** precisam ser strip antes do matching de sobrenome.
- **Múltiplos matches `(sobrenome, ano)`** podem indicar ambiguidade legítima. A lógica deve usar `every` (todos coautorados) em vez de `some` para CITACAO_INCOMPLETA — caso contrário, matches válidos disparam falso positivo.
- **Disambiguação contextual (camada 2b)** é mais robusta para casos como Saaty 2003 BOCR do que tentar inferir intenção via metadata.

---

## 9. Configuração do ambiente (referência rápida)

### 9.1 Vercel env vars (Production + Preview)

- `ANTHROPIC_API_KEY`
- `UPSTASH_VECTOR_REST_URL`
- `UPSTASH_VECTOR_REST_TOKEN`
- `VOYAGE_API_KEY`

### 9.2 .env.local (backup local Sensitive)

Mesmas 4 chaves acima, valores idênticos a Vercel Production.

### 9.3 Build local

```powershell
npm run build           # Pedro NÃO usa npm run dev
npx tsc --noEmit        # type check isolado
```

### 9.4 Test scripts (não rodar regular)

```powershell
npm run test:rag:embed     # voyage-3 dimensão + norma + latência
npm run test:rag:upstash   # query self-similarity
```

---

## 10. Como retomar a próxima sessão

1. Abrir terminal em `C:\AHP-BOCR\ahp-simple`
2. `git pull` para garantir sync
3. `git log -1 --format="%H %s"` — esperado `1dd9f93` ou superior se houver commits intermediários
4. Validar Parecer real ainda pendente:
   - Ctrl+F5 na app, F12 + Network
   - Reproduzir 1 Parecer no estudo Hyundai paint shop
   - Conferir `validation.issues` e `validation.warnings` na resposta JSON
   - Critério: 2 issues (Coughlan, Thiollent) + 5 warnings (Salomon, Escobar, Lee, Kabak, ATRIBUICAO_SUBOTIMA Saaty 2003)
5. Se aprovado → seguir para Commit B (RAG_DECISIONS v3)
6. Se reprovado → diagnóstico + ajuste antes de v3

---

## 11. Anexos

### 11.1 Lista de artefatos gerados em `/mnt/user-data/outputs/` na sessão

| Arquivo | Linhas | Status |
|---|---|---|
| `prompt-antigravity-pvb-hardening-f1.md` | 218 | Executado, descartado pós-uso |
| `prompt-antigravity-pvb-hardening-f1-5.md` | 129 | Executado, descartado pós-uso |
| `prompt-antigravity-d1-pvb-whitelist.md` | 475 | Executado, → commit `16b98a8` |
| `prompt-antigravity-d2-f1.md` | 246 | Executado, descartado pós-uso |
| `prompt-antigravity-d2-f2.md` | 589 | Executado, → commit `b0e41d1` |
| `citation-whitelist.ts` | 307 | Conteúdo de referência usado pelo prompt D2-F2 |
| `prompt-antigravity-d2-1-hotfix.md` | 318 | Executado, → commit `1dd9f93` |
| `RAG_DECISIONS_v3.md` | 458 | Draft NÃO commitado — precisa atualização para D1+D2+D2.1 |

### 11.2 Hashes de commits da Phase 6.3.0a

| # | Hash | Tag | Data | Mensagem |
|---|---|---|---|---|
| 1 | `e8ab51b` | feat upgrade | 7/mai noite | Sonnet 4.5 → Opus 4.6 + adaptive thinking |
| 2 | `18082fe` | fix temp | 7/mai noite | remove temperature param |
| 3 | `655255f` | feat rag wrappers | 7/mai noite | Voyage-3 + Upstash Vector wrappers |
| 4 | `16b98a8` | fix prompt | 8/mai 16h | synchronize SYSTEM_PROMPT whitelist with RAG (D1) |
| 5 | `b0e41d1` | feat validator | 8/mai 18h | add citation whitelist validator (D2) |
| 6 | `1dd9f93` | fix bugs | 8/mai 19h | correct 3 bugs in citation validator (D2.1) |

---

*FIM do estado atual 08/mai/2026 v1.0*
