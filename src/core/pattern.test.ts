import { describe, expect, it } from 'vitest';
import {
  collinearField,
  crossedDipoleDirectivity,
  crossedDipoleField,
  dipoleDirectivity,
  dipoleField,
  fieldToDb,
  halfPowerBeamwidthDeg,
  helixAxialField,
  monopoleDirectivity,
  monopoleField,
  revolutionDirectivity,
  smallLoopField,
  uniformArrayFactor,
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

describe('dipolos cruzados em quadratura (turnstile)', () => {
  const field = (ux: number, uy: number, uz: number, reflector = false) => crossedDipoleField(ux, uy, uz, 0.5, reflector);

  it('máximo no eixo (zênite), igual para cima e para baixo sem refletor', () => {
    expect(field(0, 0, 1)).toBeCloseTo(1, 9);
    expect(field(0, 0, -1)).toBeCloseTo(1, 9);
  });

  it('no plano dos dipolos o campo cai 3 dB em relação ao eixo (soma de potências: g(0)² contra 2·g(0)²)', () => {
    expect(fieldToDb(field(1, 0, 0))).toBeCloseTo(-3.0103, 3);
    expect(fieldToDb(field(0, 1, 0))).toBeCloseTo(-3.0103, 3);
  });

  it('ondulação azimutal de ≈ 1 dB entre os eixos dos dipolos e a diagonal', () => {
    const diag = fieldToDb(field(Math.SQRT1_2, Math.SQRT1_2, 0));
    expect(Math.abs(diag - fieldToDb(field(1, 0, 0)))).toBeCloseTo(1.03, 1);
  });

  it('simetria entre os dois dipolos', () => {
    expect(field(0.3, 0.6, 0.7416)).toBeCloseTo(field(0.6, 0.3, 0.7416), 12);
  });

  it('diretividade sem refletor ≈ a do dipolo (1,643): potência total é a soma das dos dois', () => {
    expect(crossedDipoleDirectivity(0.5, false)).toBeCloseTo(1.643, 2);
  });

  it('refletor ideal a λ/4: nada atrás do plano, nulo no plano dos dipolos, máximo no eixo', () => {
    expect(field(0, 0, -1, true)).toBe(0);
    expect(field(1, 0, 0, true)).toBeCloseTo(0, 9);
    expect(field(0, 0, 1, true)).toBeCloseTo(1, 9);
    expect(crossedDipoleDirectivity(0.5, true)).toBeGreaterThan(crossedDipoleDirectivity(0.5, false));
  });
});

describe('loop pequena, arranjo uniforme, colinear e hélice axial', () => {
  it('loop pequena: D = 1,5 e nulo no eixo; meia potência a 90°', () => {
    expect(revolutionDirectivity(smallLoopField)).toBeCloseTo(1.5, 3);
    expect(smallLoopField(0)).toBeCloseTo(0, 12);
    expect(smallLoopField(Math.PI / 2)).toBe(1);
    expect(halfPowerBeamwidthDeg(smallLoopField, Math.PI / 2)).toBeCloseTo(90, 0);
  });

  it('fator de arranjo: máximo 1 em ψ = 0, nulos em ψ = 2πk/N, 1 elemento = 1', () => {
    expect(uniformArrayFactor(4, 0)).toBe(1);
    expect(uniformArrayFactor(1, 1.3)).toBeCloseTo(1, 12);
    expect(uniformArrayFactor(4, (2 * Math.PI) / 4)).toBeCloseTo(0, 12);
    expect(uniformArrayFactor(2, Math.PI)).toBeCloseTo(0, 12);
    expect(() => uniformArrayFactor(0, 1)).toThrow(RangeError);
  });

  it('colinear: 1 dipolo = dipolo; mais elementos, mais diretividade; máximo em 90°', () => {
    expect(collinearField(1.1, 1, 0.5)).toBeCloseTo(dipoleField(1.1, 0.5), 12);
    let last = revolutionDirectivity((t) => dipoleField(t, 0.5));
    for (const n of [2, 4, 8]) {
      const d = revolutionDirectivity((t) => collinearField(t, n, 0.5));
      expect(d).toBeGreaterThan(last);
      last = d;
    }
    expect(collinearField(Math.PI / 2, 6, 0.5)).toBeCloseTo(1, 9);
    // N elementos em fase a d = λ/2 têm ≈ 3 dB a mais por dobra de N (regra de aula citada na busca)
    const d4 = revolutionDirectivity((t) => collinearField(t, 4, 0.5));
    const d8 = revolutionDirectivity((t) => collinearField(t, 8, 0.5));
    expect(10 * Math.log10(d8 / d4)).toBeGreaterThan(2.3);
    expect(10 * Math.log10(d8 / d4)).toBeLessThan(3.1);
  });

  it('hélice axial (Kraus + Hansen–Woodyard): máximo no eixo, zero atrás, e diretividade/largura na ordem das fórmulas empíricas de Kraus', () => {
    // C = λ, S = 0,23λ (≈ 12,5°), N = 8. Fórmulas empíricas (Kraus; Wikipedia "Helical antenna", citando Tomasi 2004 e Kraus & Marhefka 2003):
    //   D ≈ 15·N·(C/λ)²·(S/λ) = 27,6 (14,4 dBi);  HPBW ≈ 52 / ((C/λ)·√(N·S/λ)) = 38°.
    // O modelo é teórico; as fórmulas, empíricas e conhecidas por exagerar o ganho em alguns dB: tolerância larga.
    const n = 8;
    const s = 0.23;
    const f = (t: number) => helixAxialField(t, n, s);
    expect(f(0)).toBeCloseTo(1, 12);
    expect(f(Math.PI / 2 + 0.01)).toBe(0);
    expect(f(0.2)).toBeLessThan(1);
    const dDb = 10 * Math.log10(revolutionDirectivity(f));
    expect(Math.abs(dDb - 14.4)).toBeLessThan(1.5); // medido: 13,7 dBi
    expect(Math.abs(halfPowerBeamwidthDeg(f, 0) - 38.3)).toBeLessThan(5); // medido: 41,3°
  });
});
