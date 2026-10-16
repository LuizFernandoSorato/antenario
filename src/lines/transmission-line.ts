/**
 * Linha de transmissão uniforme, com ou sem perdas, de Z0 real.
 *
 * Impedância vista na entrada de uma linha de comprimento l terminada em Z_L:
 *
 *   Z_in = Z0 · (Z_L + Z0·tanh(γl)) / (Z0 + Z_L·tanh(γl)),   γ = α + jβ
 *
 * Sem perdas (α = 0), tanh(jβl) = j·tan(βl) e a fórmula vira a forma clássica
 * Z0·(Z_L + jZ0·tan βl)/(Z0 + jZ_L·tan βl).
 * Fonte: Pozar, Microwave Engineering, 4ª ed., §2.3 (sem perdas) e §2.7 (com perdas).
 *
 * Implementação: usa a forma equivalente com cosh/sinh (numerador e denominador
 * multiplicados por cosh γl), que não tem polo em λ/4 sem perdas, onde tanh γl
 * seria infinita mas Z_in = Z0²/Z_L é finita.
 *
 * Premissa: Z0 real (aproximação usual para coaxiais de baixa perda).
 */

import { type Complex, add, complex, cosh, div, mul, scale, sinh, toComplex } from '../core/complex';
import { assertPositive } from '../core/units';
import { assertFactor, wavelength } from '../core/wave';

/**
 * Neper → decibel: 1 Np = 20·log10(e) dB ≈ 8,686 dB.
 * Fonte: definição (ISO 80000-3).
 */
export const DB_PER_NEPER = 20 * Math.log10(Math.E);

export interface LineSection {
  /** Impedância característica (Ω), real e positiva. */
  z0: number;
  /** Comprimento físico (m). */
  lengthM: number;
  /** Fator de velocidade, em (0, 1]. */
  velocityFactor: number;
  /** Atenuação em dB por metro na frequência de uso (0 = sem perdas). */
  attenuationDbPerM?: number;
}

/** Constante de propagação γ·l (adimensional) da seção na frequência dada. */
export function propagationProduct(section: LineSection, fMHz: number): Complex {
  const { z0, lengthM, velocityFactor, attenuationDbPerM = 0 } = section;
  assertPositive(z0, 'A impedância característica Z0 (Ω)');
  assertFactor(velocityFactor, 'O fator de velocidade');
  if (!Number.isFinite(lengthM) || lengthM < 0) {
    throw new RangeError(`O comprimento da linha deve ser ≥ 0 (recebido: ${lengthM}).`);
  }
  if (!Number.isFinite(attenuationDbPerM) || attenuationDbPerM < 0) {
    throw new RangeError('A atenuação deve ser ≥ 0 dB/m.');
  }
  const beta = (2 * Math.PI) / (wavelength(fMHz) * velocityFactor);
  const alpha = attenuationDbPerM / DB_PER_NEPER;
  return complex(alpha * lengthM, beta * lengthM);
}

/**
 * Impedância de entrada de uma linha terminada em Z_L:
 * Z_in = Z0·(Z_L·cosh γl + Z0·sinh γl) / (Z0·cosh γl + Z_L·sinh γl).
 */
export function inputImpedance(zLoad: number | Complex, section: LineSection, fMHz: number): Complex {
  const zl = toComplex(zLoad);
  const z0 = toComplex(section.z0);
  const gl = propagationProduct(section, fMHz);
  const c = cosh(gl);
  const s = sinh(gl);
  return mul(z0, div(add(mul(zl, c), mul(z0, s)), add(mul(z0, c), mul(zl, s))));
}

/**
 * Impedância de entrada de um stub em curto: Z0·tanh(γl).
 * Em λ/4 sem perdas o valor teórico é infinito; numericamente sai muito grande.
 */
export function shortedStubImpedance(section: LineSection, fMHz: number): Complex {
  const gl = propagationProduct(section, fMHz);
  return scale(div(sinh(gl), cosh(gl)), section.z0);
}

/**
 * Impedância de entrada de um stub em aberto: Z0·coth(γl).
 * Em λ/2 sem perdas (ou comprimento zero) o valor teórico é infinito.
 */
export function openStubImpedance(section: LineSection, fMHz: number): Complex {
  const gl = propagationProduct(section, fMHz);
  return scale(div(cosh(gl), sinh(gl)), section.z0);
}
