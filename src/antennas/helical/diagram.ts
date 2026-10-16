/**
 * Diagramas da helicoidal: vista lateral esquemática (hélice sobre o refletor) e
 * o triângulo de uma volta desenrolada, que relaciona C, A, passo e fio.
 */

import { formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { type Diagram, circle, dimLabel, dimension, line, measure, path, rect, svgDoc, text } from '../diagram-kit';
import type { CalcResult } from '../types';
import type { HelicalParams } from './calc';

/** Pontos (x, y) da hélice vista de lado, amostrados ao longo das N voltas. */
export function helixPoints(
  turns: number,
  cx: number,
  baseY: number,
  radiusPx: number,
  heightPx: number,
  samplesPerTurn = 24,
): [number, number][] {
  const total = Math.max(2, Math.round(turns * samplesPerTurn));
  const points: [number, number][] = [];
  for (let i = 0; i <= total; i++) {
    const u = i / total; // 0 → 1 ao longo da hélice
    const angle = u * turns * 2 * Math.PI;
    points.push([cx + radiusPx * Math.cos(angle), baseY - u * heightPx]);
  }
  return points;
}

function sideView(result: CalcResult, params: HelicalParams): Diagram {
  const id = 'hx-side';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const cx = 300;
  const groundY = 350;
  const groundHalf = 150;
  const radius = 55;
  const height = 230;
  const pts = helixPoints(params.turns, cx, groundY - 14, radius, height);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`).join(' ');
  const topY = groundY - 14 - height;

  const body = [
    // Refletor (corte do disco) e conector no centro, por baixo.
    rect(cx - groundHalf, groundY - 4, groundHalf * 2, 8, 'dg-mast'),
    rect(cx - 12, groundY + 4, 24, 16, 'dg-connector', 2),
    path(`M${cx} ${groundY + 20} L${cx} 400`, 'dg-coax'),
    text(cx + 18, 376, 'coaxial para o casamento (1/4 de onda)', 'dg-note'),
    // Hélice.
    path(d, 'dg-conductor'),
    line(cx + radius, groundY - 14, cx + radius, groundY - 4, 'dg-conductor'),
    text(cx - radius - 8, groundY - 20, 'alimentação: início do fio, na borda direita', 'dg-note', 'end'),
    // Cotas.
    dimension(id, cx + radius, topY, cx + radius, groundY - 14, -75, dimLabel(result, 'D', res), { anchor: 'start' }),
    dimension(id, cx - groundHalf, groundY + 30, cx + groundHalf, groundY + 30, 8, dimLabel(result, 'F', res), { labelDx: -90 }),
    dimension(id, cx - radius, topY - 6, cx + radius, topY - 6, -14, dimLabel(result, 'B', res)),
    text(cx - groundHalf, 30, `${formatNumber(params.turns, 0)} voltas, enroladas no mesmo sentido`, 'dg-note'),
  ].join('');

  return {
    id,
    title: 'Vista lateral (esquemática)',
    caption:
      'Desenho esquemático: a proporção da altura e do diâmetro muda com o número de voltas e não está em escala. ' +
      'B: diâmetro da hélice (entre eixos do fio). D: altura (N × passo). F: diâmetro mínimo do refletor.',
    svg: svgDoc(
      id,
      620,
      430,
      'Helicoidal: vista lateral',
      'Hélice de várias voltas sobre um refletor circular, alimentada pela borda a partir de um conector no centro do refletor.',
      body,
    ),
  };
}

function unrolledTurn(result: CalcResult, params: HelicalParams): Diagram {
  const id = 'hx-turn';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const a = measure(result, 'A');
  const c = measure(result, 'C');
  const scale = 300 / a;
  const w = a * scale;
  const h = c * scale;
  const x0 = 60;
  const y0 = 40 + h;
  const angle = (Math.atan2(c, a) * 180) / Math.PI;

  const body = [
    line(x0, y0, x0 + w, y0, 'dg-ext'),
    line(x0 + w, y0, x0 + w, y0 - h, 'dg-ext'),
    line(x0, y0, x0 + w, y0 - h, 'dg-conductor'),
    circle(x0, y0, 3, 'dg-connector'),
    dimension(id, x0, y0, x0 + w, y0, 22, dimLabel(result, 'A', res)),
    dimension(id, x0 + w, y0, x0 + w, y0 - h, 22, dimLabel(result, 'C', res), { anchor: 'start' }),
    text(x0 + 20, y0 - 6, `${formatNumber(angle, 1)}°`, 'dg-note'),
    text(x0 + w / 2 - 20, y0 - h / 2 - 12, 'uma volta de fio', 'dg-note', 'end'),
    text(x0, y0 + 62, `${dimLabel(result, 'E', res)} (fio total em ${formatNumber(params.turns, 0)} voltas)`, 'dg-label'),
  ].join('');

  return {
    id,
    title: 'Uma volta desenrolada',
    caption:
      'Se você desenrolar uma volta, ela vira a hipotenusa de um triângulo de base A (circunferência) e altura C (passo). ' +
      'O ângulo de passo usual é de 12° a 14°. O fio total é N voltas dessa hipotenusa.',
    svg: svgDoc(id, 460, Math.round(y0 + 90), 'Helicoidal: uma volta desenrolada', 'Triângulo com a circunferência na base, o passo na altura e o fio na hipotenusa.', body),
  };
}

export function diagrams(result: CalcResult, params: HelicalParams): Diagram[] {
  return [sideView(result, params), unrolledTurn(result, params)];
}
