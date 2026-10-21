/**
 * Diagramas da Moxon: vista de cima em escala, curva de ROE do modelo e padrões no espaço livre (método dos momentos).
 */

import type { Vec3 } from '../../core/mom';
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
  textLines,
} from '../diagram-kit';
import { polarPlot } from '../pattern-kit';
import type { CalcResult } from '../types';
import { type MoxonParams, modelFor } from './calc';
import { bandWidthMHz } from './moxon-model';

function topView(result: CalcResult, params: MoxonParams): Diagram {
  const id = 'mx-top';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const a = measure(result, 'A');
  const b = measure(result, 'B');
  const d = measure(result, 'D');
  const e = measure(result, 'E');
  const hasGap = result.measurements.some((m) => m.label === 'H');
  const s = Math.min(380 / a, 230 / e);
  const cx = 370;
  const yRef = 320;
  const yDrv = yRef - e * s;
  const xl = cx - (a / 2) * s;
  const xr = cx + (a / 2) * s;
  const yDrvTip = yDrv + b * s;
  const yRefTip = yRef - d * s;
  const halfGapPx = hasGap ? Math.max(3, (measure(result, 'H') / 2) * s) : 0;

  const body = [
    // Excitado (em cima, na frente) e refletor (embaixo, atrás).
    path(`M${xl} ${yDrvTip}L${xl} ${yDrv}L${cx - halfGapPx} ${yDrv}`, 'dg-conductor'),
    path(`M${cx + halfGapPx} ${yDrv}L${xr} ${yDrv}L${xr} ${yDrvTip}`, 'dg-conductor'),
    path(`M${xl} ${yRefTip}L${xl} ${yRef}L${xr} ${yRef}L${xr} ${yRefTip}`, 'dg-conductor'),
    text(cx, yDrv - 52, '↑ feixe (máximo) · excitado (frente)', 'dg-note', 'middle'),
    text(cx - 14, yRef + 18, 'refletor (atrás)', 'dg-note', 'end'),
    // Espaçadores isolantes nas folgas.
    rect(xl - 4, yDrvTip, 8, yRefTip - yDrvTip, 'dg-insulator', 2),
    rect(xr - 4, yDrvTip, 8, yRefTip - yDrvTip, 'dg-insulator', 2),
    highVoltage(xr - 10, (yDrvTip + yRefTip) / 2 + 4, 'alta tensão (TX)', 'end'),
    // Alimentação: coaxial para trás, pelo meio, com choke.
    circle(cx - halfGapPx - 2, yDrv, 3, 'dg-terminal'),
    circle(cx + halfGapPx + 2, yDrv, 3, 'dg-terminal'),
    line(cx, yDrv + 4, cx, 400, 'dg-coax'),
    chokeBeads(cx, yDrv + 14, 2),
    text(cx - 14, yDrv + 30, 'choke 1:1', 'dg-note', 'end'),
    text(cx + 10, 396, 'coaxial → rádio', 'dg-note'),
    // Cotas.
    dimension(id, xl, yDrv, xr, yDrv, -28, dimLabel(result, 'A', res)),
    dimension(id, xl, yDrv, xl, yDrvTip, 18, dimLabel(result, 'B', res), { anchor: 'end' }),
    dimension(id, xl, yDrvTip, xl, yRefTip, 64, dimLabel(result, 'C', res), { anchor: 'end' }),
    dimension(id, xl, yRefTip, xl, yRef, 18, dimLabel(result, 'D', res), { anchor: 'end' }),
    dimension(id, xr, yDrv, xr, yRef, -36, dimLabel(result, 'E', res), { anchor: 'start' }),
    hasGap ? dimension(id, cx - halfGapPx, yDrv, cx + halfGapPx, yDrv, 26, dimLabel(result, 'H', res), { labelDx: 60 }) : '',
    textLines(20, 22, [`Fios antes de dobrar: cada metade do excitado ${dimLabel(result, 'F', res)}`, `refletor ${dimLabel(result, 'G', res)}`], 'dg-label'),
  ].join('');

  return {
    id,
    title: 'Vista de cima',
    caption:
      'Em escala, medidas entre os eixos dos fios. A: largura. B e D: caudas do excitado e do refletor. C: folga entre as pontas ' +
      '(a medida mais crítica). E: profundidade. F: cada metade do excitado esticada. G: refletor esticado.' +
      (hasGap ? ' H: espaço central do excitado.' : '') +
      ' ⚡ = pontas em tensão alta de RF ao transmitir.',
    svg: svgDoc(id, 680, 410, 'Moxon: vista de cima', 'Retângulo formado pelo excitado em U na frente e pelo refletor em U atrás, com as pontas separadas por uma folga.', body),
  };
}

