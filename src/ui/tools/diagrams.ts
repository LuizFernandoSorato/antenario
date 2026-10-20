/**
 * Desenhos esquemáticos das ferramentas de cabos, casamento e segurança (SVG gerado por código).
 *
 * São esquemas: os comprimentos e valores calculados aparecem como cotas e rótulos, mas as proporções do desenho
 * não estão em escala (cada legenda avisa).
 */

import { type Diagram, circle, dimension, line, path, rect, svgDoc, text, textLines } from '../../antennas/diagram-kit';
import { formatEngineering, formatLength, formatNumber, type LengthResolution } from '../../core/units';
import type { ReactiveComponent } from '../../matching/l-network';

/** Trecho de cabo coaxial (capa grossa com o condutor central por cima). */
function coax(x1: number, y1: number, x2: number, y2: number): string {
  return line(x1, y1, x2, y2, 'dg-coax') + line(x1, y1, x2, y2, 'dg-center');
}

/** Caixa com texto centralizado (uma linha por item). */
function box(x: number, y: number, w: number, h: number, lines: string[]): string {
  const first = y + h / 2 - ((lines.length - 1) * 15) / 2 + 4;
  return rect(x, y, w, h, 'dg-connector', 4) + textLines(x + w / 2, first, lines, 'dg-label', 'middle');
}

const ohms = (v: number) => `${formatNumber(v, 1)} Ω`;

/** Transformador de 1/4 de onda: esquema e montagem com dois cabos em paralelo. */
export function quarterWaveDiagrams(o: {
  z0: number;
  loadOhms: number;
  idealOhms: number;
  cableName: string;
  cableOhms: number;
  singleLengthM: number;
  pairLengthM: number;
  res: LengthResolution;
}): Diagram[] {
  const id1 = 'qw-scheme';
  const scheme = [
    box(10, 80, 80, 70, ['Rádio', 'e cabo', `Z0 = ${formatNumber(o.z0, 0)} Ω`]),
    coax(90, 115, 260, 115),
    text(175, 100, `cabo de ${formatNumber(o.z0, 0)} Ω`, 'dg-note', 'middle'),
    circle(260, 115, 5, 'dg-terminal'),
    coax(260, 115, 470, 115),
    text(365, 100, `Z_t ≈ ${ohms(o.idealOhms)}`, 'dg-label', 'middle'),
    dimension(id1, 260, 115, 470, 115, 36, `λ/4 no cabo = ${formatLength(o.singleLengthM, o.res)}`),
    box(470, 80, 130, 70, ['Antena', `R = ${ohms(o.loadOhms)}`]),
    text(300, 215, `Com um ${o.cableName}: ${formatNumber(o.cableOhms, 1)} Ω (impedância real do cabo).`, 'dg-note', 'middle'),
  ].join('');

  const id2 = 'qw-pair';
  const pair = [
    coax(10, 140, 110, 140),
    text(10, 125, 'cabo do rádio', 'dg-note'),
    box(110, 85, 90, 110, ['Junção A', 'vivos unidos', 'malhas unidas']),
    coax(200, 110, 440, 110),
    coax(200, 170, 440, 170),
    text(320, 98, `${formatNumber(o.cableOhms, 1)} Ω`, 'dg-note', 'middle'),
    text(320, 190, `${formatNumber(o.cableOhms, 1)} Ω`, 'dg-note', 'middle'),
    dimension(id2, 200, 170, 440, 170, 34, `cada cabo = ${formatLength(o.pairLengthM, o.res)}`),
    box(440, 85, 90, 110, ['Junção B', 'vivos unidos', 'malhas unidas']),
    line(530, 140, 560, 140, 'dg-conductor'),
    box(560, 105, 60, 70, ['Antena']),
    text(320, 250, 'Dois cabos IGUAIS, do mesmo comprimento: a impedância em paralelo vale a metade da de um cabo.', 'dg-note', 'middle'),
  ].join('');

  return [
    {
      id: id1,
      title: 'Esquema do transformador',
      caption:
        'Um trecho de λ/4 (já com o fator de velocidade do cabo) entre o cabo do rádio e a antena. Esquemático, fora de escala.',
      svg: svgDoc(id1, 620, 240, 'Esquema do transformador de 1/4 de onda', 'Rádio, cabo, trecho de um quarto de onda e antena em linha.', scheme),
    },
    {
      id: id2,
      title: 'Montagem com dois cabos em paralelo',
      caption:
        'Nas duas pontas, os dois vivos (condutores centrais) são unidos entre si e as duas malhas são unidas entre si. ' +
        'Meça o comprimento entre os pontos de solda das duas junções. Esquemático, fora de escala.',
      svg: svgDoc(id2, 640, 270, 'Dois cabos em paralelo', 'Dois trechos de cabo iguais ligados em paralelo entre duas junções.', pair),
    },
  ];
}

