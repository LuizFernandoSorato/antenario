import { describe, expect, it } from 'vitest';
import { calc, defaultParams, diameterSensitivity } from './calc';
import { cutList } from './cutlist';

// Referência: saída da calculadora de Coppens a 137,5 MHz, reproduzida em
// https://www.qsl.net/ik1hgi/qfh-2_hgi.htm (condutor de 4,1 mm).

function mm(r: ReturnType<typeof calc>, label: string): number {
  const x = r.measurements.find((y) => y.label === label);
  if (!x) throw new Error(`Cota ${label} não encontrada`);
  return x.meters * 1000;
}

describe('QFH: calc', () => {
  it('a 137,5 MHz reproduz a referência', () => {
    const r = calc(defaultParams);
    expect(mm(r, 'A')).toBeCloseTo(2391.2, 6);
    expect(mm(r, 'B')).toBeCloseTo(728.8, 6);
    expect(mm(r, 'C')).toBeCloseTo(316.6, 6);
    expect(mm(r, 'E')).toBeCloseTo(2272.3, 6);
    expect(mm(r, 'F')).toBeCloseTo(693, 6);
    expect(mm(r, 'G')).toBeCloseTo(300.8, 6);
  });

  it('escala inversamente com a frequência', () => {
    const a = calc(defaultParams);
    const b = calc({ ...defaultParams, frequencyMHz: 275 });
    expect(mm(b, 'A')).toBeCloseTo(mm(a, 'A') / 2, 9);
    expect(mm(b, 'B')).toBeCloseTo(mm(a, 'B') / 2, 9);
  });

  it('a espira maior é mais longa que a menor', () => {
    const r = calc(defaultParams);
    expect(mm(r, 'A')).toBeGreaterThan(mm(r, 'E'));
  });

  it('o diâmetro do condutor (4,1 → 7 mm) muda as medidas em menos de 2 %', () => {
    for (const v of Object.values(diameterSensitivity())) expect(Math.abs(v)).toBeLessThan(0.02);
  });

  it('entrada inválida', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
  });

  it('avisa que as medidas são escaladas', () => {
    expect(calc(defaultParams).warnings.some((w) => w.message.includes('ESCALADAS'))).toBe(true);
  });
});

describe('QFH: lista de corte', () => {
  it('duas espiras ajustáveis', () => {
    expect(cutList(defaultParams).map((i) => i.label)).toEqual(['A', 'E']);
  });
});

describe('QFH: diâmetro do condutor', () => {
  it('não muda as medidas (só o padrão usa), avisa quando difere de 4,1 mm e recusa não positivo', () => {
    const a = calc(defaultParams);
    const b = calc({ ...defaultParams, wireDiameter: 0.007 });
    expect(b.measurements.map((x) => x.meters)).toEqual(a.measurements.map((x) => x.meters));
    expect(b.warnings.some((w) => w.message.includes('Condutor de 7,0 mm'))).toBe(true);
    expect(a.warnings.some((w) => w.message.includes('Condutor de'))).toBe(false);
    expect(() => calc({ ...defaultParams, wireDiameter: 0 })).toThrow(RangeError);
  });
});
