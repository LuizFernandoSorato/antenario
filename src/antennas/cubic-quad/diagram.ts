/**
 * Diagramas da quadra cúbica: vista de frente (espiras quadradas sobre varetas cruzadas,
 * em escala relativa) e vista lateral com o boom e o espaçamento.
 */

import { formatLength, formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { type Diagram, circle, dimLabel, dimension, line, measure, rect, svgDoc, text } from '../diagram-kit';
import { boomPatternPlots } from '../mom-kit';
import type { CalcResult } from '../types';
import { solveQuad } from './pattern-model';
import type { CubicQuadParams } from './calc';

function frontView(result: CalcResult, params: CubicQuadParams): Diagram {
  const id = 'cq-front';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const hasDirector = params.directorCount > 0;
  const sideR = measure(result, 'A');
  const scale = 230 / sideR; // lado do refletor = 230 px
  const cx = 250;
  const cy = 200;
  const half = (side: number) => (side * scale) / 2;
  const hr = half(sideR);
  const hd = half(measure(result, 'B'));
  const hdir = hasDirector ? half(measure(result, 'C')) : 0;
  const hasGap = result.measurements.some((m) => m.label === 'K');

  const square = (h: number, cls: string) => rect(cx - h, cy - h, 2 * h, 2 * h, cls);
  const body = [
    // Varetas cruzadas (diagonais).
    line(cx - hr, cy - hr, cx + hr, cy + hr, 'dg-mast'),
    line(cx - hr, cy + hr, cx + hr, cy - hr, 'dg-mast'),
    // Espiras (a do refletor atrás, em tracejado fino; a de frente é a excitada ou o diretor).
    square(hr, 'dg-ext'),
    square(hd, 'dg-conductor'),
    hasDirector ? square(hdir, 'dg-ext') : '',
    circle(cx, cy, 5, 'dg-connector'),
    // Alimentação: no meio do lado de baixo (polarização horizontal).
    rect(cx - 6, cy + hd - 4, 12, 8, 'dg-connector', 1),
    text(cx + 14, cy + hd + 16, 'alimentação (meio do lado de baixo)', 'dg-note'),
    // Cotas.
    dimension(id, cx - hr, cy + hr, cx + hr, cy + hr, 38, dimLabel(result, 'A', res)),
    dimension(id, cx - hd, cy - hr, cx + hd, cy - hr, -22, dimLabel(result, 'B', res)),
    hasDirector ? dimension(id, cx + hr, cy - hdir, cx + hr, cy + hdir, -34, dimLabel(result, 'C', res), { anchor: 'start' }) : '',
    text(cx - hr - 6, cy - hr + 12, `E = ${formatLength(measure(result, 'E'), res)}`, 'dg-label', 'end'),
    text(20, 400, 'Fio (perímetro): ' + ['G', 'H', ...(hasDirector ? ['I'] : [])].map((l) => dimLabel(result, l, res)).join('   '), 'dg-label'),
    hasGap
      ? text(20, 420, `Excitada aberta embaixo: fio a cortar ${dimLabel(result, 'J', res)}, espaço ${dimLabel(result, 'K', res)}`, 'dg-label')
      : '',
  ].join('');

  return {
    id,
    title: 'Vista de frente',
    caption:
      'Espiras quadradas de perímetro cerca de uma onda, presas em duas varetas cruzadas (spreaders, E). ' +
      'A: lado do refletor (a maior espira). B: lado da espira excitada. G, H, I: fio do refletor, da excitada e dos diretores. ' +
      `${hasDirector ? 'C: lado dos diretores (a menor). ' : ''}Os tamanhos relativos estão em escala; as diferenças entre as espiras são pequenas.` +
      (hasGap ? ' J: fio a cortar da excitada (H menos o espaço K de alimentação).' : ''),
    svg: svgDoc(id, 560, hasGap ? 440 : 420, 'Quadra cúbica: vista de frente', 'Espiras quadradas concêntricas montadas em varetas cruzadas, alimentadas no meio do lado de baixo.', body),
  };
}

function sideView(result: CalcResult, params: CubicQuadParams): Diagram {
  const id = 'cq-side';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const elements = 2 + params.directorCount;
  const boom = measure(result, 'F');
  const spacing = measure(result, 'D');
  const scale = Math.min(520 / boom, 400); // px por metro
  const x0 = 50;
  const y = 150;
  const side = measure(result, 'A') * scale;
  const xs = Array.from({ length: elements }, (_, i) => x0 + i * spacing * scale);
  const names = ['refletor', 'excitada', ...Array.from({ length: params.directorCount }, (_, i) => `diretor ${i + 1}`)];

  const parts: string[] = [rect(x0 - 8, y - 3, xs[elements - 1]! - x0 + 16, 6, 'dg-mast', 1)];
  xs.forEach((x, i) => {
    const h = (i === 0 ? side : i === 1 ? measure(result, 'B') * scale : measure(result, 'C') * scale) / 2;
    parts.push(line(x, y - h, x, y + h, i === 1 ? 'dg-conductor' : 'dg-ext'));
    parts.push(text(x, y - Math.max(h, 20) - 10, names[i]!, 'dg-note', 'middle'));
  });
  parts.push(
    dimension(id, xs[0]!, y + side / 2 + 4, xs[1]!, y + side / 2 + 4, 16, dimLabel(result, 'D', res)),
    dimension(id, xs[0]!, y + side / 2 + 44, xs[elements - 1]!, y + side / 2 + 44, 16, dimLabel(result, 'F', res)),
    text(xs[elements - 1]! + 14, y + 4, 'frente →', 'dg-note'),
  );

  return {
    id,
    title: 'Vista lateral',
    caption: 'Boom com as espiras de perfil, em escala. D: espaçamento entre elementos. F: comprimento do boom, entre as espiras das pontas.',
    svg: svgDoc(
      id,
      640,
      Math.round(y + side / 2 + 110),
      'Quadra cúbica: vista lateral',
      'Boom com refletor, espira excitada e diretores, vistos de lado.',
      parts.join(''),
    ),
  };
}

export function diagrams(result: CalcResult, params: CubicQuadParams): Diagram[] {
  return [frontView(result, params), sideView(result, params), ...patterns(result, params)];
}

/**
 * Padrões da quadra por método dos momentos (ver `pattern-model.ts`): as correntes induzidas nas espiras do refletor e dos
 * diretores saem do cálculo. Espiras do diâmetro de fio informado, espaço livre, sem varetas nem boom.
 */
function patterns(result: CalcResult, params: CubicQuadParams): Diagram[] {
  const solution = solveQuad(result, params.frequencyMHz, params.directorCount, params.wireDiameter);
  return boomPatternPlots({
    idPrefix: 'quad',
    power: solution.power,
    directivity: solution.directivity([0, 0, 1]),
    modelNote:
      `Calculado por método dos momentos com espiras de fio de ${formatNumber(params.wireDiameter * 1000, 1)} mm, no espaço livre, sem varetas nem boom. ` +
      'A relação frente–costas depende muito do comprimento do refletor: o perímetro do ARRL (1030/f) dá o ganho máximo, e um refletor ' +
      'um pouco maior (≈ 3 % a mais) melhora bastante a relação frente–costas, perdendo menos de 1 dB de ganho (varredura no modelo).',
  });
}
