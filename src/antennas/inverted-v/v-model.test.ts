import { describe, expect, it } from 'vitest';
import { bandWidthMHz, invertedVModel } from './v-model';

// Referência: L. B. Cebik, W4RNL, "80-Meter Dipoles and Inverted-Vs: A Graphical Scrapbook" (NEC-4, EZNEC Pro/4), espelho em
// https://antenna2.github.io/cebik/content/wire/80dp.pdf. Espaço livre, 3,75 MHz, fio de cobre AWG #12 (0,0808" = 2,052 mm):
//   dipolo reto:       127,7 pés, 73,6 − j0,4 Ω
//   V de 30° (120°):   128,7 pés, 59,6 + j0,1 Ω, 1,79 dBi
//   V de 45° (90°):    130,1 pés, 43,6 + j0,0 Ω, 1,49 dBi
// O Cebik inclui a perda do cobre e o modelo daqui não. Então:
// - a resistência dele é a nossa (irradiação) MAIS a de perda: para o dipolo, R'·L/2 com R' = Rs/(π·d) ≈ 0,078 Ω/m
//   (Rs = √(π·f·μ0/σ), cobre σ = 5,8e7 S/m) dá ≈ 1,5 Ω; aceitamos de 1 a 3 Ω de diferença;
// - o ganho dele é a nossa diretividade × eficiência, com eficiência = R_nossa / R_dele (±0,05 dB).
// Comprimento relativo ao dipolo: ±0,3 %.

const F = 3.75;
const RADIUS_AWG12 = (0.0808 * 0.0254) / 2;
const FT = 0.3048;
const LAMBDA = 299.792458 / F;

const base = { frequencyMHz: F, radiusM: RADIUS_AWG12, referenceOhms: 50 };

const CEBIK = [
  { apex: 180, lengthFt: 127.7, r: 73.6, gainDbi: null },
  { apex: 120, lengthFt: 128.7, r: 59.6, gainDbi: 1.79 },
  { apex: 90, lengthFt: 130.1, r: 43.6, gainDbi: 1.49 },
] as const;

describe('V invertido: modelo por momentos', () => {
  it('dipolo reto (180°): comprimento a 0,5 % do Cebik', () => {
    const m = invertedVModel({ ...base, apexAngleDeg: 180 });
    expect(Math.abs(m.resonantLengthLambda * LAMBDA - 127.7 * FT) / (127.7 * FT)).toBeLessThan(0.005);
    expect(m.dipoleLengthLambda).toBe(m.resonantLengthLambda);
  });

  for (const c of CEBIK) {
    it(`ápice de ${c.apex}°: comprimento relativo ao dipolo, resistência e ganho conferem com o Cebik`, () => {
      const m = invertedVModel({ ...base, apexAngleDeg: c.apex });
      const ratio = m.resonantLengthLambda / m.dipoleLengthLambda;
      expect(Math.abs(ratio - c.lengthFt / 127.7)).toBeLessThan(0.003);
      expect(Math.abs(m.z.im)).toBeLessThan(0.01);
      const lossOhms = c.r - m.z.re;
      expect(lossOhms).toBeGreaterThan(1);
      expect(lossOhms).toBeLessThan(3);
      if (c.gainDbi !== null) {
        const withLoss = m.directivityDbi + 10 * Math.log10(m.z.re / c.r);
        expect(Math.abs(withLoss - c.gainDbi)).toBeLessThan(0.05);
      }
    });
  }

  it('quanto mais fechado o V, mais comprido e menor a resistência', () => {
    const a = invertedVModel({ ...base, apexAngleDeg: 150 });
    const b = invertedVModel({ ...base, apexAngleDeg: 100 });
    expect(b.resonantLengthLambda).toBeGreaterThan(a.resonantLengthLambda);
    expect(b.z.re).toBeLessThan(a.z.re);
    expect(b.directivityDbi).toBeLessThan(a.directivityDbi);
  });

  it('convergência: 30 e 60 trechos dão a mesma razão de comprimentos (< 0,1 %) e a mesma R (< 1 %)', () => {
    const a = invertedVModel({ ...base, apexAngleDeg: 100 });
    const b = invertedVModel({ ...base, apexAngleDeg: 100, segments: 60 });
    const ra = a.resonantLengthLambda / a.dipoleLengthLambda;
    const rb = b.resonantLengthLambda / b.dipoleLengthLambda;
    expect(Math.abs(ra - rb) / rb).toBeLessThan(0.001);
    expect(Math.abs(a.z.re - b.z.re) / b.z.re).toBeLessThan(0.01);
  });

  it('banda de ROE em 50 Ω: a de 1,5:1 cabe dentro da de 2:1', () => {
    const m = invertedVModel({ ...base, frequencyMHz: 7.1, apexAngleDeg: 110 });
    expect(m.band2).not.toBeNull();
    expect(m.band15).not.toBeNull();
    expect(m.band2!.lowMHz).toBeLessThan(m.band15!.lowMHz);
    expect(m.band2!.highMHz).toBeGreaterThan(m.band15!.highMHz);
    expect(bandWidthMHz(m.band2!)).toBeGreaterThan(0);
    expect(m.sweep.length).toBe(601);
  });

  it('o máximo do padrão é perpendicular ao plano dos braços', () => {
    const m = invertedVModel({ ...base, apexAngleDeg: 90 });
    expect(m.power([0, 1, 0])).toBeGreaterThan(m.power([1, 0, 0]));
    expect(m.power([0, 1, 0])).toBeGreaterThan(m.power([0, 0, 1]));
  });
});
