# Instruções para o Claude neste repositório

Sistema de apoio à decisão AHP-BOCR, base da dissertação de mestrado de Pedro
Palma (UNESP/FEG) e de um artigo em preparação para a ESWA. Next.js 14,
TypeScript, Vercel, Firestore.

**Este arquivo descreve como trabalhar aqui. Leia-o inteiro antes da primeira
alteração.**

---

## 1. Leia os documentos antes de agir

Os arquivos abaixo, em `docs/`, carregam o estado e o método. **Não são
documentação opcional: são o contexto sem o qual as tarefas não fazem sentido.**

| Arquivo | O que é |
|---|---|
| `docs/objetivo-estados-caminho.md` | **Âncora.** Objetivo, estado do saneamento, tabela de tarefas abertas com escopo medido, e a seção 0.4 com os erros de rota da sessão anterior |
| `docs/imprecisoes-parecer-ia.md` | Registro experimental do Parecer IA: as superfícies de desancoragem, as classes de falha, e as execuções medidas com predições registradas antes |
| `docs/inventario-codigo.md` | Inventário por arquivo |

Mais `docs/contratos-de-dados.md`, `docs/referencia-cr-individuais.md` e
`docs/calculations-13jul2026.json`, que é o estado do Firestore que reproduz as
tabelas publicadas.

⚠ **Os arquivos a seguir, em `docs/`, são anteriores ao saneamento** e podem
conter afirmações superadas: `AI-AUDITOR-GUIDELINE.md`, os dois `ESTADO_ATUAL`,
`GUIA-INTEGRACAO-HIBRIDO.md`, `RAG_DECISIONS.md` e os dois `SYSTEM_PROMPT_AUDIT`.
**Onde divergirem do âncora, o âncora prevalece.**

**A seção 0.4 do âncora é a lista dos erros de rota já cometidos.** Ler antes
evita repetir.

---

## 2. A regra central: registrar antes de executar

**Toda correção que altere o que o modelo do Parecer IA recebe exige uma predição
escrita antes, em `docs/imprecisoes-parecer-ia.md`, com o caso negativo nomeado.**

Na sessão anterior foram seis predições: cinco confirmadas e uma refutada. **A
refutada produziu o achado mais valioso**, um segundo canal no prompt que nenhuma
confirmação teria revelado.

A razão é de método, não de burocracia: uma observação feita depois sempre encontra
explicação. O número mudou, então funcionou; não mudou, então havia outra causa. As
duas leituras cabem no mesmo dado. **Uma predição datada antes fecha essa porta.**

⚠ **Predição só cabe onde a correção altera o que o modelo recebe.** Correção de
artefato que o modelo não lê — comentário de código, base para leitura humana,
campo em desuso — se verifica contra a fonte, não contra a saída.

---

## 3. Medir, não prever

**Contagem que vem do texto do código é hipótese; a que vem da execução é medida.**

Casos medidos na sessão anterior, o primeiro reconferido em 12/09/2026:

- `characterization.test.ts` tem dez blocos `test(` no fonte e o jest reporta
  **30**, porque parte é gerada em laço.
- Cinco tarefas consecutivas subestimaram o escopo na primeira contagem: tabelas RI
  (quatro previstas, seis reais), `p. 271` (uma, cinco), `dominanceAnalyzer`
  (quatro, sete), Feldman (onze, catorze), `verbatim_quote` (uma, depois onze,
  depois 21).

**Regras que derivam disso:**

- Use `git grep`, que cobre o repositório rastreado inteiro, e filtre por extensão
  em vez de enumerar diretórios. Custa o mesmo e não depende de memória.
- Conte **ocorrências**, não linhas de grep: uma linha pode conter o termo duas
  vezes.
- **Nome de identificador é hipótese, não evidência.** Quatro casos medidos: o
  `dominanceAnalyzer` não media dominância entre alternativas, o `avgCR` era o
  máximo e não a média, o `verbatim_quote` não era verbatim em treze claims, e o
  "Skip link" pulava instruções e não comparações. Leia o que o código faz.
- **Antes de declarar que não se pode medir, tente habilitar a medição.** O jest
  não rodava num clone por falta de `node_modules`; `npm install` levou 34
  segundos.

⚠ **Na primeira vez que um instrumento novo produz um agregado, verifique à mão o
caso mais visível antes de aceitar o número.**

"Instrumento novo" é o gatilho: um script, uma comparação, um grep de uma linha, na
sua primeira execução.

⚠ **Um caso correto não valida todos os ramos.** A conferência deve ser
**proporcional ao risco**: quanto maior a consequência do agregado, mais casos e
mais ramos distintos. **O que a primeira conferência elimina é o erro de escopo,
não todos os erros.**

"Caso mais visível" é o achado contraintuitivo: **não é amostra aleatória nem
borda, é o item que qualquer um olharia primeiro.** Três instrumentos falharam na
sessão anterior, e nos três o defeito estava no centro:

