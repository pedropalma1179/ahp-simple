/**
 * lib/__tests__/a33-conferencia-regressao.test.ts
 *
 * Regressões dos TRÊS contraexemplos do instrumento de conferência, reproduzidos
 * sobre `1444892`.
 *
 * ⚠ **Cada expectativa aqui FALHAVA antes da correção.** Os três comprometiam a
 * preparação que o arquivo se propõe a fazer, e CI verde não os alcançava.
 */

import {
  extrairCitacoes,
  prepararConferencia,
  FORMAS_COBERTAS,
  FORMAS_FORA,
  type ClaimDivergente,
  type EvidenciaEnviada,
} from '@/lib/rag/conferencia-sustentacao';
import { triarTranscricao } from '@/lib/rag/triagem-parafrase';

const triar = (a: string, t: string) => triarTranscricao(a, t);

function ev(
  articleId: string,
  autores: string[],
  ano: number,
  trecho: string,
  origem: EvidenciaEnviada['origem'] = 'recuperada'
): EvidenciaEnviada {
  // Identidade sintética explícita; estes controles testam associação e triagem.
  return { articleId, trechoId: 'trecho-fixture', autores, ano, trecho, origem };
}

// ============================================================
// 1. Citações permitidas desaparecem da conferência
// ============================================================
describe('1. as formas que o prompt ensina produzem entrada', () => {
  it('os três contraexemplos, que davam ZERO entradas', () => {
    const casos = [
      'A síntese exige prioridades comensuráveis (Wijnmalen, 2007).',
      'A média geométrica é recomendada para AIJ (Forman e Peniwati, 1998).',
      'A regra dos 80% é definida por Dodevska et al. (2023).',
    ];
    for (const parecer of casos) {
      expect(extrairCitacoes(parecer).length).toBeGreaterThan(0);
    }
  });

  it('uma citação de CADA forma inventariada no system-prompt', () => {
    // ⚠ Derivadas por LEITURA do `system-prompt.ts` depois de A.33, e o inventário
    // fica no módulo, não só neste teste.
    const porForma: Record<string, string> = {
      autor_ano: 'Saaty (1977) propõe o limiar.',
      parentetica: 'O limiar é 0,10 (Saaty, 1977).',
      et_al: 'A regra é definida por Dodevska et al. (2023).',
      parentetica_et_al: 'A regra é publicada (Bozóki et al., 2010).',
      dois_autores_e_comercial: 'Forman & Peniwati (1998) recomendam a média geométrica.',
      dois_autores_e: 'A média geométrica é recomendada (Forman e Peniwati, 1998).',
      parentetica_e_comercial: 'A média geométrica é recomendada (Forman & Peniwati, 1998).',
      tres_autores: 'Bozóki, Fülöp e Rónyai (2010) tratam matrizes incompletas.',
      com_localizador: 'A regra aparece em Dodevska et al. (2023, Eq. 10).',
      autor_hifenizado: 'Aull-Hyde et al. (2006) discutem agregação.',
      autor_acentuado: 'Bozóki et al. (2010) demonstram unicidade.',
    };

    // Toda forma declarada coberta TEM de aparecer no mapa, e vice-versa.
    expect(Object.keys(porForma).sort()).toEqual([...FORMAS_COBERTAS].sort());

    for (const [forma, frase] of Object.entries(porForma)) {
      const c = extrairCitacoes(frase);
      expect({ forma, n: c.length }).toEqual({ forma, n: expect.any(Number) });
      expect(c.length).toBeGreaterThan(0);
    }
  });

  it('o INVENTÁRIO declara também o que ficou FORA, e não só o que cobre', () => {
    // ⚠ Cobertura declarada sem inventário é a promessa que a versão anterior fazia.
    expect(FORMAS_FORA.length).toBeGreaterThan(0);
    for (const f of FORMAS_FORA) {
      expect(typeof f.forma).toBe('string');
      expect(f.exemplo.length).toBeGreaterThan(0);
      expect(f.porque.length).toBeGreaterThan(0);
    }
  });

  it('CONTROLE: forma declarada FORA realmente não entra', () => {
    // A citação secundária, que o prompt ensina como "(citando Miller, 1956)".
    const fora = FORMAS_FORA.find((f) => f.forma === 'citacao_secundaria');
    expect(fora).toBeDefined();
    expect(extrairCitacoes('Saaty (1977) discute o limite (citando Miller, 1956).')
      .map((c) => c.fonteCitada)
      .join(' ')).not.toContain('Miller');
  });
});

