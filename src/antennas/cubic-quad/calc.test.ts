import { describe, expect, it } from 'vitest';
import { wavelength } from '../../core/wave';
import { calc, defaultParams, estimatedGainDbd, loopPerimeter } from './calc';
import { cutList } from './cutlist';

// Referências: fórmulas N6VNG (f em MHz, comprimento em pés): refletor 1030/f, excitado 1005/f,
// diretor 975/f (https://www.qsl.net/ta1dx/amator/cubical_quad_antenna_design.htm).
// Valores calculados à mão a 145 MHz, com 1 ft = 0,3048 m:
//   excitado 1005 × 0,3048 / 145 = 2,11258 m; refletor 1030 × 0,3048 / 145 = 2,16513 m;
//   diretor  975 × 0,3048 / 145 = 2,04952 m.

function m(r: ReturnType<typeof calc>, label: string): number {
  const x = r.measurements.find((y) => y.label === label);
  if (!x) throw new Error(`Cota ${label} não encontrada`);
  return x.meters;
}

describe('quadra cúbica: calc', () => {
  it('perímetros a 145 MHz', () => {
    expect(loopPerimeter(1005, 145)).toBeCloseTo(2.11258, 4);
    expect(loopPerimeter(1030, 145)).toBeCloseTo(2.16513, 4);
    expect(loopPerimeter(975, 145)).toBeCloseTo(2.04952, 4);
  });

  it('lados = perímetro ÷ 4 e fio = perímetro', () => {
    const r = calc(defaultParams);
    expect(m(r, 'B')).toBeCloseTo(2.11258 / 4, 4);
    expect(m(r, 'H')).toBeCloseTo(2.11258, 4);
    expect(m(r, 'A')).toBeCloseTo(2.16513 / 4, 4);
    expect(m(r, 'C')).toBeCloseTo(2.04952 / 4, 4);
  });

  it('o perímetro do excitado é um pouco maior que uma onda (≈ 1,022λ)', () => {
    const lambda = wavelength(145);
    const ratio = m(calc(defaultParams), 'H') / lambda;
    expect(ratio).toBeGreaterThan(1.02);
    expect(ratio).toBeLessThan(1.025);
  });

  it('refletor > excitado > diretor', () => {
    const r = calc(defaultParams);
    expect(m(r, 'G')).toBeGreaterThan(m(r, 'H'));
    expect(m(r, 'H')).toBeGreaterThan(m(r, 'I'));
  });

  it('vareta = diagonal do lado do refletor; boom = (elementos − 1) × espaçamento', () => {
    const lambda = wavelength(145);
    const r = calc({ ...defaultParams, directorCount: 3, spacingLambda: 0.2 });
    expect(m(r, 'E')).toBeCloseTo(m(r, 'A') * Math.SQRT2, 12);
    expect(m(r, 'D')).toBeCloseTo(0.2 * lambda, 12);
    expect(m(r, 'F')).toBeCloseTo(4 * 0.2 * lambda, 12);
  });

  it('sem diretores não há cotas C nem I', () => {
    const r = calc({ ...defaultParams, directorCount: 0 });
    expect(r.measurements.some((x) => x.label === 'C' || x.label === 'I')).toBe(false);
  });

  it('ganho aditivo: 2 + 5 dBd (2 elementos), +2 (1º diretor), +1 por diretor extra', () => {
    expect(estimatedGainDbd(0)).toBe(7);
    expect(estimatedGainDbd(1)).toBe(9);
    expect(estimatedGainDbd(3)).toBe(11);
  });

  it('espaçamento fora de 0,15λ–0,25λ gera aviso', () => {
    expect(calc({ ...defaultParams, spacingLambda: 0.12 }).warnings.some((w) => w.message.includes('Espaçamento'))).toBe(true);
    expect(calc(defaultParams).warnings.some((w) => w.message.includes('Espaçamento'))).toBe(false);
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, directorCount: 1.5 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, directorCount: -1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, spacingLambda: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
  });
});

describe('quadra cúbica: lista de corte', () => {
  it('só a espira excitada é ajustável; 2 varetas por espira', () => {
    const items = cutList({ ...defaultParams, directorCount: 2 });
    // Com o espaço de alimentação padrão (10 mm), a excitada é cortada com J (= H − K).
    expect(items.filter((i) => i.adjustable).map((i) => i.label)).toEqual(['J']);
    expect(items.find((i) => i.label === 'E')!.quantity).toBe(8);
    expect(items.find((i) => i.label === 'I')!.quantity).toBe(2);
  });
});

describe('quadra cúbica: diâmetro do fio e espaço de alimentação', () => {
  const lab = (r: ReturnType<typeof calc>, label: string) => r.measurements.find((x) => x.label === label)?.meters;

  it('o espaço conta dentro do perímetro H: H não muda, J = H − espaço, e a folha de corte usa J', () => {
    const base = calc({ ...defaultParams, feedGap: 0 });
    const r = calc({ ...defaultParams, feedGap: 0.01 });
    expect(lab(r, 'H')).toBeCloseTo(lab(base, 'H')!, 12);
    expect(lab(r, 'J')).toBeCloseTo(lab(base, 'H')! - 0.01, 12);
    expect(lab(r, 'K')).toBeCloseTo(0.01, 12);
    expect(lab(base, 'J')).toBeUndefined();
    const item = cutList({ ...defaultParams, feedGap: 0.01 }).find((c) => c.label === 'J')!;
    expect(item.meters).toBeCloseTo(lab(r, 'J')!, 12);
    expect(cutList({ ...defaultParams, feedGap: 0.01 }).some((c) => c.label === 'H')).toBe(false);
  });

  it('o diâmetro do fio não muda as cotas e entradas inválidas são recusadas', () => {
    const a = calc(defaultParams);
    const b = calc({ ...defaultParams, wireDiameter: 0.005 });
    expect(b.measurements.map((x) => x.meters)).toEqual(a.measurements.map((x) => x.meters));
    expect(() => calc({ ...defaultParams, wireDiameter: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, feedGap: -1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, feedGap: 5 })).toThrow(RangeError);
  });
});

describe('quadra cúbica: banda de ROE', () => {
  it('pelo Q do modelo: 1 diretor em 145 MHz ≈ 2,4 MHz; sem diretor a banda é maior', () => {
    // Valores do modelo por momentos (pattern-model.test.ts confere o Q contra a varredura sintonizada).
    const one = calc(defaultParams).expected.bandwidth!;
    expect(one.unit).toBe('MHz');
    expect(one.typical!).toBeGreaterThan(2);
    expect(one.typical!).toBeLessThan(3);
    expect(one.note).toMatch(/casamento ideal/);
    expect(one.source).toMatch(/Yaghjian/);
    expect(calc({ ...defaultParams, directorCount: 0 }).expected.bandwidth!.typical!).toBeGreaterThan(one.typical!);
  });
});
