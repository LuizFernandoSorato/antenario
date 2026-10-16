/**
 * Diagrama do J-pole: comprimentos verticais em escala; espaçamento entre os
 * condutores exagerado para caber as ligações. O ponto de alimentação é
 * desenhado só como indicação (a posição real se acha medindo; ver guia).
 */

import { lengthResolutionForFrequency } from '../../core/units';
import {
  type Diagram,
  chokeBeads,
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
import type { CalcResult } from '../types';
import type { JPoleParams } from './calc';

/** Altura do elemento longo (cota A) no desenho, em px. */
const LONG_PX = 540;

function overview(result: CalcResult, params: JPoleParams): Diagram {
  const id = 'jpole-overview';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const scale = LONG_PX / measure(result, 'A');
  const stubPx = measure(result, 'C') * scale;
  const xL = 200;
  const xS = 250;
  const yTop = 50;
  const yBase = yTop + LONG_PX;
  const yStub = yBase - stubPx;
  // Posição apenas ilustrativa do tap (não é uma medida calculada).
  const yTap = yBase - stubPx * 0.15;

  const body = [
    // Condutores e curto na base.
    line(xL, yBase, xL, yTop, 'dg-conductor'),
    line(xS, yBase, xS, yStub, 'dg-conductor'),
    line(xL, yBase, xS, yBase, 'dg-conductor'),
    // Tensão alta nas pontas.
    highVoltage(xL, yTop - 18, 'alta tensão (TX)', 'middle'),
    highVoltage(xS + 6, yStub + 18),
    // Ponto de alimentação: abraçadeiras, coaxial e choke.
    rect(xL - 8, yTap - 4, 16, 8, 'dg-clamp', 2),
    rect(xS - 8, yTap - 4, 16, 8, 'dg-clamp', 2),
    path(`M175 680 L175 ${yTap + 30} Q175 ${yTap + 16} 185 ${yTap + 14}`, 'dg-coax'),
    path(`M185 ${yTap + 14} L${xL - 8} ${yTap}`, 'dg-center'),
    path(`M185 ${yTap + 14} Q225 ${yTap + 24} ${xS - 8} ${yTap + 2}`, 'dg-braid'),
    chokeBeads(175, yBase + 12),
    text(160, yBase + 36, 'choke', 'dg-note', 'end'),
    `<line x1="266" y1="${yTap - 24}" x2="266" y2="${yTap + 20}" class="dg-dim" ` +
      `marker-start="url(#${id}-arrow)" marker-end="url(#${id}-arrow)"/>`,
    textLines(310, yTap - 20, ['vivo → elemento longo', 'malha → elemento curto'], 'dg-note'),
    textLines(310, yTap + 14, ['ponto de alimentação:', 'deslize até achar', 'a ROE mínima'], 'dg-note'),
    textLines(xS + 8, yBase + 58, ['fixe no mastro pela base', '(região do curto, baixa tensão)'], 'dg-note'),
    // Cotas.
    dimension(id, xL, yTop, xL, yBase, 50, dimLabel(result, 'A', res), { anchor: 'end' }),
    dimension(id, xL, yTop, xL, yStub, -90, dimLabel(result, 'B', res), { anchor: 'start' }),
    dimension(id, xS, yStub, xS, yBase, -40, dimLabel(result, 'C', res), { anchor: 'start' }),
    // Rótulo de D à direita da cota, longe do coaxial que sobe pela esquerda.
    dimension(id, xL, yBase, xS, yBase, 26, dimLabel(result, 'D', res), { anchor: 'start', labelDx: 34 }),
  ].join('');

  return {
    id,
    title: 'Vista geral',
    caption:
      'Comprimentos verticais em escala; o espaçamento D está exagerado para caber as ligações. ' +
      'A posição do ponto de alimentação é só ilustrativa: ele é encontrado medindo (veja o guia). ' +
      '⚡ = pontos de tensão alta de RF ao transmitir.',
    svg: svgDoc(
      id,
      470,
      690,
      'J-pole: vista geral',
      'Elemento longo e elemento curto unidos pela base, ponto de alimentação com abraçadeiras e coaxial com choke.',
      body,
    ),
  };
}

export function diagrams(result: CalcResult, params: JPoleParams): Diagram[] {
  return [overview(result, params)];
}
