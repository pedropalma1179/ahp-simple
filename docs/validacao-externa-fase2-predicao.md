# Validação externa, Fase 2: predição anterior ao código

**Status:** registrada **antes de qualquer alteração de comportamento**. O instante do registro é o do commit que publica este arquivo, medível no objeto.

Redigida pelo analista, sob direção do líder técnico, a partir da especificação publicada em `docs/validacao-externa-fase2-especificacao.md`, no commit `e7411ac3d534122dbc147dc6cb005a09e8ed5400`. ⚠ **Este documento não é implementação e não autoriza implementação.**

**Base de leitura do controle atual:** `e7411ac3d534122dbc147dc6cb005a09e8ed5400`. Localizadores sem prefixo de arquivo são de `components/ExternalValidation.tsx`. Todo controle abaixo é **leitura de código**, não execução.

**O que é predito:** a apresentação, estado por estado, depois da implementação da Fase 2. **O que não é predito:** o comportamento do microserviço, o significado dos seus campos, a igualdade numérica entre os máximos do resumo e das entradas, que segue sem regra, e o desempenho.

⚠ **As três propriedades da especificação são nomeadas em todos os nove estados:** cobertura, resultado informado e veredito. Onde não há envio, resposta ou evidência utilizável, a propriedade é nomeada **com essa condição**, e não omitida.

---

## 1. P1, matrizes persistidas inválidas

**Apresentação esperada.** Manchete "Matrizes persistidas inválidas". Sem selo. **Sem reconstrução** e sem texto que prescreva recalcular o projeto.

- **Cobertura:** nenhuma das seis identidades enviada, com **o motivo de cada descarte** nomeado por identidade.
- **Resultado informado:** nomeado como **ausente por não haver envio**, e não como resultado vazio.
- **Veredito:** **não exibido**, nomeado como não aplicável por não haver comparação.

**O que contrariaria a predição.** A tela mostrar a mensagem genérica de comparação não executada; cair no caminho reconstruído; não nomear o motivo de cada descarte; ou omitir qualquer uma das três propriedades.

**Controle atual, por leitura.** `:75-76` decide por conjunção de dois campos, e `:82` com `:145-182` reconstrói tudo quando ela falha. Os descartes são silenciosos em `:93`, `:104` e `:126`, e nenhum ponto da tela nomeia o motivo. Se o conjunto reconstruído ficar vazio, aparece a mensagem de `:196`.

## 2. P2, comparação não executada

**Apresentação esperada.** Manchete "Comparação não executada". Sem selo.

- **Cobertura:** nenhuma identidade enviada, com as **seis esperadas nomeadas** e a razão de cada ausência.
- **Resultado informado:** nomeado como **ausente por não haver envio**.
- **Veredito:** **não exibido**, nomeado como não aplicável.

**O que contrariaria a predição.** Aparecer veredito ou selo; a mensagem não nomear o que falta; ou omitir qualquer uma das três propriedades.

**Controle atual, por leitura.** `:195-199` produz a mensagem "Nenhuma matriz encontrada. Execute o cálculo primeiro.", exibida em `:285-290`, na mesma caixa da falha de transporte, sem nomear identidade alguma.

## 3. P3, falha ao obter a comparação

**Apresentação esperada.** Manchete própria, **distinta de P2 e de qualquer veredito por rótulo, descrição e detalhes**. A origem da falha aparece quando disponível. Sem selo.

- **Cobertura:** o conjunto efetivamente enviado é nomeado, identidade por identidade.
- **Resultado informado:** nomeado como **ausente por não haver resposta**.
- **Veredito:** **não obtido**.

**O que contrariaria a predição.** A falha não ser distinguível de P2 ou de um veredito por rótulo, descrição e detalhes; ou a origem disponível não aparecer.

**Controle atual, por leitura.** `:211` lança com o status, `:215-216` captura e `:285-290` exibe a caixa genérica, com o mesmo rótulo usado em P2. O campo `details` produzido em `app/api/validate-external/route.ts:44-48` é descartado.

## 4. P4, resposta inválida

