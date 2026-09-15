/**
 * lib/__tests__/a33-identidade-regressao.test.ts
 *
 * Regressões dos TRÊS contraexemplos da identidade da evidência, reproduzidos
 * sobre `8fed6bc`.
 *
 * ⚠ **Cada asserção do "antes" alcança o COMPORTAMENTO DEFEITUOSO**, e não a
 * ausência de campo novo. Um teste que reprovasse em `8fed6bc` só porque um campo
 * ainda não existia **não demonstraria defeito nenhum**, e foi esse o critério frouxo
 * que deixou os três passarem.
 *
 * Por isso todas as asserções abaixo usam a assinatura que `8fed6bc` já tinha:
 * `prepararConferencia(parecer, evidencias, divergentes, triar)` e
 * `extrairCitacoes(parecer)`.
 */

import {
  extrairCitacoes,
  extrairCitacoesComRevisao,
  prepararConferencia,
  type ClaimDivergente,
  type EvidenciaEnviada,
} from '@/lib/rag/conferencia-sustentacao';
import { triarTranscricao } from '@/lib/rag/triagem-parafrase';

const triar = (a: string, t: string) => triarTranscricao(a, t);
const SEM_DIVERGENCIA: ClaimDivergente[] = [];

function ev(
  articleId: string,
  autores: string[],
  ano: number,
  trecho: string,
  extra: Partial<EvidenciaEnviada> = {}
): EvidenciaEnviada {
  return { articleId, autores, ano, trecho, origem: 'recuperada', ...extra };
}

// ============================================================
// 1. Obra identificada por coincidência PARCIAL de autoria
// ============================================================
describe('1. autoria comparada por lista, e não por interseção', () => {
  it('Forman e Peniwati (1998) NÃO recebe evidência de Forman e Gass (1998)', () => {
    const parecer = 'A média geométrica é recomendada por Forman e Peniwati (1998).';
    const evidencias = [ev('forman1998_gass', ['Forman', 'Gass'], 1998, 'trecho de outra obra')];

    const [linha] = prepararConferencia(parecer, evidencias, SEM_DIVERGENCIA, triar);

    // ⚠ O ANTES, medido: `some` casava por `Forman` e a linha saía
    // `pendente_de_leitura`, com a obra errada entre os candidatos.
    expect(linha.obrasCandidatas).toEqual([]);
    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.resultado).not.toBe('pendente_de_leitura');

    // Os campos que o aceite exige conferir, e não só a contagem.
    expect(linha.autoresExtraidos).toEqual(['Forman', 'Peniwati']);
    expect(linha.anoExtraido).toBe(1998);
  });

  it('a obra CERTA continua sendo identificada, com a lista completa e na ordem', () => {
    const parecer = 'A média geométrica é recomendada por Forman e Peniwati (1998).';
    const evidencias = [
      ev('forman1998_peniwati', ['Forman', 'Peniwati'], 1998, 'a media geometrica e o metodo'),
    ];

    const [linha] = prepararConferencia(parecer, evidencias, SEM_DIVERGENCIA, triar);

    expect(linha.obrasCandidatas).toEqual(['forman1998_peniwati']);
    expect(linha.resultado).toBe('pendente_de_leitura');
  });

  it('ORDEM TROCADA não identifica: Peniwati e Forman não é Forman e Peniwati', () => {
    const parecer = 'A média geométrica é recomendada por Peniwati e Forman (1998).';
    const evidencias = [ev('forman1998_peniwati', ['Forman', 'Peniwati'], 1998, 'trecho')];

    const [linha] = prepararConferencia(parecer, evidencias, SEM_DIVERGENCIA, triar);

    // ⚠ A asserção que alcança o DEFEITO vem primeiro: em `8fed6bc` a obra entrava
    // como identificada. A dos campos novos vem depois, para não mascarar a causa.
    expect(linha.obrasCandidatas).toEqual([]);
    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.autoresExtraidos).toEqual(['Peniwati', 'Forman']);
  });

  it('com et al., os autores explicitados têm de ser o INÍCIO da lista da obra', () => {
    const parecer = 'A regra é definida por Dodevska et al. (2023).';
    const certa = [ev('dodevska2023when', ['Dodevska', 'Outro', 'Terceiro'], 2023, 'trecho certo')];
    const errada = [ev('outro2023_qualquer', ['Silva', 'Dodevska'], 2023, 'trecho errado')];

    const [ok] = prepararConferencia(parecer, certa, SEM_DIVERGENCIA, triar);
    expect(ok.obrasCandidatas).toEqual(['dodevska2023when']);

    // ⚠ Dodevska aparece, mas NÃO no início: não é a mesma obra.
    const [nao] = prepararConferencia(parecer, errada, SEM_DIVERGENCIA, triar);
    expect(nao.obrasCandidatas).toEqual([]);
    expect(nao.resultado).toBe('inconclusiva');
  });

  it('duas obras INDISTINGUÍVEIS pela regra ficam AMBÍGUAS, não identificadas', () => {
    const parecer = 'Saaty (1977) propõe 0,10 como limiar.';
    const evidencias = [
      ev('saaty1977_a', ['Saaty'], 1977, 'trecho A'),
      ev('saaty1977_b', ['Saaty'], 1977, 'trecho B'),
    ];

    const [linha] = prepararConferencia(parecer, evidencias, SEM_DIVERGENCIA, triar);

    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.motivo).toContain('ambígua');
    expect(linha.obrasCandidatas.sort()).toEqual(['saaty1977_a', 'saaty1977_b']);
  });

  it('evidência SEM autores não permite a conferência: associação inconclusiva', () => {
    const parecer = 'Saaty (1977) propõe 0,10 como limiar.';
    const evidencias = [ev('saaty1977_a', [], 1977, 'trecho sem autoria cadastrada')];

    const [linha] = prepararConferencia(parecer, evidencias, SEM_DIVERGENCIA, triar);

    // ⚠ Não se identifica por ausência de dado, e não se reconstrói por sobrenome.
    expect(linha.obrasCandidatas).toEqual([]);
    expect(linha.resultado).toBe('inconclusiva');
  });
});

