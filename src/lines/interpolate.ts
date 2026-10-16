/**
 * Interpolação de tabelas de datasheet (atenuação e potência × frequência).
 *
 * Interpolação linear em escala log-log entre os dois pontos vizinhos: entre
 * pontos, a grandeza segue uma lei de potência y = k·f^n. É a forma natural
 * dessas curvas (os próprios datasheets as plotam em eixos log-log), e evita o
 * erro da interpolação linear simples, que superestima a perda entre pontos
 * distantes.
 *
 * Nunca extrapola: fora da faixa da tabela devolve `null`, para a UI avisar que
 * não há dado do fabricante (regra do CLAUDE.md: não inventar).
 */

import type { FrequencyPoint } from '../data/coax-cables';

export function interpolateLogLog(points: readonly FrequencyPoint[], fMHz: number): number | null {
  if (!Number.isFinite(fMHz) || fMHz <= 0 || points.length === 0) return null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (fMHz < first.fMHz || fMHz > last.fMHz) return null;

  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (p.fMHz === fMHz) return p.value;
    if (p.fMHz > fMHz) {
      const q = points[i - 1]!;
      const n = Math.log(p.value / q.value) / Math.log(p.fMHz / q.fMHz);
      return q.value * (fMHz / q.fMHz) ** n;
    }
  }
  return null;
}

/** Faixa de frequências coberta pela tabela. */
export function tableRange(points: readonly FrequencyPoint[]): { min: number; max: number } | null {
  if (points.length === 0) return null;
  return { min: points[0]!.fMHz, max: points[points.length - 1]!.fMHz };
}
