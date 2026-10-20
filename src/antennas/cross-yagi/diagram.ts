/**
 * Diagramas da cross Yagi: vista de lado de um dos Yagis (reaproveita a da Yagi), vista pela frente (elementos
 * cruzados no mesmo plano) e esquema de alimentação (Yagi A direto, Yagi B pela linha defasadora F).
 */

import { combinedPower, directivityOf } from '../../core/mom';
import { lengthResolutionForFrequency } from '../../core/units';
import { type Diagram, circle, dimLabel, dimension, line, measure, rect, svgDoc, text } from '../diagram-kit';
import type { CalcResult } from '../types';
import { armPolarityDiagram, senseOf } from '../circular';
import { boomPatternPlots } from '../mom-kit';
import { topView as yagiTopView } from '../yagi/diagram';
import { isolatedElements, solveYagi } from '../yagi/pattern-model';
import type { CrossYagiParams } from './calc';

function sideView(result: CalcResult, params: CrossYagiParams): Diagram {
  const base = yagiTopView(result, params);
  return {
    ...base,
    id: 'cy-side',
    title: 'Vista de lado de um dos Yagis (em escala)',
    caption:
      base.caption +
      ' O outro Yagi é idêntico, girado 90° em torno do boom, com os elementos nas mesmas posições (mesmo plano).',
    svg: base.svg.replaceAll('yg-top', 'cy-side'),
  };
}

function frontView(result: CalcResult, params: CrossYagiParams): Diagram {
  const id = 'cy-front';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const r = measure(result, 'R');
  const de = measure(result, 'DE');
  const scale = 280 / r; // px por metro
  const cx = 310;
  const cy = 190;
  const hr = (r * scale) / 2;
  const hd = (de * scale) / 2;
  const parts: string[] = [];
  // Yagi A (horizontal) e Yagi B (vertical), vistos de frente. O refletor é o elemento mais comprido.
  parts.push(line(cx - hr, cy, cx + hr, cy, 'dg-conductor'), line(cx, cy - hr, cx, cy + hr, 'dg-conductor'));
  parts.push(line(cx - hd, cy + 6, cx + hd, cy + 6, 'dg-ext'), line(cx + 6, cy - hd, cx + 6, cy + hd, 'dg-ext'));
  parts.push(circle(cx, cy, 5, 'dg-connector'), rect(cx - 3, cy - 3, 6, 6, 'dg-mast', 1));
  parts.push(text(cx + hr + 8, cy + 4, 'Yagi A (direto)', 'dg-note'));
  parts.push(text(cx + 10, cy - hr - 6, 'Yagi B (pela linha F)', 'dg-note'));
  parts.push(text(cx + 14, cy + 24, 'centro: isole um Yagi do outro', 'dg-note'));
  parts.push(dimension(id, cx - hr, cy, cx + hr, cy, 44, dimLabel(result, 'R', res)));
  parts.push(dimension(id, cx - hd, cy + 6, cx + hd, cy + 6, -44, dimLabel(result, 'DE', res), { labelGap: 4 }));

  return {
    id,
    title: 'Vista pela frente (elementos no mesmo plano)',
    caption:
      'Vista de trás para a frente: os elementos de A e de B se cruzam no mesmo plano, no centro do boom. R: refletor (o mais comprido); ' +
      'DE: elemento excitado. Cada posição do boom tem um elemento horizontal e um vertical. O sentido da polarização (RHCP ou LHCP) ' +
      'depende da posição dos braços vivos dos excitados: veja o diagrama de polaridade.',
    svg: svgDoc(
      id,
      640,
      Math.round(cy + hr + 50),
      'Cross Yagi: vista pela frente',
      'Dois Yagis girados 90° com os elementos cruzados no mesmo plano, vistos de frente, com as cotas do refletor e do excitado.',
      parts.join(''),
    ),
  };
}

