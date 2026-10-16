/**
 * J-pole: radiador de λ/2 alimentado na ponta por uma seção de casamento de λ/4.
 *
 * Como funciona: a ponta de um radiador de meia onda tem impedância muito alta
 * (milhares de ohms). Uma linha de λ/4 em curto também tem impedância muito alta
 * na ponta aberta e quase zero no curto. Entre esses extremos existe um ponto em
 * que a impedância vale 50 Ω, e ali se liga o coaxial.
 *
 * Geometria (cotas):
 *   A = elemento longo (radiador B + trecho da seção de casamento C)
 *   B = radiador de λ/2, acima do topo da seção de casamento
 *   C = seção de casamento de λ/4 (= elemento curto), medida a partir do curto
 *   D = espaçamento centro a centro entre os dois condutores da seção
 */

import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { assertFactor, physicalLength, wavelength } from '../../core/wave';
import { parallelWireImpedance } from '../../lines/parallel-wire';
import { type CalcResult, type CalcWarning, rangeWarning } from '../types';
import { meta } from './meta';

export interface JPoleParams {
  frequencyMHz: number;
  /** Fator de encurtamento do radiador de λ/2, em (0, 1]. */
  shorteningFactor: number;
  /** Fator de encurtamento (ou de velocidade) da seção de casamento de λ/4, em (0, 1]. */
  stubFactor: number;
  /** Diâmetro dos condutores, em metros. */
  conductorDiameter: number;
  /** Espaçamento centro a centro entre os condutores da seção, em metros. */
  spacing: number;
}

export const defaultParams: JPoleParams = {
  frequencyMHz: 145,
  shorteningFactor: 0.95,
  stubFactor: 0.95,
  // Tubo de cobre de 1/2" (12,7 mm), comum em J-poles de VHF. Valor de entrada, não constante física.
  conductorDiameter: 0.0127,
  spacing: 0.05,
};

export function calc(params: JPoleParams): CalcResult {
  const { frequencyMHz: f, shorteningFactor: k, stubFactor: ks, conductorDiameter: d, spacing } = params;
  assertFrequencyMHz(f);
  assertFactor(k, 'O fator de encurtamento do radiador');
  assertFactor(ks, 'O fator da seção de casamento');
  assertPositive(d, 'O diâmetro do condutor');
  // Valida também espaçamento > diâmetro.
  const stubZ0 = parallelWireImpedance(spacing, d);

  const lambda = wavelength(f);
  const radiator = physicalLength(0.5, f, k);
  const stub = physicalLength(0.25, f, ks);

  const warnings: CalcWarning[] = [
    {
      level: 'warning',
      message:
        'Ponto de alimentação: não calculado. A posição do tap de 50 Ω depende da impedância da ' +
        'ponta do radiador, que varia com o diâmetro e a montagem. TODO(fonte): fórmula ou tabela ' +
        'de posição inicial com fonte citada. Por enquanto, encontre o ponto deslizando as ' +
        'conexões ao longo da seção de casamento e medindo a ROE (ver guia).',
    },
    {
      level: 'warning',
      message:
        'O J-pole é conhecido por induzir corrente de modo comum na malha do coaxial. Use um choke ' +
        'de corrente logo abaixo do ponto de alimentação, senão a ROE muda quando você mexe no cabo.',
    },
    {
      level: 'warning',
      message: 'Corte o radiador um pouco mais comprido e encurte aos poucos medindo a ROE.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: a ponta do radiador e a ponta aberta da seção de casamento ficam em tensão ' +
        'alta de RF. Instale fora do alcance de pessoas.',
    },
  ];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.unshift(outOfRange);

  return {
    measurements: [
      { label: 'A', name: 'Elemento longo', meters: radiator + stub, description: 'Do curto (base) até a ponta superior: B + C.' },
      { label: 'B', name: 'Radiador', meters: radiator, description: 'Parte do elemento longo acima do topo do elemento curto.' },
      { label: 'C', name: 'Seção de casamento (elemento curto)', meters: stub, description: 'Do curto (base) até a ponta aberta do elemento curto.' },
      { label: 'D', name: 'Espaçamento', meters: spacing, description: 'Entre os centros dos dois condutores da seção de casamento.' },
    ],
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Fator de encurtamento do radiador (K)', value: formatNumber(k, 3) },
      { name: 'Fator da seção de casamento', value: formatNumber(ks, 3) },
      { name: 'Diâmetro do condutor', value: `${formatNumber(d * 1000, 2)} mm` },
      {
        name: 'Impedância característica da seção',
        value: `${formatNumber(stubZ0, 0, false)} Ω`,
        source: 'Linha de dois fios no ar: Z0 = (η0/π)·acosh(D/d) (Kraus; Pozar)',
      },
      { name: 'Instalação', value: 'Antena elevada, longe de estruturas metálicas' },
    ],
    expected: {
      impedance: {
        typical: 50,
        unit: 'Ω',
        note: 'Não é uma propriedade da geometria: é obtida escolhendo o ponto de alimentação na seção de casamento.',
        source: 'ARRL Antenna Book (seção de casamento de λ/4 com tap)',
      },
      gain: {
        max: 2.15,
        unit: 'dBi',
        note:
          'O radiador é uma meia onda, então o limite é o ganho do dipolo de λ/2. Na prática fica um ' +
          'pouco abaixo por causa da radiação da seção de casamento e do cabo; sem valor típico com fonte.',
        source: 'Balanis, Antenna Theory, 4ª ed., §4.6 (dipolo de λ/2)',
      },
      bandwidth: null,
    },
    warnings,
  };
}
