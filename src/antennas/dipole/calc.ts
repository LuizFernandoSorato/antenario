/**
 * Dipolo de meia onda alimentado no centro.
 *
 * Comprimento total: L = K · λ/2. O fator K corrige a espessura finita do
 * condutor e o efeito de ponta (ver `core/wave.ts`).
 */

import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { assertFactor, physicalLength, wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, rangeWarning } from '../types';
import { meta } from './meta';

export interface DipoleParams {
  frequencyMHz: number;
  /** Fator de encurtamento K, em (0, 1]. */
  shorteningFactor: number;
  /** Diâmetro do condutor, em metros. */
  conductorDiameter: number;
  /** Espaço entre os braços no centro (isolador), em metros. */
  centerGap: number;
}

export const defaultParams: DipoleParams = {
  frequencyMHz: 145,
  shorteningFactor: 0.95,
  conductorDiameter: 0.002,
  centerGap: 0,
};

export function calc(params: DipoleParams): CalcResult {
  const { frequencyMHz: f, shorteningFactor: k, conductorDiameter: d, centerGap: gap } = params;
  assertFrequencyMHz(f);
  assertFactor(k, 'O fator de encurtamento K');
  assertPositive(d, 'O diâmetro do condutor');
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError(`O espaço central deve ser ≥ 0 (recebido: ${gap}).`);
  }

  const lambda = wavelength(f);
  const total = physicalLength(0.5, f, k);
  if (gap >= total) {
    throw new RangeError('O espaço central é maior que o comprimento total do dipolo.');
  }
  const arm = (total - gap) / 2;

  const measurements = [
    { label: 'A', name: 'Comprimento total', meters: total, description: 'De ponta a ponta, incluindo o espaço central.' },
    { label: 'B', name: 'Cada braço', meters: arm, description: 'Do terminal de alimentação até a ponta. São dois braços iguais.' },
  ];
  if (gap > 0) {
    measurements.push({ label: 'C', name: 'Espaço central', meters: gap, description: 'Entre os dois braços, no isolador central.' });
  }

  const warnings: CalcWarning[] = [
    {
      level: 'info',
      message:
        'K foi informado manualmente. Ele depende da razão comprimento/diâmetro do condutor ' +
        '(curva no ARRL Antenna Book); o cálculo automático de K a partir do diâmetro ainda não ' +
        'foi implementado. TODO(fonte): digitalizar a curva com a fonte citada.',
    },
    {
      level: 'warning',
      message:
        'A impedância e a frequência de ressonância mudam com a altura acima do solo e com objetos ' +
        'próximos. Corte os braços um pouco mais compridos e encurte aos poucos medindo a ROE.',
    },
    {
      level: 'info',
      message:
        'O dipolo é simétrico e o coaxial não: use um balun de corrente 1:1 (choke) no ponto de ' +
        'alimentação para evitar corrente de modo comum na malha do cabo.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: as pontas dos braços ficam em tensão alta de RF (pode passar de centenas de ' +
        'volts mesmo com potências moderadas). Mantenha as pontas fora do alcance de pessoas e use ' +
        'isoladores adequados.',
    },
  ];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.unshift(outOfRange);

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Fator de encurtamento (K)', value: formatNumber(k, 3) },
      { name: 'Diâmetro do condutor', value: `${formatNumber(d * 1000, 2)} mm` },
      { name: 'Razão comprimento/diâmetro', value: formatNumber(total / d, 0) },
      { name: 'Ambiente', value: 'Espaço livre: sem efeito do solo nem de objetos próximos' },
    ],
    expected: {
      impedance: {
        typical: 73,
        unit: 'Ω',
        note:
          'Resistência de radiação de um dipolo fino de λ/2 no espaço livre. Na prática varia com a ' +
          'altura acima do solo; com coaxial de 50 Ω a ROE costuma ficar perto de 1,5:1 sem casamento.',
        source: 'Balanis, Antenna Theory, 4ª ed., §4.6; Kraus, Antennas',
      },
      gain: {
        typical: 2.15,
        unit: 'dBi',
        note: 'Diretividade de 1,64 do dipolo de λ/2 no espaço livre (perdas ôhmicas desprezadas).',
        source: 'Balanis, Antenna Theory, 4ª ed., §4.6',
      },
      // A banda depende fortemente da razão comprimento/diâmetro e da altura;
      // sem um modelo com fonte, não estimamos (regra do CLAUDE.md).
      bandwidth: null,
    },
    warnings,
  };
}
