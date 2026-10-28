import { describe, expect, it } from 'vitest';
import { complex } from '../core/complex';
import { autoGamma, capacitorVoltageRms, designGamma, gammaInputImpedance, gammaStepUp, rodLineImpedance } from './gamma';

// Referências:
// - H. F. Tolles, W7ITB, "How to design gamma-matching networks", Ham Radio, maio de 1973, pp. 50–51 e 54–55 (exemplos resolvidos).
// - ARRL Antenna Book, 19ª ed., p. 26-9 e 26-10: saídas do programa GAMMA (Tolles adaptado), que usa o λ do espaço livre (velocity = 1).
// Polegadas → metros: 0,0254.

const IN = 0.0254;
const okOf = (r: ReturnType<typeof designGamma>) => {
  if (!r.ok) throw new Error(r.reason);
  return r;
};

describe('gamma match (Tolles, Ham Radio 1973)', () => {
  it('exemplo 2 do artigo: monopolo 34 + j17 Ω, D = d = 0,375", S = 3,3D → Hz = 4, ≈ 36°, 7,77" e 14 pF', () => {
    const r = okOf(
      designGamma({ fMHz: 145.4, za: complex(34, 17), lineOhms: 50, elementDiameterM: 0.375 * IN, rodDiameterM: 0.375 * IN, spacingM: 3.3 * 0.375 * IN }),
    );
    expect(r.stepUp).toBeCloseTo(4, 12); // D = d: Hz = (1 + 1)² exatamente
    expect(r.electricalDeg).toBeCloseTo(36, 0);
    expect(r.rodLengthM / IN).toBeCloseTo(7.77, 1);
    expect(r.capacitancePF).toBeCloseTo(14.1, 1);
  });

  it('exemplo 1 do artigo (2 m, Za = 7 + j1,5): Q = 12,9 Ω e C ≈ 28 pF com o Hz = 11 lido no gráfico', () => {
    // O artigo lê Hz ≈ 11,0 na fig. 3; a eq. 3 dá 10,47 para D = 0,375", d = 0,0808" (#12) e S = 0,6029".
    expect(gammaStepUp(0.375, 0.0808, 0.6029)).toBeCloseTo(10.47, 2);
    const ra = 7;
    const xa = 1.5;
    const hz = 11;
    const den = hz * ra - 50;
    const a = (50 * xa) / den;
    const q = a + Math.sqrt(a * a + (50 * (ra * ra + xa * xa)) / den);
    expect(q).toBeCloseTo(12.9, 1);
    const e = ((50 / ra) * (ra * ra + xa * xa)) / q;
    expect(e).toBeCloseTo(28.38, 1);
    expect(1e6 / (2 * Math.PI * (e + (50 / ra) * xa) * 145.4)).toBeCloseTo(28, 0);
  });

  it('exemplo 1 pelas equações (sem o gráfico): perto do ajuste medido pelo Tolles (6,75" e 25 pF)', () => {
    const r = okOf(
      designGamma({ fMHz: 145.4, za: complex(7, 1.5), lineOhms: 50, elementDiameterM: 0.375 * IN, rodDiameterM: 0.0808 * IN, spacingM: 0.6029 * IN }),
    );
    expect(r.rodLengthM / IN).toBeCloseTo(7.19, 1);
    expect(r.capacitancePF).toBeCloseTo(30, 0);
    expect(Math.abs(r.rodLengthM / IN - 6.75) / 6.75).toBeLessThan(0.07);
    expect(Math.abs(r.capacitancePF - 25) / 25).toBeLessThan(0.21);
  });

  it('programa GAMMA do ARRL: Yagi de 14,3 MHz, 25 − j25 Ω, 1,5" e 1/2" a 6" → 38,9" e 96,1 pF', () => {
    const r = okOf(
      designGamma({ fMHz: 14.3, za: complex(25, -25), lineOhms: 50, elementDiameterM: 1.5 * IN, rodDiameterM: 0.5 * IN, spacingM: 6 * IN, velocity: 1 }),
    );
    expect(r.rodLengthM / IN).toBeCloseTo(38.9, 1);
    expect(r.capacitancePF).toBeCloseTo(96.1, 1);
  });

  it('programa GAMMA do ARRL: torre de 12" em 3,5 MHz, 20 − j100 Ω, fio #12 a 12" e a 18" → 57,1 e 49,3 pés, 32,1 e 43,8 pF', () => {
    const tower = (s: number) =>
      okOf(designGamma({ fMHz: 3.5, za: complex(20, -100), lineOhms: 50, elementDiameterM: 12 * IN, rodDiameterM: 0.0808 * IN, spacingM: s * IN, velocity: 1 }));
    const a = tower(12);
    expect(a.rodLengthM / IN / 12).toBeCloseTo(57.1, 1);
    expect(a.capacitancePF).toBeCloseTo(32.1, 1);
    const b = tower(18);
    expect(b.rodLengthM / IN / 12).toBeCloseTo(49.3, 1);
    expect(b.capacitancePF).toBeCloseTo(43.8, 1);
  });

  it('o 0,956 do Tolles encurta a barra em relação ao programa do ARRL', () => {
    const base = { fMHz: 14.3, za: complex(25, -25), lineOhms: 50, elementDiameterM: 1.5 * IN, rodDiameterM: 0.5 * IN, spacingM: 6 * IN };
    const tolles = okOf(designGamma(base));
    const arrl = okOf(designGamma({ ...base, velocity: 1 }));
    expect(tolles.rodLengthM / arrl.rodLengthM).toBeCloseTo(0.956, 12);
    expect(tolles.capacitancePF).toBeCloseTo(arrl.capacitancePF, 12);
  });

  it('Z0 da linha barra–elemento (eq. 2) e restrições', () => {
    expect(rodLineImpedance(0.375, 0.375, 1.2375)).toBeCloseTo(223.6, 1);
    // Hz·Ra ≤ R0: não casa (eq. 14).
    const bad = designGamma({ fMHz: 145, za: complex(5, 0), lineOhms: 50, elementDiameterM: 0.01, rodDiameterM: 0.01, spacingM: 0.03 });
    expect(bad.ok).toBe(false);
    expect(() => designGamma({ fMHz: 145, za: complex(10, 0), lineOhms: 50, elementDiameterM: 0.01, rodDiameterM: 0.004, spacingM: 0.007 })).toThrow(RangeError);
  });

  it('tensão no capacitor: 100 W em 50 Ω são 1,41 A; com 40 Ω de reatância, ≈ 57 V eficazes', () => {
    expect(capacitorVoltageRms(100, 50, -40)).toBeCloseTo(56.57, 2);
  });

  it('impedância de entrada: o circuito equivalente dá R0 + j0 em f0 nos exemplos (é a mesma álgebra das eqs. 6 a 13)', () => {
    const cases = [
      { fMHz: 145.4, za: complex(7, 1.5), lineOhms: 50, elementDiameterM: 0.375 * IN, rodDiameterM: 0.0808 * IN, spacingM: 0.6029 * IN },
      { fMHz: 145.4, za: complex(34, 17), lineOhms: 50, elementDiameterM: 0.375 * IN, rodDiameterM: 0.375 * IN, spacingM: 1.2375 * IN },
      { fMHz: 3.5, za: complex(20, -100), lineOhms: 50, elementDiameterM: 12 * IN, rodDiameterM: 0.0808 * IN, spacingM: 18 * IN },
      { fMHz: 145, za: complex(10, -12), lineOhms: 100, elementDiameterM: 0.006, rodDiameterM: 0.0012, spacingM: 0.0055 },
    ];
    for (const c of cases) {
      const g = okOf(designGamma(c));
      const z = gammaInputImpedance(g, c.za, c.fMHz, c.fMHz);
      expect(z.re).toBeCloseTo(c.lineOhms, 9);
      expect(z.im).toBeCloseTo(0, 9);
    }
  });

  it('impedância de entrada fora de f0 (mesma Za): o próprio gamma desvia mais quanto mais longe de f0', () => {
    const c = { fMHz: 145.4, za: complex(7, 1.5), lineOhms: 50, elementDiameterM: 0.375 * IN, rodDiameterM: 0.0808 * IN, spacingM: 0.6029 * IN };
    const g = okOf(designGamma(c));
    const off = (f: number) => {
      const z = gammaInputImpedance(g, c.za, f, c.fMHz);
      return Math.hypot(z.re - 50, z.im);
    };
    expect(off(146.4)).toBeGreaterThan(0.01);
    expect(off(147.4)).toBeGreaterThan(off(146.4));
    expect(off(143.4)).toBeGreaterThan(off(144.4));
  });
});

