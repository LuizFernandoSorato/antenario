/**
 * Gráficos polares de cortes do padrão de irradiação a partir de uma função de potência `power(dir)`
 * (por exemplo, a de uma solução do método dos momentos, `core/mom.ts`).
 *
 * Convenção das antenas de boom (Yagi, cross Yagi, quadra): boom ao longo de z, frente em +z, elementos (polarização) ao
 * longo de x. No gráfico, "cima" é a frente da antena. Plano E = x–z, plano H = y–z.
 */

import { fieldToDb, halfPowerBeamwidthDeg } from '../core/pattern';
import type { Vec3 } from '../core/mom';
import { formatNumber } from '../core/units';
import type { Diagram } from './diagram-kit';
import { polarPlot } from './pattern-kit';

export interface BoomPatternOptions {
  idPrefix: string;
  /** Densidade de potência relativa em função da direção (vetor unitário). */
  power: (dir: Vec3) => number;
  /** Diretividade (razão) para citar na legenda. */
  directivity: number;
  /** Texto de modelo e premissas, acrescentado à legenda de cada gráfico. */
  modelNote: string;
  /**
   * Dois Yagis cruzados em quadratura (cross Yagi): os planos x–z e y–z são iguais por simetria, mas o plano diagonal (45°)
   * difere um pouco (o termo cruzado entre os dois campos não se anula fora dos planos de simetria). Gera esses dois cortes.
   */
  crossed?: boolean;
}

const plane = {
  e: (a: number): Vec3 => [Math.cos(a), 0, Math.sin(a)],
  h: (a: number): Vec3 => [0, Math.cos(a), Math.sin(a)],
  diagonal: (a: number): Vec3 => [Math.cos(a) * Math.SQRT1_2, Math.cos(a) * Math.SQRT1_2, Math.sin(a)],
};

/** Máximo da potência nos dois cortes (resolução de 1°). */
function cutPeak(power: (dir: Vec3) => number): number {
  let max = 0;
  for (let i = 0; i < 360; i++) {
    const a = (i * Math.PI) / 180;
    max = Math.max(max, power(plane.e(a)), power(plane.h(a)), power(plane.diagonal(a)));
  }
  return max;
}

export function boomPatternPlots(o: BoomPatternOptions): Diagram[] {
  const peak = cutPeak(o.power);
  const field = (dirOf: (a: number) => Vec3) => (a: number) => Math.sqrt(o.power(dirOf(a)) / peak);
  const dDb = 10 * Math.log10(o.directivity);
  const beam = (dirOf: (a: number) => Vec3): number => halfPowerBeamwidthDeg(field(dirOf), Math.PI / 2);
  // Relação frente–costas e nível do lóbulo traseiro, a partir do corte E
  const fb = fieldToDb(field(plane.e)(Math.PI / 2)) - fieldToDb(field(plane.e)(-Math.PI / 2));
  const summary =
    ` Diretividade calculada ${formatNumber(dDb, 1)} dBi; relação frente–costas ${formatNumber(fb, 1)} dB. ` + o.modelNote;

  const desc = 'Gráfico polar com o lóbulo principal para a frente (para cima no desenho) e lóbulos menores atrás e nos lados.';
  const e: Diagram = polarPlot({
    id: `${o.idPrefix}-pattern-e`,
    title: o.crossed ? 'Padrão no plano de um Yagi (x–z, igual a y–z)' : 'Padrão no plano E (elementos e boom)',
    caption:
      (o.crossed
        ? 'Corte no plano que contém o boom e os elementos de um dos Yagis; o plano do outro Yagi é igual, por simetria. '
        : 'Corte no plano que contém os elementos e o boom. ') +
      `Largura de meia potência ≈ ${formatNumber(beam(plane.e), 0)}°.` +
      summary,
    desc,
    axisLabels: { right: 'elementos', up: 'frente', left: 'elementos', down: 'costas' },
    field: field(plane.e),
  });
  if (o.crossed) {
    const d: Diagram = polarPlot({
      id: `${o.idPrefix}-pattern-d`,
      title: 'Padrão no plano diagonal (45° entre os Yagis)',
      caption:
        'Corte no plano que contém o boom e é girado 45° em relação aos dois Yagis. Difere um pouco do plano principal: fora dos planos de ' +
        'simetria os campos dos dois Yagis não estão em fase perfeita de quadratura em todas as direções. ' +
        `Largura de meia potência ≈ ${formatNumber(beam(plane.diagonal), 0)}°.` +
        summary,
      desc,
      axisLabels: { right: 'diagonal', up: 'frente', left: 'diagonal', down: 'costas' },
      field: field(plane.diagonal),
    });
    return [e, d];
  }
  const h: Diagram = polarPlot({
    id: `${o.idPrefix}-pattern-h`,
    title: 'Padrão no plano H (perpendicular aos elementos)',
    caption:
      'Corte no plano que contém o boom e é perpendicular aos elementos. ' +
      `Largura de meia potência ≈ ${formatNumber(beam(plane.h), 0)}°.` +
      summary,
    desc,
    axisLabels: { right: 'lado', up: 'frente', left: 'lado', down: 'costas' },
    field: field(plane.h),
  });
  return [e, h];
}
