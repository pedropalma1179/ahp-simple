/**
 * Wrapper Upstash Vector para Fase 6.3 RAG vetorial.
 * Stack congelada por docs/RAG_DECISIONS.md v2 §2.1 e §3.1.
 *
 * - Index: ahp-bocr-rag
 * - Distance: COSINE
 * - Dimensions: 1024 (Voyage-3)
 * - Singleton de Index para evitar reinstanciar
 * - upsertChunk e querySimilar com guards de dimensão
 * - deleteAll utilitário (uso APENAS em scripts de teste)
 */

import { Index } from '@upstash/vector';
import type { TentativaHttp } from './diagnostico';

const EXPECTED_DIMS = 1024;

// ============================================================
// A.30 — TRANSPORTE DIAGNOSTICADO DO CAMINHO DE BUSCA
// ============================================================
// O SDK descarta o status HTTP: `UpstashError` só carrega a mensagem, e com corpo
// vazio o parse falha antes e nem esse erro é construído. Para o status sobreviver é
// preciso ver a resposta, e o `Requester` é o ponto de extensão PÚBLICO do SDK,
// declarado em `dist/nodejs.d.mts:68`.
//
// ⚠ **Só o caminho de busca usa este transporte.** `upsertChunk` e `deleteAll`
// seguem no singleton `getIndex()`, sem alteração.
//
// ⚠ **O comportamento do transporte é PRESERVADO, não melhorado:** mesma montagem de
// URL, mesmo método, mesmos cabeçalhos, mesmo corpo, mesmas condições de repetição,
// mesma quantidade de tentativas e mesmos intervalos. **Nenhum tempo limite novo,
// nenhuma repetição por status.** O que muda é o diagnóstico.

/** Versão do SDK, para o cabeçalho de telemetria. O lockfile fixa 1.2.3. */
const VERSAO_SDK_UPSTASH = '1.2.3';
/** `attempts` padrão do `HttpClient`, e o laço vai de 0 a ele: até seis chamadas. */
const TENTATIVAS_PADRAO = 5;
/** Intervalo entre tentativas, igual ao backoff padrão do SDK. */
const esperaPadrao = (i: number) => Math.exp(i) * 50;

/** Erro de aplicação, com o mesmo `name` e as mesmas propriedades próprias do SDK. */
class UpstashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstashError';
  }
}

/** Reproduz `getRuntime()` do SDK. */
function runtimeDaTelemetria(): string {
  const versoes = process.versions as unknown as Record<string, string | undefined>;
  if (typeof process === 'object' && typeof process.versions === 'object' && versoes.bun) {
    return `bun@${versoes.bun}`;
  }
  const edge = (globalThis as unknown as Record<string, unknown>).EdgeRuntime;
  return typeof edge === 'string' ? 'edge-light' : `node@${process.version}`;
}

/**
 * Reproduz o ramo de telemetria do construtor do SDK, INCLUSIVE o desligamento.
 *
 * ⚠ **`UPSTASH_DISABLE_TELEMETRY` é honrado**, como em `dist/nodejs.js:937`: qualquer
 * valor verdadeiro zera os três cabeçalhos. Montá-los incondicionalmente enviaria
 * telemetria que a referência não envia, e o operador que desligou a telemetria não
 * teria como saber.
 *
 * ⚠ **A leitura é em tempo de montagem do `Requester`**, que é quando o SDK também a
 * faz: o construtor do `Index` lê o ambiente ao construir, não a cada requisição.
 */
function cabecalhosTelemetria(): Record<string, string> {
  if (process.env.UPSTASH_DISABLE_TELEMETRY) return {};
  return {
    'Upstash-Telemetry-Sdk': `upstash-vector-js@${VERSAO_SDK_UPSTASH}`,
    'Upstash-Telemetry-Platform': process.env.VERCEL ? 'vercel' : process.env.AWS_REGION ? 'aws' : 'unknown',
    'Upstash-Telemetry-Runtime': runtimeDaTelemetria(),
  };
}

/**
 * `Requester` que registra cada tentativa em `tentativas`, numeradas a partir de 1.
 *
 * ⚠ **O status é capturado ANTES de qualquer leitura**, então ele sobrevive mesmo
 * quando o parse falha depois. Resposta não exitosa e falha de parsing **coexistem**:
 * a tentativa fica com `status` e com `falha: 'leitura_ou_parsing'`.
 *
 * ⚠ **Nenhuma contagem de bytes é registrada.** `res.text()` decodifica, e byte
 * inválido vira caractere de reposição: um byte medido virava três. O que sobrava era
 * o tamanho do texto decodificado, e não o da resposta, sob o nome errado.
 */
