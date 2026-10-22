/**
 * Yagi-Uda pelo método do NBS Technical Note 688 (ver `nbs688.ts`).
 *
 * Um Yagi é um conjunto de dipolos: um excitado (ligado ao cabo), um refletor um pouco mais
 * comprido atrás dele e diretores um pouco mais curtos na frente. As correntes induzidas nos
 * elementos parasitas somam o campo na frente e o cancelam atrás.
 */

import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { wavelength } from '../../core/wave';
import { qBandwidthEstimate } from '../bandwidth';
import { kAssumption, kWarning, shorteningFactorFor } from '../k-factor';
import { type CalcResult, type CalcWarning, type Estimate, type Measurement, rangeWarning } from '../types';
import { yagiQ } from './band-model';
import { calcDl6wu } from './dl6wu-calc';
import { type YagiElement, yagiElements } from './elements';
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
  /**
   * Método de projeto: 1 = projetos do NBS TN 688; 2 = DL6WU (qualquer número de elementos). Omitido = automático, conforme o
   * número de elementos (ver `chooseMethod`). A interface não pergunta: usa sempre o automático.
   */
  method?: number;
  /**
   * Número total de elementos (refletor + excitado + diretores). No método NBS só existem 3, 5, 6, 12,
   * 15 ou 17; no DL6WU, qualquer número de 3 a 40 (DL6WU_MAX_ELEMENTS). O comprimento do boom sai do projeto escolhido.
   */
  elementCount: number;
  /** Diâmetro dos elementos, em metros. */
  elementDiameter: number;
  /** Diâmetro do boom condutor, em metros; 0 = boom isolante. */
  boomDiameter: number;
  /** Espaço central (isolador) do elemento excitado, em metros; conta dentro do comprimento total DE. Omitido = 0. */
  drivenGap?: number;
}

export const defaultParams: YagiParams = {
  frequencyMHz: 145,
  elementCount: 5,
  elementDiameter: 0.006,
  boomDiameter: 0.02,
  drivenGap: 0.01,
};

/** Números de elementos disponíveis (refletor + excitado + diretores), em ordem crescente. */
export const AVAILABLE_ELEMENT_COUNTS: readonly number[] = NBS_DESIGNS.map((d) => d.directorCount + 2).sort((a, b) => a - b);

/** Projeto do NBS com esse número total de elementos. */
export function findDesign(elementCount: number) {
  const design = NBS_DESIGNS.find((d) => d.directorCount + 2 === elementCount);
  if (!design) {
    throw new RangeError(
      `No método NBS o número de elementos deve ser um dos projetos do NBS (${AVAILABLE_ELEMENT_COUNTS.join(', ')}); recebido: ${elementCount}. ` +
        'Para outras quantidades use o método 2 (DL6WU).',
    );
  }
  return design;
}

/** Posição de cada elemento no boom, em λ a partir do refletor (índice 0 = refletor, 1 = excitado). */
export function elementPositionsLambda(directorCount: number, spacing: number): number[] {
  const positions = [0, NBS_REFLECTOR_SPACING];
  for (let i = 1; i <= directorCount; i++) positions.push(NBS_REFLECTOR_SPACING + i * spacing);
  return positions;
}

/** Menor número de elementos (boom de 2,2λ) a partir do qual o DL6WU vale (ver `dl6wu.ts`). */
const DL6WU_MIN_ELEMENTS = 11;

/**
 * Método automático: o NBS (projetos medidos e otimizados) para Yagis curtos que ele cobre, ou seja, 3, 5 e 6 elementos; o DL6WU a partir
 * de 11 elementos, a faixa dele, e também nos números intermediários que o NBS não tem (4 e de 7 a 10; ali o DL6WU calcula, mas avisa e
 * não estima ganho). O NBS tem 12, 15 e 17 elementos, mas aí o DL6WU é o método próprio para boom de 2,2λ ou mais; o NBS segue disponível
 * com `method: 1` no código.
 */
