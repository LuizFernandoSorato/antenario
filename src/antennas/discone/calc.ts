/**
 * Discone: disco sobre cone, alimentados no vértice do cone.
 *
 * Método (S. Stearns, K6OIK, "All About the Discone Antenna", QEX, jan/fev 2007, pp. 37-43):
 * - a impedância do monocone de semiângulo θ é Z0 = (η/2π)·ln cot(θ/2), com η = 376,73 Ω (Eq. 2);
 *   daí o semiângulo para uma impedância de projeto: θ = 2·atan(exp(−Z0/60)) (Eq. 4, com η/2π ≈ 60);
 * - regra prática (p. 40): a primeira ressonância fica em 0,7 vez a menor frequência de operação, e o
 *   raio do disco somado ao comprimento (lateral) do cone vale meio comprimento de onda dessa ressonância;
 * - proporção do disco, atribuída a Nail (Eq. 5): R/L = 0,72·sen θ, para um projeto de 50 Ω.
 * O artigo trata o semiângulo θ medido a partir do eixo do cone. Estas regras são empíricas: é
 * um ponto de partida, e a ROE tem "vales e picos" ao longo da banda (ver `warnings`).
 */

import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';

export interface DisconeParams {
  /** Menor frequência de operação, em MHz. */
  frequencyMHz: number;
  /** Impedância de projeto, em ohms. */
  designImpedance: number;
  /** Número de hastes do cone (e do disco), se feitos de hastes. */
  rodCount: number;
  /** Diâmetro das hastes, em metros. */
  rodDiameter: number;
  /** Folga disco–cone, em metros; 0 ou omitido = automática (proporção do exemplo de Stearns). */
  centerGap?: number;
}

export const defaultParams: DisconeParams = {
  frequencyMHz: 100,
  designImpedance: 50,
  rodCount: 8,
  rodDiameter: 0.004,
  centerGap: 0,
};

/** Primeira ressonância = 0,7 × a menor frequência de operação (Stearns, QEX 2007, p. 40). */
export const FIRST_RESONANCE_RATIO = 0.7;
/** Constante R/L = 0,72·sen θ, atribuída a Nail, para 50 Ω (Stearns, QEX 2007, Eq. 5). */
export const NAIL_RATIO = 0.72;
/** Folga entre o disco e o vértice do cone, como fração do comprimento do cone: ver `calc`. */
export const GAP_OVER_SLANT = 11 / 270;

/** Semiângulo do cone (graus) para a impedância de projeto: θ = 2·atan(exp(−Z0/60)) (Stearns, Eq. 4). */
export function coneHalfAngleDeg(z0: number): number {
  return (2 * Math.atan(Math.exp(-z0 / 60)) * 180) / Math.PI;
}

/** Impedância do monocone de semiângulo θ (graus): Z0 = (376,73/2π)·ln cot(θ/2) (Stearns, Eq. 2). */
export function monoconeImpedance(thetaDeg: number): number {
  const theta = (thetaDeg * Math.PI) / 180;
  return (376.73 / (2 * Math.PI)) * Math.log(1 / Math.tan(theta / 2));
}

