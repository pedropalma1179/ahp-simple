// lib/identificador-respondente.ts
/**
 * **A.12 etapa 2: a cadeia de identificação do respondente, com a FONTE.**
 *
 * ⚠ **Mudança estrutural, e não neutra por decreto:** a cadeia estava em
 * `app/api/calculate/route.ts` e passou a viver aqui **porque um arquivo de rota do
 * Next.js não pode exportar símbolo arbitrário** — `tsc` reprova com TS2344. A
 * preservação do comportamento é **demonstrada elo por elo** em
 * `lib/__tests__/a12-rastreabilidade.test.ts`, sobre esta função, e não suposta.
 *
 * ⚠ **`extractRespondentId` é reimplementado SOBRE `identificarRespondente`**, e não ao
 * lado dela: a cadeia dos nove elos existe **uma vez só**.
 */

/**
 * A fonte do identificador. ⚠ **O rótulo nomeia a expressão lida no código**, e não uma
 * interpretação dela.
 *
 * ⚠ **`'response.id'` NÃO é sinônimo de id do documento.** Em `allResponses` o
 * espalhamento vem **depois** de `id: docSnap.id`, então um campo `id` gravado no
 * documento **sobrescreve** o id do documento. O id do documento vai em campo próprio,
 * `responseDocId`, capturado antes do espalhamento. ⚠ **Isto é leitura do código, e não
 * medição sobre os dados de produção:** não se afirma que ocorra hoje.
 *
 * ⚠ O último elo, `'fallbackPorIndice'`, é **identidade por posição**. Registrar a fonte
 * torna esse caso **visível** em vez de silencioso. **Nada nesta etapa reconstrói
 * identidade por posição ou por contagem.**
 */
export type FonteDoIdentificador =
  | 'respondentId'
  | 'visitorId'
  | 'response.id'
  | 'responses.respondentId'
  | 'responses.visitorId'
  | 'data.respondentId'
  | 'userId'
  | 'email'
  | 'fallbackPorIndice';

export interface IdentificacaoDoRespondente {
  valor: string;
  fonte: FonteDoIdentificador;
}

export function identificarRespondente(response: any, idx: number): IdentificacaoDoRespondente {
  // Tentar várias fontes de ID
  const candidatos: [FonteDoIdentificador, unknown][] = [
    ['respondentId', response.respondentId],
    ['visitorId', response.visitorId],
    ['response.id', response.id],
    ['responses.respondentId', response.responses?.respondentId],
    ['responses.visitorId', response.responses?.visitorId],
    ['data.respondentId', response.data?.respondentId],
    ['userId', response.userId],
    ['email', response.email?.split('@')[0]], // Usar parte do email como fallback
  ];

  for (const [fonte, id] of candidatos) {
    if (id && id !== 'undefined' && id !== 'null') {
      return { valor: String(id), fonte };
    }
  }

  // Fallback: gerar ID baseado no índice. ⚠ IDENTIDADE POR POSIÇÃO.
  return { valor: `respondente_${idx + 1}`, fonte: 'fallbackPorIndice' };
}

/** O identificador, como a rota sempre o consumiu. */
export function extractRespondentId(response: any, idx: number): string {
  return identificarRespondente(response, idx).valor;
}