export function chooseMethod(elementCount: number): 1 | 2 {
  const hasNbsDesign = NBS_DESIGNS.some((d) => d.directorCount + 2 === elementCount);
  return hasNbsDesign && elementCount < DL6WU_MIN_ELEMENTS ? 1 : 2;
}

/**
 * Espaço central do excitado: o comprimento DE é de ponta a ponta e já inclui o espaço, como no dipolo; cada braço mede (DE − espaço)/2.
 * Só o excitado é partido ao meio: refletor e diretores seguem inteiros. Sem espaço informado, o resultado não muda.
 */
function withDrivenGap(result: CalcResult, gap: number | undefined): CalcResult {
  const g = gap ?? 0;
  if (!Number.isFinite(g) || g < 0) throw new RangeError(`O espaço central do excitado deve ser ≥ 0 (recebido: ${g}).`);
  if (g === 0) return result;
  const driven = result.measurements.find((m) => m.label === 'DE')!.meters;
  if (g >= driven) throw new RangeError('O espaço central é maior que o comprimento do elemento excitado.');
  const extra: Measurement[] = [
    { label: 'DB', name: 'Excitado: cada braço', meters: (driven - g) / 2, description: 'Do terminal de alimentação até a ponta; são dois braços iguais, (DE − DG)/2.' },
    { label: 'DG', name: 'Excitado: espaço central', meters: g, description: 'Entre os dois braços do excitado, no isolador central; já conta dentro de DE.' },
  ];
  const at = result.measurements.findIndex((m) => m.label === 'DE') + 1;
  return {
    ...result,
    measurements: [...result.measurements.slice(0, at), ...extra, ...result.measurements.slice(at)],
    assumptions: [
      ...result.assumptions,
      { name: 'Espaço central do excitado', value: `${formatNumber(g * 1000, 1)} mm (dentro do comprimento DE)`, source: 'Dado do usuário; comprimento de ponta a ponta, como no dipolo' },
    ],
  };
}

export function designCalc(params: YagiParams): CalcResult {
  const auto = params.method === undefined;
  const method = params.method ?? chooseMethod(params.elementCount);
  if (method === 2) return withDrivenGap(withAutoNote(calcDl6wu(params), auto, 'DL6WU'), params.drivenGap);
  if (method !== 1) {
    throw new RangeError(`O método deve ser 1 (NBS TN 688) ou 2 (DL6WU); recebido: ${params.method}.`);
  }
  return withDrivenGap(withAutoNote(calcNbs(params), auto, 'NBS TN 688'), params.drivenGap);
}

/** Cálculo completo: as medidas (`designCalc`) mais a banda de ROE do modelo por momentos (`band-model.ts`) nos valores esperados. */
export function calc(params: YagiParams): CalcResult {
  const result = designCalc(params);
  // O modelo não tem boom: usa os elementos sem a correção do boom (ver pattern-model.ts, isolatedElements).
  const isolated = params.boomDiameter === 0 ? result : designCalc({ ...params, boomDiameter: 0 });
  const elements = yagiElements(isolated);
  return { ...result, expected: { ...result.expected, bandwidth: yagiBandwidth(elements, params.elementDiameter, params.frequencyMHz) } };
}

export const YAGI_BAND_SOURCE =
  'Modelo desta ferramenta: método dos momentos sem boom (core/mom.ts, conferido com o ganho medido do NBS TN 688) e Q da impedância de ' +
  'Yaghjian e Best (IEEE Trans. Antennas Propag., 2005; fórmulas via arXiv 1909.08019)';