/** Símbolo de indutor (espiras) ou capacitor (placas), centrado em (cx, cy), na horizontal ou na vertical. */
function reactive(c: ReactiveComponent | null, cx: number, cy: number, vertical: boolean): string {
  const rot = vertical ? ` rotate(90)` : '';
  let symbol: string;
  if (c === null) {
    symbol = line(-30, 0, 30, 0, 'dg-conductor');
  } else if (c.kind === 'inductor') {
    const d = 'M-30 0 L-18 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 L30 0';
    symbol = path(d, 'dg-conductor');
  } else {
    symbol = line(-30, 0, -5, 0, 'dg-conductor') + line(5, 0, 30, 0, 'dg-conductor') + line(-5, -14, -5, 14, 'dg-conductor') + line(5, -14, 5, 14, 'dg-conductor');
  }
  return `<g transform="translate(${cx} ${cy})${rot}">${symbol}</g>`;
}

function componentName(c: ReactiveComponent | null): string {
  if (!c) return 'fio (não precisa)';
  return `${c.kind === 'inductor' ? 'indutor' : 'capacitor'} ${formatEngineering(c.value, c.kind === 'inductor' ? 'H' : 'F')}`;
}

/** Esquema de uma solução da rede L. */
export function lNetworkDiagram(o: {
  index: number;
  topology: 'shunt-at-load' | 'series-at-load';
  series: ReactiveComponent | null;
  shunt: ReactiveComponent | null;
  zLoadText: string;
  z0: number;
}): Diagram {
  const id = `lnet-${o.index}`;
  const top = 70;
  const bottom = 180;
  const atLoad = o.topology === 'shunt-at-load'; // paralelo junto à antena; série do lado do rádio
  const seriesX = atLoad ? 190 : 370;
  const shuntX = atLoad ? 340 : 190;
  const parts: string[] = [
    box(20, top, 60, bottom - top, ['Rádio', `${formatNumber(o.z0, 0)} Ω`]),
    box(500, top, 90, bottom - top, ['Antena', o.zLoadText]),
    line(80, top, seriesX - 30, top, 'dg-conductor'),
    reactive(o.series, seriesX, top, false),
    line(seriesX + 30, top, 500, top, 'dg-conductor'),
    line(80, bottom, 500, bottom, 'dg-conductor'),
    // elemento em paralelo: da linha de cima para a de baixo
    line(shuntX, top, shuntX, bottom / 2 + top / 2 - 30, 'dg-conductor'),
    reactive(o.shunt, shuntX, (top + bottom) / 2, true),
    line(shuntX, (top + bottom) / 2 + 30, shuntX, bottom, 'dg-conductor'),
    circle(shuntX, top, 4, 'dg-terminal'),
    circle(shuntX, bottom, 4, 'dg-terminal'),
    text(seriesX, top - 28, `série: ${componentName(o.series)}`, 'dg-label', 'middle'),
    text(shuntX + 26, (top + bottom) / 2 + 4, `paralelo: ${componentName(o.shunt)}`, 'dg-label', atLoad ? 'start' : 'start'),
    text(300, 232, atLoad ? 'Elemento em paralelo do lado da antena; em série do lado do rádio.' : 'Elemento em série do lado da antena; em paralelo do lado do rádio.', 'dg-note', 'middle'),
  ];
  return {
    id,
    title: `Esquema da solução ${o.index + 1}`,
    caption:
      'A linha de baixo é o terra (malha do cabo). O elemento em paralelo vai entre o vivo e o terra; o em série fica no vivo. Esquemático.',
    svg: svgDoc(id, 620, 250, `Rede L, solução ${o.index + 1}`, 'Rádio, elemento em série, elemento em paralelo e antena.', parts.join('')),
  };
}

