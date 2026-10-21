import { describe, expect, it } from 'vitest';
import { bandWidthMHz, moxonDimensionsLambda, moxonModel } from './moxon-model';

// Referência: L. B. Cebik, W4RNL, "Designing Moxon Rectangles by Equation and by Model" (AntenneX, set. 2000), espelho em
// https://antenna2.github.io/cebik/content/moxon/moxgen.html.
// - Tabela 2: dimensões (λ) dos modelos NEC que geraram a regressão, arredondadas a 0,001 λ. As equações devem reproduzi-las a
//   ±0,0015 λ (a regressão de 2ª ordem não passa exatamente pelos pontos).
// - Exemplos calculados pelas equações e simulados no NEC com condutor perfeito:
//     7,15 MHz, fio #12 (0,0808"):   6,01 dBi, F/C 39,07 dB, 53,9 + j4,6 Ω
//     28,5 MHz, tubo de 1":          5,97 dBi, F/C 36,89 dB, 52,9 − j2,5 Ω
//     146 MHz, vareta de 0,125":     6,01 dBi, F/C 43,50 dB, 51,8 − j3,4 Ω
//   Tolerâncias do nosso MoM (sem perdas): ganho ±0,1 dB, R ±5 %, X ±3 Ω. A F/C de pico é muito estreita (o Cebik: "35 a 45 dB
//   podem estar a poucos kHz um do outro"), então só exigimos > 30 dB.

const TABLE2: readonly [number, number, number, number, number, number][] = [
  // log10(d/λ), A, B, C, D, E
  [-5, 0.366, 0.057, 0.007, 0.067, 0.131],
  [-4.5, 0.366, 0.056, 0.009, 0.067, 0.132],
  [-4, 0.364, 0.055, 0.01, 0.068, 0.133],
  [-3.5, 0.364, 0.053, 0.012, 0.068, 0.133],
  [-3, 0.36, 0.051, 0.013, 0.069, 0.133],
  [-2.5, 0.358, 0.046, 0.018, 0.069, 0.133],
  [-2, 0.356, 0.04, 0.024, 0.07, 0.134],
];

const INCH = 0.0254;
const EXAMPLES = [
  { f: 7.15, d: 0.0808 * INCH, gain: 6.01, r: 53.9, x: 4.6 },
  { f: 28.5, d: 1 * INCH, gain: 5.97, r: 52.9, x: -2.5 },
  { f: 146, d: 0.125 * INCH, gain: 6.01, r: 51.8, x: -3.4 },
] as const;

function modelFor(f: number, d: number, segmentsPerLambda?: number) {
  const lambda = 299.792458 / f;
  const l = moxonDimensionsLambda(d / lambda);
  const dims = { a: l.a * lambda, b: l.b * lambda, c: l.c * lambda, d: l.d * lambda, e: l.e * lambda };
  return moxonModel({ frequencyMHz: f, dims, radiusM: d / 2, referenceOhms: 50, segmentsPerLambda });
}

describe('Moxon: equações do Cebik', () => {
  for (const [x, a, b, c, d, e] of TABLE2) {
    it(`reproduzem a tabela 2 para diâmetro 10^${x} λ`, () => {
      const m = moxonDimensionsLambda(10 ** x);
      expect(Math.abs(m.a - a)).toBeLessThan(0.0015);
      expect(Math.abs(m.b - b)).toBeLessThan(0.0015);
      expect(Math.abs(m.c - c)).toBeLessThan(0.0015);
      expect(Math.abs(m.d - d)).toBeLessThan(0.0015);
      expect(Math.abs(m.e - e)).toBeLessThan(0.0015);
      expect(m.e).toBeCloseTo(m.b + m.c + m.d, 12);
    });
  }

  it('fio mais grosso: folga C maior, largura A e cauda B menores (tendência descrita pelo Cebik)', () => {
    const thin = moxonDimensionsLambda(1e-5);
    const thick = moxonDimensionsLambda(1e-2);
    expect(thick.c).toBeGreaterThan(thin.c);
    expect(thick.a).toBeLessThan(thin.a);
    expect(thick.b).toBeLessThan(thin.b);
  });
});

// O MoM com 200–300 trechos/λ leva ~1 s por varredura; com a suíte toda em paralelo, o limite padrão de 5 s não basta.
describe('Moxon: modelo por momentos', { timeout: 60_000 }, () => {
  for (const ex of EXAMPLES) {
    it(`${ex.f} MHz confere com o NEC do Cebik`, () => {
      const m = modelFor(ex.f, ex.d);
      expect(Math.abs(m.gainDbi - ex.gain)).toBeLessThan(0.1);
      expect(Math.abs(m.z.re - ex.r) / ex.r).toBeLessThan(0.05);
      expect(Math.abs(m.z.im - ex.x)).toBeLessThan(3);
      expect(m.frontToBackDb).toBeGreaterThan(30);
    });
  }

  it('convergência: 200 e 300 trechos por λ dão R a 3 % e ganho a 0,05 dB', () => {
    const a = modelFor(146, 0.004);
    const b = modelFor(146, 0.004, 300);
    expect(Math.abs(a.z.re - b.z.re) / b.z.re).toBeLessThan(0.03);
    expect(Math.abs(a.gainDbi - b.gainDbi)).toBeLessThan(0.05);
  });

  it('banda de ROE em 50 Ω cobre a frequência de projeto, com a de 1,5:1 dentro da de 2:1', () => {
    const m = modelFor(146, 0.004);
    expect(m.band2!.lowMHz).toBeLessThan(146);
    expect(m.band2!.highMHz).toBeGreaterThan(146);
    expect(m.band15!.lowMHz).toBeGreaterThan(m.band2!.lowMHz);
    expect(m.band15!.highMHz).toBeLessThan(m.band2!.highMHz);
    expect(bandWidthMHz(m.band2!)).toBeGreaterThan(4);
  });
});
