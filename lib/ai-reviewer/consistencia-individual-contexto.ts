/**
 * lib/ai-reviewer/consistencia-individual-contexto.ts
 *
 * **O que o Parecer IA recebe sobre a consistência individual, e como ela é lida do pedido.** Módulo puro: sem rede,
 * sem Firestore, sem ler o ambiente. Quem produz os CRs é o motor (via `lib/consistencia-individual.ts`); aqui eles
 * só são (a) lidos do respondente, com o formato conferido, (b) contados sobre o painel ENVIADO e (c) escritos em
 * texto para o contexto.
 *
 * ⚠ **O texto descreve MATRIZES DE JULGAMENTO.** Nenhuma categoria de pessoa, nenhum score, nenhuma recomendação
 * de exclusão: a decisão de A.12 (item (c)) é remover o construto sem lastro do transporte e do contexto, e não
 * trocá-lo por outro. O único limiar é o de 0,10 por matriz (Saaty, 1977), que o contexto já cita.
 *
 * ⚠ **Ausência não vira zero.** Respondente sem CR calculado não entra em nenhuma contagem nem em nenhum
 * denominador; a condição aparece escrita. `0` é um resultado válido quando o motor o devolveu.
 *
 * ⚠ **Um resumo do painel completo não é enviado como o de um painel reduzido.** Todas as contagens saem da LISTA
 * ENVIADA, e o texto diz a população.
 */

import {
  ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL,
  LIMIAR_DE_ACEITACAO_POR_MATRIZ,
  MATRIZES_NAO_TRIVIAIS,
  formatarPercentualDoCR,
  matrizesAcimaDoLimiar,
  type ConsistenciaIndividual,
  type MatrizNaoTrivial,
} from '../consistencia-individual';

// ----------------------------------------------------------------------------
// Leitura do respondente
// ----------------------------------------------------------------------------

/** Uma diferença entre o resumo declarado pelo motor e o que as seis matrizes dão. Os DOIS valores se conservam. */
export interface ContradicaoDeResumo {
  campo: 'media' | 'maximo' | 'matrizGovernante';
  declarado: number | string | null;
  recomputado: number | string | null;
}

export type LeituraDaConsistencia =
  | { estado: 'recalculado'; consistencia: ConsistenciaIndividual; contradicoes: ContradicaoDeResumo[] }
  | { estado: 'indisponivel'; consistencia: ConsistenciaIndividual }
  | { estado: 'ausente_no_payload' }
  | { estado: 'invalido'; motivo: string };

const ehObjeto = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);
const finito = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Tolerância relativa para conferir o resumo do motor contra as seis matrizes (soma de seis doubles). */
const TOLERANCIA_DO_RESUMO = 1e-12;
const confere = (a: number, b: number) => Math.abs(a - b) <= TOLERANCIA_DO_RESUMO * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * Lê o bloco `consistenciaIndividual` de um respondente da requisição, conferindo o formato. ⚠ **Formato não
 * reconhecido NÃO é lido «no que der»**: vira `invalido`, com o motivo, e nenhum valor dele é usado.
 */
