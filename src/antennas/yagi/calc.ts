/**
 * Yagi-Uda pelo método do NBS Technical Note 688 (ver `nbs688.ts`).
 *
 * Um Yagi é um conjunto de dipolos: um excitado (ligado ao cabo), um refletor um pouco mais
 * comprido atrás dele e diretores um pouco mais curtos na frente. As correntes induzidas nos
 * elementos parasitas somam o campo na frente e o cancelam atrás.
 */

import type { Complex } from '../../core/complex';
import { assertFrequencyMHz, assertPositive, formatLength, formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { wavelength } from '../../core/wave';
import {
  ARRL_GAMMA_RULES,
  type AutoGammaResult,
  type GammaDesign,
  MAX_PRACTICAL_STEP_UP,
  PREFERRED_ELECTRICAL_DEG,
  capacitorVoltageRms,
} from '../../matching/gamma';
import { qBandwidthEstimate } from '../bandwidth';
import { kAssumption, kWarning, shorteningFactorFor } from '../k-factor';
import { type AssemblyGuide, type CalcResult, type CalcWarning, type Estimate, type Measurement, rangeWarning } from '../types';
import { yagiQ } from './band-model';
import { calcDl6wu } from './dl6wu-calc';
import { type YagiElement, yagiElements } from './elements';
import { type YagiGamma, yagiGamma } from './gamma-feed';
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
  /** Só com `gammaMatch: 0`: espaço central (isolador) do excitado, em metros, dentro do comprimento total DE. Omitido = 0. */
  drivenGap?: number;
  /**
   * 1 ou omitido = gamma match (excitado inteiro, ver `gamma-feed.ts`), a única alimentação da interface (decisão do usuário, 2026-10-28).
   * 0 = excitado λ/2 × K partido ao meio, só no código: é o projeto do método, usado nos testes de validação (NBS, DL6WU).
   */
  gammaMatch?: number;
  /** Diâmetro da barra do gamma, em metros; 0 ou omitido = automático (1/3 do elemento, ARRL). */
  gammaRodDiameter?: number;
  /** Espaçamento entre os centros da barra e do excitado, em metros; 0 ou omitido = automático (0,007λ, ARRL). */
  gammaSpacing?: number;
  /** Potência de transmissão, em W, para a tensão no capacitor do gamma. Omitido = 100 W. */
  txPowerW?: number;
}

export const defaultParams: YagiParams = {
  frequencyMHz: 145,
  elementCount: 5,
  elementDiameter: 0.006,
  boomDiameter: 0.02,
  gammaRodDiameter: 0,
  gammaSpacing: 0,
  txPowerW: 100,
};

/** O gamma casa com o cabo de 50 Ω (na cross Yagi, cada Yagi; ver cross-yagi/calc.ts). */
export const GAMMA_LINE_OHMS = 50;
const DEFAULT_TX_POWER_W = 100;

export function usesGamma(params: YagiParams): boolean {
  return (params.gammaMatch ?? 1) !== 0;
}

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
export const DL6WU_MIN_ELEMENTS = 11;

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

/** Medidas pelo método (NBS ou DL6WU), com o excitado λ/2 × K e sem o espaço central. */
function methodCalc(params: YagiParams): CalcResult {
  const auto = params.method === undefined;
  const method = params.method ?? chooseMethod(params.elementCount);
  if (method === 2) return withAutoNote(calcDl6wu(params), auto, 'DL6WU');
  if (method !== 1) {
    throw new RangeError(`O método deve ser 1 (NBS TN 688) ou 2 (DL6WU); recebido: ${params.method}.`);
  }
  return withAutoNote(calcNbs(params), auto, 'NBS TN 688');
}

/**
 * Medidas da Yagi: as do método e, conforme a alimentação, o excitado partido ao meio (espaço central) ou inteiro com o gamma match
 * (excitado recalculado pelo modelo e as cotas da barra, ver `withGamma`).
 */
