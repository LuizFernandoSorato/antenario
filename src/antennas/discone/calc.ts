/**
 * Discone: disco sobre cone, alimentados no vértice do cone.
 *
 * Medidas pela regra do λ/4 (decisão do usuário em 2026-10-28):
 * - ARRL Antenna Book, 21ª ed., p. 7-26, Fig 48 (D. Krupp, W8NWF): lateral do cone L = 246/f(MHz) pés (= λ/4 a 0,04 %)
 *   na menor frequência, diâmetro do disco de 0,67 a 0,70·L, diâmetro da base do cone igual a L (semiângulo de 30°),
 *   folga de 2 a 12 polegadas; "bom casamento com coaxial de 50 Ω" na faixa.
 * - K. Rothammel, "Antene" (trad. sérvia da 9ª ed. alemã), §25.1.4, p. 364–365, Fig. 25.5: D = λ/4 da maior onda, disco de
 *   0,7·D, faixa de 1:8 com ROE ≤ 1,5; o limite real fica ≈ 20 % abaixo da frequência de projeto. Exemplo com cabo de 60 Ω.
 * Diferença do S. Stearns (K6OIK, "All About the Discone Antenna", QEX jan/fev 2007), a base anterior: primeira ressonância
 * (R + L = λ/2) em 0,7 × a menor frequência, o que dá um cone ≈ 1,9 vez maior. O modelo por momentos desta ferramenta
 * (pattern-model.test.ts) dá, para a forma dos livros, ROE ≈ 11:1 em 50 Ω na menor frequência e < 2:1 a partir de ≈ 1,4 vez
 * ela: dito no aviso. Sem medida. Do Stearns ficaram a proporção da folga automática e a descrição da ROE com vales e picos.
 */

import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';
import { PATTERN_MULTIPLES, solveDiscone } from './pattern-model';

export interface DisconeParams {
  /** Menor frequência de operação, em MHz. */
  frequencyMHz: number;
  /** Número de hastes do cone (e do disco), se feitos de hastes. */
  rodCount: number;
  /** Diâmetro das hastes, em metros. */
  rodDiameter: number;
  /** Folga disco–cone, em metros; 0 ou omitido = automática (proporção do exemplo de Stearns). */
  centerGap?: number;
}

export const defaultParams: DisconeParams = {
  frequencyMHz: 100,
  rodCount: 8,
  rodDiameter: 0.004,
  centerGap: 0,
};

/** Lateral do cone = λ/4 na menor frequência (ARRL 21ª ed., Fig 48: 246/f pés; Rothammel, §25.1.4). */
export const SLANT_OVER_WAVELENGTH = 0.25;
/** Diâmetro do disco ÷ lateral do cone (Rothammel, §25.1.4: 0,7; ARRL 21ª ed., Fig 48: 0,67 a 0,70). */
export const DISC_OVER_SLANT = 0.7;
/** Semiângulo do cone, medido do eixo: a base tem diâmetro igual à lateral (ARRL 21ª ed., Fig 48), sen θ = 1/2. */
export const CONE_HALF_ANGLE_DEG = 30;
/** Folga entre o disco e o vértice do cone, como fração da lateral: exemplo de Stearns (QEX 2007), 11 mm para 270 mm. */
export const GAP_OVER_SLANT = 11 / 270;
/** Faixa citada pelo Rothammel (§25.1.4): 1:8 a partir da menor frequência. */
export const ROTHAMMEL_RANGE_RATIO = 8;

