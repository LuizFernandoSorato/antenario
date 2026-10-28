/**
 * Choke de manga de λ/4 ("sleeve balun", "detuning sleeve"): um tubo metálico em volta do coaxial, fechado embaixo por um
 * disco soldado na malha e aberto em cima, perto da antena. Tubo e face externa da malha formam uma linha coaxial de ar de
 * λ/4 em curto; na borda aberta a impedância é muito alta e trava a corrente de modo comum. Funciona numa frequência só.
 *
 * Fontes:
 * - ARRL Antenna Book, 19ª ed., p. 26-22 e 26-23, Fig 33B: comprimento L = 234/f(MHz) pés (linha de ar, VF ≈ 0,95);
 *   diâmetro "bem maior que o do cabo: duas polegadas servem para cabo de meia polegada"; a manga deve ficar simétrica em
 *   relação ao centro da antena, "particularmente importante em VHF e UHF"; cortar um pouco comprida e encurtar pela borda
 *   de cima até ressoar; ressonante na mesma frequência da antena.
 * - K. Rothammel, "Antene" (trad. sérvia da 9ª ed. alemã), §25.1.2, p. 362–363, Fig. 25.2: exemplo de 2 m com comprimento
 *   interno efetivo de 495 mm e relação de diâmetros D:d de 3:1 a 4:1 (D = 28 mm, d = 8 mm).
 * - Impedância da linha de ar: ARRL Antenna Book, 19ª ed., p. 24-14, Eq 26: Z0 = 138·log10(D/d).
 */

import { assertFrequencyMHz, assertPositive } from '../core/units';

/** Comprimento da manga em pés × MHz (ARRL Antenna Book, 19ª ed., Fig 33B: L = 234/f). */
export const SLEEVE_FEET_MHZ = 234;
/** Relação entre o diâmetro interno do tubo e o diâmetro do que passa dentro (Rothammel, §25.1.2: 3:1 a 4:1). */
export const SLEEVE_DIAMETER_RATIO = { min: 3, max: 4 } as const;

const FOOT_M = 0.3048;

/** Impedância característica de uma linha coaxial de ar (ARRL Antenna Book, 19ª ed., Eq 26). */
export function airCoaxImpedance(outerInnerDiameter: number, innerOuterDiameter: number): number {
  assertPositive(outerInnerDiameter, 'O diâmetro interno do tubo');
  assertPositive(innerOuterDiameter, 'O diâmetro do condutor interno');
  if (outerInnerDiameter <= innerOuterDiameter) {
    throw new RangeError('O diâmetro interno do tubo precisa ser maior que o do condutor de dentro.');
  }
  return 138 * Math.log10(outerInnerDiameter / innerOuterDiameter);
}

export interface SleeveBalunInput {
  fMHz: number;
  /** Diâmetro externo do coaxial (o "condutor interno" da linha da manga), em metros. */
  cableDiameterM: number;
}

export interface SleeveBalunResult {
  /** Comprimento interno da manga, do disco do fundo à borda aberta (m). */
  lengthM: number;
  /** Faixa do diâmetro interno do tubo (m). */
  tubeDiameterMinM: number;
  tubeDiameterMaxM: number;
  /** Impedância da linha da manga nos dois extremos da faixa de diâmetro (Ω), informativa. */
  lineImpedanceMinOhms: number;
  lineImpedanceMaxOhms: number;
}

export function sleeveBalun(input: SleeveBalunInput): SleeveBalunResult {
  assertFrequencyMHz(input.fMHz);
  assertPositive(input.cableDiameterM, 'O diâmetro do cabo');
  const d = input.cableDiameterM;
  return {
    lengthM: (SLEEVE_FEET_MHZ / input.fMHz) * FOOT_M,
    tubeDiameterMinM: SLEEVE_DIAMETER_RATIO.min * d,
    tubeDiameterMaxM: SLEEVE_DIAMETER_RATIO.max * d,
    lineImpedanceMinOhms: airCoaxImpedance(SLEEVE_DIAMETER_RATIO.min, 1),
    lineImpedanceMaxOhms: airCoaxImpedance(SLEEVE_DIAMETER_RATIO.max, 1),
  };
}
