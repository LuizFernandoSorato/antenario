import { describe, expect, it } from 'vitest';
import { dipoleField } from './pattern';
import { type Vec3, type Wire, combinedPower, directivityOf, solveWires } from './mom';

// Validação do solver de momentos contra valores conhecidos:
// - Dipolo de meia onda fino: diretividade 1,643 (2,15 dBi; Balanis, Antenna Theory, eq. 4-91) e largura de meia potência de 78°.
//   A impedância de 73,1 + j42,5 Ω (Balanis §4.6) vale para corrente exatamente senoidal; a equação integral resolvida dá R
//   maior em 0,5λ, e o dipolo fino RESSOA em ≈ 0,47–0,48λ com R ≈ 65–75 Ω, o comportamento de dipolos reais (o dipolo
//   ressonante é um pouco mais curto que λ/2; ARRL Antenna Book).
// - Dipolo de onda inteira: diretividade ≈ 2,41 (3,82 dBi; Balanis §4.2, corrente senoidal).
// - Dois dipolos paralelos: elemento × fator de arranjo (Balanis cap. 6), com o acoplamento mútuo real no MoM.
// - Conservação de energia (potência irradiada = potência de entrada) foi conferida à mão durante o desenvolvimento.

const F = 300; // MHz → λ = 0,9993 m
const LAMBDA = 299.792458 / F;

/** Dipolo ao longo de z. `segments` deve ser PAR, para existir um nó no centro (onde fica o gap). */
function dipole(lengthLambda: number, radiusLambda: number, segments: number): Wire {
  const L = lengthLambda * LAMBDA;
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) pts.push([0, 0, -L / 2 + (L * i) / segments]);
  return { points: pts, radius: radiusLambda * LAMBDA };
}

const center = (segments: number, volts = { re: 1, im: 0 }) => ({ wire: 0, node: segments / 2, volts });

describe('método dos momentos: dipolo', () => {
  it('meia onda: diretividade 1,643 e impedância coerente com o dipolo real', () => {
    const sol = solveWires([dipole(0.5, 1e-4, 30)], F, [center(30)]);
    const z = sol.inputImpedance(0);
    // 0,5λ de comprimento, fio fino: acima da ressonância (X > 0), R na faixa conhecida
    expect(z.re).toBeGreaterThan(72);
    expect(z.re).toBeLessThan(88);
    expect(z.im).toBeGreaterThan(36);
    expect(z.im).toBeLessThan(52);
    const d = sol.directivity([1, 0, 0]);
    expect(d).toBeGreaterThan(1.643 * 0.97);
    expect(d).toBeLessThan(1.643 * 1.03);
  });

  it('o dipolo fino ressoa (X = 0) entre 0,46λ e 0,485λ, com R de 65 a 76 Ω', () => {
    const x = (l: number) => solveWires([dipole(l, 1e-3, 40)], F, [center(40)]).inputImpedance(0);
    expect(x(0.46).im).toBeLessThan(0);
    expect(x(0.485).im).toBeGreaterThan(0);
    const z = x(0.473);
    expect(Math.abs(z.im)).toBeLessThan(8);
    expect(z.re).toBeGreaterThan(65);
    expect(z.re).toBeLessThan(76);
  });

  it('onda inteira: diretividade ≈ 2,41', () => {
    const sol = solveWires([dipole(1.0, 1e-4, 40)], F, [center(40)]);
    const d = sol.directivity([1, 0, 0]);
    expect(d).toBeGreaterThan(2.41 * 0.94);
    expect(d).toBeLessThan(2.41 * 1.06);
  });

  it('nulo no eixo do fio e padrão simétrico', () => {
    const sol = solveWires([dipole(0.5, 1e-4, 20)], F, [center(20)]);
    const eq = sol.power([1, 0, 0]);
    expect(sol.power([0, 0, 1]) / eq).toBeLessThan(1e-6);
    expect(sol.power([0, 1, 0]) / eq).toBeCloseTo(1, 6);
    const a = sol.power([Math.sin(0.8), 0, Math.cos(0.8)]);
    const b = sol.power([Math.sin(0.8), 0, -Math.cos(0.8)]);
    expect(a / b).toBeCloseTo(1, 6);
  });

  it('largura de meia potência no plano do fio ≈ 78° (Balanis)', () => {
    const sol = solveWires([dipole(0.5, 1e-4, 30)], F, [center(30)]);
    const peak = sol.power([1, 0, 0]);
    let angle = 0;
    for (let a = 0; a < 90; a += 0.1) {
      const t = (a * Math.PI) / 180;
      if (sol.power([Math.cos(t), 0, Math.sin(t)]) < peak / 2) {
        angle = a;
        break;
      }
    }
    expect(2 * angle).toBeGreaterThan(75);
    expect(2 * angle).toBeLessThan(81);
  });

  it('corrente quase senoidal ao longo do dipolo de meia onda', () => {
    const sol = solveWires([dipole(0.5, 1e-4, 40)], F, [center(40)]);
    const i0 = Math.hypot(sol.current(0, 20).re, sol.current(0, 20).im);
    for (const j of [10, 15, 25, 30]) {
      const c = sol.current(0, j);
      const z = (-0.25 + (0.5 * j) / 40) * 2 * Math.PI;
      expect(Math.hypot(c.re, c.im) / i0).toBeCloseTo(Math.cos(z), 1);
    }
  });
});