export function lerConsistenciaDoRespondente(respondente: unknown): LeituraDaConsistencia {
  const bruto = ehObjeto(respondente) ? respondente.consistenciaIndividual : undefined;
  if (bruto === undefined || bruto === null) return { estado: 'ausente_no_payload' };
  if (!ehObjeto(bruto)) return { estado: 'invalido', motivo: 'o bloco recebido não é um objeto' };
  if (bruto.esquema !== ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL) {
    return { estado: 'invalido', motivo: `esquema não reconhecido: ${String(bruto.esquema)}` };
  }
  if (bruto.fonte !== 'recalculado_dos_julgamentos' && bruto.fonte !== 'indisponivel') {
    return { estado: 'invalido', motivo: `fonte não reconhecida: ${String(bruto.fonte)}` };
  }
  if (typeof bruto.condicao !== 'string' || bruto.condicao === '') {
    return { estado: 'invalido', motivo: 'o bloco não traz a condição dos julgamentos' };
  }
  const crs = bruto.crPorMatriz;
  if (!ehObjeto(crs)) return { estado: 'invalido', motivo: 'o bloco não traz crPorMatriz' };
  for (const m of MATRIZES_NAO_TRIVIAIS) {
    if (!(m in crs)) return { estado: 'invalido', motivo: `crPorMatriz sem a matriz ${m}` };
    const v = crs[m];
    if (v !== null && !finito(v)) return { estado: 'invalido', motivo: `CR da matriz ${m} não é número finito nem nulo` };
  }
  const consistencia = bruto as unknown as ConsistenciaIndividual;

  if (bruto.fonte === 'indisponivel') {
    // ⚠ Indisponível com valor preenchido é contradição do próprio bloco: nenhum valor é usado.
    if (MATRIZES_NAO_TRIVIAIS.some(m => crs[m] !== null)) {
      return { estado: 'invalido', motivo: 'o bloco declara os CRs indisponíveis e traz valor em alguma matriz' };
    }
    return { estado: 'indisponivel', consistencia };
  }

  // fonte recalculada: as seis matrizes têm CR, e o resumo é conferido contra elas
  if (MATRIZES_NAO_TRIVIAIS.some(m => crs[m] === null)) {
    return { estado: 'invalido', motivo: 'o bloco declara os CRs recalculados e deixa alguma das seis matrizes sem valor' };
  }
  const seis = MATRIZES_NAO_TRIVIAIS.map(m => crs[m] as number);
  const contradicoes: ContradicaoDeResumo[] = [];
  const mediaRecomputada = seis.reduce((a, b) => a + b, 0) / seis.length;
  let governante: MatrizNaoTrivial = MATRIZES_NAO_TRIVIAIS[0];
  for (const m of MATRIZES_NAO_TRIVIAIS) if ((crs[m] as number) > (crs[governante] as number)) governante = m;
  const maximoRecomputado = crs[governante] as number;
  if (!finito(bruto.media) || !confere(bruto.media, mediaRecomputada)) {
    contradicoes.push({ campo: 'media', declarado: finito(bruto.media) ? bruto.media : null, recomputado: mediaRecomputada });
  }
  if (!finito(bruto.maximo) || !confere(bruto.maximo, maximoRecomputado)) {
    contradicoes.push({ campo: 'maximo', declarado: finito(bruto.maximo) ? bruto.maximo : null, recomputado: maximoRecomputado });
  }
  if (bruto.matrizGovernante !== governante) {
    contradicoes.push({
      campo: 'matrizGovernante',
      declarado: typeof bruto.matrizGovernante === 'string' ? bruto.matrizGovernante : null,
      recomputado: governante,
    });
  }
  return { estado: 'recalculado', consistencia, contradicoes };
}

// ----------------------------------------------------------------------------
// Contagens sobre o painel ENVIADO
// ----------------------------------------------------------------------------

export interface EstatisticaDaMatriz {
  /** Respondentes enviados com CR recalculado nesta matriz. */
  n: number;
  acimaDoLimiar: number;
  minimo: number | null;
  /** Média dos CRs DESTA matriz entre os respondentes. Não é a média das seis de um respondente. */
  mediaEntreRespondentes: number | null;
  maximo: number | null;
}

export interface ResumoDoPainelDeConsistencia {
  /** Tamanho da lista ENVIADA. */
  enviados: number;
  recalculados: number;
  /** Fonte `indisponivel`, por condição dos julgamentos. */
  indisponiveis: Record<string, number>;
  totalIndisponiveis: number;
  semBloco: number;
  invalidos: number;
  /** Respondentes recalculados cujo resumo declarado não confere com as seis matrizes. */
  comContradicao: number;
  /** `recalculados × 6`. Zero quando ninguém foi recalculado: nunca preenchido. */
  matrizesAvaliadas: number;
  matrizesAcimaDoLimiar: number;
  respondentesComAlgumaAcimaDoLimiar: number;
  porMatriz: Record<MatrizNaoTrivial, EstatisticaDaMatriz>;
}

