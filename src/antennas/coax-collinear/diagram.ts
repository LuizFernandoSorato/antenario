/**
 * Diagrama do colinear de coaxial: pilha vertical em escala (chicote, seções de meia onda,
 * seção de baixo, choke e conector), com a ligação cruzada vivo↔malha em cada junção.
 */

import { collinearField, halfPowerBeamwidthDeg, revolutionDirectivity } from '../../core/pattern';
import { formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { polarPlot } from '../pattern-kit';
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

/**
 * Padrões do colinear de coaxial: modelo de arranjo colinear IDEAL de N dipolos de meia onda em fase, espaçados de λ/2
 * (elemento × fator de arranjo, Balanis §6.4). A diretividade do modelo (3,8 / 6,4 / 8,0 / 9,2 dBi para 2 / 4 / 6 / 8 seções) fica na
 * faixa da tabela de ganho da ferramenta (3–4 / 6 / 8–9 / 8–9 dBi). O coaxial real tem seções de λ/2·VF (≈ 0,33λ) e a distribuição de
 * corrente não é a de dipolos separados: TODO(fonte) para a corrente real.
 */
function patterns(params: CoaxCollinearParams): Diagram[] {
  const n = params.sections;
  const field = (a: number) => collinearField(Math.acos(Math.sin(a)), n, 0.5);
  const hp = halfPowerBeamwidthDeg((t) => collinearField(t, n, 0.5), Math.PI / 2);
  const gain = 10 * Math.log10(revolutionDirectivity((t) => collinearField(t, n, 0.5)));
  const note =
    'Modelo de arranjo ideal (N dipolos de meia onda em fase, espaçados de λ/2), não do coaxial real: o mastro, o cabo e o solo mudam o padrão. ' +
    'O ideal tem lóbulos laterais na elevação e nulos entre eles. TODO(fonte): corrente real do colinear de coaxial.';
  return [
    polarPlot({
      id: 'coaxcol-pattern-v',
      title: 'Padrão vertical (elevação)',
      caption:
        `${n} seções: lóbulo principal achatado no horizonte (quanto mais seções, mais estreito na vertical). Largura de meia potência ≈ ${formatNumber(hp, 0)}°; ` +
        `diretividade do modelo ≈ ${formatNumber(gain, 1)} dBi. ${note}`,
      desc: 'Gráfico polar na vertical: lóbulo principal no horizonte, estreito, com lóbulos laterais pequenos.',
      axisLabels: { right: 'horizonte', up: 'zênite', left: 'horizonte', down: 'nadir' },
      field,
    }),
    polarPlot({
      id: 'coaxcol-pattern-h',
      title: 'Padrão horizontal (azimute)',
      caption: `Círculo: omnidirecional no plano horizontal. ${note}`,
      desc: 'Gráfico polar circular: a irradiação é igual em todas as direções horizontais.',
      axisLabels: { right: '0°', up: '90°', left: '180°', down: '270°' },
      field: () => 1,
    }),
  ];
}

export function diagrams(result: CalcResult, params: CoaxCollinearParams): Diagram[] {
  return [stack(result, params), ...patterns(params)];
}
