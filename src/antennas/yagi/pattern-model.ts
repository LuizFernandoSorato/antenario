/**
 * Modelo eletromagnético do Yagi para o padrão de irradiação: método dos momentos (`core/mom.ts`) sobre os elementos
 * calculados (NBS ou DL6WU). Não há fórmula fechada para o padrão de um Yagi: ele depende das correntes induzidas
 * em cada elemento parasita, e é isso que o solver calcula.
 *
 * Geometria: elementos ao longo de x, boom ao longo de z, frente (diretores) em +z. Plano E = x–z, plano H = y–z.
 * Premissas: elementos cilíndricos de fio fino (raio = d/2), no espaço livre, SEM boom, excitado com gap delta no centro; os
 * parasitas são fios contínuos sem carga. Como o modelo não tem boom, usa os comprimentos dos elementos SEM a correção do boom
 * (o NBS soma essa correção só para compensar o efeito do boom metálico; ver `isolatedElements`).
 */

import { type MomSolution, type Vec3, type Wire, solveWires } from '../../core/mom';
import { wavelength } from '../../core/wave';
import type { CalcResult } from '../types';
import { DL6WU_MAX_ELEMENTS } from './dl6wu-calc';
import { type YagiParams, calc as yagiCalc } from './calc';

export interface YagiModelInput {
  frequencyMHz: number;
  /** Diâmetro dos elementos, em metros. */
  elementDiameter: number;
}

/** Número de elementos acima do qual o padrão por momentos deixa de ser calculado (custo O(N³) no navegador). É o limite da própria Yagi. */
export const MAX_MODEL_ELEMENTS = DL6WU_MAX_ELEMENTS;

/** Elementos do resultado do cálculo, na ordem refletor, excitado, diretores: comprimento total e posição no boom (m). */
export function yagiElements(result: CalcResult, frequencyMHz: number): { length: number; position: number; driven: boolean }[] {
  const lambda = wavelength(frequencyMHz);
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
  void lambda;
  const lengths = [get('R'), get('DE'), ...directors.map((d) => d.meters)];
  return lengths.map((length, i) => ({ length, position: positions[i]!, driven: i === 1 }));
}

/** Trechos por elemento: par (gap no nó central), com ≈ λ/25 por trecho. */
function segmentsFor(length: number, lambda: number): number {
  const n = Math.ceil(length / (lambda / 25));
  return Math.max(10, n % 2 === 0 ? n : n + 1);
}

/** Resolve o Yagi por momentos. O elemento excitado recebe 1 V; devolve a solução e a geometria usada. */
export function solveYagi(result: CalcResult, input: YagiModelInput): MomSolution {
  const lambda = wavelength(input.frequencyMHz);
  const elements = yagiElements(result, input.frequencyMHz);
  if (elements.length > MAX_MODEL_ELEMENTS) {
    throw new RangeError(`O padrão por momentos só é calculado até ${MAX_MODEL_ELEMENTS} elementos (recebido: ${elements.length}).`);
  }
  const wires: Wire[] = [];
  let drivenWire = -1;
  let drivenSegments = 0;
  elements.forEach((el, i) => {
    const n = segmentsFor(el.length, lambda);
    const pts: Vec3[] = [];
    for (let j = 0; j <= n; j++) pts.push([-el.length / 2 + (el.length * j) / n, 0, el.position]);
    wires.push({ points: pts, radius: input.elementDiameter / 2 });
    if (el.driven) {
      drivenWire = i;
      drivenSegments = n;
    }
  });
  return solveWires(wires, input.frequencyMHz, [{ wire: drivenWire, node: drivenSegments / 2, volts: { re: 1, im: 0 } }]);
}

/**
 * Resultado do cálculo da Yagi com boom isolante (sem a correção do boom condutor): são os comprimentos dos elementos soltos no
 * espaço, que é o que o modelo por momentos representa. Com boom metálico real, o elemento corrigido se comporta como este elemento solto.
 */
export function isolatedElements(params: YagiParams): CalcResult {
  return yagiCalc({ ...params, boomDiameter: 0 });
}
