import { describe, expect, it } from 'vitest';
import { type Wire, solveWires } from './mom';
import { circularSense } from './polarization';

// Convenção (IEEE Std 145): RHCP = o vetor E gira no sentido horário visto olhando NA DIREÇÃO de propagação. Com dependência de tempo
// e^{jωt}, E = x̂ − jŷ (Ey atrasado 90°) dá Re[E·e^{jωt}] = x̂·cos ωt + ŷ·sin ωt: de x para y, anti-horário visto de +z para a origem
// e horário visto olhando para +z, ou seja, RHCP para uma onda que viaja em +z (regra da mão direita: polegar na propagação).

const c = (re: number, im = 0) => ({ re, im });

describe('circularSense', () => {
  it('Ey atrasado 90° em relação a Ex é RHCP; adiantado é LHCP', () => {
    const rh = circularSense(c(1), c(0, -1));
    expect(rh.sense).toBe('rhcp');
    expect(rh.axialRatioDb).toBeCloseTo(0, 9);
    const lh = circularSense(c(1), c(0, 1));
    expect(lh.sense).toBe('lhcp');
    expect(lh.axialRatioDb).toBeCloseTo(0, 9);
  });

  it('polarização linear tem razão axial enorme e circular perfeita tem 0 dB', () => {
    expect(circularSense(c(1), c(0)).axialRatioDb).toBeGreaterThan(100);
    expect(circularSense(c(1), c(2)).axialRatioDb).toBeGreaterThan(100);
  });

  it('elíptica: Ey a 0,5 de Ex, 90° de atraso: razão axial = 20·log10(1/0,5)', () => {
    const e = circularSense(c(1), c(0, -0.5));
    expect(e.sense).toBe('rhcp');
    expect(e.axialRatioDb).toBeCloseTo(20 * Math.log10(2), 6);
  });
});

describe('convenção de fase do solver de momentos (e^{jωt})', () => {
  it('dois dipolos em z (espaço λ/4 em x) com o segundo atrasado 90°: o feixe vai para o lado do atrasado', () => {
    // Dipolos ao longo de z, em x = 0 (adiantado) e x = λ/4 (atrasado 90°): a onda do primeiro chega ao segundo atrasada de 90°,
    // então os campos somam em +x e se anulam em −x (end-fire para o lado do elemento atrasado).
    const zDipole = (x: number): Wire => {
      const half = 0.2475;
      const n = 12;
      const points: [number, number, number][] = [];
      for (let i = 0; i <= n; i++) points.push([x, 0, -half + (2 * half * i) / n]);
      return { points, radius: 0.002 };
    };
    const wires = [zDipole(0), zDipole(0.25)];
    // Respostas individuais (acoplamento incluído por superposição linear): fator complexo em cada uma.
    const a = solveWires(wires, 300, [{ wire: 0, node: 6, volts: { re: 1, im: 0 } }]);
    const b = solveWires(wires, 300, [{ wire: 1, node: 6, volts: { re: 1, im: 0 } }]);
    const y = [
      [a.current(0, 6), b.current(0, 6)],
      [a.current(1, 6), b.current(1, 6)],
    ];
    // tensões que dão corrente 1 no primeiro e −j (atraso de 90°) no segundo: y·v = (1, −j)
    const [p, q, r, s] = [y[0]![0]!, y[0]![1]!, y[1]![0]!, y[1]![1]!];
    const mul = (u: { re: number; im: number }, v: { re: number; im: number }) => ({ re: u.re * v.re - u.im * v.im, im: u.re * v.im + u.im * v.re });
    const det = { re: mul(p, s).re - mul(q, r).re, im: mul(p, s).im - mul(q, r).im };
    const div = (u: { re: number; im: number }, v: { re: number; im: number }) => {
      const n2 = v.re * v.re + v.im * v.im;
      return { re: (u.re * v.re + u.im * v.im) / n2, im: (u.im * v.re - u.re * v.im) / n2 };
    };
    const lag = { re: 0, im: -1 };
    const v0 = div({ re: s.re - mul(q, lag).re, im: s.im - mul(q, lag).im }, det);
    const v1 = div({ re: mul(p, lag).re - r.re, im: mul(p, lag).im - r.im }, det);
    const field = (dir: [number, number, number]) => {
      const fa = a.farField(dir);
      const fb = b.farField(dir);
      const sum = [0, 1, 2].map((i) => ({
        re: v0.re * fa.re[i]! - v0.im * fa.im[i]! + v1.re * fb.re[i]! - v1.im * fb.im[i]!,
        im: v0.re * fa.im[i]! + v0.im * fa.re[i]! + v1.re * fb.im[i]! + v1.im * fb.re[i]!,
      }));
      return sum.reduce((acc, u) => acc + u.re * u.re + u.im * u.im, 0);
    };
    expect(field([1, 0, 0]) / field([-1, 0, 0])).toBeGreaterThan(5);
  });
});
