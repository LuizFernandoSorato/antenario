import { describe, expect, it } from 'vitest';
import { complex } from './complex';
import { bandAround, bandWidthMHz, interpolateComplex, swrSweep } from './swr-band';

// Referência: circuito RLC série ressonante, Z = R + jX com X = R·Q·(f/f0 − f0/f). A faixa de ROE ≤ S em volta de f0 tem
// largura relativa (S − 1)/(Q·√S) quando a carga é R = Z0 (Q alto). Fonte: Hansen, "Fundamental limitations in antennas"
// (Proc. IEEE, 1981) e Yaghjian & Best, "Impedance, Bandwidth, and Q of Antennas" (IEEE TAP, 2005), eq. 4 com β² = (S−1)²/(4S).
// Tolerância: 0,5 % (interpolação e Q finito).

const rlc = (r: number, q: number, f0: number) => (f: number) => complex(r, r * q * (f / f0 - f0 / f));

describe('faixa de ROE', () => {
  it('RLC série em 50 Ω: largura relativa (S − 1)/(Q·√S)', () => {
    const q = 20;
    const s = swrSweep({ centerMHz: 100, span: 0.1, coarseSteps: 20, fineSteps: 400, impedanceAt: rlc(50, q, 100), referenceOhms: 50 });
    expect(s.minSwr).toBeCloseTo(1, 6);
    expect(s.minAtMHz).toBeCloseTo(100, 6);
    expect(bandWidthMHz(s.band2!) / 100 / (1 / (q * Math.SQRT2))).toBeCloseTo(1, 2);
    expect(bandWidthMHz(s.band15!) / 100 / (0.5 / (q * Math.sqrt(1.5)))).toBeCloseTo(1, 2);
    expect(s.band2!.open).toBe(false);
  });

  it('faixa maior que a varredura: marcada como aberta', () => {
    const s = swrSweep({ centerMHz: 100, span: 0.05, coarseSteps: 10, fineSteps: 100, impedanceAt: rlc(50, 2, 100), referenceOhms: 50 });
    expect(s.band2!.open).toBe(true);
    expect(s.band2!.lowMHz).toBeCloseTo(95, 9);
  });

  it('ROE mínima acima do limite: sem faixa', () => {
    const s = swrSweep({ centerMHz: 100, span: 0.1, coarseSteps: 20, fineSteps: 200, impedanceAt: rlc(150, 10, 100), referenceOhms: 50 });
    expect(s.minSwr).toBeCloseTo(3, 6);
    expect(s.band2).toBeNull();
    expect(s.band15).toBeNull();
  });

  it('rede de alimentação aplicada depois da interpolação', () => {
    // Antena de 100 Ω com um transformador ideal 2:1 de impedância: casa em 50 Ω.
    const s = swrSweep({
      centerMHz: 100,
      span: 0.1,
      coarseSteps: 20,
      fineSteps: 200,
      impedanceAt: rlc(100, 20, 100),
      feed: (z) => complex(z.re / 2, z.im / 2),
      referenceOhms: 50,
    });
    expect(s.minSwr).toBeCloseTo(1, 6);
  });

  it('interpolação de 4 pontos é exata para um polinômio cúbico', () => {
    const p = (x: number) => complex(x ** 3 - 2 * x, 0.5 * x * x);
    const grid = [0, 1, 2, 3, 4, 5];
    const z = interpolateComplex(grid, grid.map(p), 2.37);
    expect(z.re).toBeCloseTo(p(2.37).re, 10);
    expect(z.im).toBeCloseTo(p(2.37).im, 10);
  });

  it('a faixa parte do mínimo, não do centro da varredura', () => {
    const b = bandAround([1, 2, 3, 4, 5], [3, 3, 2.5, 1.2, 3], 2);
    expect(b!.lowMHz).toBeCloseTo(3 + 0.5 / 1.3, 9);
    expect(b!.highMHz).toBeCloseTo(4 + 0.8 / 1.8, 9);
  });

  it('rejeita varredura inválida', () => {
    const base = { centerMHz: 100, span: 0.1, coarseSteps: 20, fineSteps: 200, impedanceAt: rlc(50, 20, 100), referenceOhms: 50 };
    expect(() => swrSweep({ ...base, span: 0 })).toThrow(RangeError);
    expect(() => swrSweep({ ...base, coarseSteps: 7 })).toThrow(RangeError);
  });
});
