/**
 * Diagrama do discone: vista lateral em escala (disco em cima, cone invertido embaixo,
 * coaxial subindo por dentro do cone) e vista de cima com as hastes.
 */

import { degToRad } from '../../core/complex';
import { formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { type Diagram, chokeBeads, circle, dimLabel, dimension, line, measure, path, rect, svgDoc, text } from '../diagram-kit';
import type { CalcResult } from '../types';
import type { DisconeParams } from './calc';
import { coneHalfAngleDeg } from './calc';

function sideView(result: CalcResult, params: DisconeParams): Diagram {
  const id = 'dc-side';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const height = measure(result, 'C');
  const baseD = measure(result, 'B');
  const discD = measure(result, 'D');
  const gap = measure(result, 'F');
  const widest = Math.max(baseD, discD);
  const scale = Math.min(250 / (height + gap), 300 / widest);
  const cx = 300;
  const discY = 60;
  const discH = 6;
  const apexY = discY + discH + Math.max(gap * scale, 8); // a folga é pequena: mostra no mínimo 8 px
  const baseY = apexY + height * scale;
  const rBase = (baseD * scale) / 2;
  const rDisc = (discD * scale) / 2;

  const body = [
    // Disco e cone.
    rect(cx - rDisc, discY, rDisc * 2, discH, 'dg-conductor'),
    path(`M${cx} ${apexY} L${cx - rBase} ${baseY} L${cx + rBase} ${baseY} Z`, 'dg-ext'),
    line(cx, apexY, cx - rBase, baseY, 'dg-conductor'),
    line(cx, apexY, cx + rBase, baseY, 'dg-conductor'),
    line(cx - rBase, baseY, cx + rBase, baseY, 'dg-conductor'),
    // Coaxial: sobe por dentro do cone até o disco.
    line(cx, discY + discH, cx, baseY + 50, 'dg-coax'),
    chokeBeads(cx, baseY + 30, 2),
    text(cx + 18, baseY + 48, 'coaxial com choke', 'dg-note'),
    text(cx + 10, apexY + 130, 'vivo no disco (por dentro do cone)', 'dg-note'),
    text(cx - rBase + 10, baseY + 18, 'malha no vértice do cone', 'dg-note'),
    // Cotas.
    dimension(id, cx - rDisc, discY, cx + rDisc, discY, -22, dimLabel(result, 'D', res)),
    dimension(id, cx - rBase, baseY, cx + rBase, baseY, 80, dimLabel(result, 'B', res)),
    dimension(id, cx + rBase, apexY, cx + rBase, baseY, -26, dimLabel(result, 'C', res), { anchor: 'start' }),
    dimension(id, cx, apexY, cx - rBase, baseY, 28, dimLabel(result, 'A', res), { anchor: 'end' }),
    line(cx - 60, discY + discH + 22, cx - 4, discY + discH + 6, 'dg-ext'),
    text(cx - 66, discY + discH + 26, dimLabel(result, 'F', res) + ' (folga)', 'dg-dim-text', 'end'),
  ].join('');

  return {
    id,
    title: 'Vista lateral (em escala)',
    caption:
      `Cone com semiângulo de ${formatNumber(coneHalfAngleDeg(params.designImpedance), 1)}° (medido do eixo). A: lateral do cone. ` +
      'B: diâmetro da base. C: altura. D: diâmetro do disco. F: folga isolante entre o disco e o vértice do cone ' +
      '(exagerada no desenho se for menor que 8 px).',
    svg: svgDoc(
      id,
      620,
      Math.round(baseY + 110),
      'Discone: vista lateral',
      'Disco em cima, cone invertido embaixo, coaxial subindo por dentro do cone até o disco.',
      body,
    ),
  };
}

function topView(result: CalcResult, params: DisconeParams): Diagram {
  const id = 'dc-top';
  const n = params.rodCount;
  const cx = 140;
  const cy = 130;
  const radius = 100;
  const spokes: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = degToRad(-90 + (360 / n) * i);
    spokes.push(line(cx, cy, cx + radius * Math.cos(a), cy + radius * Math.sin(a), 'dg-conductor'));
  }
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const body = [
    circle(cx, cy, radius, 'dg-ext'),
    ...spokes,
    circle(cx, cy, 8, 'dg-connector'),
    text(cx, 262, `${n} hastes, ${dimLabel(result, 'E', res)} cada`, 'dg-label', 'middle'),
  ].join('');
  return {
    id,
    title: 'Disco visto de cima (hastes)',
    caption: 'Se o disco for de hastes, distribua-as por igual a partir do centro. Com chapa, use um disco de diâmetro D.',
    svg: svgDoc(id, 280, 280, 'Discone: disco visto de cima', `${n} hastes radiais iguais saindo do centro do disco.`, body),
  };
}

export function diagrams(result: CalcResult, params: DisconeParams): Diagram[] {
  return [sideView(result, params), topView(result, params)];
}
