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
 * abrir a publicação, e a 4 é o julgamento que decorre das três.
 *
 * ⚠ **Identidade da obra vem dos DADOS, nunca do sobrenome.** A associação usa o
 * identificador da obra e o ano. Não sendo possível recuperar essa identidade do
 * que a conferência recebe, o resultado é **inconclusivo**, e a identidade **não se
 * reconstrói por coincidência de sobrenome**.
 *
 * ⚠ **Três condições distintas, e o motivo diz qual é:** fonte não localizada,
 * associação ambígua, e evidência identificada. As duas primeiras não permitem
 * concluir sobre sustentação; **nenhuma delas significa que a afirmação não se
 * sustenta**.
 */

/** Veredito de sustentação de UMA afirmação. */
export type ResultadoSustentacao =
  | 'sustentada'
  | 'parcialmente_sustentada'
  | 'nao_sustentada'
  | 'inconclusiva'
  | 'pendente_de_leitura';

/**
 * Estado da triagem de transcrição. ⚠ **TRÊS estados, e não um booleano.**
 * `nao_sinalizada` fica reservado à triagem que **rodou** e não sinalizou; quando
 * não há trecho para comparar, o estado é `nao_avaliada`, com motivo.
 */
export type EstadoTriagem = 'sinalizada' | 'nao_sinalizada' | 'nao_avaliada';

/**
 * Formas de citação COBERTAS pelo extrator.
 *
 * ⚠ **Derivadas por LEITURA do `system-prompt.ts` depois de A.33**, e não supostas.
 * Cobertura declarada sem inventário é promessa, não medida.
 */
export const FORMAS_COBERTAS = [
  'autor_ano',
  'parentetica',
  'et_al',
  'parentetica_et_al',
  'dois_autores_e_comercial',
  'dois_autores_e',
  'parentetica_e_comercial',
  'tres_autores',
  'com_localizador',
  'autor_hifenizado',
  'autor_acentuado',
] as const;

export type FormaCitacao = (typeof FORMAS_COBERTAS)[number];

/**
 * Formas que ficaram FORA, com o exemplo e a razão.
 *
 * ⚠ **O que fica fora é parte do inventário**, e não omissão: quem ler o total do
 * extrator precisa saber o que ele não conta.
 */
export const FORMAS_FORA: Array<{ forma: string; exemplo: string; porque: string }> = [
  {
    forma: 'citacao_secundaria',
    exemplo: '(citando Miller, 1956)',
    porque:
      'a obra secundária não é a fonte atribuída, e tratá-la como citação criaria linha para obra que o parecer não afirma ter consultado',
  },
  {
    forma: 'caixa_alta_abnt',
    exemplo: '(SAATY, 1977)',
    porque:
      'a forma em caixa alta acompanhava a citação direta ao final, que A.33 retirou do prompt; se voltar a ser ensinada, entra no inventário',
  },
  {
    forma: 'composta_em_um_parentese',
    exemplo: '(Saaty, 1977 + Saaty, 2003 + Forman & Peniwati, 1998)',
    porque:
      'agrega várias obras num parêntese só, e separá-las exigiria decidir a qual delas cada parte da afirmação pertence',
  },
  {
    forma: 'autor_entidade',
    exemplo: '(ABNT, 2023)',
    porque: 'o prompt não ensina autor-entidade depois de A.33, então não há forma a cobrir',
  },
];

/** Uma citação localizada no parecer, já decomposta. */
export interface CitacaoExtraida {
  afirmacao: string;
  fonteCitada: string;
  /** Sobrenomes, na ordem em que aparecem. */
  autores: string[];
  ano: number;
  forma: FormaCitacao;
}

/**
 * Evidência efetivamente enviada ao modelo, COM identidade.
 *
 * ⚠ **A conferência recebe isto, e não o texto bruto do contexto.** A identidade da
 * obra e do trecho precisa estar nos dados: reconstruí-la do texto por sobrenome foi
 * exatamente o defeito que esta versão corrige.
 */
