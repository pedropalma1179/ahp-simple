/**
 * lib/__tests__/helpers/procedencia-da-regravacao.ts
 *
 * **F07 A8: a PROCEDÊNCIA de uma regravação de artefato de medição, conferida contra o que foi MEDIDO, e
 * não contra a lista que o próprio teste declara.**
 *
 * ⚠ **O defeito que isto fecha.** Os escritores de `docs/dados/a12-diagnostico/medicao.json` e de
 * `docs/dados/a12-rastreabilidade/medicao.json` escreviam sem conferir nada: a lista de procedência que
 * ia para o artefato era a constante do próprio teste, e o teste de comparação comparava a constante com o
 * que ela mesma escreveu. Regravar SEM acrescentar entrada funcionava (o artefato recebia valores de hoje
 * sob a lista de ontem) e o teste passava. As duas listas saem da mesma mão; comparar uma com a outra
 * não prova nada. `exigirProcedenciaCorrespondente` compara a entrada com FATOS que não saem da mão de
 * quem escreveu a entrada:
 *
 *   - o HEAD do repositório (`git rev-parse HEAD`);
 *   - a versão ANTERIOR do artefato (`git show HEAD:<artefato>`);
 *   - a medição nova, folha a folha contra essa versão anterior;
 *   - o conteúdo, no HEAD, dos arquivos de código cujos resumos o artefato grava.
 *
 * ⚠ **A âncora é `commitDaBase` = HEAD, e a entrada NÃO referencia o commit que a contém** (isso seria
 * circular: o hash do commit depende do conteúdo, entrada inclusive). `commitDaBase` é o estado SOBRE o
 * qual a regravação foi feita; o commit que a registra vem depois. É a convenção vigente (a entrada 14 de
 * `a12-diagnostico` tem base `b55efec`, e foi registrada em commit posterior).
 *
 * ⚠ **O que isto NÃO prova.** Que o `motivo` seja verdadeiro, ou que o autor tenha entendido a causa de cada
 * campo: o `motivo` é texto. Prova que a entrada existe, que acumula sem alterar o histórico, que cita
 * exatamente os campos que mudaram, que nenhum campo se perdeu, e que os valores anterior e novo de cada um
 * coincidem com o git e com a medição.
 *
 * ⚠ **NOTAÇÃO DOS CAMINHOS** (a mesma que as entradas antigas usam):
 *   - `a.b`            propriedade de identificador;
 *   - `a[chave/com.pontos]`  propriedade de nome que não é identificador (os colchetes podem conter
 *                      colchetes balanceados: `codigo[app/decisor/[projectId]/page.tsx]`);
 *   - `a[3]`           índice de array;
 *   - `a[]`, `a[1..4]` ABREVIAÇÕES: todos os elementos, e a faixa fechada. Só as entradas ANTIGAS as usam.
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const IDENTIFICADOR = /^[A-Za-z_$][\w$]*$/;

export const sha256 = (texto: string): string => crypto.createHash('sha256').update(texto, 'utf8').digest('hex');

// ─────────────────────────────────────────────────────────────────────────────
// Folhas e caminhos
// ─────────────────────────────────────────────────────────────────────────────

/** Acrescenta uma chave ou um índice a um caminho, na notação acima. */
export function acrescentar(pai: string, chave: string | number): string {
  if (typeof chave === 'number') return `${pai}[${chave}]`;
  if (pai === '') return IDENTIFICADOR.test(chave) ? chave : `[${chave}]`;
  return IDENTIFICADOR.test(chave) ? `${pai}.${chave}` : `${pai}[${chave}]`;
}

const eContainer = (v: unknown): v is Record<string, unknown> | unknown[] => v !== null && typeof v === 'object';
const containerVazio = (v: unknown): boolean => eContainer(v) && (Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0);

/**
 * As folhas de um valor JSON: caminho para o valor serializado. Escalares são folhas; um array ou objeto
 * VAZIO também é folha (o seu desaparecimento é uma perda).
 */
