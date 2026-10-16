import { describe, expect, it } from 'vitest';
import { approxEqual, complex } from '../core/complex';
import { wavelength } from '../core/wave';
import { DB_PER_NEPER, inputImpedance, openStubImpedance, shortedStubImpedance } from './transmission-line';

// Referências: propriedades clássicas de linhas (Pozar, Microwave Engineering, 4ª ed., §2.3–2.4):
// - λ/2 repete a impedância da carga;
// - λ/4 inverte: Z_in = Z0²/Z_L;
// - carga casada: Z_in = Z0 em qualquer comprimento;
// - stub em curto: Z_in = jZ0·tan(βl); em aberto: −jZ0·cot(βl).

const F = 145;
const VF = 0.66;
const lambdaLine = wavelength(F) * VF;
const TOL = 1e-9;

describe('inputImpedance (sem perdas)', () => {
  it('λ/2 repete a impedância da carga', () => {
    const zl = complex(30, -45);
    const zin = inputImpedance(zl, { z0: 50, lengthM: lambdaLine / 2, velocityFactor: VF }, F);
    expect(approxEqual(zin, zl, TOL)).toBe(true);
  });

  it('λ/4 inverte: 100 Ω em linha de 50 Ω → 25 Ω', () => {
    const zin = inputImpedance(100, { z0: 50, lengthM: lambdaLine / 4, velocityFactor: VF }, F);
    expect(approxEqual(zin, complex(25, 0), TOL)).toBe(true);
  });

  it('λ/4 com carga complexa: Z_in = Z0²/Z_L', () => {
    const zl = complex(20, 35);
    const zin = inputImpedance(zl, { z0: 75, lengthM: lambdaLine / 4, velocityFactor: VF }, F);
    // 75² / (20 + j35) = 5625·(20 − j35)/(20² + 35²) = (69,2308 − j121,1538)
    expect(zin.re).toBeCloseTo((5625 * 20) / 1625, 8);
    expect(zin.im).toBeCloseTo((-5625 * 35) / 1625, 8);
  });

  it('carga casada vê Z0 em qualquer comprimento', () => {
    for (const len of [0.1, 0.37, 1.9]) {
      const zin = inputImpedance(50, { z0: 50, lengthM: len, velocityFactor: VF }, F);
      expect(approxEqual(zin, complex(50, 0), TOL)).toBe(true);
    }
  });

  it('comprimento zero devolve a própria carga', () => {
    const zl = complex(12, 7);
    expect(approxEqual(inputImpedance(zl, { z0: 50, lengthM: 0, velocityFactor: VF }, F), zl, TOL)).toBe(true);
  });
});

describe('stubs sem perdas', () => {
  it('em curto, λ/8 → +jZ0 (indutivo)', () => {
    const z = shortedStubImpedance({ z0: 50, lengthM: lambdaLine / 8, velocityFactor: VF }, F);
    expect(approxEqual(z, complex(0, 50), TOL)).toBe(true);
  });

  it('em aberto, λ/8 → −jZ0 (capacitivo)', () => {
    const z = openStubImpedance({ z0: 50, lengthM: lambdaLine / 8, velocityFactor: VF }, F);
    expect(approxEqual(z, complex(0, -50), TOL)).toBe(true);
  });
});

describe('linha com perdas', () => {
  it('stub em curto de λ/4 com perdas: impedância alta mas finita e resistiva', () => {
    // Sem perdas seria infinita; com perdas, Z ≈ Z0/(αl) (Pozar §2.7, ressoador λ/4).
    const atten = 0.05; // dB/m (valor de teste, não de cabo real)
    const section = { z0: 50, lengthM: lambdaLine / 4, velocityFactor: VF, attenuationDbPerM: atten };
    const z = shortedStubImpedance(section, F);
    const alphaL = (atten / DB_PER_NEPER) * (lambdaLine / 4);
    expect(z.re).toBeCloseTo(50 / Math.tanh(alphaL), 6);
    expect(Math.abs(z.im)).toBeLessThan(1e-6);
  });

  it('1 Np = 8,686 dB', () => {
    expect(DB_PER_NEPER).toBeCloseTo(8.685889638, 9);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => inputImpedance(50, { z0: 0, lengthM: 1, velocityFactor: VF }, F)).toThrow(RangeError);
    expect(() => inputImpedance(50, { z0: 50, lengthM: -1, velocityFactor: VF }, F)).toThrow(RangeError);
    expect(() => inputImpedance(50, { z0: 50, lengthM: 1, velocityFactor: 0 }, F)).toThrow(RangeError);
    expect(() =>
      inputImpedance(50, { z0: 50, lengthM: 1, velocityFactor: VF, attenuationDbPerM: -1 }, F),
    ).toThrow(RangeError);
  });
});
