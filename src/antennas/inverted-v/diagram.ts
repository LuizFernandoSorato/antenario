/**
 * Diagramas do V invertido: vista de frente (o V em escala, o mastro em escala quando cabe), detalhe do ápice, curva de ROE do
 * modelo e padrões no espaço livre (método dos momentos).
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
import { type InvertedVParams, modelFor } from './calc';
import { bandWidthMHz } from './v-model';

function frontView(result: CalcResult, params: InvertedVParams): Diagram {
  const id = 'iv-front';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const span = measure(result, 'D');
  const droop = measure(result, 'E');
  const h = params.apexHeight;
  const groundY = 340;
  const cx = 340;
  // O V em escala: cabe em 440 px de largura e 200 px de altura.
  const s = Math.min(440 / span, droop > 0 ? 200 / droop : Infinity);
  const maxMast = 290;
  const truncated = h * s > maxMast;
  const mastPx = truncated ? maxMast : h * s;
  const ay = groundY - mastPx;
  const ty = ay + droop * s;
  const lx = cx - (span / 2) * s;
  const rx = cx + (span / 2) * s;

  const parts = [
    // Chão e mastro.
    line(20, groundY, 700, groundY, 'dg-ext'),
    text(24, groundY + 16, 'chão', 'dg-note'),
    rect(cx - 4, ay + 6, 8, groundY - ay - 6, 'dg-mast', 1),
    // Braços, isolador do ápice e cordas das pontas até estacas no chão.
    line(cx, ay, lx, ty, 'dg-conductor'),
    line(cx, ay, rx, ty, 'dg-conductor'),
    rect(cx - 10, ay - 7, 20, 14, 'dg-insulator', 3),
    line(lx, ty, Math.max(lx - 30, 10), groundY, 'dg-rope'),
    line(rx, ty, Math.min(rx + 30, 670), groundY, 'dg-rope'),
    circle(lx, ty, 4, 'dg-insulator'),
    circle(rx, ty, 4, 'dg-insulator'),
    text(Math.max(lx - 30, 10) + 4, groundY - 6, 'corda', 'dg-note'),
    // Coaxial descendo junto ao mastro, com choke logo abaixo do ápice.
    line(cx + 9, ay + 7, cx + 9, groundY, 'dg-coax'),
    chokeBeads(cx + 9, ay + 44, 2),
    text(cx + 22, ay + 58, 'choke 1:1', 'dg-note'),
    // Ângulo no ápice.
    path(
      `M${(cx - 34 * Math.sin((params.apexAngleDeg * Math.PI) / 360)).toFixed(1)} ${(ay + 34 * Math.cos((params.apexAngleDeg * Math.PI) / 360)).toFixed(1)}` +
        `A34 34 0 0 0 ${(cx + 34 * Math.sin((params.apexAngleDeg * Math.PI) / 360)).toFixed(1)} ${(ay + 34 * Math.cos((params.apexAngleDeg * Math.PI) / 360)).toFixed(1)}`,
      'dg-ext',
    ),
    text(cx - 14, ay + 52, `${formatNumber(params.apexAngleDeg, 0)}°`, 'dg-label', 'end'),
    // Tensão alta nas pontas.
    highVoltage(lx + 6, ty + 20, 'alta tensão (TX)'),
    // Cotas: braço ao longo do fio, vão, queda e altura das pontas.
    dimension(id, cx, ay, lx, ty, 22, dimLabel(result, 'B', res), { anchor: 'end' }),
    dimension(id, lx, ty, rx, ty, 44, dimLabel(result, 'D', res), { labelDx: 70 }),
    line(cx + 12, ay, rx + 56, ay, 'dg-ext'),
    droop > 0 ? dimension(id, rx, ay, rx, ty, -50, dimLabel(result, 'E', res), { anchor: 'start' }) : '',
    dimension(id, rx, ty, rx, groundY, -50, dimLabel(result, 'F', res), { anchor: 'start' }),
    textLines(20, 24, [`Fio de ponta a ponta: ${dimLabel(result, 'A', res)}`, `ápice a ${formatNumber(h, 2)} m do chão`], 'dg-label'),
  ];
  if (truncated) {
    // Quebra no mastro: a altura não está em escala.
    const by = (ty + groundY) / 2 + 10;
    parts.push(rect(cx - 12, by - 6, 24, 12, 'dg-insulator'), path(`M${cx - 12} ${by - 6}L${cx + 12} ${by + 6}`, 'dg-ext'));
  }

  return {
    id,
    title: 'Vista de frente',
    caption:
      'O V está em escala (ângulo real). A: fio de ponta a ponta. B: cada braço. D: vão entre as pontas. E: quanto cada ponta desce. ' +
      'F: altura das pontas.' +
      (truncated ? ' O mastro está encurtado no desenho (marca de quebra).' : ' O mastro também está em escala.') +
      ' ⚡ = ponto de tensão alta de RF ao transmitir.',
    svg: svgDoc(id, 720, 370, 'V invertido: vista de frente', 'Mastro único com o ápice no alto e dois braços descendo inclinados até as pontas, presas por cordas.', parts.join('')),
  };
}

function apexDetail(result: CalcResult, params: InvertedVParams): Diagram {
  const id = 'iv-apex';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const hasGap = result.measurements.some((m) => m.label === 'C');
  const half = (params.apexAngleDeg * Math.PI) / 360;
  const lx = 150;
  const rx = 290;
  const y = 90;
  const leg = 140;
  const body = [
    // Placa isolante presa ao mastro.
    rect(200, 120, 40, 200, 'dg-mast', 2),
    rect(110, 50, 220, 80, 'dg-insulator', 8),
    text(220, hasGap ? 14 : 44, 'isolador do ápice, preso no topo do mastro', 'dg-note', 'middle'),
    circle(lx, y, 7, 'dg-terminal'),
    circle(rx, y, 7, 'dg-terminal'),
    line(lx, y, lx - leg * Math.sin(half), y + leg * Math.cos(half), 'dg-conductor'),
    line(rx, y, rx + leg * Math.sin(half), y + leg * Math.cos(half), 'dg-conductor'),
    text(lx - 40, y + 16, 'braço', 'dg-note', 'end'),
    text(rx + 40, y + 16, 'braço', 'dg-note'),
    // Coaxial: malha num terminal, vivo no outro, descendo junto ao mastro.
    line(250, 320, 250, 160, 'dg-coax'),
    path(`M250 160 Q240 120 ${lx} ${y + 7}`, 'dg-braid'),
    path(`M250 160 Q270 120 ${rx} ${y + 7}`, 'dg-center'),
    rect(242, 152, 16, 16, 'dg-seal', 3),
    chokeBeads(250, 190),
    textLines(268, 205, ['choke logo abaixo', 'do ápice'], 'dg-note'),
    textLines(190, 260, ['coaxial preso', 'ao mastro'], 'dg-note', 'end'),
    hasGap ? dimension(id, lx, y, rx, y, -50, dimLabel(result, 'C', res)) : '',
  ].join('');
  return {
    id,
    title: 'Detalhe do ápice',
    caption:
      'A malha vai num braço e o vivo no outro. O isolador fica no topo do mastro e segura o peso dos braços; o coaxial desce junto ' +
      'ao mastro, com o choke logo abaixo da ligação.' +
      (hasGap ? ' C: espaço entre os terminais.' : ''),
    svg: svgDoc(id, 440, 330, 'V invertido: detalhe do ápice', 'Ligação do coaxial aos dois braços no isolador do topo do mastro.', body),
  };
}

function swrChart(params: InvertedVParams): Diagram {
  const id = 'iv-swr';
  const model = modelFor(params);
  const f0 = params.frequencyMHz;
  // Janela: 1,6 vez a faixa de 2:1, dentro da varredura do modelo.
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
  const d = (fx: number) => formatNumber(fx, f0 < 30 ? 3 : 2);
  const body = [
    line(x0, y0, x1, y0, 'dg-ext'),
    line(x0, y0, x0, y1, 'dg-ext'),
    ...[1.5, 2, 2.5, 3].map((s) => line(x0, py(s), x1, py(s), s === 2 ? 'dg-danger-line' : 'dg-ext')),
    ...[1, 1.5, 2, 2.5, 3].map((s) => text(x0 - 6, py(s) + 4, formatNumber(s, 1), 'dg-note', 'end')),
    ...[fMin, f0, fMax].map((fx) => text(px(fx), y0 + 18, d(fx), 'dg-note', 'middle')),
    line(px(f0), y0, px(f0), y1, 'dg-ext'),
    path(curve, 'dg-conductor'),
    text(x0 + (x1 - x0) / 2, y0 + 38, 'frequência (MHz)', 'dg-label', 'middle'),
    text(16, y1 - 14, 'ROE (50 Ω)', 'dg-label'),
  ].join('');
  return {
    id,
    title: 'ROE estimada (modelo)',
    caption:
      `ROE em cabo de 50 Ω, V já ajustado para ressoar em ${formatNumber(f0, 3)} MHz, no espaço livre, com ` +
      `${formatNumber(params.apexAngleDeg, 0)}° entre os braços (R ≈ ${formatNumber(model.z.re, 1)} Ω). A linha vermelha é 2:1. ` +
      'O solo e a altura deslocam a curva: meça a sua com NanoVNA.',
    svg: svgDoc(id, 680, 300, 'V invertido: ROE estimada', 'Curva de ROE em função da frequência.', body),
  };
}

/**
 * Padrões no espaço livre, do modelo por momentos. Coordenadas do modelo: braços no plano xz (x ao longo do vão, z para cima),
 * máximo em y (perpendicular ao plano dos braços).
 */