function feed(result: CalcResult, params: CrossYagiParams): Diagram {
  const id = 'cy-feed';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const hasT = result.measurements.some((m) => m.label === 'T');
  const parts: string[] = [];
  const jx = hasT ? 260 : 200;
  parts.push(line(40, 110, jx, 110, 'dg-coax'), text(40, 98, 'para o rádio (com choke)', 'dg-note'));
  if (hasT) {
    parts.push(rect(100, 96, 120, 28, 'dg-ext', 3), text(160, 115, dimLabel(result, 'T', res), 'dg-label', 'middle'));
  }
  parts.push(circle(jx, 110, 4, 'dg-connector'), text(jx, 138, 'junção', 'dg-note', 'middle'));
  parts.push(line(jx, 110, jx, 50, 'dg-coax'), line(jx, 50, 470, 50, 'dg-coax'));
  parts.push(rect(470, 36, 110, 28, 'dg-connector', 3), text(525, 55, 'Yagi A', 'dg-label', 'middle'));
  parts.push(line(jx, 110, jx, 170, 'dg-coax'), line(jx, 170, 320, 170, 'dg-coax'));
  parts.push(rect(320, 156, 150, 28, 'dg-ext', 3), text(395, 175, dimLabel(result, 'F', res), 'dg-label', 'middle'));
  parts.push(line(470, 170, 480, 170, 'dg-coax'));
  parts.push(rect(480, 156, 100, 28, 'dg-connector', 3), text(530, 175, 'Yagi B', 'dg-label', 'middle'));
  parts.push(text(320, 215, 'I(B) = I(A) com −90° (linha F com a mesma impedância do Yagi)', 'dg-note', 'middle'));

  return {
    id,
    title: 'Alimentação (esquema)',
    caption:
      'O Yagi A liga direto na junção; o Yagi B, por um coaxial de 1/4 de onda (F), que atrasa a corrente em 90°. ' +
      (hasT
        ? 'T: transformador de 1/4 de onda entre a junção e o cabo de 50 Ω. '
        : 'Com Yagis de 100 Ω, a junção já fica em 50 Ω e não precisa de transformador (cota T). ') +
      'Esquema: a ligação de vivo e malha (balun/choke) de cada Yagi depende da montagem.',
    svg: svgDoc(
      id,
      640,
      240,
      'Cross Yagi: alimentação',
      'Um Yagi ligado direto na junção e o outro por uma linha de 1/4 de onda.',
      parts.join(''),
    ),
  };
}

export function diagrams(result: CalcResult, params: CrossYagiParams): Diagram[] {
  const polarity = armPolarityDiagram({
    id: 'cy-polarity',
    sense: senseOf(params.circularSense),
    viewText: 'de trás da antena (lado dos refletores) para a frente, na direção do feixe',
    directName: 'Yagi A (direto)',
    delayedName: 'Yagi B (linha F)',
  });
  return [sideView(result, params), frontView(result, params), feed(result, params), polarity, ...patterns(params)];
}

/**
 * Padrão da cross Yagi: o Yagi A (elementos ao longo de x) e o Yagi B (o mesmo, girado 90° em torno do boom, z) somados com
 * a defasagem de −90° da linha F e a mesma amplitude de corrente no excitado (linha com a impedância do Yagi).
 * Acoplamento entre os Yagis desprezado (elementos ortogonais). Ver `yagi/pattern-model.ts`.
 */
function patterns(params: CrossYagiParams): Diagram[] {
  const a = solveYagi(isolatedElements(params), params);
  const b = a.rotated(([x, y, z]) => [-y, x, z]);
  const power = combinedPower([
    { solution: a, factor: { re: 1, im: 0 } },
    { solution: b, factor: { re: 0, im: -1 } },
  ]);
  return boomPatternPlots({
    idPrefix: 'cross-yagi',
    power,
    directivity: directivityOf(power, [0, 0, 1]),
    crossed: true,
    modelNote:
      'Calculado por método dos momentos para um Yagi (fio fino, espaço livre, sem boom, sem perdas) e somado com o Yagi girado 90° e ' +
      'defasado de −90°, sem acoplamento entre eles. O valor em dBi aqui é a diretividade total (as duas polarizações), ou seja, o ganho ' +
      'circular em dBic.',
  });
}