export function calc(params: DisconeParams): CalcResult {
  const { frequencyMHz: fLow, designImpedance: z0, rodCount, rodDiameter } = params;
  const userGap = params.centerGap ?? 0;
  assertFrequencyMHz(fLow);
  assertPositive(z0, 'A impedância de projeto');
  assertPositive(rodDiameter, 'O diâmetro das hastes');
  if (!Number.isFinite(userGap) || userGap < 0) {
    throw new RangeError(`A folga deve ser ≥ 0 (recebido: ${userGap}).`);
  }
  if (!Number.isInteger(rodCount) || rodCount < 3) {
    throw new RangeError(`O número de hastes deve ser um inteiro ≥ 3 (recebido: ${rodCount}).`);
  }

  const fResonance = FIRST_RESONANCE_RATIO * fLow;
  const lambdaRes = wavelength(fResonance);
  const thetaDeg = coneHalfAngleDeg(z0);
  const theta = (thetaDeg * Math.PI) / 180;
  const ratio = NAIL_RATIO * Math.sin(theta); // R/L
  // R + L = λ_res / 2 e R = ratio · L.
  const slant = lambdaRes / 2 / (1 + ratio);
  const discRadius = ratio * slant;
  const baseDiameter = 2 * slant * Math.sin(theta);
  const height = slant * Math.cos(theta);
  const gap = userGap > 0 ? userGap : GAP_OVER_SLANT * slant;
  if (gap >= discRadius) {
    throw new RangeError('A folga é maior que o raio do disco.');
  }

  const measurements: Measurement[] = [
    { label: 'A', name: 'Lateral do cone (geratriz)', meters: slant, description: 'Do vértice à borda larga do cone, ao longo da superfície.' },
    { label: 'B', name: 'Diâmetro da base do cone', meters: baseDiameter, description: 'A borda larga do cone, embaixo (o disco fica em cima).' },
    { label: 'C', name: 'Altura do cone', meters: height, description: 'Do vértice à base, na vertical.' },
    { label: 'D', name: 'Diâmetro do disco', meters: 2 * discRadius, description: 'Disco plano no vértice do cone, com a ponta para baixo.' },
    { label: 'E', name: 'Raio do disco (cada haste)', meters: discRadius, description: 'Do centro à borda; use para as hastes do disco.' },
    { label: 'F', name: 'Folga disco–cone', meters: gap, description: 'Espaço isolante entre o disco e o vértice do cone.' },
  ];

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, fLow);
  if (outOfRange) warnings.push(outOfRange);
  if (Math.abs(z0 - 50) > 1) {
    warnings.push({
      level: 'warning',
      message:
        'A proporção do disco R/L = 0,72·sen θ é dada pelo artigo para projetos de 50 Ω. Com outra impedância, ' +
        'o artigo sugere varrer proporções num simulador (EZNEC) para achar a menor ROE de pico.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'A ROE de um discone oscila ao longo da banda (vales e picos). Ela só cai bem abaixo do primeiro vale; ' +
        'os valores de ROE dependem do projeto e precisam ser medidos. Projetos largos (5 oitavas) pedem ângulo menor: ' +
        '≈ 39° em vez de ≈ 47° para 50 Ω (Stearns, QEX 2007).',
    },
    {
      level: 'warning',
      message:
        (userGap > 0
          ? `A folga de ${formatNumber(gap * 1000, 1)} mm é a que você informou. `
          : `A folga de ${formatNumber(gap * 1000, 1)} mm segue a proporção do exemplo do artigo (11 mm para um cone de 270 mm). `) +
        'O artigo não dá regra geral para ela, e A e E não a incluem (R + L = λ/2 vale para as hastes). TODO(fonte). Ajuste medindo a ROE.',
    },
    {
      level: 'info',
      message:
        'O coaxial sobe por dentro do cone: a malha liga no vértice do cone e o vivo no centro do disco. ' +
        'Use um choke de corrente logo abaixo do cone.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: o disco e a borda do cone têm tensão alta de RF. Instale fora do alcance de pessoas e longe de ' +
        'rede elétrica. Estime a distância na ferramenta "Exposição a RF".',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Menor frequência de operação', value: `${formatNumber(fLow, 2)} MHz` },
      { name: 'Primeira ressonância', value: `${formatNumber(fResonance, 2)} MHz (0,7 × a menor)`, source: 'Stearns, QEX 2007, p. 40' },
      { name: 'Semiângulo do cone (θ)', value: `${formatNumber(thetaDeg, 1)}° (ângulo total ${formatNumber(2 * thetaDeg, 1)}°)`, source: 'Stearns, Eq. 4: θ = 2·atan(exp(−Z0/60))' },
      { name: 'Raio do disco ÷ lateral do cone (R/L)', value: formatNumber(ratio, 3), source: 'Nail, via Stearns, Eq. 5: 0,72·sen θ' },
      { name: 'Disco + cone', value: `R + L = λ/2 da primeira ressonância = ${formatNumber(lambdaRes / 2, 3)} m`, source: 'Stearns, QEX 2007, p. 40' },
      { name: 'Hastes', value: `${rodCount} no cone e ${rodCount} no disco, de ${formatNumber(rodDiameter * 1000, 1)} mm (ou chapa)` },
    ],
    expected: {
      impedance: {
        typical: z0,
        unit: 'Ω',
        note:
          'Impedância nominal de projeto do cone (Z0). A impedância real varia com a frequência e a ROE tem vales e picos; ' +
          'o artigo mostra, por simulação, um projeto de 50 Ω com ROE mínima de ≈ 1,4 perto de 500 MHz. Meça.',
        source: 'Stearns, QEX 2007, Eqs. 2 e 4 e Fig. 9',
      },
      gain: {
        unit: 'dBi',
        note: 'Omnidirecional no plano horizontal. O ganho varia com a frequência e não há valor típico com fonte aqui. TODO(fonte).',
        source: 'TODO(fonte)',
      },
      bandwidth: {
        min: fLow,
        unit: 'MHz',
        note: 'Funciona a partir da menor frequência de projeto, subindo por várias oitavas (o artigo trata projetos de 1 a 5 oitavas). O limite superior depende da ROE que você aceita; meça.',
        source: 'Stearns, QEX 2007',
      },
    },
    warnings,
  };
}
