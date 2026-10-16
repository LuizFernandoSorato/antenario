/**
 * Coeficiente de reflexão, ROE (SWR), perda de retorno e perda por descasamento.
 *
 * Quando a impedância da carga (antena) Z_L é diferente da impedância
 * característica da linha Z_0, parte da onda volta em direção ao transmissor.
 * O coeficiente de reflexão Γ mede essa parcela:
 *
 *   Γ = (Z_L − Z_0) / (Z_L + Z_0)
 *
 * A partir de |Γ| saem todas as outras medidas:
 *   ROE = (1 + |Γ|) / (1 − |Γ|)
 *   perda de retorno (dB)      = −20·log10|Γ|        (quanto maior, melhor)
 *   perda por descasamento (dB) = −10·log10(1 − |Γ|²) (potência que não chega à carga)
 *
 * Premissa: linha sem perdas com Z_0 real (aproximação usual para coaxiais de
 * 50 Ω/75 Ω). Perdas do cabo melhoram a ROE medida no transmissor, mas isso é
 * tratado em `src/lines/`, não aqui.
 * Fonte das fórmulas: Pozar, "Microwave Engineering", 4ª ed., seção 2.3;
 * ARRL Antenna Book, capítulo sobre linhas de transmissão.
 */

import { type Complex, abs, add, div, sub, toComplex } from './complex';
import { assertPositive } from './units';

/** Valida |Γ| para carga passiva: 0 ≤ |Γ| ≤ 1. */
function assertGammaMagnitude(gamma: number): void {
  if (!Number.isFinite(gamma) || gamma < 0 || gamma > 1) {
    throw new RangeError(`|Γ| deve estar entre 0 e 1 (recebido: ${gamma}).`);
  }
}

/**
 * Coeficiente de reflexão complexo Γ.
 *
 * @param zLoad impedância da carga (ohms), real ou complexa; parte real ≥ 0 (carga passiva)
 * @param z0 impedância característica da linha (ohms), real e positiva
 */
export function reflectionCoefficient(zLoad: number | Complex, z0: number): Complex {
  assertPositive(z0, 'A impedância característica Z0 (Ω)');
  const zl = toComplex(zLoad);
  if (!Number.isFinite(zl.re) || !Number.isFinite(zl.im)) {
    throw new RangeError('A impedância da carga deve ser finita.');
  }
  if (zl.re < 0) {
    throw new RangeError('A resistência da carga não pode ser negativa (carga passiva).');
  }
  const z0c = toComplex(z0);
  return div(sub(zl, z0c), add(zl, z0c));
}

/** Módulo do coeficiente de reflexão |Γ|. */
export function reflectionMagnitude(zLoad: number | Complex, z0: number): number {
  return abs(reflectionCoefficient(zLoad, z0));
}

/** ROE (SWR) a partir de |Γ|. Retorna Infinity para |Γ| = 1 (reflexão total). */
export function swrFromGamma(gamma: number): number {
  assertGammaMagnitude(gamma);
  if (gamma === 1) return Number.POSITIVE_INFINITY;
  return (1 + gamma) / (1 - gamma);
}

/** |Γ| a partir da ROE: |Γ| = (ROE − 1)/(ROE + 1). */
export function gammaFromSwr(swr: number): number {
  if (Number.isNaN(swr) || swr < 1) {
    throw new RangeError(`A ROE deve ser ≥ 1 (recebido: ${swr}).`);
  }
  if (swr === Number.POSITIVE_INFINITY) return 1;
  return (swr - 1) / (swr + 1);
}

/** ROE diretamente a partir das impedâncias. */
export function swrFromImpedance(zLoad: number | Complex, z0: number): number {
  return swrFromGamma(reflectionMagnitude(zLoad, z0));
}

/**
 * Perda de retorno em dB (valor positivo). Retorna Infinity para |Γ| = 0
 * (casamento perfeito).
 */
export function returnLossDb(gamma: number): number {
  assertGammaMagnitude(gamma);
  if (gamma === 0) return Number.POSITIVE_INFINITY;
  // "+ 0" normaliza −0 para 0 (evita exibir "−0 dB" quando |Γ| = 1).
  return -20 * Math.log10(gamma) + 0;
}

/**
 * |Γ| a partir da perda de retorno em dB (ex.: leitura do NanoVNA).
 * Aceita valores ≥ 0 dB.
 */
export function gammaFromReturnLoss(returnLoss: number): number {
  if (Number.isNaN(returnLoss) || returnLoss < 0) {
    throw new RangeError(`A perda de retorno deve ser ≥ 0 dB (recebido: ${returnLoss}).`);
  }
  return 10 ** (-returnLoss / 20);
}

/**
 * Perda por descasamento em dB (valor positivo): quanto da potência deixa de
 * chegar à carga por causa da reflexão. Retorna Infinity para |Γ| = 1.
 */
export function mismatchLossDb(gamma: number): number {
  assertGammaMagnitude(gamma);
  if (gamma === 1) return Number.POSITIVE_INFINITY;
  return -10 * Math.log10(1 - gamma * gamma) + 0;
}

/** Fração da potência incidente que é refletida: |Γ|². */
export function reflectedPowerFraction(gamma: number): number {
  assertGammaMagnitude(gamma);
  return gamma * gamma;
}

/** Fração da potência incidente que é entregue à carga: 1 − |Γ|². */
export function deliveredPowerFraction(gamma: number): number {
  return 1 - reflectedPowerFraction(gamma);
}
