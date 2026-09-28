/**
 * lib/__tests__/julgamentos-resumo.test.ts
 *
 * **A.12 etapa 2: as sete regras da versão `a12-julgamentos-v1`.**
 *
 * ⚠ **Cada regra tem aqui um caso que PASSA e um contraexemplo que REPROVA.** Uma regra
 * sem contraexemplo não demonstra nada: uma serialização que aceitasse tudo passaria por
 * todos os casos positivos.
 *
 * ⚠ **O LIMITE, declarado:** isto verifica a **representação canônica**, e nada além. Não
 * demonstra identidade do objeto bruto, nem que o resumo do painel identifique documentos
 * ou ordem de processamento, que têm campos próprios.
 */

import {
  SERIALIZACAO_JULGAMENTOS,
  ErroDeSerializacao,
  serializarJulgamentos,
  resumirJulgamentos,
  resumirPainel,
} from '@/lib/julgamentos-resumo';

const julgamento = (over: Record<string, unknown> = {}) => ({
  type: 'bocr',
  group: 'BOCR',
  itemA: 'B',
  itemB: 'O',
  saatyValue: 3,
  favors: 'A',
  ...over,
});

test('a versao esta declarada e entra na mensagem da recusa', () => {
  expect(SERIALIZACAO_JULGAMENTOS).toBe('a12-julgamentos-v1');
  try {
    serializarJulgamentos({ x: NaN });
    throw new Error('deveria ter recusado');
  } catch (e: any) {
    expect(e).toBeInstanceOf(ErroDeSerializacao);
    expect(e.message).toContain('a12-julgamentos-v1');
  }
});

// ---------------------------------------------------------------- regra 1
test('regra 1: chaves ordenadas em TODOS os niveis, e a ordem de insercao nao importa', () => {
  const a = { b: 1, a: { z: 1, y: 2 } };
  const b = { a: { y: 2, z: 1 }, b: 1 };
  expect(serializarJulgamentos(a)).toBe(serializarJulgamentos(b));
  expect(serializarJulgamentos(a)).toBe('{"a":{"y":2,"z":1},"b":1}');
  // ⚠ CONTRAEXEMPLO: a ordenacao e por unidade de codigo UTF-16, e nao por local.
  //   Maiuscula vem ANTES de minuscula, e a serializacao tem de mostrar isso.
  expect(serializarJulgamentos({ a: 1, B: 2 })).toBe('{"B":2,"a":1}');
  // ⚠ CONTROLE de que a assercao discrimina: conteudo diferente da texto diferente.
  expect(serializarJulgamentos({ a: 1 })).not.toBe(serializarJulgamentos({ a: 2 }));
});

// ---------------------------------------------------------------- regra 2
test('regra 2: a ordem dos arrays e CONTEUDO, e se preserva', () => {
  const j1 = julgamento({ itemA: 'B' });
  const j2 = julgamento({ itemA: 'O' });
  expect(resumirJulgamentos([j1, j2])).not.toBe(resumirJulgamentos([j2, j1]));
  // ⚠ CONTROLE: a mesma ordem da o mesmo resumo, entao a diferenca acima e da ordem.
  expect(resumirJulgamentos([j1, j2])).toBe(resumirJulgamentos([j1, j2]));
});

// ---------------------------------------------------------------- regras 3 e 4
test('regra 3: undefined e OMITIDO em objeto, e regra 4: null e PRESERVADO e distinto', () => {
  expect(serializarJulgamentos({ a: 1, b: undefined })).toBe('{"a":1}');
  expect(serializarJulgamentos({ a: 1 })).toBe(serializarJulgamentos({ a: 1, b: undefined }));
  // ⚠ `saatyValue: null` marca comparacao PULADA: equiparar ausente a nulo juntaria
  //   dois conteudos diferentes, e o contrato proibe.
  expect(serializarJulgamentos({ saatyValue: null })).not.toBe(serializarJulgamentos({}));
  expect(serializarJulgamentos({ saatyValue: null })).toBe('{"saatyValue":null}');
});

test('regra 3: undefined DENTRO de array e erro nomeado, e nao vira null', () => {
  expect(() => serializarJulgamentos([1, undefined, 3])).toThrow(ErroDeSerializacao);
  try {
    serializarJulgamentos({ js: [1, undefined] });
  } catch (e: any) {
    expect(e.motivo).toMatch(/undefined dentro de array/);
    expect(e.caminho).toBe('$.js[1]');
  }
  // ⚠ CONTROLE: o mesmo array SEM o buraco passa, entao a recusa e do undefined.
  expect(serializarJulgamentos({ js: [1, 3] })).toBe('{"js":[1,3]}');
});

// ---------------------------------------------------------------- regra 5
test('regra 5: -0 normalizado para 0, e o resumo dos dois coincide', () => {
  expect(serializarJulgamentos({ v: -0 })).toBe('{"v":0}');
  expect(resumirJulgamentos({ v: -0 })).toBe(resumirJulgamentos({ v: 0 }));
  // ⚠ CONTROLE: 0 e 1 continuam distintos, entao a igualdade acima nao e trivial.
  expect(resumirJulgamentos({ v: 0 })).not.toBe(resumirJulgamentos({ v: 1 }));
});

