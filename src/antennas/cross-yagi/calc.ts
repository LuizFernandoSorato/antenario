/**
 * Cross Yagi: dois Yagis idênticos no mesmo boom, girados 90° um do outro, com os elementos cruzados nas mesmas posições
 * (no mesmo plano). O Yagi A liga direto na junção e o Yagi B por uma linha de 1/4 de onda, que o atrasa 90°.
 *
 * Fontes:
 *  - Montagem, 436,5 MHz, Yagis de 100 Ω em paralelo (≈ 50 Ω), linha de 113 mm de coaxial de 100 Ω, ROE ≈ 1,1: LY3H,
 *    "UHF 9V + 9H hand cross Yagi for satellite", https://www.ly3h.net/uhf-9v-9h-hand-cross-yagi-for-satellite/
 *    (consultada em 2026-10-19). A página NÃO traz as medidas dos elementos (estão em imagens) nem o diâmetro; por isso
 *    os elementos vêm do cálculo da Yagi (NBS TN 688 ou DL6WU), válido para qualquer frequência.
 *  - Quadratura por linha de 1/4 de onda: mesma derivação do turnstile (ver `turnstile/calc.ts`; Pozar, cap. 2):
 *    com Zq = Z do Yagi, as correntes têm o mesmo módulo e 90° de defasagem, e a junção fica em Z/2.
 *  - Transformador de 1/4 de onda: Zt = √(Z0·Zj) (CLAUDE.md; Pozar).
 *
 * Premissa de projeto: os dois Yagis são ortogonais, então o acoplamento mútuo é desprezado e cada um se comporta como
 * um Yagi isolado. O ganho circular (dBic) é o do Yagi isolado: a potência se divide meio a meio entre as duas
 * polarizações lineares e os campos se somam em potência, sem ganho nem perda extra no eixo (derivação, sem fonte
 * externa; vale com diagramas iguais e quadratura perfeita).
 */

