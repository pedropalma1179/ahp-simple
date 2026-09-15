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
    forma: 'caixa_alta_ou_entidade',
    exemplo: '(SAATY, 1977)',
    porque:
      '⚠ **caixa alta ABNT e autor-entidade NÃO se distinguem pela forma**, e por isso são UMA entrada e não duas: `(SAATY, 1977)` e `(ABNT, 2023)` são o mesmo padrão, e separá-los exigiria saber se o token é sobrenome ou sigla. Os dois vão para revisão manual',
  },
  {
    forma: 'composta_em_um_parentese',
    exemplo: '(Saaty, 1977 + Saaty, 2003 + Forman & Peniwati, 1998)',
    porque:
      'agrega várias obras num parêntese só, e separá-las exigiria decidir a qual delas cada parte da afirmação pertence',
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
  /**
   * Sobrenomes dos autores da obra, **na ordem da publicação**.
   *
   * ⚠ **A ordem importa**, porque a comparação é de LISTA. Lista vazia significa
   * autoria não cadastrada, e aí a conferência **não é possível**: a linha sai
   * inconclusiva, e a identidade **não se reconstrói por sobrenome**.
   */
  autores: string[];
  ano: number;
  /** O trecho como foi enviado. */
  trecho: string;
  /**
   * Identificador estável do trecho ou da claim dentro da obra.
   *
   * ⚠ **É por aqui, e só por aqui, que uma divergência de A.16 se vincula.**
   * Ausente ou vazio **não gera correspondência**, e isso é diferente de o texto
   * estar vazio: identidade ausente e conteúdo ausente são situações distintas.
   */
  trechoId?: string;
  /**
   * ⚠ **Origens diferentes respondem perguntas diferentes.** `exemplo_do_system` é
   * texto de instrução, e **nunca** conta como evidência recuperada.
   */
  origem: 'recuperada' | 'exemplo_do_system';
}

/**
 * Claim cujos dois campos de citação divergem. A unidade é o TRECHO.
 *
 * ⚠ **A vinculação depende de `articleId` mais `trechoId`, nunca do texto.**
 * Contenção textual não é identidade em sentido nenhum, e `includes` com cadeia
 * vazia devolve verdadeiro sempre, o que fazia campo vazio casar com tudo.
 */
export interface ClaimDivergente {
  articleId: string;
  /** Sem ele, esta divergência não vincula a trecho algum. */
  trechoId?: string;
  /** Guardados para a conferência humana ler, **não para comparar**. */
  verbatimQuote: string;
  evidenceQuote: string;
}

/** Uma linha da tabela de quatro colunas. */
export interface LinhaConferencia {
  /** Coluna 1: o que o parecer escreveu. */
  afirmacao: string;
  fonteCitada: string;
  forma: FormaCitacao;
  /** Autores como o parecer os escreveu, na ordem. É onde o `some` falhava. */
  autoresExtraidos: string[];
  /** Ano como o parecer o escreveu. Separa obras do mesmo autor. */
  anoExtraido: number;
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

export interface FragmentoParaRevisao {
  /** O fragmento **como estava**, preservado. */
  fragmento: string;
  /** Qual forma de `FORMAS_FORA` foi reconhecida. */
  forma: string;
  /** A frase em que apareceu, para a revisão humana ter contexto. */
  afirmacao: string;
}

/** Todo parêntese que contenha um ano de quatro dígitos é candidato a citação. */
const RX_PARENTESE_COM_ANO = /\([^)]*\b\d{4}\b[^)]*\)/g;

/**
 * Reconhece as formas declaradas FORA, para que sejam REGISTRADAS.
 *
 * ⚠ **Descarte silencioso não é aceitável**, e interpretação parcial é pior: produz
 * entrada com a obra errada e **parece cobertura**. A forma sai do conjunto
 * interpretado **e entra no registro de revisão manual**, com o fragmento original.
 */
