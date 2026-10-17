import { describe, expect, it } from 'vitest';
import {
  dipoleDirectivity,
  dipoleField,
  fieldToDb,
  halfPowerBeamwidthDeg,
  monopoleDirectivity,
  monopoleField,
} from './pattern';

// Referências (Balanis, Antenna Theory, 4ª ed.):
// - dipolo de λ/2: D₀ = 1,643 (2,15 dBi) e HPBW = 78° (§4.2.1, eq. 4-84 e 4-91).
// - dipolo curto (l ≪ λ): D₀ → 1,5 e HPBW = 90° (§4.2).
// - dipolo de λ: D₀ ≈ 2,41 (3,82 dBi), tabela 4.2.
// - monopolo de λ/4 sobre plano perfeito: D = 2 × 1,643 = 3,29 (5,16 dBi) (§4.7).

const toDb = (x: number) => 10 * Math.log10(x);

describe('padrão do dipolo', () => {
  it('máximo a 90° do eixo, nulo no eixo', () => {
    expect(dipoleField(Math.PI / 2, 0.5)).toBeCloseTo(1, 6);
    expect(dipoleField(0, 0.5)).toBe(0);
    expect(dipoleField(Math.PI, 0.5)).toBe(0);
  });

  it('simétrico em relação ao plano perpendicular ao fio', () => {
    for (const t of [0.3, 0.8, 1.2]) {
      expect(dipoleField(t, 0.5)).toBeCloseTo(dipoleField(Math.PI - t, 0.5), 12);
    }
  });

  it('λ/2: diretividade 1,643 (2,15 dBi), tolerância 0,005', () => {
    expect(dipoleDirectivity(0.5)).toBeCloseTo(1.643, 2);
    expect(toDb(dipoleDirectivity(0.5))).toBeCloseTo(2.15, 2);
  });

  it('λ/2: largura de meia potência 78° (tolerância 0,5°)', () => {
    const hp = halfPowerBeamwidthDeg((t) => dipoleField(t, 0.5), Math.PI / 2);
    expect(Math.abs(hp - 78)).toBeLessThan(0.5);
  });

  it('dipolo curto: D → 1,5 e HPBW → 90°', () => {
    expect(dipoleDirectivity(0.01)).toBeCloseTo(1.5, 2);
    const hp = halfPowerBeamwidthDeg((t) => dipoleField(t, 0.01), Math.PI / 2);
    expect(Math.abs(hp - 90)).toBeLessThan(0.5);
  });

  it('dipolo de 1 λ: D ≈ 2,41 (tolerância 0,02)', () => {
    expect(dipoleDirectivity(1)).toBeCloseTo(2.41, 1);
  });

  it('rejeita comprimento inválido', () => {
    expect(() => dipoleField(1, 0)).toThrow(RangeError);
  });
});

describe('padrão do monopolo sobre plano perfeito', () => {
  it('λ/4: D = 3,29 (5,16 dBi)', () => {
    expect(monopoleDirectivity(0.25)).toBeCloseTo(3.286, 2);
    expect(toDb(monopoleDirectivity(0.25))).toBeCloseTo(5.16, 1);
  });

  it('máximo no horizonte e zero abaixo do plano', () => {
    expect(monopoleField(0, 0.25)).toBeCloseTo(1, 6);
    expect(monopoleField(-0.1, 0.25)).toBe(0);
    expect(monopoleField(Math.PI / 2, 0.25)).toBe(0);
  });
});

describe('fieldToDb', () => {
  it('-3 dB em 1/√2 e piso para campo nulo', () => {
    expect(fieldToDb(Math.SQRT1_2)).toBeCloseTo(-3.0103, 3);
    expect(fieldToDb(0)).toBe(-40);
    expect(fieldToDb(1e-9)).toBe(-40);
  });
});
