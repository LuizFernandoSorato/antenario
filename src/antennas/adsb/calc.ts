/**
 * Antena ADS-B: ground plane de λ/4 em 1090 MHz.
 *
 * Reaproveita o cálculo do ground plane (mesma física), com a frequência padrão do
 * ADS-B e avisos próprios de recepção. A frequência de 1090 MHz vem do padrão do
 * transponder Mode S ES (ICAO Anexo 10, vol. IV; RTCA DO-260B).
 */

import { type GroundPlaneParams, calc as groundPlaneCalc } from '../ground-plane/calc';
import type { CalcResult } from '../types';

export type AdsbParams = GroundPlaneParams;

export const defaultParams: AdsbParams = {
  frequencyMHz: 1090,
  radialCount: 4,
  droopAngleDeg: 45,
  conductorDiameter: 0.002,
};

export function calc(params: AdsbParams): CalcResult {
  const base = groundPlaneCalc(params);
  return {
    ...base,
    // Recepção apenas: remove o aviso de tensão alta de TX do ground plane.
    warnings: [
      ...base.warnings.filter((w) => w.level !== 'danger'),
      {
        level: 'info',
        message:
          'O ADS-B usa 1090 MHz e o sinal é fraco e de visada direta: o alcance depende muito da ' +
          'altura da antena e do comprimento/perda do cabo. Em 1090 MHz o coaxial perde muito ' +
          '(confira a ferramenta de cabos); prefira cabo curto e o SDR perto da antena.',
      },
      {
        level: 'warning',
        message: 'Esta antena é só para recepção. Não transmita em 1090 MHz: é frequência do serviço aeronáutico.',
      },
    ],
  };
}

// TODO(fonte) [guide.md]: ganho e alcance típicos de ADS-B caseira não têm fonte citada aqui; não os assumimos.
