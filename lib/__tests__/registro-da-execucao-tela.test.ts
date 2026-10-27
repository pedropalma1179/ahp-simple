/**
 * lib/__tests__/registro-da-execucao-tela.test.ts
 *
 * A APRESENTAÇÃO do registro de execução no componente REAL `components/ParecerAISection.tsx`:
 *   - `renderToStaticMarkup` (HTML) para o que a tela mostra em cada situação do registro;
 *   - o componente chamado como função, com `useState` simulado, para invocar o MANIPULADOR REAL do botão de download.
 *
 * ⚠ **O que NÃO é:** não é a página no navegador, e o download é conferido contra um `document`/`URL` SIMULADOS (o clique
 * não grava arquivo algum). O que se demonstra é o que o manipulador entrega ao ambiente: o conteúdo, o nome e o desfecho
 * que a tela mostra, inclusive o ERRO REAL quando o download falha.
 *
 * ⚠ **Nenhuma chamada paga:** o registro vem do montador, com dados fictícios.
 */

export {};

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ParecerAISection from '@/components/ParecerAISection';
import { entradaDeEnsaio, validacaoDeEnsaio } from './helpers/registro-de-ensaio';

/* eslint-disable @typescript-eslint/no-var-requires */
const { montarRegistroDaExecucao } = require('@/lib/ai-reviewer/registro-da-execucao');
/* eslint-enable @typescript-eslint/no-var-requires */

const ID = '11111111-2222-4333-8444-555555555555';
const NOME = `registro-parecer-ia_20261026T120000Z_${ID}.json`;
const TITULO_DO_BOTAO = 'Baixar o registro desta execução do parecer (JSON)';

const registroCompleto = () => montarRegistroDaExecucao(entradaDeEnsaio());
const registroIncompleto = () => montarRegistroDaExecucao(entradaDeEnsaio({ ambiente: { commit: undefined, idDaImplantacao: 'dpl', ambienteDaImplantacao: 'production' } }));

/** O `aiReview` que a página monta (`setAiReview`), com o registro em `metadata`. */
function aiReviewDe(metadata: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    nota: 'B', veredicto: 'ACEITO', notaSuspensa: null, mensagemDaExtracao: null, estadoDoVinculo: 'vinculado',
    review: 'TEXTO DO PARECER DE ENSAIO', validation: validacaoDeEnsaio('aprovado'),
    metadata: { model: 'claude-opus-4-6', ...metadata }, ...extra,
  };
}

const renderizar = (aiReview: any): string =>
  renderToStaticMarkup(React.createElement(ParecerAISection as any, { aiReview, loading: false, onExecute: () => undefined }));

/** O HTML com o estado de exportação INJETADO (o componente guarda o desfecho do último download em `useState`). */
function renderizarComEstado(aiReview: any, estado: unknown): string {
  const espiao = jest.spyOn(React, 'useState').mockReturnValue([estado, jest.fn()] as any);
  try {
    return renderizar(aiReview);
  } finally {
    espiao.mockRestore();
  }
}

type No = any;
const filhos = (no: No): No[] => {
  const c = no?.props?.children;
  return c === undefined || c === null ? [] : Array.isArray(c) ? (c as any[]).flat(Infinity) : [c];
};
function achar(no: No, pred: (n: No) => boolean, acc: No[] = []): No[] {
  if (no && typeof no === 'object' && !Array.isArray(no)) {
    if (pred(no)) acc.push(no);
    for (const f of filhos(no)) achar(f, pred, acc);
  } else if (Array.isArray(no)) {
    for (const f of (no as any[]).flat(Infinity)) achar(f, pred, acc);
  }
  return acc;
}

/** O componente chamado como função, com `useState` simulado: devolve a árvore e o setter do desfecho do download. */
function arvoreDoComponente(aiReview: any, onExecute: () => void = () => undefined) {
  const setter = jest.fn();
  const espiao = jest.spyOn(React, 'useState').mockReturnValue([false, setter] as any);
  try {
    return { arvore: (ParecerAISection as any)({ aiReview, loading: false, onExecute }), setter };
  } finally {
    espiao.mockRestore();
  }
}

