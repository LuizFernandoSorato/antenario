/**
 * Elementos da Yagi a partir do resultado do cálculo (NBS ou DL6WU) e a solução deles por momentos (core/mom.ts), para o padrão e a banda.
 *
 * Geometria: elementos ao longo de x, boom ao longo de z, frente (diretores) em +z. Elementos cilíndricos de fio fino (raio = d/2), no espaço
 * livre, SEM boom, excitado com gap delta no centro; os parasitas são fios contínuos sem carga.
 */

import { type MomSolution, type Vec3, type Wire, solveWires } from '../../core/mom';
import { wavelength } from '../../core/wave';
import type { CalcResult } from '../types';

export interface YagiElement {
  /** Comprimento total, m. */
  length: number;
  /** Posição no boom, m a partir do refletor. */
  position: number;
  driven: boolean;
}

/** Elementos do resultado do cálculo, na ordem refletor, excitado, diretores: comprimento total e posição no boom (m). */
export function yagiElements(result: CalcResult): YagiElement[] {
  const get = (label: string): number => {
    const m = result.measurements.find((x) => x.label === label);
    if (!m) throw new Error(`Cota ${label} não encontrada.`);
    return m.meters;
  };
  const directors = result.measurements.filter((m) => /^D\d+$/.test(m.label));
  const explicit = result.measurements.filter((m) => /^P\d+$/.test(m.label));
  const e = get('E');
  const positions = [0, e];
  if (explicit.length > 0) {
    explicit.forEach((m) => positions.push(m.meters));
  } else {
    const s = get('S');
    directors.forEach((_, i) => positions.push(e + (i + 1) * s));
  }
  const lengths = [get('R'), get('DE'), ...directors.map((d) => d.meters)];
  return lengths.map((length, i) => ({ length, position: positions[i]!, driven: i === 1 }));
}


/** Trechos por elemento: par (gap no nó central), com ≈ λ/25 por trecho. */
function segmentsFor(length: number, lambda: number): number {
  const n = Math.ceil(length / (lambda / 25));
  return Math.max(10, n % 2 === 0 ? n : n + 1);
}

/**
 * Resolve os elementos em `fMHz`; o excitado recebe 1 V. A divisão em trechos usa o λ de `geometryMHz` (padrão: a própria frequência),
 * para que uma varredura em frequência resolva sempre a mesma geometria discretizada.
 */
export function solveElements(elements: readonly YagiElement[], diameterM: number, fMHz: number, geometryMHz = fMHz): MomSolution {
  const lambda = wavelength(geometryMHz);
  const wires: Wire[] = [];
  let drivenWire = -1;
  let drivenSegments = 0;
  elements.forEach((el, i) => {
    const n = segmentsFor(el.length, lambda);
    const pts: Vec3[] = [];
    for (let j = 0; j <= n; j++) pts.push([-el.length / 2 + (el.length * j) / n, 0, el.position]);
    wires.push({ points: pts, radius: diameterM / 2 });
    if (el.driven) {
      drivenWire = i;
      drivenSegments = n;
    }
  });
  return solveWires(wires, fMHz, [{ wire: drivenWire, node: drivenSegments / 2, volts: { re: 1, im: 0 } }]);
}
