import { describe, expect, it } from 'vitest';
import { swrFromImpedance } from '../core/reflection';
import { inputImpedance } from '../lines/transmission-line';
import { quarterWaveFractionalBandwidth, quarterWaveTransformer } from './quarter-wave';

// Referências:
// - Z_t = √(Z0·R_L) e Pozar, Microwave Engineering, 4ª ed., §5.5 (banda).
// - A banda de Pozar é conferida por simulação: varre a frequência com a linha real
//   (inputImpedance) e acha onde a ROE cruza o limite, por bisseção.

const VF = 0.66;

function simulatedUpperEdge(z0: number, rl: number, f0: number, maxSwr: number): number {
  const zt = Math.sqrt(z0 * rl);
  const len = quarterWaveTransformer({ z0, loadOhms: rl, fMHz: f0, velocityFactor: VF, maxSwr }).physicalLengthM;
  const swrAt = (f: number) => swrFromImpedance(inputImpedance(rl, { z0: zt, lengthM: len, velocityFactor: VF }, f), z0);
  // Entre f0 (ROE 1) e 2·f0 (λ/2: ROE = R_L/Z0, o máximo) há exatamente um cruzamento.
  let lo = f0;
  let hi = 2 * f0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (swrAt(mid) < maxSwr) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

describe('quarterWaveTransformer', () => {
  it('50 → 100 Ω: Z_t = 70,71 Ω e casamento perfeito em f0', () => {
    const r = quarterWaveTransformer({ z0: 50, loadOhms: 100, fMHz: 145, velocityFactor: VF, maxSwr: 2 });
    expect(r.idealLineOhms).toBeCloseTo(Math.SQRT2 * 50, 12);
    expect(r.inputOhms).toBeCloseTo(50, 10);
    expect(r.swrAtCenter).toBeCloseTo(1, 10);
  });

  it('comprimento físico = VF · λ/4', () => {
    const r = quarterWaveTransformer({ z0: 50, loadOhms: 100, fMHz: 145, velocityFactor: VF, maxSwr: 2 });
    expect(r.physicalLengthM).toBeCloseTo((0.25 * 299.792458 * VF) / 145, 12);
  });

  it('usando cabo de 75 Ω no lugar de 70,7 Ω: Z_in = 56,25 Ω, ROE 1,125', () => {
    const r = quarterWaveTransformer({
      z0: 50,
      loadOhms: 100,
      fMHz: 145,
      velocityFactor: VF,
      maxSwr: 2,
      actualLineOhms: 75,
    });
    expect(r.inputOhms).toBeCloseTo(56.25, 12);
    expect(r.swrAtCenter).toBeCloseTo(1.125, 12);
    expect(r.fractionalBandwidth).toBeNull();
  });

  it('banda de Pozar confere com a simulação da linha (vários casos)', () => {
    for (const [rl, maxSwr] of [
      [100, 1.5],
      [150, 2],
      [12.5, 1.5],
      [300, 2],
    ] as const) {
      const f0 = 145;
      const frac = quarterWaveFractionalBandwidth(50, rl, maxSwr);
      const upper = simulatedUpperEdge(50, rl, f0, maxSwr);
      expect(upper).toBeCloseTo(f0 * (1 + frac / 2), 6);
    }
  });

  it('banda "infinita" quando o descasamento nunca passa do limite', () => {
    // R_L/Z0 = 1,8 < 2: nem no pior caso (λ/2) a ROE chega a 2:1.
    expect(quarterWaveFractionalBandwidth(50, 90, 2)).toBe(Infinity);
    const r = quarterWaveTransformer({ z0: 50, loadOhms: 90, fMHz: 145, velocityFactor: VF, maxSwr: 2 });
    expect(r.bandEdgesMHz).toBeNull();
  });

  it('rejeita entradas inválidas', () => {
    expect(() => quarterWaveTransformer({ z0: 50, loadOhms: 0, fMHz: 145, velocityFactor: VF, maxSwr: 2 })).toThrow(
      RangeError,
    );
    expect(() =>
      quarterWaveTransformer({ z0: 50, loadOhms: 100, fMHz: 145, velocityFactor: 1.2, maxSwr: 2 }),
    ).toThrow(RangeError);
  });
});
