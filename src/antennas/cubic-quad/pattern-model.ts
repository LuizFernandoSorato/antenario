/**
 * Modelo eletromagnético da quadra cúbica para o padrão de irradiação: método dos momentos (`core/mom.ts`) sobre espiras
 * quadradas fechadas de fio. Não há fórmula fechada: o padrão depende das correntes induzidas nas espiras parasitas.
 *
 * Geometria: espiras quadradas no plano x–y, empilhadas ao longo de z (boom), refletor em z = 0, excitado a D, diretores
 * adiante; frente em +z. O excitado é alimentado no meio do lado de baixo (polarização ao longo de x: plano E = x–z,
 * plano H = y–z). As demais espiras são fios fechados sem carga. Fio de cobre (condutor perfeito), espaço livre, sem
 * vareta (spreader) nem boom.
 *
 * Premissa: o raio do fio. A ferramenta de cálculo da quadra não pede o diâmetro do fio; o modelo usa `WIRE_DIAMETER`
 * (fio rígido comum). Um fio mais grosso ou mais fino muda a ressonância de cada espira de forma pequena.
 */

import { type MomSolution, type Vec3, type Wire, solveWires } from '../../core/mom';
import type { CalcResult } from '../types';

/** Diâmetro do fio assumido no modelo, em metros (≈ fio de cobre de 2,5 mm²). Não vem de fonte: premissa do modelo. */
export const WIRE_DIAMETER = 0.002;

/** Trechos por lado da espira (par não é necessário: o gap fica no nó central do lado, nó 3 de 6). */
const SEGMENTS_PER_SIDE = 6;

function loop(side: number, z: number, radius: number): Wire {
  const n = SEGMENTS_PER_SIDE;
  const pts: Vec3[] = [];
  for (let i = 0; i < n; i++) pts.push([-side / 2 + (side * i) / n, -side / 2, z]);
  for (let i = 0; i < n; i++) pts.push([side / 2, -side / 2 + (side * i) / n, z]);
  for (let i = 0; i < n; i++) pts.push([side / 2 - (side * i) / n, side / 2, z]);
  for (let i = 0; i < n; i++) pts.push([-side / 2, side / 2 - (side * i) / n, z]);
  return { points: pts, radius, closed: true };
}

/** Resolve a quadra por momentos: refletor, excitado (1 V) e diretores, a partir das cotas do cálculo. */
export function solveQuad(result: CalcResult, frequencyMHz: number, directorCount: number): MomSolution {
  const get = (label: string): number => {
    const m = result.measurements.find((x) => x.label === label);
    if (!m) throw new Error(`Cota ${label} não encontrada.`);
    return m.meters;
  };
  const radius = WIRE_DIAMETER / 2;
  const spacing = get('D');
  const wires: Wire[] = [loop(get('A'), 0, radius), loop(get('B'), spacing, radius)];
  for (let i = 0; i < directorCount; i++) wires.push(loop(get('C'), spacing * (2 + i), radius));
  return solveWires(wires, frequencyMHz, [{ wire: 1, node: SEGMENTS_PER_SIDE / 2, volts: { re: 1, im: 0 } }]);
}
