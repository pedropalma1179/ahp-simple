/**
 * lib/ai-reviewer/exportar-registro.ts
 *
 * **A exportação do registro de execução do Parecer IA**, do lado da tela. Módulo SEM Node (roda no navegador): lê o
 * registro que a rota devolveu em `metadata.registroDaExecucao`, diz em que situação ele está, nomeia o arquivo e
 * aciona o download.
 *
 * ⚠ **Exportar NÃO regera nada.** Nenhuma função aqui chama a API, o RAG ou o provedor: o arquivo é a serialização do
 * registro que JÁ está no parecer apresentado. Por isso o registro exportado é sempre o da geração que a pessoa vê.
 *
 * ⚠ **Retenção é por download.** Nada aqui grava em servidor, em Firestore ou em armazenamento local. Quem chama não
 * pode dizer "arquivado" por causa desta função: ela entrega um arquivo à pessoa, e só.
 *
 * ⚠ **Falha é falha.** Os erros são lançados com a mensagem real; quem chama a mostra. Nada é engolido, e nenhum arquivo
 * parcial é entregue.
 */

import {
  ESQUEMA_DO_REGISTRO,
  VERSAO_DO_ESQUEMA_DO_REGISTRO,
  type AusenciaDoRegistro,
  type RegistroDaExecucao,
  type SituacaoDoRegistro,
} from './registro-da-execucao-contrato';

const ehObjeto = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Formato aceito para o id da geração no nome do arquivo (UUID cabe; nada que escape de um nome de arquivo). */
const FORMATO_DO_ID = /^[A-Za-z0-9_-]{8,128}$/;
const FORMATO_DO_CARIMBO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * Em que situação está o registro do parecer apresentado, lida de `aiReview.metadata`.
 *
 *   - `indisponivel`: a resposta não trouxe o registro (ou trouxe com formato não reconhecido). Traz o motivo.
 *   - `incompleto`: o registro existe e declara ausências (`completude.ausencias`). Pode ser exportado, com o aviso.
 *   - `disponivel`: o registro existe e declara que está completo.
 *
 * ⚠ Só a versão do esquema que este código conhece é aceita; outra versão é `indisponivel`, e não é lida "no que der".
 */
export function situacaoDoRegistro(metadata: unknown): SituacaoDoRegistro {
  if (!ehObjeto(metadata)) {
    return { situacao: 'indisponivel', motivo: 'O parecer apresentado não traz metadados da resposta.' };
  }
  const bruto = metadata.registroDaExecucao;
  if (bruto === undefined || bruto === null) {
    const aviso = metadata.registroDaExecucaoIndisponivel;
    const motivoDaRota = ehObjeto(aviso) && typeof aviso.motivo === 'string' && aviso.motivo !== '' ? aviso.motivo : null;
    return {
      situacao: 'indisponivel',
      motivo:
        motivoDaRota ??
        'A resposta desta geração não trouxe o registro da execução (parecer gerado por versão anterior da API, ou resposta sem o campo).',
    };
  }
  if (!ehObjeto(bruto)) {
    return { situacao: 'indisponivel', motivo: 'O registro recebido não é um objeto.' };
  }
  if (bruto.esquema !== ESQUEMA_DO_REGISTRO) {
    return { situacao: 'indisponivel', motivo: `Esquema de registro não reconhecido: ${String(bruto.esquema)}.` };
  }
  if (bruto.versaoDoEsquema !== VERSAO_DO_ESQUEMA_DO_REGISTRO) {
    return {
      situacao: 'indisponivel',
      motivo: `Versão do esquema não reconhecida: ${String(bruto.versaoDoEsquema)} (esta tela lê a versão ${VERSAO_DO_ESQUEMA_DO_REGISTRO}).`,
    };
  }
  const identificacao = bruto.identificacao;
  if (!ehObjeto(identificacao) || typeof identificacao.idDaGeracao !== 'string' || identificacao.idDaGeracao === '') {
    return { situacao: 'indisponivel', motivo: 'O registro não traz identificacao.idDaGeracao.' };
  }
  const completude = bruto.completude;
  if (!ehObjeto(completude) || typeof completude.completo !== 'boolean' || !Array.isArray(completude.ausencias)) {
    return { situacao: 'indisponivel', motivo: 'O registro não traz completude.completo e completude.ausencias no formato esperado.' };
  }
  const registro = bruto as unknown as RegistroDaExecucao;
  const ausencias = completude.ausencias as AusenciaDoRegistro[];
  // Conservador: contradição entre o booleano e a lista é tratada como incompleto.
  if (completude.completo === false || ausencias.length > 0) {
    return { situacao: 'incompleto', registro, ausencias };
  }
  return { situacao: 'disponivel', registro };
}

