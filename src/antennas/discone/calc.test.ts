import { describe, expect, it } from 'vitest';
import { wavelength } from '../../core/wave';
import { calc, coneHalfAngleDeg, defaultParams, monoconeImpedance } from './calc';
import { cutList } from './cutlist';

// Referências: S. Stearns (K6OIK), "All About the Discone Antenna", QEX jan/fev 2007.
// - Eq. 2: Z0 = (η/2π)·ln cot(θ/2), η = 376,73 Ω.
// - Eq. 4: θ = 2·atan(exp(−Z0/60)); o artigo cita 47° como ângulo ótimo para 50 Ω de banda estreita (p. 38).
// - Regra prática (p. 40): 1ª ressonância = 0,7 × menor frequência; R + L = λ_res/2.
// - Eq. 5 (Nail): R/L = 0,72·sen θ; o artigo calcula R/L = 0,36 para θ = 30°.

function m(r: ReturnType<typeof calc>, label: string): number {
  const x = r.measurements.find((y) => y.label === label);
  if (!x) throw new Error(`Cota ${label} não encontrada`);
  return x.meters;
}

describe('discone: fórmulas do artigo', () => {
  it('50 Ω → semiângulo ≈ 47° (valor citado no artigo)', () => {
    expect(coneHalfAngleDeg(50)).toBeCloseTo(47, 0);
  });

  it('a Eq. 4 é a inversa da Eq. 2 (com η/2π = 60 Ω, diferença < 1 %)', () => {
    for (const z of [30, 50, 75, 100]) {
      const back = monoconeImpedance(coneHalfAngleDeg(z));
      expect(Math.abs(back - z) / z).toBeLessThan(0.01);
    }
  });

  it('a proporção de Nail dá 0,36 a 30° (valor do artigo)', () => {
    expect(0.72 * Math.sin((30 * Math.PI) / 180)).toBeCloseTo(0.36, 12);
  });
});

describe('discone: calc', () => {
  it('R + L = λ/2 da primeira ressonância (0,7 × menor frequência)', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 470 });
    const lambdaRes = wavelength(0.7 * 470);
    // Para o exemplo do artigo, λ_res = 0,91 m e meio comprimento = 0,46 m (arredondado pelo artigo).
    expect(lambdaRes).toBeCloseTo(0.911, 2);
    expect(m(r, 'E') + m(r, 'A')).toBeCloseTo(lambdaRes / 2, 12);
  });

  it('R/L segue a proporção de Nail e a geometria do cone é consistente', () => {
    const r = calc(defaultParams);
    const theta = (coneHalfAngleDeg(50) * Math.PI) / 180;
    expect(m(r, 'E') / m(r, 'A')).toBeCloseTo(0.72 * Math.sin(theta), 12);
    expect(m(r, 'B')).toBeCloseTo(2 * m(r, 'A') * Math.sin(theta), 12);
    expect(m(r, 'C')).toBeCloseTo(m(r, 'A') * Math.cos(theta), 12);
    expect(m(r, 'D')).toBeCloseTo(2 * m(r, 'E'), 12);
  });

  it('as medidas escalam com 1/frequência', () => {
    const a = calc({ ...defaultParams, frequencyMHz: 100 });
    const b = calc({ ...defaultParams, frequencyMHz: 200 });
    expect(m(a, 'A') / m(b, 'A')).toBeCloseTo(2, 12);
  });

  it('aviso para impedância diferente de 50 Ω; nenhum para 50 Ω', () => {
    expect(calc({ ...defaultParams, designImpedance: 75 }).warnings.some((w) => w.message.includes('0,72'))).toBe(true);
    expect(calc(defaultParams).warnings.some((w) => w.message.includes('0,72'))).toBe(false);
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, rodCount: 2 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, rodCount: 8.5 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, designImpedance: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
  });
});

describe('discone: lista de corte', () => {
  it('hastes do cone (A) e do disco (E), na quantidade informada', () => {
    const items = cutList({ ...defaultParams, rodCount: 12 });
    expect(items.map((i) => [i.label, i.quantity])).toEqual([['A', 12], ['E', 12]]);
  });
});