**Apresentação esperada.** Manchete "Resposta inválida". Sem selo. **Nenhuma exceção na renderização**, e nenhum número ausente exibido como `NaN` ou como zero.

- **Cobertura:** o conjunto enviado é nomeado; o devolvido é nomeado como **sem entrada utilizável**, distinguindo chave ausente de chave presente e inaproveitável.
- **Resultado informado:** nomeado como **sem nenhuma entrada ao menos parcialmente utilizável**.
- **Veredito:** **não confirmado**.

**O que contrariaria a predição.** Exceção durante a renderização; `NaN%` na tela; qualquer texto de aprovação; ou omitir qualquer uma das três propriedades.

**Controle atual, por leitura.** `:214` guarda o que vier, sem verificação de forma. `:304`, `:336` e `:379` lançam quando faltam `summary`, `results` e `summary.issues`. `:305`, `:344` e `:394` imprimem `NaN%` quando o número é ausente.

## 5. P5, veredito global não confirmado

**Apresentação esperada.** Manchete própria, com as **entradas aproveitáveis visíveis**. Sem selo. Cada contradição exata aparece **conservando os dois valores e a fonte de cada um**.

- **Cobertura:** enviado e devolvido nomeados, com as chaves **ausentes** e as **inesperadas** identificadas.
- **Resultado informado:** por entrada, com os campos válidos exibidos e os inválidos como **"não avaliado"**.
- **Veredito:** **global não confirmado**; o `valid` de cada matriz segue nomeado quando for booleano explícito, e nomeado como não confirmado quando não for.

**O que contrariaria a predição.** Um `all_valid` não booleano e verdadeiro produzir aprovação; qualquer uma das cinco contradições exatas passar sem aparecer; as entradas aproveitáveis desaparecerem junto com o veredito; ou omitir qualquer uma das três propriedades.

**Controle atual, por leitura.** `:295`, `:298` e `:300-303` interpretam por veracidade, e `:367` repete isso por matriz. Nenhuma das cinco contradições entre resumo e resultados é conferida.

## 6. P6, comparação de matrizes reconstruídas

**Apresentação esperada.** Manchete própria, com a origem nomeada como **matriz reconstruída dos pesos**. Sem aprovação dos julgamentos originais. Sem afirmar valor de CR. Sem selo. Sem prescrever recálculo.

- **Cobertura:** as identidades reconstruídas enviadas e devolvidas são nomeadas, e a **cobertura das seis é declarada não satisfeita**, com a magnitude ausente por construção.
- **Resultado informado:** por entrada, **sobre matrizes reconstruídas**, e não sobre os julgamentos.
- **Veredito:** do serviço, **atribuído a ele e restrito às reconstruídas**.

**O que contrariaria a predição.** Aparecer selo; afirmar "CR sempre = 0"; afirmar validação completa pela origem das matrizes; prescrever recalcular o projeto; ou o veredito aparecer sem a restrição ao objeto reconstruído.

**Controle atual, por leitura.** `:275-283` traz o aviso, com `:278` prometendo CR zero sem condição e `:279-280` prescrevendo o recálculo. `:425` afirma validação completa pela origem e `:426` repete a prescrição. `:202` registra a mesma prescrição no console. A origem aparece em `:275`, `:312` e `:393` por `matrixSource`, e em `:424-426` por `previewSource`.

## 7. P7, comparação incompleta

**Apresentação esperada.** Manchete própria **nomeando o que falta**. Sem selo. **CR ausente como "não avaliado"** e **CR inválido identificado como inválido**, com `cr_diff` marcado como diferença contra valor substituto quando for o caso.

- **Cobertura:** **completa ou incompleta**, conforme as identidades efetivamente enviadas e devolvidas; quando incompleta, **nomear as identidades ausentes e as entradas não devolvidas**. ⚠ **Cobertura completa não supre uma dimensão sem resultado utilizável.**
- **Resultado informado:** por entrada, nomeando **a dimensão sem resultado utilizável**, pesos ou CR.
- **Veredito:** do serviço, **atribuído a ele e restrito ao que foi devolvido e é utilizável**.

