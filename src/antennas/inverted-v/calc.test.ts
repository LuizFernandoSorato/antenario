import { describe, expect, it } from 'vitest';
import { dipoleShorteningFactor } from '../../core/dipole-resonance';
import { cutList } from './cutlist';
import { calc, defaultParams } from './calc';
import { meta } from './meta';

// Referências:
// - Dipolo de meia onda: L = K·λ/2, λ = 299,792458/f (CLAUDE.md), igual ao dipolo da ferramenta.
// - O V precisa ser mais comprido que o dipolo do mesmo fio. Cebik, W4RNL ("80-Meter Dipoles and Inverted-Vs", NEC-4, espaço
//   livre, AWG #12 a 3,75 MHz): 127,7 pés reto, 128,7 pés com 120° e 130,1 pés com 90° entre os braços. A razão vem do modelo
//   por momentos (v-model.ts, conferido com esses números a ±0,3 %).
// - Geometria do V: braços retos a partir do ápice; vão entre as pontas = A·sen(α/2); queda = (A/2)·cos(α/2).
// Tolerância: 1e-9 m nas contas exatas.

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

const AWG12 = 0.0808 * 0.0254;
const C = 299.792458;
const kFor = (d: number, f: number) => dipoleShorteningFactor(d / (C / f));

describe('V invertido: calc', () => {
  it('ápice de 180° = dipolo reto: A = K·λ/2, com o K do diâmetro', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 14.2, apexAngleDeg: 180 });
    expect(Math.abs(measure(r, 'A') - (0.5 * C * kFor(0.002, 14.2)) / 14.2)).toBeLessThan(1e-9);
    expect(r.assumptions.some((a) => /pelo diâmetro/.test(a.value))).toBe(true);
    expect(measure(r, 'E')).toBeCloseTo(0, 9);
  });

  it('alongamento do V conforme o Cebik (120° e 90°, 3,75 MHz, AWG #12)', () => {
    const dipole = (0.5 * C * kFor(AWG12, 3.75)) / 3.75;
    for (const [apex, ft] of [
      [120, 128.7],
      [90, 130.1],
    ] as const) {
      const r = calc({ ...defaultParams, frequencyMHz: 3.75, apexAngleDeg: apex, conductorDiameter: AWG12, apexHeight: 30 });
      expect(Math.abs(measure(r, 'A') / dipole - ft / 127.7)).toBeLessThan(0.003);
    }
  });

  it('comprimento absoluto conforme o Cebik (NEC-4, AWG #12 a 3,75 MHz): 127,7, 128,7 e 130,1 pés a 0,3 %', () => {
    for (const [apex, ft] of [
      [180, 127.7],
      [120, 128.7],
      [90, 130.1],
    ] as const) {
      const r = calc({ ...defaultParams, frequencyMHz: 3.75, apexAngleDeg: apex, conductorDiameter: AWG12, apexHeight: 30 });
      expect(Math.abs(measure(r, 'A') / (ft * 0.3048) - 1)).toBeLessThan(0.003);
    }
  });

  it('geometria: braço, vão entre as pontas, queda e altura das pontas', () => {
    const p = { ...defaultParams, frequencyMHz: 7.1, apexAngleDeg: 100, centerGap: 0.02, apexHeight: 12 };
    const r = calc(p);
    const a = measure(r, 'A');
    const half = (100 * Math.PI) / 360;
    expect(measure(r, 'B')).toBeCloseTo((a - 0.02) / 2, 9);
    expect(measure(r, 'C')).toBeCloseTo(0.02, 12);
    expect(measure(r, 'D')).toBeCloseTo(a * Math.sin(half), 9);
    expect(measure(r, 'E')).toBeCloseTo((a / 2) * Math.cos(half), 9);
    expect(measure(r, 'F')).toBeCloseTo(12 - (a / 2) * Math.cos(half), 9);
  });

  it('valores esperados: R menor que a do dipolo, ganho menor que 2,15 dBi e banda de 2:1 em kHz no 40 m', () => {
    const r = calc(defaultParams);
    expect(r.expected.impedance.typical).toBeGreaterThan(52);
    expect(r.expected.impedance.typical).toBeLessThan(64);
    expect(r.expected.gain.typical).toBeLessThan(2.15);
    expect(r.expected.gain.typical).toBeGreaterThan(1.7);
    expect(r.expected.bandwidth).not.toBeNull();
    expect(r.expected.bandwidth!.unit).toBe('kHz');
    expect(r.expected.bandwidth!.typical).toBeGreaterThan(200);
    expect(r.expected.bandwidth!.typical).toBeLessThan(800);
  });

  it('avisos: tensão nas pontas com a altura delas, solo, choke; abaixo de 90° fora da faixa conferida', () => {
    const r = calc(defaultParams);
    expect(r.warnings.some((w) => w.level === 'danger' && /tensão/.test(w.message) && /do chão/.test(w.message))).toBe(true);
    expect(r.warnings.some((w) => /choke/.test(w.message))).toBe(true);
    expect(r.warnings.some((w) => /solo/.test(w.message))).toBe(true);
    expect(r.warnings.some((w) => /90°/.test(w.message))).toBe(false);
    const narrow = calc({ ...defaultParams, apexAngleDeg: 75, apexHeight: 15 });
    expect(narrow.warnings.some((w) => /90°/.test(w.message))).toBe(true);
  });

  it('avisa quando fora da faixa de uso prático', () => {
    const r = calc({ ...defaultParams, frequencyMHz: meta.typicalRangeMHz.max * 2, apexHeight: 5 });
    expect(r.warnings.some((w) => /fora da faixa/.test(w.message))).toBe(true);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, apexAngleDeg: 50 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, apexAngleDeg: 190 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, centerGap: 30 })).toThrow(RangeError);
    // Pontas abaixo do chão: 40 m com o ápice a 3 m.
    expect(() => calc({ ...defaultParams, apexHeight: 3 })).toThrow(RangeError);
  });
});

describe('V invertido: folha de corte', () => {
  it('dois braços B, ajustáveis', () => {
    const items = cutList(defaultParams);
    const b = items.find((i) => i.label === 'B')!;
    expect(b.quantity).toBe(2);
    expect(b.adjustable).toBe(true);
    expect(b.meters).toBeCloseTo(measure(calc(defaultParams), 'B'), 12);
  });
});
