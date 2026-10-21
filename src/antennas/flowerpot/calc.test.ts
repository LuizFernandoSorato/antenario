import { describe, expect, it } from 'vitest';
import { cutList } from './cutlist';
import { calc, chokeTurns, defaultParams } from './calc';
import { meta } from './meta';

// Referência: J. Bishop, VK2ZOI, "Half-Wave Flower Pot Antenna" (https://vk2zoi.com/articles/half-wave-flower-pot/), RG-58
// dentro de conduíte elétrico cinza de PVC:
// - 2 m: elemento de cima (vivo, sem malha) 457 mm; de baixo (coaxial inteiro até a bobina) 447 mm; 9 espiras em tubo de 25 mm.
//   ROE mínima ≈ 146 MHz (lida na curva publicada, ±0,3 MHz).
// - 6 m: 1273 mm e 1245 mm; 13 espiras de RG-58 em tubo de 50 mm. ROE mínima ≈ 52,4 MHz (lida na curva, ±0,3 MHz).
// - Bobina: ressonância própria 5 a 6 % abaixo da frequência de operação, pela tabela de espiras × diâmetro do tubo.
// A ferramenta calibra os fatores no protótipo de 2 m; o de 6 m serve de conferência (±0,5 %).

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

describe('flowerpot: calc', () => {
  it('reproduz o protótipo de 2 m do VK2ZOI (calibração)', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 146 });
    expect(measure(r, 'A')).toBeCloseTo(0.457, 9);
    expect(measure(r, 'B')).toBeCloseTo(0.447, 9);
    expect(measure(r, 'C')).toBeCloseTo(0.904, 9);
  });

  it('prevê o protótipo de 6 m do VK2ZOI a 0,5 %', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 52.4 });
    expect(Math.abs(measure(r, 'A') - 1.273) / 1.273).toBeLessThan(0.005);
    expect(Math.abs(measure(r, 'B') - 1.245) / 1.245).toBeLessThan(0.005);
  });

  it('sem tubo: elementos 2 % mais compridos (estimativa do VK2ZOI)', () => {
    const inTube = calc({ ...defaultParams, housing: 1 });
    const open = calc({ ...defaultParams, housing: 2 });
    expect(measure(open, 'A') / measure(inTube, 'A')).toBeCloseTo(1.02, 12);
    expect(measure(open, 'B') / measure(inTube, 'B')).toBeCloseTo(1.02, 12);
  });

  it('bobina: 9 espiras em 25 mm no 2 m e 13 a 13,5 em 50 mm no 6 m', () => {
    const two = chokeTurns(146, 0, 'wide');
    expect(two).not.toBeNull();
    expect(two!.formerM).toBe(0.025);
    expect(two!.turns).toBe(9);
    // Faixa estreita: arredonda para menos espiras (ressonância mais perto da operação).
    expect(chokeTurns(146, 0, 'narrow')!.turns).toBe(8.5);
    const six = chokeTurns(52.4, 0, 'wide');
    expect(six!.formerM).toBe(0.05);
    expect(six!.turns).toBeGreaterThanOrEqual(13);
    expect(six!.turns).toBeLessThanOrEqual(13.5);
    // Ressonância própria alvo: 5,5 % abaixo (meio da faixa de 5 a 6 %).
    expect(two!.targetSrfMHz).toBeCloseTo(146 * 0.945, 9);
  });

  it('bobina fora da tabela: sem número de espiras (e com aviso)', () => {
    expect(chokeTurns(435, 0, 'wide')).toBeNull();
    expect(chokeTurns(28.5, 0, 'wide')).toBeNull();
    // Tubo escolhido que não cobre a frequência.
    expect(chokeTurns(52.4, 0.025, 'wide')).toBeNull();
    const r = calc({ ...defaultParams, frequencyMHz: 435 });
    expect(r.warnings.some((w) => /bobina/i.test(w.message) && /tabela/.test(w.message))).toBe(true);
    expect(r.measurements.some((m) => m.label === 'D')).toBe(false);
  });

  it('cabo na bobina e comprimento da bobina: geometria das espiras', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 146 });
    // 9 espiras de RG-58 (Ø 4,9 mm, datasheet Belden 8259) em tubo de 25 mm: π·(25 + 4,9) mm por espira.
    expect(measure(r, 'D')).toBeCloseTo(9 * Math.PI * (0.025 + 0.0049), 9);
    // Espiras encostadas: 9 × 4,9 mm ≈ 44 mm (o VK2ZOI fura o tubo com ≈ 45 mm entre os furos).
    expect(measure(r, 'E')).toBeCloseTo(9 * 0.0049, 9);
  });

  it('valores esperados, montagem e avisos', () => {
    const r = calc(defaultParams);
    expect(r.expected.impedance.typical).toBe(50);
    expect(r.expected.gain.typical).toBe(2.15);
    expect(r.expected.bandwidth!.min).toBeCloseTo(0.027 * defaultParams.frequencyMHz, 9);
    expect(r.assembly!.steps.some((s) => /espiras/.test(s))).toBe(true);
    expect(r.warnings.some((w) => w.level === 'danger' && /tensão/.test(w.message))).toBe(true);
    const out = calc({ ...defaultParams, frequencyMHz: meta.typicalRangeMHz.max * 2 });
    expect(out.warnings.some((w) => /fora da faixa/.test(w.message))).toBe(true);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, housing: 3 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, formerDiameter: 0.04 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, chokeBand: 0 })).toThrow(RangeError);
  });
});

describe('flowerpot: folha de corte', () => {
  it('elemento de cima ajustável; de baixo e bobina na medida', () => {
    const items = cutList(defaultParams);
    expect(items.find((i) => i.label === 'A')!.adjustable).toBe(true);
    expect(items.find((i) => i.label === 'B')!.adjustable).toBe(false);
    expect(items.find((i) => i.label === 'D')!.adjustable).toBe(false);
  });
});