export interface EvidenciaEnviada {
  articleId: string;
  /** Sobrenomes dos autores da obra. */
  autores: string[];
  ano: number;
  /** O trecho como foi enviado. */
  trecho: string;
  /**
   * ⚠ **Origens diferentes respondem perguntas diferentes.** `exemplo_do_system` é
   * texto de instrução, e **nunca** conta como evidência recuperada.
   */
  origem: 'recuperada' | 'exemplo_do_system';
}

/** Claim cujos dois campos de citação divergem. A unidade é o TRECHO. */
export interface ClaimDivergente {
  articleId: string;
  verbatimQuote: string;
  evidenceQuote: string;
}

/** Uma linha da tabela de quatro colunas. */
export interface LinhaConferencia {
  /** Coluna 1: o que o parecer escreveu. */
  afirmacao: string;
  fonteCitada: string;
  forma: FormaCitacao;
  /** Identificadores das obras que casaram por obra e ano. Vazio quando nenhuma. */
  obrasCandidatas: string[];
  /** Coluna 2: os trechos recuperados, quando a associação é única. */
  evidenciaEnviada: string | null;
  /** Exemplos do `system` que mencionam a obra. Registrados, nunca como evidência. */
  exemplosDoSystem: string[];
  /** Coluna 3: preenchida por leitura da publicação. */
  trechoDaFonte: string | null;
  /** Coluna 4. */
  resultado: ResultadoSustentacao;
  motivo: string;
  /** ⚠ Avaliação INDEPENDENTE da conclusão sobre sustentação. */
  triagem: EstadoTriagem;
  motivoTriagem: string;
}

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Um sobrenome: inicial maiúscula, aceitando acento, hífen e apóstrofo. */
const SOBRENOME = "[A-ZÀ-Þ][A-Za-zÀ-ÿ'’\\-]*";
/** Lista de sobrenomes unidos por vírgula, e comercial, ou a conjunção "e". */
const LISTA = `${SOBRENOME}(?:(?:\\s*,\\s*|\\s*&\\s*|\\s+e\\s+)${SOBRENOME})*`;

/** `Autores (ano...)`, a forma narrativa. */
const RX_NARRATIVA = new RegExp(`(${LISTA})(\\s+et\\s+al\\.?)?\\s*\\(\\s*(\\d{4})([^)]*)\\)`, 'g');
/** `(Autores, ano...)`, a forma parentética. */
const RX_PARENTETICA = new RegExp(`\\(\\s*(${LISTA})(\\s+et\\s+al\\.?)?\\s*,\\s*(\\d{4})([^)]*)\\)`, 'g');

/** Classifica a forma, para o inventário poder ser conferido. */
function classificar(
  autores: string[],
  temEtAl: boolean,
  parentetica: boolean,
  bruto: string,
  resto: string
): FormaCitacao {
  if (resto.trim().length > 0) return 'com_localizador';
  if (temEtAl) return parentetica ? 'parentetica_et_al' : 'et_al';
  if (autores.length >= 3) return 'tres_autores';
  if (autores.length === 2) {
    if (bruto.includes('&')) return parentetica ? 'parentetica_e_comercial' : 'dois_autores_e_comercial';
    return 'dois_autores_e';
  }
  if (/-/.test(autores[0])) return 'autor_hifenizado';
  if (semAcento(autores[0]) !== autores[0].toLowerCase()) return 'autor_acentuado';
  return parentetica ? 'parentetica' : 'autor_ano';
}

