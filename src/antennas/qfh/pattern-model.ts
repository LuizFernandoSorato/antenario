/**
 * Modelo eletromagnético da QFH para o padrão de irradiação: método dos momentos (`core/mom.ts`) sobre as duas espiras de fio.
 *
 * Geometria (reconstruída das medidas da calculadora de Coppens, ver `calc.ts`): cada espira é um fio fechado com um braço horizontal
 * embaixo e outro em cima (cada um com o comprimento de um diâmetro) e dois braços helicoidais de meia volta, em lados opostos do cilindro,
 * com o mesmo sentido de enrolamento. A espira menor é girada 90° em torno do eixo. O comprimento de cada braço helicoidal,
 * √(H² + (π·r)²), com r = (diâmetro interno + diâmetro do fio)/2, reproduz o "separador vertical" da calculadora (886 mm e 842,4 mm a 137,5 MHz),
 * e o braço horizontal 2r reproduz o "separador horizontal" (320,7 mm e 304,9 mm): ver o teste.
 *
 * Premissas do modelo:
 * - Alimentação: uma fonte de tensão no meio do braço horizontal de cima de cada espira (o cabo coaxial sobe pelo centro até o topo
 *   e o braço de baixo é contínuo), com as duas fontes em QUADRATURA ideal (90°).
 *   Na QFH real, a quadratura vem da diferença de comprimento das espiras (uma indutiva, outra capacitiva) e do casamento da junção;
 *   este modelo NÃO calcula isso, só o padrão com as correntes de excitação ideais. Por isso a impedância não é mostrada.
 * - As duas espiras ficam com o topo (e a alimentação) na mesma altura, a menor um pouco mais curta embaixo. TODO(fonte): a posição relativa
 *   real das espiras na QFH montada não consta das fontes consultadas.
 * - Fio de cobre (condutor perfeito) de 4,1 mm, espaço livre, sem o cilindro de suporte nem o cabo coaxial.
 * Eixo da antena = z; zênite = +z.
 */

import { type Complex3, type MomSolution, type Vec3, type Wire, combinedPower, directivityOf, solveWires } from '../../core/mom';
import type { CalcResult } from '../types';

/** Diâmetro do condutor de referência da calculadora de Coppens, em metros (ver `calc.ts`). */
export const WIRE_DIAMETER = 0.0041;

/** Trechos por braço horizontal e por braço helicoidal (par, para o gap cair num nó): ~λ/25 por trecho no braço helicoidal. */
const HORIZONTAL_SEGMENTS = 6;
const HELIX_SEGMENTS = 12;
/** Nó do meio do braço horizontal de cima, onde fica a alimentação. */
const FEED_NODE = HORIZONTAL_SEGMENTS + HELIX_SEGMENTS + HORIZONTAL_SEGMENTS / 2;

/** Espira fechada: base em z = z0, topo em z = z0 + h, raio r da linha central do fio. `rotated` gira a espira 90° em torno do eixo. */
export function qfhLoop(h: number, r: number, wireRadius: number, rotated: boolean, z0 = 0): Wire {
  const pts: Vec3[] = [];
  const at = (angle: number, z: number): Vec3 =>
    rotated ? [-r * Math.sin(angle), r * Math.cos(angle), z] : [r * Math.cos(angle), r * Math.sin(angle), z];
  // Base: do ângulo 0 ao ângulo π.
  for (let i = 0; i < HORIZONTAL_SEGMENTS; i++) {
    const u = i / HORIZONTAL_SEGMENTS;
    pts.push(rotated ? [0, r * (1 - 2 * u), z0] : [r * (1 - 2 * u), 0, z0]);
  }
  // Braço helicoidal 1: de π a 2π, subindo (z cresce com o ângulo).
  for (let i = 0; i < HELIX_SEGMENTS; i++) {
    const u = i / HELIX_SEGMENTS;
    pts.push(at(Math.PI * (1 + u), z0 + h * u));
  }
  // Topo: de ângulo 0 até π (o nó central, `FEED_NODE`, é o gap de alimentação).
  for (let i = 0; i < HORIZONTAL_SEGMENTS; i++) {
    const u = i / HORIZONTAL_SEGMENTS;
    pts.push(rotated ? [0, r * (1 - 2 * u), z0 + h] : [r * (1 - 2 * u), 0, z0 + h]);
  }
  // Braço helicoidal 2: de π a 0, descendo, com o mesmo sentido de enrolamento (z cresce com o ângulo).
  for (let i = 0; i < HELIX_SEGMENTS; i++) {
    const u = i / HELIX_SEGMENTS;
    pts.push(at(Math.PI * (1 - u), z0 + h * (1 - u)));
  }
  return { points: pts, radius: wireRadius, closed: true };
}

