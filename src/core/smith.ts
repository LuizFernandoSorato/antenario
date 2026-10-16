/**
 * Geometria da Carta de Smith: relações entre impedância, Γ e os círculos da carta.
 *
 * Referência: Pozar, "Microwave Engineering", cap. 2 (Carta de Smith).
 * Com z = Z/Z0 = r + jx e Γ = (z − 1)/(z + 1):
 *   - r constante: círculo de centro (r/(1+r), 0) e raio 1/(1+r), no plano Γ;
 *   - x constante: arco de círculo de centro (1, 1/x) e raio 1/|x|;
 *   - deslocar-se de um comprimento elétrico θ em direção ao gerador: Γ(θ) = Γ_L · e^(−j2θ).
 * Funções puras, sem DOM.
 */

import { type Complex, abs, add, complex, div, fromPolar, mul, sub } from './complex';
import { assertPositive } from './units';

/** Círculo no plano Γ. */
export interface Circle {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

/** Impedância normalizada z = Z/Z0. */
export function normalize(z: Complex, z0: number): Complex {
  assertPositive(z0, 'A impedância característica Z0 (Ω)');
  return complex(z.re / z0, z.im / z0);
}

/** Z = Z0 · (1 + Γ)/(1 − Γ). Γ = 1 (circuito aberto) não tem impedância finita e lança RangeError. */
export function impedanceFromGamma(gamma: Complex, z0: number): Complex {
  assertPositive(z0, 'A impedância característica Z0 (Ω)');
  if (abs(gamma) > 1 + 1e-12) {
    throw new RangeError('|Γ| maior que 1: o ponto está fora da Carta de Smith (carga ativa).');
  }
  const den = sub(complex(1), gamma);
  if (Math.hypot(den.re, den.im) < 1e-12) {
    throw new RangeError('Γ = 1 corresponde a um circuito aberto (impedância infinita).');
  }
  const z = div(add(complex(1), gamma), den);
  return complex(z.re * z0, z.im * z0);
}

/** Círculo de resistência normalizada constante r ≥ 0, no plano Γ. */
export function resistanceCircle(r: number): Circle {
  if (!(r >= 0) || !Number.isFinite(r)) throw new RangeError('A resistência normalizada deve ser finita e não negativa.');
  return { cx: r / (1 + r), cy: 0, r: 1 / (1 + r) };
}

/** Círculo de reatância normalizada constante x ≠ 0 (só o trecho dentro de |Γ| ≤ 1 faz parte da carta). */
export function reactanceCircle(x: number): Circle {
  if (x === 0 || !Number.isFinite(x)) throw new RangeError('A reatância normalizada deve ser finita e diferente de zero.');
  return { cx: 1, cy: 1 / x, r: 1 / Math.abs(x) };
}

/**
 * Γ visto a uma distância elétrica θ (graus) da carga, indo em direção ao gerador:
 * Γ(θ) = Γ_L · e^(−j2θ). Meia onda (θ = 180°) dá uma volta completa.
 */
export function rotateTowardGenerator(gamma: Complex, electricalLengthDeg: number): Complex {
  const phase = (-2 * electricalLengthDeg * Math.PI) / 180;
  return mul(gamma, fromPolar(1, phase));
}