| Instrumento, primeira execução | Onde errou | Achado falso que produziu |
|---|---|---|
| `verify-citations.mjs`, regex do conectivo | o Neely, a citação com prefixo mais comum | divergência virou "artigo não indexado" |
| comparador de campos do RAG | o Saaty e Ergu, o verbatim mais citado | verbatim existente virou "fabricado" |
| segundo comparador, escopo de campos | o `verbatim_quote`, 11% de todos os trechos | fidelidade à base virou "adulteração pelo modelo" |

**Bordas não pegam esses erros; o centro pega.** E os três eram de naturezas
diferentes — Node, comparação de strings, grep — então o que falhou não foi a
técnica, foi o escopo da comparação.

⚠ **O modo de falha é o mesmo que este projeto documenta no modelo do Parecer IA:**
saída plausível, da forma esperada, sem sinal de erro. **Um agregado errado não se
anuncia.** E nos três casos o achado falso tinha a forma do que se esperava
encontrar, o que o tornou convincente.

**Um resultado que confirma a expectativa merece a mesma conferência que um que a
contradiz, e provavelmente mais.**

---

## 4. Antes de alterar arquivos

**Confira o diff e preserve alterações manuais.** O usuário edita os documentos à
mão, e uma alteração cega pode sobrescrevê-las.

**Execute as mudanças já autorizadas no escopo da tarefa; peça confirmação quando
surgir decisão fora desse escopo.**

**Um commit por natureza de mudança.** Não misture correção com critério mecânico
— conversão por fórmula, remoção de arquivo órfão — com correção que exige
julgamento. A segunda contamina a conferência da primeira: um diff com setenta
valores convertidos é verificável, o mesmo diff com reancoragens por leitura deixa
de ser.

**Não use `git add -A`.** Liste os caminhos.

**Commite logo após cada bloco de registro.** Esta regra se pagou duas vezes na
sessão anterior: uma seção inteira do registro experimental foi reescrita porque
ficou num arquivo de trabalho enquanto a conversa seguia, e uma tarefa criada no
âncora se perdeu por não estar no commit.

O remédio custa segundos: `git status --short` antes do `git add`, e
`git show --stat` depois do commit. Os dois juntos mostram o que estava salvo e o
que entrou.

---

## 5. Comandos e limitações do ambiente

```
npm test          # 55 testes, 1 falha esperada: o LLSM no censo do motor
npm run build     # 17 páginas
npx tsc --noEmit  # sai 0
```

⚠ **Medidos em 12/09/2026, em `1f6674a`, e mudam.** A falha única é
`o LLSM permanece confinado ao módulo de matrizes incompletas`, do censo.
**Previsto depois de A.21**, que retira o IPC: a falha desaparece e o total cai
pelos testes de IPC que saírem — **o valor não está previsto, mede-se na tarefa.**
**Meça antes de usar como critério de aceite**, e nunca herde um número: é erro
registrado na seção 0.4 do âncora, ocorrido duas vezes.

⚠ **Não use variação da suíte como critério.** Aritmética de exclusão conta o que
sai e ignora os testes novos que a mudança exige. **Defina os comportamentos que
precisam passar, justifique testes removidos ou substituídos, e registre o total
observado depois de executar.**

⚠ **Não rode `npm run lint`.** O ESLint é incompatível com o Next 14 neste
projeto.

⚠ **Não rode `scripts/ingest-rag.ts`** sem autorização. A reingestão reescreve o
índice no Upstash e custa chamadas de embedding. É a tarefa A.18, e deve vir
**depois** de todas as correções no RAG, para pagar uma vez só.

Se o build falhar com `ENOTFOUND fonts.googleapis.com`, é DNS: repita. Se falhar
com erro de **certificado** ao baixar Google Fonts, não resolve repetindo:
registre e confirme pelo deploy da Vercel.

---

## 6. O censo do motor

`lib/__tests__/engine-census.test.ts` tem **doze** testes — medido em 12/09/2026,
e aqui o fonte e o jest coincidem — que verificam **unicidade de
implementação**: um único derivador de prioridades, uma única tabela de índice
aleatório, nenhum fallback silencioso, nenhum epsilon aditivo nas fórmulas de
síntese.

**Ele existe para impedir implementação duplicada, não para proibir método.** Se um
método tem fundamento **e uso previsto**, a correção pode ser autorizá-lo no módulo
correto, em vez de removê-lo.

⚠ **Isso NÃO se aplica ao LLSM.** A decisão vigente está em A.21: **o instrumento
aceita somente respostas completas**, então o IPC sai e o `AUTORIZADO_LLSM` fica
**vazio**. Autorizá-lo em qualquer módulo inverteria a garantia.

⚠ **O censo cobre derivação de prioridades, não síntese.** A rota `calculate`
implementa as fórmulas de síntese em código próprio. Ver a seção 2.4 do âncora.

---

## 7. Protocolo de citação (PVB)

Toda afirmação atribuída a um autor precisa de lastro numa claim indexada em
`lib/rag/articles/`. **Não invente localizador, não interpole página, não atribua
ao autor uma paráfrase do indexador.**

