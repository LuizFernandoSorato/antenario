import { describe, expect, it } from 'vitest';
import { calc, defaultParams } from './calc';
import { MAX_MODEL_RODS, solveDiscone } from './pattern-model';

// Sem medida com fonte para o padrão do discone. Os testes conferem o que o modelo precisa cumprir por física:
// - o limite de baixa frequência (estrutura muito menor que λ ≈ dipolo curto: D = 1,5, ou 1,76 dBi; Balanis §4.2);
// - convergência com a discretização;
// - ROE em 50 Ω: o mínimo na faixa contra o ROE ≤ 1,5 do Rothammel e a ponta de baixo citada no aviso do calc.ts.

const result = calc(defaultParams); // 100 MHz, regra do λ/4, 8 hastes de 4 mm
const db = (x: number) => 10 * Math.log10(x);
const dir = (thetaDeg: number, phiDeg: number): [number, number, number] => {
  const t = (thetaDeg * Math.PI) / 180;
  const p = (phiDeg * Math.PI) / 180;
  return [Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p), Math.cos(t)];
};
const swr = (z: { re: number; im: number }, z0 = 50) => {
  const g = Math.hypot(z.re - z0, z.im) / Math.hypot(z.re + z0, z.im);
  return (1 + g) / (1 - g);
};

describe('discone: padrão por momentos', () => {
  it('em baixa frequência (estrutura ≪ λ) é como um dipolo curto: D ≈ 1,6 a 1,9 dBi, nulo no eixo, máximo no horizonte', () => {
    const m = solveDiscone(result, 8, 0.004, 30);
    expect(db(m.solution.directivity())).toBeGreaterThan(1.4);
    expect(db(m.solution.directivity())).toBeLessThan(2);
    const p90 = m.solution.power(dir(90, 0));
    expect(m.solution.power(dir(0, 0)) / p90).toBeLessThan(1e-6);
    for (const t of [60, 75, 105, 120]) expect(m.solution.power(dir(t, 0))).toBeLessThanOrEqual(p90 * 1.001);
    // omnidirecional em azimute
    for (const ph of [10, 22.5, 45, 100]) expect(Math.abs(db(m.solution.power(dir(90, ph)) / p90))).toBeLessThan(0.1);
  });

  it('converge com a discretização (λ/12 contra λ/24): diretividade 0,2 dB e impedância 8 %', () => {
    for (const f of [100, 300]) {
      const a = solveDiscone(result, 8, 0.004, f, 12);
      const b = solveDiscone(result, 8, 0.004, f, 24);
      expect(Math.abs(db(a.solution.directivity()) - db(b.solution.directivity()))).toBeLessThan(0.2);
      const dz = Math.hypot(a.inputImpedance.re - b.inputImpedance.re, a.inputImpedance.im - b.inputImpedance.im);
      expect(dz / Math.hypot(b.inputImpedance.re, b.inputImpedance.im)).toBeLessThan(0.08);
    }
  }, 30000);

  it('a ROE mínima em 50 Ω entre 1,4f e 5f fica abaixo de 1,5 (Rothammel: ROE ≤ 1,5 na faixa)', () => {
    let best = Infinity;
    for (const f of [140, 160, 300, 500]) best = Math.min(best, swr(solveDiscone(result, 8, 0.004, f).inputImpedance));
    expect(best).toBeGreaterThan(1);
    expect(best).toBeLessThan(1.5);
  }, 60000);

  // Regra do λ/4 (ARRL Antenna Book, 21ª ed., Fig 48; Rothammel, §25.1.4), que os livros dão como boa já na menor frequência.
  // Os números conferidos aqui são os citados no aviso do calc.ts (≈ 11:1 em f e < 2:1 a partir de ≈ 1,4f); não há medida.
  it('ROE alta na menor frequência e abaixo de 2:1 a partir de ≈ 1,4 vez ela', () => {
    expect(swr(solveDiscone(result, 8, 0.004, 100).inputImpedance)).toBeGreaterThan(8);
    expect(swr(solveDiscone(result, 8, 0.004, 120).inputImpedance)).toBeGreaterThan(2);
    expect(swr(solveDiscone(result, 8, 0.004, 130).inputImpedance)).toBeGreaterThan(2);
    expect(swr(solveDiscone(result, 8, 0.004, 140).inputImpedance)).toBeLessThan(2);
  }, 60000);

  it('mais hastes reduzem a ondulação em azimute em alta frequência', () => {
    const ripple = (rods: number) => {
      const m = solveDiscone(result, rods, 0.004, 300);
      let lo = Infinity;
      let hi = 0;
      for (let k = 0; k < 72; k++) {
        const v = m.solution.power(dir(90, (360 * k) / 72));
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      return db(hi / lo);
    };
    expect(ripple(16)).toBeLessThan(ripple(8));
  }, 30000);

  it('a folga informada chega ao modelo: folga maior muda a impedância de entrada', () => {
    const maior = solveDiscone(calc({ ...defaultParams, centerGap: 0.15 }), 8, 0.004, 100).inputImpedance;
    const base = solveDiscone(result, 8, 0.004, 100).inputImpedance;
    expect(Math.hypot(maior.re - base.re, maior.im - base.im)).toBeGreaterThan(1);
  });

  it('limita o número de hastes do modelo', () => {
    expect(solveDiscone(result, 40, 0.004, 100).rodCount).toBe(MAX_MODEL_RODS);
    expect(solveDiscone(result, 8, 0.004, 100).rodCount).toBe(8);
  });
});