describe('método dos momentos: laço e dois dipolos', () => {
  it('laço quadrado de perímetro 1λ, fechado: diretividade ≈ 3,3 dBi (quadra de uma espira)', () => {
    // Referência: espira quadrada de 1λ, ≈ 1,0 a 1,25 dBd (3,2 a 3,4 dBi): Wikipedia "Quad antenna" e iw5edi.com
    // (consultadas em 2026-10-19). Não são fontes primárias: tolerância larga.
    const side = LAMBDA / 4;
    const n = 6;
    const pts: Vec3[] = [];
    for (let i = 0; i < n; i++) pts.push([-side / 2 + (side * i) / n, -side / 2, 0]);
    for (let i = 0; i < n; i++) pts.push([side / 2, -side / 2 + (side * i) / n, 0]);
    for (let i = 0; i < n; i++) pts.push([side / 2 - (side * i) / n, side / 2, 0]);
    for (let i = 0; i < n; i++) pts.push([-side / 2, side / 2 - (side * i) / n, 0]);
    const sol = solveWires([{ points: pts, radius: 5e-4 * LAMBDA, closed: true }], F, [{ wire: 0, node: n / 2, volts: { re: 1, im: 0 } }]);
    const dDb = 10 * Math.log10(sol.directivity([0, 0, 1]));
    expect(dDb).toBeGreaterThan(2.5);
    expect(dDb).toBeLessThan(4.1);
  });

  it('dois dipolos paralelos de meia onda a 0,5λ, em fase: diretividade como elemento × arranjo', () => {
    // Referência: integral numérica de [dipoleField(θ) · cos(π/2 · ux)]² (corrente senoidal, sem acoplamento): 5,98 dBi.
    // O MoM tem a corrente real e o acoplamento mútuo: tolerância de ±0,2 dB.
    const w1 = dipole(0.5, 1e-4, 20);
    const w2: Wire = { ...w1, points: w1.points.map((p): Vec3 => [p[0] + 0.5 * LAMBDA, p[1], p[2]]) };
    const sol = solveWires([w1, w2], F, [
      { wire: 0, node: 10, volts: { re: 1, im: 0 } },
      { wire: 1, node: 10, volts: { re: 1, im: 0 } },
    ]);
    const ref = (d: Vec3) => (dipoleField(Math.acos(d[2]), 0.5) * Math.cos((Math.PI / 2) * d[0])) ** 2;
    const refDb = 10 * Math.log10(directivityOf(ref, [0, 1, 0], 180, 144));
    expect(refDb).toBeCloseTo(5.98, 1);
    const dDb = 10 * Math.log10(sol.directivity([0, 1, 0]));
    expect(Math.abs(dDb - refDb)).toBeLessThan(0.2);
  });

  it('combinedPower e rotated: duas cópias em quadratura somam a potência', () => {
    const sol = solveWires([dipole(0.5, 1e-4, 20)], F, [center(20)]);
    const rot = sol.rotated(([x, y, z]) => [-y, x, z]); // 90° em torno de z: o dipolo continua ao longo de z
    const p = combinedPower([
      { solution: sol, factor: { re: 1, im: 0 } },
      { solution: rot, factor: { re: 0, im: -1 } },
    ]);
    // dipolos coincidentes (ambos ao longo de z): |1 − j|² = 2 vezes a potência de um
    expect(p([1, 0, 0]) / sol.power([1, 0, 0])).toBeCloseTo(2, 6);
  });
});
