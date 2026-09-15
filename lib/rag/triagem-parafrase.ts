/**
 * lib/rag/triagem-parafrase.ts
 *
 * TRIAGEM de transcrição disfarçada, A.33 etapa 3.
 *
 * Mede sobreposição léxica entre uma afirmação do parecer e o trecho guardado na
 * base, para apoiar a busca do terceiro caso negativo da predição: **transcrição sem
 * sinalização**, ou seja o texto da fonte reproduzido sem aspas.
 *
 * ⚠ **SINALIZA SUSPEITA, E NÃO DECIDE.** Marca termo técnico legítimo, porque
 * vocabulário técnico se repete por necessidade, e deixa passar cópia modificada,
 * porque basta reordenar para quebrar a maior corrida comum. **Quem decide é a
 * conferência da etapa 4, lendo os dois textos.**
 *
 * ⚠ **NÃO é bloqueio de produção, e não está ligado a nenhuma rota.** Nada em
 * `app/` ou em `lib/rag/semantic-retrieve.ts` o importa, e isso é deliberado nesta
 * tarefa: transformá-lo em portão exigiria fundamentar o limiar, que aqui não tem
 * fonte e é escolha de triagem.
 */

/** Resultado da triagem de UMA afirmação contra UM trecho de origem. */
export interface SuspeitaTranscricao {
  /** Maior sequência de palavras que aparece igual e em ordem nos dois textos. */
  maiorCorridaComum: number;
  /** Fração das palavras do trecho de origem que a corrida cobre, de 0 a 1. */
  fracaoDoTrecho: number;
  /** As palavras da maior corrida, para a conferência humana ler. */
  trechoEmComum: string;
  /** `true` quando passa do limiar. ⚠ Suspeita, nunca veredito. */
  sinalizada: boolean;
}

/**
 * Limiar em PALAVRAS da maior corrida comum.
 *
 * ⚠ **Escolha de triagem, sem fonte na literatura, e fica dito.** Seis palavras
 * seguidas idênticas é raro por coincidência em prosa técnica e curto o bastante
 * para sobreviver a edição leve. **Não é limiar publicado**, e por isso este módulo
 * não decide nada sozinho.
 */
export const LIMIAR_CORRIDA = 6;

/** Normaliza para comparação: minúsculas, sem pontuação, sem acento, sem espaço duplo. */
function palavras(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Compara a afirmação do parecer com o trecho de origem.
 *
 * ⚠ **A ordem dos argumentos importa para `fracaoDoTrecho`**, que é sobre o TRECHO:
 * ela responde quanto do original foi reproduzido, e não quanto da afirmação é
 * cópia. Uma afirmação longa que embute o trecho inteiro dá fração 1.
 */
export function triarTranscricao(afirmacao: string, trecho: string): SuspeitaTranscricao {
  const a = palavras(afirmacao);
  const b = palavras(trecho);

  // Maior substring comum sobre PALAVRAS, não sobre caracteres: comparar caracteres
  // acusaria radicais compartilhados e inflaria tudo.
  let melhor = 0;
  let fimEmB = 0;
  const anterior: number[] = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j++) {
      const guardado = anterior[j];
      if (a[i - 1] === b[j - 1]) {
        anterior[j] = diagonal + 1;
        if (anterior[j] > melhor) {
          melhor = anterior[j];
          fimEmB = j;
        }
      } else {
        anterior[j] = 0;
      }
      diagonal = guardado;
    }
  }

  return {
    maiorCorridaComum: melhor,
    fracaoDoTrecho: b.length === 0 ? 0 : melhor / b.length,
    trechoEmComum: b.slice(fimEmB - melhor, fimEmB).join(' '),
    sinalizada: melhor >= LIMIAR_CORRIDA,
  };
}