function patterns(params: InvertedVParams): Diagram[] {
  const model = modelFor(params);
  const peak = model.power([0, 1, 0]);
  const field = (dir: Vec3) => Math.sqrt(model.power(dir) / peak);
  const endFire = field([1, 0, 0]);
  const db = (v: number) => formatNumber(20 * Math.log10(Math.max(v, 1e-6)), 1);
  const note = 'Espaço livre: sobre o solo, o padrão vertical depende da altura (o chão reflete e cria lóbulos).';
  return [
    polarPlot({
      id: 'iv-pattern-az',
      title: 'Padrão visto de cima (plano horizontal)',
      caption:
        `Corte horizontal na altura do ápice. Ainda tem a forma de "8" do dipolo, mas mais redondo: na direção das pontas o sinal fica ` +
        `${db(endFire)} dB abaixo do máximo (no dipolo reto, ali é um nulo). ${note}`,
      desc: 'Gráfico polar em forma de oito arredondado: máximo perpendicular aos braços, mínimo raso na direção das pontas.',
      axisLabels: { right: 'pontas', up: 'perpendicular', left: 'pontas', down: 'perpendicular' },
      field: (a) => field([Math.cos(a), Math.sin(a), 0]),
    }),
    polarPlot({
      id: 'iv-pattern-arms',
      title: 'Padrão no plano dos braços (plano vertical)',
      caption:
        'Corte vertical que contém os dois braços, olhando de frente para o V. O máximo vai para cima e para baixo, e a direção das pontas ' +
        `fica ${db(endFire)} dB abaixo: as partes verticais dos braços irradiam ali. O corte vertical perpendicular aos braços é um círculo ` +
        `(no espaço livre), como o plano H do dipolo. ${note}`,
      desc: 'Gráfico polar em forma de oito na vertical, com mínimos rasos na direção das pontas.',
      axisLabels: { right: 'ponta', up: 'zênite', left: 'ponta', down: 'nadir' },
      field: (a) => field([Math.cos(a), 0, Math.sin(a)]),
    }),
  ];
}

export function diagrams(result: CalcResult, params: InvertedVParams): Diagram[] {
  return [frontView(result, params), apexDetail(result, params), swrChart(params), ...patterns(params)];
}
