import { describe, expect, it } from 'vitest';
import { complex } from '../core/complex';
import { deliveredPower, designLNetwork, lNetworkInputImpedance } from './l-network';

// Referências:
// - Pozar, Microwave Engineering, 4ª ed., §5.1, exemplo 5.1: Z_L = 200 − j100 Ω, Z0 = 100 Ω,
//   500 MHz. O livro imprime B ≈ 0,0029 S / X ≈ 122,4 Ω e B ≈ −0,0069 S / X ≈ −122,4 Ω
//   (arredondados). Os valores exatos saem das fórmulas fechadas:
//   B = (−100 ± √2·√30000)/50000 = (−100 ± 100√6)/50000 e |X| = 50√6 ≈ 122,474 Ω.
// - Valores de componentes: C = B/ω, L = X/ω etc. (definição de reatância).
// - Conferências independentes: Z_in = Z0 (aritmética complexa) e conservação de energia
//   (rede sem perdas entrega toda a potência à carga).

describe('designLNetwork: exemplo 5.1 do Pozar', () => {
  const sols = designLNetwork({ zLoad: complex(200, -100), z0: 100, fMHz: 500, powerW: 0 });
  const shunt = sols.filter((s) => s.topology === 'shunt-at-load');
  const omega = 2 * Math.PI * 500e6;
  const SQRT6 = Math.sqrt(6);

  it('duas soluções com elemento paralelo junto à carga', () => {
    expect(shunt).toHaveLength(2);
  });

  it('solução 1: B = (−100 + 100√6)/50000 S (livro: 0,0029), X = 50√6 Ω (livro: 122,4)', () => {
    const s = shunt.find((x) => x.shuntSusceptance > 0)!;
    expect(s.shuntSusceptance).toBeCloseTo((-100 + 100 * SQRT6) / 50000, 12);
    expect(s.seriesReactance).toBeCloseTo(50 * SQRT6, 9);
    expect(Math.abs(s.shuntSusceptance - 0.0029)).toBeLessThan(0.00005);
    expect(Math.abs(s.seriesReactance - 122.4)).toBeLessThan(0.1);
    expect(s.shunt!.kind).toBe('capacitor');
    expect(s.shunt!.value).toBeCloseTo(s.shuntSusceptance / omega, 20);
    expect(s.series!.kind).toBe('inductor');
    expect(s.series!.value).toBeCloseTo((50 * SQRT6) / omega, 15);
    expect(s.lowPass).toBe(true);
  });

  it('solução 2: B = (−100 − 100√6)/50000 S (livro: −0,0069), X = −50√6 Ω (livro: −122,4)', () => {
    const s = shunt.find((x) => x.shuntSusceptance < 0)!;
    expect(s.shuntSusceptance).toBeCloseTo((-100 - 100 * SQRT6) / 50000, 12);
    expect(s.seriesReactance).toBeCloseTo(-50 * SQRT6, 9);
    expect(Math.abs(s.shuntSusceptance + 0.0069)).toBeLessThan(0.00005);
    expect(s.shunt!.kind).toBe('inductor');
    expect(s.shunt!.value).toBeCloseTo(-1 / (omega * s.shuntSusceptance), 15);
    expect(s.series!.kind).toBe('capacitor');
    expect(s.series!.value).toBeCloseTo(1 / (omega * 50 * SQRT6), 20);
    expect(s.lowPass).toBe(false);
  });
});

describe('designLNetwork: casos gerais', () => {
  const loads = [complex(12.5), complex(25, 30), complex(300, 150), complex(73, 42.5), complex(5, -80)];

  it('toda solução devolvida casa com Z0 (aritmética complexa)', () => {
    for (const zl of loads) {
      const sols = designLNetwork({ zLoad: zl, z0: 50, fMHz: 14.2, powerW: 100 });
      expect(sols.length).toBeGreaterThan(0);
      for (const s of sols) {
        const zin = lNetworkInputImpedance(zl, s.topology, s.seriesReactance, s.shuntSusceptance);
        expect(zin.re).toBeCloseTo(50, 6);
        expect(zin.im).toBeCloseTo(0, 6);
      }
    }
  });

  it('R_L < Z0 tem solução série-na-carga; R_L > Z0 tem paralelo-na-carga', () => {
    expect(designLNetwork({ zLoad: 12.5, z0: 50, fMHz: 7, powerW: 0 }).some((s) => s.topology === 'series-at-load')).toBe(
      true,
    );
    expect(designLNetwork({ zLoad: 200, z0: 50, fMHz: 7, powerW: 0 }).some((s) => s.topology === 'shunt-at-load')).toBe(
      true,
    );
  });

  it('carga resistiva 50 → 200 Ω: Q = √(200/50 − 1) = √3 em cada elemento', () => {
    // Q de rede L com cargas resistivas: Q = √(R_maior/R_menor − 1) (Pozar §5.1; ARRL Handbook).
    const [s] = designLNetwork({ zLoad: 200, z0: 50, fMHz: 7, powerW: 0 });
    expect(Math.abs(s!.seriesReactance) / 50).toBeCloseTo(Math.sqrt(3), 10);
    expect(200 * Math.abs(s!.shuntSusceptance)).toBeCloseTo(Math.sqrt(3), 10);
  });

  it('conservação de energia: 100 W entram, 100 W chegam à carga', () => {
    for (const zl of loads) {
      for (const s of designLNetwork({ zLoad: zl, z0: 50, fMHz: 14.2, powerW: 100 })) {
        expect(deliveredPower(zl, s, 50, 100)).toBeCloseTo(100, 8);
      }
    }
  });

  it('tensão no capacitor paralelo, 100 W, 50 → 200 Ω: ≈ 200 V de pico', () => {
    // Na topologia paralelo-na-carga, o elemento paralelo vê a tensão da carga: √(2·P·R_L).
    const s = designLNetwork({ zLoad: 200, z0: 50, fMHz: 7, powerW: 100 }).find((x) => x.shunt?.kind === 'capacitor')!;
    expect(s.shunt!.peakVoltageV).toBeCloseTo(Math.sqrt(2 * 100 * 200), 8);
  });

  it('carga já casada: um elemento só ou nenhum', () => {
    const sols = designLNetwork({ zLoad: complex(50, 30), z0: 50, fMHz: 7, powerW: 0 });
    expect(sols.some((s) => s.shunt === null && s.series?.kind === 'capacitor')).toBe(true);
  });

  it('rejeita reatância pura e entradas inválidas', () => {
    expect(() => designLNetwork({ zLoad: complex(0, 50), z0: 50, fMHz: 7, powerW: 0 })).toThrow(RangeError);
    expect(() => designLNetwork({ zLoad: 100, z0: 0, fMHz: 7, powerW: 0 })).toThrow(RangeError);
    expect(() => designLNetwork({ zLoad: 100, z0: 50, fMHz: 7, powerW: -1 })).toThrow(RangeError);
  });
});
