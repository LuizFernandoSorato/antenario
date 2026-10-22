import { describe, expect, it } from 'vitest';
import { cutLength, totalMaterial } from './cutlist';
import { dipoleShorteningFactor } from '../core/dipole-resonance';
import { defaultParams as dipoleDefaults } from './dipole/calc';
import { cutList as dipoleCuts } from './dipole/cutlist';
import { defaultParams as gpDefaults } from './ground-plane/calc';
import { cutList as gpCuts } from './ground-plane/cutlist';
import { defaultParams as jpDefaults } from './j-pole/calc';
import { cutList as jpCuts } from './j-pole/cutlist';
import type { CutItem } from './types';

const adjustable: CutItem = { label: 'X', name: 'x', quantity: 1, meters: 1, adjustable: true };
const fixed: CutItem = { ...adjustable, adjustable: false };

describe('cutLength / totalMaterial', () => {
  it('só peças ajustáveis ganham sobra', () => {
    expect(cutLength(adjustable, 5)).toBeCloseTo(1.05, 12);
    expect(cutLength(fixed, 5)).toBe(1);
    expect(cutLength(adjustable, 0)).toBe(1);
  });

  it('rejeita sobra negativa ou inválida', () => {
    expect(() => cutLength(adjustable, -1)).toThrow(RangeError);
    expect(() => cutLength(adjustable, NaN)).toThrow(RangeError);
  });

  it('total soma quantidade × comprimento a cortar', () => {
    const items: CutItem[] = [{ ...adjustable, quantity: 2, meters: 0.5 }, { ...fixed, quantity: 4, meters: 0.25 }];
    expect(totalMaterial(items, 10)).toBeCloseTo(2 * 0.55 + 4 * 0.25, 12);
  });
});

describe('listas de corte das antenas', () => {
  it('dipolo: 2 braços iguais à cota B (comprimento menos o espaço central padrão de 10 mm, ÷ 2)', () => {
    const items = dipoleCuts({ ...dipoleDefaults, frequencyMHz: 145 });
    const total = (0.5 * 299.792458 * dipoleShorteningFactor(0.002 / (299.792458 / 145))) / 145;
    expect(dipoleDefaults.centerGap).toBe(0.01);
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(2);
    expect(items[0]!.meters).toBeCloseTo((total - 0.01) / 2, 9);
    // 2 braços + 5 % de sobra ≈ 1,03 m de fio no total.
    expect(totalMaterial(items, 5)).toBeCloseTo((total - 0.01) * 1.05, 9);
  });

  it('ground plane: 1 radiador (com sobra) + N radiais (na medida)', () => {
    const items = gpCuts({ ...gpDefaults, radialCount: 3 });
    expect(items.map((i) => [i.label, i.quantity, i.adjustable])).toEqual([
      ['A', 1, true],
      ['B', 3, false],
    ]);
  });

  it('J-pole: elemento longo (com sobra), curto e ligação na medida', () => {
    const items = jpCuts(jpDefaults);
    expect(items.map((i) => [i.label, i.adjustable])).toEqual([
      ['A', true],
      ['C', false],
      ['D', false],
    ]);
    expect(items[0]!.meters).toBeGreaterThan(items[1]!.meters);
  });
});
