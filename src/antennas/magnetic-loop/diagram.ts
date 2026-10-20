/**
 * Diagrama da loop magnética: vista frontal em escala (espira, capacitor no topo,
 * loop de acoplamento embaixo).
 */

import { halfPowerBeamwidthDeg, smallLoopField } from '../../core/pattern';
import { formatEngineering, formatNumber } from '../../core/units';
import { wavelength } from '../../core/wave';
import { polarPlot } from '../pattern-kit';
import { type Diagram, circle, dimLabel, dimension, highVoltage, line, measure, rect, svgDoc, text } from '../diagram-kit';
import type { CalcResult } from '../types';
import type { MagneticLoopParams } from './calc';
import { calc } from './calc';
import { lengthResolutionForFrequency } from '../../core/units';

function front(result: CalcResult, params: MagneticLoopParams): Diagram {
  const id = 'ml-front';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const loopD = measure(result, 'A');
  const coupD = measure(result, 'C');
  const scale = 260 / loopD;
  const cx = 300;
  const cy = 240;
  const r = (loopD * scale) / 2;
  const rc = (coupD * scale) / 2;
  const cap = calc(params).assumptions.find((a) => a.name === 'Tensão no capacitor')?.value ?? '';

  const body = [
    // Espira (círculo aberto no topo para o capacitor).
    circle(cx, cy, r, 'dg-conductor'),
    rect(cx - 16, cy - r - 11, 32, 22, 'dg-connector', 3),
    text(cx + 26, cy - r - 14, 'capacitor variável', 'dg-note'),
    highVoltage(cx + 26, cy - r + 4, cap ? `${cap} no capacitor (TX)` : 'alta tensão (TX)'),
    // Loop de acoplamento na parte de baixo, dentro da espira, com o cabo.
    circle(cx, cy + r - rc - 6, rc, 'dg-ext'),
    line(cx, cy + r - 6, cx, cy + r + 56, 'dg-coax'),
    text(cx + 12, cy + r + 52, 'coaxial para o rádio (com choke)', 'dg-note'),
    text(cx, cy + r - rc - 6, 'acoplamento', 'dg-note', 'middle'),
    // Cotas.
    dimension(id, cx - r, cy, cx + r, cy, 0, dimLabel(result, 'A', res), { labelGap: -6 }),
    text(cx - r - 12, cy + r - rc - 6, dimLabel(result, 'C', res), 'dg-dim-text', 'end'),
    text(cx - r - 12, cy - 12, dimLabel(result, 'B', res) + ' de tubo', 'dg-dim-text', 'end'),
  ].join('');

  return {
    id,
    title: 'Vista frontal (em escala)',
    caption:
      'Espira circular de tubo, com o capacitor variável no ponto mais alto e o loop de acoplamento na parte oposta. ' +
      `A: diâmetro. B: comprimento do tubo (perímetro). C: diâmetro do loop de acoplamento. ` +
      `${formatEngineering(measure(result, 'B'), 'm')} de tubo formam a espira.`,
    svg: svgDoc(id, 620, Math.round(cy + r + 90), 'Loop magnética: vista frontal', 'Espira circular com capacitor variável no topo e loop de acoplamento embaixo, ligado ao coaxial.', body),
  };
}

/**
 * Padrões da loop magnética: loop pequena (circunferência ≪ λ), dual de um dipolo curto: campo ∝ sin θ, com θ a partir do eixo
 * (perpendicular ao plano da espira). Balanis §5.2; D = 1,5. No espaço livre, com corrente uniforme na espira; vale para circunferência
 * abaixo de ≈ λ/10. O solo e a altura mudam muito o padrão real, principalmente na vertical.
 */
function patterns(result: CalcResult, params: MagneticLoopParams): Diagram[] {
  const circumferenceLambda = measure(result, 'B') / wavelength(params.frequencyMHz);
  const small = circumferenceLambda <= 0.1;
  const note =
    `Modelo de loop pequena (corrente uniforme, espaço livre). Esta espira tem circunferência de ${formatNumber(circumferenceLambda, 3)}λ` +
    (small
      ? ', dentro do limite de λ/10 do modelo. '
      // TODO(fonte): loop não pequena.
      : ', ACIMA do limite de λ/10 do modelo: a corrente deixa de ser uniforme e o padrão real se afasta deste. ') +
    'O solo e a altura mudam muito o padrão real.';
  return [
    polarPlot({
      id: 'mloop-pattern-axis',
      title: 'Padrão no plano que contém o eixo da espira',
      caption:
        'Forma de "8": máximo no plano da espira (cima e baixo no desenho) e nulos ao longo do eixo (perpendicular à espira). ' +
        `Largura de meia potência ≈ ${formatNumber(halfPowerBeamwidthDeg(smallLoopField, Math.PI / 2), 0)}°; diretividade ${formatNumber(10 * Math.log10(1.5), 2)} dBi. ` +
        note,
      desc: 'Gráfico polar em forma de oito, com nulos ao longo do eixo da espira e máximo no plano dela.',
      axisLabels: { right: 'eixo (nulo)', up: 'plano da espira', left: 'eixo (nulo)', down: 'plano da espira' },
      field: (a) => smallLoopField(a),
    }),
    polarPlot({
      id: 'mloop-pattern-plane',
      title: 'Padrão no plano da espira',
      caption: `Círculo: omnidirecional dentro do plano da espira. ${note}`,
      desc: 'Gráfico polar circular: a irradiação é igual em todas as direções do plano da espira.',
      axisLabels: { right: '0°', up: '90°', left: '180°', down: '270°' },
      field: () => 1,
    }),
  ];
}

export function diagrams(result: CalcResult, params: MagneticLoopParams): Diagram[] {
  return [front(result, params), ...patterns(result, params)];
}
