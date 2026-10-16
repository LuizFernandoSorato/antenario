/**
 * Primitivas para os diagramas SVG das antenas (funções puras: geram texto SVG).
 *
 * As cores vêm de classes CSS (`dg-*`, definidas em style.css), para o desenho
 * acompanhar o tema claro/escuro. Os diagramas são esquemáticos: as cotas
 * mostram as medidas calculadas; quando o desenho não está em escala, a
 * legenda avisa.
 */

import { formatLength, type LengthResolution } from '../core/units';
import type { CalcResult } from './types';

export interface Diagram {
  /** Identificador único na página (usado para ids internos do SVG). */
  id: string;
  title: string;
  /** Legenda exibida abaixo da figura. */
  caption: string;
  svg: string;
}

export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Arredonda coordenadas para não gerar SVG com 15 casas decimais. */
function n(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError(`Coordenada inválida no diagrama: ${value}.`);
  return String(Math.round(value * 10) / 10);
}

/** Documento SVG com título/descrição acessíveis e a seta usada nas cotas. */
export function svgDoc(id: string, width: number, height: number, title: string, desc: string, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" ` +
    // max-width: não amplia o desenho além de ~1,25× o tamanho de projeto (texto fica proporcional).
    `aria-labelledby="${id}-title ${id}-desc" class="dg" style="max-width:${Math.round(width * 1.25)}px">` +
    `<title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(desc)}</desc>` +
    `<defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" ` +
    `orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="dg-arrow"/></marker></defs>` +
    body +
    `</svg>`
  );
}

export function line(x1: number, y1: number, x2: number, y2: number, cls: string): string {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" class="${cls}"/>`;
}

export function rect(x: number, y: number, w: number, h: number, cls: string, rx = 0): string {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" class="${cls}"/>`;
}

export function circle(cx: number, cy: number, r: number, cls: string): string {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" class="${cls}"/>`;
}

export function path(d: string, cls: string): string {
  return `<path d="${d}" class="${cls}"/>`;
}

export type Anchor = 'start' | 'middle' | 'end';

export function text(x: number, y: number, content: string, cls = 'dg-label', anchor: Anchor = 'start'): string {
  return `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}" class="${cls}">${esc(content)}</text>`;
}

/** Texto em várias linhas (uma por item), espaçadas de `lineHeight`. */
export function textLines(
  x: number,
  y: number,
  lines: string[],
  cls = 'dg-label',
  anchor: Anchor = 'start',
  lineHeight = 15,
): string {
  return lines.map((l, i) => text(x, y + i * lineHeight, l, cls, anchor)).join('');
}

/**
 * Cota entre dois pontos, deslocada perpendicularmente por `offset` (px), com
 * linhas de chamada e setas nas duas pontas. O rótulo fica no meio da cota,
 * afastado mais `labelGap` px na mesma direção.
 */
export function dimension(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number,
  label: string,
  opts: { anchor?: Anchor; labelGap?: number; labelDx?: number } = {},
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return '';
  // Normal unitária (gira o vetor 90° no sentido horário da tela).
  const nx = -dy / len;
  const ny = dx / len;
  const ax = x1 + nx * offset;
  const ay = y1 + ny * offset;
  const bx = x2 + nx * offset;
  const by = y2 + ny * offset;
  const ext = Math.sign(offset) * 5;
  const gap = opts.labelGap ?? 6;
  const lx = (ax + bx) / 2 + nx * Math.sign(offset || 1) * gap + (opts.labelDx ?? 0);
  const ly = (ay + by) / 2 + ny * Math.sign(offset || 1) * gap + 4;
  return (
    line(x1, y1, ax + nx * ext, ay + ny * ext, 'dg-ext') +
    line(x2, y2, bx + nx * ext, by + ny * ext, 'dg-ext') +
    `<line x1="${n(ax)}" y1="${n(ay)}" x2="${n(bx)}" y2="${n(by)}" class="dg-dim" ` +
    `marker-start="url(#${id}-arrow)" marker-end="url(#${id}-arrow)"/>` +
    text(lx, ly, label, 'dg-dim-text', opts.anchor ?? 'middle')
  );
}

/** Contas de ferrite (choke) sobre um cabo vertical, centradas em x, a partir de y. */
export function chokeBeads(x: number, y: number, count = 3, gap = 4): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += rect(x - 9, y + i * (12 + gap), 18, 12, 'dg-ferrite', 2);
  }
  return out;
}

/** Marca de alta tensão de RF (⚡), com texto opcional. */
export function highVoltage(x: number, y: number, label = '', anchor: Anchor = 'start'): string {
  return text(x, y, label ? `⚡ ${label}` : '⚡', 'dg-danger', anchor);
}

/** Medida de uma cota do resultado (lança se a cota não existir). */
export function measure(result: CalcResult, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada no resultado.`);
  return m.meters;
}

/** Rótulo "A = 982 mm" para uma cota. */
export function dimLabel(result: CalcResult, label: string, res: LengthResolution): string {
  return `${label} = ${formatLength(measure(result, label), res)}`;
}
