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
import { bandText, swrBandwidthEstimate } from '../bandwidth';
import { quadratureSweep } from '../quadrature-feed';
import { type AssemblyGuide, type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { quadratureFeed } from '../turnstile/calc';
import { yagiQ } from '../yagi/band-model';
import { YAGI_BAND_SOURCE, type YagiParams, designCalc, defaultParams as yagiDefaults } from '../yagi/calc';
import { yagiElements } from '../yagi/elements';
import { RHCP, SENSE_NAME, type Sense, senseOf } from '../circular';
import { meta } from './meta';

export interface CrossYagiParams extends YagiParams {
  /** Impedância de cada Yagi no ponto de alimentação (Ω). */
  yagiImpedance: number;
  /** Fator de velocidade do coaxial defasador, em (0, 1]. */
  velocityFactor: number;
  /** Sentido da polarização circular: RHCP ou LHCP (ver `circular.ts`). */
  circularSense: number;
}

export const defaultParams: CrossYagiParams = {
  ...yagiDefaults,
  frequencyMHz: 436.5,
  elementDiameter: 0.0032,
  yagiImpedance: 100,
  velocityFactor: 0.66,
  circularSense: RHCP,
};

/** Impedância do cabo até o rádio (Ω). */
export const SYSTEM_IMPEDANCE_OHMS = 50;

/** Varredura da banda: ±20 % em 60 passos, interpolada para 1201 pontos (o modelo equivalente é analítico, então é barato). */
const BAND_SWEEP = { span: 0.2, coarseSteps: 60, fineSteps: 1200 } as const;

/** Dentro desta tolerância relativa a junção já está em 50 Ω e o transformador não vale a pena. */
const NO_TRANSFORMER_TOLERANCE = 0.02;

/** Parâmetros do Yagi isolado, extraídos dos da cross Yagi. */
function yagiParamsOf(p: CrossYagiParams): YagiParams {
  return {
    frequencyMHz: p.frequencyMHz,
    elementCount: p.elementCount,
    elementDiameter: p.elementDiameter,
    boomDiameter: p.boomDiameter,
    ...(p.drivenGap !== undefined ? { drivenGap: p.drivenGap } : {}),
    ...(p.method !== undefined ? { method: p.method } : {}),
  };
}

export function calc(params: CrossYagiParams): CalcResult {
  const { frequencyMHz: f, velocityFactor: vf, yagiImpedance: zy } = params;
  const sense = senseOf(params.circularSense);
  assertFrequencyMHz(f);
  assertFactor(vf, 'O fator de velocidade');
  assertPositive(zy, 'A impedância do Yagi');

  const yagiParams = yagiParamsOf(params);
  const yagi = designCalc(yagiParams);
  const quarter = physicalLength(0.25, f, vf);

  const feed = quadratureFeed(zy, zy);
  const zJunction = feed.feedImpedance.re;
  const needsTransformer = Math.abs(zJunction - SYSTEM_IMPEDANCE_OHMS) / SYSTEM_IMPEDANCE_OHMS > NO_TRANSFORMER_TOLERANCE;
  const zTransformer = Math.sqrt(SYSTEM_IMPEDANCE_OHMS * zJunction);
  const swrJunction = swrFromGamma(abs(reflectionCoefficient(complex(zJunction, 0), SYSTEM_IMPEDANCE_OHMS)));

  // Banda: cada Yagi como um circuito ressonante série de R = zy (o casamento que o usuário escolheu) e o Q do modelo por momentos da
  // Yagi (yagi/band-model.ts), a junção pela linha de 1/4 de onda (quadrature-feed.ts) e, se houver, o transformador T sem perdas.
  const isolated = params.boomDiameter === 0 ? yagi : designCalc({ ...yagiParams, boomDiameter: 0 });
  const elements = yagiElements(isolated);
  const { q } = yagiQ(elements, params.elementDiameter, f);
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
    note:
      `Mas a polarização só fica circular (razão axial < 3 dB: ${bandText(quad.axialBand, 'MHz', spanPercent)}) perto da frequência de projeto: ` +
      'fora dela a linha defasadora deixa de dar 90° e as correntes ficam desiguais. A ROE do conjunto é mais larga que a de um Yagi só porque as ' +
      'reflexões dos dois chegam à junção com 180° de diferença e se cancelam. ' +
      `Modelo: cada Yagi como circuito ressonante de ${formatNumber(zy, 0)} Ω com o Q do modelo por momentos (${formatNumber(q, 0)}), linhas sem perdas, ` +
      'acoplamento entre os Yagis desprezado.' +
      (elements.length >= 11 ? ' Em Yagis longas o Q é conservador (a faixa de ROE do Yagi no modelo é maior).' : ''),
    source: `${YAGI_BAND_SOURCE}; linhas pela matriz ABCD (Pozar); razão axial < 3 dB: critério usual (IntechOpen, fonte secundária)`,
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
        'A impedância de cada Yagi é dado de entrada: o NBS e o DL6WU não a fornecem para o dipolo simples. Meça o seu Yagi isolado.',
    },
    {
      level: 'warning',
      message:
        'A linha defasadora ideal tem impedância igual à de cada Yagi. Com outra impedância as correntes ficam desiguais e a polarização deixa de ' +
        'ser perfeitamente circular (a razão axial piora), mas continua útil na recepção de satélites.',
    },
    {
      level: 'warning',
      message:
        'Os elementos de um Yagi cruzam os do outro no centro do boom: isole um do outro (os elementos excitados não podem se tocar). ' +
        'Afaste poucos milímetros, o suficiente para isolar; um deslocamento grande tira os elementos do mesmo plano e desfaz a defasagem calculada.',
    },
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

  const yagiGain = yagi.expected.gain;
  return {
    measurements,
    assumptions: [
      ...yagi.assumptions,
      { name: 'Montagem', value: 'Dois Yagis idênticos girados 90°, elementos cruzados nas mesmas posições (mesmo plano)', source: 'LY3H; pedido do projeto' },
      { name: 'Sentido da polarização', value: SENSE_NAME[sense], source: 'Dado do usuário; convenção IEEE Std 145 (ver core/polarization.ts)' },
      { name: 'Impedância de cada Yagi', value: `${formatNumber(zy, 1)} Ω`, source: 'Dado do usuário (LY3H mediu 100 Ω); meça' },
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
          `Dois Yagis de ${formatNumber(zy, 0)} Ω em paralelo, um deles por linha de 1/4 de onda de ${formatNumber(zy, 0)} Ω` +
          (needsTransformer ? `; depois do transformador T, ${SYSTEM_IMPEDANCE_OHMS} Ω` : '') +
          '. O LY3H mediu ROE ≈ 1,1 em 436,5 MHz com 100 Ω por Yagi.',
        source: 'Derivação de linhas (Pozar); LY3H (ROE medida)',
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
    assembly: assemblyFor(sense),
  };
}

/** Método de montagem para o sentido pedido: posição do braço vivo do excitado do Yagi B em relação ao do Yagi A, vista de trás. */
function assemblyFor(sense: Sense): AssemblyGuide {
  const right = sense === 'rhcp';
  return {
    title: `Montagem para ${SENSE_NAME[sense]}`,
    steps: [
      'Marque em cada elemento excitado qual braço vai ao condutor central do coaxial (braço vivo) e qual vai à malha. Os dois Yagis são idênticos.',
      'Yagi A (direto): excitado ligado direto na junção. Yagi B (atrasado): excitado ligado à junção pela linha F, de 1/4 de onda.',
      'Posicione o Yagi A com os elementos na horizontal e o braço vivo do excitado para CIMA.',
      `Olhando de TRÁS da antena (do lado dos refletores) para a FRENTE, na direção do feixe, gire o Yagi B 90° em torno do boom até que o braço vivo do excitado dele fique ${right ? 'à DIREITA (3 horas), no sentido HORÁRIO' : 'à ESQUERDA (9 horas), no sentido ANTI-HORÁRIO'} do braço vivo do A.`,
      `Por quê: o campo gira do Yagi adiantado (A) para o atrasado (B); girando no sentido ${right ? 'horário' : 'anti-horário'} visto na direção do feixe, a onda é ${right ? 'RHCP' : 'LHCP'} (IEEE Std 145).`,
      `Para trocar para ${right ? 'LHCP' : 'RHCP'} sem refazer a montagem: inverta vivo e malha do excitado do Yagi B (ou troque qual Yagi recebe a linha F).`,
      // TODO(fonte): fonte pendente para o texto abaixo.
      'Confirme com um passe real: o sentido contrário perde muito sinal. Esta derivação não foi conferida com medida.',
    ],
  };
}

// TODO(fonte) [guide.md]: fonte pendente: «(TODO(fonte)). Satélites meteorológicos de 137 MHz usam RHCP; confirme o sentido do seu sa…»
