/**
 * Q de uma antena a partir da impedância de entrada e a banda de ROE que ele prevê.
 *
 * Fórmulas de A. D. Yaghjian e S. R. Best, "Impedance, Bandwidth, and Q of Antennas" (IEEE Trans. Antennas Propag., vol. 53, n. 4,
 * 2005), lidas na reprodução de arXiv 1909.08019 (eqs. 28 e 29; o artigo original é pago):
 *   Q_Z(ω) = (ω/2R)·√(R'² + (X' + |X|/ω)²),   derivadas em ω;
 *   B = 2Γ0/(Q·√(1 − Γ0²))  (banda relativa com |Γ| ≤ Γ0, antena casada em ω0), que com Γ0 = (S − 1)/(S + 1) vira B = (S − 1)/(Q·√S).
 * O termo |X|/ω inclui o efeito de sintonizar a antena com uma reatância em série ideal: não é preciso que ela esteja ressonante.
 * Vale para uma ressonância isolada e banda estreita (Q bem maior que 1); a casamento ideal é sem perdas e sem banda própria.
 *
 * Em frequência (f em vez de ω): ω·d/dω = f·d/df, então Q = (1/2R)·√((f·R_f')² + (f·X_f' + |X|)²).
 */

import type { Complex } from './complex';

/**
 * Passo relativo da derivada numérica nos modelos por momentos (±0,5 %): a impedância das antenas daqui muda bem mais devagar que
 * isso perto de f0. Conferido pelos testes que comparam o Q com a varredura (Yagi e quadra).
 */
export const Q_DELTA = 0.005;

/** Q a partir de Z em f0 − δ, f0 e f0 + δ (derivadas por diferença central). */
export function impedanceQ(zMinus: Complex, z0: Complex, zPlus: Complex, f0: number, delta: number): number {
  if (!(z0.re > 0) || !(delta > 0) || !(f0 > delta)) throw new RangeError('Q: R deve ser positiva e δ entre 0 e f0.');
  const dR = (zPlus.re - zMinus.re) / (2 * delta);
  const dX = (zPlus.im - zMinus.im) / (2 * delta);
  return Math.hypot(f0 * dR, f0 * dX + Math.abs(z0.im)) / (2 * z0.re);
}

/** Banda relativa (fração de f0) com ROE ≤ S, para a antena casada em f0: (S − 1)/(Q·√S). */
export function matchedFractionalBandwidth(q: number, swr: number): number {
  if (!(q > 0) || !(swr > 1)) throw new RangeError('Banda: Q > 0 e ROE > 1.');
  return (swr - 1) / (q * Math.sqrt(swr));
}
