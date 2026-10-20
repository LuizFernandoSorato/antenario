import { describe, expect, it } from 'vitest';
import { REFERENCE_MM, calc, defaultParams, windingFor } from './calc';
import { WIRE_DIAMETER, qfhLoop, solveQfh } from './pattern-model';

// Referências: a calculadora de Coppens (via IK1HGI) a 137,5 MHz (ver calc.ts). Para o padrão, não há medida com fonte aqui; os testes
// conferem a geometria contra os "separadores" da calculadora e o comportamento esperado de uma QFH: padrão de cardioide, com
// máximo no zênite, simetria em torno do eixo, polarização circular e pouca radiação para baixo (faixa de 3 a 5 dBic e rejeição
// abaixo do horizonte maior que 15 dB: glossário rfessentials.com, fonte secundária sem citação primária; protótipo de 2,22 GHz com 5,19 dB: BRIN 2019).

const db = (x: number) => 10 * Math.log10(x);
const dirAt = (thetaDeg: number, phiDeg: number): [number, number, number] => {
  const t = (thetaDeg * Math.PI) / 180;
  const p = (phiDeg * Math.PI) / 180;
  return [Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p), Math.cos(t)];
};
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

describe('QFH: geometria do modelo', () => {
  // Os braços helicoidais e horizontais reproduzem os "separadores" da calculadora de Coppens.
  const cases = [
    { h: REFERENCE_MM.large.height, di: REFERENCE_MM.large.innerDiameter, vertical: REFERENCE_MM.large.verticalSeparator, horizontal: REFERENCE_MM.large.horizontalSeparator },
    { h: REFERENCE_MM.small.height, di: REFERENCE_MM.small.innerDiameter, vertical: REFERENCE_MM.small.verticalSeparator, horizontal: REFERENCE_MM.small.horizontalSeparator },
  ];
  for (const c of cases) {
    it(`separadores da calculadora (altura ${c.h} mm)`, () => {
      const r = (c.di + WIRE_DIAMETER * 1000) / 2 / 1000;
      const wire = qfhLoop(c.h / 1000, r, WIRE_DIAMETER / 2, false);
      const pts = wire.points;
      // braço helicoidal: do nó 6 (π) ao nó 18 (2π) segue a hélice; o comprimento da corda por trecho soma o do braço
      let arm = 0;
      for (let i = 6; i < 18; i++) arm += dist(pts[i]!, pts[i + 1]!);
      // a corda é um pouco menor que a hélice (12 trechos): tolerância de 1,5 mm
      expect(arm * 1000).toBeGreaterThan(c.vertical - 1.5);
      expect(arm * 1000).toBeLessThan(c.vertical + 0.01);
      expect(Math.sqrt((c.h / 1000) ** 2 + (Math.PI * r) ** 2) * 1000).toBeCloseTo(c.vertical, 0);
      expect(2 * r * 1000).toBeCloseTo(c.horizontal, 0);
    });
  }

  it('o fio fecha (mesmo sentido de enrolamento nos dois braços) e a espira tem a altura pedida', () => {
    const w = qfhLoop(0.7, 0.16, 0.002, false, -0.7);
    expect(w.closed).toBe(true);
    expect(w.points).toHaveLength(36);
    const zs = w.points.map((p) => p[2]);
    expect(Math.min(...zs)).toBeCloseTo(-0.7, 12);
    expect(Math.max(...zs)).toBeCloseTo(0, 12);
    // z cresce com o ângulo nos dois braços: braço 1 (nós 6 a 18) sobe, braço 2 (nós 24 a 36) desce enquanto o ângulo diminui
    const angle = (p: readonly number[]) => Math.atan2(p[1]!, p[0]!);
    const up = w.points.slice(7, 12);
    expect(up.every((p, i) => i === 0 || p[2]! > up[i - 1]![2]!)).toBe(true);
    // braço 1 passa pelo lado y < 0 (ângulos de π a 2π) e braço 2 pelo lado y > 0
    expect(angle(w.points[12]!)).toBeLessThan(0);
    expect(angle(w.points[30]!)).toBeGreaterThan(0);
  });
});

