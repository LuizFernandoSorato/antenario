/**
 * Diagrama do Yagi: vista de cima, com o boom na horizontal e os elementos em escala
 * (posições e comprimentos proporcionais), cada um com a sua cota.
 */

import { esc, type Diagram, circle, dimLabel, dimension, line, measure, rect, svgDoc, text } from '../diagram-kit';
import { formatLength, formatNumber, lengthResolutionForFrequency } from '../../core/units';
import type { CalcResult } from '../types';
import type { YagiParams } from './calc';
import { elementPositionsLambda, gammaFor } from './calc';
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
  // Excitado partido ao meio (espaço central): braços e espaço em texto, porque o espaço some na escala do desenho.
  const hasGap = result.measurements.some((m) => m.label === 'DG');
  if (hasGap) {
    parts.push(
      text(
        left,
        baseY + 118,
        `Excitado partido ao meio: cada braço DB = ${formatLength(measure(result, 'DB'), res)}, espaço central DG = ${formatLength(measure(result, 'DG'), res)}`,
        'dg-label',
      ),
    );
  }

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
      'L: comprimento do boom.' +
      (hasGap ? ' DB e DG: braço e espaço central do excitado (DE = 2·DB + DG).' : ''),
    svg: svgDoc(
      id,
      680,
      Math.round(baseY + (hasGap ? 136 : 118)),
      'Yagi: vista de cima',
      `Yagi de ${directorCount + 2} elementos: refletor, excitado e ${directorCount} diretores num boom.`,
      parts.join(''),
    ),
  };
}

/**
 * Detalhe do gamma match, visto de cima, FORA DE ESCALA (a barra é curta perto do elemento e o espaçamento some): excitado, barra,
 * ponte de curto, capacitor e conector, com as cotas GL, GS e GD. Só existe com o gamma (cota GL) e com o casamento fechado.
 */
export function gammaDetail(result: CalcResult, params: YagiParams): Diagram | null {
  const design = result.measurements.some((m) => m.label === 'GL') ? gammaFor(params).gamma.design : null;
  if (!design?.ok) return null;
  const id = 'yg-gamma';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const cx = 190; // centro do excitado (eixo do boom)
  const ey = 180; // eixo do excitado
  const ry = 110; // eixo da barra
  const capX = cx + 24; // início da barra, logo depois do boom; o capacitor fica no fio vertical acima dela
  const strapX = cx + 310; // meio da ponte de curto
  const conY = ry - 46; // conector, acima do capacitor
  const dimOffset = 46; // cota GL, abaixo do excitado
  const parts: string[] = [];
  parts.push(
    // Boom perpendicular ao excitado e o eixo do centro (origem da cota GL).
    rect(cx - 8, 34, 16, ey + dimOffset - 26, 'dg-mast', 1),
    text(cx, 26, 'boom', 'dg-note', 'middle'),
    line(cx, 34, cx, ey + dimOffset + 6, 'dg-ext'),
    line(30, ey, 620, ey, 'dg-conductor'),
    // Barra, do capacitor até a ponte, e a ponte de curto (atravessa o elemento).
    line(capX, ry, strapX, ry, 'dg-conductor'),
    line(strapX, ry - 6, strapX, ey + 6, 'dg-conductor'),
    // Conector e capacitor em série no vivo (duas placas na horizontal), descendo até a ponta da barra.
    circle(capX, conY, 7, 'dg-connector'),
    line(capX, conY + 7, capX, ry - 19, 'dg-ext'),
    line(capX - 11, ry - 19, capX + 11, ry - 19, 'dg-conductor'),
    line(capX - 11, ry - 13, capX + 11, ry - 13, 'dg-conductor'),
    line(capX, ry - 13, capX, ry, 'dg-ext'),
    // Malha ao centro do excitado (no boom).
    line(capX - 6, conY + 4, cx + 2, ey - 4, 'dg-ext'),
    text(capX + 16, conY + 4, 'coaxial: vivo → capacitor → barra', 'dg-note'),
    text(capX + 18, ry - 12, `C ≈ ${formatNumber(design.capacitancePF, 1)} pF`, 'dg-label'),
    text(cx - 14, ry + 40, 'malha → centro', 'dg-note', 'end'),
    text((capX + strapX) / 2 + 40, ry - 10, `barra, ${dimLabel(result, 'GD', res)}`, 'dg-label', 'middle'),
    text(strapX, ry - 34, 'ponte de curto', 'dg-note', 'middle'),
    text(strapX, ry - 20, '(desliza no ajuste)', 'dg-note', 'middle'),
    text(34, ey - 10, '← outra metade (sem barra)', 'dg-note'),
    text(620, ey - 10, 'ponta →', 'dg-note', 'end'),
    // GL: do eixo do centro até o meio da ponte; GS: do eixo do excitado ao eixo da barra, ao lado da ponte.
    dimension(id, cx, ey, strapX, ey, dimOffset, dimLabel(result, 'GL', res)),
    text((cx + strapX) / 2, ey + dimOffset + 30, 'do centro do excitado até o meio da ponte de curto', 'dg-note', 'middle'),
    dimension(id, strapX + 8, ey, strapX + 8, ry, 28, dimLabel(result, 'GS', res), { anchor: 'start' }),
    text(30, ey + dimOffset + 56, 'Fora de escala: as medidas estão nas cotas.', 'dg-note'),
  );
  return {
    id,
    title: 'Detalhe do gamma match (vista de cima, fora de escala)',
    caption:
      'Excitado inteiro, preso pelo centro (no boom). A barra corre ao lado de UMA das metades, a GS entre os centros, e a ponte de curto a ' +
      'liga ao elemento. GL vai do centro do excitado (eixo do boom) até o meio da ponte; a barra começa junto do centro, então tem ' +
      'praticamente o comprimento GL (corte com sobra, porque a ponte desliza). O vivo do coaxial vai à barra pelo capacitor; a malha, ao centro do excitado. ' +
      'Ajuste: o capacitor para a menor ROE; se não chegar perto de 1:1, mude a ponte e repita.',
    svg: svgDoc(id, 640, ey + dimOffset + 72, 'Yagi: detalhe do gamma match', 'Barra paralela ao excitado, ponte de curto, capacitor em série e conector.', parts.join('')),
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
  const gamma = gammaDetail(result, params);
  return [topView(result, params), ...(gamma ? [gamma] : []), ...patterns(result, params)];
}
