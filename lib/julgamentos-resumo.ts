// lib/julgamentos-resumo.ts
/**
 * **A.12 etapa 2: a representação canônica dos julgamentos, e o seu resumo.**
 *
 * ⚠ **A justificativa deste módulo é o CONTRATO, e não a testabilidade.** A serialização
 * é **versionada**, entra no documento gravado por `app/api/calculate/route.ts` e será
 * consumida pela etapa 3. **Não se afirma que uma função precise ser exportada para ser
 * testada.**
 *
 * ⚠ **O QUE O RESUMO DEMONSTRA, e o que não demonstra** — redação do contrato, literal:
 *
 * > O resumo identifica a representação canônica dos julgamentos segundo a versão
 * > declarada. Sua igualdade é evidência de igualdade dessa representação, sob a hipótese
 * > de ausência de colisão SHA-256; não demonstra identidade do objeto bruto nem de toda a
 * > entrada do cálculo.
 *
 * ⚠ **Por que não se pode dizer "conteúdo recebido igual".** A própria versão v1 **omite
 * `undefined` em objeto** e **normaliza `-0`**, então objetos brutos distintos podem ter a
 * mesma representação canônica, **independentemente de colisão criptográfica**.
 *
 * ⚠ **Resumo diferente NÃO implica resultado agregado diferente.** `lib/aggregation.ts`
 * lê apenas `type`, `group`, `itemA`, `itemB`, `skipped`, `saatyValue` e `favors`.
 * **Medido:** `.rawSlider` não aparece nenhuma vez como acesso de propriedade em
 * `lib/aggregation.ts`; o termo só ocorre no comentário de `:21` e na declaração da
 * interface, em `:29`.
 *
 * ⚠ **O resumo IDENTIFICA e NÃO PRESERVA.** Depois de uma sobrescrita das respostas, ele
 * não devolve o conteúdo julgado.
 */

import crypto from 'node:crypto';

/** A versão da serialização. Entra no documento gravado, ao lado do resumo. */
export const SERIALIZACAO_JULGAMENTOS = 'a12-julgamentos-v1';

/**
 * Recusa **nomeada**, com o caminho. ⚠ **Nada é coagido em silêncio:** o valor que a
 * versão não representa produz erro, e não um resumo de outra coisa.
 */
export class ErroDeSerializacao extends Error {
  readonly caminho: string;
  readonly motivo: string;
  constructor(motivo: string, caminho: string) {
    super(`${SERIALIZACAO_JULGAMENTOS}: ${motivo} em ${caminho}`);
    this.name = 'ErroDeSerializacao';
    this.motivo = motivo;
    this.caminho = caminho;
  }
}

/** Objeto simples: literal de objeto ou `Object.create(null)`, e nada mais. */
function objetoSimples(v: object): boolean {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function serializarValor(v: unknown, caminho: string): string {
  if (v === null) return 'null';

  switch (typeof v) {
    case 'boolean':
      return v ? 'true' : 'false';

    case 'string':
      return JSON.stringify(v);

    case 'number':
      // Regra 5: NaN e infinitos são ERRO NOMEADO, e nunca `null` nem zero.
      if (!Number.isFinite(v)) {
        throw new ErroDeSerializacao(
          Number.isNaN(v) ? 'numero NaN nao e representavel' : 'numero infinito nao e representavel',
          caminho
        );
      }
      // Regra 5: `-0` normalizado para `0`, explicitamente, e não por acidente do JSON.
      return JSON.stringify(Object.is(v, -0) ? 0 : v);

    case 'undefined':
      // Só alcançável dentro de array: em objeto, a chave é omitida antes de chegar aqui.
      throw new ErroDeSerializacao('undefined dentro de array nao vira null', caminho);

    case 'bigint':
      throw new ErroDeSerializacao('bigint nao e representavel nesta versao', caminho);

    case 'function':
      throw new ErroDeSerializacao('funcao nao e conteudo julgado', caminho);

    case 'symbol':
      throw new ErroDeSerializacao('symbol nao e representavel nesta versao', caminho);
  }

  // Regra 2: a ordem dos arrays é CONTEÚDO, e se preserva.
  if (Array.isArray(v)) {
    return '[' + v.map((item, i) => serializarValor(item, `${caminho}[${i}]`)).join(',') + ']';
  }

  // Regra 6: `Date`, `Map`, carimbo do Firestore e instância de classe são ERRO NOMEADO.
  if (!objetoSimples(v as object)) {
    const nome = (v as object).constructor?.name ?? 'objeto sem prototipo conhecido';
    throw new ErroDeSerializacao(`valor nao simples (${nome}) nao e coagido`, caminho);
  }

  // Regras 1, 3 e 4: chaves ordenadas; `undefined` omitido em objeto; `null` preservado.
  const obj = v as Record<string, unknown>;
  const chaves = Object.keys(obj).sort();
  const partes: string[] = [];
  for (const k of chaves) {
    const valor = obj[k];
    if (valor === undefined) continue; // omitido, e distinto de `null`
    partes.push(`${JSON.stringify(k)}:${serializarValor(valor, `${caminho}.${k}`)}`);
  }
  // Regra 7: sem indentação.
  return '{' + partes.join(',') + '}';
}

/**
 * A representação canônica, como texto. ⚠ **Recusa em vez de coagir**, e a recusa nomeia
 * o motivo e o caminho.
 */
export function serializarJulgamentos(julgamentos: unknown): string {
  return serializarValor(julgamentos, '$');
}

/** O resumo `sha256` dos **bytes UTF-8** da representação canônica (regra 7). */
export function resumirJulgamentos(julgamentos: unknown): string {
  return crypto
    .createHash('sha256')
    .update(Buffer.from(serializarJulgamentos(julgamentos), 'utf8'))
    .digest('hex');
}

/** Um par do painel: quem, e o resumo do que julgou. */
export interface ParDoPainel {
  respondentId: string;
  judgmentsSha256: string | null;
}

/**
 * O resumo do painel: `sha256` sobre a serialização, pelas MESMAS regras, da lista de
 * pares `[respondentId, judgmentsSha256]` **ordenada por `respondentId` ascendente**.
 *
 * ⚠ **Assim o resumo não depende da ordem de retorno do Firestore.**
 *
 * ⚠ **Um painel com parte desconhecida não tem resumo conhecido:** se algum par vier com
 * `judgmentsSha256` nulo, isto **recusa**, e quem chama registra `null` com o motivo.
 * ⚠ **Nunca** zero, string vazia ou resumo de outra coisa.
 *
 * ⚠ **Identificador repetido é recusa**, e não desempate em silêncio: depois da
 * deduplicação da rota, repetição é sinal de que a premissa mudou.
 */
export function resumirPainel(pares: ParDoPainel[]): string {
  const vistos = new Set<string>();
  for (const p of pares) {
    if (p.judgmentsSha256 === null) {
      throw new ErroDeSerializacao(
        'painel com resumo individual indisponivel nao tem resumo conhecido',
        `$.${p.respondentId}`
      );
    }
    if (vistos.has(p.respondentId)) {
      throw new ErroDeSerializacao('identificador repetido na lista do painel', `$.${p.respondentId}`);
    }
    vistos.add(p.respondentId);
  }
  const ordenado = [...pares]
    .sort((a, b) => (a.respondentId < b.respondentId ? -1 : a.respondentId > b.respondentId ? 1 : 0))
    .map(p => [p.respondentId, p.judgmentsSha256]);
  return crypto
    .createHash('sha256')
    .update(Buffer.from(serializarJulgamentos(ordenado), 'utf8'))
    .digest('hex');
}
