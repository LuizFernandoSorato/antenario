/**
 * Ground plane de 1/4 de onda: radiador vertical de λ/4 com radiais.
 *
 * Pela teoria das imagens, um monopolo de λ/4 sobre um plano condutor infinito e
 * perfeito se comporta como metade de um dipolo de λ/2: metade da resistência de
 * radiação (≈ 36,5 Ω) e o dobro da diretividade (≈ 5,15 dBi). Os radiais são uma
 * aproximação desse plano. Com poucos radiais elevados o resultado real se afasta
 * desses limites teóricos, por isso o ganho aparece só como referência. A impedância vem da
 * curva do ARRL Antenna Book em função da inclinação (ver estimateImpedance).
 *
 * Comprimentos: pela mesma teoria das imagens, o radiador de λ/4 ressoa com metade do comprimento do dipolo do mesmo condutor,
 * então usa o K do dipolo (`k-factor.ts`). Os radiais usam o mesmo K (premissa: o método dos momentos desta ferramenta não tem
 * junções e não modela o ground plane inteiro).
 */

import { degToRad, scale } from '../../core/complex';
import { swrSweep } from '../../core/swr-band';
import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { physicalLength, wavelength } from '../../core/wave';
import { swrBandwidthEstimate } from '../bandwidth';
import { DIPOLE_SWEEP, dipoleBandModel } from '../dipole/band-model';
import { BAND_SOURCE } from '../dipole/calc';
import { K_FIELD_NOTE, kAssumption, kWarning, shorteningFactorFor } from '../k-factor';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';

export interface GroundPlaneParams {
  frequencyMHz: number;
  radialCount: number;
  /** Inclinação dos radiais abaixo da horizontal, em graus, em [0, 90). */
  droopAngleDeg: number;
  /** Diâmetro do condutor (radiador e radiais), em metros; define o K. */
  conductorDiameter: number;
}

/**
 * Resistência de radiação (Ω) de um ground plane de 4 radiais a mais de 0,3λ do solo, em função da inclinação dos radiais.
 * Fonte: ARRL Antenna Book, 21ª ed. (2007), p. 6-19, Fig 35 ("Radiation resistance and resonant length for a 4-radial
 * ground-plane antenna > 0.3 λ above ground as a function of radial droop angle"). O texto da mesma página diz R = 50 Ω a 45°.
 * Pontos lidos na figura a cada 5° (digitalizada a 300 dpi, leitura ±0,3 Ω); a curva termina em 80°.
 * Divergência: o Rothammel ("Antene", trad. sérvia da 9ª ed. alemã, §19.4.1, p. 281) dá ≈ 36 Ω com radiais horizontais,
 * que é o valor do monopolo sobre plano infinito (Balanis §4.7); com 4 radiais a figura do ARRL dá ≈ 22,5 Ω.
 */
export const ARRL_DROOP_CURVE: readonly (readonly [angleDeg: number, ohms: number])[] = [
  [0, 22.5], [5, 25.8], [10, 29.0], [15, 32.1], [20, 35.1], [25, 38.5], [30, 41.8], [35, 44.8], [40, 47.6],
  [45, 50.4], [50, 53.1], [55, 55.2], [60, 56.7], [65, 57.9], [70, 58.6], [75, 58.8], [80, 58.8],
];

/** Último ângulo da Fig 35 do ARRL (acima dele a curva não existe e o valor fica no do último ponto). */
export const ARRL_DROOP_MAX_DEG = 80;

/**
 * Impedância de entrada estimada (Ω) em função da inclinação dos radiais: interpolação linear da curva do ARRL
 * (`ARRL_DROOP_CURVE`), parte reativa desprezada (antena ressonante). Acima de 80° usa o valor de 80° (a calc avisa).
 * Vale para 4 radiais longe do solo; o real depende de altura, diâmetro, número de radiais e arredores. Meça.
 */
export function estimateImpedance(droopAngleDeg: number): number {
  const curve = ARRL_DROOP_CURVE;
  const a = Math.min(Math.max(droopAngleDeg, 0), ARRL_DROOP_MAX_DEG);
  for (let i = 1; i < curve.length; i++) {
    const [a1, z1] = curve[i]!;
    if (a <= a1) {
      const [a0, z0] = curve[i - 1]!;
      return z0 + ((z1 - z0) * (a - a0)) / (a1 - a0);
    }
  }
  return curve[curve.length - 1]![1];
}

/** Impedância do cabo de alimentação usada como referência da ROE (rádio de 50 Ω). */
const FEED_OHMS = 50;

export const defaultParams: GroundPlaneParams = {
  frequencyMHz: 145,
  radialCount: 4,
  droopAngleDeg: 45,
  conductorDiameter: 0.002,
};

