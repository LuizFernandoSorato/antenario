/**
 * Cálculos de linha coaxial a partir dos dados de datasheet (src/data/coax-cables.ts).
 *
 * - Perda casada: atenuação do datasheet (interpolada) × comprimento.
 * - Perda total com ROE: uma onda refletida também perde energia no caminho de
 *   volta, então a perda real é maior que a casada:
 *
 *     TL = 10·log10[ (a² − |Γ|²) / (a·(1 − |Γ|²)) ],   a = 10^(ML/10)
 *
 *   onde ML é a perda casada (dB) e Γ o coeficiente de reflexão na carga.
 *   Fonte: ARRL Antenna Book, capítulo sobre linhas de transmissão ("total line loss").
 * - ROE na entrada: a reflexão percorre o cabo duas vezes, |Γ_in| = |Γ_L|·10^(−ML/10).
 *   Por isso um cabo com muita perda "esconde" a ROE ruim da antena.
 *
 * Premissas: Z0 real; a ROE na carga é medida em relação à impedância nominal do cabo.
 */

import { INCH_IN_METERS, assertPositive } from '../core/units';
import { gammaFromSwr, swrFromGamma } from '../core/reflection';
import { wavelength } from '../core/wave';
import type { CoaxCable } from '../data/coax-cables';
import { interpolateLogLog, tableRange } from './interpolate';

/** Pé internacional em metros (12 polegadas), valor exato. */
export const FOOT_IN_METERS = 12 * INCH_IN_METERS;

/** Atenuação casada em dB/100 m na frequência dada, ou `null` se fora da tabela. */
export function attenuationDbPer100m(cable: CoaxCable, fMHz: number): number | null {
  const per100ft = interpolateLogLog(cable.attenuationDbPer100ft, fMHz);
  // dB/100 pés → dB/100 m: 100 m = 100/0,3048 pés.
  return per100ft === null ? null : per100ft / FOOT_IN_METERS;
}

/** Perda casada (VSWR 1:1) em dB para um comprimento de cabo, ou `null` se fora da tabela. */
export function matchedLossDb(cable: CoaxCable, fMHz: number, lengthM: number): number | null {
  if (!Number.isFinite(lengthM) || lengthM < 0) {
    throw new RangeError(`O comprimento do cabo deve ser ≥ 0 (recebido: ${lengthM}).`);
  }
  const att = attenuationDbPer100m(cable, fMHz);
  return att === null ? null : (att * lengthM) / 100;
}

/** Potência média máxima do datasheet (W, VSWR 1:1), ou `null` se não houver dado. */
export function maxPowerW(cable: CoaxCable, fMHz: number): number | null {
  return cable.maxPowerW ? interpolateLogLog(cable.maxPowerW, fMHz) : null;
}

function assertLoss(lossDb: number): void {
  if (!Number.isFinite(lossDb) || lossDb < 0) {
    throw new RangeError(`A perda casada deve ser ≥ 0 dB (recebido: ${lossDb}).`);
  }
}

/** Perda total (dB) de uma linha com perda casada `lossDb` e ROE `swrAtLoad` na carga. */
export function totalLossDb(lossDb: number, swrAtLoad: number): number {
  assertLoss(lossDb);
  const g = gammaFromSwr(swrAtLoad);
  if (g === 1) return Number.POSITIVE_INFINITY;
  const a = 10 ** (lossDb / 10);
  return 10 * Math.log10((a * a - g * g) / (a * (1 - g * g)));
}

/** ROE vista na entrada do cabo (no rádio). */
export function inputSwr(lossDb: number, swrAtLoad: number): number {
  assertLoss(lossDb);
  return swrFromGamma(gammaFromSwr(swrAtLoad) * 10 ** (-lossDb / 10));
}

/**
 * Tensão de pico (V) numa linha com potência média P e ROE dada:
 * V_max = √(2·P·Z0·ROE), onde P é a potência líquida entregue naquele ponto.
 * Fonte: consequência direta de V_max = |V⁺|(1 + |Γ|) e P = |V⁺|²(1 − |Γ|²)/(2·Z0)
 * (Pozar, Microwave Engineering, 4ª ed., §2.3).
 */
export function peakVoltage(powerW: number, z0: number, swr: number): number {
  if (!Number.isFinite(powerW) || powerW < 0) {
    throw new RangeError(`A potência deve ser ≥ 0 W (recebido: ${powerW}).`);
  }
  assertPositive(z0, 'A impedância característica Z0 (Ω)');
  gammaFromSwr(swr); // valida
  return Math.sqrt(2 * powerW * z0 * swr);
}

export interface FeedlineInput {
  cable: CoaxCable;
  fMHz: number;
  lengthM: number;
  /** ROE na antena (carga), em relação à impedância nominal do cabo. */
  swrAtLoad: number;
  /** Potência entregue pelo transmissor na entrada do cabo (W). 0 = só recepção. */
  powerW: number;
}

export interface FeedlineWarning {
  level: 'info' | 'warning' | 'danger';
  message: string;
}

export interface FeedlineAnalysis {
  attenuationDbPer100m: number | null;
  matchedLossDb: number | null;
  totalLossDb: number | null;
  /** Perda adicional causada pela ROE (dB). */
  swrLossDb: number | null;
  inputSwr: number | null;
  /** Potência que chega à antena (W). */
  powerAtLoadW: number | null;
  /** Fração da potência perdida no cabo. */
  lossFraction: number | null;
  /** Potência máxima do datasheet nessa frequência (W, VSWR 1:1). */
  ratedPowerW: number | null;
  /** Tensão de pico máxima estimada ao longo do cabo (V), limite superior conservador. */
  peakVoltageV: number | null;
  /** Comprimento elétrico do cabo, em comprimentos de onda dentro do cabo. */
  electricalLengthWavelengths: number;
  warnings: FeedlineWarning[];
}

