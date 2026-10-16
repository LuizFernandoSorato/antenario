/**
 * Diagramas do dipolo: vista geral com cotas e detalhe do ponto de alimentação.
 * Esquemático (fora de escala): um dipolo é muito mais comprido que largo.
 */

import { lengthResolutionForFrequency } from '../../core/units';
import {
  type Diagram,
  chokeBeads,
  circle,
  dimLabel,
  dimension,
  highVoltage,
  line,
  path,
  rect,
  svgDoc,
  text,
  textLines,
} from '../diagram-kit';
import type { CalcResult } from '../types';
import type { DipoleParams } from './calc';

function overview(result: CalcResult, params: DipoleParams): Diagram {
  const id = 'dipole-overview';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const hasGap = result.measurements.some((m) => m.label === 'C');
  const y = 130;
  const left = 70;
  const right = 610;
  const cx = 340;

  const body = [
    // Cordas e isoladores das pontas.
    line(12, y, left - 14, y, 'dg-rope'),
    line(right + 14, y, 668, y, 'dg-rope'),
    rect(left - 14, y - 5, 14, 10, 'dg-insulator', 4),
    rect(right, y - 5, 14, 10, 'dg-insulator', 4),
    text(14, y - 10, 'corda', 'dg-note'),
    text(666, y - 10, 'corda', 'dg-note', 'end'),
    // Braços.
    line(left, y, cx - 12, y, 'dg-conductor'),
    line(cx + 12, y, right, y, 'dg-conductor'),
    // Isolador central.
    rect(cx - 20, y - 13, 40, 26, 'dg-insulator', 4),
    text(cx - 24, y - 18, 'malha', 'dg-note', 'end'),
    text(cx + 24, y - 18, 'vivo', 'dg-note'),
    // Coaxial com choke.
    line(cx, y + 13, cx, 310, 'dg-coax'),
    chokeBeads(cx, y + 34),
    text(cx + 16, y + 52, 'balun/choke 1:1', 'dg-note'),
    text(cx + 16, 300, 'coaxial → rádio', 'dg-note'),
    // Tensão alta nas pontas.
    highVoltage(left + 6, y + 28, 'alta tensão (TX)'),
    highVoltage(right - 6, y + 28, 'alta tensão (TX)', 'end'),
    // Cotas.
    dimension(id, left, y - 6, right, y - 6, -50, dimLabel(result, 'A', res)),
    dimension(id, left, y + 6, cx - 12, y + 6, 70, dimLabel(result, 'B', res)),
    dimension(id, cx + 12, y + 6, right, y + 6, 70, dimLabel(result, 'B', res)),
    hasGap ? dimension(id, cx - 12, y - 14, cx + 12, y - 14, -26, 'C') : '',
  ].join('');

  return {
    id,
    title: 'Vista geral',
    caption:
      'Fora de escala. A: ponta a ponta. B: cada braço, do terminal até a ponta' +
      (hasGap ? '. C: espaço no isolador central (valor na tabela).' : '.') +
      ' ⚡ = ponto de tensão alta de RF ao transmitir.',
    svg: svgDoc(id, 680, 320, 'Dipolo de meia onda: vista geral', 'Dois braços iguais com isolador central e coaxial descendo pelo centro.', body),
  };
}

function feedDetail(): Diagram {
  const id = 'dipole-feed';
  const body = [
    // Placa isolante com dois terminais.
    rect(110, 50, 220, 80, 'dg-insulator', 8),
    text(220, 44, 'isolador central (PVC, acrílico, fenolite)', 'dg-note', 'middle'),
    // Braços chegando pelas laterais e presos nos terminais.
    line(10, 90, 150, 90, 'dg-conductor'),
    line(290, 90, 430, 90, 'dg-conductor'),
    circle(150, 90, 7, 'dg-terminal'),
    circle(290, 90, 7, 'dg-terminal'),
    text(20, 80, 'braço esquerdo', 'dg-note'),
    text(420, 80, 'braço direito', 'dg-note', 'end'),
    // Coaxial: malha para a esquerda, vivo para a direita.
    line(220, 300, 220, 160, 'dg-coax'),
    path('M220 160 Q200 130 150 97', 'dg-braid'),
    path('M220 160 Q240 130 290 97', 'dg-center'),
    text(150, 150, 'malha', 'dg-label', 'end'),
    text(292, 150, 'vivo (condutor central)', 'dg-label'),
    // Choke e vedação.
    chokeBeads(220, 190),
    textLines(240, 205, ['choke logo abaixo', 'do ponto de alimentação'], 'dg-note'),
    rect(212, 152, 16, 16, 'dg-seal', 3),
    textLines(150, 175, ['vede com fita de', 'autofusão + isolante'], 'dg-note', 'end'),
  ].join('');

  return {
    id,
    title: 'Detalhe da alimentação',
    caption:
      'A malha vai num braço e o vivo no outro. Solde bem, vede contra a água e prenda o cabo ' +
      'ao isolador para a solda não sustentar o peso.',
    svg: svgDoc(id, 440, 320, 'Dipolo: detalhe do ponto de alimentação', 'Ligação do coaxial aos dois braços no isolador central.', body),
  };
}

export function diagrams(result: CalcResult, params: DipoleParams): Diagram[] {
  return [overview(result, params), feedDetail()];
}
