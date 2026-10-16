import { describe, expect, it } from 'vitest';
import { abs, approxEqual, complex } from './complex';
import { reflectionCoefficient, swrFromGamma } from './reflection';
import { impedanceFromGamma, normalize, reactanceCircle, resistanceCircle, rotateTowardGenerator } from './smith';

// Referência: Pozar, "Microwave Engineering", cap. 2. Resultados clássicos:
//  - z = 1 está no centro (Γ = 0);
//  - circuito aberto/curto: Γ = +1 / −1; carga reativa pura: |Γ| = 1;
//  - linha de 1/4 de onda inverte a impedância normalizada (z → 1/z).

describe('Carta de Smith: círculos', () => {
  it('círculo r = 0 é o círculo unitário; r = 1 passa por Γ = 0 e Γ = 1', () => {
    expect(resistanceCircle(0)).toEqual({ cx: 0, cy: 0, r: 1 });
    const c = resistanceCircle(1);
    expect(c).toEqual({ cx: 0.5, cy: 0, r: 0.5 });
    expect(c.cx - c.r).toBeCloseTo(0, 12);
    expect(c.cx + c.r).toBeCloseTo(1, 12);
  });

  it('todo ponto com a resistência r cai no círculo de r', () => {
    for (const r of [0.2, 0.5, 2, 5]) {
      const c = resistanceCircle(r);
      for (const x of [-3, -0.4, 0, 0.7, 2.5]) {
        const g = reflectionCoefficient(complex(r * 50, x * 50), 50);
        expect(Math.hypot(g.re - c.cx, g.im - c.cy)).toBeCloseTo(c.r, 12);
      }
    }
  });

  it('todo ponto com a reatância x cai no círculo de x', () => {
    for (const x of [-5, -1, -0.3, 0.3, 1, 5]) {
      const c = reactanceCircle(x);
      for (const r of [0, 0.3, 1, 4]) {
        const g = reflectionCoefficient(complex(r * 50, x * 50), 50);
        expect(Math.hypot(g.re - c.cx, g.im - c.cy)).toBeCloseTo(c.r, 12);
      }
    }
  });

  it('entradas inválidas', () => {
    expect(() => resistanceCircle(-1)).toThrow(RangeError);
    expect(() => reactanceCircle(0)).toThrow(RangeError);
  });
});

describe('Carta de Smith: impedância e Γ', () => {
  it('ida e volta Z → Γ → Z', () => {
    const z = complex(25, -40);
    const back = impedanceFromGamma(reflectionCoefficient(z, 50), 50);
    expect(approxEqual(back, z, 1e-9)).toBe(true);
  });

  it('Γ = 0 é Z0; Γ = −1 é curto', () => {
    expect(approxEqual(impedanceFromGamma(complex(0), 75), complex(75, 0))).toBe(true);
    expect(approxEqual(impedanceFromGamma(complex(-1), 75), complex(0, 0))).toBe(true);
  });

  it('Γ = 1 (aberto) e |Γ| > 1 lançam RangeError', () => {
    expect(() => impedanceFromGamma(complex(1), 50)).toThrow(RangeError);
    expect(() => impedanceFromGamma(complex(0.9, 0.9), 50)).toThrow(RangeError);
  });

  it('normaliza por Z0', () => {
    expect(normalize(complex(100, -50), 50)).toEqual(complex(2, -1));
  });
});

describe('Carta de Smith: rotação em direção ao gerador', () => {
  it('não muda |Γ| (a ROE é constante na linha sem perdas)', () => {
    const g = reflectionCoefficient(complex(30, 20), 50);
    for (const deg of [10, 45, 90, 137]) {
      expect(abs(rotateTowardGenerator(g, deg))).toBeCloseTo(abs(g), 12);
      expect(swrFromGamma(abs(rotateTowardGenerator(g, deg)))).toBeCloseTo(swrFromGamma(abs(g)), 9);
    }
  });

  it('meia onda (180°) volta ao mesmo ponto', () => {
    const g = reflectionCoefficient(complex(30, 20), 50);
    expect(approxEqual(rotateTowardGenerator(g, 180), g, 1e-12)).toBe(true);
  });

  it('1/4 de onda (90°) inverte z: 100 + j50 sobre 50 Ω → 0,4 − j0,2 normalizado', () => {
    // z = 2 + j1; 1/z = (2 − j1)/5 = 0,4 − j0,2.
    const g = reflectionCoefficient(complex(100, 50), 50);
    const z = impedanceFromGamma(rotateTowardGenerator(g, 90), 50);
    expect(z.re / 50).toBeCloseTo(0.4, 12);
    expect(z.im / 50).toBeCloseTo(-0.2, 12);
  });
});