function formaExcluida(fragmento: string): string | null {
  const dentro = fragmento.replace(/^\(|\)$/g, '');

  // Composta: vários anos, ou soma explícita, num parêntese só.
  const anos = dentro.match(/\b\d{4}\b/g) ?? [];
  if (anos.length > 1 || /\s\+\s/.test(dentro)) return 'composta_em_um_parentese';

  // Secundária: a obra citada não é a fonte atribuída.
  if (/\b(citando|apud)\b/i.test(dentro)) return 'citacao_secundaria';

  // Caixa alta: o nome vem todo em maiúsculas.
  // ⚠ **Caixa alta ABNT e autor-entidade NÃO se distinguem pela forma**, e por isso
  // a mesma regra recolhe os dois. `(SAATY, 1977)` e `(ABNT, 2023)` são idênticos
  // como padrão; separá-los exigiria saber se o token é sobrenome ou sigla, que é
  // conhecimento que este módulo não tem. **Os dois vão para revisão manual.**
  const nome = dentro.split(',')[0].trim();
  if (nome.length > 1 && nome === nome.toUpperCase() && /[A-Z\u00c0-\u00de]/.test(nome)) {
    return 'caixa_alta_ou_entidade';
  }
  return null;
}

/**
 * Extrai as citações interpretadas E o que vai para revisão manual.
 *
 * ⚠ **Produzir uma entrada não demonstra que a obra certa foi extraída.** Foi esse
 * o critério frouxo que deixou passar a composta virando uma única obra de Saaty.
 */
