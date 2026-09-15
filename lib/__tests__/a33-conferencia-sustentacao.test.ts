/**
 * lib/__tests__/a33-conferencia-sustentacao.test.ts
 *
 * Verifica o PREPARO da conferência da etapa 4, e nada além disso.
 *
 * ⚠ **Isto NÃO é a etapa 4.** A etapa 4 exige pareceres realmente gerados, e este
 * arquivo exercita o instrumento com um parecer SINTÉTICO, escrito aqui. **Nenhuma
 * conclusão sobre a predição de A.33 sai deste arquivo.**
 */

import {
  extrairCitacoes,
  prepararConferencia,
  type ClaimDivergente,
} from '@/lib/rag/conferencia-sustentacao';
import { triarTranscricao } from '@/lib/rag/triagem-parafrase';

const triar = (a: string, t: string) => triarTranscricao(a, t);

describe('extração de citações do parecer', () => {
  it('encontra a forma que a instrução nova ensina, autor e ano sem página', () => {
    const parecer =
      'O CR global é 1,06%. Saaty (1977) propõe 0,10 como limiar. A média geométrica é recomendada para AIJ (Forman e Peniwati, 1998).';
    const c = extrairCitacoes(parecer);

    expect(c.map((x) => x.fonteCitada)).toContain('Saaty (1977)');
    // A frase inteira acompanha a citação, porque a conferência é sobre a afirmação.
    expect(c[0].afirmacao).toContain('propõe 0,10 como limiar');
  });

  it('LIMITE DECLARADO: citação fora da forma Autor (ano) ESCAPA', () => {
    // ⚠ Registrado como limite, e não como defeito a corrigir aqui: por isso o
    // total desta função não substitui a leitura do parecer pelo pesquisador.
    const parecer = 'Conforme SAATY, 1977, p. 248, o limiar e de 0,10.';
    expect(extrairCitacoes(parecer)).toHaveLength(0);
  });
});

describe('preparo da tabela de quatro colunas', () => {
  const DIVERGENTES: ClaimDivergente[] = [
    {
      articleId: 'bozoki2010_ipc',
      verbatimQuote: 'The optimal solution is unique if and only if the graph is connected and acyclic',
      evidenceQuote: 'The optimal solution is unique if and only if the graph is connected',
    },
  ];

  it('fonte COM divergência de A.16 sai INCONCLUSIVA, sem escolher lado', () => {
    const parecer = 'Bozoki (2010) demonstra unicidade da solução sob conectividade do grafo.';
    const contexto = '**Bozoki (2010)** - unicidade\nFundamento: the graph is connected';

    const [linha] = prepararConferencia(parecer, contexto, DIVERGENTES, triar);

    expect(linha.resultado).toBe('inconclusiva');
    expect(linha.motivo).toContain('A.16');
    // ⚠ Nenhum dos dois campos e apresentado como o correto.
    expect(linha.motivo).toContain('Não se escolhe lado');
    expect(linha.trechoDaFonte).toBeNull();
  });

  it('fonte SEM divergência fica PENDENTE DE LEITURA, e não sustentada', () => {
    // ⚠ A maquina nao conclui sustentacao: a coluna 3 exige abrir a publicacao.
    const parecer = 'Saaty (1977) propõe 0,10 como limiar de aceitabilidade.';
    const contexto = '**Saaty (1977)** - limiar\nFundamento: CR deve permanecer baixo';

    const [linha] = prepararConferencia(parecer, contexto, DIVERGENTES, triar);

    expect(linha.resultado).toBe('pendente_de_leitura');
    expect(linha.evidenciaEnviada).toContain('Saaty');
    expect(linha.trechoDaFonte).toBeNull();
    expect(linha.motivo).toContain('publica');
  });

  it('fonte citada que NÃO está no contexto enviado é apontada como tal', () => {
    // Este e o caso que a execucao 7 produziu: localizador sem origem no contexto.
    const parecer = 'Miller (1956) estabelece o limite de sete itens.';
    const contexto = '**Saaty (1977)** - limiar\nFundamento: CR deve permanecer baixo';

    const [linha] = prepararConferencia(parecer, contexto, DIVERGENTES, triar);

    expect(linha.evidenciaEnviada).toBeNull();
    expect(linha.motivo).toContain('NÃO localizada no contexto');
  });

  it('a suspeita de transcrição acompanha a linha, sem virar veredito', () => {
    const trecho = 'require the ratio to be very small; e.g., of the order of 0.1';
    const parecer = `Saaty (1977) afirma que ${trecho} nesta análise.`;
    const contexto = `**Saaty (1977)** - limiar\nFundamento: ${trecho}`;

    const [linha] = prepararConferencia(parecer, contexto, DIVERGENTES, triar);

    expect(linha.suspeitaDeTranscricao).toBe(true);
    // ⚠ Segue PENDENTE: suspeita nao decide, e a coluna 4 nao vira reprovacao aqui.
    expect(linha.resultado).toBe('pendente_de_leitura');
  });

  it('CONTROLE: parafrase fiel NÃO levanta suspeita', () => {
    const parecer = 'Saaty (1977) estabelece 0,10 como valor de referência para a consistência.';
    const contexto =
      '**Saaty (1977)** - limiar\nFundamento: require the ratio to be very small; e.g., of the order of 0.1';

    const [linha] = prepararConferencia(parecer, contexto, DIVERGENTES, triar);

    expect(linha.suspeitaDeTranscricao).toBe(false);
  });
});
