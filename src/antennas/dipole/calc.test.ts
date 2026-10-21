import { describe, expect, it } from 'vitest';
import { dipoleShorteningFactor } from '../../core/dipole-resonance';
import { K_MANUAL, calc, defaultParams as autoDefaults } from './calc';
import { meta } from './meta';

// Referências:
// - λ/2 × K, com λ = 299,792458/f (CLAUDE.md). K = 0,95 → 142,4014/f(MHz) m.
// - Regra clássica do ARRL Antenna Book: L(pés) = 468/f(MHz), ou seja,
//   468 × 0,3048 = 142,646 m·MHz (equivale a K ≈ 0,9516). Nosso K = 0,95 deve
//   ficar a menos de 0,2 % dessa regra.
// Tolerância: 1e-9 m nas contas exatas.
//
// Os testes das contas usam K digitado; os do K automático ficam no fim (o modelo é conferido em core/dipole-resonance.test.ts).

const defaultParams = { ...autoDefaults, kMode: K_MANUAL };

const ARRL_468_M_MHZ = 468 * 0.3048;
/** 0,5 × 299,792458 × 0,95 = 142,40141755 m·MHz (valor exato do método). */
const HALF_WAVE_K095 = 0.5 * 299.792458 * 0.95;

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

describe('dipolo de meia onda: calc', () => {
  it('14,2 MHz, K = 0,95, sem espaço central', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 14.2, centerGap: 0 });
    expect(measure(r, 'A')).toBeCloseTo(HALF_WAVE_K095 / 14.2, 9); // ≈ 10,028 m
    expect(measure(r, 'B')).toBeCloseTo(HALF_WAVE_K095 / 14.2 / 2, 9);
  });

  it('145 MHz com isolador de 10 mm: cada braço = (L − 10 mm)/2', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 145, centerGap: 0.01 });
    const total = HALF_WAVE_K095 / 145; // ≈ 0,98208 m
    expect(measure(r, 'A')).toBeCloseTo(total, 9);
    expect(measure(r, 'B')).toBeCloseTo((total - 0.01) / 2, 9);
    expect(measure(r, 'C')).toBeCloseTo(0.01, 12);
  });

  it('concorda com a regra 468/f do ARRL a menos de 0,2 %', () => {
    for (const f of [3.6, 7.1, 14.2, 28.5, 50.1, 145]) {
      const ours = measure(calc({ ...defaultParams, frequencyMHz: f }), 'A');
      const arrl = ARRL_468_M_MHZ / f;
      expect(Math.abs(ours - arrl) / arrl).toBeLessThan(0.002);
    }
  });

  it('K ajustável', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 100, shorteningFactor: 0.97 });
    expect(measure(r, 'A')).toBeCloseTo(0.5 * 2.99792458 * 0.97, 9);
  });

  it('declara premissas e valores esperados com fonte', () => {
    const r = calc(defaultParams);
    expect(r.assumptions.length).toBeGreaterThan(0);
    expect(r.expected.impedance.typical).toBe(73);
    expect(r.expected.gain.typical).toBe(2.15);
    expect(r.expected.impedance.source).not.toBe('');
    expect(r.expected.bandwidth).toBeNull();
  });

  it('avisa sobre tensão alta nas pontas (TX)', () => {
    const r = calc(defaultParams);
    expect(r.warnings.some((w) => w.level === 'danger' && /tensão/i.test(w.message))).toBe(true);
  });

  it('avisa quando fora da faixa de uso prático', () => {
    const r = calc({ ...defaultParams, frequencyMHz: meta.typicalRangeMHz.max * 2 });
    expect(r.warnings.some((w) => /fora da faixa/.test(w.message))).toBe(true);
  });

  it('K pelo diâmetro (padrão): usa o K do modelo e diz isso nas premissas', () => {
    expect(autoDefaults.kMode).not.toBe(K_MANUAL);
    // 145 MHz, 2 mm: d/λ ≈ 9,7e-4, K ≈ 0,958.
    const r = calc(autoDefaults);
    const k = dipoleShorteningFactor(0.002 / (299.792458 / 145));
    expect(measure(r, 'A')).toBeCloseTo((k * 299.792458) / 145 / 2, 9);
    expect(k).toBeGreaterThan(0.95);
    expect(k).toBeLessThan(0.965);
    expect(r.assumptions.some((a) => /pelo diâmetro/.test(a.value) && /Cebik/.test(a.source ?? ''))).toBe(true);
    // O K digitado é ignorado.
    expect(measure(calc({ ...autoDefaults, shorteningFactor: 0.9 }), 'A')).toBeCloseTo(measure(r, 'A'), 12);
  });

  it('K pelo diâmetro: condutor mais grosso, dipolo mais curto', () => {
    const thin = measure(calc({ ...autoDefaults, frequencyMHz: 14.2, conductorDiameter: 0.001 }), 'A');
    const thick = measure(calc({ ...autoDefaults, frequencyMHz: 14.2, conductorDiameter: 0.05 }), 'A');
    expect(thick).toBeLessThan(thin);
  });

  it('K pelo diâmetro fora da faixa do modelo: usa o K digitado e avisa', () => {
    // 435 MHz com tubo de 10 mm: d/λ ≈ 0,0145.
    const r = calc({ ...autoDefaults, frequencyMHz: 435, conductorDiameter: 0.01, shorteningFactor: 0.93 });
    expect(measure(r, 'A')).toBeCloseTo((0.93 * 299.792458) / 435 / 2, 9);
    expect(r.warnings.some((w) => w.level === 'warning' && /fora da faixa do modelo/.test(w.message))).toBe(true);
  });

  it('K digitado: o aviso mostra o K que o modelo daria', () => {
    const r = calc(defaultParams);
    expect(r.warnings.some((w) => /manualmente/.test(w.message) && /0,95/.test(w.message))).toBe(true);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, kMode: 3 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, shorteningFactor: 1.2 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0 })).toThrow(RangeError);
    // Espaço central maior que a própria antena.
    expect(() => calc({ ...defaultParams, frequencyMHz: 145, centerGap: 2 })).toThrow(RangeError);
  });
});