export function extrairCitacoesComRevisao(parecer: string): {
  interpretadas: CitacaoExtraida[];
  revisaoManual: FragmentoParaRevisao[];
} {
  const interpretadas: CitacaoExtraida[] = [];
  const revisaoManual: FragmentoParaRevisao[] = [];

  for (const frase of separarFrases(parecer)) {
    // Primeiro o que sai: os fragmentos das formas declaradas fora.
    const excluidos: string[] = [];
    RX_PARENTESE_COM_ANO.lastIndex = 0;
    let p: RegExpExecArray | null;
    while ((p = RX_PARENTESE_COM_ANO.exec(frase)) !== null) {
      const forma = formaExcluida(p[0]);
      if (forma) {
        excluidos.push(p[0]);
        revisaoManual.push({ fragmento: p[0], forma, afirmacao: frase.trim() });
      }
    }

    // O restante da frase é o que se interpreta. Os fragmentos excluídos saem do
    // texto para que nenhuma parte deles seja lida como citação.
    let restante = frase;
    for (const e of excluidos) restante = restante.split(e).join(' ');

    const vistos = new Set<string>();
    for (const [rx, parentetica] of [
      [RX_PARENTETICA, true],
      [RX_NARRATIVA, false],
    ] as Array<[RegExp, boolean]>) {
      rx.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(restante)) !== null) {
        const bruto = m[1];
        const temEtAl = Boolean(m[2]);
        const ano = Number(m[3]);
        const resto = m[4] ?? '';
        const autores = separarAutores(bruto);
        if (autores.length === 0) continue;

        // Caixa alta também na forma narrativa, que o parêntese sozinho não pega.
        const primeiro = autores[0];
        if (primeiro.length > 1 && primeiro === primeiro.toUpperCase()) {
          revisaoManual.push({
            fragmento: m[0],
            forma: 'caixa_alta_ou_entidade',
            afirmacao: frase.trim(),
          });
          continue;
        }

        const chave = `${semAcento(autores.join('|'))}#${ano}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);

        const etAl = temEtAl ? ' et al.' : '';
        interpretadas.push({
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
  return { interpretadas, revisaoManual };
}

/**
 * Localiza as citações INTERPRETADAS do parecer.
 *
 * ⚠ **O que fica fora está em `FORMAS_FORA`**, e não é descartado: vai para
 * `extrairCitacoesComRevisao().revisaoManual`, com o fragmento preservado. O total
 * desta função **não substitui a leitura do parecer**.
 */
export function extrairCitacoes(parecer: string): CitacaoExtraida[] {
  return extrairCitacoesComRevisao(parecer).interpretadas;
}

/**
 * A citação e a evidência falam da mesma obra?
 *
 * ⚠ **Comparação de LISTA, e não interseção.** O `some` anterior dava a obra por
 * identificada com **qualquer autor em comum**, desde que o ano batesse: a citação
 * `Forman e Peniwati (1998)` recebia evidência de `Forman e Gass (1998)` e o
 * instrumento declarava evidência identificada.
 *
 * A regra, em dois casos:
 *
 * | Citação | Como comparar |
 * |---|---|
 * | **sem `et al.`** | lista **completa** de autores, **na ordem** |
 * | **com `et al.`** | os autores explicitados como **início** da lista da obra |
 *
 * ⚠ **Autoria incompatível não vira evidência identificada**, e autoria **ausente**
 * na evidência não permite a conferência: nos dois casos a obra não entra.
 */
function mesmaObra(cit: CitacaoExtraida, ev: EvidenciaEnviada): boolean {
  if (cit.ano !== ev.ano) return false;

  const daObra = ev.autores.map(semAcento);
  const daCitacao = cit.autores.map(semAcento);
  // Sem autoria cadastrada não há o que conferir, e supor seria reconstruir.
  if (daObra.length === 0 || daCitacao.length === 0) return false;

  const comEtAl = /et\s+al/i.test(cit.fonteCitada);
  if (comEtAl) {
    if (daCitacao.length > daObra.length) return false;
    return daCitacao.every((a, i) => daObra[i] === a);
  }
  return daObra.length === daCitacao.length && daCitacao.every((a, i) => daObra[i] === a);
}

/**
 * Este trecho tem divergência aberta de A.16?
 *
 * ⚠ **Por IDENTIFICADOR, nunca por texto.** A versão anterior comparava com
 * `includes` nos dois sentidos, e **contenção não é identidade**: um trecho que fosse
 * subcadeia de outro saía contaminado. Pior, `includes` com cadeia **vazia** devolve
 * verdadeiro sempre, então **campo de divergência vazio casava com qualquer trecho**.
 *
 * ⚠ **Identificador ausente ou vazio não gera correspondência**, dos dois lados.
 * **Texto vazio e identidade vazia são situações diferentes**, e só a segunda importa
 * aqui. Sem identidade recuperável não há vínculo, e nada se reconstrói por
 * semelhança de texto.
 */
function trechoDivergente(
  ev: EvidenciaEnviada,
  divergentes: ClaimDivergente[]
): boolean {
  const id = (ev.trechoId ?? '').trim();
  if (id === '') return false;
  return divergentes.some((d) => d.articleId === ev.articleId && (d.trechoId ?? '').trim() === id);
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
      autoresExtraidos: cit.autores,
      anoExtraido: cit.ano,
      obrasCandidatas,
      exemplosDoSystem,
      trechoDaFonte: null,
      triagem,
      motivoTriagem,
    };

    // Identidade e vinculação de divergência são verificações independentes.
    // A triagem acima usa o texto disponível mesmo quando faltam identificadores.
    const identidadeInsuficiente = recuperadas.some((e) =>
      [e.articleId, e.trechoId].some((id) => typeof id !== 'string' || id.trim() === '')
    );
    if (identidadeInsuficiente) {
      return {
        ...base,
        evidenciaEnviada: recuperadas.map((e) => e.trecho).join('\n\n'),
        resultado: 'inconclusiva' as const,
        motivo:
          'Identidade insuficiente: toda evidência recuperada precisa de articleId e trechoId não vazios. Não permite concluir sobre sustentação.',
      };
    }

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
    const evidenciaEnviada = recuperadas.map((e) => e.trecho).join('\n\n');
    const divergeNoTrecho = recuperadas.some((e) => trechoDivergente(e, divergentes));

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
