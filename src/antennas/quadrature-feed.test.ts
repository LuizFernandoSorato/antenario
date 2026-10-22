import { describe, expect, it } from 'vitest';
import { complex } from '../core/complex';
import { wavelength } from '../core/wave';
import { inputImpedance } from '../lines/transmission-line';
import { quadratureAt } from './quadrature-feed';

// Referência: linha sem perdas de 1/4 de onda (Pozar, §2.3): em f0, Z_in = Zq²/Z_L e I_L = −j·V/Zq. Tolerância: 1e-9.

describe('alimentação em quadratura', () => {
  it('em f0 com Z_A = Z_B = Zq = R: correntes iguais a −90°, Z = R/2 e razão axial 0 dB', () => {
    const r = complex(73, 0);
    const q = quadratureAt(r, r, 73, 137.5, 137.5);
    expect(q.z.re).toBeCloseTo(36.5, 9);
    expect(q.z.im).toBeCloseTo(0, 9);
    expect(q.currentRatio.re).toBeCloseTo(0, 9);
    expect(q.currentRatio.im).toBeCloseTo(-1, 9);
    expect(q.axialRatioDb).toBeLessThan(1e-6);
  });

  it('impedância na junção = Z_A ∥ (linha terminada em Z_B), em qualquer frequência', () => {
    const zA = complex(60, 25);
    const zB = complex(60, 25);
    const f0 = 145;
    const f = 152;
    const zInB = inputImpedance(zB, { z0: 75, lengthM: wavelength(f0) / 4, velocityFactor: 1 }, f);
    const yA = 1 / (zA.re ** 2 + zA.im ** 2);
    const yB = 1 / (zInB.re ** 2 + zInB.im ** 2);
    const y = complex(zA.re * yA + zInB.re * yB, -zA.im * yA - zInB.im * yB);
    const expected = complex(y.re / (y.re ** 2 + y.im ** 2), -y.im / (y.re ** 2 + y.im ** 2));
    const q = quadratureAt(zA, zB, 75, f0, f);
    expect(q.z.re).toBeCloseTo(expected.re, 9);
    expect(q.z.im).toBeCloseTo(expected.im, 9);
  });

  it('fora de f0 a razão axial piora', () => {
    const r = complex(73, 0);
    expect(quadratureAt(r, r, 73, 100, 110).axialRatioDb).toBeGreaterThan(0.5);
  });

  it('linha com Zq diferente de R: correntes desiguais (|I_B/I_A| = R/Zq)', () => {
    const r = complex(73, 0);
    const q = quadratureAt(r, r, 50, 100, 100);
    expect(Math.hypot(q.currentRatio.re, q.currentRatio.im)).toBeCloseTo(73 / 50, 9);
  });
});
