/**
 * Diagramas do turnstile: vista pelo eixo (dois dipolos cruzados), vista de lado (dipolos sobre o refletor)
 * e esquema de alimentação (um dipolo direto, outro pela linha de 1/4 de onda).
 */

import { lengthResolutionForFrequency } from '../../core/units';
import { type Diagram, circle, dimLabel, dimension, line, measure, rect, svgDoc, text } from '../diagram-kit';
import type { CalcResult } from '../types';
import type { TurnstileParams } from './calc';

function crossed(result: CalcResult, params: TurnstileParams): Diagram {
  const id = 'ts-crossed';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const total = measure(result, 'A');
  const scale = 300 / total; // px por metro
  const cx = 310;
  const cy = 200;
  const h = (total * scale) / 2;
  const parts: string[] = [];
  // Dipolo 1 (horizontal, "A") e dipolo 2 (vertical, "B"), vistos pelo eixo.
  parts.push(line(cx - h, cy, cx + h, cy, 'dg-conductor'), line(cx, cy - h, cx, cy + h, 'dg-conductor'));
  parts.push(circle(cx, cy, 5, 'dg-connector'));
  parts.push(text(cx + h + 8, cy + 4, 'dipolo 1 (direto)', 'dg-note'));
  parts.push(text(cx + 8, cy - h - 6, 'dipolo 2 (pela linha de fase)', 'dg-note'));
  parts.push(text(cx + 12, cy + 18, 'centro: isole um dipolo do outro', 'dg-note'));
  parts.push(
    dimension(id, cx - h, cy, cx + h, cy, 40, dimLabel(result, 'A', res)),
    dimension(id, cx, cy, cx + h, cy, -40, dimLabel(result, 'B', res)),
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
  parts.push(text(cx + half + 28, yRef + 6, 'refletor (TODO: tamanho)', 'dg-note'));
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

export function diagrams(result: CalcResult, params: TurnstileParams): Diagram[] {
  const out = [crossed(result, params)];
  const s = side(result, params);
  if (s) out.push(s);
  out.push(feed());
  return out;
}