import { type Complex, abs, complex } from '../../core/complex';
import { reflectionCoefficient, swrFromGamma } from '../../core/reflection';
import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { assertFactor, physicalLength, wavelength } from '../../core/wave';
import { inputImpedance } from '../../lines/transmission-line';
import { axialText, swrBandwidthEstimate } from '../bandwidth';
import { quadratureSweep } from '../quadrature-feed';
import { type AssemblyGuide, type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { quadratureFeed } from '../turnstile/calc';
import { yagiQ } from '../yagi/band-model';
import {
  DL6WU_MIN_ELEMENTS,
  GAMMA_LINE_OHMS,
  type YagiParams,
  designCalc,
  gammaFor,
  modelGainEstimate,
  usesGamma,
  defaultParams as yagiDefaults,
} from '../yagi/calc';
import { yagiElements } from '../yagi/elements';
import { RHCP, SENSE_NAME, type Sense, senseOf } from '../circular';
import { meta } from './meta';

export interface CrossYagiParams extends YagiParams {
  /** Só com `gammaMatch: 0` (código): impedância de cada Yagi no ponto de alimentação (Ω). Com o gamma, cada Yagi fica em 50 Ω. */
  yagiImpedance?: number;
  /** Fator de velocidade do coaxial defasador, em (0, 1]. */
  velocityFactor: number;
  /** Sentido da polarização circular: RHCP ou LHCP (ver `circular.ts`). */
  circularSense: number;
}

export const defaultParams: CrossYagiParams = {
  ...yagiDefaults,
  frequencyMHz: 436.5,
  elementDiameter: 0.0032,
  velocityFactor: 0.66,
  circularSense: RHCP,
};

/** Impedância do cabo até o rádio (Ω). */
export const SYSTEM_IMPEDANCE_OHMS = 50;

/** Varredura da banda: ±20 % em 60 passos, interpolada para 1201 pontos (o modelo equivalente é analítico, então é barato). */
const BAND_SWEEP = { span: 0.2, coarseSteps: 60, fineSteps: 1200 } as const;

/** Dentro desta tolerância relativa a junção já está em 50 Ω e o transformador não vale a pena. */
const NO_TRANSFORMER_TOLERANCE = 0.02;

/** Parâmetros do Yagi isolado, extraídos dos da cross Yagi. Cada gamma recebe metade da potência (a junção a divide meio a meio). */
function yagiParamsOf(p: CrossYagiParams): YagiParams {
  return {
    frequencyMHz: p.frequencyMHz,
    elementCount: p.elementCount,
    elementDiameter: p.elementDiameter,
    boomDiameter: p.boomDiameter,
    ...(p.drivenGap !== undefined ? { drivenGap: p.drivenGap } : {}),
    ...(p.method !== undefined ? { method: p.method } : {}),
    ...(p.gammaMatch !== undefined ? { gammaMatch: p.gammaMatch } : {}),
    ...(p.gammaRodDiameter !== undefined ? { gammaRodDiameter: p.gammaRodDiameter } : {}),
    ...(p.gammaSpacing !== undefined ? { gammaSpacing: p.gammaSpacing } : {}),
    ...(p.txPowerW !== undefined ? { txPowerW: p.txPowerW / 2 } : {}),
  };
}

export function calc(params: CrossYagiParams): CalcResult {
  const { frequencyMHz: f, velocityFactor: vf } = params;
  const sense = senseOf(params.circularSense);
  const gamma = usesGamma(params);
  assertFrequencyMHz(f);
  assertFactor(vf, 'O fator de velocidade');
  if (params.txPowerW !== undefined) assertPositive(params.txPowerW, 'A potência de transmissão');
  // Com o gamma, cada Yagi é casado a 50 Ω e a impedância informada não é usada.
  const zy = gamma ? GAMMA_LINE_OHMS : (params.yagiImpedance ?? Number.NaN);
  if (!gamma) assertPositive(zy, 'A impedância do Yagi');

  const yagiParams = yagiParamsOf(params);
  const yagi = designCalc(yagiParams);
  const fit = gamma ? gammaFor(yagiParams) : null;
  const quarter = physicalLength(0.25, f, vf);

  const feed = quadratureFeed(zy, zy);
  const zJunction = feed.feedImpedance.re;
  const needsTransformer = Math.abs(zJunction - SYSTEM_IMPEDANCE_OHMS) / SYSTEM_IMPEDANCE_OHMS > NO_TRANSFORMER_TOLERANCE;
  const zTransformer = Math.sqrt(SYSTEM_IMPEDANCE_OHMS * zJunction);
  const swrJunction = swrFromGamma(abs(reflectionCoefficient(complex(zJunction, 0), SYSTEM_IMPEDANCE_OHMS)));

  // Banda: cada Yagi como um circuito ressonante série de R = zy (o casamento que o usuário escolheu, ou o gamma) e o Q do modelo por
  // momentos da Yagi (yagi/band-model.ts; com o gamma, o Q na entrada dele, yagi/gamma-feed.ts), a junção pela linha de 1/4 de onda
  // (quadrature-feed.ts) e, se houver, o transformador T sem perdas.
  const isolated = params.boomDiameter === 0 ? yagi : designCalc({ ...yagiParams, boomDiameter: 0 });
  const elements = yagiElements(isolated);
  const model = yagiQ(elements, params.elementDiameter, f);
  const { directivity } = model;
  const q = fit?.matchedQ ?? model.q;
  const transformerLine = { z0: zTransformer, lengthM: wavelength(f) / 4, velocityFactor: 1 };
  const quad = quadratureSweep({
    centerMHz: f,
    ...BAND_SWEEP,
    impedanceAt: (fi) => complex(zy, zy * q * (fi / f - f / fi)),
    zLine: zy,
    ...(needsTransformer ? { afterJunction: (z: Complex, fi: number) => inputImpedance(z, transformerLine, fi) } : {}),
    referenceOhms: SYSTEM_IMPEDANCE_OHMS,
  });
  const spanPercent = BAND_SWEEP.span * 100;
  const bandwidth = swrBandwidthEstimate(quad.swr, {
    reference: 'em 50 Ω',
    spanPercent,
    // A ROE do conjunto é mais larga que a de um Yagi só: as reflexões dos dois chegam à junção com 180° de diferença e se cancelam.
    // Premissas: cada Yagi como circuito ressonante de zy com o Q do modelo, linhas sem perdas, acoplamento entre os Yagis desprezado.
    // Em Yagis longas o Q é conservador (a faixa de ROE do Yagi no modelo é maior).
    note:
      `${axialText(quad.axialBand, spanPercent)} Cada Yagi com Q ≈ ${formatNumber(q, 0)}` +
      (elements.length >= DL6WU_MIN_ELEMENTS ? ' (conservador em Yagi longa).' : '.'),
    source: 'Momentos + Q de Yaghjian e Best; linhas pela matriz ABCD (Pozar); razão axial < 3 dB: critério usual (IntechOpen)',
  });

  const measurements: Measurement[] = [
    ...yagi.measurements,
    {
      label: 'F',
      name: 'Linha defasadora (1/4 de onda de coaxial)',
      meters: quarter,
      description: `Coaxial de ${formatNumber(zy, 0)} Ω (igual à impedância do Yagi), entre a junção e o Yagi B. Meça sem a capa nas pontas.`,
    },
  ];
  if (needsTransformer) {
    measurements.push({
      label: 'T',
      name: 'Transformador de 1/4 de onda (junção → cabo)',
      meters: quarter,
      description: `Coaxial de ${formatNumber(zTransformer, 1)} Ω entre a junção (${formatNumber(zJunction, 1)} Ω) e o cabo de ${SYSTEM_IMPEDANCE_OHMS} Ω do rádio.`,
    });
  }
  // Não há coaxial comum de ≈ 35 Ω: dois de 75 Ω em paralelo (37,5 Ω) dão quase o mesmo; ROE pela fórmula do transformador, Z = Zt²/Zj.
  const paralleled75 = 75 / 2;
  const swrParalleled = swrFromGamma(abs(reflectionCoefficient(complex(paralleled75 ** 2 / zJunction, 0), SYSTEM_IMPEDANCE_OHMS)));

  const warnings: CalcWarning[] = yagi.warnings.filter((w) => !w.message.includes('fora da faixa de uso prático'));
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.unshift(outOfRange);
  if (vf < 0.6 || vf > 0.9) {
    warnings.push({
      level: 'warning',
      message:
        `Fator de velocidade ${formatNumber(vf, 2)} é incomum para coaxial (polietileno sólido ≈ 0,66; espuma 0,78 a 0,85). ` +
        'Confira o datasheet: o VF define a defasagem de 90°.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'O LY3H usa 113 mm a 436,5 MHz, o que corresponde a VF ≈ 0,66 (λ/4 no ar = 171,7 mm). Um comentário na página cita RG-62 com VF 0,83 e linha de ' +
        '142 mm; a página não resolve a divergência. Use o VF do SEU cabo e confira a defasagem medindo (ver o guia).',
    },
    {
      level: 'warning',
      message:
        `Impedância na junção ≈ ${formatNumber(zJunction, 1)} Ω (dois Yagis de ${formatNumber(zy, 0)} Ω, um deles por uma linha de ${formatNumber(zy, 0)} Ω). ` +
        (needsTransformer
          ? `Para ${SYSTEM_IMPEDANCE_OHMS} Ω é preciso o transformador T de ${formatNumber(zTransformer, 1)} Ω; ROE sem ele ≈ ${formatNumber(swrJunction, 2)}:1. `
          : 'Já casa com o cabo de 50 Ω, sem transformador. ') +
        (needsTransformer && Math.abs(zTransformer - paralleled75) / paralleled75 < 0.1
          ? `Não há coaxial comum de ${formatNumber(zTransformer, 0)} Ω: dois de 75 Ω em paralelo (37,5 Ω), do mesmo comprimento T, dão ROE ≈ ${formatNumber(swrParalleled, 2)}:1. `
          : '') +
        (gamma
          ? 'Cada Yagi é casado a 50 Ω pelo seu gamma: ajuste os dois separadamente, cada um com o outro no lugar, antes de ligar a junção.'
          : 'A impedância de cada Yagi é dado de entrada: o NBS e o DL6WU não a fornecem para o dipolo simples. Meça o seu Yagi isolado.'),
    },
    {
      level: 'warning',
      message:
        'A linha defasadora ideal tem impedância igual à de cada Yagi. Com outra impedância as correntes ficam desiguais e a polarização deixa de ' +
        'ser perfeitamente circular (a razão axial piora), mas continua útil na recepção de satélites.',
    },
    {
      level: 'warning',
      message: gamma
        ? 'Os elementos de um Yagi cruzam os do outro no centro do boom. Com o gamma os excitados são inteiros e o centro deles fica em potencial ' +
          'zero, como o dos parasitas: podem ir presos no boom metálico. Afaste só o necessário para cruzar; um deslocamento grande tira os ' +
          'elementos do mesmo plano e desfaz a defasagem calculada. As barras dos dois gammas não podem se tocar.'
        : 'Os elementos de um Yagi cruzam os do outro no centro do boom: isole um do outro (os elementos excitados não podem se tocar). ' +
          'Afaste poucos milímetros, o suficiente para isolar; um deslocamento grande tira os elementos do mesmo plano e desfaz a defasagem calculada.',
    },
    ...(gamma
      ? [
          {
            level: 'info' as const,
            message:
              'Cada gamma recebe metade da potência: a tensão no capacitor mostrada já está calculada assim. Os dois gammas devem ser iguais ' +
              '(mesma barra, ponte e capacitor), senão as correntes dos dois Yagis ficam desiguais e a polarização deixa de ser circular.',
          },
        ]
      : []),
    {
      level: 'info',
      message:
        `Montagem para ${SENSE_NAME[sense]}: veja o método de montagem e o diagrama de polaridade (a posição dos braços vivos dos excitados define o sentido). ` +
        'A regra vem da derivação do atraso de fase (Ey atrasado 90° em relação a Ex, com z na direção de propagação), não de uma fonte escrita. ' +
        'Satélites meteorológicos de 137 MHz usam RHCP; para os outros, confirme o sentido do SEU satélite. Confirme no ar, com um passe real.',
    },
    {
      level: 'info',
      message:
        'Uma antena circular recebe sinal linear com 3 dB de perda, e a circular de sentido contrário com perda muito alta. ' +
        'O ganho em dBic é igual ao ganho do Yagi isolado em dBi.',
    },
    {
      level: 'info',
      message:
        'O diagrama de irradiação é calculado por método dos momentos (um Yagi, somado ao outro girado 90° e defasado de −90°, sem acoplamento entre eles). ' +
        'Fora dos planos de simetria os dois campos não ficam em quadratura perfeita: a polarização é circular no eixo e elíptica fora dele.',
    },
  );

  const designGain = yagi.expected.gain;
  const yagiGain = designGain && designGain.typical === undefined ? modelGainEstimate(directivity) : designGain;
  return {
    measurements,
    assumptions: [
      ...yagi.assumptions,
      { name: 'Montagem', value: 'Dois Yagis idênticos girados 90°, elementos cruzados nas mesmas posições (mesmo plano)', source: 'LY3H; pedido do projeto' },
      { name: 'Sentido da polarização', value: SENSE_NAME[sense], source: 'Dado do usuário; convenção IEEE Std 145 (ver core/polarization.ts)' },
      gamma
        ? { name: 'Impedância de cada Yagi', value: `${formatNumber(zy, 1)} Ω, pelo gamma de cada um`, source: 'Projeto do gamma (Tolles); meça e ajuste' }
        : { name: 'Impedância de cada Yagi', value: `${formatNumber(zy, 1)} Ω`, source: 'Dado do usuário (LY3H mediu 100 Ω); meça' },
      { name: 'Impedância da linha defasadora', value: `${formatNumber(zy, 1)} Ω (igual à do Yagi)`, source: 'Derivação por linha de 1/4 de onda (Pozar)' },
      { name: 'Fator de velocidade do coaxial (VF)', value: formatNumber(vf, 3), source: 'Dado do usuário; datasheet do cabo' },
      { name: 'Defasagem', value: '90° (linha de 1/4 de onda)', source: 'Derivação (Pozar); LY3H' },
      ...(needsTransformer
        ? [{ name: 'Transformador de 1/4 de onda', value: `${formatNumber(zTransformer, 1)} Ω, ${formatNumber(quarter * 1000, 1)} mm`, source: 'Zt = √(Z0·Zj) (CLAUDE.md; Pozar)' }]
        : []),
      // TODO(fonte): efeito real do cruzamento.
      { name: 'Acoplamento entre os Yagis', value: 'Desprezado (elementos ortogonais)', source: 'Premissa' },
    ],
    expected: {
      impedance: {
        typical: zJunction,
        unit: 'Ω',
        note:
          `Dois Yagis de ${formatNumber(zy, 0)} Ω${gamma ? ' (cada um pelo seu gamma)' : ''} em paralelo, um deles por linha de 1/4 de onda de ${formatNumber(zy, 0)} Ω` +
          (needsTransformer ? `; depois do transformador T, ${SYSTEM_IMPEDANCE_OHMS} Ω` : '') +
          '. O LY3H mediu ROE ≈ 1,1 em 436,5 MHz com 100 Ω por Yagi.',
        source: gamma ? 'Derivação de linhas (Pozar); gamma pelo Tolles (Ham Radio, 1973)' : 'Derivação de linhas (Pozar); LY3H (ROE medida)',
      },
      gain: {
        ...(yagiGain.typical !== undefined ? { typical: yagiGain.typical } : {}),
        unit: 'dBic',
        note:
          'Ganho circular no eixo ≈ ganho do Yagi isolado (dBi do Yagi = dBic da cross Yagi, com quadratura perfeita). ' + yagiGain.note,
        source: `Derivação (potência dividida entre as polarizações); ${yagiGain.source}`,
      },
      bandwidth,
    },
    warnings,
    assembly: assemblyFor(sense, gamma),
    ...(yagi.matching
      ? {
          matching: {
            title: 'Gamma match (um em cada Yagi): montagem e ajuste',
            steps: [
              'Os dois Yagis levam gammas IGUAIS (mesma barra, espaçamento, ponte e capacitor); as medidas abaixo valem para cada um.',
              ...yagi.matching.steps,
            ],
          },
        }
      : {}),
  };
}

/** Método de montagem para o sentido pedido: posição do braço vivo do excitado do Yagi B em relação ao do Yagi A, vista de trás. */
function assemblyFor(sense: Sense, gamma: boolean): AssemblyGuide {
  const right = sense === 'rhcp';
  return {
    title: `Montagem para ${SENSE_NAME[sense]}`,
    steps: [
      gamma
        ? 'Com o gamma, o "braço vivo" de cada excitado é a metade ao lado da qual corre a barra do gamma (ela leva o vivo do coaxial). Os dois Yagis são idênticos.'
        : 'Marque em cada elemento excitado qual braço vai ao condutor central do coaxial (braço vivo) e qual vai à malha. Os dois Yagis são idênticos.',
      'Yagi A (direto): excitado ligado direto na junção. Yagi B (atrasado): excitado ligado à junção pela linha F, de 1/4 de onda.',
      'Posicione o Yagi A com os elementos na horizontal e o braço vivo do excitado para CIMA.',
      `Olhando de TRÁS da antena (do lado dos refletores) para a FRENTE, na direção do feixe, gire o Yagi B 90° em torno do boom até que o braço vivo do excitado dele fique ${right ? 'à DIREITA (3 horas), no sentido HORÁRIO' : 'à ESQUERDA (9 horas), no sentido ANTI-HORÁRIO'} do braço vivo do A.`,
      `Por quê: o campo gira do Yagi adiantado (A) para o atrasado (B); girando no sentido ${right ? 'horário' : 'anti-horário'} visto na direção do feixe, a onda é ${right ? 'RHCP' : 'LHCP'} (IEEE Std 145).`,
      gamma
        ? `Para trocar para ${right ? 'LHCP' : 'RHCP'} sem refazer a montagem: passe o gamma do Yagi B para a outra metade do excitado (ou troque qual Yagi recebe a linha F).`
        : `Para trocar para ${right ? 'LHCP' : 'RHCP'} sem refazer a montagem: inverta vivo e malha do excitado do Yagi B (ou troque qual Yagi recebe a linha F).`,
      // TODO(fonte): fonte pendente para o texto abaixo.
      'Confirme com um passe real: o sentido contrário perde muito sinal. Esta derivação não foi conferida com medida.',
    ],
  };
}

// TODO(fonte) [guide.md]: fonte pendente: «(TODO(fonte)). Satélites meteorológicos de 137 MHz usam RHCP; confirme o sentido do seu sa…»
