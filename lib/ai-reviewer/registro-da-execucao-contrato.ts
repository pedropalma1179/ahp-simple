/**
 * lib/ai-reviewer/registro-da-execucao-contrato.ts
 *
 * **O CONTRATO do registro de execução do Parecer IA** (esquema versionado). Só tipos e constantes, SEM Node: este
 * arquivo é importado também pelo navegador (a exportação na tela), e `node:crypto` não pode entrar no pacote do
 * cliente. A montagem do registro e os resumos SHA-256 estão em `registro-da-execucao.ts` (só servidor).
 *
 * ⚠ **O QUE O REGISTRO É.** Um documento JSON por geração, montado no servidor no ponto da chamada real ao provedor,
 * que guarda os insumos (entrada recebida, entrada normalizada, prompts finais, contexto bibliográfico), a configuração
 * efetivamente enviada, a resposta observada e o resultado ORIGINAL da validação automática. Documenta; NÃO garante que
 * uma nova chamada, com os mesmos insumos, produza o mesmo texto.
 *
 * ⚠ **O QUE O REGISTRO NÃO É.** Não é aprovação: `chamadaConcluida` descreve a chamada ao provedor, e a decisão sobre o
 * texto está em `avaliacaoAutomatica`. Não é arquivo: nada é gravado no servidor (ver `RETENCAO`).
 *
 * ⚠ **Ausência é `null` + entrada em `completude.ausencias`**, nunca valor plausível. Um campo `null` sem entrada
 * correspondente em `completude.ausencias` seria defeito do montador.
 */

export const ESQUEMA_DO_REGISTRO = 'ahp-bocr.parecer-ia.registro-da-execucao' as const;

/**
 * Versão do esquema. Qualquer mudança de nome, posição ou significado de campo incrementa este número. O leitor
 * (`situacaoDoRegistro`) reconhece só as versões que conhece, e trata as outras como registro indisponível.
 */
export const VERSAO_DO_ESQUEMA_DO_REGISTRO = 1 as const;

/** Onde o registro fica retido. ⚠ Só por download: o servidor não grava, e a tela guarda só em memória. */
export const RETENCAO =
  'Somente por download do arquivo JSON, a pedido da pessoa. O servidor não grava este registro (nenhuma coleção, nenhum arquivo) e a tela o mantém apenas em memória, junto do parecer apresentado: ao gerar outro parecer, trocar a execução exibida ou recarregar a página, o registro anterior deixa de estar disponível.';

export type EstadoDaRecuperacaoSemantica =
  | 'desabilitada'
  | 'sem_resultados'
  | 'com_resultados'
  | 'falha_parcial'
  | 'falha_em_todas_as_consultas'
  | 'indeterminado';

/** Uma ausência declarada: o campo (caminho com pontos a partir da raiz do registro) e a razão. */
export interface AusenciaDoRegistro {
  campo: string;
  motivo: string;
}

/** Como um resumo SHA-256 foi calculado: sobre o TEXTO (UTF-8 do próprio texto) ou sobre o OBJETO (serialização canônica). */
export type TratamentoDoResumo = 'texto' | 'objeto-canonico';

export interface ResumoDeIntegridade {
  /** Caminho com pontos do valor resumido; `$` é a raiz do registro SEM a chave `integridade`. */
  campo: string;
  tratamento: TratamentoDoResumo;
  sha256: string;
}

export interface BlocoDeConteudoRecebido {
  indice: number;
  /** Tipo informado pelo provedor (`text`, `thinking`, ...), ou `null` quando o bloco não o trouxe. */
  tipo: string | null;
  /** Só para `text`. ⚠ Nenhum conteúdo de raciocínio é registrado, nem o tamanho. */
  caracteres?: number;
}

export interface RegistroDaExecucao {
  esquema: typeof ESQUEMA_DO_REGISTRO;
  versaoDoEsquema: typeof VERSAO_DO_ESQUEMA_DO_REGISTRO;
  leituraDoRegistro: string[];
  retencao: string;
  identificacao: {
    idDaGeracao: string;
    projectId: string | null;
    idDoCalculo: string | null;
    inicioDaChamadaAoModelo: string;
    terminoDaChamadaAoModelo: string;
    duracaoDaChamadaMs: number;
    registroMontadoEm: string;
    fusoHorario: string;
    versaoDaApi: string;
    implantacao: {
      commit: string | null;
      idDaImplantacao: string | null;
      ambienteDaImplantacao: string | null;
    };
  };
  modelo: {
    provedor: string;
    chamadaConcluida: boolean;
    solicitado: string;
    identificadoNaResposta: string | null;
    idDaRespostaDoProvedor: string | null;
    parametrosEnviados: Record<string, unknown>;
    parametrosNaoEnviados: string;
    consumoDeTokens: Record<string, unknown> | null;
    motivoDeEncerramento: string | null;
    sequenciaDeParada: string | null;
    observacaoDoIntervalo: string;
  };
  entrada: {
    recebidaPelaApi: unknown;
    normalizada: unknown;
  };
  prompts: {
    system: string;
    mensagens: Array<{ role: string; content: string }>;
  };
  contextoBibliografico: {
    referenciasEstaticas: {
      origem: string;
      consistencia: unknown[];
      bocr: unknown[];
      sensibilidade: unknown[];
      criticasAdicionais: unknown[];
      limiaresPublicados: string;
      formulasBocr: string;
      benchmarks: string;
    };
    recuperacaoSemantica: {
      habilitada: boolean;
      origemDaHabilitacao: string;
      estado: EstadoDaRecuperacaoSemantica;
      consultasConfiguradas: string[];
      parametros: { topKPorConsulta: number; maximoPorArtigo: number; totalFinal: number };
      consultasExecutadas: Array<Record<string, unknown>>;
      estatisticas: Record<string, unknown>;
      trechosIncorporados: Array<{ posicaoNoPrompt: number; id: string; score: number; metadata: Record<string, unknown> }>;
      textoInjetadoNoPrompt: string;
      observacao: string;
    };
  };
  saida: {
    texto: string;
    caracteres: number;
    blocosDeConteudoRecebidos: BlocoDeConteudoRecebido[] | null;
    indiceDoBlocoDeTextoUsado: number | null;
  };
  avaliacaoAutomatica: {
    validacao: unknown;
    sha256DoTextoValidado: string;
    apresentacao: { estado: string; quarantined: boolean; titulo: string; motivos: string[]; warnings: string[] };
    aprovada: boolean;
    extracaoDeNotaEVeredicto: Record<string, unknown>;
    observacao: string;
  };
  integridade: {
    algoritmo: 'SHA-256';
    formatoDoResumo: string;
    tratamentoDeTexto: string;
    serializacaoCanonica: string;
    observacao: string;
    resumos: ResumoDeIntegridade[];
  };
  completude: {
    completo: boolean;
    ausencias: AusenciaDoRegistro[];
  };
}

/** Os três estados em que a tela encontra o registro de um parecer apresentado. */
export type SituacaoDoRegistro =
  | { situacao: 'disponivel'; registro: RegistroDaExecucao }
  | { situacao: 'incompleto'; registro: RegistroDaExecucao; ausencias: AusenciaDoRegistro[] }
  | { situacao: 'indisponivel'; motivo: string };