describe('gamma automático (regras do ARRL + faixa do Tolles)', () => {
  const lambda145 = 299.792458 / 145;

  it('quando as regras do ARRL servem, usa a barra de 1/3 e 0,007λ', () => {
    // Excitado de 25 − j25 Ω inteiro (o ponto de partida do ARRL), metade no gamma; elemento de 6 mm.
    const r = autoGamma({ fMHz: 145, za: complex(21, -11), lineOhms: 50, elementDiameterM: 0.006, maxRodLengthM: 0.5 });
    expect(r.design.ok).toBe(true);
    expect(r.rodDiameterM).toBeCloseTo(0.002, 12);
    expect(r.spacingM).toBeCloseTo(0.007 * lambda145, 12);
  });

  it('com a barra curta demais (< 15°) a 0,007λ, procura o espaçamento mais próximo dele em que ela chega a 15°', () => {
    // Za = 8,4 − j12,35: metade do excitado de uma Yagi de 5 elementos encurtado 3 % da ressonância (modelo por momentos).
    const za = complex(8.4, -12.35);
    const atArrl = okOf(designGamma({ fMHz: 145, za, lineOhms: 50, elementDiameterM: 0.006, rodDiameterM: 0.002, spacingM: 0.007 * lambda145 }));
    expect(atArrl.electricalDeg).toBeLessThan(15);
    const r = autoGamma({ fMHz: 145, za, lineOhms: 50, elementDiameterM: 0.006, maxRodLengthM: 0.5 });
    const g = okOf(r.design);
    expect(r.rodDiameterM).toBeCloseTo(0.002, 12);
    expect(g.electricalDeg).toBeGreaterThanOrEqual(15);
    expect(g.electricalDeg).toBeLessThan(15.01);
    expect(r.spacingM).toBeLessThan(0.007 * lambda145); // aqui, aproximar a barra a alonga
  });

  it('com a barra longa demais (> 45°) em qualquer espaçamento com 1/3, passa para uma barra mais fina; folga ≥ diâmetro da barra', () => {
    // Za = 9,9 + j7 (metade do excitado de uma Yagi de 5 elementos sem encurtar): com 1/3 a barra não desce de ≈ 50°.
    const za = complex(9.9, 7);
    const r = autoGamma({ fMHz: 145, za, lineOhms: 50, elementDiameterM: 0.006, maxRodLengthM: 0.5 });
    const g = okOf(r.design);
    expect(r.rodDiameterM).toBeLessThan(0.002);
    expect(g.electricalDeg).toBeLessThanOrEqual(45);
    expect(r.spacingM - (0.006 + r.rodDiameterM) / 2).toBeGreaterThanOrEqual(r.rodDiameterM * (1 - 1e-9));
  });

  it('se a barra de 1/3 não casa em espaçamento nenhum, tenta uma mais fina', () => {
    const r = autoGamma({ fMHz: 145, za: complex(4.6, -12.4), lineOhms: 50, elementDiameterM: 0.006, maxRodLengthM: 0.5 });
    expect(r.design.ok).toBe(true);
    expect(r.rodDiameterM).toBeLessThan(0.002);
  });

  it('respeita a barra e o espaçamento informados', () => {
    const r = autoGamma({ fMHz: 145, za: complex(21, -11), lineOhms: 50, elementDiameterM: 0.006, rodDiameterM: 0.003, spacingM: 0.02, maxRodLengthM: 0.5 });
    expect(r.rodDiameterM).toBe(0.003);
    expect(r.spacingM).toBe(0.02);
    expect(r.autoRod).toBe(false);
    expect(r.autoSpacing).toBe(false);
  });
});
