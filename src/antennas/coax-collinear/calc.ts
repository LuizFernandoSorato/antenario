/**
 * Colinear de coaxial (COCO): chicote de 1/4 de onda no topo, N seções de meia onda de cabo coaxial
 * ligadas com vivo↔malha em cada junção, e uma seção de 1/4 de onda embaixo como transformador de impedância.
 *
 * Fórmulas (Electronics Notes, "Coaxial Collinear Antennas",
 * https://www.electronics-notes.com/articles/antennas-propagation/phased-array-antennas/collinear-coaxial-antenna.php;
 * mesma regra no guia de 70 cm de dmrhub.ru, https://dmrhub.ru/tech/en/collinear, que usa 150000/f × VF mm):
 *   chicote: L1 = c·A/(4f), com A (fator de ponta) em geral entre 0,95 e 0,98;
 *   seção de meia onda de coaxial: L2 = c·V/(2f), com V o fator de velocidade do cabo.
 * A seção de baixo é um transformador de 1/4 de onda: o comprimento físico é c·V/(4f) (a regra do cabo com
 * fator de velocidade, vale para qualquer linha de 1/4 de onda). A fonte não dá a impedância a transformar:
 * TODO(fonte). Ganho por número de seções: dmrhub.ru (fonte de radioamador, não de engenharia).
 */