// ============================================================
// 2. Sobrenome tratado como identidade da evidência
// ============================================================
describe('2. associação por obra e ano, nunca por sobrenome', () => {
  const SEM_DIVERGENCIA: ClaimDivergente[] = [];

  it('Saaty (1977) NÃO recebe trecho de Saaty (1980) nem exemplo do system', () => {
    const parecer = 'Saaty (1977) propõe 0,10 como limiar.';
    const evidencias = [
      ev('saaty1980_howtomake', ['Saaty'], 1980, 'trecho do livro de 1980'),
      ev('exemplo_do_prompt', ['Saaty'], 1977, 'Saaty (1977) propõe: exemplo de instrucao', 'exemplo_do_system'),
    ];

    const [linha] = prepararConferencia(parecer, evidencias, SEM_DIVERGENCIA, triar);

    // ⚠ O contraexemplo: antes os DOIS entravam como evidenciaEnviada.
    expect(linha.evidenciaEnviada).toBeNull();
    expect(linha.obrasCandidatas).toEqual([]);
    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.motivo).toContain('localizada');
    expect(linha.motivo).toContain('NÃO');
  });

  it('exemplo do system NUNCA entra como evidência recuperada, mesmo casando obra e ano', () => {
    const parecer = 'Saaty (1977) propõe 0,10 como limiar.';
    const evidencias = [
      ev('saaty1977_scaling', ['Saaty'], 1977, 'exemplo do prompt', 'exemplo_do_system'),
    ];

    const [linha] = prepararConferencia(parecer, evidencias, SEM_DIVERGENCIA, triar);

    expect(linha.evidenciaEnviada).toBeNull();
    // Mas o exemplo é REGISTRADO, porque responde outra pergunta.
    expect(linha.exemplosDoSystem).toHaveLength(1);
  });

  it('obra e ano casando: a evidência entra e a linha segue para o conteúdo', () => {
    const parecer = 'Saaty (1977) propõe 0,10 como limiar.';
    const evidencias = [ev('saaty1977_scaling', ['Saaty'], 1977, 'o CR deve permanecer baixo')];

    const [linha] = prepararConferencia(parecer, evidencias, SEM_DIVERGENCIA, triar);

    expect(linha.obrasCandidatas).toEqual(['saaty1977_scaling']);
    expect(linha.evidenciaEnviada).toContain('o CR deve permanecer baixo');
    expect(linha.resultado).toBe('pendente_de_leitura');
  });

  it('AMBIGUIDADE real: duas obras casam, e ela se REGISTRA em vez de resolver', () => {
    const parecer = 'Saaty (1977) propõe 0,10 como limiar.';
    const evidencias = [
      ev('saaty1977_scaling', ['Saaty'], 1977, 'trecho A'),
      ev('saaty1977_outro', ['Saaty'], 1977, 'trecho B'),
    ];

    const [linha] = prepararConferencia(parecer, evidencias, SEM_DIVERGENCIA, triar);

    expect(linha.resultado).toBe('inconclusiva');
    // ⚠ Ambiguidade é DIFERENTE de falta de sustentação, e o motivo diz qual é.
    expect(linha.motivo).toContain('ambígua');
    expect(linha.motivo).not.toContain('não se sustenta');
    expect(linha.obrasCandidatas.sort()).toEqual(['saaty1977_outro', 'saaty1977_scaling']);
  });
});