**O que contrariaria a predição.** Cobertura completa com CR ausente ou inválido em alguma entrada aparecer como P8; um zero coagido aparecer como CR medido; aparecer selo; ou omitir qualquer uma das três propriedades.

**Controle atual, por leitura.** O conjunto enviado não é conferido contra o esperado nem contra o devolvido, e `:304` usa a contagem informada pelo serviço. A coerção `|| 0` ocorre em `:98`, `:114`, `:133`, `:159` e `:176`. A coluna CR (Sistema) exibe em `:341` o `your_cr` devolvido. A procedência local anterior à coerção não é registrada; a igualdade entre o valor enviado e o devolvido não foi verificada.

## 8. P8, aprovação relatada pelo serviço

**Apresentação esperada.** **Única condição com selo**, que é o conjunto rótulo, ícone e cor do bloco de veredito em `:294-310`. **Nenhum texto afirma precisão da implementação** nem que o serviço executou a comparação.

- **Cobertura:** as **seis identidades** enviadas e devolvidas, uma a uma, com origem persistida.
- **Resultado informado:** **pesos e CR informados e estruturalmente válidos em todas as entradas**, com envelope válido.
- **Veredito:** **aprovado, atribuído ao serviço** no próprio rótulo.

**O que contrariaria a predição.** Selo em qualquer outro estado; aprovação sem uma das condições de cobertura, resultado informado, envelope e origem; qualquer texto afirmando precisão matemática da implementação; ou o rótulo não atribuir a aprovação ao serviço.

**Controle atual, por leitura.** O bloco de veredito aprova por veracidade de `all_valid`, sem conferir cobertura nem forma, e `:388-399` afirma "atestando a precisão matemática da implementação" sob `:292`, sem consultar o veredito, trocando apenas o qualificador em `:393`.

## 9. P9, reprovação relatada pelo serviço

**Apresentação esperada.** Rótulo próprio de reprovação, **distinto de ressalvas por rótulo, descrição e detalhes**. Sem selo. Evidências disponíveis e validadas permanecem visíveis.

- **Cobertura:** as **seis identidades** enviadas e devolvidas, como em P8.
- **Resultado informado:** **pesos e CR informados e estruturalmente válidos em todas as entradas**, com envelope válido, como em P8.
- **Veredito:** **reprovado, atribuído ao serviço** no próprio rótulo.

**O que contrariaria a predição.** Um `all_valid` falso recebido em P4 a P7 aparecer como reprovação; a reprovação não ser distinguível de ressalvas por rótulo, descrição e detalhes; as evidências desaparecerem no estado reprovado; ou omitir qualquer uma das três propriedades.

**Controle atual, por leitura.** Não existe estado de reprovação. `:301` colapsa reprovação, veredito ausente e veredito malformado em "VALIDAÇÃO COM RESSALVAS".

## 10. Limites de inferência

- **Mudanças simultâneas.** A Fase 2 altera os nove estados de uma vez. Uma regressão atendida **não demonstra** qual alteração produziu qual efeito, e nenhuma atribuição de causa a uma mudança isolada se sustenta neste desenho.
- **O controle é por leitura.** Comparar por execução exige autorização própria, que este registro não pede e que a seção 4 da investigação restringe: **recalcular dado de produção não pode ser o meio** de alcançar um estado.
- **Alcançabilidade não é predita.** Como forçar cada um dos nove estados em ambiente controlado é tarefa própria. Alguns dependem de retorno malformado do serviço, que não está sob o nosso controle.
- **Fronteira do serviço.** Validade estrutural do retorno **não demonstra** que o serviço executou a comparação. O significado dos seus campos segue não verificável aqui.
- **Pendência declarada.** A regra de igualdade numérica entre os máximos do resumo e das entradas não está definida, e por isso nenhuma predição é feita sobre ela.
- **Valor do registro.** A predição vale por ser anterior ao código. Qualquer conferência posterior deve citar o commit que publica este arquivo e comparar contra o texto aqui, sem reescrevê-lo.
