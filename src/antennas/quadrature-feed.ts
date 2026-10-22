/**
 * Alimentação em quadratura por linha de 1/4 de onda (turnstile e cross Yagi), em qualquer frequência.
 *
 * O elemento A liga direto na junção e o B por uma linha sem perdas de impedância Zq, cortada com 1/4 de onda na frequência de
 * projeto f0 (comprimento elétrico θ = 90°·f/f0; o fator de velocidade só muda o comprimento físico). Com a junção em V = 1:
 *   I_A = 1/Z_A;  Z_inB = Zq·(Z_B + jZq·tg θ)/(Zq + jZ_B·tg θ);  I_in = 1/Z_inB;
 *   tensão no fim da linha V_L = cos θ − j·Zq·I_in·sen θ;  I_B = V_L/Z_B;  Z_junção = 1/(I_A + I_in).
 * Fonte: matriz ABCD da linha sem perdas (Pozar, "Microwave Engineering", 4ª ed., §4.4 e §2.3). Em f0, com Z_A = Z_B = Zq = R,
 * dá I_B/I_A = −j (mesmo módulo, 90°) e Z = R/2, como em `turnstile/calc.ts`.
 *
 * Razão axial na direção do feixe: os dois elementos são iguais e ortogonais, então o campo é Ex ∝ I_A e Ey ∝ I_B (acoplamento
 * entre eles desprezado, como na derivação do turnstile) e a razão axial sai de `core/polarization.ts`.
 */

import { type Complex, add, complex, div, mul, reciprocal } from '../core/complex';
import { circularSense } from '../core/polarization';
import { type SwrBand, type SwrSweep, bandAround, swrSweep } from '../core/swr-band';

export interface QuadraturePoint {
  /** Impedância vista na junção. */
  z: Complex;
  /** I_B/I_A. */
  currentRatio: Complex;
  /** Razão axial na direção do feixe, dB. */
  axialRatioDb: number;
}

export function quadratureAt(zA: Complex, zB: Complex, zLine: number, f0MHz: number, fMHz: number): QuadraturePoint {
  const theta = (Math.PI / 2) * (fMHz / f0MHz);
  const t = Math.tan(theta);
  const zq = complex(zLine, 0);
  const jzqt = complex(0, zLine * t);
  const zInB = mul(zq, div(add(zB, jzqt), add(zq, mul(complex(0, t), zB))));
  const iA = reciprocal(zA);
  const iIn = reciprocal(zInB);
  const vL = add(complex(Math.cos(theta), 0), mul(complex(0, -zLine * Math.sin(theta)), iIn));
  const iB = div(vL, zB);
  const ratio = div(iB, iA);
  return {
    z: reciprocal(add(iA, iIn)),
    currentRatio: ratio,
    axialRatioDb: circularSense(iA, iB).axialRatioDb,
  };
}

export interface QuadratureSweepInput {
  centerMHz: number;
  span: number;
  coarseSteps: number;
  fineSteps: number;
  /** Impedância de cada elemento (os dois são iguais). */
  impedanceAt: (fMHz: number) => Complex;
  /** Impedância da linha de 1/4 de onda, Ω. */
  zLine: number;
  /** Rede depois da junção (por exemplo, um transformador de 1/4 de onda); padrão: nenhuma. */
  afterJunction?: (z: Complex, fMHz: number) => Complex;
  referenceOhms: number;
}

export interface QuadratureSweep {
  swr: SwrSweep;
  /** Faixa com razão axial < 3 dB na direção do feixe. */
  axialBand: SwrBand | null;
}

/**
 * Limite usual de "polarização circular" para a razão axial, dB: a faixa com razão axial < 3 dB é a "3-dB axial ratio bandwidth".
 * Fonte secundária: capítulo de acesso aberto da IntechOpen (https://www.intechopen.com/chapters/43412, "usually axial ratio is required
 * to be below 3 dB") e glossário da RF Essentials. TODO(fonte): conferir no Balanis (cap. de polarização) ou no IEEE Std 145.
 */
export const AXIAL_RATIO_LIMIT_DB = 3;

export function quadratureSweep(input: QuadratureSweepInput): QuadratureSweep {
  const { centerMHz: f0, zLine, afterJunction } = input;
  const swr = swrSweep({
    centerMHz: f0,
    span: input.span,
    coarseSteps: input.coarseSteps,
    fineSteps: input.fineSteps,
    impedanceAt: input.impedanceAt,
    feed: (z, f) => {
      const junction = quadratureAt(z, z, zLine, f0, f).z;
      return afterJunction ? afterJunction(junction, f) : junction;
    },
    referenceOhms: input.referenceOhms,
  });
  const fs = swr.sweep.map((p) => p.fMHz);
  const ar = swr.sweep.map((p) => quadratureAt(p.zAntenna, p.zAntenna, zLine, f0, p.fMHz).axialRatioDb);
  return { swr, axialBand: bandAround(fs, ar, AXIAL_RATIO_LIMIT_DB) };
}
