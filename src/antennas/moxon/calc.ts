/**
 * Moxon (retângulo de Moxon): excitado e refletor dobrados em U, com as pontas (caudas) frente a frente separadas por uma folga.
 *
 * Medidas pelas equações de L. B. Cebik, W4RNL ("Designing Moxon Rectangles by Equation and by Model"; ver `moxon-model.ts`),
 * em função do diâmetro do condutor em λ. Impedância, ganho, F/C, banda e padrões vêm do modelo por momentos, conferido com os
 * exemplos do próprio artigo.
 */

import { assertFrequencyMHz, assertPositive, formatEngineering, formatNumber } from '../../core/units';
import { wavelength } from '../../core/wave';
import { rangeText, widthText } from '../bandwidth';
import { type CalcResult, type CalcWarning, type Estimate, type Measurement, rangeWarning } from '../types';
import {
  MOXON_MAX_DIAMETER_LAMBDA,
  MOXON_MIN_DIAMETER_LAMBDA,
  SPAN,
  type MoxonDimensions,
  type MoxonModel,
  bandWidthMHz,
  moxonDimensionsLambda,
  moxonModel,
} from './moxon-model';
import { meta } from './meta';

const BAND_SPAN_PERCENT = SPAN * 100;

export interface MoxonParams {
  frequencyMHz: number;
  /** Diâmetro do condutor, em metros. */
  conductorDiameter: number;
  /** Espaço entre as metades do excitado no centro, em metros. */
  centerGap: number;
}

export const defaultParams: MoxonParams = {
  frequencyMHz: 145,
  conductorDiameter: 0.004,
  centerGap: 0.01,
};

/** Impedância do cabo de alimentação usada como referência da ROE. */
const FEED_OHMS = 50;
/**
 * Tolerância da folga C: no 2 m (146 MHz), "variações menores que 1/4 de polegada" (Cebik, "Building a 2-Meter Moxon").
 * Em λ: 0,00635 m / (299,792458/146) ≈ 0,0031 λ, escalada para outras frequências.
 */
const GAP_TOLERANCE_LAMBDA = (0.25 * 0.0254) / wavelength(146);

/** Dimensões em metros. */
export function dimensionsFor(params: MoxonParams): MoxonDimensions {
  const lambda = wavelength(params.frequencyMHz);
  const l = moxonDimensionsLambda(params.conductorDiameter / lambda);
  return { a: l.a * lambda, b: l.b * lambda, c: l.c * lambda, d: l.d * lambda, e: l.e * lambda };
}

export function modelFor(params: MoxonParams): MoxonModel {
  return moxonModel({
    frequencyMHz: params.frequencyMHz,
    dims: dimensionsFor(params),
    radiusM: params.conductorDiameter / 2,
    referenceOhms: FEED_OHMS,
  });
}

