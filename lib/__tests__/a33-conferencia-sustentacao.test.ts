/**
 * lib/__tests__/a33-conferencia-sustentacao.test.ts
 *
 * Verifica o PREPARO da conferência da etapa 4, e nada além disso.
 *
 * ⚠ **Isto NÃO é a etapa 4.** A etapa 4 exige pareceres realmente gerados, e este
 * arquivo exercita o instrumento com texto SINTÉTICO. **Nenhuma conclusão sobre a
 * predição de A.33 sai daqui.**
 *
 * Os três contraexemplos corrigidos estão em `a33-conferencia-regressao.test.ts`.
 * Este arquivo guarda o separador de frases e as três condições da tabela.
 */

import {
  extrairCitacoes,
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
  origem: EvidenciaEnviada['origem'] = 'recuperada'
): EvidenciaEnviada {
  // Identidade sintética explícita; estes controles testam associação e triagem.
  return { articleId, trechoId: 'trecho-fixture', autores, ano, trecho, origem };
}

describe('separador de frases, que foi a causa REAL do primeiro contraexemplo', () => {
  it('o ponto de `et al.` NÃO termina frase', () => {
    // ⚠ Medido: partir em todo ponto seguido de espaço quebrava
    // `Dodevska et al. (2023)` em `Dodevska et` e `al. (2023)`, e a citação sumia.
    // **O padrão de citação estava certo; quem errava era o separador.**
    const c = extrairCitacoes('A regra dos 80% é definida por Dodevska et al. (2023).');

    expect(c).toHaveLength(1);
    expect(c[0].autores).toEqual(['Dodevska']);
    expect(c[0].forma).toBe('et_al');
  });

  it('CONTROLE: ponto que termina frase de verdade CONTINUA separando', () => {
    const c = extrairCitacoes('Saaty (1977) propõe o limiar. Wijnmalen (2007) trata da síntese.');

    expect(c).toHaveLength(2);
    // Cada citação leva a SUA frase, e não o parágrafo inteiro.
    expect(c[0].afirmacao).not.toContain('Wijnmalen');
    expect(c[1].afirmacao).not.toContain('Saaty');
  });

  it('outras abreviações da lista também não partem a frase', () => {
    const c = extrairCitacoes('A regra aparece em Dodevska et al. (2023, Eq. 10) e vale aqui.');

    expect(c).toHaveLength(1);
    expect(c[0].forma).toBe('com_localizador');
  });
});

describe('as três condições da tabela do instrumento', () => {
  it('fonte NÃO localizada: inconclusiva, e o motivo nega que seja falta de suporte', () => {
    const [linha] = prepararConferencia(
      'Miller (1956) estabelece o limite de sete itens.',
      [ev('saaty1977_scaling', ['Saaty'], 1977, 'o CR deve permanecer baixo')],
      SEM_DIVERGENCIA,
      triar
    );

    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.motivo).toContain('não significa que a afirmação não se sustenta');
    expect(linha.triagem).toBe('nao_avaliada');
  });

  it('associação AMBÍGUA: inconclusiva, e distinta de falta de sustentação', () => {
    const [linha] = prepararConferencia(
      'Saaty (1977) propõe 0,10 como limiar.',
      [
        ev('saaty1977_a', ['Saaty'], 1977, 'trecho A'),
        ev('saaty1977_b', ['Saaty'], 1977, 'trecho B'),
      ],
      SEM_DIVERGENCIA,
      triar
    );

    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.motivo).toContain('ambígua');
    expect(linha.motivo).toContain('Nenhuma foi escolhida');
    // ⚠ A triagem RODOU mesmo aqui, comparando os dois candidatos.
    expect(linha.triagem).toBe('nao_sinalizada');
  });

  it('evidência IDENTIFICADA: segue para a conferência do conteúdo', () => {
    const [linha] = prepararConferencia(
      'Saaty (1977) propõe 0,10 como limiar.',
      [ev('saaty1977_scaling', ['Saaty'], 1977, 'o CR deve permanecer baixo')],
      SEM_DIVERGENCIA,
      triar
    );

    expect(linha.resultado).toBe('pendente_de_leitura');
    expect(linha.obrasCandidatas).toEqual(['saaty1977_scaling']);
    expect(linha.trechoDaFonte).toBeNull();
    expect(linha.triagem).toBe('nao_sinalizada');
  });
});
