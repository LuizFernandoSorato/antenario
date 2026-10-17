/**
 * Ground plane de 1/4 de onda: radiador vertical de λ/4 com radiais.
 *
 * Pela teoria das imagens, um monopolo de λ/4 sobre um plano condutor infinito e
 * perfeito se comporta como metade de um dipolo de λ/2: metade da resistência de
 * radiação (≈ 36,5 Ω) e o dobro da diretividade (≈ 5,15 dBi). Os radiais são uma
 * aproximação desse plano. Com poucos radiais elevados o resultado real se afasta
 * desses limites teóricos, por isso o ganho aparece só como referência. A impedância é
 * estimada por interpolação indicativa em função da inclinação (ver estimateImpedance).
 */

import { degToRad } from '../../core/complex';
import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { assertFactor, physicalLength, wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';

export interface GroundPlaneParams {
  frequencyMHz: number;
  /** Fator de encurtamento do radiador vertical, em (0, 1]. */
  shorteningFactor: number;
  /** Fator de encurtamento dos radiais, em (0, 1]. */
  radialFactor: number;
  radialCount: number;
  /** Inclinação dos radiais abaixo da horizontal, em graus, em [0, 90). */
  droopAngleDeg: number;
  /** Diâmetro do condutor, em metros. */
  conductorDiameter: number;
}

/**
 * Impedância de entrada estimada (Ω) em função da inclinação dos radiais.
 *
 * INTERPOLAÇÃO INDICATIVA, não é um modelo publicado. Passa por três pontos de referência:
 *  - 0° (radiais horizontais): 36,5 Ω, monopolo de λ/4 sobre plano perfeito (Balanis, Antenna Theory, §4.7);
 *  - 45°: ≈ 50 Ω, regra prática repetida em fontes de radioamador (ARRL; ex.: electronics-notes.com);
 *  - 90° (radiais alinhados ao radiador, vira um dipolo vertical): ≈ 73 Ω (Balanis, dipolo de λ/2).
 * Entre os pontos usa a parábola que passa pelos três (monótona crescente em [0°, 90°]).
 * A literatura não dá valores intermediários; o real depende de altura, diâmetro e arredores. Meça.
 */
export function estimateImpedance(droopAngleDeg: number): number {
  const z0 = 36.5;
  const z45 = 50;
  const z90 = 73;
  const c = (z90 - 2 * z45 + z0) / (2 * 45 * 45);
  const b = (z45 - z0) / 45 - c * 45;
  return z0 + b * droopAngleDeg + c * droopAngleDeg * droopAngleDeg;
}

export const defaultParams: GroundPlaneParams = {
  frequencyMHz: 145,
  shorteningFactor: 0.95,
  radialFactor: 0.95,
  radialCount: 4,
  droopAngleDeg: 45,
  conductorDiameter: 0.002,
};

export function calc(params: GroundPlaneParams): CalcResult {
  const {
    frequencyMHz: f,
    shorteningFactor: k,
    radialFactor: kr,
    radialCount: n,
    droopAngleDeg: angle,
    conductorDiameter: d,
  } = params;
  assertFrequencyMHz(f);
  assertFactor(k, 'O fator de encurtamento do radiador');
  assertFactor(kr, 'O fator de encurtamento dos radiais');
  assertPositive(d, 'O diâmetro do condutor');
  if (!Number.isInteger(n) || n < 2) {
    throw new RangeError(`O número de radiais deve ser um inteiro ≥ 2 (recebido: ${n}).`);
  }
  if (!Number.isFinite(angle) || angle < 0 || angle >= 90) {
    throw new RangeError(`A inclinação dos radiais deve estar em [0°, 90°) (recebido: ${angle}).`);
  }

  const lambda = wavelength(f);
  const radiator = physicalLength(0.25, f, k);
  const radial = physicalLength(0.25, f, kr);
  const theta = degToRad(angle);
  const reach = radial * Math.cos(theta);
  const drop = radial * Math.sin(theta);

  const measurements: Measurement[] = [
    { label: 'A', name: 'Radiador vertical', meters: radiator, description: 'Do ponto de alimentação até a ponta superior.' },
    { label: 'B', name: 'Cada radial', meters: radial, description: `Do ponto de alimentação até a ponta. São ${n} radiais iguais.` },
    { label: 'C', name: 'Alcance horizontal do radial', meters: reach, description: 'Projeção do radial no plano horizontal (útil para gabarito).' },
  ];
  if (angle > 0) {
    measurements.push({ label: 'D', name: 'Queda do radial', meters: drop, description: 'Quanto a ponta do radial fica abaixo do ponto de alimentação.' });
  }

  const warnings: CalcWarning[] = [
    {
      level: 'warning',
      message:
        'A impedância depende da inclinação e do número de radiais. Radiais horizontais dão ' +
        'impedância bem abaixo de 50 Ω; inclinando-os para baixo ela sobe e chega perto de ' +
        '50 Ω a ≈ 45°. O valor mostrado é uma interpolação indicativa entre pontos de referência ' +
        '(36,5 Ω a 0°, 50 Ω a 45°, 73 Ω a 90°). TODO(fonte): não há tabela publicada com valores ' +
        'intermediários. Ajuste a inclinação medindo a ROE.',
    },
    {
      level: 'warning',
      message: 'Corte o radiador um pouco mais comprido e encurte aos poucos medindo a ROE.',
    },
    {
      level: 'info',
      message:
        'Use um choke de corrente no coaxial logo abaixo do ponto de alimentação para evitar que a ' +
        'malha do cabo vire um "radial" extra e deforme o diagrama.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: a ponta superior do radiador fica em tensão alta de RF. Instale a antena fora ' +
        'do alcance de pessoas.',
    },
  ];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.unshift(outOfRange);

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Fator de encurtamento do radiador (K)', value: formatNumber(k, 3) },
      { name: 'Fator de encurtamento dos radiais', value: formatNumber(kr, 3) },
      { name: 'Número de radiais', value: String(n) },
      { name: 'Inclinação dos radiais', value: `${formatNumber(angle, 0)}°` },
      { name: 'Diâmetro do condutor', value: `${formatNumber(d * 1000, 2)} mm` },
      { name: 'Instalação', value: 'Antena elevada, longe do solo e de estruturas metálicas' },
    ],
    expected: {
      impedance: {
        typical: estimateImpedance(angle),
        unit: 'Ω',
        note:
          'Estimativa por interpolação entre 36,5 Ω (0°, plano perfeito), ≈ 50 Ω (45°) e ≈ 73 Ω (90°). ' +
          'Não é um modelo publicado; o valor real depende de altura, diâmetro e arredores. Meça.',
        source: 'Balanis, Antenna Theory, 4ª ed., §4.7 (0° e 90°); regra prática de ≈ 45° → 50 Ω (ARRL, fonte secundária)',
      },
      gain: {
        max: 5.15,
        unit: 'dBi',
        note:
          'Limite teórico sobre plano infinito e perfeito (dobro da diretividade do dipolo). Com ' +
          'radiais elevados o ganho real é menor; não há valor típico com fonte confiável aqui.',
        source: 'Balanis, Antenna Theory, 4ª ed., §4.7',
      },
      bandwidth: null,
    },
    warnings,
  };
}
