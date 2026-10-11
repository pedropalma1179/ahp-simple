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

class Duplo {
  /** coleção -> id -> { dados, versao } */
  private colecoes = new Map<string, Map<string, { dados: Registro; versao: number }>>();
  /** Todas as escritas aplicadas, na ordem. */
  escritas: EscritaRegistrada[] = [];

  reset(): void {
    this.colecoes = new Map();
    this.escritas = [];
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
  }

  ler(col: string, id: string): Registro | undefined {
    const e = this.col(col).get(id);
    return e ? estruturado(e.dados) : undefined;
  }

  versao(col: string, id: string): number {
    return this.col(col).get(id)?.versao ?? 0;
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
    this.escritas.push({ op: e.op, col: e.col, id: e.id, data: e.data ? estruturado(e.data) : undefined });
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
    getDoc: async (ref: Ref) => instantanea(ref),
    getDocs: async (q: ConsultaSimulada) => {
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
  };
}
