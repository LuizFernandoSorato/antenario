/**
 * Estudo do tamanho do refletor do turnstile por método dos momentos (`core/mom.ts`).
 *
 * Nenhuma fonte consultada dá o tamanho do refletor (ver `calc.ts`), então ele sai deste modelo: dois dipolos cruzados de 0,47λ (ressonância
 * do solver, ver CLAUDE.md) a λ/4 de uma tela quadrada. O segundo dipolo fica 0,01λ acima do primeiro (os fios do solver não têm junções).
 * A tela é uma grade de hastes paralelas em duas camadas ortogonais (0,01λ de distância entre as camadas), com espaçamento
 * `MESH_OPENING_LAMBDA` entre hastes e raio de 0,0014λ (3 mm a 137,5 MHz). As duas correntes têm o mesmo módulo e 90° de defasagem
 * (quadratura ideal; a corrente de B é ajustada só em módulo, as correntes próprias dos dois dipolos têm fases quase iguais).
 *
 * Limitações: condutor perfeito, espaço livre, sem mastro nem cabos, sem o isolador central. É um modelo, não uma medida.
 */

import { type Vec3, type Wire, combinedPower, directivityOf, solveWires } from '../../core/mom';

/** Espaçamento entre as hastes da tela do modelo, em λ. Com 0,0333λ a diretividade muda menos de 0,1 dB (teste); com 0,1λ muda ≈ 0,4 dB e a F/B ≈ 3 dB. */
export const MESH_OPENING_LAMBDA = 0.05;
/** Lado do refletor recomendado (λ): a F/B fica em ≈ 17 a 18 dB e o ganho em ≈ 7,8 dBi no estudo; acima disso o estudo não mostrou melhora estável. */
export const REFLECTOR_SIDE_LAMBDA = 1;
/** Lado mínimo (λ) no estudo com F/B ≥ 15 dB; com 0,5λ a F/B cai para ≈ 8 dB. */
export const REFLECTOR_MIN_SIDE_LAMBDA = 0.75;

/** Valores do campo "tipo de refletor": chapa ou tela (1) e um tubo alinhado com cada dipolo (2). */
export const REFLECTOR_PLATE = 1;
export const REFLECTOR_TUBES = 2;
/**
 * Comprimento do tubo do refletor (λ) com UM tubo sob cada dipolo: o melhor do estudo (F/B ≈ 9 dB). Abaixo de ≈ 0,45λ o tubo deixa de refletir
 * e passa a funcionar como diretor (F/B negativa); acima de ≈ 0,55λ o ganho e a F/B voltam a cair.
 */
export const TUBE_LENGTH_LAMBDA = 0.5;

const DIPOLE_HALF_LAMBDA = 0.235;
/** Raio das hastes e tubos do refletor no modelo, em λ (3 mm a 137,5 MHz; premissa). */
export const ROD_RADIUS_LAMBDA = 0.0014;
const LAYER_OFFSET_LAMBDA = 0.01;
const DIPOLE_SEGMENTS = 12;

export interface ReflectorStudy {
  sideLambda: number;
  /** Diretividade no zênite, em dBi. */
  directivityDbi: number;
  /** Relação frente–costas (zênite contra nadir), em dB. */
  frontToBackDb: number;
  /** Nível em 30° e 10° de elevação em relação ao zênite, em dB (negativo). */
  at30DegDb: number;
  at10DegDb: number;
}

/** Resultados do estudo a 137,5 MHz (escalam com λ), espaçamento 0,05λ, altura λ/4. Conferidos pelo teste. */
export const REFLECTOR_STUDY: readonly ReflectorStudy[] = [
  { sideLambda: 0.5, directivityDbi: 7.1, frontToBackDb: 7.7, at30DegDb: -5.8, at10DegDb: -9.8 },
  { sideLambda: 0.75, directivityDbi: 7.3, frontToBackDb: 15.6, at30DegDb: -5.9, at10DegDb: -9.7 },
  { sideLambda: 1, directivityDbi: 7.8, frontToBackDb: 18, at30DegDb: -6.3, at10DegDb: -10.5 },
  { sideLambda: 1.25, directivityDbi: 8.5, frontToBackDb: 16.4, at30DegDb: -7.2, at10DegDb: -11.4 },
  { sideLambda: 1.5, directivityDbi: 8.1, frontToBackDb: 14.6, at30DegDb: -6.1, at10DegDb: -11 },
];

/** Estudo com um tubo alinhado com cada dipolo, a λ/4, a 137,5 MHz (escala com λ). Conferido pelo teste. */
export const TUBE_STUDY: readonly ReflectorStudy[] = [
  { sideLambda: 0.45, directivityDbi: 4.9, frontToBackDb: 0.1, at30DegDb: -5.8, at10DegDb: -9.6 },
  { sideLambda: 0.5, directivityDbi: 5.6, frontToBackDb: 9, at30DegDb: -3.5, at10DegDb: -5.9 },
  { sideLambda: 0.525, directivityDbi: 4.9, frontToBackDb: 8.7, at30DegDb: -3, at10DegDb: -4.8 },
  { sideLambda: 0.55, directivityDbi: 4.4, frontToBackDb: 7.3, at30DegDb: -2.8, at10DegDb: -4.3 },
];

