/**
 * lib/identificacao-da-execucao.ts
 *
 * **F07, A3: a EXECUÇÃO identificada em tudo o que sai da tela.** Módulo PURO, sem Node, sem Firestore
 * e sem React: roda no navegador, nas exportações e no texto copiado do Parecer.
 *
 * ⚠ **Os valores vêm da EXECUÇÃO LIDA, e nunca de uma constante do código.** Este módulo NÃO importa
 * `lib/engine-version.ts`: a versão do motor que uma saída mostra é a que a execução trouxe (a
 * gravada em `executions/{executionId}.engineVersion`), e não a do código que está rodando agora no
 * navegador. As duas podem diferir, e é exatamente por isso que a execução a carrega. Um teste lê o
 * fonte deste arquivo e das telas e reprova se `ENGINE_VERSION` aparecer.
 *
 * ⚠ **AUSENTE é apresentado como AUSENTE.** Um campo que a execução não tem (documento anterior a F07,
 * `codeRevision` não definido no ambiente, projeto sem `updatedAt`) sai como a palavra "ausente", e
 * nunca é preenchido com um valor plausível nem omitido da linha. Uma saída sem a linha seria
 * indistinguível de uma saída antiga.
 *
 * ⚠ **O QUE A IDENTIFICAÇÃO NÃO É.** Não prova que a execução seja a referência do projeto (isso é o
 * painel da referência), não prova que o código implantado era o do `codeRevision`, e a versão do motor
 * é uma CONVENÇÃO mantida por quem altera o motor (ver `lib/engine-version.ts`). Identifica QUAL execução
 * produziu os números, com os rótulos que ela mesma gravou.
 */

export const AUSENTE = 'ausente';

export interface IdentificacaoDaExecucao {
  executionId: string | null;
  engineVersion: string | null;
  codeRevision: string | null;
  calculatedAt: string | null;
  projectUpdatedAt: string | null;
}

const textoOuNull = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);

/** Lê os campos de identificação do documento EXIBIDO. Não preenche nada: o que falta é `null`. */
export function identificarExecucao(documento: Record<string, any> | null | undefined): IdentificacaoDaExecucao {
  const d = documento ?? {};
  return {
    executionId: textoOuNull(d.executionId),
    engineVersion: textoOuNull(d.engineVersion),
    codeRevision: textoOuNull(d.codeRevision),
    calculatedAt: textoOuNull(d.calculatedAt),
    projectUpdatedAt: textoOuNull(d.projectUpdatedAt),
  };
}

export const valorOuAusente = (x: string | null | undefined): string => (x === null || x === undefined || x === '' ? AUSENTE : x);

/** Os rótulos, em ordem. Os mesmos em todas as saídas. */
export const ROTULOS_DA_IDENTIFICACAO = {
  executionId: 'Execução',
  engineVersion: 'Motor de cálculo (gravado na execução)',
  codeRevision: 'Código implantado (gravado na execução)',
  calculatedAt: 'Calculada em',
  projectUpdatedAt: 'Marcador de atualização do projeto na execução',
} as const;

const ORDEM = ['executionId', 'engineVersion', 'codeRevision', 'calculatedAt', 'projectUpdatedAt'] as const;

/** Rótulo e valor (ou "ausente"), na ordem fixa. */
export function linhasDeIdentificacao(id: IdentificacaoDaExecucao | null | undefined): [string, string][] {
  const i = id ?? identificarExecucao(null);
  return ORDEM.map(k => [ROTULOS_DA_IDENTIFICACAO[k], valorOuAusente(i[k])] as [string, string]);
}

/**
 * ⚠ O rótulo "Software" das exportações é um texto FIXO do código da tela, e não é lido da execução.
 * A versão do motor que calculou é a da linha "Motor de cálculo (gravado na execução)".
 */
export const NOTA_DO_ROTULO_DE_SOFTWARE =
  'O rótulo "Software" é fixo no código da exportação e não é lido da execução; a versão do motor que calculou é a da linha "Motor de cálculo".';

/** Uma linha só, para a legenda da imagem do gráfico. */
export function legendaDeImagem(id: IdentificacaoDaExecucao | null | undefined): string {
  const i = id ?? identificarExecucao(null);
  return `Execução ${valorOuAusente(i.executionId)} · motor ${valorOuAusente(i.engineVersion)} · código ${valorOuAusente(i.codeRevision)} · calculada em ${valorOuAusente(i.calculatedAt)}`;
}

/**
 * O RODAPÉ do texto copiado do Parecer. Vem DEPOIS do parecer, que segue inteiro e na mesma posição
 * (o prefixo da classe A do vínculo continua ANTES do parecer). Sem identificação, o rodapé existe e
 * diz "ausente" em cada campo: uma cópia sem rodapé seria indistinguível de uma cópia antiga.
 */
export function rodapeDeCopia(id: IdentificacaoDaExecucao | null | undefined): string {
  const i = id ?? identificarExecucao(null);
  return (
    '\n\n---\n\n[Informação do sistema — não integra o texto gerado do parecer] ' +
    `Execução analisada: ${valorOuAusente(i.executionId)}; motor de cálculo: ${valorOuAusente(i.engineVersion)}; ` +
    `código implantado: ${valorOuAusente(i.codeRevision)}; calculada em: ${valorOuAusente(i.calculatedAt)}.\n`
  );
}

/** Linhas de comentário LaTeX (`% ...`), cada uma terminada por `\n`. */
export function comentarioLatex(id: IdentificacaoDaExecucao | null | undefined): string {
  return (
    linhasDeIdentificacao(id)
      .map(([rotulo, valor]) => `% ${rotulo}: ${valor.replace(/\r?\n/g, ' ')}\n`)
      .join('') + `% ${NOTA_DO_ROTULO_DE_SOFTWARE}\n`
  );
}

const campoCsv = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Linhas CSV `Rótulo:,valor`, cada uma terminada por `\n`. */
export function linhasCsv(id: IdentificacaoDaExecucao | null | undefined): string {
  return (
    linhasDeIdentificacao(id)
      .map(([rotulo, valor]) => `${campoCsv(rotulo + ':')},${campoCsv(valor)}\n`)
      .join('') + `${campoCsv('Nota:')},${campoCsv(NOTA_DO_ROTULO_DE_SOFTWARE)}\n`
  );
}

/** Linhas para uma planilha: `[rótulo + ':', valor]`, e a nota. */
export function linhasXlsx(id: IdentificacaoDaExecucao | null | undefined): string[][] {
  return [...linhasDeIdentificacao(id).map(([rotulo, valor]) => [`${rotulo}:`, valor]), ['Nota:', NOTA_DO_ROTULO_DE_SOFTWARE]];
}

/** Objeto para o JSON exportado: cada campo, `null` quando ausente (e não omitido). */
export function objetoJson(id: IdentificacaoDaExecucao | null | undefined): Record<(typeof ORDEM)[number], string | null> & { observacao: string } {
  const i = id ?? identificarExecucao(null);
  return {
    executionId: i.executionId,
    engineVersion: i.engineVersion,
    codeRevision: i.codeRevision,
    calculatedAt: i.calculatedAt,
    projectUpdatedAt: i.projectUpdatedAt,
    observacao: 'null significa ausente na execução lida; o valor nunca foi preenchido por esta exportação.',
  };
}