export function calc(params: DisconeParams): CalcResult {
  const { frequencyMHz: fLow, rodCount, rodDiameter } = params;
  const userGap = params.centerGap ?? 0;
  assertFrequencyMHz(fLow);
  assertPositive(rodDiameter, 'O diâmetro das hastes');
  if (!Number.isFinite(userGap) || userGap < 0) {
    throw new RangeError(`A folga deve ser ≥ 0 (recebido: ${userGap}).`);
  }
  if (!Number.isInteger(rodCount) || rodCount < 3) {
    throw new RangeError(`O número de hastes deve ser um inteiro ≥ 3 (recebido: ${rodCount}).`);
  }

  const lambda = wavelength(fLow);
  const theta = (CONE_HALF_ANGLE_DEG * Math.PI) / 180;
  const slant = SLANT_OVER_WAVELENGTH * lambda;
  const discRadius = (DISC_OVER_SLANT * slant) / 2;
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
  warnings.push(
    {
      level: 'warning',
      message:
        'A ROE de um discone oscila ao longo da banda (vales e picos), e os valores dependem da construção: meça. ' +
        'Os livros dão a antena como boa a partir da menor frequência (o Rothammel, até ≈ 20 % abaixo dela). No modelo por ' +
        'momentos desta ferramenta (8 hastes de 4 mm, sem medida), a ROE em 50 Ω é ≈ 11:1 na menor frequência e só fica ' +
        `abaixo de 2:1 a partir de ≈ 1,4 vez ela (aqui, ≈ ${formatNumber(1.4 * fLow, 0)} MHz). Se a ponta de baixo importa ` +
        'para transmitir, informe uma frequência menor que a desejada.',
    },
    {
      level: 'warning',
      message:
        (userGap > 0
          ? `A folga de ${formatNumber(gap * 1000, 1)} mm é a que você informou. `
          : `A folga de ${formatNumber(gap * 1000, 1)} mm segue a proporção do exemplo de Stearns (11 mm para um cone de 270 mm). `) +
        // TODO(fonte): regra geral da folga. O ARRL (21ª ed., p. 7-26) só dá a faixa de 2 a 12 polegadas e o Rothammel
        // (§25.1.4) um exemplo de 100 mm; a frase "A e E não a incluem" é a convenção desta ferramenta.
        'Não há regra geral para ela (o ARRL fala em 5 a 30 cm, maior nas antenas maiores), e A e E não a incluem ' +
        '(as medidas dos livros são das hastes). Ajuste medindo a ROE.',
    },
    {
      level: 'info',
      message:
        `Medidas pela regra do λ/4 do ARRL Antenna Book e do Rothammel. O artigo de Stearns (QEX 2007) dimensiona um cone ` +
        `≈ 1,9 vez maior, com a primeira ressonância em 0,7 × a menor frequência (aqui, lateral de ≈ ` +
        `${formatNumber(stearnsSlant(fLow) * 100, 0)} cm).`,
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

  // As mesmas soluções dos diagramas (cache em pattern-model.ts): o ganho não custa um segundo cálculo na página.
  const gains = PATTERN_MULTIPLES.map((k) => 10 * Math.log10(solveDiscone({ measurements }, rodCount, rodDiameter, fLow * k).maxDirectivity()));
  const listPt = (items: string[]) => `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;

  return {
    measurements,
    assumptions: [
      { name: 'Menor frequência de operação', value: `${formatNumber(fLow, 2)} MHz` },
      { name: 'Lateral do cone (L)', value: `λ/4 = ${formatNumber(slant, 3)} m`, source: 'ARRL Antenna Book 21ª ed., p. 7-26, Fig 48 (246/f pés); Rothammel, §25.1.4' },
      { name: 'Semiângulo do cone (θ)', value: `${CONE_HALF_ANGLE_DEG}° (base com diâmetro igual a L)`, source: 'ARRL Antenna Book 21ª ed., Fig 48' },
      { name: 'Diâmetro do disco', value: `${formatNumber(DISC_OVER_SLANT, 2)} × L`, source: 'Rothammel, §25.1.4 (0,7); ARRL, Fig 48 (0,67 a 0,70)' },
      { name: 'Hastes', value: `${rodCount} no cone e ${rodCount} no disco, de ${formatNumber(rodDiameter * 1000, 1)} mm (ou chapa)` },
    ],
    expected: {
      impedance: {
        typical: 50,
        unit: 'Ω',
        note:
          'O ARRL diz que casa bem com coaxial de 50 Ω na faixa; o Rothammel usa cabo de 60 Ω com ROE ≤ 1,5. A impedância ' +
          'varia com a frequência e a ROE tem vales e picos. Meça.',
        source: 'ARRL Antenna Book 21ª ed., p. 7-26; Rothammel, §25.1.4',
      },
      // Diretividade máxima do modelo por momentos (pattern-model.ts) nas frequências dos diagramas. TODO(fonte): sem medida.
      // O Rothammel dá ≈ 3 dB abaixo do dipolo, sem dizer em que frequência nem em que ângulo.
      gain: {
        min: Math.min(...gains),
        max: Math.max(...gains),
        unit: 'dBi',
        note:
          `Máximo do modelo em ${listPt(PATTERN_MULTIPLES.map((k) => `${k}×`))} a menor frequência: ` +
          `${listPt(gains.map((g) => formatNumber(g, 1)))} dBi. Acima de 1× o máximo pode ficar abaixo do horizonte.`,
        source: 'Momentos desta ferramenta (hastes, espaço livre, sem coaxial nem mastro); sem medida',
      },
      bandwidth: {
        min: fLow,
        max: ROTHAMMEL_RANGE_RATIO * fLow,
        unit: 'MHz',
        note:
          'Faixa de 1:8 com ROE ≤ 1,5 pelo Rothammel. No modelo desta ferramenta, ROE < 2:1 só a partir de ≈ 1,4 vez a ' +
          'menor frequência, com picos ao longo da banda. Meça.',
        source: 'Rothammel, §25.1.4; momentos desta ferramenta (8 hastes)',
      },
    },
    warnings,
  };
}

/** Lateral do cone pelo Stearns (QEX 2007, p. 40 e Eqs. 4 e 5, projeto de 50 Ω), só para comparação no aviso. */
function stearnsSlant(fLow: number): number {
  const theta = 2 * Math.atan(Math.exp(-50 / 60));
  return wavelength(0.7 * fLow) / 2 / (1 + 0.72 * Math.sin(theta));
}