describe('QFH: padrão por momentos a 137,5 MHz', () => {
  const m = solveQfh(calc(defaultParams), 137.5);
  const at = (t: number, p: number) => db(m.power(dirAt(t, p)) / m.power([0, 0, 1]));

  it('tem o máximo no zênite e diretividade de 3 a 6 dBi', () => {
    for (let t = 10; t <= 180; t += 10) for (const p of [0, 45, 90, 135]) expect(at(t, p)).toBeLessThanOrEqual(0.05);
    expect(db(m.directivity)).toBeGreaterThan(3);
    expect(db(m.directivity)).toBeLessThan(6);
  });

  it('é um cardioide: horizonte 4 a 9 dB abaixo do zênite e mais de 12 dB abaixo para baixo', () => {
    for (const p of [0, 45, 90]) {
      expect(at(90, p)).toBeLessThan(-4);
      expect(at(90, p)).toBeGreaterThan(-9);
      expect(at(180, p)).toBeLessThan(-12);
    }
  });

  it('é quase simétrico em torno do eixo (diferença entre cortes menor que 2 dB acima do horizonte)', () => {
    for (let t = 0; t <= 90; t += 10) {
      const vals = [0, 30, 45, 60, 90].map((p) => at(t, p));
      expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(2);
    }
  });

  it('é circular no zênite: razão axial menor que 1 dB', () => {
    const z = m.zenithField;
    const ex = { re: z.re[0], im: z.im[0] };
    const ey = { re: z.re[1], im: z.im[1] };
    // componentes circulares (Ex ± jEy)/√2
    const mag = (a: { re: number; im: number }) => Math.hypot(a.re, a.im);
    const plus = mag({ re: ex.re - ey.im, im: ex.im + ey.re });
    const minus = mag({ re: ex.re + ey.im, im: ex.im - ey.re });
    const ar = 20 * Math.log10((plus + minus) / Math.abs(plus - minus));
    expect(ar).toBeLessThan(1);
    // um sentido só: o outro componente circular é pelo menos 20 dB menor
    expect(20 * Math.log10(Math.max(plus, minus) / Math.min(plus, minus))).toBeGreaterThan(20);
  });

  it('a diretividade em outra frequência de projeto fica perto (geometria escalada, fio fixo em 4,1 mm)', () => {
    const m2 = solveQfh(calc({ ...defaultParams, frequencyMHz: 275 }), 275);
    expect(Math.abs(db(m2.directivity) - db(m.directivity))).toBeLessThan(1);
  });
});

describe('QFH: sentido de enrolamento × sentido da polarização (modelo por momentos)', () => {
  const result = calc(defaultParams);

  it('enrolamento à direita dá LHCP e à esquerda dá RHCP no zênite (espira menor adiantada, feixe para cima)', () => {
    const right = solveQfh(result, 137.5, undefined, 'right');
    const left = solveQfh(result, 137.5, undefined, 'left');
    expect(right.zenith.sense).toBe('lhcp');
    expect(left.zenith.sense).toBe('rhcp');
    expect(right.zenith.axialRatioDb).toBeLessThan(1);
    expect(left.zenith.axialRatioDb).toBeLessThan(1);
    // o outro sentido fica pelo menos 20 dB abaixo
    expect(20 * Math.log10(right.zenith.lhcp / right.zenith.rhcp)).toBeGreaterThan(20);
    expect(20 * Math.log10(left.zenith.rhcp / left.zenith.lhcp)).toBeGreaterThan(20);
  });

  it('a imagem no espelho tem o mesmo padrão de potência (só o sentido muda)', () => {
    const right = solveQfh(result, 137.5, undefined, 'right');
    const left = solveQfh(result, 137.5, undefined, 'left');
    expect(left.directivity).toBeCloseTo(right.directivity, 6);
    for (const [t, p] of [[30, 0], [60, 45], [120, 10]] as const) {
      const d = dirAt(t, p);
      const mirrored = dirAt(t, -p);
      expect(left.power(mirrored) / right.power(d)).toBeCloseTo(1, 4);
    }
  });

  it('windingFor concorda com o modelo e o enrolamento chega à geometria (braço da frente sobe para a direita ou para a esquerda)', () => {
    expect(windingFor('rhcp')).toBe('left');
    expect(windingFor('lhcp')).toBe('right');
    // braço helicoidal 1, nós 6 a 18: à direita, y < 0 (lado da frente, olhando de −y) e x cresce com z
    const w = qfhLoop(0.7, 0.16, 0.002, false, -0.7, 'right').points;
    const l = qfhLoop(0.7, 0.16, 0.002, false, -0.7, 'left').points;
    const mid = 12; // meio do braço 1: ângulo 3π/2 (y = −r) à direita
    expect(w[mid]![1]).toBeLessThan(0);
    expect(w[mid + 1]![0]).toBeGreaterThan(w[mid - 1]![0]); // x cresce com z: "/" visto de −y
    // à esquerda, a imagem no espelho leva o braço 2 (nós 24 a 36, descendo) para o lado da frente (y < 0): x cresce enquanto z cai, ou seja "\\" visto de −y
    const back = 30;
    expect(l[back]![1]).toBeLessThan(0);
    expect(l[back + 1]![0]).toBeGreaterThan(l[back - 1]![0]);
    expect(l[back + 1]![2]).toBeLessThan(l[back - 1]![2]);
  });
});
