/**
 * Diagrama do ground plane de 1/4 de onda: vista lateral, em escala.
 * Mostra o radiador, dois dos radiais (os demais ficam fora do plano do desenho),
 * a inclinação e o coaxial com choke.
 */

import { degToRad } from '../../core/complex';
import { formatLength, formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { circle, dimH, dimV, line, n, rect, svgDoc, text } from '../svg';
import { type GroundPlaneParams, calc } from './calc';

const W = 640;
const H = 520;
const TOP = 50;
/** Espaço abaixo da ponta dos radiais para a cota C e o coaxial. */
const BELOW_TIPS = 70;
/** Espaço à esquerda e à direita do eixo para cotas e rótulos. */
const SIDE_LEFT = 70;
const SIDE_RIGHT = 118;
const ARC_RADIUS = 44;

export interface GroundPlaneLayout {
  width: number;
  height: number;
  scale: number;
  feedX: number;
  feedY: number;
  radiatorPx: number;
  radialPx: number;
  reachPx: number;
  dropPx: number;
  topY: number;
  bottomY: number;
}

export function layout(params: GroundPlaneParams): GroundPlaneLayout {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  const radiator = m['A']!;
  const radial = m['B']!;
  const reach = m['C']!;
  const drop = m['D'] ?? 0;
  const feedX = (SIDE_LEFT + (W - SIDE_RIGHT)) / 2;
  const sx = Math.min(feedX - SIDE_LEFT, W - SIDE_RIGHT - feedX) / reach;
  const sy = (H - TOP - BELOW_TIPS) / (radiator + drop);
  const scale = Math.min(sx, sy);
  const feedY = TOP + radiator * scale;
  return {
    width: W,
    height: H,
    scale,
    feedX,
    feedY,
    radiatorPx: radiator * scale,
    radialPx: radial * scale,
    reachPx: reach * scale,
    dropPx: drop * scale,
    topY: TOP,
    bottomY: feedY + drop * scale + BELOW_TIPS,
  };
}

export function diagram(params: GroundPlaneParams): string {
  const result = calc(params);
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const m = Object.fromEntries(result.measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  const fmt = (label: string) => `${label} = ${formatLength(m[label]!, res)}`;
  const l = layout(params);
  const { feedX: cx, feedY: fy } = l;
  const drooping = params.droopAngleDeg > 0;
  const theta = degToRad(params.droopAngleDeg);
  const tipRightX = cx + l.reachPx;
  const tipLeftX = cx - l.reachPx;
  const tipY = fy + l.dropPx;
  const coaxEnd = tipY + 52;

  // Rótulo de B: no meio do radial esquerdo, do lado de fora (onde há espaço livre).
  const midX = cx - l.reachPx / 2;
  const midY = fy + l.dropPx / 2;
  const labelB = text(midX - Math.sin(theta) * 12 - 6, midY - Math.cos(theta) * 12 - 2, fmt('B'), 'end');

  const parts = [
    line(cx, fy - l.radiatorPx, cx, fy, 'dg-element'),
    line(cx, fy, tipRightX, tipY, 'dg-element'),
    line(cx, fy, tipLeftX, tipY, 'dg-element'),
    rect(cx - 10, fy, 20, 8, 'dg-part'),
    circle(cx, fy, 4, 'dg-feed'),
    line(cx, fy + 8, cx, coaxEnd, 'dg-coax'),
    rect(cx - 14, tipY + 16, 28, 20, 'dg-part'),
    text(cx - 22, tipY + 30, 'choke 1:1', 'end', 'dg-note'),
    text(cx, coaxEnd + 18, 'coaxial → rádio', 'middle', 'dg-note'),
    text(tipLeftX, tipY + 22, `${params.radialCount} radiais`, 'middle', 'dg-note'),
    labelB,
    // A: altura do radiador, à direita do eixo.
    dimV(cx + 40, fy - l.radiatorPx, fy, fmt('A'), 'right'),
    line(cx, fy - l.radiatorPx, cx + 46, fy - l.radiatorPx, 'dg-ext'),
  ];

  if (drooping) {
    const a = ARC_RADIUS;
    const endX = cx + a * Math.cos(theta);
    const endY = fy + a * Math.sin(theta);
    parts.push(
      line(cx, fy, tipRightX, fy, 'dg-ext'),
      line(tipRightX, fy, tipRightX, tipY, 'dg-ext'),
      `<path d="M ${n(cx + a)} ${n(fy)} A ${a} ${a} 0 0 1 ${n(endX)} ${n(endY)}" class="dg-angle"/>`,
      text(cx + (a + 14) * Math.cos(theta / 2) + 4, fy + (a + 14) * Math.sin(theta / 2) + 4, `${formatNumber(params.droopAngleDeg, 0)}°`, 'start', 'dg-note'),
      // C: alcance horizontal, abaixo das pontas. D: queda, à direita.
      dimH(cx, tipRightX, tipY + 26, fmt('C'), tipY),
      dimV(tipRightX + 30, fy, tipY, fmt('D'), 'right'),
    );
  }

  return svgDoc(
    W,
    H,
    'Diagrama do ground plane de 1/4 de onda',
    `Radiador vertical de ${formatLength(m['A']!, res)} sobre ${params.radialCount} radiais de ${formatLength(m['B']!, res)} inclinados ${formatNumber(params.droopAngleDeg, 0)} graus abaixo da horizontal.`,
    parts.join('\n'),
  );
}
