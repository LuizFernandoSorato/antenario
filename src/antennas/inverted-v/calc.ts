/**
 * V invertido: dipolo de meia onda com o centro no alto de um mastro e os braços descendo em linha reta até as pontas.
 *
 * Comprimento total: A = K·λ/2 × alongamento. K é o do dipolo reto do mesmo fio (`k-factor.ts`); o alongamento é a razão entre o
 * comprimento ressonante do V e o do dipolo reto do mesmo fio, no espaço livre, pelo método dos momentos (`v-model.ts`).
 * Validação: L. B. Cebik, W4RNL, "80-Meter Dipoles and Inverted-Vs: A Graphical Scrapbook" (NEC-4): 0,8 % mais comprido com
 * 120° entre os braços e 1,9 % com 90° (teste de `v-model.ts`). Impedância, ganho e banda vêm do mesmo modelo.
 */

import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { physicalLength, wavelength } from '../../core/wave';
import { K_FIELD_NOTE, kAssumption, kWarning, shorteningFactorFor } from '../k-factor';
import { type CalcResult, type CalcWarning, type Estimate, type Measurement, rangeWarning } from '../types';
import { type InvertedVModel, type VBand, bandWidthMHz, invertedVModel } from './v-model';
import { meta } from './meta';

export interface InvertedVParams {
  frequencyMHz: number;
  /** Ângulo entre os braços, em graus (180 = dipolo reto). */
  apexAngleDeg: number;
  /** Diâmetro do fio, em metros. */
  conductorDiameter: number;
  /** Espaço entre os braços no centro (isolador), em metros. */
  centerGap: number;
  /** Altura do ápice acima do chão, em metros. */
  apexHeight: number;
}

export const defaultParams: InvertedVParams = {
  frequencyMHz: 7.1,
  apexAngleDeg: 120,
  conductorDiameter: 0.002,
  centerGap: 0.01,
  apexHeight: 10,
};

/** Faixa do ângulo aceita pela ferramenta; abaixo de 60° os braços quase se encostam e o modelo deixa de ser útil. */
const MIN_APEX_DEG = 60;
/** Menor ângulo conferido com o Cebik (90°, "V de 45°"). */
const MIN_CHECKED_APEX_DEG = 90;
/** Impedância do cabo de alimentação usada como referência da ROE (rádio de 50 Ω). */
const FEED_OHMS = 50;

export function modelFor(params: InvertedVParams): InvertedVModel {
  return invertedVModel({
    frequencyMHz: params.frequencyMHz,
    apexAngleDeg: params.apexAngleDeg,
    radiusM: params.conductorDiameter / 2,
    referenceOhms: FEED_OHMS,
  });
}

function bandText(band: VBand | null, unit: 'kHz' | 'MHz'): string {
  if (!band) return 'não chega lá';
  const k = unit === 'kHz' ? 1000 : 1;
  const d = unit === 'kHz' ? 0 : 2;
  const open = band.open ? ' (ou mais: passou da varredura de ±15 %)' : '';
  return `${formatNumber(bandWidthMHz(band) * k, d)} ${unit}, de ${formatNumber(band.lowMHz, 3)} a ${formatNumber(band.highMHz, 3)} MHz${open}`;
}