/** Casamento com stub: linha, ponto do stub e ponta do stub (curto ou aberta). */
export function stubDiagram(o: {
  index: number;
  distanceM: number;
  stubM: number;
  termination: 'short' | 'open';
  res: LengthResolution;
}): Diagram {
  const id = `stub-${o.index}`;
  const y = 170;
  const x = 330;
  const endY = 70;
  const parts = [
    box(10, y - 35, 80, 70, ['Rádio']),
    coax(90, y, 520, y),
    box(520, y - 35, 90, 70, ['Antena']),
    coax(x, y, x, endY),
    circle(x, y, 5, 'dg-terminal'),
    dimension(id, x, y, 520, y, 38, `distância = ${formatLength(o.distanceM, o.res)}`),
    dimension(id, x, y, x, endY, -34, `stub = ${formatLength(o.stubM, o.res)}`, { anchor: 'end' }),
    o.termination === 'short'
      ? line(x - 14, endY - 6, x + 14, endY - 6, 'dg-conductor') + text(x + 20, endY - 2, 'ponta em curto (vivo ligado à malha)', 'dg-note')
      : text(x + 14, endY - 2, 'ponta em aberto (isole bem a ponta)', 'dg-note'),
    text(200, y - 14, 'cabo para o rádio', 'dg-note', 'middle'),
    text(420, y - 14, 'trecho até a antena', 'dg-note', 'middle'),
  ].join('');
  return {
    id,
    title: `Esquema da solução ${o.index + 1}`,
    caption:
      'O stub é um pedaço de cabo ligado em paralelo (vivo no vivo, malha na malha) no ponto marcado, a partir dos terminais da antena. ' +
      'Esquemático, fora de escala.',
    svg: svgDoc(id, 630, 250, `Stub, solução ${o.index + 1}`, 'Linha com um stub em paralelo a uma distância da antena.', parts),
  };
}

/** Balun 4:1 de coaxial: laço de meia onda elétrica entre dois pontos de um dipolo dobrado. */
export function coaxBalunDiagram(o: { loopLengthM: number; feederOhms: number; balancedOhms: number; res: LengthResolution }): Diagram {
  const id = 'balun-loop';
  const parts = [
    coax(20, 100, 400, 100),
    text(210, 85, `cabo principal ${formatNumber(o.feederOhms, 0)} Ω`, 'dg-note', 'middle'),
    // laço de cabo entre os terminais A e B
    `<path d="M400 100 C300 100, 300 220, 400 220" class="dg-coax" fill="none"/>`,
    `<path d="M400 100 C300 100, 300 220, 400 220" class="dg-center" fill="none"/>`,
    text(250, 165, `laço = ${formatLength(o.loopLengthM, o.res)}`, 'dg-label', 'end'),
    text(250, 182, '(com o fator de velocidade)', 'dg-note', 'end'),
    // dipolo dobrado
    line(400, 100, 440, 100, 'dg-conductor'),
    line(400, 220, 440, 220, 'dg-conductor'),
    rect(440, 100, 150, 120, 'dg-connector', 12),
    circle(400, 100, 5, 'dg-terminal'),
    circle(400, 220, 5, 'dg-terminal'),
    text(412, 90, 'A', 'dg-label'),
    text(412, 244, 'B', 'dg-label'),
    textLines(515, 150, ['dipolo', 'dobrado', `${formatNumber(o.balancedOhms, 0)} Ω`], 'dg-label', 'middle'),
    // malhas ligadas entre si
    line(400, 100, 400, 220, 'dg-rope'),
    text(388, 165, 'malhas ligadas', 'dg-note', 'end'),
  ].join('');
  return {
    id,
    title: 'Esquema do balun 4:1 de coaxial',
    caption:
      'O vivo do cabo principal vai ao terminal A. O laço liga A a B por um cabo cujo comprimento elétrico é de meia onda; ' +
      'as três malhas (cabo principal, as duas pontas do laço) são ligadas entre si. Esquemático, fora de escala.',
    svg: svgDoc(id, 620, 270, 'Balun 4:1 de coaxial', 'Cabo principal, laço de cabo de meia onda e dipolo dobrado.', parts),
  };
}

