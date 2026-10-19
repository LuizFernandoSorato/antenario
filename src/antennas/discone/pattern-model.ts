/**
 * Modelo eletromagnético do discone para o padrão de irradiação: método dos momentos (`core/mom.ts`) sobre hastes de fio.
 *
 * Geometria: eixo = z, disco em cima (z = F) e cone embaixo com o vértice em z = 0, abrindo para baixo. Cada "par de hastes" é UM fio:
 * a haste do disco (da borda ao centro), o trecho vertical da folga e a haste do cone (do vértice à borda), de modo que não são
 * precisas junções. A fonte (1 V) fica no meio do trecho vertical de cada fio, todas em paralelo (mesma tensão), que é a alimentação
 * do discone: vivo no disco, malha no cone. A impedância de entrada é a dos fios em paralelo.
 *
 * Premissas do modelo:
 * - Hastes de fio no disco e no cone, no número e com o diâmetro pedidos no cálculo (até `MAX_MODEL_RODS`; acima disso o modelo usa
 *   `MAX_MODEL_RODS`, e um disco/cone de chapa se comporta de forma parecida ou melhor que o de hastes).
 * - Uma pequena abertura central de raio igual à folga F, onde as hastes se ligam ao trecho vertical.
 * - Condutor perfeito, espaço livre, sem o coaxial nem o mastro. O coaxial real, que sobe por dentro do cone, altera o padrão e a
 *   impedância; a corrente de modo comum na malha pode inclinar o padrão. Ver o guia.
 * - O padrão de um discone varia muito com a frequência: o cálculo é feito em cada frequência pedida.
 */

import { type MomSolution, type Vec3, type Wire, solveWires } from '../../core/mom';
import { wavelength } from '../../core/wave';
import type { CalcResult } from '../types';

/** Número máximo de pares de hastes no modelo (tempo de cálculo no navegador: cresce com o cubo do número de incógnitas). */
export const MAX_MODEL_RODS = 16;

/** Trechos por comprimento de onda (λ/12). Escolha do modelo: contra λ/20 e λ/30 a diretividade muda menos de 0,1 dB; ver o teste de convergência. */
export const SEGMENTS_PER_WAVELENGTH = 12;

export interface DisconeModel {
  solution: MomSolution;
  /** Número de pares de hastes usado no modelo. */
  rodCount: number;
  /** Impedância de entrada (hastes em paralelo), em ohms. */
  inputImpedance: { re: number; im: number };
}

export function solveDiscone(
  result: CalcResult,
  rodCount: number,
  rodDiameter: number,
  frequencyMHz: number,
  segmentsPerWavelength = SEGMENTS_PER_WAVELENGTH,
): DisconeModel {
  const get = (label: string): number => {
    const m = result.measurements.find((x) => x.label === label);
    if (!m) throw new Error(`Cota ${label} não encontrada.`);
    return m.meters;
  };
  const slant = get('A');
  const discRadius = get('E');
  const gap = get('F');
  const height = get('C');
  const sinTheta = (get('B') / 2) / slant;
  const cosTheta = height / slant;
  const n = Math.min(Math.max(3, Math.round(rodCount)), MAX_MODEL_RODS);
  const segLen = wavelength(frequencyMHz) / segmentsPerWavelength;
  const nDisc = Math.max(4, Math.ceil((discRadius - gap) / segLen));
  const nCone = Math.max(4, Math.ceil(slant / segLen));
  const r0 = gap; // abertura central

  const wires: Wire[] = [];
  const sources: { wire: number; node: number; volts: { re: number; im: number } }[] = [];
  for (let i = 0; i < n; i++) {
    const phi = (2 * Math.PI * i) / n;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const at = (r: number, z: number): Vec3 => [r * c, r * s, z];
    const pts: Vec3[] = [];
    // Disco: da borda ao centro, em z = F.
    for (let k = 0; k <= nDisc; k++) pts.push(at(discRadius + ((r0 - discRadius) * k) / nDisc, gap));
    // Trecho vertical da folga, com o nó da fonte no meio.
    const feedNode = pts.length;
    pts.push(at(r0, gap / 2));
    pts.push(at(r0, 0));
    // Cone: do vértice à borda, descendo, a partir de r0.
    for (let k = 1; k <= nCone; k++) pts.push(at(r0 + (slant * sinTheta * k) / nCone, -(slant * cosTheta * k) / nCone));
    sources.push({ wire: i, node: feedNode, volts: { re: 1, im: 0 } });
    wires.push({ points: pts, radius: rodDiameter / 2 });
  }
  const solution = solveWires(wires, frequencyMHz, sources);
  // Todos os pares têm a mesma tensão e a mesma impedância (simetria): o conjunto vale Z/n.
  let sumRe = 0;
  let sumIm = 0;
  for (let i = 0; i < n; i++) {
    const cur = solution.current(i, sources[i]!.node);
    sumRe += cur.re;
    sumIm += cur.im;
  }
  const mag2 = sumRe * sumRe + sumIm * sumIm;
  return { solution, rodCount: n, inputImpedance: { re: sumRe / mag2, im: -sumIm / mag2 } };
}