function swrChart(params: MoxonParams): Diagram {
  const id = 'mx-swr';
  const model = modelFor(params);
  const f0 = params.frequencyMHz;
  const halfWin = model.band2 ? 0.8 * bandWidthMHz(model.band2) : 0.05 * f0;
  const fMin = Math.max(model.sweep[0]!.fMHz, f0 - halfWin);
  const fMax = Math.min(model.sweep[model.sweep.length - 1]!.fMHz, f0 + halfWin);
  const x0 = 60;
  const x1 = 620;
  const y0 = 250;
  const y1 = 40;
  const swrTop = 3;
  const px = (fx: number) => x0 + ((fx - fMin) / (fMax - fMin)) * (x1 - x0);
  const py = (s: number) => y0 - ((Math.min(s, swrTop) - 1) / (swrTop - 1)) * (y0 - y1);
  const pts = model.sweep.filter((p) => p.fMHz >= fMin && p.fMHz <= fMax);
  const curve = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.fMHz).toFixed(1)} ${py(p.swr).toFixed(1)}`).join('');
  const dec = (fx: number) => formatNumber(fx, f0 < 30 ? 3 : 2);
  const body = [
    line(x0, y0, x1, y0, 'dg-ext'),
    line(x0, y0, x0, y1, 'dg-ext'),
    ...[1.5, 2, 2.5, 3].map((s) => line(x0, py(s), x1, py(s), s === 2 ? 'dg-danger-line' : 'dg-ext')),
    ...[1, 1.5, 2, 2.5, 3].map((s) => text(x0 - 6, py(s) + 4, formatNumber(s, 1), 'dg-note', 'end')),
    ...[fMin, f0, fMax].map((fx) => text(px(fx), y0 + 18, dec(fx), 'dg-note', 'middle')),
    line(px(f0), y0, px(f0), y1, 'dg-ext'),
    path(curve, 'dg-conductor'),
    text(x0 + (x1 - x0) / 2, y0 + 38, 'frequência (MHz)', 'dg-label', 'middle'),
    text(16, y1 - 14, 'ROE (50 Ω)', 'dg-label'),
  ].join('');
  return {
    id,
    title: 'ROE estimada (modelo)',
    caption:
      `ROE em cabo de 50 Ω pelo modelo, no espaço livre (Z = ${formatNumber(model.z.re, 1)} ${model.z.im >= 0 ? '+' : '−'} ` +
      `j${formatNumber(Math.abs(model.z.im), 1)} Ω em ${formatNumber(f0, 3)} MHz). A linha vermelha é 2:1. Meça a sua com NanoVNA.`,
    svg: svgDoc(id, 680, 300, 'Moxon: ROE estimada', 'Curva de ROE em função da frequência.', body),
  };
}

/** Padrões do modelo: antena no plano xy, feixe em +y. */
function patterns(params: MoxonParams): Diagram[] {
  const model = modelFor(params);
  const peak = model.power([0, 1, 0]);
  const field = (dir: Vec3) => Math.sqrt(model.power(dir) / peak);
  const note = 'Espaço livre: sobre o solo, o padrão vertical ganha lóbulos que dependem da altura.';
  return [
    polarPlot({
      id: 'mx-pattern-az',
      title: 'Padrão no plano da antena',
      caption:
        `Visto de cima, com a antena deitada: quase cardioide, com F/C de ${formatNumber(model.frontToBackDb, 1)} dB a 180° e os ` +
        `mínimos a uns 120° da frente, não a 90° (Cebik). Ganho ≈ ${formatNumber(model.gainDbi, 2)} dBi. ${note}`,
      desc: 'Gráfico polar quase cardioide: lóbulo largo para a frente e nulo profundo para trás.',
      axisLabels: { right: 'lado', up: 'frente', left: 'lado', down: 'trás' },
      field: (a) => field([Math.cos(a), Math.sin(a), 0]),
    }),
    polarPlot({
      id: 'mx-pattern-el',
      title: 'Padrão no plano perpendicular (de lado)',
      caption: `Corte que passa pela frente e por trás, perpendicular ao plano da antena. ${note}`,
      desc: 'Gráfico polar com lóbulo para a frente e quase nada para trás.',
      axisLabels: { right: 'frente', up: 'perpendicular', left: 'trás', down: 'perpendicular' },
      field: (a) => field([0, Math.cos(a), Math.sin(a)]),
    }),
  ];
}

export function diagrams(result: CalcResult, params: MoxonParams): Diagram[] {
  return [topView(result, params), swrChart(params), ...patterns(params)];
}
