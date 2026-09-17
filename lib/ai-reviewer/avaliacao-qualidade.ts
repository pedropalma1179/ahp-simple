/**
 * lib/ai-reviewer/avaliacao-qualidade.ts
 *
 * A.12: distingue **avaliação de qualidade DISPONÍVEL** de **valor produzido por
 * fallback**, dos dois lados da requisição.
 *
 * ⚠ **A presença de `byStatus` NÃO é critério.** Era assim que o defeito passava: a
 * tela montava `byStatus` com `CONFIÁVEL` igual ao número de respostas quando não
 * havia análise nenhuma, e o backend recebia isso como avaliação existente.
 *
 * ⚠ **Ausência não autoriza resultado favorável nem desfavorável.** Quem decide o
 * que fazer com cada estado é quem consome: a rota suspende a classificação global
 * quando a avaliação não está disponível, e preserva o comportamento existente
 * quando está.
 *
 * ⚠ **Isto não é a validação do parecer, de A.27.** Aquela julga o TEXTO gerado;
 * esta descreve a disponibilidade da avaliação de qualidade dos DADOS.
 */

/** Os três estados da avaliação, e só estes. */
export type EstadoAvaliacaoQualidade = 'disponivel' | 'ausente' | 'incompleta';

export interface AvaliacaoQualidade {
  estado: EstadoAvaliacaoQualidade;
  /** Por que não está disponível, ou `null` quando está. */
  motivo: string | null;
  /** De onde a avaliação veio, ou de onde se concluiu a ausência. */
  fonte: string;
}

export const ESTADOS_AVALIACAO: EstadoAvaliacaoQualidade[] = ['disponivel', 'ausente', 'incompleta'];

export const MOTIVO_AUSENTE =
  'Qualidade individual não avaliada: a requisição não traz avaliação por respondente.';
export const MOTIVO_INCOMPLETA =
  'Avaliação de qualidade incompleta: há respondentes sem CR individual, e a distribuição não pode ser tratada como completa.';
export const MOTIVO_DECLARADA_SEM_DADOS =
  'Avaliação declarada disponível, mas a requisição não traz CR por respondente.';

/** O CR individual de um respondente, em qualquer das formas que o payload usa. */
function crDoRespondente(r: any): number | null {
  for (const valor of [r?.cr, r?.metrics?.avgCR, r?.avgCR, r?.consistency?.cr]) {
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  }
  return null;
}

/** Há CR individual para TODOS os respondentes listados? */
export function medicaoPorRespondente(respondentes: unknown): { total: number; comCR: number } {
  const lista = Array.isArray(respondentes) ? respondentes : [];
  return { total: lista.length, comCR: lista.filter((r) => crDoRespondente(r) !== null).length };
}

/**
 * Classifica a avaliação de uma requisição RECEBIDA pela rota.
 *
 * A declaração do cliente vale, e é **conferida**: declarar disponível sem CR por
 * respondente vira `incompleta`. Sem declaração, o legado é classificado pela
 * existência de CR individual — nunca por `byStatus`.
 */
export function classificarAvaliacaoRecebida(raw: any): AvaliacaoQualidade {
  const declarada = raw?.avaliacaoDeQualidade;
  const { total, comCR } = medicaoPorRespondente(raw?.qualityAnalysis?.respondents);
  const temMedicao = total > 0 && comCR === total;

  if (declarada && ESTADOS_AVALIACAO.includes(declarada.estado)) {
    if (declarada.estado !== 'disponivel') {
      return {
        estado: declarada.estado,
        motivo: declarada.motivo || (declarada.estado === 'ausente' ? MOTIVO_AUSENTE : MOTIVO_INCOMPLETA),
        fonte: 'declarada na requisição',
      };
    }
    if (temMedicao) return { estado: 'disponivel', motivo: null, fonte: 'declarada na requisição, com CR por respondente' };
    return { estado: 'incompleta', motivo: MOTIVO_DECLARADA_SEM_DADOS, fonte: 'declarada na requisição, conferida' };
  }

  // Legado: sem declaração.
  if (temMedicao) return { estado: 'disponivel', motivo: null, fonte: 'inferida: lista de respondentes com CR individual' };
  if (total > 0) {
    return {
      estado: 'incompleta',
      motivo: `${MOTIVO_INCOMPLETA} Medido: ${comCR} de ${total} respondentes com CR.`,
      fonte: 'inferida: lista de respondentes sem CR completo',
    };
  }
  return {
    estado: 'ausente',
    motivo: MOTIVO_AUSENTE,
    fonte: 'inferida: requisição sem lista de respondentes; byStatus sozinho não é avaliação',
  };
}

/**
 * Classifica o que a TELA tem antes de montar a requisição.
 *
 * ⚠ A tela deixa de fabricar distribuição: sem respondentes avaliados, o estado é
 * `ausente`; com respondentes sem CR, `incompleta`.
 */
export function classificarAvaliacaoDaTela(entrada: {
  respondentesAvaliados: unknown[];
  respostasAtivas: unknown[];
}): AvaliacaoQualidade {
  const analise = medicaoPorRespondente(entrada.respondentesAvaliados);
  if (analise.total > 0) {
    if (analise.comCR === analise.total) {
      return { estado: 'disponivel', motivo: null, fonte: 'análise de qualidade dos respondentes ativos' };
    }
    return {
      estado: 'incompleta',
      motivo: `${MOTIVO_INCOMPLETA} Medido: ${analise.comCR} de ${analise.total} respondentes com CR.`,
      fonte: 'análise de qualidade dos respondentes ativos, sem CR completo',
    };
  }

  // Sem análise de qualidade: vale o CR das próprias respostas, quando existe.
  const respostas = medicaoPorRespondente(entrada.respostasAtivas);
  if (respostas.total > 0 && respostas.comCR === respostas.total) {
    return { estado: 'disponivel', motivo: null, fonte: 'CR individual das respostas ativas' };
  }
  if (respostas.comCR > 0) {
    return {
      estado: 'incompleta',
      motivo: `${MOTIVO_INCOMPLETA} Medido: ${respostas.comCR} de ${respostas.total} respostas com CR.`,
      fonte: 'CR individual das respostas ativas, incompleto',
    };
  }
  return {
    estado: 'ausente',
    motivo: respostas.total > 0
      ? `${MOTIVO_AUSENTE} Há ${respostas.total} respostas sem análise individual de consistência.`
      : MOTIVO_AUSENTE,
    fonte: 'tela: nenhuma análise de qualidade individual disponível',
  };
}

/** Só `disponivel` autoriza classificação global. */
export function qualidadeDisponivel(avaliacao?: AvaliacaoQualidade | null): boolean {
  return avaliacao?.estado === 'disponivel';
}

/** O motivo a exibir e a registrar quando a classificação fica suspensa. */
export function motivoDaSuspensao(avaliacao?: AvaliacaoQualidade | null): string {
  if (!avaliacao) return MOTIVO_AUSENTE;
  return avaliacao.motivo || (avaliacao.estado === 'ausente' ? MOTIVO_AUSENTE : MOTIVO_INCOMPLETA);
}

/** O rótulo fixo da apresentação, quando a nota não é calculada. */
export const ROTULO_NOTA_SUSPENSA = 'Nota não calculada: qualidade individual não avaliada';
