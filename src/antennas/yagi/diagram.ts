/**
 * Diagrama do Yagi: vista de cima, com o boom na horizontal e os elementos em escala
 * (posições e comprimentos proporcionais), cada um com a sua cota.
 */

import { esc, type Diagram, dimension, line, measure, rect, svgDoc, text } from '../diagram-kit';
import { formatLength, lengthResolutionForFrequency } from '../../core/units';
import type { CalcResult } from '../types';
import type { YagiParams } from './calc';
import { elementPositionsLambda } from './calc';
import { wavelength } from '../../core/wave';
import { boomPatternPlots } from '../mom-kit';
import { isolatedElements, solveYagi } from './pattern-model';

/** Texto girado -90° (lê de baixo para cima), ancorado em (x, y). */
function rotatedLabel(x: number, y: number, content: string, cls: string): string {
  return `<text transform="translate(${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}) rotate(-90)" class="${cls}">${esc(content)}</text>`;
}

export function topView(result: CalcResult, params: YagiParams): Diagram {
  const id = 'yg-top';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const lambda = wavelength(params.frequencyMHz);
  const directorLabels = result.measurements.filter((m) => /^D[0-9]+$/.test(m.label)).map((m) => m.label);
  const directorCount = directorLabels.length;
  const labels = ['R', 'DE', ...directorLabels];
  // Posições em λ a partir do refletor: tabela P1…Pn (DL6WU) ou espaçamento uniforme S (NBS).
  const explicit = result.measurements.filter((m) => /^P[0-9]+$/.test(m.label));
  const uniform = explicit.length === 0;
  const positions = uniform
    ? elementPositionsLambda(directorCount, measure(result, 'S') / lambda)
    : [0, measure(result, 'E') / lambda, ...explicit.map((m) => m.meters / lambda)];
  // Com muitos elementos os rótulos se sobrepõem; as medidas continuam na tabela.
  const showLabels = labels.length <= 24;

  const left = 50;
  const usable = 560;
  const scale = Math.min(usable / positions[positions.length - 1]!, 260); // px por λ
  const cy = 190;
  const boomY = cy;
  const xs = positions.map((p) => left + p * scale);

  const parts: string[] = [];
  // Boom (da posição do refletor até um pouco depois do último diretor).
  parts.push(rect(xs[0]! - 6, boomY - 3, xs[xs.length - 1]! - xs[0]! + 12, 6, 'dg-mast', 1));
  labels.forEach((label, i) => {
    const meters = measure(result, label);
    const half = (meters / lambda) * scale * 0.5;
    const cls = label === 'DE' ? 'dg-connector' : 'dg-conductor';
    parts.push(line(xs[i]!, cy - half, xs[i]!, cy + half, cls === 'dg-connector' ? 'dg-conductor' : cls));
    if (label === 'DE') parts.push(rect(xs[i]! - 4, cy - 7, 8, 14, 'dg-connector', 1));
    const topY = cy - (Math.max(...labels.map((l) => measure(result, l))) / lambda) * scale * 0.5 - 8;
    if (showLabels) parts.push(rotatedLabel(xs[i]! + 4, topY, `${label} = ${formatLength(meters, res)}`, 'dg-label'));
  });

  const baseY = cy + 80;
  parts.push(
    dimension(id, xs[0]!, baseY, xs[1]!, baseY, 14, `E = ${formatLength(measure(result, 'E'), res)}`),
    directorCount >= 1
      ? dimension(
          id,
          xs[1]!,
          baseY + 38,
          xs[2]!,
          baseY + 38,
          14,
          uniform
            ? `S = ${formatLength(measure(result, 'S'), res)}`
            : `1º diretor = ${formatLength((positions[2]! - positions[1]!) * lambda, res)}`,
          { labelDx: 0 },
        )
      : '',
    dimension(id, xs[0]!, baseY + 76, xs[xs.length - 1]!, baseY + 76, 14, `L = ${formatLength(measure(result, 'L'), res)}`),
    text(xs[xs.length - 1]! + 14, cy + 4, 'frente →', 'dg-note'),
    text(xs[0]! - 8, cy + 4, 'costas', 'dg-note', 'end'),
  );

  return {
    id,
    title: 'Vista de cima (em escala)',
    caption:
      'Boom na horizontal e elementos em escala. R: refletor (atrás). DE: elemento excitado, onde liga o cabo. ' +
      'D1, D2…: diretores, até a frente. As cotas dos elementos são o comprimento total, de ponta a ponta. ' +
      'E: refletor ao excitado. ' +
      (uniform
        ? 'S: espaçamento dos diretores. '
        : 'O espaçamento entre diretores cresce até o 14º; as posições P1, P2… (a partir do refletor) estão na tabela de medidas. ') +
      (showLabels ? '' : 'Com muitos elementos os rótulos de cada um ficam só na tabela. ') +
      'L: comprimento do boom.',
    svg: svgDoc(
      id,
      680,
      Math.round(baseY + 118),
      'Yagi: vista de cima',
      `Yagi de ${directorCount + 2} elementos: refletor, excitado e ${directorCount} diretores num boom.`,
      parts.join(''),
    ),
  };
}

/**
 * Padrões do Yagi por método dos momentos (ver `pattern-model.ts`). Validado contra o ganho medido dos seis projetos do NBS TN 688
 * (diferença de até 0,5 dB) e contra o estimador do DL6WU (até 0,6 dB). O cálculo da Yagi já limita o número de elementos ao do modelo.
 */
function patterns(_result: CalcResult, params: YagiParams): Diagram[] {
  const solution = solveYagi(isolatedElements(params), params);
  return boomPatternPlots({
    idPrefix: 'yagi',
    power: solution.power,
    directivity: solution.directivity([0, 0, 1]),
    modelNote:
      'Calculado por método dos momentos (fio fino, espaço livre, sem boom, sem perdas), com as correntes induzidas em cada elemento; ' +
      'o ganho medido de uma Yagi real fica um pouco abaixo. Ver o guia.',
  });
}

export function diagrams(result: CalcResult, params: YagiParams): Diagram[] {
  return [topView(result, params), ...patterns(result, params)];
}