export function designCalc(params: YagiParams): CalcResult {
  const base = methodCalc(params);
  return usesGamma(params) ? withGamma(base, params).result : withDrivenGap(base, params.drivenGap);
}

/** Lê um campo opcional em metros: 0 ou omitido = automático (undefined). */
function optionalLength(value: number | undefined, name: string): number | undefined {
  if (value === undefined || value === 0) return undefined;
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} deve ser ≥ 0 (0 = automático; recebido: ${value}).`);
  return value;
}

/** Gamma da Yagi nos elementos soltos (sem a correção do boom, que o modelo não tem). */
export function gammaFor(params: YagiParams): YagiGamma {
  const isolated = methodCalc({ ...params, boomDiameter: 0 });
  const rod = optionalLength(params.gammaRodDiameter, 'O diâmetro da barra do gamma');
  const spacing = optionalLength(params.gammaSpacing, 'O espaçamento da barra do gamma');
  return yagiGamma(yagiElements(isolated), params.elementDiameter, params.frequencyMHz, {
    lineOhms: GAMMA_LINE_OHMS,
    ...(rod !== undefined ? { rodDiameterM: rod } : {}),
    ...(spacing !== undefined ? { spacingM: spacing } : {}),
  });
}

/** Início das mensagens do método sobre o excitado λ/2 × K, que com o gamma deixam de valer. */
const DRIVEN_NOTES = ['O NBS não dá a medida do elemento excitado', 'O DL6WU calcula o excitado para um dipolo DOBRADO'];

/**
 * Gamma match: excitado inteiro, 3 % mais curto que a ressonância no conjunto (ARRL), com a mesma correção do boom dos parasitas
 * (com o gamma o excitado também atravessa ou toca o boom metálico, como eles; extensão desta ferramenta: o NBS e o DL6WU só corrigem
 * os parasitas); barra (GD), espaçamento (GS) e posição da ponte (GL) pelo Tolles. O capacitor e o passo a passo vão em `matching`.
 */
function withGamma(base: CalcResult, params: YagiParams): { result: CalcResult; fit: YagiGamma } {
  const f = params.frequencyMHz;
  const power = params.txPowerW ?? DEFAULT_TX_POWER_W;
  assertPositive(power, 'A potência de transmissão');
  const fit = gammaFor(params);
  const lambda = wavelength(f);
  const res = lengthResolutionForFrequency(f);
  const isolatedReflector = yagiElements(methodCalc({ ...params, boomDiameter: 0 }))[0]!.length;
  const boomExtra = base.measurements.find((m) => m.label === 'R')!.meters - isolatedReflector;
  const driven = fit.drivenLengthM + boomExtra;
  const g = fit.gamma;
  const design = g.design.ok ? g.design : null;

  const gammaMeasurements: Measurement[] = design
    ? [
        {
          label: 'GL',
          name: 'Gamma: ponte de curto',
          meters: design.rodLengthM,
          description: 'Do centro do excitado (ponto de alimentação) até a ponte que liga a barra ao elemento. É o primeiro ajuste.',
        },
        {
          label: 'GS',
          name: 'Gamma: espaçamento (entre centros)',
          meters: g.spacingM,
          description: `Entre o centro da barra e o centro do excitado; folga de ${formatLength(g.spacingM - (params.elementDiameter + g.rodDiameterM) / 2, res)} entre as superfícies.`,
        },
        { label: 'GD', name: 'Gamma: diâmetro da barra', meters: g.rodDiameterM, description: 'Tubo ou fio de alumínio ou cobre, paralelo a uma das metades do excitado.' },
      ]
    : [];
  const measurements: Measurement[] = [];
  for (const m of base.measurements) {
    if (m.label !== 'DE') {
      measurements.push(m);
      continue;
    }
    measurements.push(
      {
        label: 'DE',
        name: 'Elemento excitado (inteiro)',
        meters: driven,
        description: 'Inteiro, sem espaço central: com o gamma match, ≈ 3 % mais curto que a ressonância no conjunto (ARRL). Ajustável.',
      },
      ...gammaMeasurements,
    );
  }

  const warnings: CalcWarning[] = base.warnings.filter((w) => !DRIVEN_NOTES.some((n) => w.message.startsWith(n)));
  const vsHalfWave = driven / ((shorteningFactorFor(params.elementDiameter, f).k * lambda) / 2) - 1;
  warnings.push({
    level: 'warning',
    message:
      `Gamma match: o excitado fica ${formatNumber(Math.abs(vsHalfWave) * 100, 1)} % ${vsHalfWave < 0 ? 'mais curto' : 'mais comprido'} que λ/2 × K, ` +
      'porque é 3 % mais curto que a ressonância no conjunto (ARRL 19, p. 26-9), achada no modelo por momentos (sem boom nem barra). ' +
      'A barra e o capacitor são ponto de partida (Tolles): ajuste a ponte e o capacitor medindo a ROE.',
  });
  if (!design) {
    warnings.push({ level: 'danger', message: `O gamma não fecha o casamento: ${(g.design as { reason: string }).reason}` });
  } else {
    if (g.autoRod && g.rodDiameterM < params.elementDiameter * ARRL_GAMMA_RULES.rodDiameterRatio.min * (1 - 1e-9)) {
      warnings.push({
        level: 'info',
        message:
          `Barra de ${formatNumber(g.rodDiameterM * 1000, 2)} mm, mais fina que a regra do ARRL (1/3 a 1/2 do elemento): com a de 1/3 o casamento não ` +
          'fechava ou a barra ficava fora de 15° a 45°. Barra mais fina dá mais transformação (Tolles).',
      });
    }
    if (design.electricalDeg < PREFERRED_ELECTRICAL_DEG.min || design.electricalDeg > PREFERRED_ELECTRICAL_DEG.max) {
      warnings.push({
        level: 'warning',
        message:
          `A barra ficou com ${formatNumber(design.electricalDeg, 0)}° elétricos, fora de 15° a 45° (Tolles: abaixo de ≈ 15°, mais perda e menos banda; ` +
          'acima, construção crítica). Mude o espaçamento ou o diâmetro da barra (0 = automático).',
      });
    }
    if (design.stepUp > MAX_PRACTICAL_STEP_UP) {
      warnings.push({ level: 'warning', message: `Razão de transformação Hz ≈ ${formatNumber(design.stepUp, 0)}: acima de 20 a 30 pode não ser prática (Tolles).` });
    }
    const vRms = capacitorVoltageRms(power, GAMMA_LINE_OHMS, design.capacitorReactanceOhms);
    warnings.push({
      level: 'danger',
      message:
        `Capacitor do gamma com ${formatNumber(power, 0)} W: ≈ ${formatNumber(vRms, 0)} V eficazes (${formatNumber(vRms * Math.SQRT2, 0)} V de pico). ` +
        'Use um capacitor com tensão de trabalho bem acima do pico e proteja-o da chuva (umidade muda a capacitância e causa arco).',
    });
  }

  const assumptions = [
    ...base.assumptions,
    {
      name: 'Excitado com gamma',
      value:
        `ressonância no conjunto ${formatLength(fit.resonantLengthM, res)} (sem boom) × 0,97 = ${formatLength(fit.drivenLengthM, res)}` +
        (boomExtra !== 0 ? `; + ${formatLength(boomExtra, res)} do boom (a mesma correção dos parasitas)` : ''),
      source: 'ARRL Antenna Book, 19ª ed., p. 26-9 (encurtar ≈ 3 %); ressonância pelo modelo por momentos desta ferramenta',
    },
    {
      name: 'Impedância vista pelo gamma',
      value:
        `metade da do excitado: ${complexText(fit.za)} (excitado inteiro no modelo: ${complexText(fit.zDriven)})`,
      source: 'Tolles, Ham Radio, maio de 1973, p. 50; momentos (espaço livre, sem boom, sem a barra)',
    },
    ...(design
      ? [
          {
            name: 'Gamma (Tolles)',
            value:
              `barra de ${formatNumber(g.rodDiameterM * 1000, 2)} mm a ${formatNumber(g.spacingM * 1000, 1)} mm (entre centros)` +
              `${g.autoRod || g.autoSpacing ? ', escolhidos automaticamente' : ''}; Hz ≈ ${formatNumber(design.stepUp, 2)}, ` +
              `linha barra–elemento ≈ ${formatNumber(design.rodLineOhms, 0)} Ω, barra com ${formatNumber(design.electricalDeg, 1)}° ` +
              `(velocidade relativa 0,956); C ≈ ${formatNumber(design.capacitancePF, 1)} pF para ${GAMMA_LINE_OHMS} Ω`,
            source: 'H. F. Tolles, W7ITB, "How to design gamma-matching networks", Ham Radio, maio de 1973, eqs. 2, 3 e 8 a 13',
          },
          {
            name: 'Regra prática do ARRL (comparação)',
            value:
              `barra de ${formatLength(ARRL_GAMMA_RULES.rodLengthLambda.min * lambda, res)} a ${formatLength(ARRL_GAMMA_RULES.rodLengthLambda.max * lambda, res)}, ` +
              `${formatNumber(ARRL_GAMMA_RULES.rodDiameterRatio.min * params.elementDiameter * 1000, 1)} a ` +
              `${formatNumber(ARRL_GAMMA_RULES.rodDiameterRatio.max * params.elementDiameter * 1000, 1)} mm, a ` +
              `${formatLength(ARRL_GAMMA_RULES.spacingLambda * lambda, res)}; C ≈ ${formatNumber(ARRL_GAMMA_RULES.pfPerMeterOfWavelength * lambda, 0)} pF`,
            source: 'ARRL Antenna Book, 19ª ed., p. 26-9 (para ≈ 25 Ω no excitado encurtado 3 %)',
          },
        ]
      : []),
  ];
  return {
    fit,
    result: {
      ...base,
      measurements,
      assumptions,
      warnings,
      ...(design ? { matching: gammaSteps(design, g, power, f) } : {}),
    },
  };
}

function complexText(z: Complex): string {
  return `${formatNumber(z.re, 1)} ${z.im < 0 ? '−' : '+'} j${formatNumber(Math.abs(z.im), 1)} Ω`;
}

/** Passo a passo da montagem e do ajuste do gamma (ARRL 19, p. 26-9; Tolles, p. 51). */
function gammaSteps(design: GammaDesign, g: AutoGammaResult, powerW: number, fMHz: number): AssemblyGuide {
  const res = lengthResolutionForFrequency(fMHz);
  const vRms = capacitorVoltageRms(powerW, GAMMA_LINE_OHMS, design.capacitorReactanceOhms);
  return {
    title: 'Gamma match: montagem e ajuste',
    steps: [
      'Monte o excitado INTEIRO (DE), sem isolador central. O centro dele fica em potencial zero: pode ser preso direto no boom metálico, como os parasitas.',
      `Barra do gamma: tubo ou fio de ${formatNumber(g.rodDiameterM * 1000, 2)} mm (GD), paralelo a uma das metades do excitado, a ${formatLength(g.spacingM, res)} ` +
        'entre os centros (GS), presa por isoladores. Corte-a mais comprida que GL, para a ponte poder deslizar.',
      `Ponte de curto: uma braçadeira ou tira de metal que liga a barra ao excitado a ${formatLength(design.rodLengthM, res)} do centro (GL). Deixe-a deslizante para o ajuste.`,
      'Conector junto ao centro do excitado: malha do coaxial no centro do elemento (ou no boom metálico); vivo no capacitor, e o capacitor na ponta da barra perto do centro.',
      `Capacitor em série: ≈ ${formatNumber(design.capacitancePF, 1)} pF (reatância de ${formatNumber(Math.abs(design.capacitorReactanceOhms), 0)} Ω em ` +
        `${formatNumber(fMHz, 3)} MHz). Use um variável que cubra esse valor com folga (o Tolles usou um de 7 a 45 pF para 28 pF no 2 m). ` +
        `Tensão com ${formatNumber(powerW, 0)} W: ≈ ${formatNumber(vRms * Math.SQRT2, 0)} V de pico.`,
      'Ajuste com o NanoVNA ou o medidor de ROE, com a antena no lugar definitivo: ajuste o capacitor para a menor ROE; se ela não chegar perto de 1:1, ' +
        'mude a ponte (GL) e repita (ARRL 19, p. 26-9). Se não fechar, tente outro espaçamento ou outra barra.',
      'Depois do ajuste, meça a barra e a capacidade e troque o variável por um fixo de mesmo valor, se quiser, e vede tudo contra a chuva.',
      'Coloque um choke de corrente no coaxial logo depois do conector (ferramentas "Choke de manga", em VHF/UHF, e "Choke de coaxial", em HF).',
    ],
  };
}

/** Cálculo completo: as medidas (`designCalc`) mais a banda de ROE do modelo por momentos (`band-model.ts`) nos valores esperados. */
export function calc(params: YagiParams): CalcResult {
  const result = designCalc(params);
  // O modelo não tem boom: usa os elementos sem a correção do boom (ver pattern-model.ts, isolatedElements).
  const isolated = params.boomDiameter === 0 ? result : designCalc({ ...params, boomDiameter: 0 });
  const elements = yagiElements(isolated);
  const model = yagiQ(elements, params.elementDiameter, params.frequencyMHz);
  const gain = result.expected.gain;
  const gamma = usesGamma(params) ? gammaFor(params) : null;
  return {
    ...result,
    expected: {
      ...result.expected,
      impedance: gamma ? gammaImpedanceEstimate(gamma) : modelImpedanceEstimate(model.z0),
      gain: gain && gain.typical === undefined ? modelGainEstimate(model.directivity) : gain,
      bandwidth:
        gamma && gamma.matchedQ !== null
          ? gammaBandwidth(gamma.matchedQ, params.frequencyMHz, elements.length)
          : yagiBandwidth(elements, params.elementDiameter, params.frequencyMHz),
    },
  };
}

/** Impedância com o gamma: R0 em f0 por projeto (Tolles); o excitado sozinho vem do modelo. */
export function gammaImpedanceEstimate(fit: YagiGamma): Estimate {
  if (!fit.gamma.design.ok) return modelImpedanceEstimate(fit.zDriven);
  return {
    typical: GAMMA_LINE_OHMS,
    unit: 'Ω',
    note:
      `Com o gamma, ${GAMMA_LINE_OHMS} Ω na frequência de projeto. O excitado sozinho, no modelo: ${complexText(fit.zDriven)} (espaço livre, sem boom); ` +
      'o gamma vê a metade. Ajuste o capacitor e a ponte medindo.',
    source: 'Tolles (Ham Radio, maio de 1973); momentos desta ferramenta, não conferidos com medida',
  };
}

/** Banda com o gamma: Q na entrada do gamma (antena + barra + capacitor, sem perdas), pelas mesmas 3 soluções do Q da Yagi. */
export function gammaBandwidth(matchedQ: number, f0: number, elementCount: number): Estimate {
  return qBandwidthEstimate(f0, matchedQ, {
    match: 'Com o gamma',
    note:
      'Q na entrada do gamma (antena + barra + capacitor, sem perdas), modelo sem boom.' +
      (elementCount >= DL6WU_MIN_ELEMENTS ? ' Yagi longa: estimativa conservadora.' : ''),
    source: `${YAGI_BAND_SOURCE}; gamma pelo Tolles`,
  });
}

/**
 * Impedância do excitado (dipolo simples) no modelo por momentos (band-model.ts: elementos soltos, sem boom, espaço livre).
 * TODO(fonte): não conferida com medida; o NBS TN 688 não dá a impedância e o DL6WU.BAS supõe dipolo dobrado.
 */
export function modelImpedanceEstimate(z0: Complex): Estimate {
  return {
    typical: z0.re,
    unit: 'Ω',
    note:
      `Excitado como dipolo simples, no modelo: ${formatNumber(z0.re, 0)} ${z0.im < 0 ? '−' : '+'} j${formatNumber(Math.abs(z0.im), 0)} Ω ` +
      '(espaço livre, sem boom). Precisa de casamento (hairpin, gamma) ou de dipolo dobrado com balun 4:1. Meça.',
    source: 'Momentos desta ferramenta; impedância não conferida com medida',
  };
}

/**
 * Ganho pelo modelo por momentos onde o método não o estima (DL6WU com boom abaixo de 2,2λ). O modelo fica a ≤ 0,7 dB do ganho
 * medido dos projetos do NBS TN 688 e a ≤ 0,9 dB da estimativa do DL6WU na faixa dele (pattern-model.test.ts).
 */
export function modelGainEstimate(directivity: number): Estimate {
  return {
    typical: 10 * Math.log10(directivity),
    unit: 'dBi',
    note:
      'Diretividade do modelo por momentos (espaço livre, sem boom, sem perdas): o DL6WU não estima ganho com boom abaixo de 2,2λ. ' +
      'O real fica um pouco abaixo.',
    source: 'Momentos desta ferramenta, conferido com o ganho medido do NBS TN 688 (≤ 0,7 dB) e com o DL6WU (≤ 0,9 dB)',
  };
}

/** Momentos: core/mom.ts, sem boom. Q: Yaghjian e Best, IEEE Trans. Antennas Propag., 2005 (fórmulas via arXiv 1909.08019). */
export const YAGI_BAND_SOURCE = 'Momentos sem boom (conferido com o ganho medido do NBS TN 688) e Q de Yaghjian e Best (IEEE, 2005)';

/** Banda de ROE < 2:1 com casamento ideal em f0, pelo Q do excitado; para Yagis longas o Q é conservador (teste de band-model). */
export function yagiBandwidth(elements: readonly YagiElement[], diameterM: number, f0: number): Estimate {
  const { z0, q } = yagiQ(elements, diameterM, f0);
  const direct = Math.max(z0.re / 50, 50 / z0.re);
  const long = elements.length >= DL6WU_MIN_ELEMENTS;
  return qBandwidthEstimate(f0, q, {
    // A rede de casamento ideal não tem perdas nem banda própria. Espaço livre, condutor perfeito, sem boom. Em Yagis longas a
    // impedância ondula e a varredura do modelo dá mais banda que o Q; ganho e F/C dentro da faixa não foram calculados.
    note:
      `Direto em 50 Ω (R ≈ ${formatNumber(z0.re, 0)} Ω) a ROE mínima seria ≈ ${formatNumber(direct, 1)}:1; gamma e hairpin estreitam um pouco.` +
      (long ? ' Yagi longa: estimativa conservadora.' : ''),
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
        'λ/2 × K (K do diâmetro, como no dipolo isolado) como ponto de partida: os elementos vizinhos mudam a ressonância. Corte comprido e ajuste medindo a ROE. Para o hairpin, use a ferramenta "Hairpin".',
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

// TODO(fonte) [guide.md]: o gamma (Tolles, Ham Radio, maio de 1973, com o excitado e a impedância do modelo por momentos) não foi
// conferido com medida numa Yagi construída por esta ferramenta.