function meshWires(side: number, opening: number, z: number, lambda: number): Wire[] {
  const wires: Wire[] = [];
  const rods = Math.max(1, Math.round(side / opening));
  const segments = Math.max(2, Math.ceil(side / (lambda / 10)));
  const radius = ROD_RADIUS_LAMBDA * lambda;
  for (let k = 0; k <= rods; k++) {
    const c = -side / 2 + (side * k) / rods;
    const alongX: Vec3[] = [];
    const alongY: Vec3[] = [];
    for (let i = 0; i <= segments; i++) {
      const u = -side / 2 + (side * i) / segments;
      alongX.push([u, c, z]);
      alongY.push([c, u, z - LAYER_OFFSET_LAMBDA * lambda]);
    }
    wires.push({ points: alongX, radius }, { points: alongY, radius });
  }
  return wires;
}

function dipole(axis: 'x' | 'y', z: number, half: number, radius: number): Wire {
  const points: Vec3[] = [];
  for (let i = 0; i <= DIPOLE_SEGMENTS; i++) {
    const u = -half + (2 * half * i) / DIPOLE_SEGMENTS;
    points.push(axis === 'x' ? [u, 0, z] : [0, u, z]);
  }
  return { points, radius };
}

/** Resolve o turnstile sobre uma tela quadrada de lado `sideLambda`·λ. */
export function studyReflector(
  sideLambda: number,
  frequencyMHz = 137.5,
  openingLambda = MESH_OPENING_LAMBDA,
  heightLambda = 0.25,
): ReflectorStudy {
  const lambda = 299.792458 / frequencyMHz;
  return solveOverReflector(sideLambda, frequencyMHz, meshWires(sideLambda * lambda, openingLambda * lambda, -heightLambda * lambda, lambda));
}

/**
 * Refletor de TUBOS: `perAxis` tubos de comprimento `lengthLambda`·λ, paralelos a cada dipolo, a λ/4 (ou `heightLambda`), espaçados de
 * `pitchLambda`·λ e centrados (`perAxis` = 1: uma cruz, um tubo alinhado com cada dipolo). Raio do tubo = o das hastes da tela.
 */
export function studyTubeReflector(
  lengthLambda: number,
  perAxis: number,
  pitchLambda: number,
  frequencyMHz = 137.5,
  heightLambda = 0.25,
): ReflectorStudy {
  const lambda = 299.792458 / frequencyMHz;
  const radius = ROD_RADIUS_LAMBDA * lambda;
  const len = lengthLambda * lambda;
  const z = -heightLambda * lambda;
  const segments = Math.max(4, 2 * Math.ceil(len / (lambda / 10) / 2));
  const wires: Wire[] = [];
  for (let k = 0; k < perAxis; k++) {
    const c = (k - (perAxis - 1) / 2) * pitchLambda * lambda;
    const alongX: Vec3[] = [];
    const alongY: Vec3[] = [];
    for (let i = 0; i <= segments; i++) {
      const u = -len / 2 + (len * i) / segments;
      alongX.push([u, c, z]);
      alongY.push([c, u, z - LAYER_OFFSET_LAMBDA * lambda]);
    }
    wires.push({ points: alongX, radius }, { points: alongY, radius });
  }
  return solveOverReflector(lengthLambda, frequencyMHz, wires);
}

function solveOverReflector(sideLambda: number, frequencyMHz: number, reflectorWires: Wire[]): ReflectorStudy {
  const lambda = 299.792458 / frequencyMHz;
  const radius = ROD_RADIUS_LAMBDA * lambda;
  const wires = [
    dipole('x', 0, DIPOLE_HALF_LAMBDA * lambda, radius),
    dipole('y', LAYER_OFFSET_LAMBDA * lambda, DIPOLE_HALF_LAMBDA * lambda, radius),
    ...reflectorWires,
  ];
  const feed = DIPOLE_SEGMENTS / 2;
  const a = solveWires(wires, frequencyMHz, [{ wire: 0, node: feed, volts: { re: 1, im: 0 } }]);
  const b = solveWires(wires, frequencyMHz, [{ wire: 1, node: feed, volts: { re: 1, im: 0 } }]);
  const ia = a.current(0, feed);
  const ib = b.current(1, feed);
  // Tensão do dipolo B: módulo que iguala as correntes, atrasada de 90°.
  const ratio = Math.hypot(ia.re, ia.im) / Math.hypot(ib.re, ib.im);
  const power = combinedPower([
    { solution: a, factor: { re: 1, im: 0 } },
    { solution: b, factor: { re: 0, im: -ratio } },
  ]);
  const up: Vec3 = [0, 0, 1];
  const top = power(up);
  const level = (elevationDeg: number): number => {
    const t = ((90 - elevationDeg) * Math.PI) / 180;
    return 10 * Math.log10(power([Math.sin(t), 0, Math.cos(t)]) / top);
  };
  return {
    sideLambda,
    directivityDbi: 10 * Math.log10(directivityOf(power, up)),
    frontToBackDb: 10 * Math.log10(top / power([0, 0, -1])),
    at30DegDb: level(30),
    at10DegDb: level(10),
  };
}