const botaoDeDownload = (arvore: No) => achar(arvore, (n) => n.type === 'button' && n.props?.title === TITULO_DO_BOTAO);

// ============================================================================
describe('o que a tela mostra, em cada situação do registro', () => {
  test('DISPONÍVEL: botão de download, "registro completo", retenção só por download; nada diz "arquivado"', () => {
    const html = renderizar(aiReviewDe({ registroDaExecucao: registroCompleto() }));
    expect(html).toContain('data-registro-da-execucao="disponivel"');
    expect(html).toContain('Baixar JSON');
    expect(html).toContain(TITULO_DO_BOTAO);
    expect(html).toContain('Registro completo para esta geração.');
    expect(html).toContain('Retenção somente por download: o sistema não grava este registro.');
    expect(html).toContain('revise antes de compartilhar');
    expect(html).not.toMatch(/arquivad/i);
  });

  test('o botão tem rótulo curto, não quebra em linhas e o título continua identificando o registro da execução', () => {
    const { arvore } = arvoreDoComponente(aiReviewDe({ registroDaExecucao: registroCompleto() }));
    const botao = botaoDeDownload(arvore)[0];
    expect(botao.props.className).toContain('whitespace-nowrap');
    expect(botao.props.title).toBe(TITULO_DO_BOTAO);
    const html = renderizar(aiReviewDe({ registroDaExecucao: registroCompleto() }));
    expect(html).toMatch(/Baixar JSON<\/span><\/button>/);
    expect(html).not.toContain('Baixar registro (JSON)');
  });

  test('INCOMPLETO: o botão segue, e cada ausência aparece com o campo e o motivo', () => {
    const html = renderizar(aiReviewDe({ registroDaExecucao: registroIncompleto() }));
    expect(html).toContain('data-registro-da-execucao="incompleto"');
    expect(html).toContain('Baixar JSON');
    expect(html).toContain('Registro incompleto (1 campo(s) sem valor)');
    expect(html).toContain('identificacao.implantacao.commit');
    expect(html).toContain('VERCEL_GIT_COMMIT_SHA');
  });

  test('INDISPONÍVEL (resposta sem registro): o motivo é dito, e NÃO há botão', () => {
    const html = renderizar(aiReviewDe({}));
    expect(html).toContain('data-registro-da-execucao="indisponivel"');
    expect(html).toContain('Indisponível para este parecer:');
    expect(html).toContain('Não há arquivo para baixar.');
    expect(html).not.toContain('Baixar JSON');
  });

  test('INDISPONÍVEL (a rota não conseguiu montar): o motivo da rota é o exibido', () => {
    const motivo = 'Falha ao montar o registro da execução abc: estrutura circular';
    const html = renderizar(aiReviewDe({ registroDaExecucao: null, registroDaExecucaoIndisponivel: { motivo } }));
    expect(html).toContain(motivo);
    expect(html).not.toContain('Baixar JSON');
  });

  test('INDISPONÍVEL (formato não reconhecido): versão futura do esquema não é lida "no que der"', () => {
    const futuro = { ...registroCompleto(), versaoDoEsquema: 2 };
    const html = renderizar(aiReviewDe({ registroDaExecucao: futuro }));
    expect(html).toContain('Versão do esquema não reconhecida: 2');
    expect(html).not.toContain('Baixar JSON');
  });

  test('sem parecer (nulo, ou erro de geração) não há bloco nem botão do registro', () => {
    for (const aiReview of [null, { error: true, message: 'Erro de conexão: x' }]) {
      const html = renderizar(aiReview);
      expect(html).not.toContain('data-registro-da-execucao');
      expect(html).not.toContain('Baixar JSON');
    }
  });

  test('a QUARENTENA não muda: parecer reprovado segue com o aviso, sem nota nem veredicto, e o registro é baixável sem ser liberado', () => {
    for (const estado of ['reprovado', 'inconclusivo'] as const) {
      const html = renderizar(aiReviewDe({ registroDaExecucao: registroCompleto() }, { validation: validacaoDeEnsaio(estado) }));
      expect(html).toContain(estado === 'reprovado' ? 'Parecer reprovado na verificação' : 'Verificação inconclusiva');
      expect(html).toContain('O conteúdo abaixo está em quarentena e não deve ser tratado como parecer aprovado.');
      expect(html).not.toContain('Nota Científica');
      expect(html).not.toContain('Veredicto');
      expect(html).toContain('Baixar JSON');
    }
    // CONTROLE: aprovado mostra nota e veredicto, como antes
    const aprovado = renderizar(aiReviewDe({ registroDaExecucao: registroCompleto() }));
    expect(aprovado).toContain('Nota Científica');
  });
});

