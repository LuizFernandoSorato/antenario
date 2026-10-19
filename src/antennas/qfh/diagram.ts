/**
 * Diagrama da QFH: duas hélices de meia volta lado a lado (maior e menor), com altura e
 * diâmetro interno cotados. É um esquema; a torção real é feita sobre um cilindro de suporte.
 */

import type { Vec3 } from '../../core/mom';
import { fieldToDb, halfPowerBeamwidthDeg } from '../../core/pattern';
import { formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { type Diagram, dimLabel, dimension, line, measure, path, svgDoc, text } from '../diagram-kit';
import { polarPlot } from '../pattern-kit';
import type { CalcResult } from '../types';
import type { QfhParams } from './calc';
import { solveQfh } from './pattern-model';

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

/**
 * Padrões da QFH por método dos momentos (ver `pattern-model.ts`): as duas espiras de fio, com correntes de mesma amplitude e 90° de
 * diferença. O padrão é quase simétrico em torno do eixo; os dois cortes mostram a pequena diferença entre o plano de uma espira e o diagonal.
 */
function patterns(result: CalcResult, params: QfhParams): Diagram[] {
  const model = solveQfh(result, params.frequencyMHz);
  const planes: { id: string; title: string; label: string; dir: (a: number) => Vec3 }[] = [
    { id: 'qfh-pattern-a', title: 'Padrão no plano de uma espira', label: 'plano de uma espira', dir: (a) => [Math.cos(a), 0, Math.sin(a)] },
    { id: 'qfh-pattern-d', title: 'Padrão no plano diagonal (45° entre as espiras)', label: 'plano diagonal', dir: (a) => [Math.cos(a) * Math.SQRT1_2, Math.cos(a) * Math.SQRT1_2, Math.sin(a)] },
  ];
  let peak = 0;
  for (let i = 0; i < 360; i++) for (const p of planes) peak = Math.max(peak, model.power(p.dir((i * Math.PI) / 180)));
  const dDb = 10 * Math.log10(model.directivity);
  const below = (p: (typeof planes)[number]) => fieldToDb(Math.sqrt(model.power(p.dir(-Math.PI / 2)) / peak));
  const horizon = (p: (typeof planes)[number]) => fieldToDb(Math.sqrt(model.power(p.dir(0)) / peak));
  const z = model.zenithField;
  const mag = (re: number, im: number) => Math.hypot(re, im);
  // componentes circulares (Ex ± jEy)/√2 no zênite: a razão axial mede o quanto a polarização é circular
  const plus = mag(z.re[0] - z.im[1], z.im[0] + z.re[1]);
  const minus = mag(z.re[0] + z.im[1], z.im[0] - z.re[1]);
  const axial = 20 * Math.log10((plus + minus) / Math.max(1e-9, Math.abs(plus - minus)));
  const note =
    ` Diretividade calculada ${formatNumber(dDb, 1)} dBi (soma das duas polarizações); razão axial no zênite ${formatNumber(axial, 1)} dB. ` +
    'Calculado por método dos momentos com fio de 4,1 mm, no espaço livre, sem o cilindro de suporte nem o coaxial, com as duas espiras alimentadas no topo ' +
    'em amplitude igual e 90° de diferença (a QFH real obtém isso da diferença de comprimento das espiras; aqui é suposto ideal). ' +
    'Num coaxial real que desce pelo centro, o padrão para baixo e a ROE mudam. O sentido da polarização (direita ou esquerda) não é afirmado: ' +
    'depende do sentido de enrolamento e de qual espira adianta. TODO(fonte).';
  return planes.map((p) => {
    const field = (a: number) => Math.sqrt(model.power(p.dir(a)) / peak);
    return polarPlot({
      id: p.id,
      title: p.title,
      caption:
        `Eixo da antena para cima. Lóbulo largo, quase hemisférico, com máximo no zênite: ` +
        `largura de meia potência ≈ ${formatNumber(halfPowerBeamwidthDeg(field, Math.PI / 2), 0)}°, ${formatNumber(horizon(p), 0)} dB no horizonte e ` +
        `${formatNumber(below(p), 0)} dB diretamente para baixo.` + note,
      desc: 'Gráfico polar de um lóbulo largo com máximo no eixo, para cima, e pouca radiação para baixo (cardioide).',
      axisLabels: { right: 'horizonte', up: 'zênite', left: 'horizonte', down: 'abaixo' },
      field,
    });
  });
}

export function diagrams(result: CalcResult, params: QfhParams): Diagram[] {
  return [loops(result, params), ...patterns(result, params)];
}
