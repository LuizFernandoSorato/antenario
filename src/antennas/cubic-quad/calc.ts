/**
 * Quadra cúbica (cubical quad) com refletor, espira excitada e diretores.
 *
 * Perímetros das espiras: as fórmulas empíricas clássicas, com f em MHz e o comprimento em pés:
 *   refletor 1030/f, excitado 1005/f, diretor 975/f
 * (tabela de Carl O. Jelinek, N6VNG, https://www.qsl.net/ta1dx/amator/cubical_quad_antenna_design.htm,
 * consultada em 2026-10-16; a página não cita outra referência). Convertidas para metros com 1 ft = 0,3048 m. O perímetro do excitado dá ≈ 1,022λ (uma onda e um
 * pouco, por causa do efeito do fio), o refletor é ≈ 2,5 % maior e o diretor ≈ 3 % menor que ele.
 * São valores para fio fino, de uso comum; o diâmetro do fio e o ambiente deslocam a ressonância,
 * por isso o excitado precisa de ajuste. TODO(fonte): ARRL Antenna Book (capítulo de quads) para
 * confirmar as razões e a dependência do diâmetro do fio.
 */

import { assertFrequencyMHz, formatNumber, metersToInches } from '../../core/units';
import { wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';

export interface CubicQuadParams {
  frequencyMHz: number;
  /** Número de diretores (inteiro ≥ 0). */
  directorCount: number;
  /** Espaçamento entre elementos, em λ. */
  spacingLambda: number;
}

export const defaultParams: CubicQuadParams = {
  frequencyMHz: 145,
  directorCount: 1,
  spacingLambda: 0.2,
};

const FT_IN_METERS = 0.3048;
/** Coeficientes (pés·MHz): perímetro = coeficiente / f(MHz). Fonte: ver o cabeçalho do arquivo. */
export const REFLECTOR_FT_MHZ = 1030;
export const DRIVEN_FT_MHZ = 1005;
export const DIRECTOR_FT_MHZ = 975;

/** Perímetro da espira (m) para o coeficiente em pés·MHz. */
export function loopPerimeter(coefficientFtMHz: number, fMHz: number): number {
  assertFrequencyMHz(fMHz);
  return (coefficientFtMHz * FT_IN_METERS) / fMHz;
}

/** Estimativa aditiva de ganho (dBd), fonte secundária (Electronics Notes): ver `expected.gain`. */
export function estimatedGainDbd(directorCount: number): number {
  // Excitado ≈ 2 dB sobre o dipolo; refletor ≈ +5 dB; 1º diretor ≈ +2 dB; demais ≈ +1 dB cada.
  return 2 + 5 + (directorCount >= 1 ? 2 : 0) + Math.max(0, directorCount - 1);
}

export function calc(params: CubicQuadParams): CalcResult {
  const { frequencyMHz: f, directorCount: nDir, spacingLambda: s } = params;
  assertFrequencyMHz(f);
  if (!Number.isInteger(nDir) || nDir < 0) {
    throw new RangeError(`O número de diretores deve ser um inteiro ≥ 0 (recebido: ${nDir}).`);
  }
  if (!Number.isFinite(s) || s <= 0) {
    throw new RangeError(`O espaçamento deve ser positivo (recebido: ${s}).`);
  }

  const lambda = wavelength(f);
  const reflector = loopPerimeter(REFLECTOR_FT_MHZ, f);
  const driven = loopPerimeter(DRIVEN_FT_MHZ, f);
  const director = loopPerimeter(DIRECTOR_FT_MHZ, f);
  const spacing = s * lambda;
  const elements = 2 + nDir;
  const boom = (elements - 1) * spacing;
  const spreader = (reflector / 4) * Math.SQRT2; // diagonal da maior espira

  const measurements: Measurement[] = [
    { label: 'A', name: 'Lado da espira do refletor', meters: reflector / 4, description: 'Cada um dos 4 lados (perímetro ÷ 4).' },
    { label: 'B', name: 'Lado da espira excitada', meters: driven / 4, description: 'Cada um dos 4 lados.' },
    ...(nDir > 0
      ? [{ label: 'C', name: 'Lado da espira do diretor', meters: director / 4, description: 'Cada um dos 4 lados; todos os diretores são iguais.' }]
      : []),
    { label: 'D', name: 'Espaçamento entre elementos', meters: spacing, description: 'Entre espiras consecutivas, medido no boom.' },
    { label: 'E', name: 'Vareta (spreader)', meters: spreader, description: 'Diagonal da espira do refletor; duas por espira, cruzadas. Pode usar a mesma para todas.' },
    { label: 'F', name: 'Comprimento do boom (entre espiras)', meters: boom, description: 'Do refletor ao último elemento, entre centros; some folga nas pontas.' },
    { label: 'G', name: 'Fio do refletor', meters: reflector, description: 'Perímetro total, sem emendas.' },
    { label: 'H', name: 'Fio da espira excitada', meters: driven, description: 'Perímetro total, sem emendas.' },
    ...(nDir > 0
      ? [{ label: 'I', name: 'Fio de cada diretor', meters: director, description: 'Perímetro total, sem emendas.' }]
      : []),
  ];

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (s < 0.15 || s > 0.25) {
    warnings.push({
      level: 'warning',
      message:
        `Espaçamento de ${formatNumber(s, 2)}λ fora de 0,15λ a 0,25λ. Abaixo de ≈ 0,15λ a impedância cai e precisa de casamento; ` +
        'as fórmulas de perímetro não foram verificadas nessa faixa.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'Os perímetros são fórmulas empíricas para fio fino. Corte o fio da espira excitada comprido (uma sobra) e ajuste ' +
        'medindo a ROE. Isso vale mais que a precisão da fórmula.',
    },
    {
      level: 'warning',
      message:
        'O ganho mostrado é uma soma aproximada, de fonte secundária, com incerteza de vários dB. ' +
        'TODO(fonte): ARRL Antenna Book, com o ganho de quads de 2, 3 e 4 elementos.',
    },
    {
      level: 'info',
      message:
        'Polarização: alimente no meio do lado de baixo para horizontal, ou no meio de um dos lados verticais para vertical. ' +
        'Use balun/choke de corrente no coaxial.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: os cantos das espiras têm tensão alta de RF e o ganho concentra a potência na frente (EIRP = potência × ' +
        'ganho). Mantenha pessoas e rede elétrica longe. A calculadora de distância de segurança entra em uma fase futura.',
    },
  );

  const gainDbd = estimatedGainDbd(nDir);
  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Perímetro do excitado', value: `${formatNumber(driven / lambda, 4)}λ`, source: 'N6VNG: 1005/f (ft, MHz)' },
      { name: 'Perímetro do refletor', value: `${formatNumber(reflector / lambda, 4)}λ (+${formatNumber((reflector / driven - 1) * 100, 1)} %)`, source: 'N6VNG: 1030/f (ft, MHz)' },
      { name: 'Perímetro do diretor', value: `${formatNumber(director / lambda, 4)}λ (${formatNumber((director / driven - 1) * 100, 1)} %)`, source: 'N6VNG: 975/f (ft, MHz)' },
      { name: 'Elementos', value: `${elements}: refletor, excitado e ${nDir} diretor${nDir === 1 ? '' : 'es'}` },
      { name: 'Espaçamento', value: `${formatNumber(s, 3)}λ (${formatNumber(metersToInches(spacing), 1)} pol)`, source: 'Electronics Notes: 0,15λ a 0,2λ → ≈ 50 Ω' },
      { name: 'Fio', value: 'Fio fino de cobre, sem influência de diâmetro modelada', source: 'TODO(fonte)' },
    ],
    expected: {
      impedance: {
        ...(s <= 0.2 ? { typical: 50 } : {}),
        unit: 'Ω',
        note:
          'Cerca de 50 Ω para espaçamento de 0,15λ a 0,2λ em quad de 2 elementos; sobe para ≈ 75 Ω com pouco mais de 0,25λ. ' +
          'Meça.',
        source: 'Electronics Notes, "Cubical Quad Beam Antenna: Reflector & Director" (fonte secundária). TODO(fonte): ARRL Antenna Book.',
      },
      gain: {
        typical: gainDbd + 2.15,
        unit: 'dBi',
        note:
          `Soma aproximada: ${formatNumber(gainDbd, 0)} dB sobre o dipolo (+ 2,15 dB para dBi). A espira sozinha dá ≈ 2 dB, o refletor ≈ 5, ` +
          'o 1º diretor ≈ 2 e cada diretor a mais ≈ 1. Estimativa com incerteza de vários dB.',
        source: 'Electronics Notes (fonte secundária). TODO(fonte): ARRL Antenna Book.',
      },
      bandwidth: null,
    },
    warnings,
  };
}
