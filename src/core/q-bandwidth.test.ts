import { describe, expect, it } from 'vitest';
import { complex } from './complex';
import { impedanceQ, matchedFractionalBandwidth } from './q-bandwidth';
import { bandWidthMHz, swrSweep } from './swr-band';

// Referência: circuito RLC série, Q = ω0·L/R na ressonância (definição). Fora dela, sintonizado com uma reatância em série ideal, o Q
// do circuito sintonizado em f1 é o do elemento que sobra fixo: acima de f0 (indutivo) a sintonia é um capacitor em série e o Q é
// ω1·L/R; abaixo (capacitivo) é um indutor em série e o Q é 1/(ω1·C·R). Tolerância: 1e-4 (derivada numérica).

const L = 1e-6;
const R = 50;
const f0 = 100; // MHz
const C = 1 / ((2 * Math.PI * f0 * 1e6) ** 2 * L);
const zRlc = (f: number) => {
  const w = 2 * Math.PI * f * 1e6;
  return complex(R, w * L - 1 / (w * C));
};
const qOf = (f: number) => impedanceQ(zRlc(f * 0.999), zRlc(f), zRlc(f * 1.001), f, f * 0.001);

describe('Q pela impedância (Yaghjian e Best)', () => {
  it('RLC série ressonante: Q = ω0·L/R', () => {
    expect(qOf(f0) / ((2 * Math.PI * f0 * 1e6 * L) / R)).toBeCloseTo(1, 4);
  });

  it('RLC série fora da ressonância (sintonizado com reatância em série): ω1·L/R acima de f0, 1/(ω1·C·R) abaixo', () => {
    const w = (f: number) => 2 * Math.PI * f * 1e6;
    expect(qOf(104) / ((w(104) * L) / R)).toBeCloseTo(1, 4);
    expect(qOf(97) / (1 / (w(97) * C * R))).toBeCloseTo(1, 4);
  });

  it('banda de ROE < 2:1 prevista bate com a varredura do RLC (Q = 20)', () => {
    const q = 20;
    const s = swrSweep({
      centerMHz: 100,
      span: 0.1,
      coarseSteps: 20,
      fineSteps: 400,
      impedanceAt: (f) => complex(50, 50 * q * (f / 100 - 100 / f)),
      referenceOhms: 50,
    });
    expect((matchedFractionalBandwidth(q, 2) * 100) / bandWidthMHz(s.band2!)).toBeCloseTo(1, 2);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => impedanceQ(complex(1), complex(0), complex(1), 100, 1)).toThrow(RangeError);
    expect(() => matchedFractionalBandwidth(10, 1)).toThrow(RangeError);
  });
});