export function analyzeFeedline(input: FeedlineInput): FeedlineAnalysis {
  const { cable, fMHz, lengthM, swrAtLoad, powerW } = input;
  assertPositive(fMHz, 'A frequência (MHz)');
  if (!Number.isFinite(powerW) || powerW < 0) {
    throw new RangeError(`A potência deve ser ≥ 0 W (recebido: ${powerW}).`);
  }
  const gL = gammaFromSwr(swrAtLoad);
  const warnings: FeedlineWarning[] = [];

  const lambdaInCable = wavelength(fMHz) * cable.velocityFactor;
  const electricalLengthWavelengths = lengthM / lambdaInCable;

  const att = attenuationDbPer100m(cable, fMHz);
  const ml = matchedLossDb(cable, fMHz, lengthM);
  if (ml === null || att === null) {
    const range = tableRange(cable.attenuationDbPer100ft)!;
    warnings.push({
      level: 'warning',
      message:
        `${fMHz} MHz está fora da tabela de atenuação do fabricante para este cabo ` +
        `(${range.min}–${range.max} MHz). Sem dado, a perda não é calculada (não extrapolamos).`,
    });
    return {
      attenuationDbPer100m: null,
      matchedLossDb: null,
      totalLossDb: null,
      swrLossDb: null,
      inputSwr: null,
      powerAtLoadW: null,
      lossFraction: null,
      ratedPowerW: maxPowerW(cable, fMHz),
      peakVoltageV: null,
      electricalLengthWavelengths,
      warnings,
    };
  }

  const tl = totalLossDb(ml, swrAtLoad);
  const swrIn = inputSwr(ml, swrAtLoad);
  const lossFraction = 1 - 10 ** (-tl / 10);
  const powerAtLoadW = powerW * (1 - lossFraction);

  // Tensão de pico: limite superior conservador. A onda direta é máxima na entrada
  // (P_direta = P_in / (1 − |Γ_in|²)) e o |Γ| é máximo na carga; combinar os dois
  // superestima um pouco, o que é o lado seguro para escolher o cabo.
  const gIn = gammaFromSwr(swrIn);
  const forwardPowerIn = gIn < 1 ? powerW / (1 - gIn * gIn) : Number.POSITIVE_INFINITY;
  const peakVoltageV = Math.sqrt(2 * forwardPowerIn * cable.impedanceOhms) * (1 + gL);

  const ratedPowerW = maxPowerW(cable, fMHz);

  if (swrAtLoad > 1 && tl - ml > 0) {
    warnings.push({
      level: 'info',
      message:
        `A ROE de ${swrAtLoad.toFixed(2)}:1 na antena aparece no rádio como ${swrIn.toFixed(2)}:1: ` +
        'a perda do cabo "esconde" parte da reflexão. Meça a ROE na antena sempre que possível.',
    });
  }

  if (powerW > 0) {
    if (cable.maxPowerW === null) {
      warnings.push({
        level: 'danger',
        message:
          'O datasheet deste cabo não informa potência máxima. Não use para transmissão sem ' +
          // TODO(fonte): fonte pendente para o texto abaixo.
          'consultar o fabricante.',
      });
    } else if (ratedPowerW === null) {
      warnings.push({
        level: 'warning',
        message: 'Frequência fora da tabela de potência do fabricante: limite de potência desconhecido.',
      });
    } else {
      if (powerW > ratedPowerW) {
        warnings.push({
          level: 'danger',
          message:
            `${powerW} W excede a potência máxima do datasheet nessa frequência ` +
            `(≈ ${Math.round(ratedPowerW)} W com ROE 1:1). Use um cabo mais grosso.`,
        });
      }
      if (swrAtLoad > 1) {
        warnings.push({
          level: 'warning',
          message:
            'O limite de potência do datasheet vale para ROE 1:1. Com ROE maior aparecem pontos de ' +
            'corrente e tensão mais altos ao longo do cabo, que aquecem mais. O fabricante não ' +
            // TODO(fonte): fonte pendente para o texto abaixo.
            'publica fator de redução. Deixe margem.',
        });
      }
    }

    if (cable.voltageRating) {
      const { volts, kind } = cable.voltageRating;
      const isBuildingCode = /UL/.test(kind);
      if (peakVoltageV > volts) {
        warnings.push({
          level: isBuildingCode ? 'warning' : 'danger',
          message:
            `A tensão de pico estimada (≈ ${Math.round(peakVoltageV)} V) passa da especificação ` +
            `de ${volts} V (${kind}).` +
            (isBuildingCode
              ? ' Essa especificação é de instalação predial, não de RF, mas indica que o cabo não foi feito para tensões altas.'
              : ''),
        });
      }
    }
  }

  if (cable.impedanceOhms === 75) {
    warnings.push({
      level: 'info',
      message:
        'Cabo de 75 Ω. Ligado a rádio ou antena de 50 Ω, só o descasamento já causa ROE de 1,5:1. ' +
        'Para recepção isso costuma ser irrelevante.',
    });
  }

  return {
    attenuationDbPer100m: att,
    matchedLossDb: ml,
    totalLossDb: tl,
    swrLossDb: tl - ml,
    inputSwr: swrIn,
    powerAtLoadW,
    lossFraction,
    ratedPowerW,
    peakVoltageV: powerW > 0 ? peakVoltageV : null,
    electricalLengthWavelengths,
    warnings,
  };
}
