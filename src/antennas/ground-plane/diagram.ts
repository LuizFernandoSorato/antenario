/**
 * Diagramas do ground plane: vista lateral em escala (radiador e radiais na
 * inclinação informada) e vista de cima com a distribuição dos radiais.
 */

import { degToRad } from '../../core/complex';
import { formatNumber, lengthResolutionForFrequency } from '../../core/units';
import {
  type Diagram,
  chokeBeads,
  circle,
  dimLabel,
  dimension,
  highVoltage,
  line,
  measure,
  path,
  rect,
  svgDoc,
  text,
} from '../diagram-kit';
import type { CalcResult } from '../types';
import type { GroundPlaneParams } from './calc';

/** Altura do radiador no desenho (px); o resto é desenhado na mesma escala. */
const RADIATOR_PX = 170;

function sideView(result: CalcResult, params: GroundPlaneParams): Diagram {
  const id = 'gp-side';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const scale = RADIATOR_PX / measure(result, 'A');
  const r = measure(result, 'B') * scale;
  const theta = degToRad(params.droopAngleDeg);
  const px = 300;
  const top = 56;
  const feedY = top + RADIATOR_PX; // topo do conector
  const baseY = feedY + 10; // onde saem os radiais
  const rx = px + r * Math.cos(theta);
  const ry = baseY + r * Math.sin(theta);
  const lx = px - r * Math.cos(theta);
  const hasDrop = result.measurements.some((m) => m.label === 'D');

  const body = [
    // Mastro (tubo) e coaxial com choke.
    line(292, baseY + 8, 292, 440, 'dg-mast'),
    line(308, baseY + 8, 308, 440, 'dg-mast'),
    path(`M${px} ${baseY + 4} Q${px} ${baseY + 16} 324 ${baseY + 22} L324 440`, 'dg-coax'),
    chokeBeads(324, baseY + 30),
    text(284, 432, 'mastro aterrado', 'dg-note', 'end'),
    text(334, 432, 'coaxial, choke logo abaixo da base', 'dg-note'),
    // Radiais (dois visíveis nesta vista).
    line(px, baseY, rx, ry, 'dg-conductor'),
    line(px, baseY, lx, ry, 'dg-conductor'),
    // Radiador e conector.
    line(px, feedY, px, top, 'dg-conductor'),
    rect(px - 13, feedY, 26, 14, 'dg-connector', 2),
    highVoltage(px + 10, top + 4, 'alta tensão (TX)'),
    // Cotas.
    dimension(id, px, top, px, feedY, 40, dimLabel(result, 'A', res), { anchor: 'end' }),
    // Cota B do lado de cima do radial direito, longe do mastro e do coaxial.
    dimension(id, px, baseY, rx, ry, -18, dimLabel(result, 'B', res), { anchor: 'start' }),
    dimension(id, lx, ry, px, ry, 28, dimLabel(result, 'C', res)),
    hasDrop
      ? line(px, baseY, rx + 27, baseY, 'dg-ext') +
        dimension(id, rx, baseY, rx, ry, -22, dimLabel(result, 'D', res), { anchor: 'start' })
      : '',
  ].join('');

  return {
    id,
    title: 'Vista lateral (em escala)',
    caption:
      `Desenhada na escala da antena, com os radiais a ${formatNumber(params.droopAngleDeg, 0)}° abaixo da ` +
      'horizontal. Só dois radiais aparecem nesta vista. A: radiador. B: cada radial. C: alcance horizontal ' +
      `do radial${hasDrop ? '. D: queda da ponta do radial em relação à base' : ''}.`,
    svg: svgDoc(
      id,
      620,
      450,
      'Ground plane: vista lateral',
      'Radiador vertical sobre conector de painel, radiais inclinados, mastro e coaxial com choke.',
      body,
    ),
  };
}

function topView(params: GroundPlaneParams): Diagram {
  const id = 'gp-top';
  const nRadials = params.radialCount;
  const step = 360 / nRadials;
  const cx = 130;
  const cy = 120;
  const radius = 92;
  const spokes: string[] = [];
  for (let i = 0; i < nRadials; i++) {
    const a = degToRad(-90 + step * i);
    spokes.push(line(cx, cy, cx + radius * Math.cos(a), cy + radius * Math.sin(a), 'dg-conductor'));
  }
  const stepText = formatNumber(step, Number.isInteger(step) ? 0 : 1);
  const body = [
    circle(cx, cy, radius, 'dg-ext'),
    ...spokes,
    circle(cx, cy, 9, 'dg-connector'),
    text(cx, 245, `${nRadials} radiais, um a cada ${stepText}°`, 'dg-label', 'middle'),
  ].join('');

  return {
    id,
    title: 'Vista de cima',
    caption: 'Distribua os radiais por igual em volta da base: simetria mantém o diagrama omnidirecional.',
    svg: svgDoc(id, 260, 260, 'Ground plane: vista de cima', `${nRadials} radiais igualmente espaçados em volta do radiador.`, body),
  };
}

export function diagrams(result: CalcResult, params: GroundPlaneParams): Diagram[] {
  return [sideView(result, params), topView(params)];
}