export function resumirPainelDeConsistencia(leituras: LeituraDaConsistencia[]): ResumoDoPainelDeConsistencia {
  const indisponiveis: Record<string, number> = {};
  let recalculados = 0;
  let semBloco = 0;
  let invalidos = 0;
  let comContradicao = 0;
  let acima = 0;
  let comAlguma = 0;
  const valores: Record<MatrizNaoTrivial, number[]> = {
    BOCR: [], MAGNITUDE: [], 'SUB-B': [], 'SUB-O': [], 'SUB-C': [], 'SUB-R': [],
  };
  for (const l of leituras) {
    if (l.estado === 'ausente_no_payload') semBloco++;
    else if (l.estado === 'invalido') invalidos++;
    else if (l.estado === 'indisponivel') {
      const c = l.consistencia.condicao;
      indisponiveis[c] = (indisponiveis[c] ?? 0) + 1;
    } else {
      recalculados++;
      if (l.contradicoes.length > 0) comContradicao++;
      const a = matrizesAcimaDoLimiar(l.consistencia);
      acima += a.length;
      if (a.length > 0) comAlguma++;
      for (const m of MATRIZES_NAO_TRIVIAIS) valores[m].push(l.consistencia.crPorMatriz[m] as number);
    }
  }
  const porMatriz = {} as Record<MatrizNaoTrivial, EstatisticaDaMatriz>;
  for (const m of MATRIZES_NAO_TRIVIAIS) {
    const v = valores[m];
    porMatriz[m] = {
      n: v.length,
      acimaDoLimiar: v.filter(x => x > LIMIAR_DE_ACEITACAO_POR_MATRIZ).length,
      minimo: v.length ? Math.min(...v) : null,
      mediaEntreRespondentes: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null,
      maximo: v.length ? Math.max(...v) : null,
    };
  }
  return {
    enviados: leituras.length,
    recalculados,
    indisponiveis,
    totalIndisponiveis: Object.values(indisponiveis).reduce((a, b) => a + b, 0),
    semBloco,
    invalidos,
    comContradicao,
    matrizesAvaliadas: recalculados * MATRIZES_NAO_TRIVIAIS.length,
    matrizesAcimaDoLimiar: acima,
    respondentesComAlgumaAcimaDoLimiar: comAlguma,
    porMatriz,
  };
}

// ----------------------------------------------------------------------------
// Texto para o contexto
// ----------------------------------------------------------------------------

const ROTULO_DA_CONDICAO: Record<string, string> = {
  ausentes: 'ausentes',
  incompletos: 'incompletos',
  invalidos: 'inválidos',
  duplicados: 'com par respondido mais de uma vez',
  mistos: 'com mais de um tipo de defeito',
  nao_calculavel: 'não calculáveis',
};
const rotuloDaCondicao = (c: string) => ROTULO_DA_CONDICAO[c] ?? c;

const pct = (v: number | null) => (v === null ? 'não calculado' : formatarPercentualDoCR(v));

/**
 * O trecho da linha do respondente que descreve a consistência individual dele. Substitui o antigo
 * «CR: x% | Status: y», que apresentava o cache legado como CR e um rótulo de pessoa.
 */
export function trechoDaLinhaDoRespondente(l: LeituraDaConsistencia): string {
  switch (l.estado) {
    case 'recalculado': {
      const c = l.consistencia;
      const seis = MATRIZES_NAO_TRIVIAIS.map(m => `${m} ${pct(c.crPorMatriz[m])}`).join(' | ');
      const base =
        `CR por matriz (recalculado dos julgamentos): ${seis} | média das 6 matrizes: ${pct(c.media)} | ` +
        `máximo: ${pct(c.maximo)} (matriz governante: ${c.matrizGovernante ?? 'não identificada'})`;
      if (l.contradicoes.length === 0) return base;
      const dif = l.contradicoes
        .map(d => {
          const fmt = (v: number | string | null) => (typeof v === 'number' ? formatarPercentualDoCR(v) : v === null ? 'ausente' : v);
          return `${d.campo}: declarado pelo motor ${fmt(d.declarado)}, recomputado das seis matrizes ${fmt(d.recomputado)}`;
        })
        .join('; ');
      return `${base} | ⚠ O RESUMO DECLARADO NÃO CONFERE com as seis matrizes (${dif}); os dois valores ficam conservados, e nenhum é escolhido`;
    }
    case 'indisponivel': {
      const c = l.consistencia;
      return (
        `CR por matriz: NÃO DISPONÍVEL — julgamentos ${rotuloDaCondicao(c.condicao)}` +
        `${c.detalhe ? ` (${c.detalhe})` : ''}. Nenhum valor é apresentado, e nenhum é preenchido com zero`
      );
    }
    case 'ausente_no_payload':
      return 'CR por matriz: NÃO RECEBIDO nesta requisição (o respondente não traz o bloco de consistência individual). Nenhum valor é apresentado';
    case 'invalido':
      return `CR por matriz: BLOCO RECEBIDO COM FORMATO NÃO RECONHECIDO (${l.motivo}). Nenhum valor é apresentado`;
  }
}