export function calc(params: MoxonParams): CalcResult {
  const { frequencyMHz: f, conductorDiameter: d, centerGap: gap } = params;
  assertFrequencyMHz(f);
  assertPositive(d, 'O diâmetro do condutor');
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError(`O espaço central deve ser ≥ 0 (recebido: ${gap}).`);
  }

  const lambda = wavelength(f);
  const dims = dimensionsFor(params);
  if (gap >= dims.a) {
    throw new RangeError('O espaço central é maior que a largura A da antena.');
  }
  const diameterLambda = d / lambda;
  const driver = dims.a + 2 * dims.b;
  const reflector = dims.a + 2 * dims.d;

  const measurements: Measurement[] = [
    { label: 'A', name: 'Largura', meters: dims.a, description: 'Lado a lado, entre os eixos dos fios. É igual no excitado e no refletor.' },
    { label: 'B', name: 'Cauda do excitado', meters: dims.b, description: 'Do canto até a ponta, em cada lado do excitado.' },
    { label: 'C', name: 'Folga entre as pontas', meters: dims.c, description: 'Entre a ponta da cauda do excitado e a do refletor. É a medida mais crítica.' },
    { label: 'D', name: 'Cauda do refletor', meters: dims.d, description: 'Do canto até a ponta, em cada lado do refletor.' },
    { label: 'E', name: 'Profundidade', meters: dims.e, description: 'De frente a trás, entre os eixos do excitado e do refletor (B + C + D).' },
    {
      label: 'F',
      name: 'Cada metade do excitado',
      meters: (driver - gap) / 2,
      description: '(A + 2B − H)/2: o fio de cada metade do excitado antes de dobrar, do centro até a ponta da cauda.',
    },
    { label: 'G', name: 'Refletor esticado', meters: reflector, description: 'A + 2D: o fio do refletor antes de dobrar (inteiro, sem corte).' },
  ];
  if (gap > 0) {
    measurements.push({ label: 'H', name: 'Espaço central', meters: gap, description: 'Entre as duas metades do excitado, no isolador de alimentação.' });
  }

  const model = modelFor(params);
  const b2 = model.band2;
  const unit: 'kHz' | 'MHz' = b2 && bandWidthMHz(b2) >= 1 ? 'MHz' : 'kHz';
  const modelSource =
    'Modelo desta ferramenta: método dos momentos no espaço livre (core/mom.ts), conferido com os exemplos NEC de L. B. Cebik, ' +
    'W4RNL, "Designing Moxon Rectangles by Equation and by Model".';
  const equationSource = 'L. B. Cebik, W4RNL, "Designing Moxon Rectangles by Equation and by Model" (AntenneX, 2000); MoxGen';

  const bandwidth: Estimate | null = b2
    ? {
        typical: bandWidthMHz(b2) * (unit === 'kHz' ? 1000 : 1),
        unit,
        // Espaço livre, condutor perfeito.
        note:
          `ROE < 2:1 em 50 Ω ${rangeText(b2, BAND_SPAN_PERCENT)}; < 1,5:1 em ${widthText(model.band15)}. ` +
          'A F/C máxima é estreita, mas a rejeição traseira segue boa na faixa (Cebik).',
        source: 'Momentos desta ferramenta; conferido com os exemplos NEC de Cebik, W4RNL, "Designing Moxon Rectangles…"',
      }
    : null;

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (diameterLambda < MOXON_MIN_DIAMETER_LAMBDA || diameterLambda > MOXON_MAX_DIAMETER_LAMBDA) {
    warnings.push({
      level: 'warning',
      message:
        `O condutor tem ${formatEngineering(diameterLambda, 'λ')} de diâmetro, fora da faixa das equações do Cebik (1e-5 a 1e-2 λ). ` +
        'As medidas são extrapoladas: confira a impedância e a F/C no modelo (diagramas) antes de construir.',
    });
  }
  const tolerance = GAP_TOLERANCE_LAMBDA * lambda;
  warnings.push(
    {
      level: 'warning',
      message:
        `A folga C é a medida mais crítica: mantenha-a a menos de ±${formatNumber(tolerance * 1000, 0)} mm do valor calculado ` +
        '(no 2 m, o Cebik pede menos de 1/4", aqui escalado para a frequência). Ela controla o acoplamento entre as pontas, ' +
        'que define a impedância e a rejeição traseira.',
    },
    {
      level: 'info',
      message:
        'As medidas são entre os eixos dos fios, com cantos vivos. Para dobrar vareta, use um curvador de tubo de cobre e ponha o ' +
        'meio da curva no ponto do canto: o Cebik obteve o mesmo resultado dos modelos de canto vivo.',
    },
    {
      level: 'warning',
      message:
        'O cálculo é no espaço livre e com condutor perfeito. O Cebik nota que antenas "fechadas" como a Moxon variam menos com a ' +
        'altura, mas o solo, o mastro e o suporte ainda mudam um pouco a ROE: meça na posição final.',
    },
    {
      level: 'info',
      message:
        'Alimente com coaxial de 50 Ω e um choke (balun de corrente 1:1) no ponto de alimentação; leve o cabo para trás, pelo ' +
        'meio da antena, longe das caudas.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: as pontas das caudas, dos dois lados da folga C, ficam em tensão alta de RF. Use um espaçador de material ' +
        'isolante que não absorva RF (o Cebik alerta que alguns plásticos mudam o acoplamento) e mantenha a antena fora do alcance de pessoas.',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Diâmetro do condutor', value: `${formatNumber(d * 1000, 2)} mm = ${formatEngineering(diameterLambda, 'λ')}` },
      {
        name: 'Medidas',
        value: 'Regressão do Cebik sobre modelos NEC (ganho 5,95–6,05 dBi, F/C > 35 dB, 50–54 Ω), uniforme no diâmetro',
        source: equationSource,
      },
      { name: 'Elementos', value: 'Mesmo diâmetro nos dois e em todo o comprimento (sem degraus de tubo)' },
      { name: 'Ambiente', value: 'Espaço livre, condutor perfeito, sem boom metálico nem suporte' },
    ],
    expected: {
      impedance: {
        typical: model.z.re,
        unit: 'Ω',
        note:
          `No modelo: ${formatNumber(model.z.re, 1)} ${model.z.im >= 0 ? '+' : '−'} j${formatNumber(Math.abs(model.z.im), 1)} Ω na ` +
          'frequência de projeto. Os modelos do Cebik que geraram as equações ficaram entre 50 e 54 Ω: casa direto com coaxial de 50 Ω.',
        source: modelSource,
      },
      gain: {
        typical: model.gainDbi,
        unit: 'dBi',
        note:
          `Diretividade no espaço livre, sem perdas, com F/C de ${formatNumber(model.frontToBackDb, 1)} dB a 180°. Com fio de cobre fino ` +
          'em HF a perda tira uns 0,2 dB (Cebik: 6,01 → 5,80 dBi com fio #12 em 7,15 MHz).',
        source: modelSource,
      },
      bandwidth,
    },
    warnings,
  };
}
