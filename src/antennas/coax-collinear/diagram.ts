/**
 * Diagrama do colinear de coaxial: pilha vertical em escala (chicote, seções de meia onda,
 * seção de baixo, choke e conector), com a ligação cruzada vivo↔malha em cada junção.
 */

import { lengthResolutionForFrequency } from '../../core/units';
import { type Diagram, chokeBeads, circle, dimLabel, dimension, line, measure, rect, svgDoc, text } from '../diagram-kit';
import type { CalcResult } from '../types';
import type { CoaxCollinearParams } from './calc';

function stack(result: CalcResult, params: CoaxCollinearParams): Diagram {
  const id = 'cc-stack';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const n = params.sections;
  const whip = measure(result, 'A');
  const half = measure(result, 'B');
  const bottom = measure(result, 'C');
  const total = measure(result, 'D');
  const scale = 320 / total; // px por metro
  const cx = 260;
  const top = 50;
  const wid = 22; // largura do cabo no desenho

  const yWhipEnd = top;
  const yWhipBase = top + whip * scale;
  const sectionYs: number[] = [yWhipBase];
  for (let i = 0; i < n; i++) sectionYs.push(sectionYs[i]! + half * scale);
  const yBottomEnd = sectionYs[n]! + bottom * scale;

  const parts: string[] = [];
  parts.push(line(cx, yWhipEnd, cx, yWhipBase, 'dg-conductor'));
  parts.push(text(cx + 14, yWhipEnd + 10, 'chicote (só vivo)', 'dg-note'));
  for (let i = 0; i < n; i++) {
    parts.push(rect(cx - wid / 2, sectionYs[i]!, wid, half * scale, i % 2 === 0 ? 'dg-connector' : 'dg-ext', 2));
    parts.push(text(cx + 20, (sectionYs[i]! + sectionYs[i + 1]!) / 2 + 4, `meia onda ${i + 1}`, 'dg-note'));
  }
  parts.push(rect(cx - wid / 2, sectionYs[n]!, wid, bottom * scale, 'dg-mast', 2));
  parts.push(text(cx + 20, (sectionYs[n]! + yBottomEnd) / 2 + 4, '1/4 de onda', 'dg-note'));
  // Cruzamentos nas junções (vivo ↔ malha).
  for (let i = 0; i <= n; i++) {
    const y = sectionYs[i]!;
    parts.push(line(cx - wid / 2 - 6, y, cx + wid / 2 + 6, y, 'dg-conductor'));
    parts.push(circle(cx, y, 2.5, 'dg-conductor'));
  }
  parts.push(text(cx + 20, sectionYs[1]! + 16, 'vivo ↔ malha em cada junção', 'dg-note'));
  // Choke e conector.
  parts.push(line(cx, yBottomEnd, cx, yBottomEnd + 70, 'dg-coax'));
  parts.push(chokeBeads(cx, yBottomEnd + 14, 2));
  parts.push(text(cx + 18, yBottomEnd + 64, 'choke e cabo para o rádio', 'dg-note'));
  // Cotas.
  parts.push(
    dimension(id, cx, yWhipEnd, cx, yWhipBase, 60, dimLabel(result, 'A', res), { anchor: 'end' }),
    dimension(id, cx, sectionYs[0]!, cx, sectionYs[1]!, 60, dimLabel(result, 'B', res), { anchor: 'end' }),
    dimension(id, cx, sectionYs[n]!, cx, yBottomEnd, 60, dimLabel(result, 'C', res), { anchor: 'end' }),
    dimension(id, cx, yWhipEnd, cx, yBottomEnd, 150, dimLabel(result, 'D', res), { anchor: 'end' }),
    text(cx + 160, yWhipEnd - 14, `E = ${dimLabel(result, 'E', res).replace(/^E = /, '')} de coaxial`, 'dg-label'),
  );

  return {
    id,
    title: 'Montagem (em escala)',
    caption:
      'Chicote de 1/4 de onda no topo (A), seções de meia onda de coaxial (B) com vivo e malha trocados em cada junção, ' +
      'e a seção de 1/4 de onda embaixo (C). D: comprimento total. E: coaxial total.',
    svg: svgDoc(
      id,
      620,
      Math.round(yBottomEnd + 90),
      'Colinear de coaxial: montagem',
      `Chicote, ${n} seções de meia onda de coaxial com ligações cruzadas, seção de 1/4 de onda, choke e cabo.`,
      parts.join(''),
    ),
  };
}

export function diagrams(result: CalcResult, params: CoaxCollinearParams): Diagram[] {
  return [stack(result, params)];
}