// ============================================================================
describe('o desfecho do último download pertence à GERAÇÃO a que se refere', () => {
  const ai = () => aiReviewDe({ registroDaExecucao: registroCompleto() });

  test('download iniciado, da MESMA geração: a mensagem aparece como status', () => {
    const html = renderizarComEstado(ai(), { idDaGeracao: ID, resultado: 'baixado', texto: `Download do registro iniciado: ${NOME}` });
    expect(html).toContain(`Download do registro iniciado: ${NOME}`);
    expect(html).toMatch(/role="status"[^>]*>Download do registro iniciado/);
  });

  test('falha, da MESMA geração: a mensagem REAL aparece como alerta', () => {
    const html = renderizarComEstado(ai(), { idDaGeracao: ID, resultado: 'erro', texto: 'Download indisponível: ensaio' });
    expect(html).toContain('Falha ao exportar o registro: Download indisponível: ensaio');
    expect(html).toMatch(/role="alert"[^>]*>Falha ao exportar o registro/);
  });

  test('desfecho de OUTRA geração não aparece sobre o parecer novo', () => {
    const html = renderizarComEstado(ai(), { idDaGeracao: 'outra-geracao-qualquer', resultado: 'erro', texto: 'mensagem de um parecer anterior' });
    expect(html).not.toContain('mensagem de um parecer anterior');
  });
});