O que se aprendeu medindo:

1. **`page` pode estar em convenção diferente do `abnt`.** Sete artigos usavam
   numeração relativa ao PDF; foram convertidos em `23afe43`, cujo diff traz os
   sete. O Bozóki tem `page` da edição IEEE 2009 e `abnt` da MCM 2010, e o campo
   `notes` documenta isso.
2. **Antes de conferir localizadores contra um PDF, leia o campo `notes`** e
   confirme que o PDF é a edição de onde as claims saíram. Não fazer isso custou
   horas de leitura do artigo errado.
3. **Nenhum dos dois campos de citação é confiável por si.** Em **treze das 123**
   claims que têm `verbatim_quote` e `evidence.quote`, os dois divergem, **e a
   divergência tem duas direções**: em sete o `verbatim_quote` é anotação ou
   reescrita, e o `evidence.quote` é o fiel; em cinco (Bozóki ×3, Schmidt,
   Salomon) é o `evidence.quote` que está **truncado**, e o `verbatim_quote` traz a
   frase completa. **O que o sistema envia ao modelo é `evidence.quote`, desde
   `bf959b6`** — decisão correta nos sete e custosa nos cinco, onde entrega texto
   mais curto, nunca infiel. **A tarefa A.16 resolve caso a caso.** Ao citar em
   qualquer texto, confira os dois.

   ⚠ **Os números são de 11/09/2026, vêm do registro e não foram reconferidos
   aqui. Previsto depois de A.16: zero divergências.** E **as duas direções somam
   doze, não treze**: sete mais cinco, com os doze casos nomeados no registro.
   **A décima terceira não está classificada em nenhuma das duas**, nem lá nem
   aqui. É pendência de A.16, não erro de transcrição.
4. **`description` e `conditions` são texto do indexador**, não do artigo. O
   contexto recuperado não os distingue do `quote`, e o modelo já citou um
   `conditions` como verbatim. É a tarefa A.15.
5. **O script verifica LOCALIZADOR, não conteúdo.** Uma afirmação inventada pode
   apontar para uma página que existe, inclusive uma já indexada:

   | Veredito | O que permite concluir |
   |---|---|
   | `OK` | o localizador coincide com página indexada; **o conteúdo atribuído ainda precisa ser conferido** |
   | `DIVERGE_NA_FAIXA` | a página está na faixa do artigo; **o apoio à afirmação permanece não verificado** |
   | `DIVERGE_FORA_DA_FAIXA` | incompatibilidade de localização, sujeita à conferência da edição e da convenção |
   | `NAO_INDEXADO` | a base não permite verificar a obra |

   ⚠ **Mantenha separadas três coisas:** verificação do localizador, fidelidade da
   transcrição, e sustentação da afirmação. **O script automatiza parte da
   primeira.**

---

## 8. O teste de trilho

Antes de propor qualquer construção nova, três perguntas:

1. **Corrige erro de cálculo?**
2. **Ajuda o gestor a decidir ou a argumentar?**
3. **Diferencia o artigo?**

Se a resposta for não às três, não entra. **Construtos removidos por esse
critério na sessão anterior:**

| Construto | Commit |
|---|---|
| score composto de qualidade e os quatro baldes de status | `e5f9be2` |
| classificação categórica de sensibilidade (Robusto/Moderado/Sensível/Crítico, limiares 50/20/10) | `5837d0d` |
| `validateSensitivity`, veredito por limiar sem fonte | `d16491a` |
| classificador heurístico de viés por cargo (`dominanceAnalyzer`) | `501b19a` |
| autorização, no prompt, para atribuir viés profissional ao painel | `28f4a95` |

⚠ **Construto sem fonte é diferente de código sem uso.** O primeiro se remove; o
segundo, se tem fundamento na literatura, se registra, e a remoção exige decisão
própria.

⚠ **Antes de tratar código sem uso como decisão de produto, confira se existe
caminho até ele seguindo a cadeia de chamadas, não as importações.** Ausência de
importação externa não prova ausência de execução, e confirmar a ausência de um
mecanismo não prova a ausência da capacidade.

**O caso do IPC está decidido e documentado em A.21 do âncora.** Não redecida:
leia a tarefa.

---

## 9. O que não fazer

- Não afirme número que não mediu nesta sessão.
- Não conclua a partir de nome de função, comentário ou rótulo.
- Não ajuste um critério de aceite para bater com o resultado obtido. Se divergiu,
  reporte a divergência.
- Não corrija de passagem algo que está registrado como tarefa própria. O achado se
  perde.
- **Preserve o estado histórico identificado em
  `docs/calculations-13jul2026.json`**, que reproduz os **24 valores publicados**.
  Alterações em produção seguem as tarefas autorizadas do Bloco B. ⚠ **Os resíduos
  em `calculations` e o cache em `responses` têm tratamentos distintos**, descritos
  em B.1 e B.3 do âncora: são coleções diferentes, e recomputar uma não limpa a
  outra.