export function folhas(valor: unknown, caminho = '', mapa: Map<string, string> = new Map()): Map<string, string> {
  if (!eContainer(valor) || containerVazio(valor)) {
    mapa.set(caminho, JSON.stringify(valor));
  } else if (Array.isArray(valor)) {
    valor.forEach((x, i) => folhas(x, acrescentar(caminho, i), mapa));
  } else {
    for (const k of Object.keys(valor)) folhas((valor as Record<string, unknown>)[k], acrescentar(caminho, k), mapa);
  }
  return mapa;
}

type Segmento = { t: 'nome'; s: string } | { t: 'col'; s: string };

/** Quebra um caminho em segmentos. `null` se os colchetes não fecham ou se há segmento vazio. */
export function interpretar(caminho: string): Segmento[] | null {
  const segs: Segmento[] = [];
  let i = 0;
  let nome = '';
  while (i < caminho.length && caminho[i] !== '.' && caminho[i] !== '[') nome += caminho[i++];
  if (nome) segs.push({ t: 'nome', s: nome });
  while (i < caminho.length) {
    if (caminho[i] === '.') {
      i++;
      let n = '';
      while (i < caminho.length && caminho[i] !== '.' && caminho[i] !== '[') n += caminho[i++];
      if (!n) return null;
      segs.push({ t: 'nome', s: n });
    } else if (caminho[i] === '[') {
      let profundidade = 1;
      let j = i + 1;
      while (j < caminho.length && profundidade > 0) {
        if (caminho[j] === '[') profundidade++;
        else if (caminho[j] === ']') profundidade--;
        j++;
      }
      if (profundidade !== 0) return null;
      segs.push({ t: 'col', s: caminho.slice(i + 1, j - 1) });
      i = j;
    } else {
      return null;
    }
  }
  return segs;
}

export interface Resolucao {
  /** a notação é interpretável */
  valido: boolean;
  /** TODOS os ramos do caminho existem no valor */
  existe: boolean;
  /** os caminhos canônicos das folhas alcançadas (um container alcançado contribui com as folhas dele) */
  folhas: string[];
  /** o caminho é EXATO: sem abreviação, sem container, um único nó, e escrito na notação canônica */
  exato: boolean;
  /** algum nó alcançado é container não vazio (uma entrada que cita `identificacao` inteira cai aqui) */
  container: boolean;
}

/** Resolve um caminho (inclusive as abreviações) contra um valor JSON. */
export function resolver(raiz: unknown, caminho: string): Resolucao {
  const segs = interpretar(caminho);
  if (!segs || segs.length === 0) return { valido: false, existe: false, folhas: [], exato: false, container: false };
  let nos: { v: unknown; p: string }[] = [{ v: raiz, p: '' }];
  let existe = true;
  let abreviado = false;
  for (const g of segs) {
    const prox: { v: unknown; p: string }[] = [];
    for (const n of nos) {
      const v = n.v;
      const obj = eContainer(v) && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
      if (g.t === 'nome') {
        if (obj && Object.prototype.hasOwnProperty.call(obj, g.s)) prox.push({ v: obj[g.s], p: acrescentar(n.p, g.s) });
        else existe = false;
      } else if (g.s === '') {
        abreviado = true;
        if (Array.isArray(v)) v.forEach((x, i) => prox.push({ v: x, p: acrescentar(n.p, i) }));
        else if (obj) Object.keys(obj).forEach(k => prox.push({ v: obj[k], p: acrescentar(n.p, k) }));
        else existe = false;
      } else if (/^\d+\.\.\d+$/.test(g.s) && Array.isArray(v)) {
        abreviado = true;
        const [de, ate] = g.s.split('..').map(Number);
        for (let i = de; i <= ate; i++) {
          if (i < v.length) prox.push({ v: v[i], p: acrescentar(n.p, i) });
          else existe = false;
        }
      } else if (/^\d+$/.test(g.s) && Array.isArray(v)) {
        const i = Number(g.s);
        if (i < v.length) prox.push({ v: v[i], p: acrescentar(n.p, i) });
        else existe = false;
      } else if (obj && Object.prototype.hasOwnProperty.call(obj, g.s)) {
        prox.push({ v: obj[g.s], p: acrescentar(n.p, g.s) });
      } else {
        existe = false;
      }
    }
    nos = prox;
    if (nos.length === 0) {
      existe = false;
      break;
    }
  }
  const container = nos.some(n => eContainer(n.v) && !containerVazio(n.v));
  const alcancadas: string[] = [];
  for (const n of nos) {
    if (eContainer(n.v) && !containerVazio(n.v)) for (const p of folhas(n.v, n.p).keys()) alcancadas.push(p);
    else alcancadas.push(n.p);
  }
  const exato = existe && !abreviado && !container && nos.length === 1 && nos[0].p === caminho;
  return { valido: true, existe, folhas: alcancadas, exato, container };
}