/** O cabeçalho das contagens do painel. ⚠ Mora no módulo do vínculo, que o nomeia junto das outras frases da lista. */
export function blocoDeConsistenciaDoPainel(r: ResumoDoPainelDeConsistencia, cabecalho: string): string {
  const L: string[] = [];
  const semCR = r.totalIndisponiveis + r.semBloco + r.invalidos;
  const porCondicao = [
    ...Object.entries(r.indisponiveis).map(([c, n]) => `julgamentos ${rotuloDaCondicao(c)}: ${n}`),
    ...(r.semBloco ? [`bloco não recebido: ${r.semBloco}`] : []),
    ...(r.invalidos ? [`bloco com formato não reconhecido: ${r.invalidos}`] : []),
  ].join('; ');
  L.push(cabecalho.replace(/\n$/, ''));
  L.push(
    `- Respondentes enviados: ${r.enviados}. Com CR recalculado dos julgamentos nas 6 matrizes: ${r.recalculados}. ` +
      `Sem CR: ${semCR}${semCR > 0 ? ` (${porCondicao})` : ''}.`
  );
  if (r.recalculados === 0) {
    L.push(
      '- Nenhum respondente enviado tem CR recalculado nas 6 matrizes: nenhuma contagem de matrizes é apresentada, e nenhum valor é preenchido com zero.'
    );
  } else if (r.comContradicao > 0) {
    L.push(
      `- ⚠ Contagens de matrizes NÃO apresentadas: o resumo declarado de ${r.comContradicao} respondente(s) não confere com as suas seis matrizes (ver as linhas acima, que conservam os dois valores).`
    );
  } else {
    const lim = LIMIAR_DE_ACEITACAO_POR_MATRIZ.toFixed(2);
    L.push(
      `- Matrizes avaliadas: ${r.matrizesAvaliadas} (${r.recalculados} respondentes × 6 matrizes não triviais: ${MATRIZES_NAO_TRIVIAIS.join(', ')}). ` +
        'As vinte matrizes de alternativas (2×2) ficam fora: o CR delas é zero por construção.'
    );
    L.push(
      `- Matrizes com CR > ${lim} (limiar de aceitação por matriz, Saaty, 1977): ${r.matrizesAcimaDoLimiar} de ${r.matrizesAvaliadas} ` +
        `(${((r.matrizesAcimaDoLimiar / r.matrizesAvaliadas) * 100).toFixed(1)}%).`
    );
    L.push(`- Respondentes com ao menos uma matriz com CR > ${lim}: ${r.respondentesComAlgumaAcimaDoLimiar} de ${r.recalculados}.`);
  }
  L.push(
    '- Como ler: o CR descreve uma matriz de julgamentos, e não classifica a pessoa. A contagem de matrizes acima do limiar é descritiva e não é critério de exclusão de participantes. ' +
      '«Média das 6 matrizes» e «máximo» são de UM respondente; «média entre respondentes» é a média dos CRs de UMA matriz sobre os respondentes enviados. ' +
      'Nenhuma delas é o CR das matrizes AGREGADAS por média geométrica, que consta na seção de consistência agregada.'
  );
  return L.join('\n');
}

/** O conteúdo da seção «Estatísticas por Dimensão BOCR»: o CR por matriz, sobre o painel enviado. */
export function estatisticasPorMatriz(r: ResumoDoPainelDeConsistencia): string {
  if (r.recalculados === 0) {
    return '⚠️ Não disponíveis: nenhum respondente enviado tem CR recalculado dos julgamentos. Nenhum valor por matriz é apresentado, e nenhum é preenchido com zero.';
  }
  if (r.comContradicao > 0) {
    return `⚠️ Não apresentadas: o resumo declarado de ${r.comContradicao} respondente(s) não confere com as suas seis matrizes.`;
  }
  const lim = LIMIAR_DE_ACEITACAO_POR_MATRIZ.toFixed(2);
  const linhas = MATRIZES_NAO_TRIVIAIS.map(m => {
    const e = r.porMatriz[m];
    return (
      `- ${m}: n = ${e.n} respondentes com CR; acima de ${lim}: ${e.acimaDoLimiar}; ` +
      `mínimo ${pct(e.minimo)}; média entre respondentes ${pct(e.mediaEntreRespondentes)}; máximo ${pct(e.maximo)}`
    );
  });
  return [
    `CR individual por matriz, sobre os ${r.recalculados} respondentes enviados com CR recalculado dos julgamentos (etapa: envio):`,
    ...linhas,
  ].join('\n');
}
