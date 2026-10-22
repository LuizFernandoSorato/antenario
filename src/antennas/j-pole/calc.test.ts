import { describe, expect, it } from 'vitest';
import { dipoleShorteningFactor } from '../../core/dipole-resonance';
import { parallelWireImpedance } from '../../lines/parallel-wire';
import { calc, defaultParams } from './calc';

// Referências:
// - Radiador de λ/2 alimentado na ponta + seção de casamento de λ/4 em curto
//   (ARRL Antenna Book, J-pole / Zepp alimentada por stub).
// - Comprimentos: fração × λ × fator, com λ = 299,792458/f (CLAUDE.md); o radiador usa o K do diâmetro
//   (core/dipole-resonance.ts) e a seção de casamento, o fator digitado.
// - O ponto de alimentação NÃO é calculado (TODO(fonte)); o teste garante que a
//   ferramenta avisa isso em vez de inventar um número.

const C = 299.792458;

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

describe('J-pole: calc', () => {
  it('145 MHz, tubo de 12,7 mm: radiador com o K do diâmetro (≈ 0,937), seção com 0,95', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 145 });
    const k = dipoleShorteningFactor(0.0127 / (C / 145));
    expect(k).toBeGreaterThan(0.93);
    expect(k).toBeLessThan(0.945);
    const radiator = (0.5 * C * k) / 145; // ≈ 968 mm
    const stub = (0.25 * C * 0.95) / 145; // ≈ 491 mm
    expect(measure(r, 'A')).toBeCloseTo(radiator + stub, 9);
    expect(measure(r, 'B')).toBeCloseTo(radiator, 9);
    expect(measure(r, 'C')).toBeCloseTo(stub, 9);
  });

  it('elemento longo ≈ 3/4 λ quando o fator da seção é igual ao K', () => {
    const k = dipoleShorteningFactor(0.004 / (C / 435));
    const r = calc({ ...defaultParams, frequencyMHz: 435, conductorDiameter: 0.004, spacing: 0.02, stubFactor: k });
    expect(measure(r, 'A')).toBeCloseTo((0.75 * C * k) / 435, 9);
  });

  it('tubo grosso demais para o modelo (435 MHz, 12,7 mm): K do limite e aviso', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 435 });
    expect(measure(r, 'B')).toBeCloseTo((0.5 * C * dipoleShorteningFactor(0.015)) / 435, 9);
    expect(r.warnings.some((w) => /^O tubo tem/.test(w.message))).toBe(true);
  });

  it('fator da seção de casamento independente do radiador', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 100, stubFactor: 1 });
    expect(measure(r, 'C')).toBeCloseTo(0.25 * 2.99792458, 9);
  });

  it('espaçamento vira cota D e premissa de Z0 da seção', () => {
    const r = calc({ ...defaultParams, spacing: 0.025, conductorDiameter: 0.0125 });
    expect(measure(r, 'D')).toBe(0.025);
    const z0 = parallelWireImpedance(0.025, 0.0125);
    expect(r.assumptions.some((a) => a.value.startsWith(Math.round(z0).toString()))).toBe(true);
  });

  it('não inventa o ponto de alimentação: avisa que não foi calculado', () => {
    const r = calc(defaultParams);
    expect(r.measurements.some((m) => /alimentação/i.test(m.name))).toBe(false);
    expect(r.warnings.some((w) => /não calculado/i.test(w.message) && /alimentação/.test(w.message))).toBe(true);
  });

  it('avisa sobre corrente de modo comum (choke obrigatório)', () => {
    const r = calc(defaultParams);
    expect(r.warnings.some((w) => /choke/i.test(w.message))).toBe(true);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, stubFactor: 1.5 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, spacing: 0.001, conductorDiameter: 0.002 })).toThrow(RangeError);
  });

  it('banda: sem valor calculado, só a referência medida de Fong (8 MHz em 146 MHz) como ordem de grandeza', () => {
    const b = calc(defaultParams).expected.bandwidth!;
    expect(b.typical).toBeUndefined();
    expect(b.note).toMatch(/8 MHz/);
    expect(b.source).toMatch(/Fong/);
  });
});
