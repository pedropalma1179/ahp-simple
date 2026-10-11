/**
 * lib/__tests__/helpers/firestore-duplo.ts
 *
 * Firestore SIMULADO, em memória, compartilhado pelos testes que exercitam rotas de `app/api/`.
 *
 * ⚠ **É DUPLO DE TESTE, e não caminho de produção.** Nenhum código deste arquivo roda na
 * aplicação, e nenhum teste que o usa toca o Firestore real, a rede ou dado de respondente.
 * O que ele reproduz do serviço, e o que NÃO reproduz, está declarado em cada função.
 *
 * Uso, em cada arquivo de teste (a fábrica do `jest.mock` é içada, e por isso faz `require`
 * dentro dela):
 *
 *   jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));
 *   jest.mock('firebase/firestore', () => require('./helpers/firestore-duplo').moduloFirestoreSimulado());
 *   const { duplo } = require('./helpers/firestore-duplo');
 *
 * O módulo é uma instância só por arquivo de teste (o registro de módulos do jest é por
 * arquivo), então `duplo` é o mesmo objeto para a rota e para o teste.
 *
 * ⚠ **TRANSAÇÕES (`runTransaction`).** O duplo reproduz o que as entregas de F07 usam do serviço:
 *   - o SDK web faz CONTROLE OTIMISTA: cada documento lido guarda a versão vista, e a confirmação
 *     só vale se nenhum deles mudou; se algum mudou, a função da transação é REPETIDA do início, e
 *     a releitura enxerga o estado novo (é o que a idempotência por pedido usa);
 *   - leitura depois de escrita na mesma transação é ERRO ("all reads before all writes");
 *   - as escritas só são aplicadas na confirmação, todas ou nenhuma: um valor inválido em QUALQUER
 *     uma impede todas;
 *   - documento lido e ausente também é protegido (versão 0), então a criação concorrente de um
 *     documento que a transação viu ausente provoca a repetição.
 * O que o duplo NÃO reproduz: latência, limite de tentativas do serviço (aqui `MAXIMO_DE_TENTATIVAS`),
 * limites de tamanho e de escritas por transação, regras de segurança, índices.
 *
 * Ganchos de teste (nenhum existe no serviço real):
 *   - `antesDaConfirmacao` roda depois da função da transação e ANTES da conferência de versões, e
 *     permite simular que outra chamada confirmou no meio (ou parar duas chamadas num ponto comum,
 *     para que a corrida seja determinística e não dependa da ordem de microtarefas);
 *   - `depoisDeLer` roda depois que um `getDoc` FORA de transação capturou o que devolverá, e permite
 *     criar um documento na janela entre a leitura e a transação seguinte (o que o leitor vê já foi
 *     decidido: a mudança só é vista pela leitura seguinte).
 */

type Registro = Record<string, unknown>;

export interface EscritaRegistrada {
  op: 'set' | 'update' | 'delete';
  col: string;
  id: string;
  data?: Registro;
}

/**
 * ⚠ O serviço real RECUSA valor `undefined` em campo de documento (a menos que
 * `ignoreUndefinedProperties` esteja ligado, e não está em `lib/firebase.ts`). O duplo reproduz
 * essa recusa: sem ela, uma rota que gravasse `undefined` passaria nos testes e falharia em
 * produção. Também recusa função e símbolo. `NaN` e `Infinity` o serviço aceita, e o duplo também
 * (como o JSON os perderia, a cópia é feita por `estruturado`).
 */
function validarCampos(valor: unknown, caminho: string): void {
  if (valor === undefined) {
    throw new Error(`Function setDoc() called with invalid data. Unsupported field value: undefined (found in field ${caminho})`);
  }
  if (typeof valor === 'function' || typeof valor === 'symbol') {
    throw new Error(`Unsupported field value: ${typeof valor} (found in field ${caminho})`);
  }
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => validarCampos(v, `${caminho}[${i}]`));
  } else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor as Registro)) validarCampos(v, `${caminho}.${k}`);
  }
}

/**
 * Cópia profunda que PRESERVA NaN e Infinity (o JSON os transformaria em null).
 *
 * ⚠ **NÃO usa `structuredClone`, de propósito.** Dentro do jest, `structuredClone` é do Node e
 * devolve objetos do realm de FORA do contexto de teste, cujo `Object.prototype` não é o do
 * código sob teste. O serializador de julgamentos (`lib/julgamentos-resumo.ts`) exige objeto
 * simples e recusava tudo ("valor não simples (Object)"): a primeira captura de F07 saiu com todos
 * os resumos individuais e o do painel nulos. Medido na primeira execução do instrumento. A cópia
 * recursiva abaixo cria os objetos no realm de quem a chama.
 */
function estruturado<T>(x: T): T {
  if (x === null || typeof x !== 'object') return x;
  if (Array.isArray(x)) return x.map(estruturado) as unknown as T;
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) saida[k] = estruturado(v);
  return saida as T;
}

