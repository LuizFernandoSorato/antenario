/**
 * Gráfico polar de padrão de irradiação (SVG), a partir de uma função de campo normalizado.
 *
 * Escala em dB (potência) com piso de -40 dB: raio = R·(dB + 40)/40. Anéis de referência em
 * 0, -10, -20 e -30 dB. O ângulo α do gráfico é medido a partir da direita, no sentido anti-horário.
 */

import { fieldToDb } from '../core/pattern';
import { type Diagram, circle, line, path, svgDoc, text } from './diagram-kit';

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 112;
const FLOOR_DB = -40;

export interface PolarPlotOptions {
  id: string;
  title: string;
  caption: string;
  /** Rótulos nas quatro direções: direita (0°), cima (90°), esquerda (180°), baixo (270°). */
  axisLabels: { right: string; up: string; left: string; down: string };
  /** Campo normalizado (máximo = 1) em função do ângulo α do gráfico, em radianos. */
  field: (alphaRad: number) => number;
  /** Descrição acessível do que o gráfico mostra. */
  desc: string;
}

function point(alphaRad: number, db: number): [number, number] {
  const r = (RADIUS * (db - FLOOR_DB)) / -FLOOR_DB;
  return [CENTER + r * Math.cos(alphaRad), CENTER - r * Math.sin(alphaRad)];
}

export function polarPlot(o: PolarPlotOptions): Diagram {
  const steps = 360;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (2 * Math.PI * i) / steps;
    const [x, y] = point(a, fieldToDb(o.field(a), FLOOR_DB));
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const rings = [0, -10, -20, -30].map((db) => circle(CENTER, CENTER, (RADIUS * (db - FLOOR_DB)) / -FLOOR_DB, 'dg-ext'));
  const ringLabels = [-10, -20, -30].map((db) => {
    const [x, y] = point(Math.PI / 4, db);
    return text(x + 3, y - 2, `${db} dB`, 'dg-note');
  });
  const body = [
    ...rings,
    line(CENTER - RADIUS, CENTER, CENTER + RADIUS, CENTER, 'dg-ext'),
    line(CENTER, CENTER - RADIUS, CENTER, CENTER + RADIUS, 'dg-ext'),
    ...ringLabels,
    path(`${pts.join('')}Z`, 'dg-conductor'),
    text(SIZE - 4, CENTER - 6, o.axisLabels.right, 'dg-label', 'end'),
    text(CENTER + 6, 14, o.axisLabels.up, 'dg-label'),
    text(4, CENTER - 6, o.axisLabels.left, 'dg-label'),
    text(CENTER + 6, SIZE - 6, o.axisLabels.down, 'dg-label'),
    text(CENTER, SIZE - 22, '0 dB = máximo da antena', 'dg-note', 'middle'),
  ].join('');
  return {
    id: o.id,
    title: o.title,
    caption: o.caption,
    svg: svgDoc(o.id, SIZE, SIZE, o.title, o.desc, body),
  };
}
