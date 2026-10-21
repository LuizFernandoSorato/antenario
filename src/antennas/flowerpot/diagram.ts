/**
 * Diagramas da flowerpot: vista em corte do tubo (fora de escala) e padrão no plano vertical (dipolo de meia onda).
 */

import { dipoleField, halfPowerBeamwidthDeg } from '../../core/pattern';
import { formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { type Diagram, dimLabel, dimension, highVoltage, line, path, rect, svgDoc, text, textLines } from '../diagram-kit';
import { polarPlot } from '../pattern-kit';
import type { CalcResult } from '../types';
import { type FlowerpotParams, chokeTurns } from './calc';

function sideView(result: CalcResult, params: FlowerpotParams): Diagram {
  const id = 'fp-side';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const choke = chokeTurns(params.frequencyMHz, params.formerDiameter, params.chokeBand === 1 ? 'narrow' : 'wide');
  const cx = 240;
  const tubeL = cx - 26;
  const tubeR = cx + 26;
  const yTip = 60;
  const yFeed = 230;
  const yCoil = 390;
  const coilH = 70;
  const yBottom = 530;

  const coil: string[] = [];
  // Espiras desenhadas (no máximo 12; o número real está no rótulo).
  const drawn = choke ? Math.min(Math.ceil(choke.turns), 12) : 6;
  const pitch = coilH / drawn;
  for (let i = 0; i < drawn; i++) {
    const y = yCoil + i * pitch;
    coil.push(path(`M${tubeL - 8} ${(y + 2).toFixed(1)}L${tubeR + 8} ${(y + pitch - 2).toFixed(1)}`, 'dg-coax'));
  }

  const body = [
    // Tubo (conduíte) com tampa.
    rect(tubeL, yTip - 30, tubeR - tubeL, yBottom - yTip + 30, 'dg-insulator', 4),
    rect(tubeL - 5, yTip - 38, tubeR - tubeL + 10, 16, 'dg-insulator', 3),
    text(tubeR + 14, yTip - 26, 'tampa', 'dg-note'),
    // Linha de náilon da ponta até a tampa.
    line(cx, yTip, cx, yTip - 22, 'dg-rope'),
    text(tubeR + 14, yTip - 6, 'linha de náilon', 'dg-note'),
    // Elemento de cima (vivo com dielétrico) e de baixo (coaxial inteiro).
    line(cx, yTip, cx, yFeed, 'dg-center'),
    line(cx, yFeed, cx, yCoil, 'dg-coax'),
    rect(cx - 6, yFeed - 3, 12, 6, 'dg-seal', 2),
    textLines(tubeR + 14, yTip + 60, ['vivo com o dielétrico', '(sem capa e sem malha)'], 'dg-note'),
    textLines(tubeR + 14, yFeed + 4, ['fim da malha =', 'ponto de alimentação'], 'dg-note'),
    textLines(tubeR + 14, yFeed + 80, ['coaxial inteiro:', 'a malha irradia por fora'], 'dg-note'),
    // Bobina e saída do cabo.
    ...coil,
    textLines(
      tubeR + 104,
      yCoil + 20,
      choke
        ? [
            `bobina: ${formatNumber(choke.turns, 1)} espiras`,
            `em tubo de ${formatNumber(choke.formerM * 1000, 0)} mm`,
            `cabo na bobina: ${dimLabel(result, 'D', res)}`,
          ]
        : ['bobina: fora da tabela', '(meça a ressonância', 'com o NanoVNA)'],
      'dg-note',
    ),
    line(cx, yCoil + coilH, cx, yBottom + 30, 'dg-coax'),
    text(cx + 10, yBottom + 26, 'coaxial → rádio', 'dg-note'),
    highVoltage(tubeR + 14, yTip + 22, 'alta tensão (TX)'),
    // Cotas.
    dimension(id, cx, yTip, cx, yFeed, 60, dimLabel(result, 'A', res), { anchor: 'end' }),
    dimension(id, cx, yFeed, cx, yCoil, 60, dimLabel(result, 'B', res), { anchor: 'end' }),
    dimension(id, cx, yTip, cx, yCoil, 150, dimLabel(result, 'C', res), { anchor: 'end' }),
    choke ? dimension(id, tubeR + 8, yCoil, tubeR + 8, yCoil + coilH, -12, dimLabel(result, 'E', res), { anchor: 'start' }) : '',
  ].join('');

  return {
    id,
    title: 'Vista em corte',
    caption:
      'Fora de escala. A: elemento de cima (vivo sem malha). B: coaxial inteiro do ponto de alimentação até a bobina. C: A + B. ' +
      'D: cabo gasto na bobina. E: comprimento da bobina (distância entre os furos do tubo). Tudo é um único cabo, sem emendas. ' +
      '⚡ = ponto de tensão alta de RF ao transmitir.',
    svg: svgDoc(
      id,
      600,
      580,
      'Flowerpot: vista em corte',
      'Tubo vertical com o vivo do coaxial em cima, o coaxial inteiro embaixo e uma bobina do cabo em volta do tubo.',
      body,
    ),
  };
}

/** Padrão no plano vertical: dipolo de meia onda ELÉTRICA (Balanis §4.2), em pé. No plano horizontal é um círculo. */
function pattern(): Diagram {
  const field = (a: number) => dipoleField(Math.PI / 2 - a, 0.5);
  const hp = halfPowerBeamwidthDeg(field, 0);
  return polarPlot({
    id: 'fp-pattern-v',
    title: 'Padrão no plano vertical',
    caption:
      `Dipolo de meia onda em pé (Balanis §4.2): máximo no horizonte e nulos para cima e para baixo; largura de meia potência ` +
      `≈ ${formatNumber(hp, 0)}°. Visto de cima, é um círculo (omnidirecional). Modelo ideal: a bobina, o tubo, o mastro e o cabo ` +
      'abaixo da bobina mudam um pouco o padrão real.',
    desc: 'Gráfico polar em forma de oito deitado: máximo no horizonte e nulos no zênite e no nadir.',
    axisLabels: { right: 'horizonte', up: 'zênite', left: 'horizonte', down: 'nadir' },
    field,
  });
}

export function diagrams(result: CalcResult, params: FlowerpotParams): Diagram[] {
  return [sideView(result, params), pattern()];
}