/** `registro-parecer-ia_<AAAAMMDDTHHMMSSZ>_<idDaGeracao>.json`; o instante é o início da chamada ao modelo, em UTC. */
export function nomeDoArquivoDoRegistro(registro: RegistroDaExecucao): string {
  const id = registro?.identificacao?.idDaGeracao;
  if (typeof id !== 'string' || !FORMATO_DO_ID.test(id)) {
    throw new Error('O registro não tem um idDaGeracao utilizável em nome de arquivo; a exportação foi interrompida.');
  }
  const inicio = registro.identificacao.inicioDaChamadaAoModelo;
  if (typeof inicio !== 'string' || !FORMATO_DO_CARIMBO.test(inicio)) {
    throw new Error('O registro não tem inicioDaChamadaAoModelo em ISO 8601 UTC; a exportação foi interrompida.');
  }
  const carimbo = inicio.replace(/\.\d+Z$/, 'Z').replace(/[-:]/g, '');
  return `registro-parecer-ia_${carimbo}_${id}.json`;
}

export interface DownloadPreparado {
  nomeDoArquivo: string;
  conteudo: string;
  tipoMime: string;
}

/**
 * Serializa o registro TAL COMO ESTÁ (indentação de 2 espaços e quebra de linha final; os resumos de integridade valem
 * para o valor lido do JSON, e não dependem de espaços). ⚠ Lança com a mensagem real se o registro não serializa.
 */
export function prepararDownloadDoRegistro(registro: RegistroDaExecucao): DownloadPreparado {
  const nomeDoArquivo = nomeDoArquivoDoRegistro(registro);
  const conteudo = JSON.stringify(registro, null, 2);
  if (typeof conteudo !== 'string') throw new Error('O registro não pôde ser serializado em JSON.');
  return { nomeDoArquivo, conteudo: `${conteudo}\n`, tipoMime: 'application/json;charset=utf-8' };
}

export interface AmbienteDeDownload {
  criarUrl(conteudo: string, tipoMime: string): string;
  revogarUrl(url: string): void;
  acionar(url: string, nomeDoArquivo: string): void;
}

function ambienteDoNavegador(): AmbienteDeDownload {
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Download indisponível: este ambiente não tem acesso ao navegador (document, Blob ou URL.createObjectURL ausentes).');
  }
  return {
    criarUrl: (conteudo, tipoMime) => URL.createObjectURL(new Blob([conteudo], { type: tipoMime })),
    revogarUrl: (url) => {
      // Adiado: revogar na mesma volta do evento pode cancelar o download em alguns navegadores.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    acionar: (url, nomeDoArquivo) => {
      const ancora = document.createElement('a');
      ancora.href = url;
      ancora.download = nomeDoArquivo;
      ancora.rel = 'noopener';
      document.body.appendChild(ancora);
      try {
        ancora.click();
      } finally {
        document.body.removeChild(ancora);
      }
    },
  };
}

/** Entrega o arquivo à pessoa. ⚠ Lança se o ambiente não puder baixar; a URL temporária é revogada mesmo em falha. */
export function baixarNoNavegador(preparo: DownloadPreparado, ambiente: AmbienteDeDownload = ambienteDoNavegador()): void {
  const url = ambiente.criarUrl(preparo.conteudo, preparo.tipoMime);
  try {
    ambiente.acionar(url, preparo.nomeDoArquivo);
  } finally {
    ambiente.revogarUrl(url);
  }
}