/** Banda de ROE < 2:1 com casamento ideal em f0, pelo Q do excitado; para Yagis longas o Q é conservador (teste de band-model). */
export function yagiBandwidth(elements: readonly YagiElement[], diameterM: number, f0: number): Estimate {
  const { z0, q } = yagiQ(elements, diameterM, f0);
  const direct = Math.max(z0.re / 50, 50 / z0.re);
  const long = elements.length >= DL6WU_MIN_ELEMENTS;
  return qBandwidthEstimate(f0, q, {
    reference: 'com casamento ideal na frequência de projeto',
    note:
      `No modelo o excitado tem Z ≈ ${formatNumber(z0.re, 0)} ${z0.im < 0 ? '−' : '+'} j${formatNumber(Math.abs(z0.im), 0)} Ω; ` +
      `ajustado para ressoar e ligado direto em 50 Ω, a ROE mínima seria ≈ ${formatNumber(direct, 1)}:1. A rede de casamento ideal não tem ` +
      'perdas nem banda própria: gamma, hairpin e dipolo dobrado estreitam um pouco a faixa. Espaço livre, condutor perfeito, sem boom.' +
      (long
        ? ' Em Yagis longas a impedância varia em ondulações e, no modelo, a faixa de ROE < 2:1 é maior que esta (estimativa conservadora). ' +
          'O ganho e a relação frente–costas também mudam dentro da faixa; não foram calculados aqui.'
        : ''),
    source: YAGI_BAND_SOURCE,
  });
}

/** Em modo automático, informa na tela qual método foi usado e por quê. */
function withAutoNote(result: CalcResult, auto: boolean, name: string): CalcResult {
  if (!auto) return result;
  return {
    ...result,
    warnings: [
      {
        level: 'info',
        message:
          `Método escolhido automaticamente pelo número de elementos: ${name}. ` +
          'O NBS TN 688 (projetos medidos) vale para 3, 5 e 6 elementos; o DL6WU, para 11 ou mais (boom a partir de 2,2λ) e também ' +
          'cobre os números intermediários, com aviso e sem estimativa de ganho abaixo de 11.',
      },
      ...result.warnings,
    ],
  };
}

function calcNbs(params: YagiParams): CalcResult {
  const { frequencyMHz: f, elementCount, elementDiameter: d, boomDiameter: boom } = params;
  assertFrequencyMHz(f);
  assertPositive(d, 'O diâmetro dos elementos');
  if (!Number.isFinite(boom) || boom < 0) {
    throw new RangeError(`O diâmetro do boom deve ser ≥ 0 (recebido: ${boom}).`);
  }
  const design = findDesign(elementCount);

  const lambda = wavelength(f);
  const dOverLambda = d / lambda;
  const boomOverLambda = boom / lambda;
  const boomExtra = boom > 0 ? boomCorrection(boomOverLambda) : 0;
  const directors = directorLengths(design, dOverLambda).map((l) => (l + boomExtra) * lambda);
  const reflector = (reflectorLength(design, dOverLambda) + boomExtra) * lambda;
  const sf = shorteningFactorFor(d, f);
  const driven = (sf.k * lambda) / 2;
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
    {
      label: 'L',
      name: 'Comprimento do boom (entre centros)',
      meters: overall,
      description:
        'Do refletor ao último diretor, medido entre os centros dos elementos. O boom físico precisa de sobra nas pontas para fixar os elementos de ponta e o suporte.',
    },
  ];

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  const clampWarning = kWarning(sf, 'o elemento excitado');
  if (clampWarning) warnings.push(clampWarning);
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
        // TODO(fonte): fonte pendente para o texto abaixo.
        'λ/2 × K (K do diâmetro, como no dipolo isolado) como ponto de partida: os elementos vizinhos mudam a ressonância. Corte comprido e ajuste medindo a ROE. Para o hairpin, use a ferramenta "Hairpin". Gamma match ainda não tem equações com fonte aqui.',
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
        value: `${elementCount} elementos (refletor, excitado e ${design.directorCount} diretor${design.directorCount > 1 ? 'es' : ''}); boom de ${formatNumber(overall / lambda, 2)}λ entre centros`,
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
      kAssumption(sf, 'do excitado'),
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

// TODO(fonte) [guide.md]: fonte pendente: «- **Hairpin**: use a ferramenta "Hairpin (casamento de Yagi)" com a impedância medida do e…»