// ============================================================
// 2. Divergência atribuída por CONTENÇÃO TEXTUAL
// ============================================================
describe('2. divergência vinculada por identificador, nunca por texto', () => {
  it('campo de divergência VAZIO não casa com trecho nenhum', () => {
    const parecer = 'Bozoki et al. (2010) demonstram unicidade.';
    const evidencias = [
      ev('bozoki2010_ipc', ['Bozoki', 'Fulop', 'Ronyai'], 2010, 'um trecho independente qualquer'),
    ];
    const divergentes: ClaimDivergente[] = [
      { articleId: 'bozoki2010_ipc', verbatimQuote: '', evidenceQuote: '' },
    ];

    const [linha] = prepararConferencia(parecer, evidencias, divergentes, triar);

    // ⚠ O ANTES, medido: `t.includes('')` é SEMPRE verdadeiro, então o campo vazio
    // casava com qualquer trecho e a linha saía inconclusiva por A.16.
    expect(linha.motivo).not.toContain('A.16');
    expect(linha.resultado).toBe('pendente_de_leitura');
  });

  it('trecho que é SUBCADEIA de uma divergência não é contaminado por ela', () => {
    const parecer = 'Bozoki et al. (2010) demonstram unicidade.';
    const evidencias = [
      ev('bozoki2010_ipc', ['Bozoki', 'Fulop', 'Ronyai'], 2010, 'the graph is connected'),
    ];
    const divergentes: ClaimDivergente[] = [
      {
        articleId: 'bozoki2010_ipc',
        verbatimQuote: 'the graph is connected and acyclic and complete',
        evidenceQuote: 'the graph is connected and acyclic',
      },
    ];

    const [linha] = prepararConferencia(parecer, evidencias, divergentes, triar);

    // ⚠ O ANTES: `v.includes(t)` dava verdadeiro e contaminava.
    expect(linha.motivo).not.toContain('A.16');
    expect(linha.resultado).toBe('pendente_de_leitura');
  });

  it('com identificador nos DOIS lados, a divergência vincula e a linha é inconclusiva', () => {
    const parecer = 'Bozoki et al. (2010) demonstram unicidade.';
    const evidencias = [
      ev('bozoki2010_ipc', ['Bozoki', 'Fulop', 'Ronyai'], 2010, 'the graph is connected', {
        trechoId: 'claim-07',
      }),
    ];
    const divergentes: ClaimDivergente[] = [
      {
        articleId: 'bozoki2010_ipc',
        trechoId: 'claim-07',
        verbatimQuote: 'the graph is connected and acyclic',
        evidenceQuote: 'the graph is connected',
      },
    ];

    const [linha] = prepararConferencia(parecer, evidencias, divergentes, triar);

    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.motivo).toContain('A.16');
    expect(linha.motivo).toContain('Não se escolhe lado');
  });

  it('identificador ausente na EVIDÊNCIA não gera correspondência', () => {
    const parecer = 'Bozoki et al. (2010) demonstram unicidade.';
    const evidencias = [
      ev('bozoki2010_ipc', ['Bozoki', 'Fulop', 'Ronyai'], 2010, 'the graph is connected'),
    ];
    const divergentes: ClaimDivergente[] = [
      {
        articleId: 'bozoki2010_ipc',
        trechoId: 'claim-07',
        verbatimQuote: 'the graph is connected and acyclic',
        evidenceQuote: 'the graph is connected',
      },
    ];

    const [linha] = prepararConferencia(parecer, evidencias, divergentes, triar);

    // ⚠ Texto idêntico ao `evidenceQuote`, e ainda assim NÃO vincula: a identidade
    // vem do identificador, não do conteúdo.
    expect(linha.motivo).not.toContain('A.16');
  });

  it('identificador VAZIO nos dois lados não gera correspondência', () => {
    const parecer = 'Bozoki et al. (2010) demonstram unicidade.';
    const evidencias = [
      ev('bozoki2010_ipc', ['Bozoki', 'Fulop', 'Ronyai'], 2010, 'texto', { trechoId: '' }),
    ];
    const divergentes: ClaimDivergente[] = [
      { articleId: 'bozoki2010_ipc', trechoId: '', verbatimQuote: 'a', evidenceQuote: 'b' },
    ];

    const [linha] = prepararConferencia(parecer, evidencias, divergentes, triar);

    expect(linha.motivo).not.toContain('A.16');
  });
});