export function calc(params: GroundPlaneParams): CalcResult {
  const {
    frequencyMHz: f,
    radialCount: n,
    droopAngleDeg: angle,
    conductorDiameter: d,
  } = params;
  assertFrequencyMHz(f);
  assertPositive(d, 'O diâmetro do condutor');
  if (!Number.isInteger(n) || n < 2) {
    throw new RangeError(`O número de radiais deve ser um inteiro ≥ 2 (recebido: ${n}).`);
  }
  if (!Number.isFinite(angle) || angle < 0 || angle >= 90) {
    throw new RangeError(`A inclinação dos radiais deve estar em [0°, 90°) (recebido: ${angle}).`);
  }

  const lambda = wavelength(f);
  const sf = shorteningFactorFor(d, f);
  const radiator = physicalLength(0.25, f, sf.k);
  const radial = physicalLength(0.25, f, sf.k);
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

  // Banda INDICATIVA: impedância do dipolo ressonante do mesmo condutor, escalada para a resistência estimada acima. Mantém o Q
  // do dipolo, o que só é exato para o monopolo sobre plano infinito (meio dipolo pela teoria das imagens, Balanis §4.7).
  // Com 4 radiais o Q real é outro: TODO(fonte).
  const z = estimateImpedance(angle);
  const band = dipoleBandModel(f, d);
  const ratio = z / band.impedanceAt(f).re;
  const sweep = swrSweep({
    centerMHz: f,
    ...DIPOLE_SWEEP,
    impedanceAt: (fi) => scale(band.impedanceAt(fi), ratio),
    referenceOhms: FEED_OHMS,
  });
  const bandwidth = swrBandwidthEstimate(sweep, {
    reference: 'em 50 Ω',
    spanPercent: DIPOLE_SWEEP.span * 100,
    note: `Indicativa: banda do dipolo do mesmo fio, escalada para os ${formatNumber(z, 0)} Ω estimados. Meça.`,
    source: `${BAND_SOURCE}; teoria das imagens (Balanis, §4.7)`,
  });

  const warnings: CalcWarning[] = [
    {
      level: 'warning',
      message:
        'A impedância depende da inclinação e do número de radiais. Com 4 radiais horizontais ela fica perto de ' +
        '22 Ω (ROE ≈ 2,2:1 em 50 Ω); inclinando-os para baixo ela sobe e chega a 50 Ω a ≈ 45° (curva do ARRL ' +
        'Antenna Book para 4 radiais longe do solo). Ajuste a inclinação medindo a ROE.',
    },
    { level: 'warning', message: K_FIELD_NOTE },
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
  if (angle > ARRL_DROOP_MAX_DEG) {
    warnings.unshift({
      level: 'warning',
      message: `A curva do ARRL vai só até ${ARRL_DROOP_MAX_DEG}°: a impedância mostrada é a de ${ARRL_DROOP_MAX_DEG}°.`,
    });
  }
  const clampWarning = kWarning(sf);
  if (clampWarning) warnings.unshift(clampWarning);
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.unshift(outOfRange);

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      kAssumption(sf, 'do radiador e dos radiais'),
      {
        name: 'K do radiador',
        value: 'O do dipolo do mesmo condutor (monopolo sobre plano ideal = meio dipolo, Balanis §4.7); radiais com o mesmo K',
      },
      { name: 'Número de radiais', value: String(n) },
      { name: 'Inclinação dos radiais', value: `${formatNumber(angle, 0)}°` },
      { name: 'Diâmetro do condutor', value: `${formatNumber(d * 1000, 2)} mm` },
      { name: 'Instalação', value: 'Antena elevada, longe do solo e de estruturas metálicas' },
    ],
    expected: {
      impedance: {
        typical: z,
        unit: 'Ω',
        note:
          'Curva do ARRL para 4 radiais a mais de 0,3λ do solo: ≈ 22,5 Ω a 0°, 50 Ω a 45°, ≈ 59 Ω a 80°. ' +
          'O Rothammel dá ≈ 36 Ω a 0° (valor do plano infinito). Altura, diâmetro e arredores mudam o valor. Meça.',
        source: 'ARRL Antenna Book, 21ª ed., p. 6-19, Fig 35; Rothammel, "Antene" (9ª ed. alemã), §19.4.1',
      },
      gain: {
        max: 5.15,
        unit: 'dBi',
        note:
          'Limite teórico sobre plano infinito e perfeito (dobro da diretividade do dipolo). Com ' +
          'radiais elevados o ganho real é menor; não há valor típico com fonte confiável aqui.',
        source: 'Balanis, Antenna Theory, 4ª ed., §4.7',
      },
      bandwidth,
    },
    warnings,
  };
}
