/**
 * Dipolo de meia onda alimentado no centro.
 *
 * Comprimento total: L = K · λ/2. O fator K corrige a espessura finita do
 * condutor e o efeito de ponta (ver `core/wave.ts`). K vem do diâmetro, pelo método
 * dos momentos (`antennas/k-factor.ts`).
 */

import { swrSweep } from '../../core/swr-band';
import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { physicalLength, wavelength } from '../../core/wave';
import { swrBandwidthEstimate } from '../bandwidth';
import { K_FIELD_NOTE, kAssumption, kWarning, shorteningFactorFor } from '../k-factor';
import { type CalcResult, type CalcWarning, rangeWarning } from '../types';
import { DIPOLE_SWEEP, dipoleBandModel } from './band-model';
import { meta } from './meta';

/** Impedância do cabo de alimentação usada como referência da ROE (rádio de 50 Ω). */
const FEED_OHMS = 50;

export const BAND_SOURCE =
  'Modelo desta ferramenta: método dos momentos no espaço livre (core/mom.ts); conferido com L. B. Cebik, W4RNL, ' +
  '"80-Meter Dipoles and Inverted-Vs" (150 a 200 kHz de banda no 80 m com fio #12)';

export interface DipoleParams {
  frequencyMHz: number;
  /** Diâmetro do condutor, em metros (define o K). */
  conductorDiameter: number;
  /** Espaço entre os braços no centro (isolador), em metros. */
  centerGap: number;
}

export const defaultParams: DipoleParams = {
  frequencyMHz: 145,
  conductorDiameter: 0.002,
  centerGap: 0.01,
};

export function calc(params: DipoleParams): CalcResult {
  const { frequencyMHz: f, conductorDiameter: d, centerGap: gap } = params;
  assertFrequencyMHz(f);
  assertPositive(d, 'O diâmetro do condutor');
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError(`O espaço central deve ser ≥ 0 (recebido: ${gap}).`);
  }

  const lambda = wavelength(f);
  const sf = shorteningFactorFor(d, f);
  const k = sf.k;
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

  const band = dipoleBandModel(f, d);
  const sweep = swrSweep({ centerMHz: f, ...DIPOLE_SWEEP, impedanceAt: band.impedanceAt, referenceOhms: FEED_OHMS });
  const bandwidth = swrBandwidthEstimate(sweep, {
    reference: 'em 50 Ω',
    spanPercent: DIPOLE_SWEEP.span * 100,
    note:
      `Dipolo já ajustado para ressoar na frequência de projeto (R ≈ ${formatNumber(band.impedanceAt(f).re, 0)} Ω no modelo), no ` +
      'espaço livre, condutor perfeito, sem balun. Condutor mais grosso dá banda maior. Perto do chão a resistência muda e a banda também.' +
      (band.clamped ? ' O diâmetro passou do limite do modelo: a banda foi calculada no limite (a real é um pouco maior).' : ''),
    source: BAND_SOURCE,
  });

  const warnings: CalcWarning[] = [
    { level: 'info', message: K_FIELD_NOTE },
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
  const clampWarning = kWarning(sf);
  if (clampWarning) warnings.unshift(clampWarning);
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.unshift(outOfRange);

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      kAssumption(sf),
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
      bandwidth,
    },
    warnings,
  };
}
