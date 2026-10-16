import { describe, expect, it } from 'vitest';
import { complex } from '../../core/complex';
import { reflectionMagnitude } from '../../core/reflection';
import { wavelength } from '../../core/wave';
import {
  calc,
  defaultParams,
  loopInductance,
  radiationResistance,
  skinLossResistance,
  swr2Bandwidth,
} from './calc';
import { cutList } from './cutlist';

// Referências: modelo AA5TB, S. Sussman-Fort (AB2EW), "My Loop Antenna", 2013, slide 18
// (f em MHz, A em pés², S em pés, d em polegadas):
//   RR = 3,38e-8·(f²·A)²; RL = 9,96e-4·√f·(S/d); L = 1,9e-8·S·[7,353·log10(96·S/(π·d)) − 6,386] H;
//   CD = 0,82·S pF; Q = XL/(2·(RR+RL)).
// Nosso cálculo usa as formas físicas em SI; os testes comparam com as fórmulas do AA5TB.

const FT = 0.3048;
const IN = 0.0254;

function aa5tb(fMHz: number, diameterM: number, tubeM: number) {
  const s = (Math.PI * diameterM) / FT; // pés
  const area = (Math.PI * (diameterM / 2) ** 2) / (FT * FT); // pés²
  const d = tubeM / IN; // polegadas
  return {
    rr: 3.38e-8 * (fMHz * fMHz * area) ** 2,
    rl: 9.96e-4 * Math.sqrt(fMHz) * (s / d),
    l: 1.9e-8 * s * (7.353 * Math.log10((96 * s) / (Math.PI * d)) - 6.386),
  };
}

function rel(a: number, b: number): number {
  return Math.abs(a - b) / b;
}

describe('loop magnética: fórmulas físicas contra o AA5TB', () => {
  for (const [f, d, t] of [
    [7.1, 1.0, 0.022],
    [14.2, 0.8, 0.0127],
    [3.6, 1.5, 0.0254],
  ] as const) {
    it(`f = ${f} MHz, D = ${d} m, tubo = ${t * 1000} mm`, () => {
      const ref = aa5tb(f, d, t);
      const lambda = wavelength(f);
      const area = Math.PI * (d / 2) ** 2;
      expect(rel(radiationResistance(area, lambda), ref.rr)).toBeLessThan(0.02);
      expect(rel(skinLossResistance(f, Math.PI * d, t), ref.rl)).toBeLessThan(0.005);
      expect(rel(loopInductance(d / 2, t / 2), ref.l)).toBeLessThan(0.03);
    });
  }

  it('Rr cresce com a quarta potência do diâmetro e com a quarta da frequência', () => {
    const a = radiationResistance(Math.PI * 0.25 ** 2, wavelength(7));
    expect(radiationResistance(Math.PI * 0.5 ** 2, wavelength(7)) / a).toBeCloseTo(16, 9);
    expect(radiationResistance(Math.PI * 0.25 ** 2, wavelength(14)) / a).toBeCloseTo(16, 9);
  });
});

describe('loop magnética: banda de ROE < 2:1', () => {
  it('em f0 ± BW/2 o Γ de um RLC série casado vale 1/3 (ROE 2:1) com erro < 1 %', () => {
    const r = calc(defaultParams);
    const f0 = 7.1e6;
    const get = (name: string) => r.assumptions.find((a) => a.name === name)!.value;
    expect(get('Banda de ROE < 2:1 (espira casada)')).toBeTruthy();
    const lambda = wavelength(7.1);
    const area = Math.PI * 0.5 ** 2;
    const rt = radiationResistance(area, lambda) + skinLossResistance(7.1, Math.PI, 0.022);
    const l = loopInductance(0.5, 0.011);
    const xl = 2 * Math.PI * f0 * l;
    const bw = swr2Bandwidth(f0, xl, rt);
    const c = 1 / ((2 * Math.PI * f0) ** 2 * l);
    for (const sign of [-1, 1]) {
      const f = f0 + (sign * bw) / 2;
      const w = 2 * Math.PI * f;
      const z = complex(rt, w * l - 1 / (w * c));
      expect(Math.abs(reflectionMagnitude(z, rt) - 1 / 3)).toBeLessThan(0.01 / 3);
    }
  });
});

describe('loop magnética: calc', () => {
  const val = (r: ReturnType<typeof calc>, name: string) => r.assumptions.find((a) => a.name === name)!.value;

  it('eficiência = Rr/(Rr+RL) e contatos reduzem a eficiência', () => {
    const ideal = calc(defaultParams);
    const lossy = calc({ ...defaultParams, contactResistance: 0.01 });
    expect(lossy.expected.gain.typical!).toBeLessThan(ideal.expected.gain.typical!);
    expect(ideal.expected.gain.typical!).toBeLessThan(1.76);
  });

  it('tensão do capacitor = I·XL com I = √(P/Rtotal); sobe com √P', () => {
    const lambda = wavelength(7.1);
    const area = Math.PI * 0.25;
    const rt = radiationResistance(area, lambda) + skinLossResistance(7.1, Math.PI, 0.022);
    const xl = 2 * Math.PI * 7.1e6 * loopInductance(0.5, 0.011);
    const expected = Math.sqrt(10 / rt) * xl;
    const text = val(calc(defaultParams), 'Tensão no capacitor');
    // Em formato de engenharia ("x,xx kV"): extrai o número e compara com 3 algarismos.
    const kv = Number(text.replace(',', '.').match(/[\d.]+/)![0]) * (text.includes('kV') ? 1000 : 1);
    expect(Math.abs(kv - expected) / expected).toBeLessThan(0.01);
    const v100 = val(calc({ ...defaultParams, powerW: 40 }), 'Tensão no capacitor');
    const kv2 = Number(v100.replace(',', '.').match(/[\d.]+/)![0]) * (v100.includes('kV') ? 1000 : 1);
    expect(kv2 / kv).toBeCloseTo(2, 1);
  });

  it('avisa quando o perímetro passa de 0,1λ', () => {
    expect(calc({ ...defaultParams, frequencyMHz: 21, loopDiameter: 2 }).warnings.some((w) => w.message.includes('0,1λ'))).toBe(true);
    expect(calc(defaultParams).warnings.some((w) => w.message.includes('acima de ≈ 0,1λ'))).toBe(false);
  });

  it('sempre traz o aviso de alta tensão (danger) e das cotas', () => {
    const r = calc(defaultParams);
    expect(r.warnings.some((w) => w.level === 'danger')).toBe(true);
    expect(r.measurements.map((m) => m.label)).toEqual(['A', 'B', 'C']);
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, loopDiameter: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, tubeDiameter: 2 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, contactResistance: -1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
  });
});

describe('loop magnética: lista de corte', () => {
  it('um tubo com o perímetro da espira', () => {
    const [item] = cutList(defaultParams);
    expect(item!.meters).toBeCloseTo(Math.PI, 12);
  });
});