function criarRequester(url: string, token: string, tentativas: TentativaHttp[]) {
  const baseUrl = url.replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    authorization: `Bearer ${token}`,
    ...cabecalhosTelemetria(),
  };

  return {
    request: async <T = unknown>(req: { path?: string[]; body?: unknown }): Promise<{ result?: T; error?: string }> => {
      const opcoes: RequestInit = {
        cache: 'no-store',
        method: 'POST',
        headers,
        body: JSON.stringify(req.body),
        keepalive: true,
      };
      const endereco = [baseUrl, ...(req.path ?? [])].join('/');

      let res: Response | null = null;
      let ultimoErro: unknown = null;
      let numero = 0;

      // Mesmo laço do SDK: repete SÓ quando o `fetch` lança, e resposta não exitosa
      // encerra o laço. ⚠ O ramo de `signal` do SDK é inalcançável neste caminho,
      // porque nenhum `AbortSignal` é passado aqui, então não é reproduzido.
      for (let i = 0; i <= TENTATIVAS_PADRAO; i++) {
        numero = i + 1;
        try {
          res = await fetch(endereco, opcoes);
          break;
        } catch (erro) {
          ultimoErro = erro;
          tentativas.push({ numero, falha: 'transporte' });
          if (i < TENTATIVAS_PADRAO) {
            await new Promise((r) => setTimeout(r, esperaPadrao(i)));
          }
        }
      }

      if (!res) {
        throw ultimoErro ?? new Error('Exhausted all retries');
      }

      const tentativa: TentativaHttp = { numero, status: res.status };
      tentativas.push(tentativa);

      let texto: string;
      try {
        texto = await res.text();
      } catch (erro) {
        // Leitura não concluiu. O status permanece: ele foi capturado antes.
        tentativa.falha = 'leitura_ou_parsing';
        throw erro;
      }

      let corpo: { result?: T; error?: string };
      try {
        corpo = JSON.parse(texto);
      } catch (erro) {
        tentativa.falha = 'leitura_ou_parsing';
        throw erro;
      }

      if (!res.ok) {
        tentativa.falha = 'http_nao_exitoso';
        throw new UpstashError(`${corpo.error}`);
      }

      return { result: corpo.result, error: corpo.error };
    },
  };
}

/** Lê a configuração do índice. Mesma verificação de `getIndex()`. */
function lerConfiguracao(): { url: string; token: string } {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      '[rag/upstash-client] UPSTASH_VECTOR_REST_URL e/ou UPSTASH_VECTOR_REST_TOKEN ausentes.'
    );
  }
  return { url, token };
}

/**
 * Lazy singleton do Index Upstash. Mesma justificativa de embed.ts:
 * env lido em tempo de chamada, não em tempo de import.
 */
let _index: Index | null = null;

function getIndex(): Index {
  if (_index) return _index;

  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      '[rag/upstash-client] UPSTASH_VECTOR_REST_URL e/ou UPSTASH_VECTOR_REST_TOKEN ausentes.'
    );
  }

  _index = new Index({ url, token });
  return _index;
}

/**
 * Metadata de um chunk indexado. Espelho do schema de docs/RAG_DECISIONS.md v2 §3.1.
 * Tipo `chunk_type` segue a enumeração da §3.
 */
export interface ChunkMetadata {
  article_id: string;
  article_year: number;
  article_type: string;
  chunk_type: 'claim' | 'formula' | 'threshold' | 'table_figure' | 'recommendation';
  chunk_index: number;
  text: string;
  verbatim_quote: string | null;
  page: number | null;
  locator_type: string | null;
  locator_id: string | null;
  usable_as: string | null;
}

/**
 * Resultado retornado por querySimilar. Inclui score de similaridade (0..1, COSINE).
 */
export interface RetrievedChunk {
  id: string;
  score: number;
  metadata: ChunkMetadata;
}

/**
 * Insere ou atualiza um chunk no index `ahp-bocr-rag`.
 *
 * @throws Error se vetor não tem 1024 dims
 */
export async function upsertChunk(
  id: string,
  vector: number[],
  metadata: ChunkMetadata
): Promise<void> {
  if (!id || id.trim().length === 0) {
    throw new Error('[rag/upstash-client] upsertChunk: id vazio.');
  }
  if (vector.length !== EXPECTED_DIMS) {
    throw new Error(
      `[rag/upstash-client] upsertChunk: vetor com ${vector.length} dims, esperado ${EXPECTED_DIMS}.`
    );
  }

  const index = getIndex();
  await index.upsert({
    id,
    vector,
    metadata: metadata as unknown as Record<string, unknown>,
  });
}

/**
 * Recupera os topK chunks mais similares ao vetor da query.
 *
 * @returns Array ordenado por score decrescente (mais similar primeiro)
 * @throws Error se vetor não tem 1024 dims, ou topK < 1
 */
export async function querySimilar(
  vector: number[],
  topK: number
): Promise<RetrievedChunk[]> {
  return (await consultarIndice(vector, topK, [])).chunks;
}

/**
 * Mesma consulta de `querySimilar`, devolvendo também o diagnóstico das tentativas.
 *
 * ⚠ **Um `Index` POR CONSULTA**, cada um com o seu `Requester`, que é o que garante
 * que tentativa e resposta pertençam à consulta certa sob `Promise.all`. O singleton
 * `getIndex()` continua servindo `upsertChunk` e `deleteAll`, sem alteração.
 *
 * @throws o mesmo que `querySimilar`, com `tentativas` já preenchido no momento em
 *         que a exceção sobe
 */
export async function consultarIndice(
  vector: number[],
  topK: number,
  tentativas: TentativaHttp[]
): Promise<{ chunks: RetrievedChunk[]; tentativas: TentativaHttp[] }> {
  if (vector.length !== EXPECTED_DIMS) {
    throw new Error(
      `[rag/upstash-client] querySimilar: vetor com ${vector.length} dims, esperado ${EXPECTED_DIMS}.`
    );
  }
  if (topK < 1) {
    throw new Error('[rag/upstash-client] querySimilar: topK deve ser >= 1.');
  }

  const { url, token } = lerConfiguracao();
  const index = new Index(criarRequester(url, token, tentativas));
  const results = await index.query({
    vector,
    topK,
    includeMetadata: true,
  });

  return {
    chunks: results.map((r) => ({
      id: String(r.id),
      score: r.score,
      metadata: r.metadata as unknown as ChunkMetadata,
    })),
    tentativas,
  };
}

/**
 * Apaga TODOS os vetores do index. Uso APENAS em scripts de teste e em scripts/ingest-rag.ts.
 * NÃO chamar em código de produção.
 */
export async function deleteAll(): Promise<void> {
  const index = getIndex();
  await index.reset();
}
