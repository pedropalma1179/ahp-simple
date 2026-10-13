/**
 * lib/engine-version.ts
 *
 * F07: a versão do MOTOR de cálculo, gravada em cada execução (`executions/{executionId}.engineVersion`) e
 * em `metadata.version` do documento de cálculo.
 *
 * ⚠ **F07 A7, decisão 5-A: UMA ORIGEM, DUAS DERIVAÇÕES.** A versão é a TUPLA `VERSAO_DO_MOTOR` (maior, menor,
 * correção). Os dois textos que o sistema grava saem dela, em código, e não são mais dois literais
 * independentes:
 *
 *   - `ROTULO_DO_MOTOR_DA_EXECUCAO`  = `ahp-bocr-motor-5.0.0`  (os TRÊS componentes, unidos por `.`);
 *   - `VERSAO_CURTA_DO_CALCULO`      = `5.0`                  (SÓ os DOIS primeiros: `5.0.0` e `5.0` são textos
 *     diferentes, e concatenar os componentes sem o separador, ou tomar os três, erraria um dos dois).
 *
 * Os dois valores são os de antes de A7, byte a byte. O nome antigo desta constante (a do texto com o prefixo
 * `ahp-bocr-motor-`) foi aposentado porque colidia com a de `lib/ahp-engine.ts` (valor `engine-1.0.0`, outra
 * coisa, não importada por quem grava execuções); aquela segue intacta.
 *
 * ⚠ **REGRA DE ATUALIZAÇÃO.** A tupla **muda a cada alteração que possa mudar o resultado
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
 * ⚠ **O QUE ESTA VERSÃO É, E O QUE NÃO É.** É uma CONVENÇÃO mantida por quem altera o motor: não
 * há trava que obrigue a atualizá-la, e esquecer de fazê-lo faz duas execuções com resultados
 * diferentes carregarem o mesmo rótulo. Ela diz qual rótulo o motor tinha quando a execução foi
 * feita, e **não prova** que o código executado era o que o rótulo descreve. Para a identidade do
 * código implantado existe o `codeRevision` da execução (variável `VERCEL_GIT_COMMIT_SHA`), que
 * pode estar ausente e, quando está, é registrado como ausente.
 *
 * Formato: texto não vazio, sem significado de ordem para o sistema. Alterar o formato é alterar a
 * leitura das execuções já gravadas.
 */

/** A versão do motor: (maior, menor, correção). A ÚNICA origem; os dois textos abaixo saem dela. */
export const VERSAO_DO_MOTOR = [5, 0, 0] as const;

/** O texto gravado em `executions/{executionId}.engineVersion`: `ahp-bocr-motor-` + os TRÊS componentes. */
export const ROTULO_DO_MOTOR_DA_EXECUCAO = `ahp-bocr-motor-${VERSAO_DO_MOTOR.join('.')}`;

/** O texto gravado em `metadata.version` do documento de cálculo: os DOIS primeiros componentes. */
export const VERSAO_CURTA_DO_CALCULO = VERSAO_DO_MOTOR.slice(0, 2).join('.');
