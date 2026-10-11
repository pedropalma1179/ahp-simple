/**
 * lib/engine-version.ts
 *
 * F07: a versão do MOTOR de cálculo, gravada em cada execução (`executions/{executionId}.engineVersion`).
 *
 * ⚠ **REGRA DE ATUALIZAÇÃO.** Esta constante **muda a cada alteração que possa mudar o resultado
 * numérico** de uma execução, e **só** por isso. Entram, entre outras:
 *
 *   - a derivação de prioridades (autovetor, média geométrica, iteração de potência);
 *   - a agregação dos julgamentos (AIJ, média geométrica, reciprocidade);
 *   - a normalização;
 *   - a síntese (as cinco fórmulas, os pesos de rescaling, o tratamento de prioridade negativa);
 *   - a tabela de índice aleatório e o cálculo de CI/CR;
 *   - a SELEÇÃO DAS ENTRADAS: quem entra no cálculo (completude, órfãs, deduplicação, exclusões) e
 *     a forma de identificar o respondente.
 *
 * **Não muda** por interface, texto, exportação, registro, rótulo, mensagem de erro, ordem de
 * campos de apresentação nem por uma alteração que só reorganize o código sem poder mudar número.
 *
 * ⚠ **O QUE ESTA CONSTANTE É, E O QUE NÃO É.** É uma CONVENÇÃO mantida por quem altera o motor: não
 * há trava que obrigue a atualizá-la, e esquecer de fazê-lo faz duas execuções com resultados
 * diferentes carregarem o mesmo rótulo. Ela diz qual rótulo o motor tinha quando a execução foi
 * feita, e **não prova** que o código executado era o que o rótulo descreve. Para a identidade do
 * código implantado existe o `codeRevision` da execução (variável `VERCEL_GIT_COMMIT_SHA`), que
 * pode estar ausente e, quando está, é registrado como ausente.
 *
 * Formato: texto não vazio, sem significado de ordem para o sistema. Alterar o formato é alterar a
 * leitura das execuções já gravadas.
 */
export const ENGINE_VERSION = 'ahp-bocr-motor-5.0.0';
