/**
 * Diagramas do turnstile: vista pelo eixo (dois dipolos cruzados), vista de lado (dipolos sobre o refletor)
 * e esquema de alimentação (um dipolo direto, outro pela linha de 1/4 de onda).
 */

import { crossedDipoleDirectivity, crossedDipoleField } from '../../core/pattern';
import { formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { wavelength } from '../../core/wave';
import { type Diagram, circle, dimLabel, dimension, line, measure, rect, svgDoc, text } from '../diagram-kit';
import { polarPlot } from '../pattern-kit';
import type { CalcResult } from '../types';
import { armPolarityDiagram, senseOf } from '../circular';
import type { TurnstileParams } from './calc';

function crossed(result: CalcResult, params: TurnstileParams): Diagram {
  const id = 'ts-crossed';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const total = measure(result, 'A');
  const scale = 300 / total; // px por metro
  const cx = 310;
  const cy = 200;
  const h = (total * scale) / 2;
  const gapPx = ((result.measurements.find((m) => m.label === 'E')?.meters ?? 0) * scale) / 2;
  const parts: string[] = [];
  // Dipolo 1 (horizontal, "A") e dipolo 2 (vertical, "B"), vistos pelo eixo.
  parts.push(line(cx - h, cy, cx + h, cy, 'dg-conductor'), line(cx, cy - h, cx, cy + h, 'dg-conductor'));
  parts.push(circle(cx, cy, 5, 'dg-connector'));
  parts.push(text(cx + h + 8, cy + 4, 'dipolo 1 (direto)', 'dg-note'));
  parts.push(text(cx + 8, cy - h - 6, 'dipolo 2 (pela linha de fase)', 'dg-note'));
  parts.push(text(cx + 12, cy + 18, 'centro: isole um dipolo do outro', 'dg-note'));
  parts.push(
    dimension(id, cx - h, cy, cx + h, cy, 40, dimLabel(result, 'A', res)),
    dimension(id, cx + gapPx, cy, cx + h, cy, -40, dimLabel(result, 'B', res)),
  );
  parts.push(text(cx, cy + h + 50, `Linha de fase: ${dimLabel(result, 'C', res)} de coaxial`, 'dg-note', 'middle'));

  return {
    id,
    title: 'Dipolos cruzados (vista pelo eixo)',
    caption:
      'Dois dipolos iguais a 90° no mesmo centro. A: comprimento de cada dipolo; B: braço. C: linha de fase de 1/4 de onda ' +
      'entre o ponto de alimentação e o dipolo 2.',
    svg: svgDoc(
      id,
      640,
      Math.round(cy + h + 90),
      'Turnstile: dipolos cruzados',
      'Dois dipolos de meia onda cruzados a 90°, com as cotas de comprimento e braço.',
      parts.join(''),
    ),
  };
}

function side(result: CalcResult, params: TurnstileParams): Diagram | null {
  if (params.reflector !== 1) return null;
  const id = 'ts-side';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const a = measure(result, 'A');
  const d = measure(result, 'D');
  const scale = 280 / a;
  const cx = 310;
  const top = 70;
  const yRef = top + d * scale;
  const half = (a * scale) / 2;
  const parts: string[] = [];
  parts.push(line(cx - half, top, cx + half, top, 'dg-conductor'));
  parts.push(circle(cx, top, 4, 'dg-connector'));
  parts.push(rect(cx - half - 20, yRef, 2 * half + 40, 6, 'dg-mast', 1));
  // TODO(fonte): tamanho.
  parts.push(text(cx + half + 28, yRef + 6, 'refletor', 'dg-note'));
  parts.push(text(cx + half + 12, top + 4, 'dipolos (vistos de lado)', 'dg-note'));
  parts.push(line(cx, top - 38, cx, top, 'dg-ext'));
  parts.push(text(cx + 8, top - 28, '↑ eixo: polarização circular para cima', 'dg-note'));
  parts.push(dimension(id, cx - half, top, cx - half, yRef, 40, dimLabel(result, 'D', res), { anchor: 'end' }));

  return {
    id,
    title: 'Dipolos sobre o refletor (vista de lado)',
    caption: 'Os dipolos ficam a 1/4 de onda (D) do refletor. O ganho aponta para cima, no eixo.',
    svg: svgDoc(
      id,
      640,
      Math.round(yRef + 60),
      'Turnstile: dipolos sobre o refletor',
      'Vista lateral dos dipolos a 1/4 de onda de um refletor plano.',
      parts.join(''),
    ),
  };
}

function feed(): Diagram {
  const id = 'ts-feed';
  const parts: string[] = [];
  // Coaxial até a junção, dipolo 1 direto, dipolo 2 pela linha de 1/4 de onda.
  parts.push(line(60, 110, 200, 110, 'dg-coax'), text(60, 98, 'para o rádio (com choke)', 'dg-note'));
  parts.push(circle(200, 110, 4, 'dg-connector'), text(200, 138, 'junção', 'dg-note', 'middle'));
  parts.push(line(200, 110, 200, 50, 'dg-coax'), line(200, 50, 440, 50, 'dg-coax'));
  parts.push(rect(440, 36, 90, 28, 'dg-connector', 3), text(485, 55, 'dipolo 1', 'dg-label', 'middle'));
  parts.push(line(200, 110, 200, 170, 'dg-coax'), line(200, 170, 300, 170, 'dg-coax'));
  parts.push(rect(300, 156, 140, 28, 'dg-ext', 3), text(370, 175, 'linha de fase λ/4', 'dg-label', 'middle'));
  parts.push(line(440, 170, 470, 170, 'dg-coax'));
  parts.push(rect(470, 156, 90, 28, 'dg-connector', 3), text(515, 175, 'dipolo 2', 'dg-label', 'middle'));
  parts.push(text(320, 215, 'I2 = I1 com −90° (se a linha tiver a mesma impedância do dipolo)', 'dg-note', 'middle'));

  return {
    id,
    title: 'Alimentação (esquema)',
    caption:
      'O dipolo 1 liga direto na junção; o dipolo 2, por um trecho de coaxial de 1/4 de onda, que atrasa a corrente em 90°. ' +
      'Esquema: a ligação de vivo e malha de cada dipolo (balun/choke) depende da montagem.',
    svg: svgDoc(
      id,
      640,
      240,
      'Turnstile: alimentação',
      'Um dipolo ligado direto na junção e o outro por uma linha de 1/4 de onda.',
      parts.join(''),
    ),
  };
}

/**
 * Padrões da turnstile: dois dipolos cruzados em quadratura no espaço livre (Balanis §4.2 + soma de potências,
 * ver core/pattern.ts). Com refletor, usa plano perfeito e infinito a λ/4 (teoria das imagens). O eixo vertical
 * do desenho 3D é o eixo da turnstile (apontando para cima).
 */
function patterns(result: CalcResult, params: TurnstileParams): Diagram[] {
  const lengthLambda = measure(result, 'A') / wavelength(params.frequencyMHz);
  const reflector = params.reflector > 0;
  // Corte vertical que contém um dipolo (leste-oeste): α é a elevação medida a partir de leste.
  const vertical = (a: number) => crossedDipoleField(Math.cos(a), 0, Math.sin(a), lengthLambda, reflector);
  // Corte horizontal: no plano dos dipolos sem refletor (que não irradia o suficiente com refletor ideal:
  // nulo no plano), ou a 45° de elevação com refletor.
  const elDeg = reflector ? 45 : 0;
  const el = (elDeg * Math.PI) / 180;
  const horizontal = (a: number) =>
    crossedDipoleField(Math.cos(el) * Math.cos(a), Math.cos(el) * Math.sin(a), Math.sin(el), lengthLambda, reflector);
  const ideal =
    'Dipolos ideais, sem acoplamento mútuo. ' +
    (reflector
      // TODO(fonte): fonte pendente para o texto abaixo.
      ? 'O refletor é um plano condutor perfeito e infinito a λ/4: um refletor real, finito, tem diagrama e ganho diferentes (o tamanho dele não consta das fontes).'
      : 'Espaço livre, sem refletor.');
  const gainText = reflector
    ? ''
    : ` Diretividade ideal ≈ ${formatNumber(10 * Math.log10(crossedDipoleDirectivity(lengthLambda, false)), 2)} dBi.`;
  return [
    polarPlot({
      id: 'turnstile-pattern-v',
      title: 'Padrão vertical (elevação)',
      caption:
        'Corte vertical que contém um dos dipolos. O máximo está no eixo da antena (zênite), onde a polarização é circular; ' +
        'no plano dos dipolos o campo cai 3 dB e a polarização vira linear. ' +
        (reflector ? 'Atrás do refletor não há irradiação. ' : 'Sem refletor, a antena irradia igualmente para baixo. ') +
        ideal + gainText,
      desc: 'Gráfico polar de elevação: lóbulo principal no zênite, e queda de 3 dB no plano dos dipolos.',
      axisLabels: { right: 'leste (dipolo)', up: 'zênite (eixo)', left: 'oeste (dipolo)', down: 'nadir' },
      field: vertical,
    }),
    polarPlot({
      id: 'turnstile-pattern-h',
      title: reflector ? 'Padrão horizontal (a 45° de elevação)' : 'Padrão horizontal (no plano dos dipolos)',
      caption:
        (reflector
          ? 'Corte horizontal a 45° de elevação (com refletor ideal, o plano dos dipolos tem nulo). '
          : 'Corte horizontal no plano dos dipolos. ') +
        'Quase circular: a ondulação entre os eixos dos dipolos e a diagonal é de cerca de 1 dB (calculado), sem os efeitos de ' +
        'mastro, cabo e refletor reais. ' +
        ideal,
      desc: 'Gráfico polar quase circular, com pequena ondulação a cada 90 graus.',
      axisLabels: { right: 'leste (dipolo)', up: 'norte (dipolo)', left: 'oeste', down: 'sul' },
      field: horizontal,
    }),
  ];
}

export function diagrams(result: CalcResult, params: TurnstileParams): Diagram[] {
  const polarity = armPolarityDiagram({
    id: 'ts-polarity',
    sense: senseOf(params.circularSense),
    viewText: 'de baixo para cima (olhando para o zênite, na direção do feixe)',
    directName: 'dipolo 1 (direto)',
    delayedName: 'dipolo 2 (linha de fase)',
  });
  return [crossed(result, params), side(result, params), feed(), polarity, ...patterns(result, params)].filter((d): d is Diagram => d !== null);
}
