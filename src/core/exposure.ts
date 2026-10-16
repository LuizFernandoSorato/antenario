/**
 * Exposição a RF em campo distante (estimativa).
 *
 *   S = P·G / (4π·r²)        densidade de potência a distância r (P em W, G em ganho linear sobre isotrópica)
 *   r = √(P·G / (4π·S_lim))  distância para atingir S_lim
 *   r_far = 2·D²/λ           início do campo distante para uma antena de maior dimensão D
 *
 * Referências: CLAUDE.md (fórmula de base); Balanis, "Antenna Theory", cap. 2 (região de campo distante, 2D²/λ);
 * limites em data/rf-exposure-limits.ts (ICNIRP 2020). É uma ESTIMATIVA: ignora reflexões no solo, campo próximo
 * e acoplamento com estruturas. Funções puras, sem DOM.
 */

import { assertPositive, dbToPowerRatio } from './units';
import { wavelength } from './wave';

/** Ganho em dBi → razão linear. */
export function gainLinearFromDbi(gainDbi: number): number {
  return dbToPowerRatio(gainDbi);
}

/** Potência média (W) = potência de pico da portadora × ciclo de trabalho (fração de 0 a 1). */
export function averagePower(powerW: number, dutyCycle: number): number {
  assertPositive(powerW, 'A potência (W)');
  if (!(dutyCycle > 0) || dutyCycle > 1) throw new RangeError('O ciclo de trabalho deve estar entre 0 (exclusive) e 1.');
  return powerW * dutyCycle;
}

/** Densidade de potência S (W/m²) em campo distante, a r metros. */
export function powerDensity(powerW: number, gainLinear: number, distanceM: number): number {
  assertPositive(powerW, 'A potência (W)');
  assertPositive(gainLinear, 'O ganho linear');
  assertPositive(distanceM, 'A distância (m)');
  return (powerW * gainLinear) / (4 * Math.PI * distanceM * distanceM);
}

/** Distância (m) na qual S cai ao limite `limitWPerM2`. */
export function safeDistance(powerW: number, gainLinear: number, limitWPerM2: number): number {
  assertPositive(powerW, 'A potência (W)');
  assertPositive(gainLinear, 'O ganho linear');
  assertPositive(limitWPerM2, 'O limite (W/m²)');
  return Math.sqrt((powerW * gainLinear) / (4 * Math.PI * limitWPerM2));
}

/** Início da região de campo distante (m): 2·D²/λ. */
export function farFieldDistance(largestDimensionM: number, fMHz: number): number {
  assertPositive(largestDimensionM, 'A maior dimensão da antena (m)');
  return (2 * largestDimensionM * largestDimensionM) / wavelength(fMHz);
}