// ============================================================
// 3. Inventário contradiz a execução
// ============================================================
describe('3. nenhuma forma declarada FORA produz entrada interpretada', () => {
  /**
   * Um caso por exemplo de `FORMAS_FORA`, e cada um exige AS DUAS COISAS:
   * o fragmento **não vira entrada interpretada** E **aparece no registro de revisão
   * manual, preservado**. ⚠ **Ausência sozinha reprova**, porque não distingue
   * tratamento de descarte.
   */
  const EXEMPLOS: Array<{ forma: string; fragmento: string; frase: string }> = [
    {
      forma: 'citacao_secundaria',
      fragmento: '(citando Miller, 1956)',
      frase: 'Saaty (1977) discute o limite (citando Miller, 1956).',
    },
    {
      forma: 'caixa_alta_ou_entidade',
      fragmento: '(SAATY, 1977)',
      frase: 'O limiar aparece em (SAATY, 1977).',
    },
    {
      forma: 'caixa_alta_ou_entidade',
      fragmento: '(ABNT, 2023)',
      frase: 'A norma é publicada (ABNT, 2023).',
    },
    {
      forma: 'composta_em_um_parentese',
      fragmento: '(Saaty, 1977 + Saaty, 2003 + Forman & Peniwati, 1998)',
      frase: 'Os três tratam do tema (Saaty, 1977 + Saaty, 2003 + Forman & Peniwati, 1998).',
    },
  ];

  it.each(EXEMPLOS)('$fragmento sai do interpretado E entra na revisão manual', ({ forma, fragmento, frase }) => {
    const { interpretadas, revisaoManual } = extrairCitacoesComRevisao(frase);

    // (a) Nenhuma entrada interpretada veio DESTE fragmento.
    for (const c of interpretadas) {
      expect(fragmento).not.toContain(c.fonteCitada);
    }

    // (b) O fragmento está no registro, preservado como estava.
    const registrado = revisaoManual.find((r) => r.fragmento === fragmento);
    expect(registrado).toBeDefined();
    expect(registrado?.fragmento).toBe(fragmento);
    expect(registrado?.forma).toBe(forma);
    expect(registrado?.afirmacao).toBe(frase);
  });

  it('a COMPOSTA não vira UMA obra, que é o pior desfecho', () => {
    // ⚠ O ANTES, e este é o mais grave: saía UMA entrada, autores ['Saaty'],
    // ano 1977, forma `com_localizador`, com o resto engolido como localizador.
    // Entrada com a obra errada PARECE cobertura.
    const c = extrairCitacoes(
      'Os três tratam do tema (Saaty, 1977 + Saaty, 2003 + Forman & Peniwati, 1998).'
    );
    expect(c).toHaveLength(0);
  });

  it('o exemplo de CAIXA ALTA não vira entrada interpretada', () => {
    // ⚠ O ANTES: `(SAATY, 1977)` produzia UMA entrada, com autores ['SAATY'].
    expect(extrairCitacoes('O limiar aparece em (SAATY, 1977).')).toHaveLength(0);
  });

  it('o exemplo de AUTOR-ENTIDADE não vira entrada interpretada', () => {
    // ⚠ O ANTES: `(ABNT, 2023)` produzia UMA entrada, com autores ['ABNT'].
    expect(extrairCitacoes('A norma é publicada (ABNT, 2023).')).toHaveLength(0);
  });

  it('a CITAÇÃO SECUNDÁRIA não introduz a obra secundária, e a legítima SOBREVIVE', () => {
    const { interpretadas } = extrairCitacoesComRevisao(
      'Saaty (1977) discute o limite (citando Miller, 1956).'
    );
    // ⚠ A frase tem UMA citação legítima, e ela não pode ser perdida junto.
    expect(interpretadas).toHaveLength(1);
    expect(interpretadas[0].autores).toEqual(['Saaty']);
    expect(interpretadas[0].ano).toBe(1977);
    expect(interpretadas.map((x) => x.autores.join(' ')).join(' | ')).not.toContain('Miller');
  });

  it('CONTROLE NEGATIVO: citação legítima NÃO vai para revisão manual', () => {
    const { interpretadas, revisaoManual } = extrairCitacoesComRevisao(
      'Saaty (1977) propõe 0,10 como limiar.'
    );
    expect(interpretadas).toHaveLength(1);
    expect(revisaoManual).toHaveLength(0);
  });
});
