/**
 * Diagrama da QFH: duas hélices de meia volta lado a lado (maior e menor), com altura e
 * diâmetro interno cotados. É um esquema; a torção real é feita sobre um cilindro de suporte.
 */

import { lengthResolutionForFrequency } from '../../core/units';
import { type Diagram, dimLabel, dimension, line, measure, path, svgDoc, text } from '../diagram-kit';
import type { CalcResult } from '../types';
import type { QfhParams } from './calc';

function helix(cx: number, top: number, h: number, d: number): string {
  const l = cx - d / 2;
  const r = cx + d / 2;
  // Duas pernas que se cruzam (meia volta) entre o topo e a base.
  return (
    path(`M ${l} ${top} C ${l} ${top + h * 0.4}, ${r} ${top + h * 0.6}, ${r} ${top + h}`, 'dg-conductor') +
    path(`M ${r} ${top} C ${r} ${top + h * 0.4}, ${l} ${top + h * 0.6}, ${l} ${top + h}`, 'dg-conductor') +
    line(l, top, r, top, 'dg-conductor') +
    line(l, top + h, r, top + h, 'dg-conductor')
  );
}

function loops(result: CalcResult, params: QfhParams): Diagram {
  const id = 'qfh-loops';
  const res = lengthResolutionForFrequency(params.frequencyMHz);
  const hBig = measure(result, 'B');
  const dBig = measure(result, 'C');
  const hSmall = measure(result, 'F');
  const dSmall = measure(result, 'G');
  const scale = 260 / hBig; // px por metro
  const top = 60;
  const cx1 = 200;
  const cx2 = 440;
  const bottom = top + hBig * scale;
  const bottomSmall = top + hSmall * scale;
  const parts: string[] = [];
  parts.push(helix(cx1, top, hBig * scale, dBig * scale));
  parts.push(helix(cx2, top, hSmall * scale, dSmall * scale));
  parts.push(text(cx1, top - 20, 'espira maior', 'dg-label', 'middle'));
  parts.push(text(cx2, top - 20, 'espira menor', 'dg-label', 'middle'));
  parts.push(
    dimension(id, cx1 - (dBig * scale) / 2, top, cx1 - (dBig * scale) / 2, bottom, 40, dimLabel(result, 'B', res), { anchor: 'end' }),
    dimension(id, cx2 - (dSmall * scale) / 2, top, cx2 - (dSmall * scale) / 2, bottomSmall, 40, dimLabel(result, 'F', res), { anchor: 'end' }),
    dimension(id, cx1 - (dBig * scale) / 2, bottom, cx1 + (dBig * scale) / 2, bottom, -30, dimLabel(result, 'C', res), { anchor: 'middle' }),
    dimension(id, cx2 - (dSmall * scale) / 2, bottomSmall, cx2 + (dSmall * scale) / 2, bottomSmall, -30, dimLabel(result, 'G', res), { anchor: 'middle' }),
  );
  parts.push(
    text(
      320,
      bottom + 80,
      `Fio: ${dimLabel(result, 'A', res)} (maior), ${dimLabel(result, 'E', res)} (menor)`,
      'dg-note',
      'middle',
    ),
  );

  parts.push(
    text(
      320,
      bottom + 100,
      `Separadores horizontais: ${dimLabel(result, 'D', res)} (maior), ${dimLabel(result, 'H', res)} (menor)`,
      'dg-note',
      'middle',
    ),
  );

  return {
    id,
    title: 'As duas espiras (esquema)',
    caption:
      'Duas hélices de meia volta: a maior (altura B, diâmetro interno C) e a menor (F e G), cruzadas a 90° em torno do mesmo cilindro. ' +
      'Esquema: a curva da torção é só ilustrativa; alturas e diâmetros guardam a proporção.',
    svg: svgDoc(
      id,
      640,
      Math.round(bottom + 130),
      'QFH: espiras',
      'Duas hélices de meia volta com altura e diâmetro interno cotados.',
      parts.join(''),
    ),
  };
}

export function diagrams(result: CalcResult, params: QfhParams): Diagram[] {
  return [loops(result, params)];
}