export const MAXIMO_DE_TENTATIVAS = 5;

export interface LeituraRegistrada {
  via: 'getDoc' | 'getDocs' | 'transacao';
  col: string;
  /** Ausente em `getDocs`. */
  id?: string;
}

export interface TentativaDeTransacao {
  /** Ordem de abertura da transação, a partir de 1. */
  numero: number;
  tentativa: number;
  desfecho: 'confirmada' | 'repetida-por-contencao' | 'erro';
}

class Duplo {
  /** coleção -> id -> { dados, versao } */
  private colecoes = new Map<string, Map<string, { dados: Registro; versao: number }>>();
  /**
   * Versão por documento, MONOTÔNICA e global. Uma exclusão também avança a versão (o documento
   * apagado e recriado não volta a uma versão já vista por quem leu antes).
   */
  private versoes = new Map<string, number>();
  private relogio = 0;
  private abertas = 0;
  /** Todas as escritas aplicadas, na ordem. */
  escritas: EscritaRegistrada[] = [];
  /** Toda leitura feita pelo módulo simulado, na ordem. */
  leituras: LeituraRegistrada[] = [];
  /** Cada tentativa de cada transação, na ordem. */
  tentativas: TentativaDeTransacao[] = [];
  /** Gancho de teste: ver o cabeçalho. */
  antesDaConfirmacao: ((ctx: { numero: number; tentativa: number }) => void | Promise<void>) | null = null;
  depoisDeLer: ((leitura: LeituraRegistrada) => void | Promise<void>) | null = null;

  reset(): void {
    this.colecoes = new Map();
    this.versoes = new Map();
    this.relogio = 0;
    this.abertas = 0;
    this.escritas = [];
    this.leituras = [];
    this.tentativas = [];
    this.antesDaConfirmacao = null;
    this.depoisDeLer = null;
  }

  /** Quantas leituras houve na coleção, opcionalmente por via. */
  quantasLeituras(col: string, via?: LeituraRegistrada['via']): number {
    return this.leituras.filter(l => l.col === col && (via === undefined || l.via === via)).length;
  }

  private col(nome: string) {
    let c = this.colecoes.get(nome);
    if (!c) {
      c = new Map();
      this.colecoes.set(nome, c);
    }
    return c;
  }

  /** Semeia um documento SEM registrar escrita: é o estado inicial do teste. */
  semear(col: string, id: string, dados: Registro): void {
    validarCampos(dados, `${col}/${id}`);
    this.col(col).set(id, { dados: estruturado(dados), versao: 1 });
    this.versoes.set(`${col}/${id}`, ++this.relogio);
  }

  ler(col: string, id: string): Registro | undefined {
    const e = this.col(col).get(id);
    return e ? estruturado(e.dados) : undefined;
  }

  /** Versão do documento; 0 se nunca existiu. Avança em toda escrita, inclusive exclusão. */
  versao(col: string, id: string): number {
    return this.versoes.get(`${col}/${id}`) ?? 0;
  }

  todos(col: string): { id: string; data: Registro }[] {
    return [...this.col(col).entries()].map(([id, e]) => ({ id, data: estruturado(e.dados) }));
  }

  /** Quantos documentos há na coleção. */
  quantos(col: string): number {
    return this.col(col).size;
  }

  /** Aplica uma escrita. Usado pelo `setDoc`/`updateDoc`/`deleteDoc` e, no fim, pelas transações. */
  aplicar(e: EscritaRegistrada): void {
    const c = this.col(e.col);
    if (e.op === 'set') {
      validarCampos(e.data, `${e.col}/${e.id}`);
      c.set(e.id, { dados: estruturado(e.data as Registro), versao: (c.get(e.id)?.versao ?? 0) + 1 });
    } else if (e.op === 'update') {
      const atual = c.get(e.id);
      if (!atual) throw new Error(`No document to update: ${e.col}/${e.id}`);
      validarCampos(e.data, `${e.col}/${e.id}`);
      c.set(e.id, { dados: { ...atual.dados, ...estruturado(e.data as Registro) }, versao: atual.versao + 1 });
    } else {
      c.delete(e.id);
    }
    this.versoes.set(`${e.col}/${e.id}`, ++this.relogio);
    this.escritas.push({ op: e.op, col: e.col, id: e.id, data: e.data ? estruturado(e.data) : undefined });
  }

