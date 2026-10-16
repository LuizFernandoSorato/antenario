/**
 * Balun 4:1 de coaxial de meia onda ("U-balun").
 *
 * Um laço de coaxial de comprimento elétrico λ/2 atrasa o sinal em 180°. Os dois
 * terminais da carga balanceada recebem sinais iguais e opostos; a impedância
 * balanceada fica 4× a impedância do lado desbalanceado (50 Ω → 200 Ω).
 * Fonte: ARRL Antenna Book, capítulo sobre acoplamento linha–antena (baluns de linha).
 *
 * É um dispositivo de banda estreita: o atraso só é de 180° perto da frequência
 * de projeto. O comprimento físico usa o fator de velocidade do cabo do laço.
 *
 * Fora deste módulo, por falta de modelo com fonte (TODO(fonte)):
 * - choke de ferrite (balun de corrente 1:1): depende do material e do núcleo
 *   (datasheets Fair-Rite/Amidon) e de medições de impedância de modo comum;
 * - choke de espiras de coaxial ("ugly balun") e balun de manga (bazooka).
 */

import { assertPositive } from '../core/units';
import { physicalLength } from '../core/wave';

export interface HalfWaveBalunInput {
  fMHz: number;
  /** Impedância do lado desbalanceado (rádio/cabo principal), Ω. */
  unbalancedOhms: number;
  /** Fator de velocidade do cabo usado no laço. */
  velocityFactor: number;
}

export interface HalfWaveBalunResult {
  /** Comprimento do laço de coaxial, entre os pontos de ligação da malha (m). */
  loopLengthM: number;
  /** Impedância do lado balanceado (Ω). */
  balancedOhms: number;
}

export function halfWaveBalun(input: HalfWaveBalunInput): HalfWaveBalunResult {
  assertPositive(input.unbalancedOhms, 'A impedância do lado desbalanceado');
  return {
    loopLengthM: physicalLength(0.5, input.fMHz, input.velocityFactor),
    balancedOhms: 4 * input.unbalancedOhms,
  };
}
