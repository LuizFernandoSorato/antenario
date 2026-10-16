/**
 * Diagrama do J-pole: elemento longo (radiador + seção de casamento), elemento curto
 * e curto na base. Vertical em escala; o espaçamento é exagerado quando seria fino demais.
 */

import { formatLength, lengthResolutionForFrequency } from '../../core/units';
import { circle, dimH, dimV, line, svgDoc, text } from '../svg';
import { type JPoleParams, calc } from './calc';

const W = 640;
const H = 560;
const TOP = 50;
/** Espaço abaixo da base para a cota D e a nota. */
const BELOW_BASE = 96;
/** Espaçamento mínimo visível no desenho (px). */
const MIN_SPACING_PX = 30;
/** Altura ilustrativa da marca do ponto de alimentação, como fração do elemento curto. Só ilustra: a posição real não é calculada. */
const TAP_ILLUSTRATION_FRACTION = 0.12;

export interface JPoleLayout {
  width: number;
  height: number;
  scale: number;
  longPx: number;
  shortPx: number;
  radiatorPx: number;
  spacingPx: number;
  spacingExaggerated: boolean;
  xLong: number;
  xShort: number;
  topY: number;
  baseY: number;
}

export function layout(params: JPoleParams): JPoleLayout {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  const scale = (H - TOP - BELOW_BASE) / m['A']!;
  const realSpacingPx = m['D']! * scale;
  const spacingPx = Math.max(realSpacingPx, MIN_SPACING_PX);
  const xLong = (W - spacingPx) / 2;
  return {
    width: W,
    height: H,
    scale,
    longPx: m['A']! * scale,
    shortPx: m['C']! * scale,
    radiatorPx: m['B']! * scale,
    spacingPx,
    spacingExaggerated: realSpacingPx < MIN_SPACING_PX,
    xLong,
    xShort: xLong + spacingPx,
    topY: TOP,
    baseY: TOP + m['A']! * scale,
  };
}

export function diagram(params: JPoleParams): string {
  const result = calc(params);
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const m = Object.fromEntries(result.measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  const fmt = (label: string) => `${label} = ${formatLength(m[label]!, res)}`;
  const l = layout(params);
  const { xLong, xShort, baseY } = l;
  const topLong = baseY - l.longPx;
  const topShort = baseY - l.shortPx;
  const yTap = baseY - l.shortPx * TAP_ILLUSTRATION_FRACTION;
  const xDimRight = xShort + 44;
  const xDimA = xLong - 150;

  const parts = [
    line(xLong, topLong, xLong, baseY, 'dg-element'),
    line(xShort, topShort, xShort, baseY, 'dg-element'),
    line(xLong, baseY, xShort, baseY, 'dg-element'),
    text(xLong - 10, baseY + 18, 'curto (base)', 'end', 'dg-note'),
    // Ponto de alimentação (ilustrativo) e coaxial vindo da esquerda.
    circle(xLong, yTap, 4, 'dg-feed'),
    circle(xShort, yTap, 4, 'dg-feed'),
    line(xLong - 90, yTap, xLong, yTap, 'dg-coax'),
    text(xLong - 45, yTap - 8, 'coaxial', 'middle', 'dg-note'),
    // Cotas: A à esquerda (altura total); B e C empilhadas à direita.
    line(xLong, topLong, xDimA + 6, topLong, 'dg-ext'),
    line(xLong, baseY, xDimA + 6, baseY, 'dg-ext'),
    dimV(xDimA, topLong, baseY, fmt('A'), 'left'),
    line(xShort, topLong, xDimRight + 6, topLong, 'dg-ext'),
    line(xShort, topShort, xDimRight + 6, topShort, 'dg-ext'),
    line(xShort, baseY, xDimRight + 6, baseY, 'dg-ext'),
    dimV(xDimRight, topLong, topShort, fmt('B'), 'right'),
    dimV(xDimRight, topShort, baseY, fmt('C'), 'right'),
    // D: espaçamento, abaixo da base.
    line(xLong, baseY, xLong, baseY + 58, 'dg-ext'),
    line(xShort, baseY, xShort, baseY + 58, 'dg-ext'),
    dimH(xLong, xShort, baseY + 58, `${fmt('D')}${l.spacingExaggerated ? ' (fora de escala)' : ''}`),
    text(
      W / 2,
      H - 14,
      'Ponto de alimentação: posição não calculada. Ajuste medindo a ROE (ver guia).',
      'middle',
      'dg-note',
    ),
  ];

  return svgDoc(
    W,
    H,
    'Diagrama do J-pole',
    `J-pole com elemento longo de ${formatLength(m['A']!, res)}, radiador de ${formatLength(m['B']!, res)} e seção de casamento de ${formatLength(m['C']!, res)}, em curto na base.`,
    parts.join('\n'),
  );
}
