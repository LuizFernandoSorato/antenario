/**
 * Polarização circular: opção de sentido (RHCP ou LHCP) comum às antenas circulares e o diagrama de polaridade dos braços.
 *
 * Convenção (IEEE Std 145; ver `core/polarization.ts`): RHCP = o vetor E gira no sentido horário visto olhando NA DIREÇÃO do feixe.
 * Regra de montagem dos pares cruzados (turnstile, cross Yagi): o elemento atrasado de 90° vem DEPOIS do direto na rotação do campo,
 * pois o campo gira do elemento adiantado para o atrasado. Cada elemento é um dipolo com um braço ligado ao vivo (condutor central)
 * e outro à malha: olhando na direção do feixe, se o braço vivo do elemento atrasado está 90° no sentido HORÁRIO do braço vivo
 * do elemento direto, o campo gira no sentido horário (RHCP); no sentido anti-horário, LHCP. Trocar a polaridade da ligação do elemento
 * atrasado (vivo ↔ malha) inverte o sentido, tal como trocar qual dos dois elementos recebe a linha de 90°.
 */

import { type Diagram, circle, line, path, svgDoc, text } from './diagram-kit';
import type { ParamSpec } from './types';

/** Valores do campo de escolha de sentido (o cálculo recebe estes números; a tela mostra RHCP e LHCP). */
export const RHCP = 1;
export const LHCP = 2;

export type Sense = 'rhcp' | 'lhcp';

/** Campo de escolha do sentido da polarização circular (botões de opção). */
export function circularSenseParam(help?: string): ParamSpec {
  return {
    key: 'circularSense',
    kind: 'choice',
    label: 'Sentido da polarização circular',
    unit: '',
    defaultValue: RHCP,
    toSi: 1,
    options: [
      { value: RHCP, label: 'Circular à direita (RHCP)' },
      { value: LHCP, label: 'Circular à esquerda (LHCP)' },
    ],
    help:
      help ??
      'Satélites meteorológicos de 137 MHz (NOAA, Meteor) transmitem em RHCP. A antena receptora precisa ter o MESMO sentido do sinal: ' +
      'o sentido contrário perde muito sinal. Confirme o sentido do SEU satélite.',
  };
}

/** Converte o valor do campo em 'rhcp' ou 'lhcp'; qualquer outro valor é recusado. */
export function senseOf(value: number): Sense {
  if (value === RHCP) return 'rhcp';
  if (value === LHCP) return 'lhcp';
  throw new RangeError('O sentido da polarização deve ser RHCP ou LHCP.');
}

export const SENSE_NAME: Record<Sense, string> = { rhcp: 'RHCP (circular à direita)', lhcp: 'LHCP (circular à esquerda)' };

/**
 * Diagrama dos braços vivos de dois elementos cruzados, vistos olhando na direção do feixe. O elemento direto fica na vertical; o atrasado
 * (linha de 90°) na horizontal, com o braço vivo à direita (RHCP: 90° no sentido horário do vivo do direto) ou à esquerda (LHCP).
 */
export function armPolarityDiagram(o: {
  id: string;
  sense: Sense;
  /** De onde se olha, para o título e a legenda ("de baixo para cima", "de trás da antena para a frente"). */
  viewText: string;
  directName: string;
  delayedName: string;
}): Diagram {
  const cx = 170;
  const cy = 140;
  const arm = 95;
  const right = o.sense === 'rhcp';
  const dx = right ? arm : -arm;
  const parts: string[] = [
    // elemento direto: braço vivo em cima, malha embaixo
    line(cx, cy, cx, cy - arm, 'dg-coax'),
    line(cx, cy, cx, cy + arm, 'dg-braid'),
    // elemento atrasado: vivo para o lado do sentido escolhido, malha para o outro
    line(cx, cy, cx + dx, cy, 'dg-coax'),
    line(cx, cy, cx - dx, cy, 'dg-braid'),
    circle(cx, cy, 5, 'dg-connector'),
    text(cx + 8, cy - arm + 10, 'vivo', 'dg-note'),
    text(cx + 8, cy + arm - 2, 'malha', 'dg-note'),
    text(cx + dx + (right ? -4 : 4), cy - 8, 'vivo', 'dg-note', right ? 'end' : 'start'),
    text(cx - dx + (right ? 4 : -4), cy - 8, 'malha', 'dg-note', right ? 'start' : 'end'),
    text(cx, 20, o.directName, 'dg-label', 'middle'),
    text(cx + (right ? 1 : -1) * (arm + 6), cy + 22, o.delayedName, 'dg-label', right ? 'end' : 'start'),
  ];
  // Seta de rotação do campo: do braço vivo do direto (12 h) para o vivo do atrasado, 90°.
  const r = 52;
  const sweep = right ? 1 : 0;
  const endX = cx + (right ? r : -r);
  parts.push(path(`M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweep} ${endX} ${cy}`, 'dg-dim'));
  // Ponta da seta em (endX, cy), apontando para baixo (o campo chega ao eixo horizontal vindo de cima).
  parts.push(path(`M ${endX} ${cy + 3} l -5 -9 l 10 0 Z`, 'dg-arrow'));
  parts.push(text(cx + (right ? 1 : -1) * 16, cy - 28, o.sense === 'rhcp' ? 'horário' : 'anti-horário', 'dg-note', right ? 'start' : 'end'));
  return {
    id: o.id,
    title: `Polaridade dos braços para ${o.sense === 'rhcp' ? 'RHCP' : 'LHCP'}`,
    caption:
      `Vista ${o.viewText}. O braço vivo (condutor central do coaxial) do elemento atrasado de 90° fica ` +
      `${right ? '90° no sentido horário' : '90° no sentido anti-horário'} do braço vivo do elemento direto: o campo gira do adiantado para o ` +
      `atrasado, no sentido ${right ? 'horário (RHCP)' : 'anti-horário (LHCP)'}. Trocar vivo e malha do elemento atrasado inverte o sentido.`,
    svg: svgDoc(
      o.id,
      340,
      270,
      `Polaridade dos braços (${o.sense.toUpperCase()})`,
      `Dois elementos cruzados com o braço vivo do atrasado ${right ? 'à direita' : 'à esquerda'} do vivo do direto, vistos olhando na direção do feixe.`,
      parts.join(''),
    ),
  };
}
