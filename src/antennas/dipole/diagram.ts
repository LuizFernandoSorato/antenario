/**
 * Diagrama do dipolo de meia onda: medidas → SVG (desenhado em escala).
 */

import { formatLength, lengthResolutionForFrequency } from '../../core/units';
import { circle, dimH, line, rect, svgDoc, text } from '../svg';
import { type DipoleParams, calc } from './calc';

const W = 640;
const H = 240;
const MARGIN = 50;
const Y_ARM = 100;
/** Largura mínima do espaço central no desenho (px), para ele continuar visível. */
const MIN_GAP_PX = 12;

export interface DipoleLayout {
  scale: number;
  totalPx: number;
  armPx: number;
  gapPx: number;
  /** O espaço central real é menor que o mínimo visível e foi aumentado no desenho. */
  gapExaggerated: boolean;
  leftX: number;
  rightX: number;
  centerX: number;
}

export function layout(params: DipoleParams): DipoleLayout {
  const result = calc(params);
  const total = result.measurements.find((m) => m.label === 'A')!.meters;
  const totalPx = W - 2 * MARGIN;
  const scale = totalPx / total;
  const realGapPx = params.centerGap * scale;
  const gapExaggerated = params.centerGap > 0 && realGapPx < MIN_GAP_PX;
  const gapPx = params.centerGap > 0 ? Math.max(realGapPx, MIN_GAP_PX) : 0;
  return {
    scale,
    totalPx,
    armPx: (totalPx - gapPx) / 2,
    gapPx,
    gapExaggerated,
    leftX: MARGIN,
    rightX: W - MARGIN,
    centerX: W / 2,
  };
}

export function diagram(params: DipoleParams): string {
  const result = calc(params);
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const m = Object.fromEntries(result.measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  const fmt = (label: string) => `${label} = ${formatLength(m[label]!, res)}`;
  const l = layout(params);
  const { leftX, rightX, centerX: cx, gapPx } = l;
  const armLeftEnd = cx - gapPx / 2;
  const armRightStart = cx + gapPx / 2;

  const body = [
    // Braços
    line(leftX, Y_ARM, armLeftEnd, Y_ARM, 'dg-element'),
    line(armRightStart, Y_ARM, rightX, Y_ARM, 'dg-element'),
    // Isoladores das pontas
    rect(leftX - 8, Y_ARM - 6, 8, 12, 'dg-part'),
    rect(rightX, Y_ARM - 6, 8, 12, 'dg-part'),
    // Ponto de alimentação e coaxial com choke
    circle(armLeftEnd, Y_ARM, 4, 'dg-feed'),
    circle(armRightStart, Y_ARM, 4, 'dg-feed'),
    line(cx, Y_ARM, cx, 200, 'dg-coax'),
    rect(cx - 14, 135, 28, 20, 'dg-part'),
    text(cx + 22, 149, 'choke 1:1', 'start', 'dg-note'),
    text(cx, 220, 'coaxial → rádio', 'middle', 'dg-note'),
    // Cotas
    dimH(leftX, rightX, 50, fmt('A'), Y_ARM - 8),
    dimH(leftX, armLeftEnd, 175, fmt('B'), Y_ARM + 8),
    dimH(armRightStart, rightX, 175, fmt('B'), Y_ARM + 8),
    ...(params.centerGap > 0
      ? [text(cx, Y_ARM - 12, `${fmt('C')}${l.gapExaggerated ? ' (fora de escala)' : ''}`, 'middle', 'dg-note')]
      : []),
  ].join('\n');

  return svgDoc(
    W,
    H,
    'Diagrama do dipolo de meia onda',
    `Dipolo de ${formatLength(m['A']!, res)} de ponta a ponta, com dois braços de ${formatLength(m['B']!, res)}, alimentado no centro por coaxial com choke.`,
    body,
  );
}
