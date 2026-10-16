/**
 * Yagi-Uda pelo método do NBS Technical Note 688 (ver `nbs688.ts`).
 *
 * Um Yagi é um conjunto de dipolos: um excitado (ligado ao cabo), um refletor um pouco mais
 * comprido atrás dele e diretores um pouco mais curtos na frente. As correntes induzidas nos
 * elementos parasitas somam o campo na frente e o cancelam atrás.
 */

import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { assertFactor, wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';
import {
  NBS_CUT_TOLERANCE_LAMBDA,
  NBS_D_OVER_LAMBDA_RANGE,
  NBS_DBD_TO_DBI,
  NBS_DESIGNS,
  NBS_REFLECTOR_SPACING,
  NBS_TABLE_D_OVER_LAMBDA,
  boomCorrection,
  directorLengths,
  reflectorLength,
} from './nbs688';

export interface YagiParams {
  frequencyMHz: number;
  /** Comprimento do projeto do NBS, em λ (0,4; 0,8; 1,2; 2,2; 3,2 ou 4,2). */
  designLength: number;
  /** Diâmetro dos elementos, em metros. */
  elementDiameter: number;
  /** Diâmetro do boom condutor, em metros; 0 = boom isolante. */
  boomDiameter: number;
  /** Fator de encurtamento do elemento excitado, em (0, 1]. */
  drivenFactor: number;
}

export const defaultParams: YagiParams = {
  frequencyMHz: 145,
  designLength: 0.8,
  elementDiameter: 0.006,
  boomDiameter: 0.02,
  drivenFactor: 0.95,
};

/** Projeto do NBS com esse comprimento (aceita erro de arredondamento de 1e-9). */
export function findDesign(designLength: number) {
  const design = NBS_DESIGNS.find((d) => Math.abs(d.lengthLambda - designLength) < 1e-9);
  if (!design) {
    const valid = NBS_DESIGNS.map((d) => formatNumber(d.lengthLambda, 1)).join(', ');
    throw new RangeError(`O comprimento do Yagi deve ser um dos projetos do NBS (${valid} λ); recebido: ${designLength}.`);
  }
  return design;
}

/** Posição de cada elemento no boom, em λ a partir do refletor (índice 0 = refletor, 1 = excitado). */
export function elementPositionsLambda(directorCount: number, spacing: number): number[] {
  const positions = [0, NBS_REFLECTOR_SPACING];
  for (let i = 1; i <= directorCount; i++) positions.push(NBS_REFLECTOR_SPACING + i * spacing);
  return positions;
}

export function calc(params: YagiParams): CalcResult {
  const { frequencyMHz: f, designLength, elementDiameter: d, boomDiameter: boom, drivenFactor: k } = params;
  assertFrequencyMHz(f);
  assertPositive(d, 'O diâmetro dos elementos');
  assertFactor(k, 'O fator de encurtamento do excitado');
  if (!Number.isFinite(boom) || boom < 0) {
    throw new RangeError(`O diâmetro do boom deve ser ≥ 0 (recebido: ${boom}).`);
  }
  const design = findDesign(designLength);

  const lambda = wavelength(f);
  const dOverLambda = d / lambda;
  const boomOverLambda = boom / lambda;
  const boomExtra = boom > 0 ? boomCorrection(boomOverLambda) : 0;
  const directors = directorLengths(design, dOverLambda).map((l) => (l + boomExtra) * lambda);
  const reflector = (reflectorLength(design, dOverLambda) + boomExtra) * lambda;
  const driven = (k * lambda) / 2;
  const spacing = design.spacing * lambda;
  const overall = (NBS_REFLECTOR_SPACING + design.directorCount * design.spacing) * lambda;

  const measurements: Measurement[] = [
    { label: 'R', name: 'Refletor', meters: reflector, description: 'Comprimento total do elemento, nas pontas.' },
    { label: 'DE', name: 'Elemento excitado', meters: driven, description: 'Dipolo ligado ao cabo; ajustável (ver ajuste).' },
    ...directors.map((meters, i) => ({
      label: `D${i + 1}`,
      name: `Diretor ${i + 1}`,
      meters,
      description: 'Comprimento total do elemento, nas pontas.',
    })),
    { label: 'E', name: 'Refletor ao excitado', meters: NBS_REFLECTOR_SPACING * lambda, description: 'Distância no boom entre o refletor e o elemento excitado (0,2λ).' },
    { label: 'S', name: 'Espaçamento dos diretores', meters: spacing, description: 'Do excitado ao 1º diretor e entre diretores consecutivos.' },
    { label: 'L', name: 'Comprimento do Yagi', meters: overall, description: 'Do refletor ao último diretor (distância entre centros).' },
  ];

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (dOverLambda < NBS_D_OVER_LAMBDA_RANGE.min || dOverLambda > NBS_D_OVER_LAMBDA_RANGE.max) {
    warnings.push({
      level: 'warning',
      message:
        `d/λ = ${formatNumber(dOverLambda, 4)} está fora da faixa dos gráficos do NBS (${formatNumber(NBS_D_OVER_LAMBDA_RANGE.min, 4)} a ` +
        `${formatNumber(NBS_D_OVER_LAMBDA_RANGE.max, 2)}). Os comprimentos são extrapolados e menos confiáveis; use outro diâmetro de elemento.`,
    });
  }
  if (boomOverLambda > 0.04) {
    warnings.push({
      level: 'warning',
      message: `D/λ do boom = ${formatNumber(boomOverLambda, 3)} passa do final do gráfico de correção do NBS (≈ 0,04). A correção é extrapolada.`,
    });
  }
  if (design.note) warnings.push({ level: 'warning', message: design.note });
  warnings.push(
    {
      level: 'warning',
      message:
        `Corte os elementos com tolerância de ${formatNumber(NBS_CUT_TOLERANCE_LAMBDA * lambda * 1000, 1)} mm ` +
        `(0,003λ), o que o NBS pede para manter o ganho. O NBS mediu os elementos soltos num boom isolante: ` +
        'a correção de boom é uma aproximação.',
    },
    {
      level: 'warning',
      message:
        'O NBS não dá a medida do elemento excitado: ele depende do casamento escolhido. O valor mostrado é ' +
        'λ/2 × K como ponto de partida. Corte comprido e ajuste medindo a ROE. Para o hairpin, use a ferramenta "Hairpin". Gamma match ainda não tem equações com fonte aqui (TODO).',
    },
    {
      level: 'info',
      message:
        'Um Yagi é direcional: aponte a frente (lado dos diretores) para a estação. Use choke de corrente no ' +
        'coaxial, logo atrás do ponto de alimentação.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: tensão alta de RF nas pontas dos elementos e potência concentrada na frente (EIRP = ' +
        'potência × ganho). Mantenha pessoas e rede elétrica longe. Estime a distância na ferramenta "Exposição a RF".',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      {
        name: 'Projeto',
        value: `${formatNumber(design.lengthLambda, 1)}λ: refletor, excitado e ${design.directorCount} diretor${design.directorCount > 1 ? 'es' : ''}`,
        source: 'NBS TN 688, Tabela 1',
      },
      { name: 'Diâmetro dos elementos', value: `${formatNumber(d * 1000, 2)} mm (d/λ = ${formatNumber(dOverLambda, 4)})` },
      {
        name: 'Tabela 1 vale para',
        value: `d/λ = ${formatNumber(NBS_TABLE_D_OVER_LAMBDA, 4)}, refletor a 0,2λ, medida a 400 MHz`,
        source: 'NBS TN 688, p. 2 e Tabela 1; as outras proporções vêm da Fig. 9 digitalizada',
      },
      {
        name: 'Boom',
        value: boom > 0 ? `condutor, ${formatNumber(boom * 1000, 1)} mm (D/λ = ${formatNumber(boomOverLambda, 4)}): +${formatNumber(boomExtra, 4)}λ nos parasitas` : 'isolante, sem correção',
        source: 'NBS TN 688, Fig. 10 (digitalizada)',
      },
      { name: 'Fator do excitado (K)', value: formatNumber(k, 3), source: 'λ/2 × K, ponto de partida (CLAUDE.md); NBS não especifica' },
      { name: 'Posição dos elementos', value: 'Refletor em 0; excitado a 0,2λ; diretores a cada S a partir do excitado', source: 'NBS TN 688, Tabela 1' },
    ],
    expected: {
      impedance: {
        unit: 'Ω',
        note:
          'O NBS projetou o excitado para trabalhar em 50 ou 200 Ω (por exemplo, um dipolo dobrado com balun 4:1 para 50 Ω). ' +
          'Com um dipolo simples a impedância cai bem abaixo de 50 Ω por causa dos parasitas e precisa de casamento. Meça.',
        source: 'NBS TN 688, seção 4',
      },
      gain: {
        typical: design.gainDbd + NBS_DBD_TO_DBI,
        unit: 'dBi',
        note:
          `Medido pelo NBS: ${formatNumber(design.gainDbd, 2)} dB sobre um dipolo de meia onda (+ 2,16 dB para referir ao isotrópico). ` +
          'Medido a 3λ do solo, com elementos de d/λ = 0,0085 e boom isolante; na prática fica um pouco abaixo.',
        source: 'NBS TN 688, Tabela 1 e p. 1',
      },
      bandwidth: null,
    },
    warnings,
  };
}