/** O valor serializado da folha em `caminho` (ou `undefined` se não for folha exata). */
export function valorDaFolha(raiz: unknown, caminho: string): string | undefined {
  return folhas(raiz).get(caminho);
}

const dentroDe = (p: string, prefixo: string): boolean => p === prefixo || p.startsWith(`${prefixo}[`) || p.startsWith(`${prefixo}.`);

export interface Diferenca {
  mudadas: string[];
  novas: string[];
  perdidas: string[];
}

/** Diferença por FOLHA entre duas versões, ignorando as folhas sob os prefixos dados. */
export function diferencaDeFolhas(antes: unknown, depois: unknown, ignorar: string[] = []): Diferenca {
  const fa = folhas(antes);
  const fd = folhas(depois);
  const fora = (p: string) => ignorar.some(i => dentroDe(p, i));
  const d: Diferenca = { mudadas: [], novas: [], perdidas: [] };
  for (const [p, v] of fd) {
    if (fora(p)) continue;
    if (!fa.has(p)) d.novas.push(p);
    else if (fa.get(p) !== v) d.mudadas.push(p);
  }
  for (const p of fa.keys()) {
    if (fora(p)) continue;
    if (!fd.has(p)) d.perdidas.push(p);
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resumos que o teste fixa (âncoras), sem depender do git em tempo de execução
// ─────────────────────────────────────────────────────────────────────────────

/** Serialização canônica: chaves ordenadas. */
export function canonico(v: unknown): string {
  if (!eContainer(v)) return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonico((v as Record<string, unknown>)[k])}`).join(',')}}`;
}

/** O resumo do HISTÓRICO: as primeiras `n` entradas da lista. */
export function resumoDoHistorico(lista: unknown[], n: number): string {
  return sha256(canonico(lista.slice(0, n)));
}

/**
 * O resumo do CONJUNTO DE CAMINHOS de folha de um artefato, SEM as folhas das entradas de procedência de índice
 * `>= apartirDe`. Se nada se perdeu e nada foi acrescentado fora das entradas novas, este resumo é igual ao da
 * versão anterior do artefato.
 */
export function resumoDosCaminhos(artefato: unknown, caminhoDaLista: string, apartirDe: number): string {
  const prefixo = `${caminhoDaLista}[`;
  const caminhos = [...folhas(artefato).keys()].filter(p => {
    if (!p.startsWith(prefixo)) return true;
    const indice = Number(p.slice(prefixo.length, p.indexOf(']', prefixo.length)));
    return !(indice >= apartirDe);
  });
  return sha256(caminhos.sort().join('\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Conferência das entradas
// ─────────────────────────────────────────────────────────────────────────────

const HEX40 = /^[0-9a-f]{40}$/;

export function obter(objeto: any, caminho: string[]): any {
  return caminho.reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), objeto);
}

/** As invariantes da LISTA (acumulação, ordem, bases distintas). */
export function violacoesDaLista(lista: any[], opcoes: { commitDaBaseOriginal?: string; minimo?: number } = {}): string[] {
  const v: string[] = [];
  if (!Array.isArray(lista)) return ['a lista de procedência não é um array'];
  if (lista.length < (opcoes.minimo ?? 2)) v.push(`a lista tem ${lista.length} entrada(s), e o mínimo é ${opcoes.minimo ?? 2}`);
  lista.forEach((e, i) => {
    if (e?.ordem !== i + 1) v.push(`a entrada de índice ${i} tem ordem ${JSON.stringify(e?.ordem)}, e a sequência exige ${i + 1}`);
    if (typeof e?.commitDaBase !== 'string' || !HEX40.test(e.commitDaBase)) v.push(`a entrada de ordem ${e?.ordem} tem commitDaBase que não é um hash de 40 hexadecimais`);
  });
  const bases = lista.map(e => e?.commitDaBase);
  if (new Set(bases).size !== bases.length) v.push('há commitDaBase repetido na lista');
  if (opcoes.commitDaBaseOriginal !== undefined) {
    for (const b of bases) if (b === opcoes.commitDaBaseOriginal) v.push(`uma base de regravação é igual ao commitDaBase histórico ${opcoes.commitDaBaseOriginal}`);
  }
  return v;
}

/**
 * As exigências de uma entrada, contra a MEDIÇÃO. `estrita` é para as entradas novas (A8 em diante): cada
 * caminho tem de ser uma FOLHA EXATA. As antigas (`estrita: false`) só têm de EXISTIR: usam abreviações e
 * alguns containers, e isso foi medido, não presumido.
 */
export function violacoesDaEntrada(e: any, medicao: unknown, o: { comando: string; estrita: boolean }): string[] {
  const v: string[] = [];
  const rotulo = `entrada de ordem ${e?.ordem}`;
  if (typeof e?.motivo !== 'string' || e.motivo.trim().length < 30) v.push(`${rotulo}: o motivo está ausente ou é curto demais para explicar uma regravação (mínimo 30 caracteres)`);
  if (typeof e?.commitDaBase !== 'string' || !HEX40.test(e.commitDaBase)) v.push(`${rotulo}: commitDaBase não é um hash de 40 hexadecimais`);
  if (e?.comando !== o.comando) v.push(`${rotulo}: o comando ${JSON.stringify(e?.comando)} não é ${JSON.stringify(o.comando)}`);
  const a = e?.ambiente;
  if (!a || typeof a.plataforma !== 'string' || typeof a.arch !== 'string' || typeof a.node !== 'string') v.push(`${rotulo}: o ambiente não traz plataforma, arch e node`);
  if (!Array.isArray(e?.camposRegravados) || e.camposRegravados.length === 0) {
    v.push(`${rotulo}: camposRegravados está ausente ou vazio`);
    return v;
  }
  if (new Set(e.camposRegravados).size !== e.camposRegravados.length) v.push(`${rotulo}: camposRegravados repete caminho`);
  for (const c of e.camposRegravados) {
    if (typeof c !== 'string' || c.trim() === '') {
      v.push(`${rotulo}: camposRegravados traz item que não é um caminho`);
      continue;
    }
    const r = resolver(medicao, c);
    if (!r.valido) v.push(`${rotulo}: o caminho ${JSON.stringify(c)} não é interpretável`);
    else if (!r.existe) v.push(`${rotulo}: o caminho ${JSON.stringify(c)} NÃO existe no artefato`);
    else if (o.estrita && !r.exato) v.push(`${rotulo}: o caminho ${JSON.stringify(c)} não é uma folha exata (${r.container ? 'é um container, isto é, genérico' : 'usa abreviação ou não está na notação canônica'})`);
  }
  if (typeof e?.camposPerdidos !== 'number' || e.camposPerdidos !== 0) v.push(`${rotulo}: camposPerdidos é ${JSON.stringify(e?.camposPerdidos)}, e tem de ser 0 medido`);
  if (o.estrita) {
    const ant = e?.valorAnterior;
    const nov = e?.valorNovo;
    if (!ant || !nov || typeof ant !== 'object' || typeof nov !== 'object') {
      v.push(`${rotulo}: valorAnterior e valorNovo são obrigatórios nas entradas novas`);
    } else {
      const decl = new Set<string>(e.camposRegravados);
      if (JSON.stringify([...Object.keys(nov)].sort()) !== JSON.stringify([...decl].sort())) v.push(`${rotulo}: as chaves de valorNovo não são exatamente camposRegravados`);
      for (const c of Object.keys(nov)) {
        const atual = valorDaFolha(medicao, c);
        if (atual === undefined) continue;
        if (JSON.stringify(nov[c]) !== atual) v.push(`${rotulo}: valorNovo de ${c} não coincide com a medição`);
        if (Object.prototype.hasOwnProperty.call(ant, c) && JSON.stringify(ant[c]) === atual) v.push(`${rotulo}: valorAnterior de ${c} é igual ao valor novo, então o campo não foi regravado`);
      }
      for (const c of Object.keys(ant)) if (!decl.has(c)) v.push(`${rotulo}: valorAnterior cita ${c}, que não está em camposRegravados`);
    }
  }
  return v;
}

// ─────────────────────────────────────────────────────────────────────────────
// A RECUSA
// ─────────────────────────────────────────────────────────────────────────────

const git = (raiz: string, ...args: string[]): string =>
  execFileSync('git', ['-C', raiz, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });

export interface ArgumentosDaRecusa {
  /** a raiz do repositório */
  raiz: string;
  /** o artefato, relativo à raiz (com `/`) */
  artefato: string;
  /** o objeto que o escritor vai gravar */
  novo: any;
  /** onde fica a lista de procedência dentro do artefato */
  caminhoDaLista: string[];
  /** o comando exato que regrava */
  comando: string;
  /** o `commitDaBase` histórico, que nenhuma base de regravação pode igualar */
  commitDaBaseOriginal?: string;
  /** onde ficam os resumos de código (arquivo → sha256), para conferir que o código medido está no HEAD */
  caminhoDoCodigo?: string[];
}

export interface MedicaoDaRegravacao {
  head: string;
  entradaNova: any;
  diferenca: Diferenca;
  violacoes: string[];
}

/**
 * Mede a regravação que `novo` representa e devolve as violações. Não escreve, não lança por violação (só
 * por falha de ambiente). `exigirProcedenciaCorrespondente` é quem recusa.
 */
export function medirRegravacao(a: ArgumentosDaRecusa): MedicaoDaRegravacao {
  const v: string[] = [];
  let head: string;
  try {
    head = git(a.raiz, 'rev-parse', 'HEAD').trim();
  } catch (e: any) {
    throw new Error(`REGRAVACAO RECUSADA: não consegui ler o HEAD do repositório (${e.message}); sem âncora não há como conferir a procedência`);
  }
  let anterior: any;
  try {
    anterior = JSON.parse(git(a.raiz, 'show', `HEAD:${a.artefato}`));
  } catch (e: any) {
    throw new Error(`REGRAVACAO RECUSADA: não consegui ler ${a.artefato} no HEAD ${head} (${e.message}); sem a versão anterior não há como medir o que mudou`);
  }
  const listaAnterior: any[] = obter(anterior, a.caminhoDaLista) ?? [];
  const listaNova: any[] = obter(a.novo, a.caminhoDaLista) ?? [];
  const lista = a.caminhoDaLista.join('.');

  // 1. A lista acumula: a anterior mais EXATAMENTE uma entrada, e a anterior intacta.
  if (!Array.isArray(listaNova) || listaNova.length !== listaAnterior.length + 1) {
    v.push(`${lista} tem ${Array.isArray(listaNova) ? listaNova.length : 'valor que não é lista'} entrada(s), e a regravação exige ${listaAnterior.length + 1} (as ${listaAnterior.length} do HEAD mais UMA nova)`);
  } else {
    for (let i = 0; i < listaAnterior.length; i++) {
      if (canonico(listaNova[i]) !== canonico(listaAnterior[i])) v.push(`a entrada de índice ${i} (ordem ${listaAnterior[i]?.ordem}) foi ALTERADA em relação ao HEAD: o histórico não se reescreve`);
    }
  }
  const entradaNova = Array.isArray(listaNova) ? listaNova[listaNova.length - 1] : undefined;
  const nAnterior = listaAnterior.length;

  // 2. A diferença MEDIDA, fora da própria lista de procedência.
  const diferenca = diferencaDeFolhas(anterior, a.novo, [lista]);
  if (diferenca.perdidas.length > 0) v.push(`campos PERDIDOS em relação ao HEAD: ${diferenca.perdidas.join(', ')}`);

  if (entradaNova && listaNova.length === nAnterior + 1) {
    // 3. A âncora e a forma da entrada.
    if (entradaNova.ordem !== nAnterior + 1) v.push(`a entrada nova tem ordem ${JSON.stringify(entradaNova.ordem)}, e a sequência exige ${nAnterior + 1}`);
    if (entradaNova.commitDaBase !== head) v.push(`a entrada nova tem commitDaBase ${JSON.stringify(entradaNova.commitDaBase)}, e o HEAD é ${head}: a base é o estado SOBRE o qual se regrava`);
    for (const e of listaAnterior) if (e?.commitDaBase === entradaNova.commitDaBase) v.push(`a base da entrada nova repete a da entrada de ordem ${e.ordem}`);
    if (a.commitDaBaseOriginal !== undefined && entradaNova.commitDaBase === a.commitDaBaseOriginal) v.push('a base da entrada nova é igual ao commitDaBase histórico');
    v.push(...violacoesDaEntrada(entradaNova, a.novo, { comando: a.comando, estrita: true }));

    // 4. camposRegravados é EXATAMENTE o medido (mudado ou novo), e os valores batem com o git.
    const medidos = new Set([...diferenca.mudadas, ...diferenca.novas]);
    const declarados = new Set<string>(Array.isArray(entradaNova.camposRegravados) ? entradaNova.camposRegravados : []);
    const semDeclarar = [...medidos].filter(p => !declarados.has(p));
    const semMedir = [...declarados].filter(p => !medidos.has(p));
    if (semDeclarar.length > 0) v.push(`campos que MUDARAM e a entrada não declara: ${semDeclarar.join(', ')}`);
    if (semMedir.length > 0) v.push(`campos que a entrada declara e que NÃO mudaram: ${semMedir.join(', ')}`);
    const folhasAntes = folhas(anterior);
    for (const p of declarados) {
      const antes = folhasAntes.get(p);
      const decl = entradaNova.valorAnterior && Object.prototype.hasOwnProperty.call(entradaNova.valorAnterior, p) ? JSON.stringify(entradaNova.valorAnterior[p]) : undefined;
      if (antes !== decl) v.push(`valorAnterior de ${p} é ${decl ?? 'ausente'}, e o HEAD tem ${antes ?? 'ausente'}`);
    }
  }

  // 5. O código medido é o código COMMITADO: a base ancora o que foi medido.
  if (a.caminhoDoCodigo) {
    const codigo = obter(a.novo, a.caminhoDoCodigo) ?? {};
    for (const arquivo of Object.keys(codigo)) {
      let noHead: string;
      try {
        noHead = crypto.createHash('sha256').update(execFileSync('git', ['-C', a.raiz, 'show', `HEAD:${arquivo}`], { maxBuffer: 64 * 1024 * 1024 })).digest('hex');
      } catch (e: any) {
        v.push(`não consegui ler ${arquivo} no HEAD (${e.message})`);
        continue;
      }
      if (noHead !== codigo[arquivo]) v.push(`${arquivo}: o resumo medido não é o do HEAD ${head} (há alteração NÃO commitada nesse arquivo, ou o HEAD não é a base)`);
    }
  }
  return { head, entradaNova, diferenca, violacoes: v };
}

/**
 * ⚠ **A RECUSA.** Chamada pelos escritores, sob `A12_GRAVAR=1` / `A12R_GRAVAR=1`, ANTES de qualquer escrita.
 * Falha fechada: lança `Error` com TODAS as violações e o que foi medido, e quem chama não escreve nada.
 */
export function exigirProcedenciaCorrespondente(a: ArgumentosDaRecusa): MedicaoDaRegravacao {
  const m = medirRegravacao(a);
  if (m.violacoes.length > 0) {
    throw new Error(
      `REGRAVACAO RECUSADA para ${a.artefato}: a lista de procedência não tem entrada correspondente a ESTA regravação.\n` +
        m.violacoes.map(x => `  - ${x}`).join('\n') +
        `\nMedido contra o HEAD ${m.head}: ${m.diferenca.mudadas.length} campo(s) mudado(s)${m.diferenca.mudadas.length ? ` (${m.diferenca.mudadas.join(', ')})` : ''}, ` +
        `${m.diferenca.novas.length} novo(s)${m.diferenca.novas.length ? ` (${m.diferenca.novas.join(', ')})` : ''}, ${m.diferenca.perdidas.length} perdido(s). Nada foi escrito.`
    );
  }
  return m;
}