/** Hairpin: grampo de dois fios em curto ligado aos terminais do elemento excitado. */
export function hairpinDiagram(o: { legLengthM: number; spacingMm: number; res: LengthResolution }): Diagram {
  const id = 'hairpin';
  const gapL = 250;
  const gapR = 310;
  const top = 70;
  const bottom = 230;
  const parts = [
    line(60, top, gapL, top, 'dg-conductor'),
    line(gapR, top, 500, top, 'dg-conductor'),
    text(60, top - 14, 'metade do elemento excitado', 'dg-note'),
    text(500, top - 14, 'outra metade', 'dg-note', 'end'),
    line(gapL, top, gapL, bottom, 'dg-conductor'),
    line(gapR, top, gapR, bottom, 'dg-conductor'),
    line(gapL - 4, bottom, gapR + 4, bottom, 'dg-conductor'),
    circle(gapL, top, 5, 'dg-terminal'),
    circle(gapR, top, 5, 'dg-terminal'),
    text(280, top - 30, 'terminais: cabo / balun', 'dg-note', 'middle'),
    text(gapL - 12, bottom + 4, 'barra de curto', 'dg-note', 'end'),
    dimension(id, gapR, top, gapR, bottom, -40, `comprimento = ${formatLength(o.legLengthM, o.res)}`, { anchor: 'start' }),
    dimension(id, gapL, bottom, gapR, bottom, 26, `${formatNumber(o.spacingMm, 0)} mm`),
  ].join('');
  return {
    id,
    title: 'Esquema do hairpin',
    caption:
      'Os dois fios do grampo saem dos terminais do elemento excitado, correm paralelos e são unidos pela barra de curto. ' +
      'O comprimento é medido dos terminais à barra. Esquemático, fora de escala.',
    svg: svgDoc(id, 620, 290, 'Hairpin', 'Elemento excitado com grampo de dois fios em curto.', parts),
  };
}

/** Fluxo de potência: rádio → cabo → antena, com a parte perdida. */
export function cableFlowDiagram(o: {
  powerW: number;
  powerAtLoadW: number | null;
  lossDb: number | null;
  lossFraction: number | null;
  lengthM: number;
  cableName: string;
}): Diagram {
  const id = 'cable-flow';
  const frac = o.lossFraction === null ? 0 : Math.min(Math.max(o.lossFraction, 0), 1);
  const barX = 60;
  const barW = 500;
  const lostW = barW * frac;
  const lossText = o.lossDb === null ? 'perda: sem dado' : `${formatNumber(o.lossDb, 2)} dB`;
  const parts = [
    box(10, 40, 90, 70, ['Rádio', o.powerW > 0 ? `${formatNumber(o.powerW, 0)} W` : 'recepção']),
    coax(100, 75, 500, 75),
    text(300, 60, `${o.cableName}, ${formatNumber(o.lengthM, 1)} m`, 'dg-note', 'middle'),
    text(300, 100, `perda no cabo: ${lossText}`, 'dg-label', 'middle'),
    box(500, 40, 110, 70, ['Antena', o.powerAtLoadW !== null && o.powerW > 0 ? `${formatNumber(o.powerAtLoadW, 1)} W` : '']),
    rect(barX, 150, barW, 22, 'dg-connector', 3),
    rect(barX + barW - lostW, 150, lostW, 22, 'dg-seal', 3),
    text(barX, 195, 'chega à antena', 'dg-note'),
    text(barX + barW, 195, o.lossFraction === null ? '' : `perdido em calor: ${formatNumber(frac * 100, 1)} %`, 'dg-note', 'end'),
  ].join('');
  return {
    id,
    title: 'Para onde vai a potência',
    caption: 'A faixa mostra a fração da potência que vira calor no cabo (parte escura à direita). Inclui a perda extra pela ROE.',
    svg: svgDoc(id, 620, 215, 'Fluxo de potência no cabo', 'Rádio, cabo e antena, com a fração da potência perdida no cabo.', parts),
  };
}