import { assertFrequencyMHz, formatNumber } from '../../core/units';
import { assertFactor, physicalLength, wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, type Estimate, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';

export interface CoaxCollinearParams {
  frequencyMHz: number;
  /** Número de seções de meia onda (inteiro, 2 a 8). */
  sections: number;
  /** Fator de velocidade do coaxial, em (0, 1]. */
  velocityFactor: number;
  /** Fator de ponta do chicote, em (0, 1]. */
  endEffect: number;
}

export const defaultParams: CoaxCollinearParams = {
  frequencyMHz: 435,
  sections: 4,
  velocityFactor: 0.66,
  endEffect: 0.97,
};

/** Ganho aproximado por número de seções (dBi), de dmrhub.ru (fonte de radioamador): [n, mínimo, máximo]. */
const GAIN_TABLE: readonly (readonly [number, number, number])[] = [
  [2, 3, 4],
  [4, 6, 6],
  [6, 8, 9],
  [8, 8, 9],
];

/** Ganho (min, max, em dBi) para n seções; interpola entre as linhas da tabela. */
export function gainRangeDbi(sections: number): { min: number; max: number; interpolated: boolean } {
  const exact = GAIN_TABLE.find(([n]) => n === sections);
  if (exact) return { min: exact[1], max: exact[2], interpolated: false };
  for (let i = 1; i < GAIN_TABLE.length; i++) {
    const [n0, lo0, hi0] = GAIN_TABLE[i - 1]!;
    const [n1, lo1, hi1] = GAIN_TABLE[i]!;
    if (sections > n0 && sections < n1) {
      const t = (sections - n0) / (n1 - n0);
      return { min: lo0 + t * (lo1 - lo0), max: hi0 + t * (hi1 - hi0), interpolated: true };
    }
  }
  throw new RangeError(`Número de seções fora da tabela de ganho (2 a 8): ${sections}.`);
}

export function calc(params: CoaxCollinearParams): CalcResult {
  const { frequencyMHz: f, sections: n, velocityFactor: vf, endEffect: a } = params;
  assertFrequencyMHz(f);
  assertFactor(vf, 'O fator de velocidade');
  assertFactor(a, 'O fator de ponta');
  if (!Number.isInteger(n) || n < 2 || n > 8) {
    throw new RangeError(`O número de seções deve ser um inteiro de 2 a 8 (recebido: ${n}).`);
  }

  const lambda = wavelength(f);
  const whip = physicalLength(0.25, f, a);
  const half = physicalLength(0.5, f, vf);
  const bottom = physicalLength(0.25, f, vf);
  const total = whip + n * half + bottom;
  const coax = n * half + bottom;

  const measurements: Measurement[] = [
    { label: 'A', name: 'Chicote do topo (1/4 de onda)', meters: whip, description: 'Fio ou vareta no ar, ligado só ao vivo da seção de cima; deixe sobra para ajuste.' },
    { label: 'B', name: 'Cada seção de meia onda', meters: half, description: `${n} seções iguais de coaxial, medidas sem a capa nas pontas; some a sobra das ligações.` },
    { label: 'C', name: 'Seção de baixo (1/4 de onda)', meters: bottom, description: 'Transformador de 1/4 de onda de coaxial, entre o conector e a primeira seção.' },
    { label: 'D', name: 'Comprimento total', meters: total, description: 'Chicote + seções + seção de baixo, na vertical.' },
    { label: 'E', name: 'Coaxial total necessário', meters: coax, description: 'Soma das seções B e C; some a sobra das ligações e do cabo até o rádio.' },
  ];

  const gain = gainRangeDbi(n);
  const gainEstimate: Estimate = {
    min: gain.min,
    max: gain.max,
    unit: 'dBi',
    note:
      `Faixa citada para ${n} seções${gain.interpolated ? ' (interpolada entre as linhas da tabela da fonte)' : ''}. O ganho real costuma ser menor, ` +
      'porque as perdas do cabo nas seções consomem parte dele. Mais seções estreitam o lóbulo vertical.',
    source: 'dmrhub.ru, guia de colinear de 70 cm (fonte de radioamador). TODO(fonte): referência de engenharia.',
  };

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (vf < 0.6 || vf > 0.9) {
    warnings.push({
      level: 'warning',
      message:
        `Fator de velocidade ${formatNumber(vf, 2)} é incomum para coaxial (polietileno sólido ≈ 0,66; espuma 0,78 a 0,85). ` +
        'Confira o datasheet do seu cabo: o VF define o comprimento das seções.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'O fator de velocidade REAL do cabo define o comprimento das seções. Um erro de VF desloca a frequência. ' +
        'Se a menor ROE medida fica acima da frequência desejada, as seções estão curtas (erro de VF).',
    },
    {
      level: 'warning',
      message:
        'A impedância na base sobe com o número de seções e costuma ficar acima de 50 Ω. A seção de baixo de 1/4 de onda ' +
        'a transforma, mas a fonte não dá o valor para o cálculo. TODO(fonte). Deslocar o ponto de alimentação alguns ' +
        'centímetros para cima ou para baixo ajusta a impedância. Meça com NanoVNA e ajuste.',
    },
    {
      level: 'info',
      message:
        'Use choke na entrada (espiras do próprio coaxial em bobina, ou ferrites): sem ele, o cabo até o rádio vira parte ' +
        'da antena e a ROE muda quando você mexe nele. Instale dentro de um tubo de PVC ou fibra, bem vertical.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: tensão alta de RF na ponta do chicote e potência concentrada na horizontal. Instale fora do alcance de ' +
        'pessoas e longe de rede elétrica. Confira a potência máxima do cabo. A calculadora de distância de segurança entra em ' +
        'uma fase futura.',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Seções de meia onda', value: String(n) },
      { name: 'Fator de velocidade do cabo (VF)', value: formatNumber(vf, 3), source: 'Dado do usuário; datasheet do cabo' },
      { name: 'Fator de ponta do chicote (A)', value: formatNumber(a, 3), source: 'Electronics Notes: entre 0,95 e 0,98' },
      { name: 'Ligação entre seções', value: 'Vivo de uma seção na malha da seguinte (e vice-versa), em cada junção', source: 'Electronics Notes; dmrhub.ru' },
      { name: 'Seção de baixo', value: 'Transformador de 1/4 de onda, c·V/(4f)', source: 'Linha de 1/4 de onda; Electronics Notes (função)' },
    ],
    expected: {
      impedance: {
        unit: 'Ω',
        note:
          'A impedância na base sobe com o número de seções e costuma passar de 50 Ω; a seção de baixo e o ponto de alimentação ' +
          'a ajustam. Seções curtas (2 a 4) podem chegar perto de 50 Ω sozinhas. Meça.',
        source: 'dmrhub.ru, guia de colinear de 70 cm. TODO(fonte)',
      },
      gain: gainEstimate,
      bandwidth: null,
    },
    warnings,
  };
}