function separarAutores(bruto: string): string[] {
  return bruto
    .split(/\s*,\s*|\s*&\s*|\s+e\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Localiza citações no texto do parecer, nas formas que o prompt ensina.
 *
 * ⚠ **O que fica fora está em `FORMAS_FORA`**, com a razão. O total desta função
 * **não substitui a leitura do parecer**.
 */
export function extrairCitacoes(parecer: string): CitacaoExtraida[] {
  const achados: CitacaoExtraida[] = [];
  const frases = separarFrases(parecer);

  for (const frase of frases) {
    const vistos = new Set<string>();
    for (const [rx, parentetica] of [
      [RX_PARENTETICA, true],
      [RX_NARRATIVA, false],
    ] as Array<[RegExp, boolean]>) {
      rx.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(frase)) !== null) {
        const bruto = m[1];
        const temEtAl = Boolean(m[2]);
        const ano = Number(m[3]);
        const resto = m[4] ?? '';
        const autores = separarAutores(bruto);
        if (autores.length === 0) continue;

        const chave = `${semAcento(autores.join('|'))}#${ano}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);

        const etAl = temEtAl ? ' et al.' : '';
        achados.push({
          afirmacao: frase.trim(),
          fonteCitada: parentetica
            ? `(${bruto}${etAl}, ${ano}${resto})`
            : `${bruto}${etAl} (${ano}${resto})`,
          autores,
          ano,
          forma: classificar(autores, temEtAl, parentetica, bruto, resto),
        });
      }
    }
  }
  return achados;
}

/**
 * Abreviações cujo ponto NÃO termina frase.
 *
 * ⚠ **`al.` é a que importa, e foi medida:** partir a frase em todo ponto seguido de
 * espaço quebrava `Dodevska et al. (2023)` em `Dodevska et` e `al. (2023)`, e a
 * citação **desaparecia inteira**, porque nenhum dos dois pedaços casa. O padrão de
 * citação estava certo; quem errava era o separador de frases.
 */
const ABREVIACOES = ['al', 'eq', 'p', 'pp', 'cf', 'ed', 'vol', 'fig', 'et al'];

/** Separa frases sem partir abreviação. */
function separarFrases(texto: string): string[] {
  const brutas = texto.split(/(?<=[.!?])\s+/);
  const frases: string[] = [];
  for (const parte of brutas) {
    const anterior = frases[frases.length - 1];
    const terminaEmAbreviacao =
      anterior !== undefined &&
      ABREVIACOES.some((ab) => new RegExp(`\\b${ab}\\.$`, 'i').test(anterior.trim()));
    if (terminaEmAbreviacao) frases[frases.length - 1] = `${anterior} ${parte}`;
    else frases.push(parte);
  }
  return frases;
}

/** A citação e a evidência falam da mesma obra? Por ANO e por sobrenome da obra. */
function mesmaObra(cit: CitacaoExtraida, ev: EvidenciaEnviada): boolean {
  if (cit.ano !== ev.ano) return false;
  const daObra = ev.autores.map(semAcento);
  return cit.autores.some((a) => daObra.includes(semAcento(a)));
}

/** O trecho utilizado é um dos lados de uma divergência aberta de A.16? */
function trechoDivergente(
  articleId: string,
  trecho: string,
  divergentes: ClaimDivergente[]
): boolean {
  const t = semAcento(trecho).replace(/\s+/g, ' ').trim();
  return divergentes.some((d) => {
    if (d.articleId !== articleId) return false;
    const v = semAcento(d.verbatimQuote).replace(/\s+/g, ' ').trim();
    const e = semAcento(d.evidenceQuote).replace(/\s+/g, ' ').trim();
    return t === v || t === e || v.includes(t) || e.includes(t) || t.includes(v) || t.includes(e);
  });
}

/**
 * Monta as linhas da conferência.
 *
 * @param parecer texto gerado
 * @param evidencias o que foi enviado ao modelo, COM identidade de obra e origem
 * @param divergentes claims de A.16 com divergência não resolvida
 * @param triar função de triagem, injetada para manter este módulo sem política
 */
export function prepararConferencia(
  parecer: string,
  evidencias: EvidenciaEnviada[],
  divergentes: ClaimDivergente[],
  triar: (afirmacao: string, trecho: string) => { sinalizada: boolean }
): LinhaConferencia[] {
  return extrairCitacoes(parecer).map((cit) => {
    const casam = evidencias.filter((e) => mesmaObra(cit, e));
    const recuperadas = casam.filter((e) => e.origem === 'recuperada');
    const exemplosDoSystem = casam.filter((e) => e.origem === 'exemplo_do_system').map((e) => e.trecho);
    const obrasCandidatas = Array.from(new Set(recuperadas.map((e) => e.articleId)));

    // ⚠ **A triagem roda ANTES de qualquer conclusão, e independe dela.** Cópia e
    // suporte são perguntas distintas, e nenhum caminho pode deixá-la sem calcular.
    // Em ambiguidade, compara TODOS os candidatos: sinalizar suspeita não resolve
    // a associação, e nenhum candidato é escolhido por isso.
    const trechos = recuperadas.map((e) => e.trecho).filter((t) => t.trim().length > 0);
    let triagem: EstadoTriagem;
    let motivoTriagem: string;
    if (trechos.length === 0) {
      triagem = 'nao_avaliada';
      motivoTriagem =
        'nenhum trecho recuperado para esta fonte, então não há com o que comparar a afirmação';
    } else {
      const sinalizou = trechos.some((t) => triar(cit.afirmacao, t).sinalizada);
      triagem = sinalizou ? 'sinalizada' : 'nao_sinalizada';
      motivoTriagem = sinalizou
        ? `sobreposição léxica alta com ${trechos.length > 1 ? 'ao menos um dos trechos candidatos' : 'o trecho recuperado'}. Suspeita, nunca veredito.`
        : `triagem executada contra ${trechos.length} trecho(s), sem sobreposição acima do limiar`;
    }

    const base = {
      afirmacao: cit.afirmacao,
      fonteCitada: cit.fonteCitada,
      forma: cit.forma,
      obrasCandidatas,
      exemplosDoSystem,
      trechoDaFonte: null,
      triagem,
      motivoTriagem,
    };

    // Condição 1: fonte não localizada.
    if (obrasCandidatas.length === 0) {
      return {
        ...base,
        evidenciaEnviada: null,
        resultado: 'inconclusiva' as const,
        motivo:
          'Fonte NÃO localizada entre as evidências recuperadas. Não permite concluir sobre sustentação, e não significa que a afirmação não se sustenta.',
      };
    }

    // Condição 2: associação ambígua. ⚠ Registra-se, não se resolve.
    if (obrasCandidatas.length > 1) {
      return {
        ...base,
        evidenciaEnviada: recuperadas.map((e) => `[${e.articleId}] ${e.trecho}`).join('\n\n'),
        resultado: 'inconclusiva' as const,
        motivo: `Associação ambígua: ${obrasCandidatas.length} obras casam com esta citação (${obrasCandidatas.join(', ')}). Nenhuma foi escolhida. Não permite concluir sobre sustentação.`,
      };
    }

    // Condição 3: evidência identificada. A.16 pode ainda bloquear a conclusão.
    const articleId = obrasCandidatas[0];
    const evidenciaEnviada = recuperadas.map((e) => e.trecho).join('\n\n');
    const divergeNoTrecho = recuperadas.some((e) =>
      trechoDivergente(articleId, e.trecho, divergentes)
    );

    if (divergeNoTrecho) {
      return {
        ...base,
        evidenciaEnviada,
        resultado: 'inconclusiva' as const,
        motivo:
          'A.16: o TRECHO utilizado tem verbatim_quote e evidence.quote divergentes, e a divergência não está resolvida. Não se escolhe lado.',
      };
    }

    return {
      ...base,
      evidenciaEnviada,
      resultado: 'pendente_de_leitura' as const,
      motivo:
        'Evidência identificada. Coluna 3 depende de abrir a publicação, e a coluna 4 decorre dela.',
    };
  });
}