/** Corte de um cabo coaxial com as camadas identificadas (sem escala). */
export function coaxCrossSectionDiagram(o: { cableName: string; outerDiameterMm: number; dielectric: string; impedanceOhms: number }): Diagram {
  const id = 'coax-section';
  const cx = 150;
  const cy = 120;
  const parts = [
    circle(cx, cy, 100, 'dg-connector'),
    circle(cx, cy, 78, 'dg-braid'),
    circle(cx, cy, 70, 'dg-insulator'),
    circle(cx, cy, 14, 'dg-conductor-fill'),
    line(cx + 100, cy - 60, 330, 40, 'dg-ext'),
    line(cx + 74, cy - 20, 330, 90, 'dg-ext'),
    line(cx + 40, cy + 8, 330, 140, 'dg-ext'),
    line(cx + 8, cy + 8, 330, 190, 'dg-ext'),
    text(336, 44, 'capa externa (PVC ou similar)', 'dg-label'),
    text(336, 94, 'malha (blindagem): fica ligada ao terra', 'dg-label'),
    text(336, 144, `dielétrico: ${o.dielectric}`, 'dg-label'),
    text(336, 194, 'condutor central (vivo)', 'dg-label'),
    text(cx, 240, `Ø externo ${formatNumber(o.outerDiameterMm, 1)} mm`, 'dg-dim-text', 'middle'),
  ].join('');
  return {
    id,
    title: `Camadas do ${o.cableName}`,
    caption:
      `Corte transversal esquemático, fora de escala. Impedância ${formatNumber(o.impedanceOhms, 0)} Ω. ` +
      'A corrente de RF do vivo e a da malha são iguais e opostas: por isso o cabo não irradia, se a malha não receber corrente de modo comum.',
    svg: svgDoc(id, 620, 255, 'Corte de um cabo coaxial', 'Capa, malha, dielétrico e condutor central em círculos concêntricos.', parts),
  };
}

/** Distâncias de exposição ao longo do eixo do feixe: campo próximo, distância mínima e a pessoa. */
export function exposureDiagram(o: { distanceM: number; safeM: number; farFieldM: number; ok: boolean }): Diagram {
  const id = 'rf-exposure';
  const x0 = 60;
  const width = 520;
  const max = Math.max(o.distanceM, o.safeM, o.farFieldM) * 1.15;
  const px = (m: number) => x0 + (m / max) * width;
  const axisY = 190;
  const metersText = (m: number) => (m < 1 ? `${formatNumber(m * 100, 0)} cm` : `${formatNumber(m, 2)} m`);
  const personX = px(o.distanceM);
  const safeX = px(o.safeM);
  const farX = px(o.farFieldM);
  const parts = [
    // feixe
    path(`M${x0} 110 L${x0 + width} 40 L${x0 + width} 180 Z`, 'dg-ext'),
    // zona acima do limite
    rect(x0, axisY - 14, safeX - x0, 14, 'dg-seal'),
    line(x0, axisY, x0 + width, axisY, 'dg-mast'),
    // antena
    line(x0 - 10, 110, x0 + 8, 90, 'dg-conductor'),
    line(x0 - 10, 110, x0 + 8, 130, 'dg-conductor'),
    line(x0 - 10, 90, x0 - 10, 130, 'dg-conductor'),
    text(x0 - 10, 150, 'antena', 'dg-note', 'middle'),
    // campo distante
    line(farX, 60, farX, axisY, 'dg-rope'),
    text(farX, 54, `campo distante a partir de ${metersText(o.farFieldM)}`, 'dg-note', farX > 400 ? 'end' : 'start'),
    // distância mínima
    line(safeX, 90, safeX, axisY + 8, 'dg-danger-line'),
    text(safeX, axisY + 24, `mínima ${metersText(o.safeM)}`, 'dg-danger', 'middle'),
    // pessoa
    circle(personX, axisY - 40, 7, o.ok ? 'dg-terminal' : 'dg-danger-fill'),
    line(personX, axisY - 33, personX, axisY - 12, o.ok ? 'dg-mast' : 'dg-danger-line'),
    line(personX - 9, axisY - 26, personX + 9, axisY - 26, o.ok ? 'dg-mast' : 'dg-danger-line'),
    text(personX, axisY + 42, `pessoa a ${metersText(o.distanceM)}`, o.ok ? 'dg-label' : 'dg-danger', 'middle'),
  ].join('');
  return {
    id,
    title: 'Distâncias ao longo do feixe',
    caption:
      'Esquema em escala linear de distância ao longo do eixo do feixe (altura do desenho não é escala). A faixa escura é a região acima do ' +
      'limite (estimativa). Antes do início do campo distante a fórmula não vale.',
    svg: svgDoc(id, 640, 245, 'Distâncias de exposição', 'Antena, início do campo distante, distância mínima de segurança e posição da pessoa.', parts),
  };
}