export function calc(params: InvertedVParams): CalcResult {
  const { frequencyMHz: f, apexAngleDeg: apex, conductorDiameter: d, centerGap: gap, apexHeight: h } = params;
  assertFrequencyMHz(f);
  assertPositive(d, 'O diâmetro do fio');
  if (!Number.isFinite(apex) || apex < MIN_APEX_DEG || apex > 180) {
    throw new RangeError(`O ângulo entre os braços deve estar entre ${MIN_APEX_DEG}° e 180° (recebido: ${apex}).`);
  }
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError(`O espaço central deve ser ≥ 0 (recebido: ${gap}).`);
  }
  if (!Number.isFinite(h) || h < 0) {
    throw new RangeError(`A altura do ápice deve ser ≥ 0 (recebida: ${h}).`);
  }

  const lambda = wavelength(f);
  const model = modelFor(params);
  const stretch = model.resonantLengthLambda / model.dipoleLengthLambda;
  const sf = shorteningFactorFor(d, f);
  const dipole = physicalLength(0.5, f, sf.k);
  const total = dipole * stretch;
  if (gap >= total) {
    throw new RangeError('O espaço central é maior que o comprimento total do V.');
  }
  const halfApex = (apex * Math.PI) / 360;
  const arm = (total - gap) / 2;
  const span = total * Math.sin(halfApex);
  const droop = (total / 2) * Math.cos(halfApex);
  const tipHeight = h - droop;
  if (tipHeight <= 0) {
    throw new RangeError(
      `Com o ápice a ${formatNumber(h, 2)} m, as pontas ficariam ${formatNumber(-tipHeight, 2)} m abaixo do chão ` +
        `(cada braço desce ${formatNumber(droop, 2)} m). Suba o ápice ou abra o ângulo entre os braços.`,
    );
  }

  const measurements: Measurement[] = [
    { label: 'A', name: 'Comprimento total', meters: total, description: 'De ponta a ponta pelo fio, incluindo o espaço central.' },
    { label: 'B', name: 'Cada braço', meters: arm, description: 'Do terminal de alimentação até a ponta. São dois braços iguais.' },
  ];
  if (gap > 0) {
    measurements.push({ label: 'C', name: 'Espaço central', meters: gap, description: 'Entre os dois braços, no isolador do ápice.' });
  }
  measurements.push(
    { label: 'D', name: 'Vão entre as pontas', meters: span, description: 'Distância na horizontal de uma ponta do fio à outra (sem as cordas).' },
    { label: 'E', name: 'Queda de cada braço', meters: droop, description: 'Quanto cada ponta fica abaixo do ápice.' },
    { label: 'F', name: 'Altura das pontas', meters: tipHeight, description: 'Do chão até a ponta de cada braço, com o ápice na altura informada.' },
  );

  const b2 = model.band2;
  const unit: 'kHz' | 'MHz' = b2 && bandWidthMHz(b2) >= 1 ? 'MHz' : 'kHz';
  const dipoleGain = model.dipoleDirectivityDbi;
  const modelSource =
    'Modelo desta ferramenta: método dos momentos no espaço livre (core/mom.ts), conferido com L. B. Cebik, W4RNL, ' +
    '"80-Meter Dipoles and Inverted-Vs" (NEC-4).';

  const bandwidth: Estimate | null = b2
    ? {
        typical: bandWidthMHz(b2) * (unit === 'kHz' ? 1000 : 1),
        unit,
        note:
          `ROE < 2:1 em 50 Ω: ${bandText(b2, unit)}. ROE < 1,5:1: ${bandText(model.band15, unit)}. ` +
          'Antena já ajustada para ressoar na frequência de projeto, no espaço livre. Perto do chão a resistência cai e a banda muda.',
        source: modelSource,
      }
    : null;

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  const clampWarning = kWarning(sf, 'o fio');
  if (clampWarning) warnings.push(clampWarning);
  if (apex < MIN_CHECKED_APEX_DEG) {
    warnings.push({
      level: 'warning',
      message:
        `Com menos de ${MIN_CHECKED_APEX_DEG}° entre os braços, o modelo não foi conferido com nenhuma fonte (o Cebik vai de 90° a 180°). ` +
        'Os braços passam a se acoplar muito: a impedância e o ganho caem depressa.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'O cálculo é no espaço livre. Perto do solo (pontas baixas), a frequência de ressonância e a impedância mudam: nos V, ' +
        'quanto mais perto do chão, menor a impedância (Cebik). Corte os braços com sobra e encurte aos poucos medindo a ROE na altura final.',
    },
    { level: 'info', message: `${K_FIELD_NOTE} O alongamento do V é calculado por cima desse K.` },
    {
      level: 'info',
      message:
        'O V é simétrico e o coaxial não: use um choke (balun de corrente 1:1) no ponto de alimentação e desça o cabo ' +
        'junto ao mastro, longe dos braços.',
    },
    {
      level: 'danger',
      message:
        `Transmissão: as pontas dos braços ficam em tensão alta de RF (pode passar de centenas de volts) e, aqui, a ` +
        `${formatNumber(tipHeight, 2)} m do chão. Mantenha-as fora do alcance de pessoas e animais (suba as pontas ou cerque a área) ` +
        'e use isoladores adequados.',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      kAssumption(sf, 'do dipolo reto'),
      {
        name: 'Alongamento do V',
        value: `${formatNumber((stretch - 1) * 100, 2)} % (A = K·λ/2 × ${formatNumber(stretch, 4)})`,
        source: modelSource,
      },
      { name: 'Ângulo entre os braços', value: `${formatNumber(apex, 0)}°` },
      { name: 'Diâmetro do fio', value: `${formatNumber(d * 1000, 2)} mm` },
      { name: 'Braços', value: 'Retos, do ápice às pontas (fio esticado, sem barriga)' },
      { name: 'Ambiente', value: 'Espaço livre: sem efeito do solo, do mastro nem do cabo' },
    ],
    expected: {
      impedance: {
        typical: model.z.re,
        unit: 'Ω',
        note:
          'Na ressonância, no espaço livre, sem perdas no fio. Fechar o V baixa a resistência (Cebik, com a perda do cobre: ' +
          '73,6 Ω reto, 59,6 Ω com 120° e 43,6 Ω com 90°). Perto do chão ela cai mais.',
        source: modelSource,
      },
      gain: {
        typical: model.directivityDbi,
        unit: 'dBi',
        note:
          `Diretividade no espaço livre, perpendicular ao plano dos braços; ${formatNumber(dipoleGain - model.directivityDbi, 2)} dB ` +
          `abaixo do dipolo reto (${formatNumber(dipoleGain, 2)} dBi). Perdas no fio desprezadas. Sobre o solo, o ganho e o ângulo de ` +
          'saída dependem da altura.',
        source: modelSource,
      },
      bandwidth,
    },
    warnings,
  };
}