  /**
   * Abre uma transação. `fn` recebe o objeto `tx` com `get`, `set`, `update` e `delete`.
   * Ver o cabeçalho do arquivo para o que é reproduzido.
   */
  async transacao<T>(fn: (tx: any) => Promise<T>, leitura: (col: string, id: string) => unknown): Promise<T> {
    const numero = ++this.abertas;
    for (let tentativa = 1; tentativa <= MAXIMO_DE_TENTATIVAS; tentativa++) {
      const lidas = new Map<string, { col: string; id: string; versao: number }>();
      const pendentes: EscritaRegistrada[] = [];
      const tx: any = {
        get: async (ref: { __col: string; __id: string }) => {
          if (pendentes.length > 0) {
            throw new Error('Firestore transactions require all reads to be executed before all writes.');
          }
          this.leituras.push({ via: 'transacao', col: ref.__col, id: ref.__id });
          const k = `${ref.__col}/${ref.__id}`;
          if (!lidas.has(k)) lidas.set(k, { col: ref.__col, id: ref.__id, versao: this.versao(ref.__col, ref.__id) });
          return leitura(ref.__col, ref.__id);
        },
        set: (ref: { __col: string; __id: string }, data: Registro) => {
          pendentes.push({ op: 'set', col: ref.__col, id: ref.__id, data });
          return tx;
        },
        update: (ref: { __col: string; __id: string }, data: Registro) => {
          pendentes.push({ op: 'update', col: ref.__col, id: ref.__id, data });
          return tx;
        },
        delete: (ref: { __col: string; __id: string }) => {
          pendentes.push({ op: 'delete', col: ref.__col, id: ref.__id });
          return tx;
        },
      };

      let resultado: T;
      try {
        resultado = await fn(tx);
        if (this.antesDaConfirmacao) await this.antesDaConfirmacao({ numero, tentativa });
      } catch (e) {
        this.tentativas.push({ numero, tentativa, desfecho: 'erro' });
        throw e;
      }

      const mudou = [...lidas.values()].some(l => this.versao(l.col, l.id) !== l.versao);
      if (mudou) {
        this.tentativas.push({ numero, tentativa, desfecho: 'repetida-por-contencao' });
        continue;
      }

      // Todas ou nenhuma: valida tudo ANTES de aplicar a primeira.
      try {
        for (const e of pendentes) {
          if (e.op !== 'delete') validarCampos(e.data, `${e.col}/${e.id}`);
          if (e.op === 'update' && !this.col(e.col).has(e.id)) throw new Error(`No document to update: ${e.col}/${e.id}`);
        }
      } catch (e) {
        this.tentativas.push({ numero, tentativa, desfecho: 'erro' });
        throw e;
      }
      for (const e of pendentes) this.aplicar(e);
      this.tentativas.push({ numero, tentativa, desfecho: 'confirmada' });
      return resultado;
    }
    throw new Error(`Transaction failed after ${MAXIMO_DE_TENTATIVAS} attempts (contention)`);
  }
}

export const duplo = new Duplo();

type Ref = { __col: string; __id: string };
type ConsultaSimulada = { __col: string; __filtros: { field: string; op: string; value: unknown }[] };

/** O módulo `firebase/firestore` simulado. */
export function moduloFirestoreSimulado() {
  const instantanea = (ref: Ref) => {
    const dados = duplo.ler(ref.__col, ref.__id);
    return { exists: () => dados !== undefined, id: ref.__id, ref, data: () => dados };
  };

  return {
    collection: (_db: unknown, nome: string) => ({ __col: nome, __filtros: [] }),
    query: (ref: ConsultaSimulada, ...filtros: any[]) => ({ __col: ref.__col, __filtros: [...ref.__filtros, ...filtros] }),
    where: (field: string, op: string, value: unknown) => ({ field, op, value }),
    doc: (_db: unknown, col: string, id: string): Ref => ({ __col: col, __id: id }),
    getDoc: async (ref: Ref) => {
      const leitura: LeituraRegistrada = { via: 'getDoc', col: ref.__col, id: ref.__id };
      duplo.leituras.push(leitura);
      const lida = instantanea(ref); // capturada ANTES do gancho
      if (duplo.depoisDeLer) await duplo.depoisDeLer(leitura);
      return lida;
    },
    getDocs: async (q: ConsultaSimulada) => {
      duplo.leituras.push({ via: 'getDocs', col: q.__col });
      const docs = duplo
        .todos(q.__col)
        .filter(d => q.__filtros.every(f => f.op === '==' && (d.data as any)[f.field] === f.value))
        .map(d => ({ id: d.id, data: () => d.data }));
      return { docs, size: docs.length };
    },
    setDoc: async (ref: Ref, data: Registro) => {
      duplo.aplicar({ op: 'set', col: ref.__col, id: ref.__id, data });
    },
    updateDoc: async (ref: Ref, data: Registro) => {
      duplo.aplicar({ op: 'update', col: ref.__col, id: ref.__id, data });
    },
    deleteDoc: async (ref: Ref) => {
      duplo.aplicar({ op: 'delete', col: ref.__col, id: ref.__id });
    },
    runTransaction: async (_db: unknown, fn: (tx: any) => Promise<any>) =>
      duplo.transacao(fn, (col, id) => instantanea({ __col: col, __id: id })),
  };
}
