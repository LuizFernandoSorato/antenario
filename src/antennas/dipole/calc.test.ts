import { describe, expect, it } from 'vitest';
import { dipoleShorteningFactor } from '../../core/dipole-resonance';
import { calc, defaultParams } from './calc';
import { meta } from './meta';

// Referências:
// - A = K · λ/2, com λ = 299,792458/f (CLAUDE.md) e K do diâmetro (core/dipole-resonance.ts, conferido com o NEC-4 do Cebik
//   no teste de lá). Tolerância: 1e-9 m nas contas exatas.
// - Regra clássica do ARRL Antenna Book: L(pés) = 468/f(MHz), ou seja, 468 × 0,3048 = 142,646 m·MHz (K ≈ 0,9516). Ela embute
//   efeitos práticos (isoladores, fio encapado, solo); o K do modelo, de fio nu no espaço livre, dá um dipolo de 0 a 3 % mais
//   comprido com fio de 2 mm do HF ao VHF.

const ARRL_468_M_MHZ = 468 * 0.3048;
const C = 299.792458;

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

const kFor = (d: number, f: number) => dipoleShorteningFactor(d / (C / f));

describe('dipolo de meia onda: calc', () => {
  it('A = K·λ/2 com o K do diâmetro (145 MHz, 2 mm: K ≈ 0,958)', () => {
    const r = calc(defaultParams);
    const k = kFor(0.002, 145);
    expect(k).toBeGreaterThan(0.95);
    expect(k).toBeLessThan(0.965);
    expect(measure(r, 'A')).toBeCloseTo((k * C) / 145 / 2, 9);
    // Espaço central padrão de 10 mm, dentro do comprimento total.
    expect(defaultParams.centerGap).toBe(0.01);
    expect(measure(r, 'B')).toBeCloseTo(((k * C) / 145 / 2 - 0.01) / 2, 9);
    expect(measure(r, 'C')).toBeCloseTo(0.01, 12);
    expect(r.assumptions.some((a) => /pelo diâmetro/.test(a.value) && /Cebik/.test(a.source ?? ''))).toBe(true);
  });

  it('145 MHz com isolador de 10 mm: cada braço = (L − 10 mm)/2', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 145, centerGap: 0.01 });
    const total = (kFor(0.002, 145) * C) / 145 / 2;
    expect(measure(r, 'A')).toBeCloseTo(total, 9);
    expect(measure(r, 'B')).toBeCloseTo((total - 0.01) / 2, 9);
    expect(measure(r, 'C')).toBeCloseTo(0.01, 12);
  });

  it('fio de 2 mm: de 0 a 3 % mais comprido que a regra 468/f do ARRL', () => {
    for (const f of [3.6, 7.1, 14.2, 28.5, 50.1, 145]) {
      const ours = measure(calc({ ...defaultParams, frequencyMHz: f }), 'A');
      const arrl = ARRL_468_M_MHZ / f;
      expect(ours / arrl - 1).toBeGreaterThan(0);
      expect(ours / arrl - 1).toBeLessThan(0.03);
    }
  });

  it('condutor mais grosso, dipolo mais curto', () => {
    const thin = measure(calc({ ...defaultParams, frequencyMHz: 14.2, conductorDiameter: 0.001 }), 'A');
    const thick = measure(calc({ ...defaultParams, frequencyMHz: 14.2, conductorDiameter: 0.05 }), 'A');
    expect(thick).toBeLessThan(thin);
  });

  it('condutor mais grosso que o limite do modelo: K do limite (medida comprida) e aviso', () => {
    // 435 MHz com tubo de 12 mm: d/λ ≈ 0,0174 > 0,015.
    const r = calc({ ...defaultParams, frequencyMHz: 435, conductorDiameter: 0.012 });
    expect(measure(r, 'A')).toBeCloseTo((dipoleShorteningFactor(0.015) * C) / 435 / 2, 9);
    expect(r.warnings.some((w) => w.level === 'warning' && /limite do modelo/.test(w.message))).toBe(true);
  });

  it('declara premissas e valores esperados com fonte', () => {
    const r = calc(defaultParams);
    expect(r.assumptions.length).toBeGreaterThan(0);
    expect(r.expected.impedance.typical).toBe(73);
    expect(r.expected.gain.typical).toBe(2.15);
    expect(r.expected.impedance.source).not.toBe('');
  });

  it('banda de ROE < 2:1 no 80 m com fio AWG #12: 150 a 200 kHz, como o Cebik', () => {
    // Cebik, "80-Meter Dipoles and Inverted-Vs": "the maximum bandwidth at the antenna will be only about 150-200 kHz".
    const b = calc({ ...defaultParams, frequencyMHz: 3.75, conductorDiameter: 0.002053 }).expected.bandwidth!;
    expect(b.unit).toBe('kHz');
    expect(b.typical).toBeGreaterThan(150);
    expect(b.typical).toBeLessThan(200);
    expect(b.note).toMatch(/1,5:1/);
    expect(b.source).toMatch(/Cebik/);
  });

  it('banda relativa cresce com o diâmetro do condutor', () => {
    const rel = (d: number) => {
      const b = calc({ ...defaultParams, frequencyMHz: 145, conductorDiameter: d }).expected.bandwidth!;
      return b.typical! / (b.unit === 'kHz' ? 1000 : 1) / 145;
    };
    expect(rel(0.002)).toBeGreaterThan(0.06);
    expect(rel(0.01)).toBeGreaterThan(rel(0.002) * 1.2);
  });

  it('avisa sobre tensão alta nas pontas (TX) e sobre o K de condutor nu', () => {
    const r = calc(defaultParams);
    expect(r.warnings.some((w) => w.level === 'danger' && /tensão/i.test(w.message))).toBe(true);
    expect(r.warnings.some((w) => /condutor nu/.test(w.message))).toBe(true);
  });

  it('avisa quando fora da faixa de uso prático', () => {
    const r = calc({ ...defaultParams, frequencyMHz: meta.typicalRangeMHz.max * 2 });
    expect(r.warnings.some((w) => /fora da faixa/.test(w.message))).toBe(true);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0 })).toThrow(RangeError);
    // Espaço central maior que a própria antena.
    expect(() => calc({ ...defaultParams, frequencyMHz: 145, centerGap: 2 })).toThrow(RangeError);
  });
});