// ============================================================================
describe('o manipulador REAL do botão de download', () => {
  type Ambiente = { document: any; anchors: any[]; blobs: Blob[]; revogadas: string[]; restaurar: () => void };

  /** `document` e `URL` simulados: o clique não grava arquivo algum. */
  function ambienteComDom(): Ambiente {
    const anchors: any[] = [];
    const blobs: Blob[] = [];
    const revogadas: string[] = [];
    const document = {
      createElement: (_tag: string) => { const a: any = { click: jest.fn(), href: '', download: '', rel: '' }; anchors.push(a); return a; },
      body: { appendChild: jest.fn(), removeChild: jest.fn() },
    };
    const antes = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', { value: document, configurable: true, writable: true });
    const criar = jest.spyOn(URL, 'createObjectURL').mockImplementation(((b: Blob) => { blobs.push(b); return 'blob:ensaio'; }) as any);
    const revogar = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(((u: string) => { revogadas.push(u); }) as any);
    const tempo = jest.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: any) => { fn(); return 0 as any; }) as any);
    return {
      document, anchors, blobs, revogadas,
      restaurar: () => {
        criar.mockRestore(); revogar.mockRestore(); tempo.mockRestore();
        if (antes) Object.defineProperty(globalThis, 'document', antes); else delete (globalThis as any).document;
      },
    };
  }

  test('entrega ao ambiente o registro TAL COMO ESTÁ, com o nome da execução, e mostra o desfecho; não gera outro parecer', async () => {
    const registro = registroCompleto();
    const onExecute = jest.fn();
    const { arvore, setter } = arvoreDoComponente(aiReviewDe({ registroDaExecucao: registro }), onExecute);
    const botoes = botaoDeDownload(arvore);
    expect(botoes).toHaveLength(1);

    const amb = ambienteComDom();
    try {
      botoes[0].props.onClick();
      expect(amb.anchors).toHaveLength(1);
      expect(amb.anchors[0].download).toBe(NOME);
      expect(amb.anchors[0].href).toBe('blob:ensaio');
      expect(amb.anchors[0].click).toHaveBeenCalledTimes(1);
      expect(amb.revogadas).toEqual(['blob:ensaio']);
      expect(amb.blobs).toHaveLength(1);
      expect(amb.blobs[0].type).toBe('application/json;charset=utf-8');
      expect(JSON.parse(await amb.blobs[0].text())).toEqual(JSON.parse(JSON.stringify(registro)));
    } finally {
      amb.restaurar();
    }
    expect(setter).toHaveBeenCalledTimes(1);
    expect(setter).toHaveBeenCalledWith({ idDaGeracao: ID, resultado: 'baixado', texto: `Download do registro iniciado: ${NOME}` });
    expect(onExecute).not.toHaveBeenCalled(); // exportar não gera outro parecer
  });

  test('o registro INCOMPLETO também é baixável (o arquivo declara as ausências)', async () => {
    const { arvore } = arvoreDoComponente(aiReviewDe({ registroDaExecucao: registroIncompleto() }));
    const amb = ambienteComDom();
    try {
      botaoDeDownload(arvore)[0].props.onClick();
      const arquivo = JSON.parse(await amb.blobs[0].text());
      expect(arquivo.completude.completo).toBe(false);
      expect(arquivo.completude.ausencias.map((a: any) => a.campo)).toEqual(['identificacao.implantacao.commit']);
    } finally {
      amb.restaurar();
    }
  });

  test('FALHA: sem DOM, a mensagem real chega à tela, e nada é dito como baixado', () => {
    const { arvore, setter } = arvoreDoComponente(aiReviewDe({ registroDaExecucao: registroCompleto() }));
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const antes = Object.getOwnPropertyDescriptor(globalThis, 'document');
    delete (globalThis as any).document;
    try {
      botaoDeDownload(arvore)[0].props.onClick();
    } finally {
      if (antes) Object.defineProperty(globalThis, 'document', antes);
      erro.mockRestore();
    }
    expect(setter).toHaveBeenCalledTimes(1);
    const [arg] = setter.mock.calls[0];
    expect(arg).toMatchObject({ idDaGeracao: ID, resultado: 'erro' });
    expect(arg.texto).toContain('Download indisponível');
  });

  test('FALHA: o ambiente recusa o clique — a mensagem do ambiente é a exibida, e a URL temporária é revogada', () => {
    const { arvore, setter } = arvoreDoComponente(aiReviewDe({ registroDaExecucao: registroCompleto() }));
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const amb = ambienteComDom();
    amb.document.createElement = () => ({ click: () => { throw new Error('clique recusado pelo navegador'); }, href: '', download: '', rel: '' });
    try {
      botaoDeDownload(arvore)[0].props.onClick();
      expect(amb.revogadas).toEqual(['blob:ensaio']);
    } finally {
      amb.restaurar();
      erro.mockRestore();
    }
    expect(setter.mock.calls[0][0]).toEqual({ idDaGeracao: ID, resultado: 'erro', texto: 'clique recusado pelo navegador' });
  });

  test('FALHA: registro que não serializa — a mensagem REAL da serialização é a exibida, e nenhum arquivo parcial é entregue', () => {
    const registro: any = registroCompleto();
    registro.entrada.recebidaPelaApi = {};
    registro.entrada.recebidaPelaApi.eu = registro.entrada.recebidaPelaApi;
    const { arvore, setter } = arvoreDoComponente(aiReviewDe({ registroDaExecucao: registro }));
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const amb = ambienteComDom();
    try {
      botaoDeDownload(arvore)[0].props.onClick();
      expect(amb.blobs).toHaveLength(0);
      expect(amb.anchors).toHaveLength(0);
    } finally {
      amb.restaurar();
      erro.mockRestore();
    }
    const [arg] = setter.mock.calls[0];
    expect(arg.resultado).toBe('erro');
    expect(arg.texto).toMatch(/circular/i);
  });

  test('sem registro (indisponível) não existe botão para clicar', () => {
    const { arvore } = arvoreDoComponente(aiReviewDe({}));
    expect(botaoDeDownload(arvore)).toHaveLength(0);
  });
});