// ============================================================
// 3. Divergência de outra obra contamina, e a triagem não roda
// ============================================================
describe('3. divergência por TRECHO, e triagem sempre calculada', () => {
  // ⚠ **`trechoId` ACRESCENTADO depois**, e a razão é a correção 2 da rodada
  // seguinte: a divergência deixou de vincular por CONTENÇÃO TEXTUAL e passou a
  // vincular por identificador. **A intenção destes casos não mudou**, e continua
  // sendo que a divergência vale para o trecho utilizado; o que mudou é o mecanismo
  // pelo qual ela se vincula a ele.
  const DIVERGENTE_2010: ClaimDivergente[] = [
    {
      articleId: 'bozoki2010_ipc',
      trechoId: 'claim-07',
      verbatimQuote: 'the graph is connected and acyclic',
      evidenceQuote: 'the graph is connected',
    },
  ];

  it('Bozoki (2013) NÃO fica inconclusiva por divergência cadastrada em bozoki2010', () => {
    const parecer = 'Bozoki (2013) discute otimização em matrizes incompletas.';
    const evidencias = [ev('bozoki2013_outro', ['Bozoki'], 2013, 'trecho de 2013 sem divergencia')];

    const [linha] = prepararConferencia(parecer, evidencias, DIVERGENTE_2010, triar);

    // ⚠ O contraexemplo: antes o `includes(sobrenome)` contaminava.
    expect(linha.motivo).not.toContain('A.16');
    expect(linha.resultado).toBe('pendente_de_leitura');
  });

  it('a divergência se aplica ao TRECHO utilizado, e aí sim é inconclusiva', () => {
    const parecer = 'Bozoki et al. (2010) demonstram unicidade sob conectividade.';
    const evidencias = [
      { ...ev('bozoki2010_ipc', ['Bozoki'], 2010, 'the graph is connected'), trechoId: 'claim-07' },
    ];

    const [linha] = prepararConferencia(parecer, evidencias, DIVERGENTE_2010, triar);

    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.motivo).toContain('A.16');
    expect(linha.motivo).toContain('Não se escolhe lado');
  });

  it('linha INCONCLUSIVA por A.16 ainda assim tem a triagem CALCULADA', () => {
    const trecho = 'the graph is connected';
    const parecer = `Bozoki et al. (2010) afirmam que ${trecho} e nada mais e exigido aqui.`;
    const evidencias = [
      { ...ev('bozoki2010_ipc', ['Bozoki'], 2010, trecho), trechoId: 'claim-07' },
    ];

    const [linha] = prepararConferencia(parecer, evidencias, DIVERGENTE_2010, triar);

    expect(linha.resultado).toBe('inconclusiva');
    // ⚠ O contraexemplo: antes o retorno antecipado escrevia `false` SEM rodar.
    expect(linha.triagem).not.toBe('nao_avaliada');
    expect(['sinalizada', 'nao_sinalizada']).toContain(linha.triagem);
  });

  it('sem trecho para comparar, a triagem fica NAO AVALIADA, com motivo', () => {
    const parecer = 'Miller (1956) estabelece o limite de sete itens.';
    const evidencias: EvidenciaEnviada[] = [];

    const [linha] = prepararConferencia(parecer, evidencias, DIVERGENTE_2010, triar);

    // ⚠ `false` fica reservado à triagem que RODOU e não sinalizou.
    expect(linha.triagem).toBe('nao_avaliada');
    expect(linha.motivoTriagem).toContain('nenhum trecho');
  });

  it('em AMBIGUIDADE a triagem compara os candidatos, e NÃO escolhe nenhum', () => {
    const trecho = 'require the ratio to be very small of the order of 0.1';
    const parecer = `Saaty (1977) afirma que ${trecho} nesta analise.`;
    const evidencias = [
      ev('saaty1977_a', ['Saaty'], 1977, trecho),
      ev('saaty1977_b', ['Saaty'], 1977, 'outro trecho qualquer'),
    ];

    const [linha] = prepararConferencia(parecer, evidencias, DIVERGENTE_2010, triar);

    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.motivo).toContain('ambígua');
    // A suspeita aparece, e a associação segue sem ser resolvida.
    expect(linha.triagem).toBe('sinalizada');
    expect(linha.obrasCandidatas).toHaveLength(2);
  });
});