export interface QfhModel {
  /** Densidade de potência relativa |E|² na direção (vetor unitário), com as duas espiras em quadratura ideal. */
  power: (dir: Vec3) => number;
  /** Diretividade (razão), com o pico no zênite. */
  directivity: number;
  /** Campo distante no zênite, para medir a razão axial. */
  zenithField: Complex3;
}

/** Resolve a QFH por momentos a partir das cotas do cálculo (B, C: espira maior; F, G: espira menor). */
export function solveQfh(result: CalcResult, frequencyMHz: number): QfhModel {
  const get = (label: string): number => {
    const m = result.measurements.find((x) => x.label === label);
    if (!m) throw new Error(`Cota ${label} não encontrada.`);
    return m.meters;
  };
  const wireRadius = WIRE_DIAMETER / 2;
  const rBig = (get('C') + WIRE_DIAMETER) / 2;
  const rSmall = (get('G') + WIRE_DIAMETER) / 2;
  // Alimentação no topo (z = 0), comum às duas espiras; a base de cada uma fica abaixo, à sua altura.
  const wires = [qfhLoop(get('B'), rBig, wireRadius, false, -get('B')), qfhLoop(get('F'), rSmall, wireRadius, true, -get('F'))];
  // Resposta a cada fonte sozinha; o campo e as correntes são lineares nas tensões.
  const alone = [0, 1].map((k) =>
    solveWires(wires, frequencyMHz, [{ wire: k, node: FEED_NODE, volts: { re: 1, im: 0 } }]),
  );
  // Corrente de cada espira no gap, por fonte: y[espira][fonte].
  const y = [0, 1].map((loop) => [0, 1].map((src) => alone[src]!.current(loop, FEED_NODE)));
  // Tensões v que dão corrente 1 na espira maior e −j na menor (módulos iguais, 90° de defasagem): y·v = (1, −j).
  const [a, b, c, d] = [y[0]![0]!, y[0]![1]!, y[1]![0]!, y[1]![1]!];
  const det = csub(cmul(a, d), cmul(b, c));
  const v0 = cdiv(csub(d, cmul(b, { re: 0, im: 1 })), det);
  const v1 = cdiv(csub(cmul(a, { re: 0, im: 1 }), c), det);
  const parts = [
    { solution: alone[0]!, factor: v0 },
    { solution: alone[1]!, factor: v1 },
  ];
  const power = combinedPower(parts);
  const zenith: Vec3 = [0, 0, 1];
  const zenithField = combinedField(parts, zenith);
  return { power, directivity: directivityOf(power, zenith), zenithField };
}

type C = { re: number; im: number };
const cmul = (p: C, q: C): C => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
const csub = (p: C, q: C): C => ({ re: p.re - q.re, im: p.im - q.im });
const cdiv = (p: C, q: C): C => {
  const n = q.re * q.re + q.im * q.im;
  return { re: (p.re * q.re + p.im * q.im) / n, im: (p.im * q.re - p.re * q.im) / n };
};

function combinedField(parts: { solution: MomSolution; factor: C }[], dir: Vec3): Complex3 {
  const re: [number, number, number] = [0, 0, 0];
  const im: [number, number, number] = [0, 0, 0];
  for (const { solution, factor } of parts) {
    const f = solution.farField(dir);
    for (let i = 0; i < 3; i++) {
      re[i]! += factor.re * f.re[i]! - factor.im * f.im[i]!;
      im[i]! += factor.re * f.im[i]! + factor.im * f.re[i]!;
    }
  }
  return { re, im };
}
