/**
 * Antena helicoidal em modo axial (Kraus).
 *
 * Com a circunferência C da hélice próxima de um comprimento de onda e o passo S
 * em torno de λ/4, a hélice irradia um feixe principal na direção do eixo, com
 * polarização aproximadamente circular. As fórmulas abaixo são as empíricas de
 * Kraus & Marhefka, *Antennas for All Applications*, 3ª ed., cap. 7 (helical antennas),
 * válidas para o modo axial: 3/4 < C/λ < 4/3, ângulo de passo de 12° a 14° e N > 3.
 * Elas são aproximações de projeto, não resultados exatos.
 */

import { assertFrequencyMHz, assertPositive, formatNumber, powerRatioToDb } from '../../core/units';
import { wavelength } from '../../core/wave';
import { type AssemblyGuide, type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { RHCP, SENSE_NAME, type Sense, senseOf } from '../circular';
import { meta } from './meta';

export interface HelicalParams {
  frequencyMHz: number;
  /** Número de voltas (N). */
  turns: number;
  /** Circunferência em comprimentos de onda (C/λ). */
  circumferenceRatio: number;
  /** Passo em comprimentos de onda (S/λ). */
  pitchRatio: number;
  /** Diâmetro do condutor, em metros. */
  conductorDiameter: number;
  /** Sentido da polarização circular (RHCP ou LHCP; ver `circular.ts`). */
  circularSense: number;
}

export const defaultParams: HelicalParams = {
  frequencyMHz: 437,
  turns: 8,
  circumferenceRatio: 1,
  pitchRatio: 0.25,
  conductorDiameter: 0.003,
  circularSense: RHCP,
};

/** Limites do modo axial (Kraus & Marhefka, cap. 7): 3/4 < C/λ < 4/3. */
export const AXIAL_MODE_C_MIN = 0.75;
export const AXIAL_MODE_C_MAX = 4 / 3;
/** Ângulo de passo usual do modo axial: 12° a 14° (Kraus & Marhefka, cap. 7). */
export const PITCH_ANGLE_MIN_DEG = 12;
export const PITCH_ANGLE_MAX_DEG = 14;
/** Diâmetro mínimo do refletor: 3λ/4 (Kraus & Marhefka, cap. 7). */
export const GROUND_PLANE_MIN_LAMBDA = 0.75;

/** Impedância de entrada axial, resistiva, ≈ 140·C/λ Ω (Kraus & Marhefka, cap. 7). */
export function inputImpedance(circumferenceRatio: number): number {
  return 140 * circumferenceRatio;
}

/** Diretividade D ≈ 15·N·(C/λ)²·(S/λ) (Kraus & Marhefka, cap. 7), razão de potência. */
export function directivity(turns: number, circumferenceRatio: number, pitchRatio: number): number {
  return 15 * turns * circumferenceRatio ** 2 * pitchRatio;
}

/** Largura de feixe de meia potência ≈ 52·λ^1,5/(C·√(N·S)) graus (Kraus & Marhefka, cap. 7). */
export function halfPowerBeamwidthDeg(turns: number, circumferenceRatio: number, pitchRatio: number): number {
  return 52 / (circumferenceRatio * Math.sqrt(turns * pitchRatio));
}

/** Razão axial ≈ (2N + 1)/(2N), condição de Hansen–Woodyard (Kraus & Marhefka, cap. 7). */
export function axialRatio(turns: number): number {
  return (2 * turns + 1) / (2 * turns);
}

export type Winding = 'right' | 'left';

/**
 * Enrolamento para o sentido de polarização: no modo axial a hélice à direita irradia RHCP e a hélice à esquerda irradia LHCP
 * (Kraus & Marhefka, cap. 7; fato padrão, na convenção IEEE em que RHCP gira no sentido horário olhando na direção do feixe).
 */
export function windingFor(sense: Sense): Winding {
  return sense === 'rhcp' ? 'right' : 'left';
}

/** Método de montagem para o sentido pedido: sentido de enrolamento e como reconhecê-lo. */
function assemblyFor(sense: Sense, winding: Winding): AssemblyGuide {
  const left = winding === 'left';
  return {
    title: `Montagem para ${SENSE_NAME[sense]}: hélice enrolada à ${left ? 'esquerda' : 'direita'}`,
    steps: [
      `Enrole TODAS as voltas À ${left ? 'ESQUERDA' : 'DIREITA'}, sempre no mesmo sentido, a partir do ponto de alimentação junto ao refletor.`,
      `Como reconhecer: subindo pelo fio, ele gira no sentido ${left ? 'HORÁRIO' : 'ANTI-HORÁRIO'} visto de cima (rosca ${left ? 'à esquerda, invertida' : 'comum, à direita'}). Visto de lado, o fio da frente sobe da ${left ? 'direita para a esquerda ("\\")' : 'esquerda para a direita ("/")'}.`,
      'A mão do enrolamento não muda ao virar a hélice de ponta-cabeça ou ao olhar de outro lado. O que importa é o refletor ficar atrás e o feixe sair pela ponta livre.',
      `Montar com o enrolamento oposto (à ${left ? 'direita' : 'esquerda'}) dá ${left ? 'RHCP' : 'LHCP'}: contra um sinal ${left ? 'LHCP' : 'RHCP'} a perda é grande. Confira antes de fixar o fio.`,
      'A regra (hélice à direita = RHCP) é a de Kraus & Marhefka, cap. 7. Confirme com um passe real ou com uma antena de sentido conhecido.',
    ],
  };
}

export function calc(params: HelicalParams): CalcResult {
  const { frequencyMHz: f, turns: n, circumferenceRatio: c, pitchRatio: s, conductorDiameter: d } = params;
  assertFrequencyMHz(f);
  assertPositive(c, 'A razão C/λ');
  assertPositive(s, 'A razão S/λ');
  assertPositive(d, 'O diâmetro do condutor');
  const sense = senseOf(params.circularSense);
  const winding = windingFor(sense);
  if (!Number.isFinite(n) || n < 1) {
    throw new RangeError(`O número de voltas deve ser ≥ 1 (recebido: ${n}).`);
  }

  const lambda = wavelength(f);
  const circumference = c * lambda;
  const diameter = circumference / Math.PI;
  const pitch = s * lambda;
  const axialLength = n * pitch;
  const wireLength = n * Math.hypot(circumference, pitch);
  const groundPlane = GROUND_PLANE_MIN_LAMBDA * lambda;
  const pitchAngle = (Math.atan2(pitch, circumference) * 180) / Math.PI;

  const measurements: Measurement[] = [
    { label: 'A', name: 'Circunferência da hélice', meters: circumference, description: 'Medida no eixo do condutor, uma volta.' },
    { label: 'B', name: 'Diâmetro da hélice', meters: diameter, description: 'Diâmetro entre os eixos do condutor (C/π). O tubo de suporte é menor: desconte o diâmetro do fio.' },
    { label: 'C', name: 'Passo', meters: pitch, description: 'Distância axial entre voltas consecutivas.' },
    { label: 'D', name: 'Comprimento axial', meters: axialLength, description: 'Altura da hélice, de N voltas (N × passo).' },
    { label: 'E', name: 'Fio da hélice', meters: wireLength, description: 'Comprimento total do condutor nas N voltas, sem o terminal de alimentação.' },
    { label: 'F', name: 'Refletor (diâmetro)', meters: groundPlane, description: 'Disco ou grade circular, no mínimo 3λ/4.' },
  ];

  const gainDbi = powerRatioToDb(directivity(n, c, s));
  const hpbw = halfPowerBeamwidthDeg(n, c, s);
  const z = inputImpedance(c);
  const ar = axialRatio(n);

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (c < AXIAL_MODE_C_MIN || c > AXIAL_MODE_C_MAX) {
    warnings.push({
      level: 'warning',
      message:
        `C/λ = ${formatNumber(c, 2)} está fora de 0,75 a 1,33, a faixa do modo axial. ` +
        'Fora dela o diagrama deixa de ser um feixe único no eixo e as fórmulas não valem.',
    });
  }
  // Compara com 0,1° de resolução: S = λ/4 com C = λ dá 14,04°, que Kraus trata como o limite de 14°.
  const shownAngle = Math.round(pitchAngle * 10) / 10;
  if (shownAngle < PITCH_ANGLE_MIN_DEG || shownAngle > PITCH_ANGLE_MAX_DEG) {
    warnings.push({
      level: 'warning',
      message:
        `O ângulo de passo é ${formatNumber(pitchAngle, 1)}°, fora da faixa usual de 12° a 14° do modo axial. ` +
        'As fórmulas de ganho e largura de feixe são menos confiáveis.',
    });
  }
  if (n <= 3) {
    warnings.push({
      level: 'warning',
      message: 'Com 3 voltas ou menos o modo axial não se estabelece bem: use N maior que 3.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        `A impedância de entrada fica perto de ${formatNumber(z, 0)} Ω, bem acima dos 50 Ω do coaxial. ` +
        'Use um transformador de 1/4 de onda (ferramenta "Transformador de 1/4 de onda") ou outro casamento. ' +
        `Sem ele a ROE fica em torno de ${formatNumber(Math.max(z, 50) / Math.min(z, 50), 1)}:1.`,
    },
    {
      level: 'info',
      message:
        'A antena é direcional: aponte o eixo para o alvo. Para satélites que cruzam o céu, ' +
        'é preciso apontar a antena durante a passagem (azimute e elevação).',
    },
    {
      level: 'danger',
      message:
        'Transmissão: o ganho concentra a potência no feixe (EIRP = potência × ganho). Mantenha pessoas ' +
        'fora da frente da antena durante a transmissão. Estime a distância na ferramenta "Exposição a RF".',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Sentido da polarização', value: `${SENSE_NAME[sense]}: hélice enrolada à ${winding === 'left' ? 'esquerda' : 'direita'}`, source: 'Kraus & Marhefka, cap. 7' },
      { name: 'Número de voltas (N)', value: formatNumber(n, 0) },
      { name: 'C/λ', value: formatNumber(c, 3), source: 'Kraus & Marhefka, cap. 7: 3/4 < C/λ < 4/3' },
      { name: 'S/λ', value: formatNumber(s, 3) },
      { name: 'Ângulo de passo', value: `${formatNumber(pitchAngle, 1)}°`, source: 'α = arctg(S/C); usual de 12° a 14°' },
      { name: 'Diâmetro do condutor', value: `${formatNumber(d * 1000, 2)} mm`, source: 'Pouco influente no modo axial (Kraus & Marhefka, cap. 7)' },
      { name: 'Largura de feixe (meia potência)', value: `≈ ${formatNumber(hpbw, 0)}°`, source: 'Kraus & Marhefka, cap. 7: 52·λ^1,5/(C·√(N·S))' },
      { name: 'Razão axial', value: `≈ ${formatNumber(ar, 2)} (${formatNumber(powerRatioToDb(ar ** 2), 1)} dB)`, source: 'Kraus & Marhefka, cap. 7: (2N+1)/(2N)' },
      { name: 'Refletor', value: 'Disco ou grade plana de diâmetro ≥ 3λ/4', source: 'Kraus & Marhefka, cap. 7' },
    ],
    expected: {
      impedance: {
        typical: z,
        min: z * 0.8,
        max: z * 1.2,
        unit: 'Ω',
        note: 'Resistiva, na alimentação pela borda da hélice (≈ 140·C/λ). A faixa de ±20 % é uma margem desta ferramenta. Meça.',
        source: 'Kraus & Marhefka, Antennas for All Applications, 3ª ed., cap. 7. TODO(fonte): tolerância medida na literatura.',
      },
      gain: {
        typical: gainDbi,
        unit: 'dBi',
        note: 'Fórmula empírica D = 15·N·(C/λ)²·(S/λ); o ganho real fica um pouco abaixo, por perdas e erros de construção.',
        source: 'Kraus & Marhefka, Antennas for All Applications, 3ª ed., cap. 7',
      },
      bandwidth: {
        min: (AXIAL_MODE_C_MIN / c) * f,
        max: (AXIAL_MODE_C_MAX / c) * f,
        unit: 'MHz',
        note:
          'Faixa em que o modo axial se mantém para esta circunferência (3/4 < C/λ < 4/3). É a faixa do ' +
          'diagrama e da polarização, não de ROE < 2:1: a ROE depende do casamento.',
        source: 'Kraus & Marhefka, cap. 7 (banda de cerca de 1,78:1)',
      },
    },
    warnings,
    assembly: assemblyFor(sense, winding),
  };
}
