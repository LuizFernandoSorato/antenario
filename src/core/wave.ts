/**
 * Comprimento de onda, fator de velocidade (cabos) e fator de encurtamento (antenas).
 *
 * Dois fatores diferentes, mesma conta:
 * - **Fator de velocidade (VF)** de uma linha de transmissão: a onda viaja dentro
 *   do cabo mais devagar que no vácuo (VF = 1/√εr do dielétrico). Ex.: um cabo com
 *   dielétrico de polietileno sólido tem VF ≈ 0,66. O valor de cada cabo vem do
 *   datasheet do fabricante (ficará em `src/data/`).
 * - **Fator de encurtamento (K)** de uma antena: um condutor real tem espessura
 *   finita e efeitos de ponta, por isso o comprimento ressonante é um pouco menor
 *   que o comprimento elétrico teórico. Para um dipolo de meia onda, K ≈ 0,95 é
 *   típico, mas ele varia com a razão comprimento/diâmetro (ARRL Antenna Book,
 *   capítulo sobre dipolos). Por isso K é sempre um parâmetro ajustável.
 *
 * Em ambos os casos: comprimento físico = fração × λ₀ × fator.
 */

import { SPEED_OF_LIGHT_M_PER_S, assertFrequencyMHz, assertPositive, mhzToHz } from './units';

/**
 * Comprimento de onda no espaço livre, em metros.
 * λ(m) = c / f = 299,792458 / f(MHz).
 */
export function wavelength(fMHz: number): number {
  assertFrequencyMHz(fMHz);
  return SPEED_OF_LIGHT_M_PER_S / mhzToHz(fMHz);
}

/** Frequência (MHz) correspondente a um comprimento de onda no espaço livre (m). */
export function frequencyFromWavelength(lambdaMeters: number): number {
  assertPositive(lambdaMeters, 'O comprimento de onda (m)');
  return SPEED_OF_LIGHT_M_PER_S / lambdaMeters / 1e6;
}

/** Valida um fator de velocidade ou de encurtamento: deve estar em (0, 1]. */
export function assertFactor(factor: number, name: string): void {
  if (!Number.isFinite(factor) || factor <= 0 || factor > 1) {
    throw new RangeError(`${name} deve estar entre 0 (exclusivo) e 1 (recebido: ${factor}).`);
  }
}

/**
 * Comprimento de onda dentro de uma linha de transmissão, em metros.
 * λ_linha = λ₀ · VF.
 */
export function wavelengthInLine(fMHz: number, velocityFactor: number): number {
  assertFactor(velocityFactor, 'O fator de velocidade');
  return wavelength(fMHz) * velocityFactor;
}

/**
 * Converte um comprimento elétrico (em frações de λ) em comprimento físico (m).
 *
 * @param fractionOfWavelength ex.: 0,5 para meia onda, 0,25 para quarto de onda
 * @param fMHz frequência de projeto
 * @param factor fator de velocidade (cabo) ou de encurtamento (antena); 1 = espaço livre
 */
export function physicalLength(fractionOfWavelength: number, fMHz: number, factor = 1): number {
  assertPositive(fractionOfWavelength, 'A fração de comprimento de onda');
  assertFactor(factor, 'O fator');
  return fractionOfWavelength * wavelength(fMHz) * factor;
}

/**
 * Operação inversa: comprimento físico (m) → comprimento elétrico (frações de λ).
 * Útil para saber "quantos λ" tem um pedaço de cabo.
 */
export function electricalLength(physicalMeters: number, fMHz: number, factor = 1): number {
  assertPositive(physicalMeters, 'O comprimento físico (m)');
  assertFactor(factor, 'O fator');
  return physicalMeters / (wavelength(fMHz) * factor);
}

/** Comprimento elétrico em graus (360° = 1 λ). */
export function electricalLengthDegrees(physicalMeters: number, fMHz: number, factor = 1): number {
  return electricalLength(physicalMeters, fMHz, factor) * 360;
}