test('regra 5: NaN e infinitos sao erro NOMEADO com o caminho, e nunca zero nem null', () => {
  for (const [v, esperado] of [[NaN, /NaN/], [Infinity, /infinito/], [-Infinity, /infinito/]] as const) {
    try {
      serializarJulgamentos({ js: [{ rawSlider: v }] });
      throw new Error('deveria ter recusado');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ErroDeSerializacao);
      expect(e.motivo).toMatch(esperado);
      expect(e.caminho).toBe('$.js[0].rawSlider');
    }
  }
  // ⚠ CONTROLE: um numero finito no MESMO caminho passa.
  expect(serializarJulgamentos({ js: [{ rawSlider: 7 }] })).toBe('{"js":[{"rawSlider":7}]}');
});

// ---------------------------------------------------------------- regra 6
test('regra 6: Date, Map, carimbo do Firestore e instancia de classe sao erro NOMEADO', () => {
  class Carimbo {
    constructor(public seconds: number) {}
  }
  const naoSimples: [string, unknown][] = [
    ['Date', new Date(0)],
    ['Map', new Map()],
    ['Set', new Set()],
    ['Carimbo', new Carimbo(1)],
  ];
  for (const [nome, v] of naoSimples) {
    try {
      serializarJulgamentos({ campo: v });
      throw new Error(`deveria ter recusado ${nome}`);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ErroDeSerializacao);
      expect(e.motivo).toMatch(/valor nao simples/);
      expect(e.motivo).toContain(nome);
      expect(e.caminho).toBe('$.campo');
    }
  }
  // ⚠ CONTROLE: objeto simples no mesmo caminho passa, e Object.create(null) tambem.
  expect(serializarJulgamentos({ campo: { a: 1 } })).toBe('{"campo":{"a":1}}');
  const semProto = Object.create(null);
  semProto.a = 1;
  expect(serializarJulgamentos({ campo: semProto })).toBe('{"campo":{"a":1}}');
});

// ---------------------------------------------------------------- regra 7
test('regra 7: sem indentacao, e o resumo e dos bytes UTF-8', () => {
  const texto = serializarJulgamentos({ a: [1, 2], b: 'ç' });
  expect(texto).toBe('{"a":[1,2],"b":"ç"}');
  expect(texto).not.toMatch(/\n|\s{2,}/);
  const crypto = require('node:crypto');
  const aMao = crypto.createHash('sha256').update(Buffer.from(texto, 'utf8')).digest('hex');
  expect(resumirJulgamentos({ a: [1, 2], b: 'ç' })).toBe(aMao);
  // ⚠ Conferencia A MAO do caso mais visivel, exigida na primeira execucao de um
  //   instrumento novo: o acento ocupa DOIS bytes, e o resumo e dos bytes.
  expect(Buffer.from(texto, 'utf8').length).toBe(texto.length + 1);
});

// ---------------------------------------------------------------- o painel
test('o resumo do painel nao depende da ordem da lista, e muda com o conteudo', () => {
  const a = { respondentId: 'r-a', judgmentsSha256: resumirJulgamentos([julgamento()]) };
  const b = { respondentId: 'r-b', judgmentsSha256: resumirJulgamentos([julgamento({ saatyValue: 5 })]) };
  expect(resumirPainel([a, b])).toBe(resumirPainel([b, a]));
  // ⚠ CONTROLE: mudar o conteudo de UM respondente muda o resumo do painel.
  const bOutro = { respondentId: 'r-b', judgmentsSha256: resumirJulgamentos([julgamento({ saatyValue: 7 })]) };
  expect(resumirPainel([a, b])).not.toBe(resumirPainel([a, bOutro]));
  // ⚠ E trocar SO os identificadores tambem muda: o par inclui quem julgou.
  const aRenomeado = { respondentId: 'r-z', judgmentsSha256: a.judgmentsSha256 };
  expect(resumirPainel([a, b])).not.toBe(resumirPainel([aRenomeado, b]));
});

test('painel com resumo individual indisponivel RECUSA, e nao vira zero nem vazio', () => {
  const a = { respondentId: 'r-a', judgmentsSha256: resumirJulgamentos([julgamento()]) };
  const semResumo = { respondentId: 'r-b', judgmentsSha256: null };
  try {
    resumirPainel([a, semResumo]);
    throw new Error('deveria ter recusado');
  } catch (e: any) {
    expect(e).toBeInstanceOf(ErroDeSerializacao);
    expect(e.motivo).toMatch(/resumo individual indisponivel/);
    expect(e.caminho).toBe('$.r-b');
  }
  // ⚠ CONTROLE: com os dois resumos presentes, o painel resume.
  expect(resumirPainel([a, { respondentId: 'r-b', judgmentsSha256: a.judgmentsSha256 }])).toMatch(/^[0-9a-f]{64}$/);
});

test('identificador repetido na lista do painel e RECUSA, e nao desempate em silencio', () => {
  const d = resumirJulgamentos([julgamento()]);
  try {
    resumirPainel([
      { respondentId: 'r-a', judgmentsSha256: d },
      { respondentId: 'r-a', judgmentsSha256: d },
    ]);
    throw new Error('deveria ter recusado');
  } catch (e: any) {
    expect(e.motivo).toMatch(/identificador repetido/);
    expect(e.caminho).toBe('$.r-a');
  }
});
