/**
 * lib/rag/conferencia-sustentacao.ts
 *
 * Prepara a CONFERÊNCIA DE SUSTENTAÇÃO da etapa 4 de A.33.
 *
 * Monta a tabela de quatro colunas por afirmação com citação, preenchendo o que a
 * máquina pode preencher e deixando explícito o que depende de leitura da
 * publicação pelo pesquisador.
 *
 * ⚠ **Não conclui sustentação.** As colunas 1 e 2 são mecânicas; a coluna 3 exige
 * abrir a publicação, e a 4 é o julgamento que decorre das três. **A equipe prepara,
 * e o que depende da publicação fica apontado como tal.**
 *
 * ⚠ **A.16: divergência não resolvida vira INCONCLUSIVA.** Quando o trecho usado
 * vem de uma claim cujos `verbatim_quote` e `evidence.quote` divergem, o resultado
 * já sai `inconclusiva`, **sem escolher lado**. Não é falha da conferência: é o que
 * o registro de A.16 permite concluir enquanto a divergência estiver aberta.
 */

/** Veredito de sustentação de UMA afirmação. */
export type ResultadoSustentacao =
  | 'sustentada'
  | 'parcialmente_sustentada'
  | 'nao_sustentada'
  | 'inconclusiva'
  | 'pendente_de_leitura';

/** Uma linha da tabela de quatro colunas. */
export interface LinhaConferencia {
  /** Coluna 1: o que o parecer escreveu. */
  afirmacao: string;
  /** Autor e ano como o parecer os apresentou. */
  fonteCitada: string;
  /** Coluna 2: o que foi enviado ao modelo, se localizado no contexto. */
  evidenciaEnviada: string | null;
  /** Coluna 3: preenchida por leitura da publicação. `null` enquanto pendente. */
  trechoDaFonte: string | null;
  /** Coluna 4. */
  resultado: ResultadoSustentacao;
  /** Por que o resultado é este, em uma linha. */
  motivo: string;
  /** ⚠ Suspeita de transcrição, quando a triagem sinalizou. Nunca veredito. */
  suspeitaDeTranscricao: boolean;
}

/** Claim cujos dois campos de citação divergem, e por isso bloqueia conclusão. */
export interface ClaimDivergente {
  articleId: string;
  verbatimQuote: string;
  evidenceQuote: string;
}

/**
 * Localiza citações no texto do parecer, na forma Autor (ano).
 *
 * ⚠ **Pega a forma que a instrução nova ensina**, autor e ano sem página. Citação
 * escrita de outro jeito escapa, e por isso o total desta função **não substitui a
 * leitura do parecer**: ela organiza, não certifica cobertura.
 */
export function extrairCitacoes(parecer: string): Array<{ afirmacao: string; fonteCitada: string }> {
  const achados: Array<{ afirmacao: string; fonteCitada: string }> = [];
  // Frase: do começo ou de um ponto final até o próximo ponto final.
  const frases = parecer.split(/(?<=[.!?])\s+/);
  const rxCitacao = /([A-ZÀ-Ý][\wÀ-ÿ&.\-]*(?:\s+(?:e|&|et\s+al\.?)\s*[\wÀ-ÿ.\-]*)?)\s*\((\d{4})\)/g;
  for (const frase of frases) {
    rxCitacao.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rxCitacao.exec(frase)) !== null) {
      achados.push({ afirmacao: frase.trim(), fonteCitada: `${m[1].trim()} (${m[2]})` });
    }
  }
  return achados;
}

/**
 * Monta as linhas da conferência.
 *
 * @param parecer texto gerado
 * @param contexto `system` mais `messages`, concatenados, como foram enviados
 * @param divergentes claims de A.16 com divergência não resolvida
 * @param triar função de triagem, injetada para manter este módulo sem política
 */
export function prepararConferencia(
  parecer: string,
  contexto: string,
  divergentes: ClaimDivergente[],
  triar: (afirmacao: string, trecho: string) => { sinalizada: boolean }
): LinhaConferencia[] {
  return extrairCitacoes(parecer).map(({ afirmacao, fonteCitada }) => {
    const sobrenome = fonteCitada.split(/[\s(]/)[0].toLowerCase();

    // Coluna 2: o BLOCO do contexto que menciona esta fonte, quando houver.
    // ⚠ **Bloco, e não linha, e a diferença foi achada por teste.** Nos templates
    // do prompt a citação e o `Fundamento:` são linhas VIZINHAS do mesmo bloco:
    // filtrar por linha separava o nome do autor do trecho que ele acompanha, e a
    // triagem passava a comparar a afirmação com um cabeçalho sem conteúdo.
    const blocosDoContexto = contexto
      .split(/\n\s*\n/)
      .filter((b) => b.toLowerCase().includes(sobrenome));
    const evidenciaEnviada = blocosDoContexto.length > 0 ? blocosDoContexto.join('\n\n') : null;

    // ⚠ A.16 primeiro: divergência aberta impede concluir, e nada depois disso muda.
    const divergente = divergentes.find((d) => d.articleId.toLowerCase().includes(sobrenome));
    if (divergente) {
      return {
        afirmacao,
        fonteCitada,
        evidenciaEnviada,
        trechoDaFonte: null,
        resultado: 'inconclusiva' as const,
        motivo:
          'A.16: verbatim_quote e evidence.quote divergem nesta fonte, e a divergência não está resolvida. Não se escolhe lado.',
        suspeitaDeTranscricao: false,
      };
    }

    const suspeita = blocosDoContexto.some((b) => triar(afirmacao, b).sinalizada);

    return {
      afirmacao,
      fonteCitada,
      evidenciaEnviada,
      trechoDaFonte: null,
      resultado: 'pendente_de_leitura' as const,
      motivo: evidenciaEnviada
        ? 'Coluna 2 localizada no contexto. Coluna 3 depende de abrir a publicação.'
        : 'Fonte NÃO localizada no contexto enviado. Confira se o parecer citou obra que não recebeu.',
      suspeitaDeTranscricao: suspeita,
    };
  });
}
