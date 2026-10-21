/**
 * Dipolo de meia onda alimentado no centro.
 *
 * Comprimento total: L = K · λ/2. O fator K corrige a espessura finita do
 * condutor e o efeito de ponta (ver `core/wave.ts`). Por padrão, K vem do diâmetro
 * pelo método dos momentos (`core/dipole-resonance.ts`); o modo manual usa o K digitado.
 */

import { DIPOLE_K_MAX_DIAMETER_LAMBDA, DIPOLE_K_MIN_DIAMETER_LAMBDA, dipoleShorteningFactor } from '../../core/dipole-resonance';
import { assertFrequencyMHz, assertPositive, formatEngineering, formatNumber } from '../../core/units';
import { assertFactor, physicalLength, wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, rangeWarning } from '../types';
import { K_FROM_DIAMETER, K_MANUAL } from './k-mode';
import { meta } from './meta';

export { K_FROM_DIAMETER, K_MANUAL };

export interface DipoleParams {
  frequencyMHz: number;
  /** K_FROM_DIAMETER ou K_MANUAL. */
  kMode: number;
  /** Fator de encurtamento K, em (0, 1]. Só vale no modo manual (ou fora da faixa do modelo). */
  shorteningFactor: number;
  /** Diâmetro do condutor, em metros. */
  conductorDiameter: number;
  /** Espaço entre os braços no centro (isolador), em metros. */
  centerGap: number;
}

export const defaultParams: DipoleParams = {
  frequencyMHz: 145,
  kMode: K_FROM_DIAMETER,
  shorteningFactor: 0.95,
  conductorDiameter: 0.002,
  centerGap: 0,
};

export function calc(params: DipoleParams): CalcResult {
  const { frequencyMHz: f, kMode, shorteningFactor: manualK, conductorDiameter: d, centerGap: gap } = params;
  assertFrequencyMHz(f);
  assertFactor(manualK, 'O fator de encurtamento K');
  assertPositive(d, 'O diâmetro do condutor');
  if (kMode !== K_FROM_DIAMETER && kMode !== K_MANUAL) {
    throw new RangeError(`Modo do fator K inválido (recebido: ${kMode}).`);
  }
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError(`O espaço central deve ser ≥ 0 (recebido: ${gap}).`);
  }

  const lambda = wavelength(f);
  const diameterLambda = d / lambda;
  const modelValid = diameterLambda >= DIPOLE_K_MIN_DIAMETER_LAMBDA && diameterLambda <= DIPOLE_K_MAX_DIAMETER_LAMBDA;
  const modelK = modelValid ? dipoleShorteningFactor(diameterLambda) : null;
  const auto = kMode === K_FROM_DIAMETER && modelK !== null;
  const k = auto ? modelK : manualK;
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

  const range = `${formatEngineering(DIPOLE_K_MIN_DIAMETER_LAMBDA, 'λ')} a ${formatEngineering(DIPOLE_K_MAX_DIAMETER_LAMBDA, 'λ')}`;
  const kWarning: CalcWarning =
    modelK === null
      ? {
          level: 'warning',
          message:
            `O condutor tem ${formatEngineering(diameterLambda, 'λ')} de diâmetro, fora da faixa do modelo de K (${range}): ` +
            `usando o K digitado (${formatNumber(manualK, 3)}).`,
        }
      : auto
        ? {
            level: 'info',
            message:
              `K = ${formatNumber(modelK, 4)} calculado pelo diâmetro (dipolo reto no espaço livre). Fio com isolamento plástico, ` +
              'solo próximo e isoladores nas pontas deixam a antena real um pouco mais curta: corte comprido e ajuste.',
          }
        : {
            level: 'info',
            message:
              `K informado manualmente. Pelo diâmetro do condutor, o modelo daria K = ${formatNumber(modelK, 4)} ` +
              `(A = ${formatNumber(physicalLength(0.5, f, modelK), 3)} m).`,
          };

  const warnings: CalcWarning[] = [
    kWarning,
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
      auto
        ? {
            name: 'Fator de encurtamento (K)',
            value: `${formatNumber(k, 4)}, pelo diâmetro`,
            source:
              'Método dos momentos desta ferramenta (core/dipole-resonance.ts), conferido com o NEC-4 de L. B. Cebik, W4RNL, ' +
              '"80-Meter Dipoles and Inverted-Vs" (0,15 %)',
          }
        : { name: 'Fator de encurtamento (K)', value: `${formatNumber(k, 3)}, digitado` },
      { name: 'Diâmetro do condutor', value: `${formatNumber(d * 1000, 2)} mm = ${formatEngineering(diameterLambda, 'λ')}` },
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
