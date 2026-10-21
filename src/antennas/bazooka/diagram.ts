/**
 * Diagramas da double bazooka: vista geral (comprimentos em escala na horizontal), corte do coaxial no centro e nas pontas,
 * curva de ROE do modelo (bazooka × dipolo comum) e padrão no plano do fio.
 */

import { dipoleField, halfPowerBeamwidthDeg } from '../../core/pattern';
import { formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { wavelength } from '../../core/wave';
import { coaxCables } from '../../data/coax-cables';
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
import { type BazookaParams, modelFor } from './calc';
import { bandWidthMHz } from './feed-model';

function overview(result: CalcResult, params: BazookaParams): Diagram {
  const id = 'bz-overview';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const total = measure(result, 'A');
  const coax = measure(result, 'B');
  const left = 70;
  const right = 610;
  const cx = (left + right) / 2;
  const scale = (right - left) / total;
  const c0 = cx - (coax * scale) / 2;
  const c1 = cx + (coax * scale) / 2;
  const y = 130;

  const body = [
    // Cordas e isoladores das pontas.
    line(12, y, left - 14, y, 'dg-rope'),
    line(right + 14, y, 668, y, 'dg-rope'),
    rect(left - 14, y - 5, 14, 10, 'dg-insulator', 4),
    rect(right, y - 5, 14, 10, 'dg-insulator', 4),
    // Fios das pontas.
    line(left, y, c0, y, 'dg-conductor'),
    line(c1, y, right, y, 'dg-conductor'),
    // Seção de coaxial, com o corte da malha no centro.
    line(c0, y, cx - 5, y, 'dg-coax'),
    line(cx + 5, y, c1, y, 'dg-coax'),
    circle(c0, y, 4, 'dg-terminal'),
    circle(c1, y, 4, 'dg-terminal'),
    textLines(c0, y - 30, ['curto:', 'vivo na malha'], 'dg-note', 'middle'),
    textLines(c1, y - 30, ['curto:', 'vivo na malha'], 'dg-note', 'middle'),
    text(cx, y - 14, 'malha cortada', 'dg-note', 'middle'),
    // Cabo de alimentação com choke.
    line(cx, y + 4, cx, 310, 'dg-coax'),
    chokeBeads(cx, y + 30),
    text(cx + 16, y + 48, 'choke 1:1', 'dg-note'),
    text(cx + 16, 300, 'coaxial → rádio', 'dg-note'),
    // Tensão alta nas pontas.
    highVoltage(left + 6, y + 28, 'alta tensão (TX)'),
    highVoltage(right - 6, y + 28, 'alta tensão (TX)', 'end'),
    // Cotas.
    dimension(id, left, y - 6, right, y - 6, -60, dimLabel(result, 'A', res)),
    dimension(id, c0, y + 6, c1, y + 6, 100, dimLabel(result, 'B', res), { anchor: 'end', labelDx: -12 }),
    dimension(id, cx + 5, y + 6, c1, y + 6, 70, dimLabel(result, 'C', res), { anchor: 'start', labelDx: 8 }),
    dimension(id, left, y + 6, c0, y + 6, 40, dimLabel(result, 'D', res), { anchor: 'start', labelDx: -30 }),
    dimension(id, c1, y + 6, right, y + 6, 40, dimLabel(result, 'D', res), { anchor: 'end', labelDx: 30 }),
  ].join('');

  return {
    id,
    title: 'Vista geral',
    caption:
      'Comprimentos em escala na horizontal (a espessura não). A: ponta a ponta. B: seção de coaxial (traço escuro), de um curto ao outro. ' +
      'C: cada toco, do corte da malha ao curto. D: cada fio da ponta, que é o que se apara no ajuste. ⚡ = tensão alta de RF ao transmitir.',
    svg: svgDoc(id, 680, 320, 'Double bazooka: vista geral', 'Seção central de coaxial com curtos nas pontas, fios nas extremidades e cabo de alimentação no centro.', body),
  };
}

/** Corte longitudinal: centro (malha cortada, vivo contínuo, alimentação) e uma ponta (curto). */
function cutaway(result: CalcResult, params: BazookaParams): Diagram {
  const id = 'bz-cutaway';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const hasGap = result.measurements.some((m) => m.label === 'E');
  const yTop = 70;
  const yBot = 110;
  const yIn = 90;
  const gl = 200;
  const gr = 240;
  const body = [
    // Malha (em cima e embaixo do vivo), cortada no centro.
    line(20, yTop, gl, yTop, 'dg-braid'),
    line(20, yBot, gl, yBot, 'dg-braid'),
    line(gr, yTop, 420, yTop, 'dg-braid'),
    line(gr, yBot, 420, yBot, 'dg-braid'),
    // Vivo contínuo.
    line(20, yIn, 420, yIn, 'dg-center'),
    text(330, yIn - 6, 'vivo (contínuo)', 'dg-note', 'middle'),
    text(110, yTop - 8, 'malha (metade esquerda)', 'dg-note', 'middle'),
    text(330, yTop - 8, 'malha (metade direita)', 'dg-note', 'middle'),
    // Alimentação: malha do cabo na metade esquerda, vivo na direita.
    line(220, 300, 220, 190, 'dg-coax'),
    path(`M220 190 Q200 150 ${gl - 4} ${yBot + 2}`, 'dg-braid'),
    path(`M220 190 Q240 150 ${gr + 4} ${yBot + 2}`, 'dg-center'),
    text(180, 170, 'malha do cabo', 'dg-label', 'end'),
    text(262, 170, 'vivo do cabo', 'dg-label'),
    chokeBeads(220, 214),
    textLines(240, 230, ['choke logo abaixo', 'da alimentação'], 'dg-note'),
    hasGap ? dimension(id, gl, yTop, gr, yTop, -34, dimLabel(result, 'E', res)) : '',
    // Detalhe da ponta: curto vivo–malha e fio da ponta.
    line(470, yTop, 590, yTop, 'dg-braid'),
    line(470, yBot, 590, yBot, 'dg-braid'),
    line(470, yIn, 590, yIn, 'dg-center'),
    line(590, yTop, 590, yBot, 'dg-center'),
    circle(590, yIn, 4, 'dg-terminal'),
    line(590, yIn, 670, yIn, 'dg-conductor'),
    text(450, yIn + 4, '…', 'dg-label', 'middle'),
    textLines(590, yBot + 24, ['curto: vivo soldado', 'na malha (vedar!)'], 'dg-note', 'middle'),
    text(668, yIn - 8, 'fio D', 'dg-note', 'end'),
    textLines(520, 210, ['por dentro, cada metade é', 'um toco de 1/4 de onda (C)', 'em curto na ponta'], 'dg-note', 'middle'),
  ].join('');
  return {
    id,
    title: 'Corte do coaxial: centro e ponta',
    caption:
      'No centro, a malha é removida' +
      (hasGap ? ' no trecho E' : '') +
      ' e o vivo continua inteiro; a malha do cabo de alimentação vai numa metade e o vivo na outra. Em cada ponta, o vivo é soldado ' +
      'na malha e o fio da ponta (D) sai dali. Vede o centro e os curtos: água no coaxial muda os tocos e aumenta a perda.',
    svg: svgDoc(id, 680, 310, 'Double bazooka: corte do coaxial', 'Malha cortada no centro com o vivo contínuo, ligação do cabo de alimentação e curto vivo–malha na ponta.', body),
  };
}

/** Curva de ROE (50 Ω) do modelo: bazooka e dipolo comum de mesmo diâmetro, os dois ressonantes na frequência de projeto. */
function swrChart(params: BazookaParams): Diagram {
  const id = 'bz-swr';
  const cable = coaxCables[params.cable]!;
  const vf = params.velocityFactor > 0 ? params.velocityFactor : cable.velocityFactor;
  const model = modelFor(params.frequencyMHz, cable, vf);
  const f0 = params.frequencyMHz;
  // Janela: 1,6 vez a faixa de 2:1 da bazooka, dentro da varredura do modelo.
  const half = model.band2.bazooka ? 0.8 * bandWidthMHz(model.band2.bazooka) : 0.05 * f0;
  const fMin = Math.max(model.sweep[0]!.fMHz, f0 - half);
  const fMax = Math.min(model.sweep[model.sweep.length - 1]!.fMHz, f0 + half);
  const x0 = 60;
  const x1 = 620;
  const y0 = 250;
  const y1 = 40;
  const swrTop = 3;
  const px = (fx: number) => x0 + ((fx - fMin) / (fMax - fMin)) * (x1 - x0);
  const py = (s: number) => y0 - ((Math.min(s, swrTop) - 1) / (swrTop - 1)) * (y0 - y1);
  const pts = model.sweep.filter((p) => p.fMHz >= fMin && p.fMHz <= fMax);
  const curve = (key: 'swrBazooka' | 'swrDipole') =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.fMHz).toFixed(1)} ${py(p[key]).toFixed(1)}`).join('');
  const d = (fx: number) => formatNumber(fx, f0 < 30 ? 3 : 2);
  const grid = [1.5, 2, 2.5, 3].map((s) => line(x0, py(s), x1, py(s), s === 2 ? 'dg-danger-line' : 'dg-ext'));
  const yLabels = [1, 1.5, 2, 2.5, 3].map((s) => text(x0 - 6, py(s) + 4, formatNumber(s, 1), 'dg-note', 'end'));
  const xLabels = [fMin, f0, fMax].map((fx) => text(px(fx), y0 + 18, d(fx), 'dg-note', 'middle'));
  const body = [
    line(x0, y0, x1, y0, 'dg-ext'),
    line(x0, y0, x0, y1, 'dg-ext'),
    ...grid,
    ...yLabels,
    ...xLabels,
    line(px(f0), y0, px(f0), y1, 'dg-ext'),
    path(curve('swrDipole'), 'dg-dim'),
    path(curve('swrBazooka'), 'dg-conductor'),
    text(x0 + (x1 - x0) / 2, y0 + 38, 'frequência (MHz)', 'dg-label', 'middle'),
    text(16, y1 - 14, 'ROE (50 Ω)', 'dg-label'),
    line(x1 - 200, y1 - 18, x1 - 176, y1 - 18, 'dg-conductor'),
    text(x1 - 170, y1 - 14, 'bazooka', 'dg-note'),
    line(x1 - 100, y1 - 18, x1 - 76, y1 - 18, 'dg-dim'),
    text(x1 - 70, y1 - 14, 'dipolo', 'dg-note'),
  ].join('');
  const b = model.band2.bazooka;
  const dp = model.band2.dipole;
  const ratio = b && dp ? `; a da bazooka é ${formatNumber(bandWidthMHz(b) / bandWidthMHz(dp), 2)} vez a do dipolo` : '';
  return {
    id,
    title: 'ROE estimada (modelo)',
    caption:
      `ROE em cabo de 50 Ω, antena já ajustada para ressoar em ${formatNumber(f0, 3)} MHz, no espaço livre. A linha vermelha é 2:1${ratio}. ` +
      'O dipolo comum tem o mesmo comprimento e diâmetro, sem os tocos. A altura e o solo deslocam as duas curvas: meça a sua com NanoVNA.',
    svg: svgDoc(id, 680, 300, 'Double bazooka: ROE estimada', 'Curvas de ROE em função da frequência para a bazooka e para um dipolo comum.', body),
  };
}

/** Padrão no plano do fio: o mesmo do dipolo de meia onda (o lado de fora da malha e os fios irradiam como um dipolo). */
function pattern(result: CalcResult, params: BazookaParams): Diagram {
  const lengthLambda = measure(result, 'A') / wavelength(params.frequencyMHz);
  const field = (a: number) => dipoleField(a, lengthLambda);
  const hp = halfPowerBeamwidthDeg(field, Math.PI / 2);
  return polarPlot({
    id: 'bz-pattern-e',
    title: 'Padrão no plano do fio (plano E)',
    caption:
      `Igual ao do dipolo de meia onda (Balanis §4.2): forma de "8", com nulos ao longo do fio. Largura de meia potência ≈ ${formatNumber(hp, 0)}°. ` +
      'No plano perpendicular ao fio o padrão é um círculo. Os tocos ficam por dentro da malha e não irradiam. Espaço livre: o solo e a altura mudam o padrão real.',
    desc: 'Gráfico polar em forma de oito: máximo perpendicular ao fio e nulos nas pontas.',
    axisLabels: { right: 'ponta do fio', up: 'perpendicular ao fio', left: 'ponta do fio', down: 'perpendicular ao fio' },
    field,
  });
}

export function diagrams(result: CalcResult, params: BazookaParams): Diagram[] {
  return [overview(result, params), cutaway(result, params), swrChart(params), pattern(result, params)];
}
