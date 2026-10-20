/**
 * Diagramas da helicoidal: vista lateral esquemática (hélice sobre o refletor) e
 * o triângulo de uma volta desenrolada, que relaciona C, A, passo e fio.
 */

import { halfPowerBeamwidthDeg, helixAxialField, revolutionDirectivity } from '../../core/pattern';
import { formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { polarPlot } from '../pattern-kit';
import { type Diagram, circle, dimLabel, dimension, line, measure, path, rect, svgDoc, text } from '../diagram-kit';
import type { CalcResult } from '../types';
import { type HelicalParams, type Winding, windingFor } from './calc';
import { senseOf } from '../circular';

/**
 * Pontos (x, y) da hélice vista de lado, amostrados ao longo das N voltas, com a indicação de que o ponto está na frente (voltado para
 * quem olha) ou atrás. À direita o fio da frente sobe da esquerda para a direita ("/"); à esquerda, o espelho.
 */
export function helixPoints(
  turns: number,
  cx: number,
  baseY: number,
  radiusPx: number,
  heightPx: number,
  winding: Winding = 'right',
  samplesPerTurn = 24,
): { x: number; y: number; front: boolean }[] {
  const total = Math.max(2, Math.round(turns * samplesPerTurn));
  const points: { x: number; y: number; front: boolean }[] = [];
  for (let i = 0; i <= total; i++) {
    const u = i / total; // 0 → 1 ao longo da hélice
    const angle = u * turns * 2 * Math.PI;
    // Hélice à direita: sentido anti-horário visto de cima, a profundidade (para o observador) é −sen; à esquerda, +sen.
    const depth = (winding === 'right' ? -1 : 1) * Math.sin(angle);
    points.push({ x: cx + radiusPx * Math.cos(angle), y: baseY - u * heightPx, front: depth >= 0 });
  }
  return points;
}

/** Caminhos SVG da parte da frente (cheia) e da parte de trás (tracejada). */
function helixPaths(points: { x: number; y: number; front: boolean }[]): { front: string; back: string } {
  const out = { front: '', back: '' };
  const fmt = (v: number) => Math.round(v * 10) / 10;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]!;
    const p1 = points[i]!;
    const key = p0.front && p1.front ? 'front' : !p0.front && !p1.front ? 'back' : (p0.front ? 'front' : 'back');
    out[key] += `M${fmt(p0.x)} ${fmt(p0.y)} L${fmt(p1.x)} ${fmt(p1.y)} `;
  }
  return out;
}

function sideView(result: CalcResult, params: HelicalParams, winding: Winding): Diagram {
  const id = 'hx-side';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const cx = 300;
  const groundY = 350;
  const groundHalf = 150;
  const radius = 55;
  const height = 230;
  const paths = helixPaths(helixPoints(params.turns, cx, groundY - 14, radius, height, winding));
  const topY = groundY - 14 - height;

  const body = [
    // Refletor (corte do disco) e conector no centro, por baixo.
    rect(cx - groundHalf, groundY - 4, groundHalf * 2, 8, 'dg-mast'),
    rect(cx - 12, groundY + 4, 24, 16, 'dg-connector', 2),
    path(`M${cx} ${groundY + 20} L${cx} 400`, 'dg-coax'),
    text(cx + 18, 376, 'coaxial para o casamento (1/4 de onda)', 'dg-note'),
    // Hélice.
    path(paths.front, 'dg-conductor'),
    `<path d="${paths.back}" class="dg-conductor" stroke-dasharray="6 4"/>`,
    line(cx + radius, groundY - 14, cx + radius, groundY - 4, 'dg-conductor'),
    text(cx - radius - 8, groundY - 20, 'alimentação: início do fio, na borda direita', 'dg-note', 'end'),
    // Cotas.
    dimension(id, cx + radius, topY, cx + radius, groundY - 14, -75, dimLabel(result, 'D', res), { anchor: 'start' }),
    dimension(id, cx - groundHalf, groundY + 30, cx + groundHalf, groundY + 30, 8, dimLabel(result, 'F', res), { labelDx: -90 }),
    dimension(id, cx - radius, topY - 6, cx + radius, topY - 6, -14, dimLabel(result, 'B', res)),
    text(cx - groundHalf, 30, `${formatNumber(params.turns, 0)} voltas, enroladas à ${winding === 'left' ? 'esquerda' : 'direita'} (fio de trás tracejado)`, 'dg-note'),
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

/**
 * Padrão da hélice de modo axial: fator de arranjo de N voltas (espaçadas de S) × cos θ de uma volta, com a fase da condição de
 * Hansen–Woodyard (Kraus; ver `helixAxialField`). Hemisfério da frente, plano de terra ideal e infinito. Simetria de revolução em torno do eixo.
 */
function patterns(params: HelicalParams): Diagram[] {
  const field = (t: number) => helixAxialField(t, params.turns, params.pitchRatio);
  const hp = halfPowerBeamwidthDeg(field, 0);
  const gain = 10 * Math.log10(revolutionDirectivity(field));
  const kraus = 10 * Math.log10(15 * params.turns * params.circumferenceRatio ** 2 * params.pitchRatio);
  const nearOne = Math.abs(params.circumferenceRatio - 1) <= 0.25;
  return [
    polarPlot({
      id: 'helical-pattern',
      title: 'Padrão (corte que contém o eixo)',
      caption:
        `Lóbulo principal no eixo (para cima no desenho), com lóbulos laterais pequenos. Largura de meia potência ≈ ${formatNumber(hp, 0)}°; ` +
        `diretividade do modelo ≈ ${formatNumber(gain, 1)} dBi (a fórmula empírica de Kraus, 15·N·(C/λ)²·S/λ, dá ${formatNumber(kraus, 1)} dBi). ` +
        'O padrão tem simetria em torno do eixo. Modelo: N voltas como arranjo de fontes × cos θ, com a fase de Hansen–Woodyard, diante de um plano de terra ' +
        'ideal e infinito (zero atrás); um refletor real tem diâmetro finito e irradia um pouco para trás. ' +
        (nearOne ? '' : 'C/λ está fora de 0,75 a 1,25, a faixa do modo axial: o modelo não vale bem aqui. ') +
        'Fonte: Kraus (via Stutzman e Thiele e teses de hélices axiais); os livros não foram consultados. A polarização circular não aparece no corte.',
      desc: 'Gráfico polar com lóbulo principal estreito no eixo da hélice e lóbulos laterais pequenos; nada atrás do plano de terra.',
      axisLabels: { right: 'plano de terra', up: 'eixo (frente)', left: 'plano de terra', down: 'atrás' },
      field: (a) => field(Math.acos(Math.sin(a))),
    }),
  ];
}

export function diagrams(result: CalcResult, params: HelicalParams): Diagram[] {
  return [sideView(result, params, windingFor(senseOf(params.circularSense))), unrolledTurn(result, params), ...patterns(params)];
}
