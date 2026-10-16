/**
 * Casamento com um stub em paralelo (shunt stub).
 *
 * A uma distância d da carga, a admitância vista na linha tem parte real Y0 = 1/Z0.
 * Ali se liga um stub (em curto ou em aberto) que cancela a parte imaginária.
 *
 * Fórmulas (linha sem perdas), com t = tan(βd):
 *   R_L ≠ Z0: t = [X_L ± √(R_L·((Z0 − R_L)² + X_L²)/Z0)] / (R_L − Z0)
 *   R_L = Z0: t = −X_L/(2·Z0)
 *   d/λ = atan(t)/(2π) se t ≥ 0, ou (π + atan t)/(2π) se t < 0
 *   B = [R_L²·t − (Z0 − X_L·t)(X_L + Z0·t)] / (Z0·[R_L² + (X_L + Z0·t)²])
 *   stub em aberto: l/λ = −atan(B·Z0)/(2π)
 *   stub em curto:  l/λ =  atan(1/(B·Z0))/(2π)
 *   (somando 1/2 quando o resultado é negativo)
 * Fonte: Pozar, Microwave Engineering, 4ª ed., §5.2 (Single-Stub Tuning).
 *
 * Os comprimentos são elétricos (frações de λ dentro do cabo) e depois
 * convertidos para metros com o fator de velocidade.
 */

import { type Complex, toComplex } from '../core/complex';
import { assertPositive } from '../core/units';
import { assertFactor, wavelength } from '../core/wave';

export type StubTermination = 'short' | 'open';

export interface SingleStubInput {
  zLoad: number | Complex;
  z0: number;
  fMHz: number;
  /** Fator de velocidade da linha entre a carga e o stub. */
  lineVelocityFactor: number;
  /** Fator de velocidade do cabo do stub. */
  stubVelocityFactor: number;
  termination: StubTermination;
}

export interface SingleStubSolution {
  /** Distância da carga até o stub, em λ (dentro do cabo). */
  distanceWavelengths: number;
  distanceM: number;
  /** Comprimento do stub, em λ (dentro do cabo do stub). */
  stubWavelengths: number;
  stubM: number;
  /** Susceptância vista no ponto do stub, antes dele (S). O stub fornece −B. */
  susceptanceAtStub: number;
}

/** Ângulo normalizado para [0, 1/2) em frações de λ. */
function wrapHalfWave(fraction: number): number {
  const r = fraction % 0.5;
  return r < 0 ? r + 0.5 : r;
}

export function designSingleStub(input: SingleStubInput): SingleStubSolution[] {
  const { z0, fMHz, lineVelocityFactor, stubVelocityFactor, termination } = input;
  assertPositive(z0, 'Z0');
  assertFactor(lineVelocityFactor, 'O fator de velocidade da linha');
  assertFactor(stubVelocityFactor, 'O fator de velocidade do stub');
  const { re: rl, im: xl } = toComplex(input.zLoad);
  if (!Number.isFinite(rl) || !Number.isFinite(xl) || rl <= 0) {
    throw new RangeError('A resistência da carga deve ser positiva: uma reatância pura não pode ser casada.');
  }
  const lambda0 = wavelength(fMHz);

  const ts: number[] = [];
  if (rl === z0) {
    ts.push(-xl / (2 * z0));
  } else {
    const root = Math.sqrt((rl * ((z0 - rl) ** 2 + xl * xl)) / z0);
    ts.push((xl + root) / (rl - z0), (xl - root) / (rl - z0));
  }

  return ts.map((t) => {
    const d = t >= 0 ? Math.atan(t) / (2 * Math.PI) : (Math.PI + Math.atan(t)) / (2 * Math.PI);
    const b = (rl * rl * t - (z0 - xl * t) * (xl + z0 * t)) / (z0 * (rl * rl + (xl + z0 * t) ** 2));
    // Stub em curto: atan(1/(B·Z0)); com B = 0, atan(±∞) = ±π/2 → λ/4 (admitância nula).
    const stub =
      termination === 'open'
        ? wrapHalfWave(-Math.atan(b * z0) / (2 * Math.PI))
        : wrapHalfWave(Math.atan(1 / (b * z0)) / (2 * Math.PI));
    return {
      distanceWavelengths: d,
      distanceM: d * lambda0 * lineVelocityFactor,
      stubWavelengths: stub,
      stubM: stub * lambda0 * stubVelocityFactor,
      susceptanceAtStub: b,
    };
  });
}
